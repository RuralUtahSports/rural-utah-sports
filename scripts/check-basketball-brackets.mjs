import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(new URL('../boys-basketball-brackets-2026.json', import.meta.url), 'utf8'));
const expected = {'1A':[23,26,'Rich'],'2A':[24,27,'South Sevier'],'3A':[16,19,'Morgan'],'4A':[24,23,'Provo'],'5A':[24,23,'Olympus'],'6A':[17,16,'Westlake']};
const winner = g => g.teams.length === 1 ? g.teams[0] : g.teams.reduce((a,b) => a.score > b.score ? a : b);
let total = 0;
assert.deepEqual(Object.keys(data.classifications), Object.keys(expected));
for (const [cls,b] of Object.entries(data.classifications)) {
  const [teams,played,champ] = expected[cls];
  const initial = b.rounds[0].games.flatMap(g => g.teams);
  assert.equal(new Set(initial.map(t => t.team)).size, teams, cls + ' field');
  assert.equal(new Set(initial.map(t => t.seed)).size, teams, cls + ' seeds');
  for (const r of [...b.rounds,...b.placement]) for (const g of r.games) {
    assert.equal(g.teams.length, g.bye ? 1 : 2);
    if (g.bye) { assert.equal(g.teams[0].score, null); continue; }
    assert.match(g.date, /^2026-02-\d{2}$/);
    assert.notEqual(g.teams[0].score, g.teams[1].score);
    for (const t of g.teams) assert.ok(Number.isInteger(t.score) && t.score >= 0);
  }
  for (let i=1;i<b.rounds.length;i++) {
    const previous = b.rounds[i-1].games.map(winner).map(t => t.team);
    const next = b.rounds[i].games.flatMap(g => g.teams).map(t => t.team);
    assert.deepEqual(previous, next, cls + ' aligned advancement into ' + b.rounds[i].name);
  }
  assert.equal(winner(b.rounds.at(-1).games[0]).team, champ);
  const n = [...b.rounds,...b.placement].flatMap(r => r.games).filter(g => !g.bye).length;
  assert.equal(n, played, cls + ' played games'); total += n;
  console.log(`${cls}: ${teams} teams, ${n} games, champion ${champ}`);
}
assert.equal(total,134);
console.log('Basketball bracket validation passed: 134 completed games.');
