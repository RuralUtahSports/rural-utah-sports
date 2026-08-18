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
  'PLEASANT GROVE|SKYRIDGE|10/7/2022': '10/6/2022',

  // 1998 — several copied source dates landed on Sept. 11. Grand actually
  // played Rich on Sept. 18; Rich played Evanston JV Sept. 12.
  'GRAND|RICH|9/11/1998': '9/18/1998',
  'RICH|GRAND|9/11/1998': '9/18/1998',
  'RICH|EVANSTON (WY) JV|9/11/1998': '9/12/1998',

  // 1998 — San Juan played Monument Valley, Ariz. on Sept. 4, then St. Johns,
  // Ariz. on Sept. 11. The Monument Valley final was shifted one week late.
  'SAN JUAN|MONUMENT VALLEY (AZ)|9/11/1998': '9/4/1998'
}));

const scoreCorrections = new Map(Object.entries({
  // 2016 — Ben Lomond beat Richfield 40-17 on Aug. 19. Its stored Richfield
  // row had the wrong 0-36 score; Richfield's reciprocal row is already right.
  'BEN LOMOND|RICHFIELD|8/19/2016': { teamScore: 40, opponentScore: 17, result: 'W' }
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
  'EAST|CEDAR CITY|10/22/2021',

  // 2019 — American Fork played Westlake Sept. 27 while West played
  // Taylorsville. Their stored American Fork/West pairing is a copied row.
  'AMERICAN FORK|WEST|9/27/2019',
  'WEST|AMERICAN FORK|9/27/2019',

  // 2016 — Ben Lomond's real opener was a 40-17 win over Richfield. The Rich
  // copy and Rich's reciprocal-looking Ben Lomond row are both source mixups.
  'BEN LOMOND|RICH|8/19/2016',
  'RICH|BEN LOMOND|8/19/2016',

  // 2016 — the 24-16 Oct. 25 Region 7 play-in was Skyridge at Provo. Snow
  // Canyon did not play that day; these copied rows are not real games.
  'PROVO|SNOW CANYON|10/25/2016',
  'SNOW CANYON|PROVO|10/25/2016',

  // 2004 — Beaver beat Richfield 35-7 on Sept. 10 while Rich played West
  // Side, Idaho. The Beaver/Rich rows are crossed copies, not a real game.
  'BEAVER|RICH|9/10/2004',
  'RICH|BEAVER|9/10/2004',

  // 2004 — Enterprise opened at Beaver Aug. 20 while North Sevier hosted
  // Duchesne. The Enterprise/North Sevier rows duplicate those real finals.
  'ENTERPRISE|NORTH SEVIER|8/20/2004',
  'NORTH SEVIER|ENTERPRISE|8/20/2004',

  // 2001 — Skyline played Highland Aug. 31 while Uintah played Sky View.
  // The Skyline/Uintah rows are crossed copies, not a real game.
  'SKYLINE|UINTAH|8/31/2001',
  'UINTAH|SKYLINE|8/31/2001'
]);

if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found`);
const schedules = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let datesFixed = 0;
let scoresFixed = 0;
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

      const currentKey = `${team}|${opponent}|${clean(game.date)}`;
      const scoreFix = scoreCorrections.get(currentKey);
      if (scoreFix) {
        const scoreChanged = Number(game.teamScore) !== scoreFix.teamScore
          || Number(game.opponentScore) !== scoreFix.opponentScore
          || clean(game.result).toUpperCase() !== scoreFix.result;
        if (scoreChanged) {
          game.teamScore = scoreFix.teamScore;
          game.opponentScore = scoreFix.opponentScore;
          game.result = scoreFix.result;
          scoresFixed++;
          changed = true;
          affectedTeams.add(team);
        }
      }

      next.push(game);
    }

    seasons[season] = next;
  }
}

if (changed) fs.writeFileSync(FILE, JSON.stringify(schedules) + '\n');

console.log('Historical schedule audit correction layer complete.');
console.log(`Verified dates corrected: ${datesFixed}`);
console.log(`Verified scores corrected: ${scoresFixed}`);
console.log(`Verified bad/duplicate rows removed: ${dropped}`);
console.log(`Teams affected: ${affectedTeams.size}`);
if (affectedTeams.size) console.log([...affectedTeams].sort().join(', '));
