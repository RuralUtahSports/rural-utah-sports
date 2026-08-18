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
  'DESERET HILLS': 'DESERT HILLS',
  'PINE': 'PINE VIEW',
  'UMA-CW': 'UMA-LEHI'
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
  'WEBER|HERRIMAN|10/17/2025': '10/31/2025',

  // Third verified 2025 cleanup batch.
  'BEN LOMOND|MORGAN|9/19/2025': '9/26/2025',
  'MORGAN|BEN LOMOND|9/19/2025': '9/26/2025',
  'JUAB|CEDAR CITY|10/31/2025': '11/7/2025',
  'CEDAR CITY|JUAB|10/31/2025': '11/7/2025',
  'JUAN DIEGO|MURRAY|10/3/2025': '10/9/2025',
  'MURRAY|JUAN DIEGO|10/3/2025': '10/9/2025',
  'JUAN DIEGO|RICHFIELD|10/17/2025': '10/16/2025',
  'RICHFIELD|JUAN DIEGO|10/17/2025': '10/16/2025',
  'JUAN DIEGO|SKY VIEW|10/17/2025': '10/24/2025',
  'SKY VIEW|JUAN DIEGO|10/17/2025': '10/24/2025',
  'JUDGE MEMORIAL|BEN LOMOND|9/5/2025': '9/12/2025',
  'BEN LOMOND|JUDGE MEMORIAL|9/5/2025': '9/12/2025',
  'LAYTON CHRISTIAN|MOUNTAIN VIEW|9/5/2025': '9/12/2025',
  'MOUNTAIN VIEW|LAYTON CHRISTIAN|9/5/2025': '9/12/2025',
  'LOGAN|BEN LOMOND|9/26/2025': '10/3/2025',
  'BEN LOMOND|LOGAN|9/26/2025': '10/3/2025',
  'MANTI|CEDAR CITY|11/7/2025': '11/15/2025',
  'CEDAR CITY|MANTI|11/7/2025': '11/15/2025',
  'MILFORD|WATER CANYON|9/26/2025': '10/3/2025',
  'WATER CANYON|MILFORD|9/26/2025': '10/3/2025',
  'MONTICELLO|ALTAMONT|9/5/2025': '9/12/2025',
  'ALTAMONT|MONTICELLO|9/5/2025': '9/12/2025',
  'MONUMENT VALLEY|PANGUITCH|9/19/2025': '9/26/2025',
  'PANGUITCH|MONUMENT VALLEY|9/19/2025': '9/26/2025',
  'MOUNTAIN RIDGE|RIVERTON|10/17/2025': '10/31/2025',
  'RIVERTON|MOUNTAIN RIDGE|10/17/2025': '10/31/2025',
  'MOUNTAIN RIDGE|HERRIMAN|10/31/2025': '11/7/2025',
  'HERRIMAN|MOUNTAIN RIDGE|10/31/2025': '11/7/2025',
  'OGDEN|MORGAN|10/10/2025': '10/9/2025',
  'MORGAN|OGDEN|10/10/2025': '10/9/2025',
  'OGDEN|BEN LOMOND|10/10/2025': '10/15/2025',
  'BEN LOMOND|OGDEN|10/10/2025': '10/15/2025',
  'OGDEN|CEDAR CITY|10/24/2025': '10/31/2025',
  'CEDAR CITY|OGDEN|10/24/2025': '10/31/2025',
  'PARK CITY|MOUNTAIN VIEW|9/12/2025': '9/19/2025',
  'MOUNTAIN VIEW|PARK CITY|9/12/2025': '9/19/2025',
  'PANGUITCH|SAINT JOSEPH|9/26/2025': '10/3/2025',
  'SAINT JOSEPH|PANGUITCH|9/26/2025': '10/3/2025',

  // Final verified 2025 audit batch.
  'ALTAMONT|MONUMENT VALLEY|9/12/2025': '9/13/2025',
  'MONUMENT VALLEY|ALTAMONT|9/12/2025': '9/13/2025',
  'BEN LOMOND|UNION|10/3/2025': '10/9/2025',
  'UNION|BEN LOMOND|10/3/2025': '10/9/2025',
  'MOUNTAIN VIEW|UINTAH|9/19/2025': '9/26/2025',
  'UINTAH|MOUNTAIN VIEW|9/19/2025': '9/26/2025',
  'PROVO|MOUNTAIN VIEW|10/10/2025': '10/15/2025',
  'MOUNTAIN VIEW|PROVO|10/10/2025': '10/15/2025',
  'SALEM HILLS|MOUNTAIN VIEW|10/3/2025': '10/9/2025',
  'MOUNTAIN VIEW|SALEM HILLS|10/3/2025': '10/9/2025',
  'SKYLINE|MURRAY|10/10/2025': '10/16/2025',
  'MURRAY|SKYLINE|10/10/2025': '10/16/2025',
  'SOUTH SUMMIT|BEN LOMOND|8/29/2025': '9/5/2025',
  'BEN LOMOND|SOUTH SUMMIT|8/29/2025': '9/5/2025',
  'TIMPANOGOS|MOUNTAIN VIEW|9/26/2025': '10/3/2025',
  'MOUNTAIN VIEW|TIMPANOGOS|9/26/2025': '10/3/2025',
  'WATER CANYON|ALTAMONT|8/29/2025': '9/5/2025',
  'ALTAMONT|WATER CANYON|8/29/2025': '9/5/2025',
  'WATER CANYON|PANGUITCH|10/3/2025': '10/8/2025',
  'PANGUITCH|WATER CANYON|10/3/2025': '10/8/2025',
  'WEST FIELD|VIEWMONT|10/17/2025': '10/24/2025',
  'VIEWMONT|WEST FIELD|10/17/2025': '10/24/2025',
  'WHITEHORSE|WATER CANYON|9/12/2025': '9/19/2025',
  'WATER CANYON|WHITEHORSE|9/12/2025': '9/19/2025',
  'PANGUITCH|ALTAMONT|10/10/2025': '10/17/2025',
  'ALTAMONT|PANGUITCH|10/10/2025': '10/17/2025',

  // UMA-LEHI is Utah Military Academy - Camp Williams. Its source rows had
  // the Hillfield and playoff games on the wrong dates.
  'UMA-LEHI|UMA-HILLFIELD|10/3/2025': '10/15/2025',
  'UMA-HILLFIELD|UMA-LEHI|10/3/2025': '10/15/2025',
  'UMA-LEHI|UMA-HILLFIELD|10/24/2025': '10/15/2025',
  'UMA-HILLFIELD|UMA-LEHI|10/24/2025': '10/15/2025',
  'UMA-LEHI|PANGUITCH|10/10/2025': '10/24/2025',
  'PANGUITCH|UMA-LEHI|10/10/2025': '10/24/2025',
  'UMA-LEHI|MILFORD|10/17/2025': '10/31/2025',
  'MILFORD|UMA-LEHI|10/17/2025': '10/31/2025',
  'UMA-HILLFIELD|WATER CANYON|9/19/2025': '9/26/2025',
  'WATER CANYON|UMA-HILLFIELD|9/19/2025': '9/26/2025'
}));

