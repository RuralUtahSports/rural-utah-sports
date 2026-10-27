import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createCompetitionIndex,gameKey,partitionGames,chooseRegularSeasonTotal,assertApprovedRegularSeasonFile,assertClassifiedFinals,sha256,POLICY,isoDate} from '../scripts/lib/competition-scope-2026.mjs';
const root=path.resolve(import.meta.dirname,'..');
const url='https://www.maxpreps.com/ut/kamas/south-summit-wildcats/football/schedule/';
const fixture=(date,phase,a='A',b='B')=>({date,awayTeam:a,homeTeam:b,phase,verification:'schedule-reviewed',evidence:[{url,kind:'schedule-competition-label',observedAt:'2026-10-27'}]});
const index=games=>createCompetitionIndex({review:{season:2026,games}});

test('phase follows exact schedule evidence, never a fixed cutoff date',()=>{
 const i=index([fixture('2026-09-01','postseason'),fixture('2026-11-20','regular-season')]);
 assert.equal(i.classify({date:'2026-09-01',team:'A',opponent:'B'}).phase,'postseason');
 assert.equal(i.classify({date:'2026-11-20',team:'A',opponent:'B'}).phase,'regular-season');
 assert.equal(i.classify({date:'2026-08-14',team:'A',opponent:'B'}).phase,'unknown');
 assert.equal(i.classify({date:'2026-11-20',team:'A',opponent:'C'}).phase,'unknown');
});
test('official bracket classifies concrete matchups but not byes or winner placeholders',()=>{
 const i=createCompetitionIndex({brackets:{season:2026,classifications:{'2A':{status:'official',sourceUrl:url,rounds:[{name:'First round',games:[{date:'Oct 23, 2026',a:{name:'A'},b:{name:'B'}},{date:'Oct 23, 2026',a:{name:'A'},b:{name:'Bye'}},{date:'Oct 30, 2026',a:{name:'A'},b:{name:'Winner matchup 2'}}]}]}}}});
 assert.equal(i.classify({date:'10/23/2026',team:'B',opponent:'A'}).phase,'postseason');
 assert.equal(i.observations.size,1);
});
test('opponent/date aliases match; a moved game needs new schedule evidence',()=>{
 const i=index([fixture('2026-10-31','postseason','Water Canyon','St. Joseph')]);
 assert.equal(i.classify({date:'10/31/2026',team:'SAINT JOSEPH',opponent:'WATER CANYON'}).phase,'postseason');
 assert.equal(i.classify({date:'2026-10-30',team:'WATER CANYON',opponent:'SAINT JOSEPH'}).phase,'unknown');
 assert.equal(isoDate('2026-02-30'),null);
});
test('conflicting, unreviewed, simulated and wrong-season evidence is quarantined',()=>{
 assert.equal(index([fixture('2026-10-23','regular-season'),fixture('2026-10-23','postseason')]).classify({date:'2026-10-23',team:'A',opponent:'B'}).phase,'unknown');
 const g=fixture('2026-10-23','regular-season');g.verification='unreviewed';assert.equal(index([g]).observations.size,0);
 assert.equal(createCompetitionIndex({review:{season:2025,games:[fixture('2026-10-23','regular-season')]}}).observations.size,0);
});
test('partition retains all original box scores separately without mutating raw data',()=>{
 const input=[{date:'2026-08-14',team:'A',opponent:'B',players:[{statLines:[]}]},{date:'2026-10-23',team:'A',opponent:'B',players:[{name:'Player'}]},{date:'2026-10-30',team:'A',opponent:'B'}],before=JSON.stringify(input);
 const p=partitionGames(input,index([fixture('2026-08-14','regular-season'),fixture('2026-10-23','postseason')]));
 assert.equal(p.regular.length,1);assert.equal(p.postseason.length,1);assert.equal(p.unknown.length,1);assert.equal(p.postseason[0].game,input[1]);assert.equal(JSON.stringify(input),before);
});
test('team records reject any unknown final and exclude verified postseason finals',()=>{
 const games=[fixture('2026-08-14','regular-season'),fixture('2026-10-23','postseason')],i=index(games);
 assert.equal(assertClassifiedFinals(games,i).length,1);
 assert.throws(()=>assertClassifiedFinals([...games,{date:'2026-11-01',team:'A',opponent:'B'}],i),/unknown\/conflicting/);
});
test('mixed cumulative totals are never reduced by subtracting incomplete playoff logs',()=>{
 const r=chooseRegularSeasonTotal({retainedValue:1000,sourceScope:'includes-postseason',regularCells:[],expectedGameKeys:['regular-game']});
 assert.equal(r.value,null);assert.equal(r.retainedValue,1000);assert.equal(r.reason,'cumulative-total-cannot-be-separated');
});
test('complete field evidence is only a proposal; missing player fields and duplicates stay unknown',()=>{
 const cell={phase:'regular-season',verified:true,gameKey:'g',value:0,sourceUrl:url};
 const r=chooseRegularSeasonTotal({retainedValue:90,regularCells:[cell],expectedGameKeys:['g']});
 assert.equal(r.proposedValue,0);assert.equal(r.value,null);assert.equal(r.retainedValue,90);
 assert.equal(chooseRegularSeasonTotal({regularCells:[cell],expectedGameKeys:['g','missing']}).proposedValue,undefined);
 assert.equal(chooseRegularSeasonTotal({regularCells:[cell,cell],expectedGameKeys:['g']}).proposedValue,undefined);
 assert.equal(chooseRegularSeasonTotal({regularCells:[{...cell,value:null}],expectedGameKeys:['g']}).proposedValue,undefined);
});
test('an explicitly reviewed existing total survives incomplete logs unchanged',()=>{
 const r=chooseRegularSeasonTotal({retainedValue:2424,approval:{scope:'regular-season',reviewedBy:'fixture reviewer',sources:[url],value:2424}});
 assert.equal(r.value,2424);assert.equal(r.status,'preserved-verified');
});
test('publication approval binds exact bytes, scope, policy and source review',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rus-scope-')),file=path.join(dir,'stats.json'),reviewFile=path.join(dir,'review.json');
 try{
  fs.writeFileSync(file,'{"yards":0}');const entry={path:file,scope:'regular-season',reviewedBy:'fixture reviewer',reviewedAt:'2026-10-27',sources:[url],sha256:sha256(fs.readFileSync(file))};
  const review={season:2026,policy:POLICY,approvedFiles:[entry]};fs.writeFileSync(reviewFile,JSON.stringify(review));assert.equal(assertApprovedRegularSeasonFile(file,{reviewFile}).sha256,entry.sha256);
  fs.writeFileSync(file,'{"yards":1}');assert.throws(()=>assertApprovedRegularSeasonFile(file,{reviewFile}),/REGULAR_SEASON_REVIEW_REQUIRED/);
  entry.sha256=sha256(fs.readFileSync(file));entry.scope='all-games';fs.writeFileSync(reviewFile,JSON.stringify(review));assert.throws(()=>assertApprovedRegularSeasonFile(file,{reviewFile}),/REGULAR_SEASON_REVIEW_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('award supplement rejects date-only and postseason totals and preserves raw input',()=>{
 const source=fs.readFileSync(path.join(root,'region-awards-hub-2026-r3.js'),'utf8');const start=source.indexOf('function regularSeasonSpecialStats('),end=source.indexOf('function collect(',start);
 const ctx={};vm.runInNewContext(source.slice(start,end)+';this.pick=regularSeasonSpecialStats;',ctx);
 const unscoped={punt:{yards:500,throughDate:'2026-10-16'}},saved=JSON.stringify(unscoped);
 assert.equal(Object.keys(ctx.pick(unscoped)).length,0);
 const proof={season:2026,status:'verified',scope:'regular-season',reviewedBy:'fixture reviewer',games:[{phase:'regular-season',gameKey:'g',sourceUrl:url,competitionEvidence:[{phase:'regular-season',url}]}]};
 assert.equal(ctx.pick({punt:{yards:500,regularSeasonEvidence:proof}}).punt.yards,500);
 proof.games[0].phase='postseason';assert.equal(Object.keys(ctx.pick({punt:{regularSeasonEvidence:proof}})).length,0);
 assert.equal(JSON.stringify(unscoped),saved);assert.match(source,/p\.specialStats=regularSeasonSpecialStats/);
});
