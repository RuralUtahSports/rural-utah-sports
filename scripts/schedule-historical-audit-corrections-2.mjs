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
  'SPANISH FORK|PROVO|10/23/2004'
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

if (changed) fs.writeFileSync(FILE, JSON.stringify(schedules) + '\n');
console.log('Applied verified Millard 1998 and Provo 2004 corrections.');
