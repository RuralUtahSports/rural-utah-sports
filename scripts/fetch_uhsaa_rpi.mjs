import fs from 'node:fs';

const BASE = 'https://uhsaa.org/rpi/football/2026';
const OUT = 'uhsaa-rpi-official-2026.json';
const TIME_ZONE = 'America/Denver';
const CLASSES = [
  ['6A', '6A'],
  ['5A', '5A'],
  ['4A', '4A'],
  ['3A', '3A'],
  ['2A', '2A'],
  ['1A', '1A'],
  ['8P', '8player'],
];

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalizeTeam = (value) => clean(value).toUpperCase();
const decode = (value) => clean(value)
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function weekOf(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );
  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
  return localDate.toISOString().slice(0, 10);
}

async function fetchText(url, attempt = 0) {
  const response = await fetch(url, {
    headers: {accept: 'text/html,application/xhtml+xml'},
    signal: AbortSignal.timeout(20000),
  });
  if (response.ok) return response.text();
  if (attempt < 3 && [429, 500, 502, 503, 504].includes(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    return fetchText(url, attempt + 1);
  }
  throw new Error(`${response.status} ${response.statusText}: ${url}`);
}

function parseRows(html, classification) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decode(cell[1]));
    if (cells.length < 7 || !/^\d+$/.test(cells[0])) continue;
    rows.push({
      rank: Number(cells[0]),
      team: cells[1],
      classification,
      rpi: Number(cells[2]),
      mwp: Number(cells[3]),
      owp: Number(cells[4]),
      oowp: Number(cells[5]),
      record: cells[6],
    });
  }
  return rows;
}

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const currentWeek = weekOf();
const sameMovementWeek = previous?.movement?.weekOf === currentWeek;
const baselineWeekOf = sameMovementWeek
  ? previous?.movement?.baselineWeekOf ?? null
  : previous?.movement?.weekOf ?? null;

function addMovement(rows, classification) {
  const priorRows = previous?.classifications?.[classification]?.rows || [];
  const priorByTeam = new Map(priorRows.map((row) => [normalizeTeam(row.team), row]));
  return rows.map((row) => {
    const prior = priorByTeam.get(normalizeTeam(row.team));
    const baselineRank = sameMovementWeek
      ? Number(prior?.previousRank ?? prior?.rank)
      : Number(prior?.rank);
    const previousRank = Number.isFinite(baselineRank) ? baselineRank : null;
    return {
      ...row,
      previousRank,
      rankChange: previousRank === null ? null : previousRank - row.rank,
    };
  });
}

const results = await Promise.all(CLASSES.map(async ([classification, endpoint]) => {
  const sourceUrl = `${BASE}/${endpoint}.php`;
  const rows = addMovement(parseRows(await fetchText(sourceUrl), classification), classification);
  if (!rows.length) throw new Error(`No official ${classification} RPI rows found`);
  return [classification, {sourceUrl, rows}];
}));

const payload = {
  season: 2026,
  fetchedAt: new Date().toISOString(),
  source: `${BASE}/`,
  movement: {
    weekOf: currentWeek,
    baselineWeekOf,
    label: baselineWeekOf ? `vs. official UHSAA RPI from ${baselineWeekOf}` : 'Official UHSAA week-over-week movement',
  },
  classifications: Object.fromEntries(results),
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Fetched ${results.reduce((sum, [, group]) => sum + group.rows.length, 0)} official UHSAA football RPI rows.`);
