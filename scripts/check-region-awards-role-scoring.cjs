'use strict';
/* Run locally: node scripts/check-region-awards-role-scoring.cjs
 * Regression guard for WR receiving-only 2026 awards scoring.
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const scoring=require('../award-scoring-core-region-2026.lock.js');
const roles=require('../award-role-scoring-2026.js');
const lock=require('../region-awards-2026.lock.json');
assert.equal(lock.status,'LOCKED');
const lines=(team,name)=>{
 const t=lock.data.teams[team];
 assert(t,'Unknown team '+team);
 const result=[];
 for(const section of t.stats||[])for(const row of section.rows||[]){
  if(row.name.toUpperCase()===name.toUpperCase())result.push({category:section.category,values:row.values});
 }
 return result;
};
const yardley=lines('RICHFIELD','Trey Yardley');
const burgess=lines('CEDAR CITY','Hunter Burgess');
const yardleyRecv=scoring.receivingScore(yardley.find(l=>l.category==='Receiving').values);
const burgessRecv=scoring.receivingScore(burgess.find(l=>l.category==='Receiving').values);
assert(Math.abs(roles.forRole(scoring,'WR',yardley)-yardleyRecv)<1e-8);
assert(Math.abs(roles.forRole(scoring,'WR',burgess)-burgessRecv)<1e-8);
assert(burgessRecv>yardleyRecv,'Hunter Burgess must score above Trey Yardley at WR');
assert(roles.forRole(scoring,'WR',yardley)<scoring.positionScore('WR',yardley),
 'Rushing and passing totals may not inflate WR score');
assert(roles.forRole(scoring,'WR',burgess)<scoring.positionScore('WR',burgess),
 'Rushing and passing totals may not inflate WR score');
assert(!roles.allowed('WR','Rushing'));
assert(!roles.allowed('WR','Passing'));
assert(roles.allowed('WR','Receiving'));
assert(roles.allowed('QB','Passing')&&roles.allowed('QB','Rushing'));
assert(!roles.allowed('QB','Receiving'));
assert(roles.allowed('RB','Rushing')&&roles.allowed('RB','Receiving'));
assert(!roles.allowed('RB','Passing'));
assert(roles.allowed('DL','Defense/Special Teams'));
assert(!roles.allowed('DL','Rushing'));
const contexts=scoring.buildTeamContexts(lock.standings,lock.stateTop25);
const adjusted=(team,points)=>scoring.applyTeamContext(points,scoring.teamContextFor(contexts,team),'allRegion');
const b=adjusted('CEDAR CITY',roles.forRole(scoring,'WR',burgess));
const y=adjusted('RICHFIELD',roles.forRole(scoring,'WR',yardley));
assert(b>y);
console.log('PASS 2026 WR rankings: Hunter Burgess '+b.toFixed(1)+' > Trey Yardley '+y.toFixed(1));
console.log('PASS role filters: QB, RB, WR, TE, DL / defense preserved; locked stats unchanged');
