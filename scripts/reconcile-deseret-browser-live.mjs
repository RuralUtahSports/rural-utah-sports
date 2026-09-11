import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const WEEKLY = 'weekly-simulation.json';
const DETAILS = 'deseret-game-details.json';
const BASE = 'https://sports.deseret.com';
const TIME_ZONE = 'America/Denver';
const STALE_HALFTIME_MINUTES = 90;
const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const aliases = {
  CEDARCITY: ['Cedar'], CEDAR: ['Cedar City'],
  GRAND: ['Grand County'], GRANDCOUNTY: ['Grand'],
  GUNNISONVALLEY: ['Gunnison'], GUNNISON: ['Gunnison Valley'],
  LAYTONCHRISTIAN: ['Layton Christian Academy', 'LCA'],
  LAYTONCHRISTIANACADEMY: ['Layton Christian', 'LCA'],
  LCA: ['Layton Christian', 'Layton Christian Academy'],
  MONUMENTVALLEY: ['Monument Val'], MONUMENTVAL: ['Monument Valley'],
  MAPLEMOUNTAIN: ['Maple Mtn'], MAPLEMTN: ['Maple Mountain'],
  ALA: ['American Leadership', 'American Leadership Academy'],
  AMERICANLEADERSHIP: ['ALA', 'American Leadership Academy'],
  AMERICANLEADERSHIPACADEMY: ['ALA', 'American Leadership']
};

function isoDate(value) {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '';
}

function utahDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function utahMinutesNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function kickoffMinutes(value) {
  const m = clean(value).match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour === 12) hour = 0;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function stateRank(status) {
  const s = clean(status).toUpperCase();
  if (s === 'Q1') return 1;
  if (s === 'Q2') return 2;
  if (s === 'HALFTIME' || s === 'HALF') return 2.5;
  if (s === 'Q3') return 3;
  if (s === 'Q4') return 4;
  if (s === 'OT') return 5;
  return 0;
}

