import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {proposeSourceRepairs} from '../scripts/propose_4a6a_canonical_game_repairs_2026.mjs';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const liveSource=read('player-game-stats-2026.json');
const rosters=read('deseret-rosters-stats-2026.json');
const doc=read('audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json');
const fake={classify:()=>({phase:'regular-season'})};
const taylor=read('audits/2026-regular-season/westlake-taylor-oct15-reviewed-2026.json');
const norm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

// Reconstruct a deterministic pre-publication fixture from the evidence's
// original values. Otherwise a *successful* main-branch repair would break
// every historic replay test when a later PR or scheduled import runs.
function originalFixture(current){
 const base=structuredClone(current);
 const canon=x=>norm(x);
 for(const decision of doc.decisions){
  const team=base.teams[decision.team];
  assert.ok(team?.games,'Missing reviewed team '+decision.team);
  for(const report of decision.sourceGames){
   const sameGame=g=>g.date===report.date&&canon(g.opponent)===canon(report.opponent);
   const matches=team.games.filter(sameGame);
   if(report.newlyRecovered){
    if(matches.length===1){
     const existing=matches[0],identical=existing.manualPartialStats&&
      (existing.players||[]).some(p=>p.playerId===decision.playerId&&p.name===decision.name);
     if(!identical)throw Error('Reviewed source game no longer matches fixture identity '+report.date);
     team.games=team.games.filter(g=>g!==existing);
    }else assert.equal(matches.length,0,'Multiple recovered source games');
   }else if(report.change){
    assert.equal(matches.length,1,'Original dated game missing');
    const player=matches[0].players.filter(p=>p.playerId===decision.playerId&&p.name===decision.name);
    assert.equal(player.length,1);
    const lines=player[0].statLines.filter(l=>canon(l.category)===canon(decision.category));
    assert.equal(lines.length,1);
    // The manifest preserves every field from the originally copied box.
    Object.assign(lines[0].values,report.change.oldValues);
   }
  }
 }
 const westlake=base.teams.WESTLAKE;
 const matches=westlake.games.filter(g=>g.date===taylor.game.date&&canon(g.opponent)===canon(taylor.game.opponent));
 if(matches.length===1){
  if(!matches[0].manualPartialStats||(matches[0].players||[]).filter(p=>p.playerId===taylor.identity.playerId).length!==1)
   throw Error('Existing Westlake game no longer has the reviewed partial identity');
  westlake.games=westlake.games.filter(g=>g!==matches[0]);
 }else assert.equal(matches.length,0,'Duplicate Westlake team game');
 return base;
}
const games=originalFixture(liveSource);

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

test('Westlake Ashton Taylor Oct 15 adds exactly 203 rushing yards as partial game, not a complete season value',()=>{
 const input=JSON.stringify(games);
 const result=proposeSourceRepairs(games,rosters,doc,{index:fake,taylorReview:taylor});
 assert.equal(result.proposals.length,5);
 assert.equal(result.holds.length,0);
 const p=result.proposals.at(-1);
 assert.deepEqual([p.kind,p.team,p.date,p.reviewedValue,p.manualPartialStats],
  ['recover-missing-game','WESTLAKE','2026-10-15',203,true]);
 const data=result.repaired.teams.WESTLAKE.games.filter(g=>g.date==='2026-10-15');
 assert.equal(data.length,1);
 assert.equal(data[0].manualPartialStats,true);
 assert.equal(data[0].players.length,1);
 assert.deepEqual(data[0].players[0].statLines[0].values,{YARDS:'203'});
 assert.equal(data[0].players[0].statLines[0].values.CARRIES,undefined);
 assert.equal(data[0].players[0].statLines[0].values.TD,undefined);
 assert.equal(JSON.stringify(games),input);
 // Four current complete lines (152, 70, 93, 109) plus 203 are only a
 // partial five-game subtotal, not a ten-game certified season total.
 const playerId='westlake-5-ashton-taylor';
 const existing=games.teams.WESTLAKE.games.flatMap(g=>(g.players||[]).filter(p=>p.playerId===playerId).flatMap(p=>(p.statLines||[]).filter(x=>x.category==='Rushing').map(x=>x.values.Yards??x.values.YARDS))).filter(x=>String(x??'').trim()!=='').map(Number);
 assert.deepEqual(existing.sort((a,b)=>a-b),[70,93,109,152]);
 assert.equal(existing.reduce((a,b)=>a+b,0)+203,627);
});
test('Westlake source conflict is resolved only for this individual game, never certified for season or carries',()=>{
 const altered=structuredClone(taylor);altered.verifiedValue=211;
 assert.throws(()=>proposeSourceRepairs(games,rosters,doc,{index:fake,taylorReview:altered}),/source conflict/);
 const out=proposeSourceRepairs(games,rosters,doc,{index:fake,taylorReview:taylor});
 const repeated=proposeSourceRepairs(out.repaired,rosters,doc,{index:fake,taylorReview:taylor});
 assert.equal(repeated.proposals.length,0);
 assert.equal(repeated.holds.length,0);
 assert.equal(JSON.stringify(repeated.repaired),JSON.stringify(out.repaired));
 const changed=structuredClone(out.repaired);
 changed.teams.WESTLAKE.games.find(g=>g.date==='2026-10-15').players[0].statLines[0].values.YARDS='211';
 const held=proposeSourceRepairs(changed,rosters,doc,{index:fake,taylorReview:taylor});
 assert.equal(held.holds.length,1);
 assert.equal(held.proposals.length,0);
 const phaseHold=proposeSourceRepairs(games,rosters,doc,{index:{classify:g=>({phase:g.date==='2026-10-15'?'unknown':'regular-season'})},taylorReview:taylor});
 assert.equal(phaseHold.holds.length,2,'Mountain Ridge and Westlake Oct 15 games both held if phase unknown');
});

