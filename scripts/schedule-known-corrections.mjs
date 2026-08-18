import fs from 'node:fs';

const FILE = 'team-schedules.json';
const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');

const aliases = {
  'GUNNISON': 'GUNNISON VALLEY',
  'MAPLE MTN': 'MAPLE MOUNTAIN',
  'MONUMENT VAL': 'MONUMENT VALLEY',
  'CEDAR': 'CEDAR CITY',
  'SUMMIT': 'SUMMIT ACADEMY',
  'WASATCH ACAD': 'WASATCH ACADEMY',
  'WASATCH ACAD.': 'WASATCH ACADEMY',
  'HINKLEY': 'HINCKLEY',
  'BY HIGH': 'BYH',
  'BRIGHAM YOUNG': 'BYH',
  'FREMOND': 'FREMONT',
  'LAY': 'LAYTON',
  'ST JOSEPH': 'SAINT JOSEPH',
  'DESERET HILLS': 'DESERT HILLS'
};

const canonical = value => {
  const key = clean(value).toUpperCase().replace(/\.+$/, '').trim();
  if (key.startsWith('WASATCH ACAD')) return 'WASATCH ACADEMY';
  return aliases[key] || key;
};

const dateCorrections = new Map(Object.entries({
  // Corner Canyon vs American Fork was played Oct. 9, 2025.
  'CORNER CANYON|AMERICAN FORK|10/3/2025': '10/9/2025',
  'CORNER CANYON|AMERICAN FORK|10/10/2025': '10/9/2025',
  'AMERICAN FORK|CORNER CANYON|10/3/2025': '10/9/2025',
  'AMERICAN FORK|CORNER CANYON|10/10/2025': '10/9/2025',

  // Corner Canyon vs Lehi was played Oct. 15, 2025.
  'CORNER CANYON|LEHI|10/10/2025': '10/15/2025',
  'LEHI|CORNER CANYON|10/10/2025': '10/15/2025',

  // Delta's 2025 source block was shifted one week early.
  'DELTA|SUMMIT ACADEMY|9/5/2025': '9/12/2025',
  'SUMMIT ACADEMY|DELTA|9/5/2025': '9/12/2025',
  'DELTA|SAN JUAN|9/12/2025': '9/19/2025',
  'SAN JUAN|DELTA|9/12/2025': '9/19/2025',
  'DELTA|SOUTH SEVIER|9/19/2025': '9/26/2025',
  'SOUTH SEVIER|DELTA|9/19/2025': '9/26/2025',
  'DELTA|CARBON|9/26/2025': '10/3/2025',
  'CARBON|DELTA|9/26/2025': '10/3/2025',
  'DELTA|EMERY|10/10/2025': '10/17/2025',
  'EMERY|DELTA|10/10/2025': '10/17/2025',
  'DELTA|SOUTH SEVIER|10/17/2025': '10/31/2025',
  'SOUTH SEVIER|DELTA|10/17/2025': '10/31/2025',

  // Verified 2025 shifted-date corrections found by the full Games audit.
  'ALTA|ROY|10/17/2025': '10/24/2025',
  'ROY|ALTA|10/17/2025': '10/24/2025',

  'COPPER HILLS|RIVERTON|10/10/2025': '10/17/2025',
  'RIVERTON|COPPER HILLS|10/10/2025': '10/17/2025',

  'DAVIS|LAYTON|10/10/2025': '10/9/2025',
  'LAYTON|DAVIS|10/10/2025': '10/9/2025',
  'DAVIS|WEBER|10/10/2025': '10/15/2025',
  'WEBER|DAVIS|10/10/2025': '10/15/2025',

  'EAST|JORDAN|10/10/2025': '10/9/2025',
  'JORDAN|EAST|10/10/2025': '10/9/2025',
  'EAST|COTTONWOOD|10/10/2025': '10/15/2025',
  'COTTONWOOD|EAST|10/10/2025': '10/15/2025',

  'FREMONT|WEST FIELD|10/10/2025': '10/9/2025',
  'WEST FIELD|FREMONT|10/10/2025': '10/9/2025',
  'FREMONT|ROY|10/10/2025': '10/15/2025',
  'ROY|FREMONT|10/10/2025': '10/15/2025',

  'GRANTSVILLE|BEN LOMOND|9/12/2025': '9/19/2025',
  'BEN LOMOND|GRANTSVILLE|9/12/2025': '9/19/2025',

  // Green Canyon's 10-3 playoff win was Oct. 24. A second source row also
  // misspelled Desert Hills as "Deseret Hills"; alias normalization above
  // makes the two copies merge on the verified date.
  'GREEN CANYON|DESERT HILLS|10/17/2025': '10/24/2025',
  'DESERT HILLS|GREEN CANYON|10/17/2025': '10/24/2025',

  'HERRIMAN|CEDAR VALLEY|10/17/2025': '10/16/2025',
  'CEDAR VALLEY|HERRIMAN|10/17/2025': '10/16/2025',
  'HERRIMAN|WEBER|10/17/2025': '10/31/2025',
  'WEBER|HERRIMAN|10/17/2025': '10/31/2025'
}));

const dropGames = new Set([
  // Grand played Delta once, Oct. 10, 2025 (Delta 42, Grand 6).
  // The Oct. 3 Delta row is a bad source row; Grand played San Juan that week.
  'GRAND|DELTA|10/3/2025',
  'DELTA|GRAND|10/3/2025'
]);

const forfeitGames = new Set([
  'GRAND|KANAB|10/17/2025',
  'KANAB|GRAND|10/17/2025'
]);

if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found`);
const schedules = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let aliasesFixed = 0;
let datesFixed = 0;
let dropped = 0;
let forfeitsMarked = 0;
let changed = false;
const affectedTeams = new Set();

for (const [rawTeam, seasons] of Object.entries(schedules)) {
  if (!seasons || typeof seasons !== 'object') continue;
  const team = canonical(rawTeam);

  for (const [season, rawGames] of Object.entries(seasons)) {
    if (!Array.isArray(rawGames)) continue;
    const next = [];

    for (const source of rawGames) {
      const game = { ...source };
      const originalOpponent = clean(game.opponent);
      const opponent = canonical(originalOpponent);
      const originalDate = clean(game.date);

      if (opponent && originalOpponent !== opponent) {
        game.opponent = opponent;
        aliasesFixed++;
        changed = true;
        affectedTeams.add(team);
      }

      const correctionKey = `${team}|${opponent}|${originalDate}`;
      const correctedDate = dateCorrections.get(correctionKey);
      if (correctedDate && correctedDate !== originalDate) {
        game.date = correctedDate;
        datesFixed++;
        changed = true;
        affectedTeams.add(team);
      }

      const finalDate = clean(game.date);
      const finalKey = `${team}|${opponent}|${finalDate}`;
      if (dropGames.has(finalKey)) {
        dropped++;
        changed = true;
        affectedTeams.add(team);
        continue;
      }

      if (forfeitGames.has(finalKey)) {
        if (clean(game.notes) !== 'Forfeit' || game.playoff === true) {
          game.notes = 'Forfeit';
          game.playoff = false;
          forfeitsMarked++;
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

console.log('Known schedule correction layer complete.');
console.log(`Opponent aliases normalized: ${aliasesFixed}`);
console.log(`Verified dates corrected: ${datesFixed}`);
console.log(`Known bad rows removed: ${dropped}`);
console.log(`Forfeit notes applied: ${forfeitsMarked}`);
console.log(`Teams affected: ${affectedTeams.size}`);
if (affectedTeams.size) console.log([...affectedTeams].sort().join(', '));