const scoreCorrections = new Map(Object.entries({
  // Verified final: Hillfield 36, St. Joseph 0 on Oct. 10, 2025.
  'UMA-HILLFIELD|SAINT JOSEPH|10/10/2025': { teamScore: 36, opponentScore: 0, result: 'W' },
  'SAINT JOSEPH|UMA-HILLFIELD|10/10/2025': { teamScore: 0, opponentScore: 36, result: 'L' }
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
let scoresFixed = 0;
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
      const scoreCorrection = scoreCorrections.get(finalKey);
      if (scoreCorrection && (
        Number(game.teamScore) !== scoreCorrection.teamScore ||
        Number(game.opponentScore) !== scoreCorrection.opponentScore ||
        clean(game.result).toUpperCase() !== scoreCorrection.result
      )) {
        game.teamScore = scoreCorrection.teamScore;
        game.opponentScore = scoreCorrection.opponentScore;
        game.result = scoreCorrection.result;
        scoresFixed++;
        changed = true;
        affectedTeams.add(team);
      }

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
console.log(`Verified scores corrected: ${scoresFixed}`);
console.log(`Known bad rows removed: ${dropped}`);
console.log(`Forfeit notes applied: ${forfeitsMarked}`);
console.log(`Teams affected: ${affectedTeams.size}`);
if (affectedTeams.size) console.log([...affectedTeams].sort().join(', '));
