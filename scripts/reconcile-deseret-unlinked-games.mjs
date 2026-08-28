import fs from 'node:fs';

const WEEKLY = 'weekly-simulation.json';
const DETAILS = 'deseret-game-details.json';
const BASE = 'https://sports.deseret.com';
const clean = value => String(value ?? '').trim();
const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

const aliases = {
  ALA: ['American Leadership', 'American Leadership Academy'],
  AMERICANLEADERSHIP: ['ALA', 'American Leadership Academy'],
  AMERICANLEADERSHIPACADEMY: ['ALA', 'American Leadership'],
  CEDARCITY: ['Cedar'],
  CEDAR: ['Cedar City'],
  GRANDCOUNTY: ['Grand'],
  GRAND: ['Grand County'],
  GUNNISONVALLEY: ['Gunnison'],
  GUNNISON: ['Gunnison Valley'],
  LAYTONCHRISTIAN: ['Layton Christian Academy', 'LCA'],
  LAYTONCHRISTIANACADEMY: ['Layton Christian', 'LCA'],
  LCA: ['Layton Christian', 'Layton Christian Academy'],
  MONUMENTVALLEY: ['Monument Val'],
  MONUMENTVAL: ['Monument Valley'],
  MAPLEMOUNTAIN: ['Maple Mtn'],
  MAPLEMTN: ['Maple Mountain'],
  UMALEHI: ['UMA Camp Williams', 'Utah Military Camp Williams', 'Utah Military Academy Camp Williams'],
  UMACAMPWILLIAMS: ['UMA-Lehi', 'Utah Military Camp Williams', 'Utah Military Academy Camp Williams'],
  UTAHMILITARYCAMPWILLIAMS: ['UMA-Lehi', 'UMA Camp Williams', 'Utah Military Academy Camp Williams'],
  UTAHMILITARYACADEMYCAMPWILLIAMS: ['UMA-Lehi', 'UMA Camp Williams', 'Utah Military Camp Williams'],
  UTAHMILITARYHILLFIELD: ['UMA-Hillfield', 'Utah Military Academy Hillfield'],
  UTAHMILITARYACADEMYHILLFIELD: ['UMA-Hillfield', 'Utah Military Hillfield']
};

const stateNames = {
  ID: ['Idaho'],
  AZ: ['Ariz.', 'Arizona'],
  NV: ['Nev.', 'Nevada'],
  CA: ['Calif.', 'California'],
  FL: ['Fla.', 'Florida'],
  NM: ['N.M.', 'New Mexico'],
  WY: ['Wyo.', 'Wyoming'],
  CO: ['Colo.', 'Colorado'],
  OR: ['Ore.', 'Oregon'],
  WA: ['Wash.', 'Washington'],
  TX: ['Texas'],
  HI: ['Hawaii']
};

function isoDate(value) {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '';
}

const gameKey = game => `${isoDate(game.date)}|${compact(game.awayTeam)}|${compact(game.homeTeam)}`;

