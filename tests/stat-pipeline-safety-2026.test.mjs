import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {reportedNumber,uniquePlayerSubmissions} from '../scripts/lib/stat-import-integrity-2026.mjs';
import {mergeMaxPrepsGameLogs} from '../scripts/merge_maxpreps_game_logs.mjs';
import {rosterMatch,parsePrintStats,mergeTeam} from '../scripts/merge_maxpreps_stats_fallback.mjs';
import {mergeValue} from '../scripts/merge_deseret_stats_endpoints.mjs';
import {retainSeasonStatistics,retainReportedGameCells} from '../scripts/lib/regular-season-import-2026.mjs';
import {assertPublishSnapshot} from '../scripts/check_stat_publish_2026.mjs';
import {buildRegularSeasonPublication} from '../scripts/build_regular_season_publication_2026.mjs';
import {loadReviewedBatches,resolveReviewedBatches} from '../scripts/lib/reviewed-batches-2026.mjs';
import {applyVerifiedPlayerBatch} from '../scripts/lib/verified-player-corrections-2026.mjs';
const policy=createRequire(import.meta.url)('../regular-season-stat-policy-2026.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const roster=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json'),batches=loadReviewedBatches();
const context={brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};
const lock=fs.readFileSync('region-awards-2026.lock.json','utf8');
const publication=()=>buildRegularSeasonPublication(roster,games,batches,context,lock);
const player={playerId:'a',name:'Example Player',number:'7'};
const source=(value='0')=>({date:'2026-09-04',opponent:'B',...player,statLines:[{category:'Rushing',values:{YARDS:value,TD:'',CARRIES:'0'}}]});
const output=()=>({teams:{A:{games:[{date:'2026-09-04',opponent:'B',players:[]}]}}});

