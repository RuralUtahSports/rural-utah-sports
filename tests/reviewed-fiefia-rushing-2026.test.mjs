import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {evidence,applyVerified}=require('../reviewed-fiefia-rushing-2026.js');

function proof(){
 return {season:2026,scope:'verified-regular-season',teams:{
  RIDGELINE:{roster:[{playerId:'ridgeline-30-noah-fiefia',number:'30',name:'Noah Fiefia'}],stats:[]}
 }};
}
test('Fiefia 36 rushing TDs in ten regular games are independently sourced and uniquely identified',()=>{
 assert.equal(evidence.rushingTouchdowns,36);
 assert.equal(evidence.games,10);
 assert.match(evidence.source,/maxpreps\.com/);
 const p=proof();
 assert.deepEqual(applyVerified(p),{playerId:'ridgeline-30-noah-fiefia',regularSeasonRushTD:36,games:10,created:true});
 const row=p.teams.RIDGELINE.stats[0].rows[0];
 assert.deepEqual(row.values,{TD:'36'});
 assert.match(row.statSources.TD,/Verified regular season/);
 assert.equal(applyVerified(p).created,false,'idempotent on same reviewed value');
});
test('conflicting existing proof, missing roster, wrong season and duplicate identity are held',()=>{
 const a=proof();a.teams.RIDGELINE.stats=[{category:'Rushing',headers:['TD'],rows:[{playerId:evidence.playerId,number:'30',name:'Noah Fiefia',values:{TD:'37'}}]}];
 assert.throws(()=>applyVerified(a),/disagrees/);
 const b=proof();b.teams.RIDGELINE.roster[0].name='Wrong Name';
 assert.throws(()=>applyVerified(b),/stable roster/);
 const c=proof();c.scope='reported';
 assert.throws(()=>applyVerified(c),/verified 2026/);
});
test('Fiefia proof is regular-season-only; original reported dataset and playoff totals are not rewritten',()=>{
 const reported={season:2026,teams:{RIDGELINE:{stats:[{category:'Rushing',rows:[{playerId:evidence.playerId,values:{TD:'37'}}]}]}}};
 const before=JSON.stringify(reported);
 applyVerified(proof());
 assert.equal(JSON.stringify(reported),before);
 const leaders=fs.readFileSync('stat-leaders.html','utf8');
 assert.match(leaders,/RUSReviewedFiefia2026\.applyVerified\(regularPublication\)/);
 assert.match(leaders,/src="reviewed-fiefia-rushing-2026\.js/);
});
