import fs from 'node:fs';

const FILE = 'team-schedules.json';
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const keyPart = value => clean(value).toUpperCase();

// Verified historical corrections found while working backward through the
// full Games audit. Keep this separate from the modern correction layer so
// older-source cleanup remains easy to inspect and extend season by season.
const dateCorrections = new Map(Object.entries({
  // 2022 — both Region 1 and Region 4 played these Thursday games Oct. 6.
  'DAVIS|WEBER|10/7/2022': '10/6/2022',
  'WEBER|DAVIS|10/7/2022': '10/6/2022',
  'SKYRIDGE|PLEASANT GROVE|10/7/2022': '10/6/2022',
  'PLEASANT GROVE|SKYRIDGE|10/7/2022': '10/6/2022'
}));

const dropGames = new Set([
  // 2022 — Davis and Skyridge met in the 6A quarterfinal Nov. 4. The Oct. 7
  // copies duplicate that 47-22 game on both team pages.
  'DAVIS|SKYRIDGE|10/7/2022',
  'SKYRIDGE|DAVIS|10/7/2022',

  // 2022 — Rich beat Monument Valley 47-12 in the 1A 8-player quarterfinal.
  // The misspelled MONTUMENT VALLEY row is a duplicate of the correct row.
  'RICH|MONTUMENT VALLEY|10/28/2022',

  // 2021 — Cedar City played Logan in the 4A first round Oct. 22. East
  // actually played Cedar Valley; this 35-7 pairing was copied onto both
  // Cedar City and East schedules.
  'CEDAR CITY|EAST|10/22/2021',
  'EAST|CEDAR CITY|10/22/2021'
]);

if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found`);
const schedules = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let datesFixed = 0;
let dropped = 0;
let changed = false;
const affectedTeams = new Set();

for (const [rawTeam, seasons] of Object.entries(schedules)) {
  if (!seasons || typeof seasons !== 'object') continue;
  const team = keyPart(rawTeam);

  for (const [season, rawGames] of Object.entries(seasons)) {
    if (!Array.isArray(rawGames)) continue;
    const next = [];

    for (const source of rawGames) {
      const game = { ...source };
      const opponent = keyPart(game.opponent);
      const originalDate = clean(game.date);
      const originalKey = `${team}|${opponent}|${originalDate}`;

      if (dropGames.has(originalKey)) {
        dropped++;
        changed = true;
        affectedTeams.add(team);
        continue;
      }

      const correctedDate = dateCorrections.get(originalKey);
      if (correctedDate && correctedDate !== originalDate) {
        game.date = correctedDate;
        datesFixed++;
        changed = true;
        affectedTeams.add(team);
      }

      next.push(game);
    }

    seasons[season] = next;
  }
}

if (changed) fs.writeFileSync(FILE, JSON.stringify(schedules) + '\n');

console.log('Historical schedule audit correction layer complete.');
console.log(`Verified dates corrected: ${datesFixed}`);
console.log(`Verified bad/duplicate rows removed: ${dropped}`);
console.log(`Teams affected: ${affectedTeams.size}`);
if (affectedTeams.size) console.log([...affectedTeams].sort().join(', '));
