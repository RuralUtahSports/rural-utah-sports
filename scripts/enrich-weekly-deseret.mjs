import fs from 'node:fs';

const BASE = 'https://sports.deseret.com';
const CURRENT = 'weekly-simulation.json';
const CACHE = 'deseret-game-links.json';

const clean = v => String(v ?? '').trim();
const compact = v => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
const slugify = v => clean(v).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const KEY_ALIASES = {
  ALA: ['AMERICANLEADERSHIP'],
  AMERICANLEADERSHIPACADEMY: ['AMERICANLEADERSHIP'],
  AMERICANLEADERSHIP: ['AMERICANLEADERSHIP'],
  CEDARCITY: ['CEDAR'],
  CEDAR: ['CEDAR'],
  GRANDCOUNTY: ['GRAND'],
  GRAND: ['GRAND'],
  GUNNISON: ['GUNNISONVALLEY'],
  GUNNISONVALLEY: ['GUNNISONVALLEY'],
  JUANDIEGOCATHOLIC: ['JUANDIEGO'],
  JUANDIEGO: ['JUANDIEGO'],
  LAYTONCHRISTIANACADEMY: ['LAYTONCHRISTIAN'],
  LAYTONCHRISTIAN: ['LAYTONCHRISTIAN'],
  MONUMENTVAL: ['MONUMENTVALLEY'],
  MONUMENTVALLEY: ['MONUMENTVALLEY'],
  MAPLEMTN: ['MAPLEMOUNTAIN'],
  MAPLEMOUNTAIN: ['MAPLEMOUNTAIN']
};

const SCHOOL_SLUG_OVERRIDES = {
  ALA: 'american-leadership',
  AMERICANLEADERSHIPACADEMY: 'american-leadership',
  AMERICANLEADERSHIP: 'american-leadership',
  CEDARCITY: 'cedar',
  CEDAR: 'cedar',
  GRANDCOUNTY: 'grand',
  GRAND: 'grand',
  GUNNISON: 'gunnison-valley',
  GUNNISONVALLEY: 'gunnison-valley',
  JUANDIEGOCATHOLIC: 'juan-diego',
  JUANDIEGO: 'juan-diego',
  LAYTONCHRISTIANACADEMY: 'layton-christian',
  LAYTONCHRISTIAN: 'layton-christian',
  MONUMENTVAL: 'monument-valley',
  MONUMENTVALLEY: 'monument-valley',
  MAPLEMTN: 'maple-mountain',
  MAPLEMOUNTAIN: 'maple-mountain'
};

function keysFor(name) {
  const base = compact(name);
  const out = new Set([base]);
  for (const alias of KEY_ALIASES[base] || []) out.add(alias);
  return out;
}

function schoolSlug(name) {
  const k = compact(name);
  return SCHOOL_SLUG_OVERRIDES[k] || slugify(name.replace(/\s*\([A-Z]{2,3}\)\s*$/i, ''));
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

function extractGameLinks(html) {
  const found = new Map();
  const text = String(html || '').replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const re = /(?:href=["']|["'])(https?:\/\/sports\.deseret\.com)?(\/high-school\/football\/game\/(\d{4}-\d{2}-\d{2})\/([^"'?#<>]+?)\/(\d+))(?:[?"'#<]|$)/gi;
  let m;
  while ((m = re.exec(text))) {
    const date = m[3];
    const matchup = m[4];
    const mm = matchup.match(/^(.+?)-football-vs-(.+?)-football$/i);
    if (!mm) continue;
    const url = `${BASE}${m[2]}`;
    found.set(url, {
      url,
      date,
      awayKey: compact(mm[1]),
      homeKey: compact(mm[2])
    });
  }
  return [...found.values()];
}

function matches(game, candidate) {
  if (isoDate(game.date) !== candidate.date) return false;
  const away = keysFor(game.awayTeam);
  const home = keysFor(game.homeTeam);
  return away.has(candidate.awayKey) && home.has(candidate.homeKey);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

async function candidatesForDate(date) {
  const url = `${BASE}/high-school/football/scores-schedule/${date}?region=all`;
  try {
    return extractGameLinks(await fetchHtml(url));
  } catch (err) {
    console.warn(`Deseret date page failed for ${date}: ${err.message}`);
    return [];
  }
}

async function candidatesForTeam(team) {
  const slug = schoolSlug(team);
  if (!slug) return [];
  const url = `${BASE}/high-school/school/${slug}/football/scores-schedule`;
  try {
    return extractGameLinks(await fetchHtml(url));
  } catch (err) {
    console.warn(`Deseret team page failed for ${team}: ${err.message}`);
    return [];
  }
}

if (!fs.existsSync(CURRENT)) {
  console.log('weekly-simulation.json not found; skipping Deseret link enrichment.');
  process.exit(0);
}

const current = JSON.parse(fs.readFileSync(CURRENT, 'utf8'));
const games = Array.isArray(current.games) ? current.games : [];

const savedLinks = new Map();
for (const g of games) {
  if (clean(g.deseretUrl)) savedLinks.set(gameKey(g), clean(g.deseretUrl));
}
if (fs.existsSync(CACHE)) {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    for (const [key, url] of Object.entries(cache.links || cache || {})) {
      if (clean(url)) savedLinks.set(key, clean(url));
    }
  } catch (err) {
    console.warn(`Could not read ${CACHE}: ${err.message}`);
  }
}

let cached = 0;
for (const g of games) {
  const prior = savedLinks.get(gameKey(g));
  if (prior) {
    g.deseretUrl = prior;
    cached++;
  } else {
    delete g.deseretUrl;
  }
}

const pending = games.filter(g => !g.deseretUrl && isoDate(g.date).startsWith('2026-'));
const byDate = new Map();
for (const g of pending) {
  const date = isoDate(g.date);
  if (!byDate.has(date)) byDate.set(date, []);
  byDate.get(date).push(g);
}

let matched = 0;
for (const [date, rows] of byDate) {
  const candidates = await candidatesForDate(date);
  for (const g of rows) {
    const hit = candidates.find(c => matches(g, c));
    if (hit) {
      g.deseretUrl = hit.url;
      savedLinks.set(gameKey(g), hit.url);
      matched++;
    }
  }
}

// If a date page did not expose a game link, try one of the teams' schedule pages.
const fallback = games.filter(g => !g.deseretUrl && isoDate(g.date).startsWith('2026-'));
const teamCache = new Map();
for (const g of fallback) {
  let hit = null;
  for (const team of [g.homeTeam, g.awayTeam]) {
    const key = compact(team);
    if (!teamCache.has(key)) teamCache.set(key, await candidatesForTeam(team));
    hit = teamCache.get(key).find(c => matches(g, c));
    if (hit) break;
  }
  if (hit) {
    g.deseretUrl = hit.url;
    savedLinks.set(gameKey(g), hit.url);
    matched++;
  }
}

fs.writeFileSync(CURRENT, JSON.stringify({ ...current, games }));
fs.writeFileSync(CACHE, JSON.stringify({ updatedAt: new Date().toISOString(), links: Object.fromEntries([...savedLinks.entries()].sort()) }, null, 2) + '\n');
const unresolved = games.filter(g => isoDate(g.date).startsWith('2026-') && !g.deseretUrl).length;
console.log(`Deseret links: ${cached} reused, ${matched} matched, ${unresolved} unresolved.`);
