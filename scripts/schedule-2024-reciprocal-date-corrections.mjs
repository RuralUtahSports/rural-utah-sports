import fs from 'node:fs';

const FILE = 'team-schedules.json';
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const canonical = value => clean(value).toUpperCase().replace(/\.+$/, '').trim();

// Counterpart rows for verified 2024 date corrections. These keep both team
// pages on the same played date after the primary correction layer runs.
const dateCorrections = new Map(Object.entries({
  'OGDEN|BEN LOMOND|10/11/2024': '10/17/2024',
  'MAPLE MOUNTAIN|BOUNTIFUL|11/1/2024': '11/8/2024',
  'BRIGHTON|WEST|10/18/2024': '10/16/2024',
  'TIMPVIEW|CEDAR VALLEY|9/20/2024': '9/27/2024',
  'WESTLAKE|COPPER HILLS|10/18/2024': '10/25/2024',
  'OGDEN|GRANTSVILLE|9/20/2024': '9/27/2024',
  'OGDEN|JUAN DIEGO|9/27/2024': '10/4/2024',
  'WEBER|LAYTON|10/18/2024': '10/16/2024',
  'LONE PEAK|WESTLAKE|10/18/2024': '10/16/2024',
  'MAPLE MOUNTAIN|NORTHRIDGE|10/25/2024': '11/1/2024',
  'OGDEN|MORGAN|10/4/2024': '10/11/2024',
  'OGDEN|UNION|9/13/2024': '9/20/2024',
  'TIMPVIEW|WASATCH|9/27/2024': '10/4/2024'
}));

if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found`);
const schedules = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let changed = false;
let datesFixed = 0;
const affectedTeams = new Set();

for (const [rawTeam, seasons] of Object.entries(schedules)) {
  if (!seasons || typeof seasons !== 'object') continue;
  const team = canonical(rawTeam);

  for (const games of Object.values(seasons)) {
    if (!Array.isArray(games)) continue;
    for (const game of games) {
      const opponent = canonical(game.opponent);
      const oldDate = clean(game.date);
      const newDate = dateCorrections.get(`${team}|${opponent}|${oldDate}`);
      if (!newDate || newDate === oldDate) continue;
      game.date = newDate;
      datesFixed++;
      changed = true;
      affectedTeams.add(team);
    }
  }
}

if (changed) fs.writeFileSync(FILE, JSON.stringify(schedules) + '\n');

console.log(`Verified 2024 reciprocal dates corrected: ${datesFixed}`);
if (affectedTeams.size) console.log([...affectedTeams].sort().join(', '));
