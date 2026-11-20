// Supply the path to team-page-data from the postseason-tagged RUS snapshot be9acef8.
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
if (!dir) throw Error('Supply the directory of postseason-tagged RUS team schedules.');
const root = new URL('../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root)));
const rounds = {'IR PO':'Inter-Region','IR-PO':'Inter-Region','1ST':'First Round','QF':'Quarterfinals','SF':'Semifinals'};
const candidates = new Map();
const archives = new Map();
for (const {team} of read('teams-data.json')) {
  const slug = team === 'MONUMENT VAL' ? 'monument-valley' : team.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const {schedules} = JSON.parse(fs.readFileSync(path.join(dir,slug+'.json')));
  for (const [year,games] of Object.entries(schedules)) {
    if (+year < 1919 || +year > 2025) continue;
    if (!archives.has(year)) archives.set(year,read('brackets-'+year+'.json'));
    for (const g of games) {
      if (!g.playoff || !['W','L','T'].includes(g.result) || ![g.teamScore,g.opponentScore].every(Number.isFinite)) continue;
      const tag = /^(AA|A|B|[1-6]AA?)[ -]+(IR PO|IR-PO|1ST|QF|SF)\b/i.exec(g.notes);
      if (!tag) continue;
      const cls = /^[AB]+$/.test(tag[1]) ? 'Class '+tag[1] : tag[1];
      const archive = archives.get(year)[cls];
      if (!archive || archive.length !== 1 || !/Championship/i.test(archive[0][0])) continue;
      const sides = [[team,g.teamScore],[g.opponent,g.opponentScore]].sort(([a],[b])=>a.localeCompare(b));
      const names = sides.map(([n])=>n);
      const key = JSON.stringify([year,cls,...names]);
      const game = [year,cls,rounds[tag[2]],...sides.flat()];
      if (!candidates.has(key)) candidates.set(key,game);
      else if (JSON.stringify(candidates.get(key)) !== JSON.stringify(game)) candidates.set(key,null);
    }
  }
}
const output = {};
for (const key of [...candidates.keys()].sort()) {
  const game = candidates.get(key);
  if (!game) continue;
  const [year,cls,round,...score] = game;
  const classes = output[year] ??= {};
  const group = classes[cls] ??= {};
  (group[round] ??= []).push(score);
}
fs.writeFileSync(new URL('season-recap-rounds.json',root),JSON.stringify(output)+'\n');
