import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('scripts/enrich-deseret-game-details.mjs', 'utf8');
const definitions = source.split("if (!fs.existsSync(SOURCE))")[0].replace(/^import .*;\n/gm, '');
const context = vm.createContext({ console, structuredClone });
vm.runInContext(definitions, context);
const game = { date: '2026-10-08', awayTeam: 'OGDEN', homeTeam: 'MORGAN' };
const detail = (a, h) => ({final:true, status:'Final', boxScore:{rows:[{team:'OGDEN',total:a},{team:'MORGAN',total:h}]}, stats:[]});
for (const [oldA,oldH,newA,newH] of [[48,48,7,48],[45,44,45,0],[49,38,0,38]]) {
  const result = context.mergeBrowserDetail(detail(oldA,oldH), detail(newA,newH), game);
  assert.equal(result.boxScore.rows[0].total,newA);
  assert.equal(result.boxScore.rows[1].total,newH);
}
const locked = detail(7,48); locked.finalSource='verified-manual';
assert.equal(context.mergeBrowserDetail(locked,detail(48,48),game).boxScore.rows[0].total,7);
const table = (away,home) => '<div>Final</div><h1>Game Details</h1><table><tr><th>Team</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Total</th></tr><tr><td>Ogden</td><td>0</td><td>0</td><td>7</td><td>0</td><td>'+away+'</td></tr><tr><td>Morgan</td><td>20</td><td>7</td><td>14</td><td>7</td><td>'+home+'</td></tr></table>';
assert.equal(context.parseGameDetails(table(7,48),game).final,true);
assert.equal(context.parseGameDetails(table(48,48),game).final,false);
assert.equal(context.parseGameDetails(table(7,48).replaceAll('Morgan','Unrelated School'),game).final,false);
assert.equal(context.parseGameDetails('<div>Final Neighbor 55 28</div>',game).final,false);
assert.ok(!source.includes('reconcileRenderedDailyScoreboard'));
console.log('Final-score regressions passed: corrections downward, paired scores, manual locks, matched teams, missing totals, tied finals, disabled proximity parser.');
