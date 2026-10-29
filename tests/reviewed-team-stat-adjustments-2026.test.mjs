import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {applyReviewedTeamAdjustments,preservePublishedTeamStatistics} from '../scripts/lib/reviewed-team-stat-adjustments-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),saved=read('team-stats-2026.json'),manifest=read('reviewed-team-stat-adjustments-2026.json');
test('only 41 previously reviewed reported-aggregate fields are installed; all rankings remain held',()=>{
 assert.equal(manifest.decisions.length,41);assert.deepEqual(manifest.holds,[]);assert.equal(applyReviewedTeamAdjustments(saved,manifest).changes.length,0);
 assert.equal(saved.teams['CANYON VIEW'].rankings.passingYardsPerGame.state,26);assert.equal(saved.teams.MANTI.totalOffense,4208);
 for(const d of manifest.decisions)assert.ok(!d.path.includes('rankings'));
});
test('stale aggregate candidates cannot overwrite approved quantities or frozen published ranks',()=>{
 const incoming=structuredClone(saved);incoming.teams.MANTI.totalOffense=4034;incoming.teams['CANYON VIEW'].rankings.passingYardsPerGame.state=37;incoming.teams.MONTICELLO.passing.yards=1;
 assert.deepEqual(preservePublishedTeamStatistics(saved,incoming,manifest).data,saved);assert.equal(incoming.teams.MANTI.totalOffense,4034);
});
test('newer retained aggregate values are held instead of overwritten by an older reviewed decision',()=>{
 const newer=structuredClone(saved),d=manifest.decisions[0];let p=newer.teams[d.team];for(const k of d.path.slice(0,-1))p=p[k];p[d.path.at(-1)]=999999;
 assert.throws(()=>applyReviewedTeamAdjustments(newer,manifest),/Newer team-stat value/);
});
test('unknown, duplicate and ranking decisions cannot bypass aggregate preservation',()=>{
 for(const mutate of [m=>m.decisions.push(m.decisions[0]),m=>m.decisions[0].path=['rankings','passingYardsPerGame'],m=>m.decisions[0].verifiedReplacement=null,m=>m.holds.push({field:'unresolved'})]){
  const bad=structuredClone(manifest);mutate(bad);assert.throws(()=>applyReviewedTeamAdjustments(saved,bad));
 }
});
test('real finalizer keeps published values and writes the full rebuild only as a separate candidate artifact',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-protect-team-'));
 try{for(const [f,d] of [['baseline.json',saved],['team-stats-2026.json',{...saved,teams:{MANTI:{totalOffense:4034}}}],['reviewed-team-stat-adjustments-2026.json',manifest]])fs.writeFileSync(path.join(temp,f),JSON.stringify(d));
 const run=spawnSync(process.execPath,[path.resolve('scripts/protect_team_stats_2026.mjs'),'--baseline=baseline.json','--candidate-output=candidate.json'],{cwd:temp,encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.deepEqual(read(path.join(temp,'team-stats-2026.json')),saved);assert.equal(read(path.join(temp,'candidate.json')).teams.MANTI.totalOffense,4034);
 const alias=spawnSync(process.execPath,[path.resolve('scripts/protect_team_stats_2026.mjs'),'--baseline=team-stats-2026.json','--candidate-output=candidate.json'],{cwd:temp,encoding:'utf8'});assert.notEqual(alias.status,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('scheduled team publisher protects before preflight, retains candidates and never reapplies held ranks',()=>{
 const text=fs.readFileSync('.github/workflows/build-team-stats.yml','utf8');assert.ok(text.indexOf('cp team-stats-2026.json')<text.indexOf('node scripts/build_team_stats.mjs 2026'));assert.ok(text.indexOf('node scripts/protect_team_stats_2026.mjs')<text.indexOf('node scripts/check_stat_publish_2026.mjs'));assert.match(text,/team-stat-review-candidate/);
});

test('scheduled standings shard writer also refuses stale rebases and protects statistics',()=>{
 const text=fs.readFileSync('.github/workflows/build-standings-2026.yml','utf8');assert.match(text,/STAT_SOURCE_COMMIT/);assert.match(text,/check_standings_publish_2026/);assert.match(text,/group: current-football-statistics/);assert.match(text,/github.ref == 'refs\/heads\/main'/);assert.doesNotMatch(text,/git pull --rebase|git reset --hard/);
});
test('real standings publisher permits schedule changes but rejects player-shard mutations and concurrent main',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rus-standings-cas-'));
 try{
  fs.mkdirSync(path.join(temp,'team-current-data'));const f=path.join(temp,'team-current-data/a.json');const shard={team:'A',rosterStats:{stats:[{values:{YARDS:'100'}}]},gameStats:{games:[]},schedule:[]};fs.writeFileSync(f,JSON.stringify(shard));
  const git=(...args)=>{const r=spawnSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.test',...args],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  git('init','-q');git('add','.');git('commit','-qm','Published source');const base=git('rev-parse','HEAD');git('update-ref','refs/remotes/origin/main',base);
  const run=()=>spawnSync(process.execPath,[path.resolve('scripts/check_standings_publish_2026.mjs')],{cwd:temp,encoding:'utf8',env:{...process.env,STAT_SOURCE_COMMIT:base}});
  const changed=structuredClone(shard);changed.schedule=[{date:'2026-10-15'}];fs.writeFileSync(f,JSON.stringify(changed));assert.equal(run().status,0);
  changed.rosterStats.stats[0].values.YARDS='1';fs.writeFileSync(f,JSON.stringify(changed));assert.notEqual(run().status,0);fs.writeFileSync(f,JSON.stringify(shard));
  git('commit','--allow-empty','-qm','Concurrent update');const other=git('rev-parse','HEAD');git('reset','--hard',base);git('update-ref','refs/remotes/origin/main',other);assert.notEqual(run().status,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