function gameKey(game) {
  return `${isoDate(game.date)}|${compact(game.awayTeam)}|${compact(game.homeTeam)}`;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function textOf(html) {
  return decodeHtml(String(html || ''))
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesFor(value) {
  const base = compact(value);
  return [...new Set([clean(value), ...(aliases[base] || [])].filter(Boolean))];
}

function escRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function occurrences(text, names) {
  const out = [];
  for (const name of names) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escRe(name).replace(/\\ /g, '\\s+')}(?=$|[^A-Za-z0-9])`, 'ig');
    let match;
    while ((match = re.exec(text))) {
      out.push({ index: match.index + (match[1]?.length || 0), length: name.length, name });
      if (match.index === re.lastIndex) re.lastIndex++;
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

function scoreFromPair(text, pair) {
  if (!pair) return null;
  const first = pair.order === 'away-home' ? pair.a : pair.h;
  const second = pair.order === 'away-home' ? pair.h : pair.a;
  const between = text.slice(first.index + first.length, second.index);
  const values = [...between.matchAll(/(?<![\d:])\d{1,3}(?![\d:])/g)]
    .map(match => Number(match[0]))
    .filter(value => Number.isInteger(value) && value >= 0 && value <= 199);
  if (values.length < 2) return null;
  return pair.order === 'away-home'
    ? { away: values[0], home: values[1] }
    : { away: values[1], home: values[0] };
}

function findGamePair(text, game) {
  const away = occurrences(text, namesFor(game.awayTeam));
  const home = occurrences(text, namesFor(game.homeTeam));
  const candidates = [
    ...away.flatMap(a => home.map(h => ({ a, h, order: 'away-home' }))),
    ...home.flatMap(h => away.map(a => ({ a, h, order: 'home-away' })))
  ];
  let best = null;
  for (const candidate of candidates) {
    const first = candidate.order === 'away-home' ? candidate.a : candidate.h;
    const second = candidate.order === 'away-home' ? candidate.h : candidate.a;
    if (second.index <= first.index) continue;
    const gap = second.index - first.index;
    if (gap > 240) continue;
    const score = scoreFromPair(text, candidate);
    if (!score) continue;
    if (!best || gap < best.pair.gap) {
      best = { pair: { ...candidate, gap }, score };
    }
  }
  return best;
}

function liveStateBefore(text, pair) {
  if (!pair) return null;
  const first = pair.order === 'away-home' ? pair.a : pair.h;
  const second = pair.order === 'away-home' ? pair.h : pair.a;
  const segment = text.slice(first.index, second.index + second.length + 80);
  if (/\bFinal\b/i.test(segment)) return { status: 'Final', clock: '', period: '', final: true };
  if (/\bhalf(?:time)?\b/i.test(segment)) return { status: 'HALFTIME', clock: '', period: 'HALFTIME', final: false };

  let match = segment.match(/\b(\d{1,2}:\d{2})\s+(?:in\s+)?(?:the\s+)?([1-4])(?:st|nd|rd|th)\s+Quarter\b/i);
  if (match) return { status: `Q${match[2]}`, clock: match[1], period: `Q${match[2]}`, final: false };
  match = segment.match(/\b(\d{1,2}:\d{2})\s+Q([1-4])\b/i);
  if (match) return { status: `Q${match[2]}`, clock: match[1], period: `Q${match[2]}`, final: false };
  match = segment.match(/\bQ([1-4])\b(?:\s+(\d{1,2}:\d{2}))?/i);
  if (match) return { status: `Q${match[1]}`, clock: match[2] || '', period: `Q${match[1]}`, final: false };
  if (/\bLive\b/i.test(segment)) return { status: 'Live', clock: '', period: '', final: false };
  return null;
}

function ensureDetail(details, game) {
  details.games ||= {};
  const key = gameKey(game);
  if (!details.games[key]) {
    details.games[key] = {
      date: game.date,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
      url: clean(game.deseretUrl),
      status: 'Scheduled', final: false, clock: '', period: '',
      kickoffTime: '', boxScore: null, scoringPlays: [], stats: [],
      statsAvailability: { status: 'unavailable', blocks: 0, rows: 0, filledCoreCells: 0, emptyCoreBlocks: 0 }
    };
  }
  return details.games[key];
}

function ensureRows(detail, game) {
  if (!detail.boxScore || !Array.isArray(detail.boxScore.rows) || detail.boxScore.rows.length < 2) {
    detail.boxScore = {
      periods: ['Q1', 'Q2', 'Q3', 'Q4'],
      rows: [
        { team: game.awayTeam, quarters: [null, null, null, null], total: 0 },
        { team: game.homeTeam, quarters: [null, null, null, null], total: 0 }
      ],
      source: 'deseret-browser-live'
    };
  }
  return detail.boxScore.rows;
}

if (!fs.existsSync(WEEKLY) || !fs.existsSync(DETAILS)) process.exit(0);
const browser = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find(path => fs.existsSync(path));
if (!browser) {
  console.warn('Deseret browser live fallback: Chrome/Chromium not available.');
  process.exit(0);
}

const today = utahDate();
const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const games = (weekly.games || []).filter(game => isoDate(game.date) === today && clean(game.awayTeam) && clean(game.homeTeam));
if (!games.length) {
  console.log(`Deseret browser live fallback: no RUS games on ${today}.`);
  process.exit(0);
}
console.log(`Deseret browser live fallback scanning ${games.length} RUS game(s) on ${today}.`);

const found = new Map();
for (let attempt = 1; attempt <= 3 && found.size < games.length; attempt++) {
  const url = `${BASE}/high-school/football/scores-schedule/${today}?region=all&_rus_browser=${Date.now()}_${attempt}`;
  const result = spawnSync(browser, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--virtual-time-budget=10000', '--dump-dom', url
  ], { encoding: 'utf8', timeout: 28000, maxBuffer: 12 * 1024 * 1024 });

  if (result.error || result.status !== 0 || !clean(result.stdout)) {
    console.warn(`Deseret browser live fallback attempt ${attempt} failed: ${result.error?.message || `exit ${result.status}`}`);
    continue;
  }

  const pageText = textOf(result.stdout);
  for (const game of games) {
    const key = gameKey(game);
    if (found.has(key)) continue;
    const match = findGamePair(pageText, game);
    if (!match) continue;
    const state = liveStateBefore(pageText, match.pair);
    if (!state) continue;
    found.set(key, { game, score: match.score, state });
  }
  console.log(`Deseret browser live attempt ${attempt}: matched ${found.size}/${games.length} current game(s).`);
}

let changed = 0;
for (const game of games) {
  const key = gameKey(game);
  const hit = found.get(key);
  if (!hit) {
    console.log(`Browser live did not find a scored live row for ${key}.`);
    continue;
  }
  const { score, state } = hit;
  const detail = ensureDetail(details, game);
  if (detail.final === true && !state.final) continue;
  const rows = ensureRows(detail, game);
  const beforeAwayRaw = Number(rows[0]?.total);
  const beforeHomeRaw = Number(rows[1]?.total);
  const beforeAway = Number.isFinite(beforeAwayRaw) ? beforeAwayRaw : 0;
  const beforeHome = Number.isFinite(beforeHomeRaw) ? beforeHomeRaw : 0;
  const nextAway = Math.max(beforeAway, score.away);
  const nextHome = Math.max(beforeHome, score.home);
  const scoreAdvanced = nextAway > beforeAway || nextHome > beforeHome;
  const sourceRegressed = score.away < beforeAway || score.home < beforeHome;

  if (nextAway !== beforeAway || nextHome !== beforeHome) {
    rows[0].total = nextAway;
    rows[1].total = nextHome;
    changed++;
  }
  if (sourceRegressed) {
    console.warn(`Ignored browser score regression for ${key}: source ${score.away}-${score.home}, kept ${nextAway}-${nextHome}.`);
  }
  if (detail.boxScore) detail.boxScore.source = 'deseret-browser-live';

  let nextState = state;
  const currentRank = stateRank(detail.status);
  const incomingRank = stateRank(state.status);
  const kickoff = kickoffMinutes(detail.kickoffTime);
  const elapsed = kickoff === null ? null : utahMinutesNow() - kickoff;
  const staleHalftime = /^HALFTIME$/i.test(clean(state.status)) && (
    scoreAdvanced ||
    sourceRegressed ||
    (elapsed !== null && elapsed >= STALE_HALFTIME_MINUTES)
  );

  if (staleHalftime) {
    nextState = { status: 'Live', clock: '', period: '' };
    console.warn(`Ignored stale halftime state for ${key}; using generic Live.`);
  } else if (incomingRank > 0 && currentRank > 0 && incomingRank < currentRank) {
    nextState = {
      status: clean(detail.status) || 'Live',
      clock: clean(detail.clock),
      period: clean(detail.period)
    };
    console.warn(`Ignored browser period regression for ${key}: ${state.status} behind ${detail.status}.`);
  }

  if (detail.status !== nextState.status || clean(detail.clock) !== nextState.clock || clean(detail.period) !== nextState.period || detail.final !== !!state.final) {
    detail.status = nextState.status;
    detail.clock = nextState.clock;
    detail.period = nextState.period;
    detail.final = !!state.final;
    changed++;
  }
  detail.scoreSource = 'deseret-browser-live';
  if (state.final) detail.finalSource = 'deseret-browser-live-final';
  detail.statusSource = state.final ? 'deseret-browser-live-final' : staleHalftime ? 'deseret-browser-live-stale-state-guard' : 'deseret-browser-live';
  console.log(`Browser scoreboard ${key}: ${nextAway}-${nextHome} ${nextState.status}${nextState.clock ? ` ${nextState.clock}` : ''}`);
}

if (changed) {
  details.updatedAt = new Date().toISOString();
  fs.writeFileSync(DETAILS, JSON.stringify(details, null, 2) + '\n');
}
console.log(`Deseret browser live fallback updated ${changed} field group(s).`);