test('current published source is either still awaiting reviewed repair or already fully repaired, never partially overwritten',()=>{
 const r=proposeSourceRepairs(liveSource,rosters,doc,{index:fake,taylorReview:taylor});
 assert.equal(r.holds.length,0);
 assert.ok([0,5].includes(r.proposals.length));
 const second=proposeSourceRepairs(r.repaired,rosters,doc,{index:fake,taylorReview:taylor});
 assert.equal(second.proposals.length,0);
 assert.equal(second.holds.length,0);
});


const dahl=read('audits/2026-regular-season/farmington-dahl-oct14-reviewed-2026.json');
const scope=createCompetitionIndex({brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
test('Farmington Dahl Oct 14 is a positively classified regular-season game and adds only four explicit passing fields',()=>{
 const before=JSON.stringify(liveSource);
 const phase=scope.classify({date:'2026-10-14',opponent:'LAYTON',url:dahl.game.sourceUrl},'FARMINGTON');
 assert.equal(phase.phase,'regular-season');
 const r=proposeSourceRepairs(liveSource,rosters,doc,{index:scope,dahlReview:dahl});
 assert.deepEqual(r.holds,[]);
 const news=r.proposals.filter(p=>p.team==='FARMINGTON');
 assert.ok(news.length<=1,'Only one Farmington game may be proposed');
 const matching=r.repaired.teams.FARMINGTON.games.filter(g=>g.date==='2026-10-14'&&norm(g.opponent)==='LAYTON');
 assert.equal(matching.length,1);
 const athlete=matching[0].players.filter(p=>p.playerId==='farmington-17-alton-dahl');
 assert.equal(athlete.length,1);
 const line=athlete[0].statLines.filter(s=>s.category==='Passing');
 assert.equal(line.length,1);
 assert.deepEqual(Object.fromEntries(['YARDS','COMP-ATT','TD','Int'].map(key=>[key,line[0].values[key]??line[0].values[Object.keys(line[0].values).find(k=>norm(k)===norm(key))]])),{YARDS:'190','COMP-ATT':'17-29',TD:'0',Int:'0'});
 assert.equal(JSON.stringify(liveSource),before,'Evidence proposal must not mutate original source');
 const repeat=proposeSourceRepairs(r.repaired,rosters,doc,{index:scope,dahlReview:dahl});
 assert.equal(repeat.proposals.filter(p=>p.team==='FARMINGTON').length,0,'Dahl recovery is idempotent');
});
test('Farmington Dahl source recovery fails closed if previous games or identity are changed',()=>{
 const damaged=structuredClone(liveSource);
 const row=damaged.teams.FARMINGTON.games.find(g=>g.date==='2026-08-14');
 const athlete=row.players.find(p=>p.playerId==='farmington-17-alton-dahl');
 assert.ok(athlete,'Required Dahl source-game record');
 const passing=athlete.statLines.find(l=>l.category==='Passing');
 assert.ok(passing);
 const key=Object.keys(passing.values).find(k=>norm(k)==='YARDS');
 passing.values[key]=String(Number(passing.values[key])+1);
 assert.throws(()=>proposeSourceRepairs(damaged,rosters,doc,{index:scope,dahlReview:dahl}),/historical nine-game subtotal/);
 const unknown={classify:()=>({phase:'unknown'})};
 const held=proposeSourceRepairs(liveSource,rosters,doc,{index:unknown,dahlReview:dahl});
 assert.ok(held.holds.some(h=>h.team==='FARMINGTON'));
});
