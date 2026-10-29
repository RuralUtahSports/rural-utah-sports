import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {applyPrimary}=require('../maxpreps-primary-reported-2026.js');
const meta=[{team:'A',classification:'4A'},{team:'B',classification:'5A'},{team:'C',classification:'6A'},{team:'D',classification:'3A'},{team:'E',classification:'8-Player'},{team:'F',classification:'1A'}];
function sources(){
 const teams={};const cache={};
 for(const k of ['A','B','C','D','E','F']){
  teams[k]={roster:[
   {playerId:k+'-9-alex-jones',name:'Alex Jones',number:'9'},
   {playerId:k+'-4-amy-lee',name:'Amy Lee',number:'4'},
   {playerId:k+'-4-alex-lee',name:'Alex Lee',number:'4'}
  ],stats:[{category:'Passing',headers:['YARDS','COMP-ATT','TD','Int','COMP%'],rows:[{playerId:k+'-9-alex-jones',name:'Alex Jones',number:'9',values:{YARDS:'1800','COMP-ATT':'125-210',TD:'15',Int:'0','COMP%':'59.52'}}]}]};
  cache[k]={sourceUrl:'https://www.maxpreps.com/ut/football/stats/',rows:[
   {category:'Passing',name:'A. Jones',number:'9',values:{YARDS:'2050','COMP-ATT':'140-230',TD:'17',Int:'2','COMP%':'60.87'}},
   {category:'Passing',name:'Alex Jones',number:'9',values:{YARDS:'2050',CARRIES:'45'}},
   {category:'Receiving',name:'A. Lee',number:'4',values:{YARDS:'500'}}
  ]};
 }
 return {reported:{season:2026,teams},cache:{season:2026,teams:cache}};
}
test('MaxPreps first replaces matched fields across 1A–6A and 8-player, not only missing yards',()=>{
 const {reported,cache}=sources(),before=JSON.stringify({reported,cache});
 const {data,summary}=applyPrimary(reported,cache,meta);
 assert.equal(JSON.stringify({reported,cache}),before,'no source mutation');
 for(const k of ['A','B','C','D','E','F']){
  const row=data.teams[k].stats[0].rows[0];
  assert.equal(row.values.YARDS,'2050');
  assert.equal(row.values['COMP-ATT'],'140-230');
  assert.equal(row.values.TD,'17');
  assert.equal(row.values.Int,'2');
  assert.equal(row.values['COMP%'],'60.87');
  assert.equal(row.values.CARRIES,'45');
  assert.match(row.statSources.YARDS,/MaxPreps \(preferred reported/);
 }
 assert.equal(data.teams.D.stats[0].rows[0].values.YARDS,'2050');
 assert.equal(data.teams.E.stats[0].rows[0].values.YARDS,'2050');
 assert.equal(data.teams.F.stats[0].rows[0].values.YARDS,'2050');
 assert.equal(summary.schoolsInScope,6);
 assert.ok(summary.overwrittenFields>=30);
 assert.equal(data.teams.A.stats.some(s=>s.category==='Receiving'),false,'ambiguous same-jersey last name never assigned');
});
test('Deseret fallback is retained if no matching MaxPreps field, player or source',()=>{
 const {reported,cache}=sources();
 cache.teams.B.rows=[{category:'Passing',name:'A. Jones',number:'9',values:{YARDS:'2400'}}];
 cache.teams.C.sourceUrl='https://untrusted.example.org/stats/';
 const {data}=applyPrimary(reported,cache,meta);
 assert.equal(data.teams.B.stats[0].rows[0].values.YARDS,'2400');
 assert.equal(data.teams.B.stats[0].rows[0].values.TD,'15');
 assert.equal(data.teams.B.stats[0].rows[0].values['COMP-ATT'],'125-210');
 assert.equal(data.teams.C.stats[0].rows[0].values.YARDS,'1800');
});
test('conflicting provider duplicate values hold that field while other fields can still override',()=>{
 const {reported,cache}=sources();
 cache.teams.A.rows.push({category:'Passing',name:'Alex Jones',number:'9',values:{YARDS:'2080',TD:'17'}});
 const {data,summary}=applyPrimary(reported,cache,meta);
 const row=data.teams.A.stats[0].rows[0];
 assert.equal(row.values.YARDS,'1800','conflicting source cell holds retained');
 assert.equal(row.values.TD,'17','consistent source field still wins');
 assert.ok(summary.conflictingProviderFields>=1);
});
test('updates only the selected profile team when targetTeam is specified',()=>{
 const {reported,cache}=sources();
 const {data,summary}=applyPrimary(reported,cache,meta,{targetTeam:'B'});
 assert.equal(data.teams.A.stats[0].rows[0].values.YARDS,'1800');
 assert.equal(data.teams.B.stats[0].rows[0].values.YARDS,'2050');
 assert.equal(summary.schoolsInScope,1);
});
test('both pages apply source preference while keeping the protected verified publication separate',()=>{
 const leaders=fs.readFileSync('stat-leaders.html','utf8'),profile=fs.readFileSync('player.html','utf8');
 assert.match(leaders,/RUSMaxPrepsPrimary2026\.applyPrimary\(reportedStats,cachedMaxPreps,metadata\)/);
 assert.match(profile,/RUSMaxPrepsPrimary2026\.applyPrimary\(rosters,await response\.json\(\),teams/);
 assert.match(leaders,/RUSReviewedHunt2026\.applyVerified\(regularPublication,/);
 assert.match(leaders,/MaxPreps first for uniquely matched players statewide/);
 assert.match(profile,/Matched MaxPreps statistics first/);
});
