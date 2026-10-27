import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {retainSeasonStatistics,retainVerifiedGameCells} from '../scripts/lib/regular-season-import-2026.mjs';
import {reconcileSeasonStats} from '../scripts/reconcile_season_stats_from_game_logs.mjs';
import {applyVerifiedPlayerBatch} from '../scripts/lib/verified-player-corrections-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const roster=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json');
const context={brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};

test('stale, incomplete and playoff-inclusive season imports remain candidates, not replacements',()=>{
 const incoming=structuredClone(roster),team=incoming.teams['SOUTH SUMMIT'];
 team.stats[0].rows[0].values.YARDS='999999';team.roster[0].position='QB';
 delete incoming.teams.MONTICELLO;
 const original=JSON.stringify(roster),result=retainSeasonStatistics(roster,incoming);
 assert.deepEqual(result.rosters.teams['SOUTH SUMMIT'].stats,roster.teams['SOUTH SUMMIT'].stats);
 assert.equal(result.rosters.teams['SOUTH SUMMIT'].roster[0].position,'QB');
 assert.deepEqual(result.rosters.teams.MONTICELLO,roster.teams.MONTICELLO);
 assert.ok(result.candidateTeams.includes('SOUTH SUMMIT'));assert.equal(JSON.stringify(roster),original);
});
test('reconciliation excludes postseason and unknown scope without treating team box presence as player completeness',()=>{
 const before=structuredClone(roster),data=structuredClone(games);
 const playoff=read('maxpreps-player-game-stats-2026.json').teams['BEN LOMOND'].games.find(g=>g.date==='2026-10-23');assert.ok(playoff);data.teams['BEN LOMOND'].games.push({...playoff,players:[playoff]});
 const summary=reconcileSeasonStats(before,data,context);
 assert.ok(summary.excludedPostseason>0);assert.ok(summary.excludedUnknown>0);
 assert.equal(summary.fields,0);assert.equal(summary.players,0);
 assert.deepEqual(before.teams,roster.teams);assert.equal(data.teams['BEN LOMOND'].games.at(-1).date,'2026-10-23');
});
test('verified game fields survive missing or stale imported player lines while playoff boxes remain available',()=>{
 const batch=read('regular-season-corrections-batch-1-2026.json'),incoming=structuredClone(games);
 const game=incoming.teams['BEN LOMOND'].games.find(g=>g.date==='2026-09-11');
 game.players=game.players.filter(p=>p.playerId!=='ben-lomond-2-dashawn-gordan');
 const result=retainVerifiedGameCells(games,incoming,batch);
 assert.equal(result.teams['BEN LOMOND'].games.find(g=>g.date==='2026-09-11').players.find(p=>p.playerId==='ben-lomond-2-dashawn-gordan').statLines.find(l=>l.category==='Rushing').values.Yards,'115');
 const playoff=data=>data.teams['BEN LOMOND'].games.find(g=>g.date==='2026-10-23');
 assert.deepEqual(playoff(result),playoff(games));
 const changed=structuredClone(games);changed.teams['BEN LOMOND'].games.find(g=>g.date==='2026-09-11').players.find(p=>p.playerId==='ben-lomond-2-dashawn-gordan').statLines.find(l=>l.category==='Rushing').values.Yards='114';
 assert.throws(()=>retainVerifiedGameCells(changed,incoming,batch),/baseline game value changed/);
});
test('batch 2 installs only the 16 reviewed fields and preserves unrelated defense and identity metadata',()=>{
 const batch=read('regular-season-corrections-batch-2-2026.json');assert.equal(batch.decisions.length,16);
 const reapplied=applyVerifiedPlayerBatch(roster,games,batch,context);assert.equal(reapplied.changes.length,0);
 const original=structuredClone(roster);
 for(const d of batch.decisions){const row=original.teams[d.team].stats.find(s=>s.category===d.category).rows.find(p=>p.playerId===d.playerId);row.values[d.field]=d.originalValue;}
 const result=applyVerifiedPlayerBatch(original,games,batch,context);assert.equal(result.changes.length,16);
 for(const team of ['SOUTH SUMMIT','MONTICELLO']){
  assert.deepEqual(result.rosters.teams[team].roster,roster.teams[team].roster);
  assert.deepEqual(result.rosters.teams[team].stats.find(s=>s.category==='Defense/Special Teams'),roster.teams[team].stats.find(s=>s.category==='Defense/Special Teams'));
 }
 const row=(team,id)=>result.rosters.teams[team].stats.find(s=>s.category==='Receiving').rows.find(p=>p.playerId===id).values;
 assert.equal(row('SOUTH SUMMIT','south-summit-11-cash-rockhill').YARDS,'140');
 assert.equal(row('MONTICELLO','monticello-7-cash-mack').YARDS,'672');
 assert.equal(row('MONTICELLO','monticello-11-canyon-christensen').YARDS,'187');
});
test('real import finalizer retains source-reviewed fields after a simulated stale importer',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-import-policy-'));
 try{
  for(const f of ['regular-season-correction-batches-2026.json','regular-season-corrections-batch-1-2026.json','regular-season-corrections-batch-2-2026.json','official-brackets-2026.json','competition-scope-review-2026.json'])fs.copyFileSync(f,path.join(temp,f));
  const incoming=structuredClone(roster);incoming.teams['SOUTH SUMMIT'].stats=[];
  for(const [f,d] of [['baseline.json',roster],['game-baseline.json',games],['deseret-rosters-stats-2026.json',incoming],['player-game-stats-2026.json',games]])fs.writeFileSync(path.join(temp,f),JSON.stringify(d));
  const run=spawnSync(process.execPath,[path.resolve('scripts/protect_regular_season_import_2026.mjs'),'--baseline=baseline.json','--games-baseline=game-baseline.json'],{cwd:temp,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=read(path.join(temp,'deseret-rosters-stats-2026.json'));
  assert.deepEqual(result.teams['SOUTH SUMMIT'].stats,roster.teams['SOUTH SUMMIT'].stats);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('every automatic season publisher captures a baseline, protects before metrics and refuses a stale main',()=>{
 for(const file of ['build-current-game-stats','build-deseret-rosters-stats','build-maxpreps-stats-fallback']){
  const text=fs.readFileSync('.github/workflows/'+file+'.yml','utf8');
  assert.ok(text.indexOf('cp deseret-rosters-stats-2026.json')<text.indexOf('node scripts/merge_'));
  assert.ok(text.indexOf('node scripts/protect_regular_season_import_2026.mjs')<text.indexOf('node scripts/build_deseret_stat_metrics.mjs'));
  assert.match(text,/git rev-parse origin\/main/);assert.match(text,/STAT_SOURCE_COMMIT/);
  assert.doesNotMatch(text,/git pull --rebase|git reset --hard|git switch -C/);
  assert.match(text,/branches: \[main\]/);
 }
});

test('RPI writers cannot commit generated updates to statistics review branches',()=>{
 for(const name of ['refresh-rpi-standings','update-rpi-oos-maxpreps']){
  const text=fs.readFileSync('.github/workflows/'+name+'.yml','utf8');
  assert.match(text,/push:\n    branches: \[main\]/);
  assert.match(text,/if: github.ref == 'refs\/heads\/main'/);
 }
});
