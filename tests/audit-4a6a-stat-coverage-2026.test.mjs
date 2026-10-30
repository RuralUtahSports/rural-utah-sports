import test from 'node:test';
import assert from 'node:assert/strict';
import {audit4a6a} from '../scripts/audit_4a6a_stat_coverage_2026.mjs';

const base=()=>{
 const season={playerId:'a-10-example-player',name:'Example Player',number:'10',values:{YARDS:'50',TD:'4','COMP-ATT':'12-24'}};
 const schedule=Array.from({length:8},(_,i)=>({date:'2026-08-'+String(14+i).padStart(2,'0'),opponent:'B'+i,rusStatus:'Final',gameUrl:'https://sports.deseret.com/high-school/football/game/'+(100+i)}));
 const logs=schedule.map((s,i)=>({date:s.date,opponent:s.opponent,gameKey:s.date+'|A|B'+i,maxprepsUrl:'https://www.maxpreps.com/ut/football/game/a-vs-b/'+i,players:[{playerId:season.playerId,name:season.name,number:season.number,statLines:[{category:'Passing',values:{YARDS:'10',TD:'1','COMP-ATT':'2-3'}}]}]}));
 const shard={team:'A',current:{schedule},rosterStats:{roster:[{playerId:season.playerId,name:season.name,number:season.number}],stats:[{category:'Passing',rows:[season]}]},gameStats:{games:logs}};
 const maxpreps={teams:{A:{lastUpdated:'2026-09-01T12:00:00Z',rows:[{category:'Passing',name:'Example Player',number:'10',values:{YARDS:'80',TD:'8','COMP-ATT':'16-24'}}]}}};
 const args={teamList:[{team:'A',classification:'4A'}],shards:{A:shard},maxpreps,index:{classify:o=>({phase:o.phase||'regular-season'})},priorReview:{teams:[]}};
 return args;
};
const find=(r,field)=>r.candidates.find(x=>x.category==='Passing'&&x.field===field);
test('complete 8-game passing metrics are review candidates with unique, current MaxPreps corroboration',()=>{
 const a=base(),before=JSON.stringify(a),r=audit4a6a(a);
 assert.equal(r.summary.teams,1);assert.equal(r.summary.completeFields,3);
 assert.equal(r.summary.completeDisagreements,3);
 assert.equal(r.summary.providerCorroborated,3);
 assert.deepEqual({yards:find(r,'YARDS').completeGameTotal,pair:find(r,'COMP-ATT').completeGameTotal,td:find(r,'TD').completeGameTotal},{yards:80,pair:'16-24',td:8});
 assert.equal(find(r,'YARDS').gameEvidence.length,8);
 assert.equal(r.status.startsWith('READ ONLY'),true);
 assert.equal(JSON.stringify(a),before,'Audit never mutates supplied source');
});
test('missing player game, unknown field and duplicate schedule all prevent complete certification',()=>{
 for(const change of [
  a=>{a.shards.A.gameStats.games[2].players=[];},
  a=>{delete a.shards.A.gameStats.games[4].players[0].statLines[0].values.YARDS;},
  a=>{a.shards.A.current.schedule.push({...a.shards.A.current.schedule[0]});},
  a=>{a.shards.A.rosterStats.roster[0].number='99';},
  a=>{a.shards.A.gameStats.games[1].phase='unknown';},
 ]){
  const a=base();change(a);const r=audit4a6a(a);
  assert.equal(find(r,'YARDS'),undefined,'Untrusted partial game sum must not be promoted');
  assert.ok(r.holds.some(x=>x.field==='YARDS'),'Incomplete case remains in review queue');
 }
});
test('stale or conflicting provider never qualifies as corroborated correction',()=>{
 for(const change of [
  a=>{a.maxpreps.teams.A.rows[0].values.YARDS='85';},
  a=>{a.maxpreps.teams.A.lastUpdated='2026-08-01T00:00:00Z';},
  a=>{a.maxpreps.teams.A.rows[0].number='22';}
 ]){
  const a=base();change(a);const r=audit4a6a(a),candidate=find(r,'YARDS');
  assert.equal(candidate.completeGameTotal,80);
  assert.notEqual(candidate.providerAgreement,'agrees');
  assert.equal(r.summary.providerCorroborated,2,'Other corroborated fields remain separate');
 }
});
test('playoff schedule contest is never part of the regular-game sum',()=>{
 const a=base();
 a.shards.A.current.schedule.push({date:'2026-10-23',opponent:'C',rusStatus:'Final',phase:'postseason',gameUrl:'https://sports.deseret.com/high-school/football/game/999'});
 a.shards.A.gameStats.games.push({date:'2026-10-23',opponent:'C',phase:'postseason',players:[],maxprepsUrl:'https://www.maxpreps.com/ut/football/game/c'});
 const r=audit4a6a(a);
 assert.equal(find(r,'YARDS').completeGameTotal,80);
 assert.equal(r.teams[0].regularGames,8);
});
test('same-name different jersey and multiple provider rows cannot authorize a source agreement',()=>{
 const a=base();a.maxpreps.teams.A.rows.push({...a.maxpreps.teams.A.rows[0],values:{YARDS:'999'}});
 const r=audit4a6a(a),candidate=find(r,'YARDS');assert.equal(candidate.providerAgreement,'missing-provider');
 assert.equal(candidate.completeGameTotal,80);
});
