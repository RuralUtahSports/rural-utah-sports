import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {applyMissing}=require('../maxpreps-missing-totals-2026.js');

const roster=[
 {playerId:'a-11-jaxon-hunt',number:'11',name:'Jaxon Hunt'},
 {playerId:'a-9-jordan-hunt',number:'9',name:'Jordan Hunt'},
 {playerId:'a-4-alex-lee',number:'4',name:'Alex Lee'},
 {playerId:'a-4-amy-lee',number:'4',name:'Amy Lee'}
];
function base(){
 return{
  reported:{season:2026,teams:{A:{team:'A',roster:structuredClone(roster),stats:[{category:'Passing',headers:['YARDS','TD','Int'],rows:[
   {playerId:'a-11-jaxon-hunt',number:'11',name:'Jaxon Hunt',values:{YARDS:'3164',TD:'44',Int:'0'}},
   {playerId:'a-9-jordan-hunt',number:'9',name:'Jordan Hunt',values:{YARDS:''}}
  ]}]}}},
  cache:{season:2026,teams:{A:{sourceUrl:'https://www.maxpreps.com/ut/herriman/school/football/stats/',rows:[
   {category:'Passing',number:'11',name:'J. Hunt',values:{YARDS:'3386',TD:'45',Int:'5','COMP-ATT':'229-348'}},
   {category:'Passing',number:'9',name:'Jordan Hunt',values:{YARDS:'900',TD:'8'}},
   {category:'Receiving',number:'4',name:'A. Lee',values:{YARDS:'285'}}
  ]}}}
 };
}
test('only blank or missing fields receive cached MaxPreps values, zero and verified source rows are preserved',()=>{
 const input=base(),before=JSON.stringify(input);
 const {data,summary}=applyMissing(input.reported,input.cache);
 assert.equal(JSON.stringify(input),before);
 const pass=data.teams.A.stats.find(s=>s.category==='Passing'),a=pass.rows[0],b=pass.rows[1];
 assert.equal(a.values.YARDS,'3164');assert.equal(a.values.TD,'44');assert.equal(a.values.Int,'0');
 assert.equal(a.values['COMP-ATT'],'229-348');
 assert.equal(b.values.YARDS,'900');assert.equal(b.values.TD,'8');
 assert.equal(b.statSources.YARDS,'MaxPreps (cached, unverified season scope)');
 assert.equal(summary.filledFields,4);
 assert.equal(summary.createdRows,0);
 assert.equal(data.teams.A.stats.some(s=>s.category==='Receiving'),false,'ambiguous same-jersey initial must stay held');
});
test('matches unique initial+surname+jersey and adds a missing category/row, but not athletes absent roster',()=>{
 const input=base();input.cache.teams.A.rows.push({category:'Receiving',number:'11',name:'J. Hunt',values:{YARDS:'200'}});
 input.cache.teams.A.rows.push({category:'Rushing',number:'77',name:'Ghost Player',values:{YARDS:'999'}});
 const {data,summary}=applyMissing(input.reported,input.cache);
 const rec=data.teams.A.stats.find(s=>s.category==='Receiving');
 assert.equal(rec.rows.length,1);
 assert.equal(rec.rows[0].playerId,'a-11-jaxon-hunt');
 assert.equal(rec.rows[0].values.YARDS,'200');
 assert.equal(summary.createdRows,1);
 assert.equal(data.teams.A.roster.some(p=>p.name==='Ghost Player'),false);
});
test('conflicting cached cells or bad source URLs never promote missing values',()=>{
 const input=base();
 input.cache.teams.A.rows.push({category:'Passing',number:'9',name:'Jordan Hunt',values:{YARDS:'905'}});
 const {data,summary}=applyMissing(input.reported,input.cache);
 const jordan=data.teams.A.stats.find(s=>s.category==='Passing').rows[1];
 assert.equal(jordan.values.YARDS,'');
 assert.ok(summary.conflictingSourceFields>=1);
 const bad=base();bad.cache.teams.A.sourceUrl='http://unknown.example.com/football/stats';
 const no=applyMissing(bad.reported,bad.cache);
 assert.equal(no.summary.filledFields,0);
 assert.deepEqual(no.data,bad.reported);
});
test('does not certify missing player totals as regular-season-only',()=>{
 assert.throws(()=>applyMissing({season:2025,teams:{}},{season:2026,teams:{}}),/Expected cached 2026/);
 assert.throws(()=>applyMissing({season:2026,teams:{}},{season:2025,teams:{}}),/Expected cached 2026/);
 const {data}=applyMissing(base().reported,base().cache);
 assert.equal(data.teams.A.stats[0].rows[1].statSources.YARDS.includes('unverified season scope'),true);
});
