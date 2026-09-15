import fs from 'node:fs';

const BASE = 'https://uhsaa.org/rpi/football/2026';
const OUT = 'uhsaa-rpi-official-2026.json';
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
const decode = (value) => clean(value)
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

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

const results = await Promise.all(CLASSES.map(async ([classification, endpoint]) => {
  const sourceUrl = `${BASE}/${endpoint}.php`;
  const rows = parseRows(await fetchText(sourceUrl), classification);
  if (!rows.length) throw new Error(`No official ${classification} RPI rows found`);
  return [classification, {sourceUrl, rows}];
}));

const payload = {
  season: 2026,
  fetchedAt: new Date().toISOString(),
  source: `${BASE}/`,
  classifications: Object.fromEntries(results),
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Fetched ${results.reduce((sum, [, group]) => sum + group.rows.length, 0)} official UHSAA football RPI rows.`);
