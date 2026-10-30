import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStatLeaders2026} from '../scripts/audit_stat_leaders_2026.mjs';

const player={name:'Test Player',number:'11',playerId:'a-11-test-player',values:{YARDS:'100',TD:'3'}};
const args=()=>({
 rosters:{teams:{A:{stats:[{category:'Passing',rows:[player]}]}}},
 maxpreps:{teams:{A:{sourceUrl:'https://www.maxpreps.com/ut/football/',rows:[{category:'Passing',name:'Test Player',number:'11',values:{YARDS:'150',TD:'3'}}]}}},
 mergedGames:{teams:{A:{games:[{date:'2026-08-14',opponent:'B',url:'https://sports.deseret.com/high-school/football/game/123',players:[{name:'Test Player',number:'11',playerId:'a-11-test-player',statLines:[{category:'Passing',values:{YARDS:120}}]}]}]}}},
 maxprepsGames:{teams:{}},
 publication:{season:2026,scope:'verified-regular-season',teams:{A:{stats:[{category:'Passing',rows:[{playerId:'a-11-test-player',values:{TD:'3'}}]}]}}},
 brackets:{},
 review:{season:2026,games:[{date:'2026-08-14',awayTeam:'A',homeTeam:'B',phase:'regular-season',verification:'schedule-reviewed',evidence:[{kind:'schedule-competition-label',observedAt:'2026-08-14',url:'https://sports.deseret.com/high-school/football/game/123'}]}]}
});
test('leaderboard review flags differing provider totals and incomplete regular-season sums without mutating sources',()=>{
 const input=args(),before=JSON.stringify(input),result=auditStatLeaders2026(input);
 assert.equal(JSON.stringify(input),before);
 assert.equal(result.summary.reportedMetricCells,2);
 assert.equal(result.summary.verifiedMetricCells,1);
 assert.equal(result.summary.providerDisagreements,1);
 assert.equal(result.summary.regularSumExceedsRetained,1);
 assert.equal(result.coverage.find(x=>x.metric==='Passing yards').top25[0].reported,100);
 assert.equal(result.reviewCases.find(x=>x.metric==='Passing yards').knownRegularSum,120);
 assert.equal(result.reviewCases.find(x=>x.metric==='Passing yards').maxpreps,150);
 assert.match(result.status,/read-only/);
});
test('unknown and postseason game phase never increases known regular-game sums',()=>{
 const input=args(),g=input.mergedGames.teams.A.games[0];
 input.mergedGames.teams.A.games=[{...g,date:'2026-10-30',opponent:'C',players:[{...g.players[0],statLines:[{category:'Passing',values:{YARDS:250}}]}]}];
 const result=auditStatLeaders2026(input),yards=result.reviewCases.find(x=>x.metric==='Passing yards');
 assert.equal(yards.knownRegularSum,null);
 assert.equal(yards.unknownGameKeys,1);
 assert.equal(yards.regularGameKeys,0);
});
test('audits refuse missing verified-season proof rather than promoting reported season totals',()=>{
 assert.throws(()=>auditStatLeaders2026({...args(),publication:{season:2026,scope:'reported',teams:{}}}),/Missing 2026 source evidence/);
});

test('exactly duplicated MaxPreps cache rows are not treated as distinct athlete identities',()=>{
 const data=args(),duplicated=structuredClone(data.maxpreps.teams.A.rows[0]);
 data.maxpreps.teams.A.rows.push(duplicated);
 const result=auditStatLeaders2026(data);
 assert.equal(result.summary.providerDisagreements,1);
 assert.equal(result.summary.nonuniqueProviderMetricMatches,0);
});
