import fs from 'node:fs';

const FILE = 'team-schedules.json';
const schedules = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const upper = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

const dateFixes = new Map([
  ['MILLARD|BEAVER|10/15/1998', '10/22/1998'],
  ['BEAVER|MILLARD|10/15/1998', '10/22/1998']
]);

const finalFixes = new Map([
  ['MILLARD|PAROWAN|10/15/1998', [37, 0, 'W']],
  ['PAROWAN|MILLARD|10/15/1998', [0, 37, 'L']]
]);

const removeRows = new Set([
  'PROVO|PAYSON|10/23/2004',
  'PAYSON|PROVO|10/23/2004',
  'PROVO|SPANISH FORK|10/23/2004',
  'SPANISH FORK|PROVO|10/23/2004',

  // Verified 1960 Bonneville cleanup. Bountiful beat Bonneville 26-6;
  // the same 26-6 result was copied onto a Ben Lomond row on both pages.
  // Bonneville and Ben Lomond actually met again on Oct. 13 (Ben Lomond 34-0).
  'BONNEVILLE|BEN LOMOND|10/8/1960',
  'BEN LOMOND|BONNEVILLE|10/8/1960'
]);

let changed = false;
for (const [rawTeam, seasons] of Object.entries(schedules)) {
  const team = upper(rawTeam);
  if (!seasons || typeof seasons !== 'object') continue;
  for (const [year, rows] of Object.entries(seasons)) {
    if (!Array.isArray(rows)) continue;
    const next = [];
    for (const source of rows) {
      const row = { ...source };
      const opponent = upper(row.opponent);
      const originalKey = `${team}|${opponent}|${String(row.date ?? '').trim()}`;
      if (removeRows.has(originalKey)) {
        changed = true;
        continue;
      }
      const newDate = dateFixes.get(originalKey);
      if (newDate) {
        row.date = newDate;
        changed = true;
      }
      const currentKey = `${team}|${opponent}|${String(row.date ?? '').trim()}`;
      const final = finalFixes.get(currentKey);
      if (final) {
        const [teamScore, opponentScore, result] = final;
        if (Number(row.teamScore) !== teamScore || Number(row.opponentScore) !== opponentScore || upper(row.result) !== result) {
          row.teamScore = teamScore;
          row.opponentScore = opponentScore;
          row.result = result;
          changed = true;
        }
      }
      next.push(row);
    }
    seasons[year] = next;
  }
}

// Verified 1999 West cleanup. Deseret's 1998 schedule has West at Bountiful
// on Aug. 28, while its 1999 schedule has West vs. St. Louis, Hawaii on Aug. 28.
// Move the 13-56 St. Louis result into the correct season instead of merely
// changing the date and leaving it counted in West's 1998 totals.
for (const [rawTeam, seasons] of Object.entries(schedules)) {
  if (upper(rawTeam) !== 'WEST' || !seasons || typeof seasons !== 'object') continue;
  const sourceRows = Array.isArray(seasons['1998']) ? seasons['1998'] : [];
  const sourceIndex = sourceRows.findIndex(row => {
    const opponent = upper(row.opponent);
    return String(row.date ?? '').trim() === '8/28/1998'
      && (opponent === 'ST LOUIS (HI)' || opponent === 'ST. LOUIS (HI)')
      && Number(row.teamScore) === 13
      && Number(row.opponentScore) === 56;
  });

  if (sourceIndex >= 0) {
    const [moved] = sourceRows.splice(sourceIndex, 1);
    const targetRows = Array.isArray(seasons['1999']) ? seasons['1999'] : (seasons['1999'] = []);
    const alreadyThere = targetRows.some(row => {
      const opponent = upper(row.opponent);
      return String(row.date ?? '').trim() === '8/28/1999'
        && (opponent === 'ST LOUIS (HI)' || opponent === 'ST. LOUIS (HI)')
        && Number(row.teamScore) === 13
        && Number(row.opponentScore) === 56;
    });
    if (!alreadyThere) targetRows.unshift({ ...moved, date: '8/28/1999' });
    changed = true;
  }
}

if (changed) fs.writeFileSync(FILE, JSON.stringify(schedules) + '\n');
console.log('Applied verified historical audit corrections, including Bonneville 1960 and West 1999.');
