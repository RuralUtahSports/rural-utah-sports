import fs from 'node:fs';

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const aliases = {
  'GUNNISON': 'GUNNISON VALLEY',
  'MAPLE MTN': 'MAPLE MOUNTAIN',
  'MONUMENT VAL': 'MONUMENT VALLEY',
  'CEDAR': 'CEDAR CITY',
  'SUMMIT': 'SUMMIT ACADEMY',
  'WASATCH ACAD': 'WASATCH ACADEMY',
  'HINKLEY': 'HINCKLEY',
  'BY HIGH': 'BYH',
  'BRIGHAM YOUNG': 'BYH'
};
const canonical = value => {
  const key = clean(value).toUpperCase().replace(/\.+$/, '').trim();
  if (key.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases[key] || key;
};
const resultFor = game => {
  const a = Number(game?.teamScore), b = Number(game?.opponentScore);
  if (Number.isFinite(a) && Number.isFinite(b)) return a > b ? 'W' : a < b ? 'L' : 'T';
  const r = clean(game?.result).toUpperCase();
  return ['W','L','T'].includes(r) ? r : '';
};

const teams = JSON.parse(fs.readFileSync('teams-data.json', 'utf8'));
const schedules = JSON.parse(fs.readFileSync('team-schedules.json', 'utf8'));
const scheduleByTeam = new Map(Object.entries(schedules).map(([team, years]) => [canonical(team), years]));
let changed = 0;

for (const row of teams) {
  const years = scheduleByTeam.get(canonical(row.team));
  if (!years || typeof years !== 'object') continue;

  let wins = 0, losses = 0, ties = 0, games = 0, pointsFor = 0, pointsAgainst = 0, seasons = 0;
  for (const seasonGames of Object.values(years)) {
    if (!Array.isArray(seasonGames) || !seasonGames.length) continue;
    seasons++;
    for (const game of seasonGames) {
      const result = resultFor(game);
      if (!result) continue;
      games++;
      if (result === 'W') wins++;
      else if (result === 'L') losses++;
      else ties++;
      const pf = Number(game?.teamScore), pa = Number(game?.opponentScore);
      if (Number.isFinite(pf)) pointsFor += pf;
      if (Number.isFinite(pa)) pointsAgainst += pa;
    }
  }

  const next = {
    wins,
    losses,
    ties,
    games,
    winPct: games ? (wins + 0.5 * ties) / games : 0,
    pointsFor,
    pointsAgainst,
    avgMargin: games ? (pointsFor - pointsAgainst) / games : 0,
    seasons
  };

  let rowChanged = false;
  for (const [key, value] of Object.entries(next)) {
    if (row[key] !== value) {
      row[key] = value;
      rowChanged = true;
    }
  }
  if (rowChanged) changed++;
}

if (changed) fs.writeFileSync('teams-data.json', JSON.stringify(teams) + '\n');
console.log(`Team summary records rebuilt: ${changed}`);
