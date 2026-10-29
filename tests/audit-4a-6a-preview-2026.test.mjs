import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPreview} from '../scripts/audit_4a_6a_preview_stats_2026.mjs';
function sample(){
 const classifications={},teams={},cache={},metadata=[];
 for(const cls of ['4A','5A','6A']){
  const games=[];
  for(let i=0;i<8;i++){
   const a=cls+' HOME '+i,b=cls+' AWAY '+i;
   games.push({a:{name:a},b:{name:b},date:'Oct 30, 2026'});
   for(const name of [a,b]){
    metadata.push({team:name,classification:cls});
    teams[name]={roster:[{name:'Alex Jones',number:'9',playerId:name+'-9-alex-jones'}],stats:[{category:'Passing',rows:[{name:'Alex Jones',number:'9',playerId:name+'-9-alex-jones',values:{YARDS:'100'}}]}]};
    cache[name]={sourceUrl:'https://www.maxpreps.com/ut/school/football/stats/',lastUpdated:'2026-10-29',rows:[{name:'Alex Jones',number:'9',category:'Passing',values:{YARDS:'100'}}]};
   }
  }
  classifications[cls]={rounds:[{name:'First Round · Oct 30',games}]};
 }
 cache['4A HOME 0'].rows[0].values.YARDS='140';
 return {rosters:{season:2026,teams},maxpreps:{season:2026,teams:cache},mergedGames:{teams:{}},maxprepsGames:{teams:{}},brackets:{season:2026,classifications},review:{season:2026,games:[]},metadata};
}
test('all 48 first-round playoff teams appear, with disagreement review rather than replacement',()=>{
 const input=sample(),snapshot=JSON.stringify(input),x=auditPreview(input);
 assert.equal(JSON.stringify(input),snapshot,'audit may not change source data');
 assert.equal(x.summary.teamsAudited,48);
 assert.equal(x.matchups.length,24);
 assert.equal(x.summary.offensiveYardageProviderDisagreements,1);
 assert.equal(x.summary.byClass['4A'].teams,16);
 assert.equal(x.summary.byClass['5A'].teams,16);
 assert.equal(x.summary.byClass['6A'].teams,16);
 const issue=x.cases.find(r=>r.team==='4A HOME 0');
 assert.equal(issue.deseret,100);assert.equal(issue.maxpreps,140);
 assert.ok(issue.flags.includes('provider-disagreement'));
 assert.equal(x.status,'REVIEW ONLY: NOT CERTIFIED TO PUBLISH');
});
test('an absent player/identity is held, never silently changed or approved',()=>{
 const x=sample();
 x.rosters.teams['5A HOME 0'].roster[0].number='8';
 const result=auditPreview(x);
 const case1=result.cases.find(r=>r.team==='5A HOME 0');
 assert.ok(case1.flags.includes('identity-hold'));
 assert.equal(case1.maxpreps,null);
});
test('refuse wrong playoff date and duplicate team brackets',()=>{
 const input=sample();
 input.brackets.classifications['6A'].rounds[0].games[0].date='Oct 23, 2026';
 assert.throws(()=>auditPreview(input),/Postseason start changed/);
});
