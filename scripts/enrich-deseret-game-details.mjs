import fs from 'node:fs';
import {applyGameDetailCorrections} from './apply_manual_stat_corrections.mjs';

const SOURCE = 'weekly-simulation.json';
const OUTPUT = 'deseret-game-details.json';
const clean = v => String(v ?? '').trim();
const compact = v => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '');

const DIRECT_URL_OVERRIDES = new Map([
  ['2026-08-28|IGNACIOCO|DUCHESNE', 'https://sports.deseret.com/high-school/football/game/2026-08-28/ignacio-colo-football-vs-duchesne-football/275602']
]);

const KEY_ALIASES = {
  ALA: ['AMERICANLEADERSHIP'],
  AMERICANLEADERSHIPACADEMY: ['AMERICANLEADERSHIP'],
  CEDARCITY: ['CEDAR'],
  CEDAR: ['CEDARCITY'],
  GRANDCOUNTY: ['GRAND'],
  GUNNISON: ['GUNNISONVALLEY'],
  JUANDIEGOCATHOLIC: ['JUANDIEGO'],
  LAYTONCHRISTIANACADEMY: ['LAYTONCHRISTIAN'],
  MONUMENTVAL: ['MONUMENTVALLEY'],
  MAPLEMTN: ['MAPLEMOUNTAIN']
};

function keysFor(name) {
  const base = compact(name);
  return [base, ...(KEY_ALIASES[base] || [])];
}

