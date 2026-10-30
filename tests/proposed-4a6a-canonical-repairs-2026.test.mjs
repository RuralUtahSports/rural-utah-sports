import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {proposeSourceRepairs} from '../scripts/propose_4a6a_canonical_game_repairs_2026.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const games=read('player-game-stats-2026.json');
const rosters=read('deseret-rosters-stats-2026.json');
const doc=read('audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json');
const fake={classify:()=>({phase:'regular-season'})};
const norm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

test('source repair proposes only two dated game corrections and two missing partial games',()=>{
 const unchanged=JSON.stringify(games),rosterBefore=JSON.stringify(rosters);
 const r=proposeSourceRepairs(games,rosters,doc,{index:fake});
 assert.equal(r.holds.length,0);
 assert.deepEqual(r.proposals.map(p=>[p.team,p.date,p.kind]),[
  ['WEST JORDAN','2026-08-21','correct-archived-game'],
  ['LAYTON','2026-08-21','correct-archived-game'],
  ['LAYTON','2026-10-14','recover-missing-game'],
  ['MOUNTAIN RIDGE','2026-10-15','recover-missing-game']
 ]);
 assert.equal(JSON.stringify(games),unchanged,'Original game file is not modified');
 assert.equal(JSON.stringify(rosters),rosterBefore,'Original season stats not modified');
});
test('repaired West Jordan Copper Hills box no longer duplicates the Riverton source',()=>{
 const out=proposeSourceRepairs(games,rosters,doc,{index:fake}).repaired.teams['WEST JORDAN'];
 const copper=out.games.find(g=>g.date==='2026-08-21'),riverton=out.games.find(g=>g.date==='2026-08-14');
 const player=g=>g.players.find(x=>x.playerId==='west-jordan-3-kenyon-shockey').statLines.find(x=>x.category==='Passing').values;
 assert.equal(player(copper).Yards,'29');
 assert.equal(player(copper)['Comp-Att'],'7-15');
 assert.equal(player(copper).Int,'2');
 assert.equal(player(riverton).Yards,'176');
 assert.equal(player(riverton)['Comp-Att'],'20-35');
});
test('Layton repaired Northridge values and explicitly partial Farmington recovered game',()=>{
 const out=proposeSourceRepairs(games,rosters,doc,{index:fake}).repaired.teams.LAYTON;
 const n=out.games.find(g=>g.date==='2026-08-21'),f=out.games.find(g=>g.date==='2026-10-14');
 const p=n.players.find(x=>x.playerId==='layton-5-tillman-thomas').statLines.find(s=>s.category==='Passing').values;
 assert.equal(p.Yards,'315');assert.equal(p['Comp-Att'],'25-36');
 assert.ok(f.manualPartialStats);assert.equal(f.teamScore,17);assert.equal(f.opponentScore,27);
 const fp=f.players[0].statLines[0].values;
 assert.deepEqual(fp,{YARDS:'239','COMP-ATT':'25-41',Int:'2'});
 assert.equal(fp.TD,undefined,'Unverified TD cannot be injected');
});
test('Mountain Ridge recovered Westlake game contains only reviewed yards',()=>{
 const out=proposeSourceRepairs(games,rosters,doc,{index:fake}).repaired.teams['MOUNTAIN RIDGE'];
 const game=out.games.find(g=>g.date==='2026-10-15');
 assert.equal(game.manualPartialStats,true);
 assert.deepEqual(game.players[0].statLines[0].values,{YARDS:'141'});
});
test('unknown regular-season classification holds game changes and yields no repaired files',()=>{
 const index={classify:()=>({phase:'unknown'})};
 const original=JSON.stringify(games),r=proposeSourceRepairs(games,rosters,doc,{index});
 assert.equal(r.proposals.length,0);assert.equal(r.holds.length,4);
 assert.equal(JSON.stringify(r.repaired),original);
});
test('conflicting source value or roster identity blocks a repair',()=>{
 const source=structuredClone(games);
 source.teams['WEST JORDAN'].games.find(g=>g.date==='2026-08-21').players.find(p=>p.playerId==='west-jordan-3-kenyon-shockey').statLines.find(s=>s.category==='Passing').values.Yards='70';
 assert.throws(()=>proposeSourceRepairs(source,rosters,doc,{index:fake}),/Conflicting saved game/);
 const meta=structuredClone(rosters);
 meta.teams.LAYTON.roster.find(p=>p.playerId==='layton-5-tillman-thomas').number='99';
 assert.throws(()=>proposeSourceRepairs(games,meta,doc,{index:fake}),/Unmatched athlete/);
});
test('all reviewed games have unique player-game identity and approved source URLs',()=>{
 const res=proposeSourceRepairs(games,rosters,doc,{index:fake});
 assert.equal(res.proposals.length,4);
 for(const x of res.proposals)assert.match(x.source,/^https:\/\/www\.maxpreps\.com\//);
 assert.ok(!res.proposals.some(x=>x.team==='KEARNS'||x.team==='WESTLAKE'));
});

test('a repeated rebuild is idempotent and cannot duplicate recovered player games',()=>{
 const repaired=proposeSourceRepairs(games,rosters,doc,{index:fake});
 assert.equal(repaired.proposals.length,4);
 const repeat=proposeSourceRepairs(repaired.repaired,rosters,doc,{index:fake});
 assert.equal(repeat.proposals.length,0);
 assert.equal(repeat.holds.length,0);
 assert.equal(JSON.stringify(repeat.repaired),JSON.stringify(repaired.repaired));
 const layton=repeat.repaired.teams.LAYTON.games.filter(g=>g.date==='2026-10-14'&&norm(g.opponent)==='FARMINGTON');
 const ridge=repeat.repaired.teams['MOUNTAIN RIDGE'].games.filter(g=>g.date==='2026-10-15'&&norm(g.opponent)==='WESTLAKE');
 assert.equal(layton.length,1);
 assert.equal(ridge.length,1);
});
test('an already-recovered partial box with a changed stat is a hard source conflict',()=>{
 const first=proposeSourceRepairs(games,rosters,doc,{index:fake}).repaired;
 const layton=first.teams.LAYTON.games.find(g=>g.date==='2026-10-14');
 layton.players[0].statLines[0].values.YARDS='238';
 assert.throws(()=>proposeSourceRepairs(first,rosters,doc,{index:fake}),/Recovered partial source field changed/);
});