function decode(value) {
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
  return decode(html)
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function namesFor(value) {
  const original = clean(value);
  const base = compact(original);
  const out = [original, ...(aliases[base] || [])];
  const stateMatch = original.match(/^(.*?),\s*([A-Z]{2})$/i);
  if (stateMatch) {
    const school = clean(stateMatch[1]);
    const state = stateMatch[2].toUpperCase();
    out.push(school);
    for (const stateName of stateNames[state] || []) out.push(`${school}, ${stateName}`);
  }
  return [...new Set(out.filter(Boolean))];
}

function escRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameRegex(name) {
  return new RegExp(`(^|[^A-Za-z0-9])${escRe(name).replace(/\\ /g, '\\s+')}(?=$|[^A-Za-z0-9])`, 'i');
}

function lineMatches(line, names) {
  return names.some(name => nameRegex(name).test(line));
}

function bestLinePair(lines, game) {
  const awayNames = namesFor(game.awayTeam);
  const homeNames = namesFor(game.homeTeam);
  const away = [];
  const home = [];
  lines.forEach((line, index) => {
    if (lineMatches(line, awayNames)) away.push(index);
    if (lineMatches(line, homeNames)) home.push(index);
  });

  let best = null;
  for (const a of away) {
    for (const h of home) {
      const gap = Math.abs(a - h);
      if (gap > 6) continue;
      if (!best || gap < best.gap) best = { a, h, gap };
    }
  }
  return best;
}

function parseStatusLine(value) {
  const line = clean(value);
  if (!line) return null;
  if (/\bFinal\b/i.test(line)) return { status: 'Final', clock: '', period: '' };
  if (/\b(?:Live\s+)?Halftime\b/i.test(line)) return { status: 'HALFTIME', clock: '', period: 'HALFTIME' };
  if (/\b(?:Live\s+)?OT\b/i.test(line)) return { status: 'OT', clock: '', period: 'OT' };

  let match = line.match(/\bLive\s+(\d{1,2}:\d{2}(?:\.\d+)?)\s+(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+Quarter)?)/i);
  if (match) {
    const period = `Q${match[2] || match[3] || match[4]}`;
    return { status: period, clock: match[1], period };
  }

  match = line.match(/\bLive\s+(?:End\s+)?(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+Quarter)?)/i);
  if (match) {
    const period = `Q${match[1] || match[2] || match[3]}`;
    return { status: period, clock: '', period };
  }

  match = line.match(/\bEnd\s+(?:of\s+)?(?:the\s+)?(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+Quarter)?)/i);
  if (match) {
    const period = `Q${match[1] || match[2] || match[3]}`;
    return { status: period, clock: '', period };
  }

  // Deseret also puts links such as "Rocky Mo... Live" beside a matchup.
  // Treat only an actual status badge as the generic Live state so a nearby
  // game's link cannot make an unstarted out-of-state game look live.
  if (/^Live(?:\s|$)/i.test(line)) return { status: 'Live', clock: '', period: '' };
  return null;
}

function parseLiveDetailLine(value) {
  const line = clean(value);
  if (!line) return null;
  if (/^Halftime$/i.test(line)) return { status: 'HALFTIME', clock: '', period: 'HALFTIME' };
  if (/^OT$/i.test(line)) return { status: 'OT', clock: '', period: 'OT' };

  let match = line.match(/^(\d{1,2}:\d{2}(?:\.\d+)?)\s+(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+Quarter)?)$/i);
  if (match) {
    const period = `Q${match[2] || match[3] || match[4]}`;
    return { status: period, clock: match[1], period };
  }

  match = line.match(/^(?:End\s+)?(?:of\s+)?(?:the\s+)?(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+Quarter)?)$/i);
  if (match) {
    const period = `Q${match[1] || match[2] || match[3]}`;
    return { status: period, clock: '', period };
  }
  return null;
}

function stateForPair(lines, pair) {
  if (!pair) return { status: '', clock: '', period: '' };
  const first = Math.min(pair.a, pair.h);
  const last = Math.max(pair.a, pair.h);
  const candidates = [];
  // Status normally precedes the team rows. Only inspect one line after the
  // pair; looking farther ahead can capture the next matchup's Live badge.
  for (let i = Math.max(0, first - 6); i <= Math.min(lines.length - 1, last + 1); i++) {
    let parsed = parseStatusLine(lines[i]);
    if (!parsed) continue;

    // Deseret's day scoreboard can render the badge and live detail on two
    // adjacent lines: "Live" followed by "1:54 3rd Quarter". Only join that
    // detail when both lines precede this matchup, so a later game's clock
    // cannot leak backward into the current one.
    if (parsed.status === 'Live' && /^Live\s*$/i.test(clean(lines[i])) && i + 1 < first) {
      parsed = parseLiveDetailLine(lines[i + 1]) || parsed;
    }

    const distance = i < first ? first - i : i > last ? i - last : 0;
    candidates.push({ parsed, distance, index: i });
  }
  candidates.sort((a, b) => a.distance - b.distance || Math.abs(first - a.index) - Math.abs(first - b.index));
  return candidates[0]?.parsed || { status: '', clock: '', period: '' };
}