function isoDate(value) {
  const s = clean(value);
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function gameKey(g) {
  return `${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function htmlText(html) {
  return decodeEntities(String(html || ''))
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cellText(html) {
  return htmlText(html).replace(/\s+/g, ' ').trim();
}

function extractKickoffTime(html) {
  const raw = String(html || '');
  const text = htmlText(raw.slice(0, Math.min(raw.length, 140000)));
  const match = text.match(/\b(?:Upcoming|Scheduled)\b[\s\S]{0,260}?@\s*(\d{1,2}):(\d{2})\s*([AP]M)\b/i)
    || text.match(/\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+@\s*(\d{1,2}):(\d{2})\s*([AP]M)\b/i);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  return `${hour}:${String(minute).padStart(2, '0')} ${String(match[3]).toUpperCase()}`;
}

function extractTables(html) {
  const out = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(m[1]))) {
      const cells = [];
      const cellRe = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
      let cm;
      while ((cm = cellRe.exec(rm[1]))) cells.push(cellText(cm[1]));
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (rows.length) {
      const context = htmlText(html.slice(Math.max(0, m.index - 2600), m.index));
      out.push({ rows, context });
    }
  }
  return out;
}

function findBoxScore(tables) {
  const parseQuarter = value => {
    const s = clean(value);
    if (/^\d+$/.test(s)) return Number(s);
    if (/^[-–—]$/.test(s)) return null;
    return undefined;
  };
  for (const t of tables) {
    const hi = t.rows.findIndex(r => {
      const vals = r.map(v => clean(v).toUpperCase().replace(/\s+/g, ''));
      return ['Q1', 'Q2', 'Q3', 'Q4', 'TOTAL'].every(x => vals.includes(x));
    });
    if (hi < 0) continue;
    const headers = t.rows[hi];
    const periods = headers.slice(-5);
    const rows = [];
    for (const r of t.rows.slice(hi + 1)) {
      if (r.length < 6) continue;
      const scoreCells = r.slice(-5);
      const quarters = scoreCells.slice(0, 4).map(parseQuarter);
      const totalText = clean(scoreCells[4]);
      if (quarters.some(v => v === undefined) || !/^\d+$/.test(totalText)) continue;
      rows.push({
        team: r.slice(0, -5).filter(Boolean).join(' ').replace(/^@\s*/, '').trim(),
        quarters,
        total: Number(totalText)
      });
      if (rows.length === 2) break;
    }
    if (rows.length === 2) return { periods: periods.slice(0, 4), rows };
  }
  return null;
}

function sectionCategory(headers) {
  const h = headers.map(v => clean(v).toUpperCase().replace(/\s+/g, ' '));
  const joined = h.join('|');
  if ((/COMP\s*-?\s*ATT/.test(joined) || (joined.includes('COMP') && joined.includes('ATT'))) && /(YARD|YDS)/.test(joined)) return 'Passing';
  if (/(CARRIES|RUSH ATT|ATTEMPTS)/.test(joined) && /(YARD|YDS)/.test(joined)) return 'Rushing';
  if (/(RECEPTIONS|REC)/.test(joined) && /(YARD|YDS)/.test(joined)) return 'Receiving';
  if (/(TACKLES|TOTAL TACKLES|SOLO)/.test(joined) && /(SACK|INTERCEPTION|INT|TFL|ASSIST)/.test(joined)) return 'Defense';
  if (joined.includes('FG') && joined.includes('PAT')) return 'Special Teams';
  return '';
}

function bestTeamMatch(text, game) {
  const c = compact(text);
  let best = { team: '', score: -1 };
  for (const team of [game.awayTeam, game.homeTeam]) {
    for (const key of keysFor(team)) {
      const at = c.lastIndexOf(key);
      if (at >= 0 && at + key.length > best.score) best = { team, score: at + key.length };
    }
  }
  return best.team;
}

function inferTeam(context, game, category) {
  const lines = context.split(/\n+/).map(clean).filter(Boolean);
  const cat = compact(category);
  for (const line of [...lines].reverse()) {
    const lc = compact(line);
    if (!lc.includes(cat)) continue;
    const team = bestTeamMatch(line, game);
    if (team) return team;
  }
  const near = lines.slice(-8).join(' ');
  return bestTeamMatch(near, game);
}

function cleanPlayer(value) {
  return clean(value)
    .replace(/^\s*\d+\s+/, '')
    .replace(/^\s*[A-Z]\s*\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferTeamFromScoring(rows, scoringPlays, game) {
  const votes = new Map();
  for (const row of rows) {
    const player = cleanPlayer(row?.[1]);
    if (!player || player.split(/\s+/).length < 2) continue;
    const cp = compact(player);
    for (const play of scoringPlays || []) {
      if (!cp || !compact(play).includes(cp)) continue;
      const prefix = String(play).split(/—| - /)[0] || play;
      const team = bestTeamMatch(prefix, game) || bestTeamMatch(play, game);
      if (team) votes.set(team, (votes.get(team) || 0) + 1);
    }
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function extractStats(tables, game, scoringPlays = []) {
  const stats = [];
  for (const t of tables) {
    const headerIndex = t.rows.findIndex(r => sectionCategory(r));
    if (headerIndex < 0) continue;
    const headers = t.rows[headerIndex].map(clean).filter(Boolean);
    const category = sectionCategory(headers);
    if (!category) continue;
    const rows = t.rows.slice(headerIndex + 1)
      .map(r => r.map(clean))
      .filter(r => r.some(Boolean))
      .filter(r => !sectionCategory(r))
      .slice(0, 100);
    if (!rows.length) continue;
    stats.push({
      category,
      team: inferTeam(t.context, game, category) || inferTeamFromScoring(rows, scoringPlays, game),
      headers,
      rows
    });
  }

  // If Deseret labels only one of the two matching category tables, the other belongs to the opponent.
  for (const category of [...new Set(stats.map(s => s.category))]) {
    const group = stats.filter(s => s.category === category);
    if (group.length !== 2) continue;
    const known = group.find(s => clean(s.team));
    const unknown = group.find(s => !clean(s.team));
    if (!known || !unknown) continue;
    unknown.team = compact(known.team) === compact(game.awayTeam) ? game.homeTeam : game.awayTeam;
  }
  return stats;
}

function isCoreStatHeader(header) {
  const h = compact(header);
  if (!h || ['NO', 'NUMBER', 'PLAYER', 'NAME', 'TD', 'TDS', 'PAT', 'FG', 'RETURNTD'].includes(h)) return false;
  return /CARR|ATT|YARD|YDS|COMP|RECEP|REC$|TACK|SOLO|ASSIST|SACK|INTERCEPT|INT$|TFL|FUMBLE|FUM|AVG|LONG/.test(h);
}

function statsAvailability(stats) {
  if (!Array.isArray(stats) || !stats.length) return { status: 'unavailable', blocks: 0, rows: 0, filledCoreCells: 0, emptyCoreBlocks: 0 };
  let rows = 0, coreCells = 0, filledCoreCells = 0, emptyCoreBlocks = 0;
  for (const block of stats) {
    const headers = block.headers || [];
    const coreIndexes = headers.map((h, i) => isCoreStatHeader(h) ? i : -1).filter(i => i >= 0);
    let blockCoreCells = 0, blockFilledCoreCells = 0;
    for (const row of block.rows || []) {
      rows++;
      for (const i of coreIndexes) {
        blockCoreCells++;
        coreCells++;
        if (clean(row?.[i]) && !/^[-–—]$/.test(clean(row?.[i]))) {
          blockFilledCoreCells++;
          filledCoreCells++;
        }
      }
    }
    if (blockCoreCells > 0 && blockFilledCoreCells === 0) emptyCoreBlocks++;
  }
  let status = 'partial';
  if (filledCoreCells > 0 && emptyCoreBlocks === 0 && (coreCells === 0 || filledCoreCells / coreCells >= 0.25)) status = 'full';
  return { status, blocks: stats.length, rows, coreCells, filledCoreCells, emptyCoreBlocks };
}

function qualityRank(value) {
  const status = typeof value === 'string' ? value : value?.status;
  return status === 'full' ? 3 : status === 'partial' ? 2 : 1;
}

function extractScoringPlays(html) {
  const startMatch = /Scoring(?:\s|<[^>]+>)*Summary/i.exec(html);
  if (!startMatch) return [];
  let segment = html.slice(startMatch.index, startMatch.index + 50000);
  const next = /<(?:h[1-6]|section)\b[^>]*>[\s\S]*?(?:Rushing|Passing|Receiving|Special Teams|Defense)[\s\S]*?<\/(?:h[1-6]|section)>/i.exec(segment.slice(startMatch[0].length));
  if (next) segment = segment.slice(0, startMatch[0].length + next.index);

  const plays = [];
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let lm;
  while ((lm = liRe.exec(segment))) {
    const text = cellText(lm[1]).replace(/^Image:\s*[^—]+/i, '').trim();
    if (text && /—|\b\d{1,2}:\d{2}\b|\b[1-4]Q\b/i.test(text)) plays.push(text);
  }
  if (plays.length) return [...new Set(plays)].slice(0, 40);

  return htmlText(segment)
    .split(/\n+/)
    .map(clean)
    .filter(v => v.includes('—') && (/\b[1-4]Q\b/i.test(v) || /\(.*\)/.test(v)))
    .slice(0, 40);
}

function extractClock(html, game) {
  const all = htmlText(html.slice(0, Math.min(html.length, 140000)));
  const beforeScoring = all.split(/Scoring Summary/i)[0];
  const lines = beforeScoring.split(/\n+/).map(clean).filter(Boolean);
  const awayKeys = keysFor(game?.awayTeam || '');
  const homeKeys = keysFor(game?.homeTeam || '');
  const containsAny = (line, keys) => {
    const c = compact(line);
    return keys.some(k => k && c.includes(k));
  };

  const awayHits = [], homeHits = [];
  for (let i = 0; i < lines.length; i++) {
    if (containsAny(lines[i], awayKeys)) awayHits.push(i);
    if (containsAny(lines[i], homeKeys)) homeHits.push(i);
  }

  let best = null;
  for (const a of awayHits) for (const h of homeHits) {
    const gap = Math.abs(a - h);
    if (gap <= 18 && (!best || gap < best.gap)) best = { a, h, gap };
  }
  if (!best) return { clock: '', period: '' };

  const lo = Math.max(0, Math.min(best.a, best.h) - 8);
  const hi = Math.min(lines.length, Math.max(best.a, best.h) + 16);
  const segment = lines.slice(lo, hi).join('\n');

  let m = segment.match(/\b(\d{1,2}:\d{2}(?:\.\d+)?)\s*(?:left|remaining)?\s*(?:in\s*(?:the\s*)?)?(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+quarter)?)/i);
  if (m) return { clock: m[1], period: `Q${m[2] || m[3] || m[4]}` };

  m = segment.match(/\b(?:Q\s*([1-4])|([1-4])\s*Q|([1-4])(?:st|nd|rd|th)(?:\s+quarter)?)\s*(?:[-–—|•:]?\s*)(\d{1,2}:\d{2}(?:\.\d+)?)/i);
  if (m) return { clock: m[4], period: `Q${m[1] || m[2] || m[3]}` };

  return { clock: '', period: '' };
}

function extractStatus(html, box, scoringPlays, clockInfo) {
  const text = htmlText(html.slice(0, Math.min(html.length, 120000)));
  const head = text.split(/Game Details/i)[0] || text.slice(0, 5000);
  if (/\bFinal\b/i.test(head)) return { status: 'Final', final: true };
  if (/\bHalftime\b/i.test(head)) return { status: 'Halftime', final: false };
  if (clockInfo?.period) return { status: clockInfo.period, final: false };
  const q = head.match(/\b(?:Q([1-4])|([1-4])Q|([1-4])(?:st|nd|rd|th))\b/i);
  if (q) return { status: `Q${q[1] || q[2] || q[3]}`, final: false };
  if (/\bOT\b/i.test(head)) return { status: 'OT', final: false };
  const hasPoints = box?.rows?.some(r => Number(r.total) > 0);
  return { status: (hasPoints || scoringPlays?.length) ? 'Live' : 'Scheduled', final: false };
}

function parseGameDetails(html, game) {
  const tables = extractTables(html);
  const boxScore = findBoxScore(tables);
  const scoringPlays = extractScoringPlays(html);
  const stats = extractStats(tables, game, scoringPlays);
  const statsInfo = statsAvailability(stats);
  const clockInfo = extractClock(html, game);
  const kickoffTime = extractKickoffTime(html);
  const state = extractStatus(html, boxScore, scoringPlays, clockInfo);
  return {
    url: game.deseretUrl,
    status: state.status,
    final: state.final,
    clock: state.final ? '' : clockInfo.clock,
    period: state.final ? '' : clockInfo.period,
    kickoffTime,
    boxScore,
    scoringPlays,
    stats,
    statsAvailability: statsInfo,
    fetchedAt: new Date().toISOString()
  };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

function daysFromNow(date) {
  const d = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(d)) return 999;
  return (d - Date.now()) / 86400000;
}

function hoursSince(value) {
  const t = Date.parse(String(value || ''));
  return Number.isFinite(t) ? (Date.now() - t) / 3600000 : 999;
}

if (!fs.existsSync(SOURCE)) {
  console.log(`${SOURCE} not found; skipping Deseret game details.`);
  process.exit(0);
}

const weekly = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const games = Array.isArray(weekly.games) ? weekly.games : [];
let previous = { games: {} };
if (fs.existsSync(OUTPUT)) {
  try { previous = JSON.parse(fs.readFileSync(OUTPUT, 'utf8')); } catch {}
}
const details = { ...(previous.games || {}) };

let fetched = 0, reusedFinal = 0, deferredStats = 0, skippedFuture = 0, failures = 0;
for (const game of games) {
  const key = gameKey(game);
  const directUrl = clean(game.deseretUrl) || DIRECT_URL_OVERRIDES.get(key) || '';
  if (!directUrl) continue;
  const linkedGame = directUrl === game.deseretUrl ? game : { ...game, deseretUrl: directUrl };
  const prior = details[key] || null;
  const priorStats = prior?.statsAvailability || statsAvailability(prior?.stats || []);
  const delta = daysFromNow(isoDate(game.date));

  // Once full player stats are present, two final confirmations are enough.
  if (prior?.final && priorStats.status === 'full' && Number(prior.finalRefreshCount || 0) >= 2) {
    reusedFinal++;
    continue;
  }

  // Missing/partial stats can arrive well after the final. Recheck them for four days,
  // but not every workflow run: every 2 hours for the first two days, then every 6 hours.
  if (delta > 2.25 || delta < -4.25) {
    skippedFuture++;
    continue;
  }
  if (prior?.final && priorStats.status !== 'full') {
    const ageHours = Math.max(0, -delta * 24);
    const retryHours = ageHours > 48 ? 6 : 2;
    if (hoursSince(prior.fetchedAt) < retryHours) {
      deferredStats++;
      continue;
    }
  }

  try {
    const html = await fetchHtml(directUrl);
    const parsed = parseGameDetails(html, linkedGame);
    if (!parsed.kickoffTime && prior?.kickoffTime) parsed.kickoffTime = prior.kickoffTime;
    if (parsed.final) parsed.finalRefreshCount = prior?.final ? Number(prior.finalRefreshCount || 0) + 1 : 1;

    // Never replace richer previously captured stats with a temporarily emptier response.
    if (prior && qualityRank(priorStats) > qualityRank(parsed.statsAvailability)) {
      parsed.stats = prior.stats || [];
      parsed.statsAvailability = priorStats;
      parsed.statsPreservedFrom = prior.fetchedAt || '';
    }

    details[key] = parsed;
    fetched++;
    const d = details[key];
    const liveClock = d.clock ? `; clock=${d.clock} ${d.period || ''}` : '';
    console.log(`Deseret detail ${key}: ${d.status}${liveClock}; box=${d.boxScore ? 'yes' : 'no'}; plays=${d.scoringPlays.length}; statTables=${d.stats.length}; stats=${d.statsAvailability?.status || 'unknown'}`);
  } catch (err) {
    failures++;
    console.warn(`Deseret detail failed ${key}: ${err.message}`);
  }
  await new Promise(r => setTimeout(r, 100));
}

const manualChanges=applyGameDetailCorrections(details);
fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), games: details }, null, 2) + '\n');
console.log(`Deseret game details: ${fetched} fetched, ${reusedFinal} complete finals cached, ${deferredStats} partial/no-stat finals deferred, ${skippedFuture} outside refresh window, ${failures} failures.`);
if(manualChanges)console.log(`Manual game-detail corrections applied: ${manualChanges}.`);
