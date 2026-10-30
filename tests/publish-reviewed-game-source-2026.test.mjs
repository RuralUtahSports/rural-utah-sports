import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareReviewedGamePublication} from '../scripts/publish_reviewed_game_source_2026.mjs';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const files=['west-jordan','layton','mountain-ridge','westlake'];
const shards=Object.fromEntries(files.map(name=>['team-current-data/'+name+'.json',read('team-current-data/'+name+'.json')]));
const source={
 games:read('player-game-stats-2026.json'),
 rosters:read('deseret-rosters-stats-2026.json'),
 manifest:read('audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json'),
 taylorReview:read('audits/2026-regular-season/westlake-taylor-oct15-reviewed-2026.json'),
 index:createCompetitionIndex({brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')}),
 shards
};
const stable=x=>JSON.stringify(x);
test('publisher changes only five approved 2026 game reports and the four affected team game payloads',()=>{
 const before=stable(source),result=prepareReviewedGamePublication(source);
 assert.equal(result.proposals.length,5);
 assert.equal(result.changedShards.length,4);
 assert.deepEqual(result.proposals.map(x=>[x.team,x.kind]),[
  ['WEST JORDAN','correct-archived-game'],
  ['LAYTON','correct-archived-game'],
  ['LAYTON','recover-missing-game'],
  ['MOUNTAIN RIDGE','recover-missing-game'],
  ['WESTLAKE','recover-missing-game']]);
 assert.equal(stable(source),before,'Publisher never mutates input snapshots');
 assert.equal(result.summary.seasonStatisticsChanged,false);
 for(const file of Object.keys(shards)){
  const o=structuredClone(shards[file]),n=structuredClone(result.updatedShards[file]);
  delete o.gameStats;delete n.gameStats;delete o.updatedAt;delete n.updatedAt;
  assert.deepEqual(n,o,'Only reviewed player game data is allowed');
 }
});
test('player game box repairs use exact reviewed values and do not fill undocumented fields with zero',()=>{
 const repaired=prepareReviewedGamePublication(source).updatedGames;
 const get=(team,date,id,category)=>
  repaired.teams[team].games.filter(g=>g.date===date).flatMap(g=>(g.players||[]).filter(p=>p.playerId===id).flatMap(p=>(p.statLines||[]).filter(l=>l.category===category))).map(l=>l.values);
 const shocked=get('WEST JORDAN','2026-08-21','west-jordan-3-kenyon-shockey','Passing');
 assert.equal(shocked.length,1);assert.equal(shocked[0].Yards,'29');assert.equal(shocked[0]['Comp-Att'],'7-15');assert.equal(shocked[0].Int,'2');
 const layton=get('LAYTON','2026-10-14','layton-5-tillman-thomas','Passing');
 assert.deepEqual(layton,[{YARDS:'239','COMP-ATT':'25-41',Int:'2'}]);
 const thayer=get('MOUNTAIN RIDGE','2026-10-15','mountain-ridge-7-xander-thayer','Receiving');
 assert.deepEqual(thayer,[{YARDS:'141'}]);
 const taylor=get('WESTLAKE','2026-10-15','westlake-5-ashton-taylor','Rushing');
 assert.deepEqual(taylor,[{YARDS:'203'}]);
 assert.equal(repaired.teams.WESTLAKE.games.find(x=>x.date==='2026-10-15').manualPartialStats,true);
});
test('on a second run every game and team shard is byte-equivalent with no new proposals',()=>{
 const first=prepareReviewedGamePublication(source),copy={...source,games:first.updatedGames,shards:first.updatedShards};
 const second=prepareReviewedGamePublication(copy);
 assert.deepEqual(second.proposals,[]);
 assert.deepEqual(second.changedShards,[]);
 assert.equal(stable(first.updatedGames),stable(second.updatedGames));
 for(const file of Object.keys(shards))assert.equal(stable(first.updatedShards[file]),stable(second.updatedShards[file]));
});
test('unknown phase, conflicting source and wrong identity fail the publication gate',()=>{
 const bad={...source,index:{classify:()=>({phase:'unknown'})}};
 assert.throws(()=>prepareReviewedGamePublication(bad),/Unresolved reviewed game/);
 const roster=structuredClone(source.rosters);
 roster.teams.WESTLAKE.roster.find(x=>x.playerId==='westlake-5-ashton-taylor').number='7';
 assert.throws(()=>prepareReviewedGamePublication({...source,rosters:roster}),/roster identity/);
 const game=structuredClone(source.games),wrong=game.teams['WEST JORDAN'].games.find(x=>x.date==='2026-08-21');
 wrong.players.find(x=>x.playerId==='west-jordan-3-kenyon-shockey').statLines.find(x=>x.category==='Passing').values.Yards='999';
 assert.throws(()=>prepareReviewedGamePublication({...source,games:game}),/Conflicting saved game/);
});