function scoreFromLine(line) {
  const scrubbed = clean(line)
    .replace(/\(\s*\d+\s*-\s*\d+(?:\s*-\s*\d+)?\s*\)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g, ' ');
  const numbers = [...scrubbed.matchAll(/(?:^|[^A-Za-z0-9])(\d{1,3})(?=$|[^A-Za-z0-9])/g)]
    .map(match => Number(match[1]))
    .filter(number => Number.isInteger(number) && number >= 0 && number <= 199);
  return numbers.length ? numbers[numbers.length - 1] : null;
}

function scoreNearTeam(lines, index) {
  // The current Deseret day page renders each team name and its score on
  // separate lines (for example "Thunder Ridge, Idaho Titans" then "35").
  // Older markup sometimes kept the score on the team line, so support both.
  const sameLine = scoreFromLine(lines[index]);
  if (Number.isInteger(sameLine)) return sameLine;
  for (let offset = 1; offset <= 2; offset++) {
    const candidate = clean(lines[index + offset]);
    if (!candidate) continue;
    const exact = candidate.match(/^(\d{1,3})$/);
    if (exact) {
      const score = Number(exact[1]);
      if (score <= 199) return score;
    }
    // Stop before crossing into the other team's row or a different matchup.
    if (/^(?:vs\b|@\b|Live\b|Final\b|Stats\b|Previous\b)/i.test(candidate)) break;
  }
  return null;
}

function scoreForPair(lines, pair) {
  if (!pair) return null;
  const away = scoreNearTeam(lines, pair.a);
  const home = scoreNearTeam(lines, pair.h);
  return Number.isInteger(away) && Number.isInteger(home) ? { away, home } : null;
}

function currentScore(detail) {
  const rows = detail?.boxScore?.rows;
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const away = Number(rows[0]?.total);
  const home = Number(rows[1]?.total);
  return Number.isFinite(away) && Number.isFinite(home) ? { away, home } : null;
}

function ensureDetail(details, game) {
  details.games ||= {};
  const key = gameKey(game);
  if (!details.games[key]) {
    details.games[key] = {
      date: game.date,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
      deseretUrl: '',
      status: 'Scheduled',
      final: false,
      clock: '',
      period: '',
      boxScore: null,
      scoringPlays: [],
      stats: []
    };
  }
  return details.games[key];
}

function applyScore(detail, game, score) {
  if (!score) return false;
  const rows = detail?.boxScore?.rows;
  if (Array.isArray(rows) && rows.length === 2) {
    const oldAway = Number(rows[0]?.total);
    const oldHome = Number(rows[1]?.total);
    if (oldAway === score.away && oldHome === score.home) return false;
    rows[0].total = score.away;
    rows[1].total = score.home;
    detail.scoreSource = 'deseret-day-scoreboard-unlinked';
    return true;
  }
  detail.boxScore = {
    periods: ['Q1', 'Q2', 'Q3', 'Q4'],
    rows: [
      { team: game.awayTeam, quarters: [null, null, null, null], total: score.away },
      { team: game.homeTeam, quarters: [null, null, null, null], total: score.home }
    ],
    source: 'deseret-day-scoreboard-unlinked'
  };
  detail.scoreSource = 'deseret-day-scoreboard-unlinked';
  return true;
}

