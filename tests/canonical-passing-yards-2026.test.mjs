import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyVerifiedPlayerBatch} from '../scripts/lib/verified-player-corrections-2026.mjs';
import {retainSeasonStatistics,retainVerifiedGameCells} from '../scripts/lib/regular-season-import-2026.mjs';
import {buildRegularSeasonPublication} from '../scripts/build_regular_season_publication_2026.mjs';
import {loadReviewedBatches} from '../scripts/lib/reviewed-batches-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),rosters=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json'),batch=read('regular-season-corrections-batch-3-2026.json');
const context={brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};
const season=(r,e)=>r.teams[e.team].stats.find(s=>s.category==='Passing').rows.find(p=>p.playerId===e.identity.playerId);
for(const e of batch.evidenceSets){
 test(e.identity.name+': ten positive regular reports and one canonical October 15 yardage cell',()=>{
  const decision=batch.decisions.find(d=>d.target==='season'&&d.evidenceId===e.id);
  assert.equal(e.games.length,10);assert.equal(e.games.reduce((n,g)=>n+Number(g.values.YARDS),0),Number(decision.verifiedReplacement));
  assert.equal(season(rosters,e).values.YARDS,decision.verifiedReplacement);
  const found=games.teams[e.team].games.filter(g=>g.date==='2026-10-15');assert.equal(found.length,1);
  const players=found[0].players.filter(p=>p.playerId===e.identity.playerId);assert.equal(players.length,1);assert.deepEqual(players[0].statLines.map(l=>l.values),[{YARDS:e.games.at(-1).values.YARDS}]);
 });
}
test('canonical repairs are idempotent; unknown report dates are not fabricated',()=>{
 assert.equal(applyVerifiedPlayerBatch(rosters,games,batch,context).changes.length,0);
 for(const d of batch.decisions){assert.equal(d.reportingDate,null);assert.ok(Date.parse(d.observedAt));}
});
test('stale imports cannot replace canonical season or game yards',()=>{
 const stale=structuredClone(rosters),incoming=structuredClone(games);
 for(const e of batch.evidenceSets){season(stale,e).values.YARDS='1';incoming.teams[e.team].games=incoming.teams[e.team].games.filter(g=>g.date!=='2026-10-15');}
 const r=retainSeasonStatistics(rosters,stale),g=retainVerifiedGameCells(games,incoming,batch);
 assert.equal(applyVerifiedPlayerBatch(r.rosters,g,batch,context).changes.length,0);
});
test('newer unreviewed coach totals fail closed instead of resetting to a correction',()=>{
 const newer=structuredClone(rosters);season(newer,batch.evidenceSets[0]).values.YARDS='3100';
 assert.throws(()=>applyVerifiedPlayerBatch(newer,games,batch,context),/Retained value changed/);
});
test('missing, duplicate and postseason game evidence cannot authorize a total',()=>{
 for(const mutation of [e=>{delete e.games[0].statLines[0].values.YARDS},e=>e.games.push(structuredClone(e.games[0])),e=>{e.games[0]={...e.excludedPostseason,values:{YARDS:'156'},statLines:[{category:'Passing',values:{YARDS:'156'}}]}}]){
  const bad=structuredClone(batch);mutation(bad.evidenceSets[0]);assert.throws(()=>applyVerifiedPlayerBatch(rosters,games,bad,context));
 }
});
test('canonical-only migrations do not change published leaderboards or frozen award inputs',()=>{
 const batches=loadReviewedBatches(),locked=fs.readFileSync('region-awards-2026.lock.json','utf8');
 const output=buildRegularSeasonPublication(rosters,games,batches,context,locked);
 assert.deepEqual(output,read('regular-season-publication-2026.json'));
 assert.equal(output.verifiedSeasonFields,44);assert.equal(output.verifiedGameFields,12);assert.deepEqual(output.eligibleTeamTotals,[]);
 assert.equal(read('team-stats-2026.json').teams.MANTI.totalOffense,4208);
});
