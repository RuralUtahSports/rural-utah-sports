const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=require('../award-scoring-core.js');
const locked=require('../award-scoring-core-region-2026.lock.js');
const scoring=require('../award-postseason-turnovers-2026.js');
const line=(cat,values)=>({cat,values});
test('passing turnovers cost five points, all other passing weights retained',()=>{
 const v={YARDS:1000,TD:10,INT:7};
 assert.equal(scoring.categoryScore('Passing',v),40);
 assert.equal(base.categoryScore('Passing',v),57.5);
 assert.equal(locked.categoryScore('Passing',v),57.5);
 assert.equal(scoring.categoryScore('Passing',{TD:0,INT:7}),0);
});
test('defensive interceptions and fumble events count at proposed weights',()=>{
 assert.equal(scoring.categoryScore('Defense/Special Teams',{'PASS INT.':1,'CAUSED FUM':1,'FUM REC':1}),20);
 assert.equal(scoring.categoryScore('Defense/Special Teams',{'DEFENSE TD':1}),15);
 assert.equal(scoring.categoryScore('Defense/Special Teams',{'CAUSED FUM':2,'FF':2}),10);
 assert.equal(scoring.categoryScore('Defense/Special Teams',{'CAUSED FUM':2,'FF':3}),0);
});
test('explicit lost fumbles counted once across offensive categories; unknown totals not inferred',()=>{
 const lines=[line('Rushing',{YARDS:1000,'FUM LOST':2}),line('Receiving',{YARDS:100,'FUMBLES LOST':2})];
 assert.ok(Math.abs(scoring.positionScore('RB',lines)-28.5)<1e-9);
 assert.equal(scoring.sideScore('off',lines,'RB'),scoring.positionScore('RB',lines));
 assert.equal(scoring.positionScore('RB',[line('Rushing',{YARDS:1000,FUMBLES:5})]),35);
 assert.equal(scoring.positionScore('RB',[line('Rushing',{YARDS:1000,'FUM LOST':'—'})]),35);
 assert.equal(scoring.positionScore('RB',[line('Rushing',{YARDS:1000,'FUM LOST':-3})]),35);
 assert.equal(scoring.positionScore('RB',[line('Rushing',{YARDS:1000,'FUM LOST':2}),line('Receiving',{'FUMBLES LOST':3})]),35);
});
test('postseason pages use explicit scoring wrapper, and All-Region still uses locked scorer',()=>{
 for(const path of ['all-state-watch.html','all-utah.html']){
  const html=fs.readFileSync(path,'utf8');
  assert.ok(html.indexOf('award-postseason-turnovers-2026.js')>html.indexOf('award-scoring-core.js'));
  assert.match(html,/window\.RUSPostseasonAwardScoring2026/);
 }
 assert.match(fs.readFileSync('all-state-watch.html','utf8'),/view==='All-Region'\?window\.RUSLockedRegionScoring:window\.RUSPostseasonAwardScoring2026/);
});