async function fetchHtml(url) {
  const target = new URL(url);
  target.searchParams.set('_rus', String(Date.now()));
  const response = await fetch(target, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)',
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

if (process.argv.includes('--self-test')) {
  const lines = [
    'Football', 'Live', '1:54 3rd Quarter', 'Thunder Ridge, Idaho Titans', '35',
    'vs Bear River Bears', '42', 'Stats', 'Rocky Mo... Live', 'Madison, Idaho Bobcats',
    'vs Riverton Silverwolves', 'Stats Previous Matchup', 'Live', '12:00 2nd Quarter'
  ];
  const thunder = bestLinePair(lines, { awayTeam: 'THUNDER RIDGE, ID', homeTeam: 'BEAR RIVER' });
  const thunderScore = scoreForPair(lines, thunder);
  if (thunderScore?.away !== 35 || thunderScore?.home !== 42) throw new Error('Split-line score parsing failed');
  const thunderState = stateForPair(lines, thunder);
  if (thunderState.status !== 'Q3' || thunderState.clock !== '1:54' || thunderState.period !== 'Q3') {
    throw new Error('Split-line live status parsing failed');
  }
  const madison = bestLinePair(lines, { awayTeam: 'MADISON, ID', homeTeam: 'RIVERTON' });
  if (stateForPair(lines, madison).status) throw new Error('Neighboring Live link leaked into matchup status');
  console.log('Unlinked scoreboard parser self-test passed.');
  process.exit(0);
}

if (!fs.existsSync(WEEKLY) || !fs.existsSync(DETAILS)) process.exit(0);

const weekly = JSON.parse(fs.readFileSync(WEEKLY, 'utf8'));
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
const games = (weekly.games || []).filter(game => !clean(game.deseretUrl));
const dates = [...new Set(games.map(game => isoDate(game.date)).filter(Boolean))];
let updated = 0;
let matched = 0;

for (const date of dates) {
  const delta = (Date.parse(`${date}T12:00:00Z`) - Date.now()) / 86400000;
  if (delta > 2.25 || delta < -2.25) continue;

  let html;
  try {
    html = await fetchHtml(`${BASE}/high-school/scores-schedule/${date}?region=all`);
  } catch (error) {
    console.warn(`Unlinked day scoreboard ${date}: ${error.message}`);
    continue;
  }

  const lines = textOf(html).split(/\n+/).map(clean).filter(Boolean);
  for (const game of games.filter(item => isoDate(item.date) === date)) {
    const pair = bestLinePair(lines, game);
    if (!pair) {
      console.warn(`Unlinked no team-pair match: ${gameKey(game)}`);
      continue;
    }

    const key = gameKey(game);
    const existing = details.games?.[key] || null;
    const storedScore = currentScore(existing);
    const score = scoreForPair(lines, pair);
    let state = stateForPair(lines, pair);

    if (!state.status && score && (score.away > 0 || score.home > 0)) {
      state = { status: 'Live', clock: '', period: '' };
    }
    if (!state.status && storedScore && (storedScore.away > 0 || storedScore.home > 0) && existing?.final !== true) {
      state = { status: 'Live', clock: '', period: '' };
    }

    if (!state.status && !score) {
      console.warn(`Unlinked no live status or score: ${key}`);
      continue;
    }

    matched++;
    const existed = !!existing;
    const detail = ensureDetail(details, game);
    if (!existed) updated++;

    if (state.status === 'Final') {
      if (!detail.final || detail.status !== 'Final' || detail.clock || detail.period || detail.finalSource !== 'deseret-day-scoreboard-unlinked') {
        detail.final = true;
        detail.status = 'Final';
        detail.clock = '';
        detail.period = '';
        detail.finalSource = 'deseret-day-scoreboard-unlinked';
        updated++;
      }
    } else if (state.status) {
      if (detail.final || detail.status !== state.status || clean(detail.clock) !== clean(state.clock) || clean(detail.period) !== clean(state.period) || detail.finalSource) {
        detail.final = false;
        detail.status = state.status;
        detail.clock = state.clock || '';
        detail.period = state.period || '';
        delete detail.finalSource;
        updated++;
      }
    }

    if (applyScore(detail, game, score)) updated++;
    if (state.status) detail.statusSource = 'deseret-day-scoreboard-unlinked';
    console.log(`Unlinked live match: ${key} -> ${detail.status}${score ? ` ${score.away}-${score.home}` : ''}`);
  }
}

details.updatedAt = new Date().toISOString();
fs.writeFileSync(DETAILS, JSON.stringify(details, null, 2) + '\n');
console.log(`Unlinked Deseret reconciliation matched ${matched} game(s); ${updated} change(s).`);
