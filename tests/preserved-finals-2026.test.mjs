import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {restoreVerifiedOctoberFinals,restoreVerifiedFinalTeamViews} from '../scripts/restore_verified_october_finals_2026.mjs';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const corrections=read('verified-finals-2026.json').filter(g=>g.date==='2026-10-15'&&['MANTI','MOUNTAIN RIDGE'].includes(g.awayTeam));
const metadata=read('teams-data.json').filter(t=>['MANTI','CANYON VIEW','MOUNTAIN RIDGE','WESTLAKE','MONTICELLO','MONUMENT VAL','PANGUITCH','GRAND'].includes(t.team));
const rows=['10/15/2026,MOUNTAIN RIDGE,WESTLAKE,,,,,,,','10/15/2026,MANTI,CANYON VIEW,,,,,,,'];
function build({pins=corrections,sheet=rows,playoff=false,published=null,sourceMetadata=metadata}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rus-preserved-finals-'));
 try{
  fs.mkdirSync(path.join(dir,'scripts/lib'),{recursive:true});
  for(const f of ['scripts/build_standings_2026.mjs','scripts/reconcile-final-games.mjs','scripts/lib/competition-scope-2026.mjs','regular-season-stat-policy-2026.js'])fs.copyFileSync(f,path.join(dir,f));
  for(const [file,data] of Object.entries({'teams-data.json':sourceMetadata,'weekly-simulation.json':{games:[]},'deseret-game-details.json':{games:{}},'verified-finals-2026.json':pins,'competition-scope-review-2026.json':{...read('competition-scope-review-2026.json'),games:[...read('competition-scope-review-2026.json').games,...(playoff?[{date:'2026-10-23',awayTeam:'CANYON VIEW',homeTeam:'MANTI',phase:'postseason',verification:'schedule-reviewed',evidence:[{url:'https://www.maxpreps.com/ut/manti/manti-templars/football/schedule/',kind:'schedule-competition-label',observedAt:'2026-10-27'}]}]:[])]}}))fs.writeFileSync(path.join(dir,file),JSON.stringify(data));
  if(published)fs.writeFileSync(path.join(dir,'standings-2026.json'),JSON.stringify({games:published}));
  const csv='date,away,home,a,b,c,d,actualAway,actualHome,x,y\n'+sheet.join('\n');
  fs.writeFileSync(path.join(dir,'fetch.cjs'),'globalThis.fetch=async()=>({ok:true,text:async()=>'+JSON.stringify(csv)+'});');
  const r=spawnSync(process.execPath,['--require','./fetch.cjs','scripts/build_standings_2026.mjs'],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  return read(path.join(dir,'standings-2026.json'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('reproduce the exact loss path: blank sheet scores plus no cached or verified final produce no candidate',()=>{
 const out=build({pins:[]});assert.equal(out.summary.completedGames,0);assert.equal(out.games.length,0);
});
test('owner-verified pins restore both missing regular-season finals even when source scores are blank',()=>{
 const out=build();assert.equal(out.games.length,2);assert.equal(out.summary.completedGames,2);
 for(const c of corrections){const g=out.games.find(g=>g.awayTeam===c.awayTeam&&g.homeTeam===c.homeTeam);assert.equal(g.actualAway,c.actualAway);assert.equal(g.actualHome,c.actualHome);assert.equal(g.source,'verified');}
 const teams=Object.fromEntries(Object.values(out.byClassification).flat().map(t=>[t.team,t]));
 assert.equal(teams.MANTI.losses,1);assert.equal(teams['CANYON VIEW'].wins,1);assert.equal(teams.WESTLAKE.losses,1);assert.equal(teams['MOUNTAIN RIDGE'].wins,1);
});
test('repeated sheet submissions and the verified overlay count each October 15 result once',()=>{
 const sheet=['10/15/2026,MOUNTAIN RIDGE,WESTLAKE,,,,,21,13,,','10/15/2026,MANTI,CANYON VIEW,,,,,21,28,,'];
 const out=build({sheet:[...sheet,...sheet]});assert.equal(out.games.length,2);
});
test('the October 23 Manti 35–17 Canyon View playoff stays distinct and excluded from regular records',()=>{
 const out=build({playoff:true,sheet:[...rows,'10/23/2026,CANYON VIEW,MANTI,,,,,17,35,,']});
 assert.equal(out.games.length,2);assert.equal(out.games.filter(g=>g.homeTeam==='CANYON VIEW').length,1);
 const manti=Object.values(out.byClassification).flat().find(t=>t.team==='MANTI');assert.equal(manti.wins,0);assert.equal(manti.losses,1);assert.equal(manti.pointsFor,21);assert.equal(manti.pointsAgainst,28);
 const index=createCompetitionIndex({review:read('competition-scope-review-2026.json'),brackets:read('official-brackets-2026.json')});
 assert.equal(index.classify({date:'2026-10-15',awayTeam:'MANTI',homeTeam:'CANYON VIEW'}).phase,'regular-season');
 assert.equal(index.classify({date:'2026-10-23',awayTeam:'CANYON VIEW',homeTeam:'MANTI'}).phase,'postseason');
});
function withoutRestoredFinals(){
 const complete=read('standings-2026.json');
 // Build a consistent pre-restoration fixture from the owner's known four-team deltas.
 const previous=structuredClone(complete),teams=new Set(['MANTI','CANYON VIEW','MOUNTAIN RIDGE','WESTLAKE']);
 previous.games=previous.games.filter(g=>!corrections.some(c=>new Date(c.date).valueOf()===new Date(g.date).valueOf()&&g.awayTeam===c.awayTeam&&g.homeTeam===c.homeTeam));
 previous.summary.completedGames=previous.games.length;previous.summary.deseretFinals-=2;
 const old={MANTI:{wins:2,losses:7,regionWins:1,regionLosses:4,pointsFor:292,pointsAgainst:356,streak:'W1'},'CANYON VIEW':{wins:6,losses:3,regionWins:2,regionLosses:3,pointsFor:288,pointsAgainst:149,streak:'L1'},'MOUNTAIN RIDGE':{wins:9,losses:0,regionWins:5,regionLosses:0,pointsFor:434,pointsAgainst:102,streak:'W9'},WESTLAKE:{wins:7,losses:2,regionWins:4,regionLosses:1,pointsFor:180,pointsAgainst:138,streak:'W3'}};
 for(const rs of Object.values(previous.byClassification))for(const t of rs)if(teams.has(t.team))Object.assign(t,old[t.team]);
 for(const groups of Object.values(previous.byRegion))for(const rs of Object.values(groups))for(const t of rs)if(teams.has(t.team))Object.assign(t,old[t.team]);return previous;
}
test('focused restoration changes only the four authorized records and is repeatable',()=>{
 const before=withoutRestoredFinals(),copy=JSON.stringify(before),result=restoreVerifiedOctoberFinals(before,read('verified-finals-2026.json'));assert.equal(result.changes.length,4);assert.equal(result.standings.games.length,before.games.length+2);assert.equal(JSON.stringify(before),copy);
 assert.equal(restoreVerifiedOctoberFinals(result.standings,read('verified-finals-2026.json')).changes.length,0);
 const all=d=>Object.fromEntries(Object.values(d.byClassification).flat().map(t=>[t.team,t]));
 for(const [team,record] of Object.entries(all(before)))if(!['MANTI','CANYON VIEW','MOUNTAIN RIDGE','WESTLAKE'].includes(team))assert.deepEqual(all(result.standings)[team],record);
});
test('a conflicting existing score stops restoration instead of accepting either source',()=>{
 const before=withoutRestoredFinals();before.games.push({date:'2026-10-15',awayTeam:'MANTI',homeTeam:'CANYON VIEW',actualAway:35,actualHome:17});assert.throws(()=>restoreVerifiedOctoberFinals(before,read('verified-finals-2026.json')),/Existing game result conflict/);
});
test('duplicate existing contests stop restoration instead of summing them',()=>{
 const before=withoutRestoredFinals(),g={date:'2026-10-15',awayTeam:'MANTI',homeTeam:'CANYON VIEW',actualAway:21,actualHome:28};before.games.push(g,structuredClone(g));assert.throws(()=>restoreVerifiedOctoberFinals(before,read('verified-finals-2026.json')),/Duplicate contest/);
});

test('the four team pages retain one restored final and matching standings without player-stat writes',()=>{
 const files=Object.fromEntries(['manti','canyon-view','mountain-ridge','westlake'].map(t=>[t,read('team-current-data/'+t+'.json')]));
 const output=restoreVerifiedFinalTeamViews(files,read('standings-2026.json'),read('verified-finals-2026.json'));assert.deepEqual(output,files);
 for(const [key,shard] of Object.entries(output)){assert.deepEqual(shard.rosterStats,files[key].rosterStats);assert.deepEqual(shard.gameStats,files[key].gameStats);assert.equal(shard.standing.games,10);}
 const conflict=structuredClone(files);conflict.manti.current.schedule.find(g=>g.date==='2026-10-15').opponentScore=17;assert.throws(()=>restoreVerifiedFinalTeamViews(conflict,read('standings-2026.json'),read('verified-finals-2026.json')),/Conflicting final/);
});

test('new unclassified finals are blocked in either August or October without a date-cutoff guess',()=>{
 for(const date of ['08/14/2026','10/30/2026'])assert.throws(()=>build({sheet:[date+',MANTI,WESTLAKE,,,,,1,0,,']}),/Unclassified new or changed final/);
});
test('identical published legacy finals are retained, but changed unclassified scores are blocked',()=>{
 const prior={date:'2026-08-14',awayTeam:'MANTI',homeTeam:'WESTLAKE',actualAway:1,actualHome:0};
 const result=build({sheet:['08/14/2026,MANTI,WESTLAKE,,,,,1,0,,'],published:[prior]});assert.equal(result.games.length,3);
 assert.throws(()=>build({sheet:['08/14/2026,MANTI,WESTLAKE,,,,,2,0,,'],published:[prior]}),/Unclassified new or changed final/);
});

test('partial responses cannot silently remove an already published final',()=>{
 const prior={date:'2026-08-14',awayTeam:'MANTI',homeTeam:'WESTLAKE',actualAway:1,actualHome:0};
 assert.throws(()=>build({sheet:rows,published:[prior]}),/Published final missing or duplicated/);
});
test('changed published results need an explicit reviewed final, even when regular-season phase is known',()=>{
 const prior={date:'2026-10-15',awayTeam:'MANTI',homeTeam:'CANYON VIEW',actualAway:21,actualHome:17};
 assert.throws(()=>build({pins:[],sheet:['10/15/2026,MANTI,CANYON VIEW,,,,,21,28,,'],published:[prior]}),/Published result change needs a verified-final correction/);
 const approved=build({sheet:rows,published:[prior]});const game=approved.games.find(g=>g.awayTeam==='MANTI');assert.equal(game.actualHome,28);
});

test('all 604 published finals survive a complete cached response with identical scores and records',()=>{
 const previous=read('standings-2026.json'),sheet=previous.games.map(g=>[g.date,g.awayTeam,g.homeTeam,'','','','',g.actualAway,g.actualHome,'',''].map(v=>'\"'+String(v).replaceAll('\"','\"\"')+'\"').join(','));
 const rebuilt=build({sheet,published:previous.games,sourceMetadata:read('teams-data.json')});assert.equal(rebuilt.games.length,604);
 const byTeam=d=>Object.fromEntries(Object.values(d.byClassification).flat().map(r=>[r.team,r]));const old=byTeam(previous),next=byTeam(rebuilt);
 for(const team of Object.keys(old))for(const key of ['wins','losses','ties','regionWins','regionLosses','pointsFor','pointsAgainst'])assert.equal(next[team][key],old[team][key],team+'.'+key);
});
