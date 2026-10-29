import test from 'node:test';
import assert from 'node:assert/strict';
import {triageRegularSeasonAudit} from '../scripts/triage_regular_season_audit_2026.mjs';

const audit={
 season:2026,inputHashes:{'deseret-rosters-stats-2026.json':'fixture-sha'},
 issueCounts:{CACHED_SOURCE_IDENTITY_MISMATCH:3,CONFLICTING_REGULAR_GAME_CELL:2},
 issues:[
  {code:'CACHED_SOURCE_IDENTITY_MISMATCH',team:'SCHOOL A',playerId:'school-a-10-jane',name:'Jane',retainedNumber:'10',sourceNumber:'11',url:'https://example.com/source',sourceUpdatedAt:'2026-10-29'},
  {code:'CACHED_SOURCE_IDENTITY_MISMATCH',team:'SCHOOL A',playerId:'school-a-10-jane',name:'Jane',retainedNumber:'10',sourceNumber:'11'},
  {code:'CACHED_SOURCE_IDENTITY_MISMATCH',team:'SCHOOL A',playerId:'school-a-10-jane',name:'Jane',retainedNumber:'10',sourceNumber:'11'},
  {code:'CONFLICTING_REGULAR_GAME_CELL',team:'SCHOOL A',playerId:'school-a-10-jane',category:'Rushing',field:'YARDS',
   conflicts:[{gameKey:'2026-08-14|A|B',values:[10,12],
    reports:[{source:'RUS merged game cache',url:'https://example.com/one',value:10},{source:'MaxPreps game cache',url:'https://example.com/two',value:12}]}]},
  {code:'CONFLICTING_REGULAR_GAME_CELL',team:'SCHOOL A',playerId:'school-a-10-jane',category:'Rushing',field:'YARDS',
   conflicts:[{gameKey:'2026-08-14|A|B',values:[12,10],
    reports:[{source:'RUS merged game cache',url:'https://example.com/one',value:10}]}]},
  {code:'CONFLICTING_REGULAR_GAME_CELL',team:'SCHOOL B',playerId:'school-b-7-john',category:'Defense/Special Teams',field:'TACKLES',
   conflicts:[{gameKey:'2026-09-18|B|C',values:[4,6]}]}
 ]
};
test('counts unique people, game cells and source-attribution gaps without mutating the audit',()=>{
 const before=JSON.stringify(audit),x=triageRegularSeasonAudit(audit);
 assert.equal(JSON.stringify(audit),before);
 assert.equal(x.summary.rawIdentityFindings,3);
 assert.equal(x.summary.distinctIdentityPlayers,1);
 assert.equal(x.summary.rawConflictingFieldFindings,3);
 assert.equal(x.summary.distinctContestedPlayerGameFields,2);
 assert.equal(x.summary.gameCasesMissingSourceReports,1);
 assert.equal(x.identityCases[0].sourceNumbers[0],'11');
 assert.equal(x.identityCases[0].rawFindings,3);
 assert.equal(x.gameCellCases.find(y=>y.team==='SCHOOL A').sourceReports.length,2);
 assert.deepEqual(x.gameCellCases.find(y=>y.team==='SCHOOL A').reportedValues,[10,12]);
 assert.equal(x.priorities.find(y=>y.team==='SCHOOL A').distinctGameCells,1);
});
test('rejects incomplete inputs instead of certifying unknown data',()=>{
 assert.throws(()=>triageRegularSeasonAudit({season:2026,issues:[]}),/Expected source-hashed/);
 assert.throws(()=>triageRegularSeasonAudit({...audit,season:2025}),/Expected source-hashed/);
 assert.throws(()=>triageRegularSeasonAudit({...audit,issues:[{code:'CACHED_SOURCE_IDENTITY_MISMATCH',team:'SCHOOL A'}]}),/stable ID/);
});