test('missing and invalid numbers remain unknown; explicit zero and negative yards remain reported',()=>{
 for(const x of [null,undefined,'','  ','—','-','NaN'])assert.equal(reportedNumber(x),null);
 assert.equal(reportedNumber('0'),0);assert.equal(reportedNumber('-16'),-16);
 const data=output();mergeMaxPrepsGameLogs(data,{teams:{A:{games:[source()]}}});
 assert.equal(data.teams.A.games[0].players[0].statLines[0].values.YARDS,'0');
 assert.ok(!Object.hasOwn(data.teams.A.games[0].players[0].statLines[0].values,'TD'));
});
test('Deseret endpoint disagreements are not resolved by choosing the larger cumulative value',()=>{
 assert.equal(mergeValue('YARDS','1100','900','b'),'900');
 assert.equal(mergeValue('COMP-ATT','90-150','80-130','b'),'80-130');
 assert.equal(mergeValue('YARDS','','0','a'),'0');assert.equal(mergeValue('TD',null,'','a'),'');
});
test('MaxPreps parsing preserves zero, leaves blank unknown and rejects explicit jersey conflicts',()=>{
 const html='<h3>Rushing</h3><table><thead><tr><th>#</th><th>Athlete Name</th><th>Att</th><th>Yds</th><th>TD</th></tr></thead><tbody><tr><td>7</td><th><a title="Example Player">Example Player</a></th><td>0</td><td>0</td><td></td></tr></tbody></table>';
 const rows=parsePrintStats(html);assert.equal(rows[0].values.YARDS,'0');assert.ok(!Object.hasOwn(rows[0].values,'TD'));
 assert.equal(rosterMatch({roster:[player],stats:[]},{name:player.name,number:'8'}),null);
 assert.equal(rosterMatch({roster:[player,{...player,playerId:'b',name:'Other Player'}],stats:[]},{name:'E. Player',number:'8'}),null);
});
test('exact repeated submissions are idempotent; conflicting submissions are withheld rather than double-counted',()=>{
 const a=source('10');assert.equal(uniquePlayerSubmissions([a,structuredClone(a)]).rows.length,1);
 const bad=uniquePlayerSubmissions([a,source('12'),structuredClone(a)]);assert.equal(bad.rows.length,0);assert.equal(bad.conflicts.length,1);
 const data=output(),r=mergeMaxPrepsGameLogs(data,{teams:{A:{games:[a,a]}}});assert.equal(r.gamesMatched,1);
 assert.equal(data.teams.A.games[0].players[0].statLines[0].values.YARDS,'10');
 const held=output();mergeMaxPrepsGameLogs(held,{teams:{A:{games:[a,source('12')]}}});assert.equal(held.teams.A.games[0].players.length,0);
});
test('missing games and nearby dates/opponents cannot authorize an inferred match',()=>{
 const data=output(),before=JSON.stringify(data),incoming={...source('10'),date:'2026-09-05'};
 assert.equal(mergeMaxPrepsGameLogs(data,{teams:{A:{games:[incoming]}}}).gamesMatched,0);
 assert.equal(JSON.stringify(data),before);
 incoming.date='2026-09-04';incoming.opponent='Different school';
 assert.equal(mergeMaxPrepsGameLogs(data,{teams:{A:{games:[incoming]}}}).gamesMatched,0);
});
test('reused player IDs and duplicate target games cannot silently receive another athlete’s stats',()=>{
 const data=output();data.teams.A.games[0].players=[{...player,number:'9',statLines:[]}];
 assert.equal(mergeMaxPrepsGameLogs(data,{teams:{A:{games:[source('100')]}}}).identityConflicts,1);
 assert.equal(data.teams.A.games[0].players[0].statLines.length,0);
 const dup=output();dup.teams.A.games.push(structuredClone(dup.teams.A.games[0]));
 assert.equal(mergeMaxPrepsGameLogs(dup,{teams:{A:{games:[source('100')]}}}).gamesMatched,0);
});
test('delayed coach updates stay review candidates even when higher or lower than retained verified data',()=>{
 for(const value of ['50','150']){
  const team={team:'A',roster:[player],stats:[{category:'Defense/Special Teams',headers:['TACKLES'],rows:[{...player,values:{TACKLES:'100'},statSources:{TACKLES:'Verified source'}}]}]};
  mergeTeam(team,[{category:'Defense/Special Teams',name:player.name,number:'7',values:{TACKLES:value}}],'fixture');
  assert.equal(team.stats[0].rows[0].values.TACKLES,'100');
 }
});
test('retained published statistics keep their stable name and jersey when an imported roster changes',()=>{
 const incoming=structuredClone(roster),id='south-summit-3-ian-mair';incoming.teams['SOUTH SUMMIT'].roster.find(p=>p.playerId===id).number='99';
 const held=retainSeasonStatistics(roster,incoming);assert.equal(held.rosters.teams['SOUTH SUMMIT'].roster.find(p=>p.playerId===id).number,'3');
 assert.ok(held.rosters.summary.regularSeasonImportReview.identityConflicts.length);
});
test('read publication includes exactly 44 verified season fields, protects 12 game fields and never publishes Gordon’s held season total',()=>{
 const proof=publication();assert.equal(proof.verifiedSeasonFields,44);assert.equal(proof.verifiedGameFields,12);
 assert.equal(proof.teams['BEN LOMOND'].stats.length,0);assert.equal(proof.eligibleTeamTotals.length,0);
 assert.equal(proof.teams['MONTICELLO'].stats.find(s=>s.category==='Passing').rows[0].values.YARDS,'2230');
 assert.throws(()=>policy.requirePublication({season:2026,teams:roster.teams}),/unavailable/);
 const changed=structuredClone(roster);changed.teams['SOUTH SUMMIT'].stats.find(s=>s.category==='Passing').rows.find(p=>p.playerId==='south-summit-3-ian-mair').values.YARDS='1500';
 assert.throws(()=>buildRegularSeasonPublication(changed,games,batches,context,lock),/source review required/);
});
test('regular-game read view excludes playoffs/unknowns and duplicate fields without mutating boxes',()=>{
 const proof=publication(),a={...source('0'),date:'2026-09-11',opponent:'MOFFAT, CO',players:[{...player,statLines:[{category:'Rushing',values:{YARDS:'0'}},{category:'Rushing',values:{YARDS:'0'}}]}]};
 const post={...a,date:'2026-10-23',opponent:'GRANTSVILLE'},unknown={...a,date:'2026-12-01'};const original=JSON.stringify([a,post,unknown]);
 const selected=policy.regularGames([a,a,post,unknown],'BEN LOMOND',proof);assert.equal(selected.length,1);assert.equal(selected[0].players[0].statLines.length,1);assert.equal(selected[0].players[0].statLines[0].values.YARDS,'0');
 assert.equal(JSON.stringify([a,post,unknown]),original);
 const defense=structuredClone(a);defense.players[0].statLines=[{category:'Defense',values:{Interceptions:'1'}},{category:'Defensive Statistics',values:{'PASS INT.':'1'}},{category:'Special Teams',values:{'RETURN TD':'1'}},{category:'Touchdowns',values:{'RETURN TD':'1'}}];
 const merged=policy.regularGames([defense],'BEN LOMOND',proof)[0].players[0].statLines.find(l=>l.category==='Defense/Special Teams');
 assert.equal(merged.values.PASSINT,'1');assert.equal(merged.values.RETURNTD,'1');
});
test('frozen candidate snapshot accepts exact original bytes and refuses cumulative or modified data',async()=>{
 const proof=publication();assert.equal((await policy.verifyLockedSnapshot(lock,proof)).status,'LOCKED');
 await assert.rejects(policy.verifyLockedSnapshot(lock+' ',proof),/snapshot changed/);
 assert.throws(()=>buildRegularSeasonPublication(roster,games,batches,context,lock+' '),/award inputs changed/);
});
test('concurrent publication refuses old checkout, advanced main, missing baseline and protected mutations',()=>{
 const base='a'.repeat(40),other='b'.repeat(40);assert.doesNotThrow(()=>assertPublishSnapshot({base,head:base,remote:base}));
 for(const args of [{base,head:base,remote:other},{base,head:other,remote:base},{head:base,remote:base},{base,head:base,remote:base,protectedChanged:true}])assert.throws(()=>assertPublishSnapshot(args));
});
test('rebuilding boxes cannot erase earlier reports, change scores or promote a delayed conflicting coach update',()=>{
 const retained=output();retained.teams.A.games[0].teamScore=10;
 retained.teams.A.games[0].players=[{...player,statLines:[{category:'Rushing',values:{YARDS:'100',TD:'',CARRIES:'0'},statSources:{YARDS:'Reviewed source'}}]}];
 const incoming=structuredClone(retained);incoming.teams.A.games[0].teamScore=999;
 incoming.teams.A.games[0].players[0].statLines[0].values={YARDS:'200',TD:'0',CARRIES:'3'};
 const result=retainReportedGameCells(retained,incoming);
 assert.equal(result.teams.A.games[0].teamScore,10);
 assert.deepEqual(result.teams.A.games[0].players[0].statLines,retained.teams.A.games[0].players[0].statLines);
 assert.deepEqual(retainReportedGameCells(retained,{teams:{A:{games:[]}}}).teams.A.games,retained.teams.A.games);
});
test('scheduled and dispatch publishers use a captured current-main snapshot with no stale-output retries',()=>{
 const names=['build-current-game-stats','build-deseret-rosters-stats','build-maxpreps-stats-fallback','build-team-stats','game-center-research','merge-current-player-single-game-records','build-player-single-game-records','season-record-alerts','build-player-search-index','data-audit','refresh-rpi-standings','update-rpi-oos-maxpreps'];
 for(const name of names){
  const text=fs.readFileSync('.github/workflows/'+name+'.yml','utf8');
  assert.match(text,/STAT_SOURCE_COMMIT/);assert.match(text,/check_stat_publish_2026\.mjs/);assert.match(text,/github.ref == 'refs\/heads\/main'/);
  assert.ok(text.indexOf('git fetch origin main')<text.indexOf('node scripts/check_stat_publish_2026.mjs'));
  assert.doesNotMatch(text,/git pull --rebase|git reset --hard|for attempt in/);
 }
 for(const name of ['build-standings-2026','build-clean-elo-v2','build-scorigami','build-scorigami-alert','update-live-scoreboard-fast','build-home-week-data']){
  const text=fs.readFileSync('.github/workflows/'+name+'.yml','utf8');assert.match(text,/push:\n    branches: \[main\]/);
 }
});
test('real Git publishing preflight passes a current snapshot and rejects protected changes and a concurrent remote commit',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-publish-cas-'));
 try{
  const files=['deseret-rosters-stats-2026.json','player-game-stats-2026.json','regular-season-correction-batches-2026.json',...read('regular-season-correction-batches-2026.json').batches,'official-brackets-2026.json','competition-scope-review-2026.json','region-awards-2026.lock.json','regular-season-publication-2026.json','weekly-simulation.json','team-stats-2026.json','reviewed-team-stat-adjustments-2026.json'];
  for(const f of files)fs.copyFileSync(f,path.join(temp,f));
  const git=(...args)=>{const r=spawnSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.test',...args],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('commit','-qm','Source snapshot');const base=git('rev-parse','HEAD');git('update-ref','refs/remotes/origin/main',base);
  const run=(args=[])=>spawnSync(process.execPath,[path.resolve('scripts/check_stat_publish_2026.mjs'),...args],{cwd:temp,env:{...process.env,STAT_SOURCE_COMMIT:base},encoding:'utf8'});
  assert.equal(run().status,0);assert.equal(run(['--snapshot-only']).status,0);
  fs.writeFileSync(path.join(temp,'weekly-simulation.json'),'{}');assert.notEqual(run().status,0);assert.notEqual(run(['--snapshot-only']).status,0);git('checkout','--','weekly-simulation.json');
  fs.appendFileSync(path.join(temp,'deseret-rosters-stats-2026.json'),'\n');assert.notEqual(run(['--snapshot-only']).status,0);git('checkout','--','deseret-rosters-stats-2026.json');
  git('commit','--allow-empty','-qm','Concurrent update');const other=git('rev-parse','HEAD');git('reset','--hard',base);git('update-ref','refs/remotes/origin/main',other);
  assert.notEqual(run().status,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('a later reviewed coach correction can explicitly supersede an older verified field without reopening stale imports',()=>{
 const previous=batches[1],old=previous.decisions.find(d=>d.playerId==='south-summit-11-cash-rockhill'&&d.field==='TD');
 const evidence=structuredClone(previous.evidenceSets.find(e=>e.id===old.evidenceId));evidence.id='fixture-later-evidence';evidence.reportingDate='2026-10-27';
 evidence.sourceSeasonRows.find(r=>r.category==='Receiving').values.TD='4';
 const line=evidence.games.flatMap(g=>g.statLines).find(l=>l.category==='Receiving'&&Number(l.values.TD)>0);line.values.TD=String(Number(line.values.TD)+1);
 const replacement={...old,id:'fixture-later-reviewed-td',originalValue:old.verifiedReplacement,verifiedReplacement:'4',reportingDate:evidence.reportingDate,evidenceId:evidence.id,supersedes:{batchId:previous.id,decisionId:old.id}};
 const later={...previous,id:'fixture-later-reviewed-batch',decisions:[replacement],evidenceSets:[evidence]},effective=resolveReviewedBatches([...batches,later]);
 assert.equal(effective.flatMap(b=>b.decisions).length,batches.flatMap(b=>b.decisions).length);
 let state={rosters:roster,games};for(const b of effective)state=applyVerifiedPlayerBatch(state.rosters,state.games,b,context);
 assert.equal(state.rosters.teams['SOUTH SUMMIT'].stats.find(s=>s.category==='Receiving').rows.find(p=>p.playerId===old.playerId).values.TD,'4');
 assert.equal(roster.teams['SOUTH SUMMIT'].stats.find(s=>s.category==='Receiving').rows.find(p=>p.playerId===old.playerId).values.TD,'3');
 const stale=structuredClone(later);stale.decisions[0].reportingDate='2026-09-01';assert.throws(()=>resolveReviewedBatches([...batches,stale]),/stale correction/);
 const implicit=structuredClone(later);delete implicit.decisions[0].supersedes;assert.throws(()=>resolveReviewedBatches([...batches,implicit]),/explicit reviewed supersession/);
});
test('derived metric and team builders honor canonical published values instead of reapplying stale manual floors',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-canonical-builders-'));
 try{
  // Synthetic lower correction exercises the old hardcoded-floor bypass; it is
  // never written to the repository's real season dataset.
  const fixture={season:2026,teams:{'WATER CANYON':{team:'WATER CANYON',roster:[],stats:[{category:'Rushing',headers:['YARDS','CARRIES','TD'],rows:[{playerId:'water-canyon-35-alma-barlow',number:'35',name:'Alma Barlow',values:{YARDS:'100',CARRIES:'10',TD:'1'}}]}]}}};
  fs.writeFileSync(path.join(temp,'deseret-rosters-stats-2026.json'),JSON.stringify(fixture));
  for(const f of ['manual-stat-corrections-2026.json','teams-data.json','standings-2026.json'])fs.copyFileSync(f,path.join(temp,f));
  for(const script of ['build_deseret_stat_metrics.mjs','build_team_stats.mjs']){
   const run=spawnSync(process.execPath,[path.resolve('scripts/'+script)],{cwd:temp,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  }
  const metrics=JSON.parse(fs.readFileSync(path.join(temp,'deseret-stat-metrics-2026.json'),'utf8'));
  const totals=JSON.parse(fs.readFileSync(path.join(temp,'team-stats-2026.json'),'utf8'));
  assert.equal(metrics.teams['WATER CANYON'].stats[0].rows[0].values.Yards,'100');
  assert.equal(totals.teams['WATER CANYON'].rushing.yards,100);
  assert.equal(totals.teams['WATER CANYON'].passing.yards,null);
  assert.equal(totals.teams['WATER CANYON'].defense.sacks,null);
  assert.equal(totals.teams['WATER CANYON'].totalOffense,null);
  assert.equal(totals.teams['WATER CANYON'].passing.yardsPerGame,null);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
