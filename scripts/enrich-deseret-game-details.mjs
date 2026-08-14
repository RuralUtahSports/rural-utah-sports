import fs from 'node:fs';

const SOURCE = 'weekly-simulation.json';
const OUTPUT = 'deseret-game-details.json';
const clean = v => String(v ?? '').trim();
const compact = v => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '');

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
      const context = htmlText(html.slice(Math.max(0, m.index - 1800), m.index));
      out.push({ rows, context });
    }
  }
  return out;
}

function findBoxScore(tables) {
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
      if (!scoreCells.every(v => /^\d+$/.test(clean(v)))) continue;
      rows.push({
        team: r.slice(0, -5).filter(Boolean).join(' ').replace(/^@\s*/, '').trim(),
        quarters: scoreCells.slice(0, 4).map(Number),
        total: Number(scoreCells[4])
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
  if ((joined.includes('COMP-ATT') || joined.includes('COMP - ATT')) && joined.includes('YARD')) return 'Passing';
  if (joined.includes('CARRIES') && joined.includes('YARD')) return 'Rushing';
  if (joined.includes('RECEPTIONS') && joined.includes('YARD')) return 'Receiving';
  if (joined.includes('TACKLES') && (joined.includes('SACK') || joined.includes('INTERCEPTION'))) return 'Defense';
  if (joined.includes('FG') && joined.includes('PAT')) return 'Special Teams';
  return '';
}

function inferTeam(context, game) {
  const c = compact(context);
  let best = { team: '', at: -1 };
  for (const team of [game.awayTeam, game.homeTeam]) {
    for (const key of keysFor(team)) {
      const at = c.lastIndexOf(key);
      if (at > best.at) best = { team, at };
    }
  }
  return best.team;
}

function extractStats(tables, box, game) {
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
      team: inferTeam(t.context, game),
      headers,
      rows
    });
  }
  return stats;
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

function extractStatus(html, box) {
  const text = htmlText(html.slice(0, Math.min(html.length, 50000)));
  const head = text.split(/Game Details/i)[0] || text.slice(0, 3000);
  if (/\bFinal\b/i.test(head)) return { status: 'Final', final: true };
  if (/\bHalftime\b/i.test(head)) return { status: 'Halftime', final: false };
  const q = head.match(/\b(?:Q([1-4])|([1-4])Q|([1-4])(?:st|nd|rd|th))\b/i);
  if (q) return { status: `Q${q[1] || q[2] || q[3]}`, final: false };
  if (/\bOT\b/i.test(head)) return { status: 'OT', final: false };
  const hasPoints = box?.rows?.some(r => Number(r.total) > 0);
  return { status: hasPoints ? 'Live' : 'Scheduled', final: false };
}

function parseGameDetails(html, game) {
  const tables = extractTables(html);
  const boxScore = findBoxScore(tables);
  const scoringPlays = extractScoringPlays(html);
  const stats = extractStats(tables, boxScore, game);
  const state = extractStatus(html, boxScore);
  return {
    url: game.deseretUrl,
    status: state.status,
    final: state.final,
    boxScore,
    scoringPlays,
    stats,
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

let fetched = 0, reusedFinal = 0, skippedFuture = 0, failures = 0;
for (const game of games) {
  if (!clean(game.deseretUrl)) continue;
  const key = gameKey(game);
  if (details[key]?.final) { reusedFinal++; continue; }
  const delta = daysFromNow(isoDate(game.date));
  if (delta > 2.25 || delta < -2.25) { skippedFuture++; continue; }
  try {
    const html = await fetchHtml(game.deseretUrl);
    details[key] = parseGameDetails(html, game);
    fetched++;
    const d = details[key];
    console.log(`Deseret detail ${key}: ${d.status}; box=${d.boxScore ? 'yes' : 'no'}; plays=${d.scoringPlays.length}; statTables=${d.stats.length}`);
  } catch (err) {
    failures++;
    console.warn(`Deseret detail failed ${key}: ${err.message}`);
  }
  await new Promise(r => setTimeout(r, 100));
}

fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: new Date().toISOString(), games: details }, null, 2) + '\n');
console.log(`Deseret game details: ${fetched} fetched, ${reusedFinal} final cached, ${skippedFuture} outside live window, ${failures} failures.`);
