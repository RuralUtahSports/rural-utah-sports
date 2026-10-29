import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),review=require('../preview-stat-checks-2026.js');
const rosters=()=>{
 const teams={};
 for(const slug of ['farmington','mountain-ridge','lone-peak']){
  const j=JSON.parse(fs.readFileSync('team-current-data/'+slug+'.json','utf8'));
  teams[j.team]=j.rosterStats;
 }
 return {season:2026,teams};
};
test('nine team/player corrections have numerically consistent passing, rushing and receiving rates',()=>{
 assert.equal(review.fixes.length,9);
 assert.doesNotThrow(()=>review.validate());
 for(const x of review.fixes){assert.match(x.id,/^[a-z0-9-]+$/);assert.match(review.source,/deseret\.com/)}
});
test('every approved player has an exact original-field guard and stable roster identity on current repo snapshot',()=>{
 const data=rosters(),original=structuredClone(data);
 const result=review.apply(data);
 assert.equal(result.applied.length,9,JSON.stringify(result));
 assert.deepEqual(result.held,[]);
 for(const x of review.fixes){
  const section=data.teams[x.team].stats.find(s=>s.category===x.category);
  const row=section.rows.find(p=>p.playerId===x.id);
  for(const [k,v] of Object.entries(x.corrected)){
   assert.equal(row.values[k],v,x.id+' '+k);
   assert.match(row.statSources[k],/Preview cross-checked/);
  }
  const orig=original.teams[x.team].stats.find(s=>s.category===x.category).rows.find(p=>p.playerId===x.id);
  for(const key of Object.keys(orig.values))if(!Object.hasOwn(x.corrected,key))assert.equal(row.values[key],orig.values[key],'Non-corrected field changed: '+x.id+' '+key);
 }
 assert.equal(review.apply(data).applied.length,0,'Idempotent');
 assert.equal(review.apply(data).alreadyCurrent.length,9,'Idempotent rows stay explicit');
});
test('source drift prevents a correction rather than overwriting a new value',()=>{
 const data=rosters();
 const row=data.teams.FARMINGTON.stats.find(x=>x.category==='Passing').rows.find(x=>x.playerId==='farmington-17-alton-dahl');
 row.values.YARDS='2300';
 const result=review.apply(data,{onlyId:'farmington-17-alton-dahl'});
 assert.equal(result.applied.length,0);
 assert.equal(result.held.length,1);
 assert.equal(row.values.YARDS,'2300');
});
test('source records and the existing Jaxon Hunt correction are not rewritten',()=>{
 const data=rosters();
 assert.equal(data.teams['MOUNTAIN RIDGE'].stats.find(s=>s.category==='Passing').rows.find(p=>p.name==='Jaxon Hunt').values.YARDS,'3164');
 const r=review.apply(data);
 assert.equal(data.teams['MOUNTAIN RIDGE'].stats.find(s=>s.category==='Passing').rows.find(p=>p.name==='Jaxon Hunt').values.YARDS,'3164');
 assert.equal(r.applied.length,9);
 for(const file of ['deseret-rosters-stats-2026.json','player-game-stats-2026.json','regular-season-publication-2026.json'])assert.ok(fs.statSync(file).size>100000);
});
