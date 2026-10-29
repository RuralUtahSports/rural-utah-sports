import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {applyVerifiedPlayerBatch} from '../scripts/lib/verified-player-corrections-2026.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const rosters=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json'),batch=read('regular-season-corrections-batch-1-2026.json');
const context={brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};
const row=(team,cat,id)=>rosters.teams[team].stats.find(s=>s.category===cat).rows.find(p=>p.playerId===id);
test('largest verified regular-season totals use stable current-year identities',()=>{
 assert.equal(row('SOUTH SUMMIT','Passing','south-summit-3-ian-mair').values.YARDS,'1397');
 assert.equal(row('SOUTH SUMMIT','Passing','south-summit-3-ian-mair').values['COMP-ATT'],'101-195');
 assert.equal(row('SOUTH SUMMIT','Rushing','south-summit-8-brody-larsen').values.YARDS,'1251');
 assert.equal(row('SOUTH SUMMIT','Receiving','south-summit-8-brody-larsen').values.YARDS,'203');
 assert.equal(row('MONTICELLO','Passing','monticello-6-cache-young').values.YARDS,'2230');
 assert.equal(row('MONTICELLO','Passing','monticello-6-cache-young').values.TD,'40');
 assert.equal(row('DUCHESNE','Kicking','duchesne-17-alec-thomas').values.PAT,'54');
});
test('each correction records sources, reporting date, included games, original and replacement',()=>{
 assert.equal(batch.decisions.length,40);assert.equal(batch.decisions.filter(d=>d.target==='season').length,28);
 for(const d of batch.decisions){assert.ok(d.source.startsWith('https://'));assert.match(d.reportingDate,/^2026-/);assert.ok(Object.hasOwn(d,'originalValue'));assert.ok(d.verifiedReplacement!==null);assert.ok(d.gamesIncluded.length);}
 const e=batch.evidenceSets.find(e=>e.identity.name==='Alec Thomas'),pats=e.games.map(g=>g.statLines.find(l=>l.category==='PATs and Field Goals').values.PAT);
 assert.equal(pats.length,10);assert.ok(pats.includes('0'));assert.equal(pats.reduce((s,x)=>s+Number(x),0),54);
 assert.ok(batch.evidenceSets.find(e=>e.identity.name==='Cache Young').games.some(g=>g.statLines.some(l=>l.category==='Rushing'&&l.values.YARDS==='-16')));
});
test('reapplying a reviewed batch is byte-stable and leaves inputs untouched',()=>{
 const before=JSON.stringify([rosters,games]),r=applyVerifiedPlayerBatch(rosters,games,batch,context);
 assert.equal(r.changes.length,0);assert.equal(JSON.stringify(r.rosters),JSON.stringify(rosters));assert.equal(JSON.stringify(r.games),JSON.stringify(games));assert.equal(JSON.stringify([rosters,games]),before);
});
test('unexpected newer retained totals are preserved for review',()=>{
 const changed=structuredClone(rosters),p=changed.teams['SOUTH SUMMIT'].stats.find(s=>s.category==='Passing').rows.find(p=>p.playerId==='south-summit-3-ian-mair');p.values.YARDS='1800';
 const before=JSON.stringify(changed);assert.throws(()=>applyVerifiedPlayerBatch(changed,games,batch,context),/Retained value changed/);assert.equal(JSON.stringify(changed),before);
});
test('duplicate, playoff and unknown game evidence cannot inflate regular totals',()=>{
 for(const mutate of [e=>e.games.push(structuredClone(e.games[0])),e=>{e.games[0].date='2026-10-30';e.games[0].opponent='ALA'},e=>{e.games[0].opponent='Unverified School'}]){
  const b=structuredClone(batch);mutate(b.evidenceSets[0]);b.evidenceSets[0].reportedGameCount=b.evidenceSets[0].games.length;assert.throws(()=>applyVerifiedPlayerBatch(rosters,games,b,context),/Duplicate, unknown or postseason/);
 }
});
test('identity mismatches and source-season/game-sum conflicts stop the batch',()=>{
 const b=structuredClone(batch);b.evidenceSets[0].identity.number='99';assert.throws(()=>applyVerifiedPlayerBatch(rosters,games,b,context),/Identity changed/);
 const c=structuredClone(batch);c.evidenceSets[0].games[0].statLines.find(l=>l.category==='Passing').values.YARDS='999';assert.throws(()=>applyVerifiedPlayerBatch(rosters,games,c,context),/evidence disagree/);
});
test('Gordon gets six explicitly reported game lines without season subtraction',()=>{
 const id='ben-lomond-2-dashawn-gordan';assert.equal(row('BEN LOMOND','Rushing',id).values.YARDS,'26');assert.equal(rosters.teams['BEN LOMOND'].roster.filter(p=>p.playerId===id).length,1);
 for(const [date,yards,carries] of [['2026-09-11','115','28'],['2026-09-18','66','16'],['2026-09-25','5','7'],['2026-10-02','72','13'],['2026-10-08','95','22'],['2026-10-14','41','12']]){
  const p=games.teams['BEN LOMOND'].games.find(g=>g.date===date).players.find(p=>p.playerId===id),line=p.statLines.find(l=>l.category==='Rushing'),v=key=>Object.entries(line.values).find(([h])=>h.toUpperCase()===key)?.[1];assert.equal(v('YARDS'),yards);assert.equal(v('CARRIES'),carries);
 }
 const b=structuredClone(batch),e=b.evidenceSets.find(e=>e.heldSeasonTotal);b.decisions.push({...b.decisions[0],id:'forbidden-subtraction',team:e.team,playerId:e.identity.playerId,category:'Rushing',field:'YARDS',originalValue:'26',verifiedReplacement:'762',evidenceId:e.id});assert.throws(()=>applyVerifiedPlayerBatch(rosters,games,b,context),/Unseparated cumulative/);
});
test('leaderboards, team shards and aggregates agree with the corrected player cells',()=>{
 const metrics=read('deseret-stat-metrics-2026.json');
 for(const [team,category,id,field,value] of [['SOUTH SUMMIT','Passing','south-summit-3-ian-mair','Yards','1397'],['SOUTH SUMMIT','Rushing','south-summit-8-brody-larsen','Yards','1251'],['MONTICELLO','Passing','monticello-6-cache-young','Yards','2230']]){
  assert.equal(metrics.teams[team].stats.find(s=>s.category===category).rows.find(p=>p.playerId===id).values[field],value);assert.deepEqual(read('team-current-data/'+team.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json').rosterStats,rosters.teams[team]);
 }
 assert.deepEqual(read('team-current-data/ben-lomond.json').gameStats,games.teams['BEN LOMOND']);
 const teams=read('team-stats-2026.json').teams;assert.equal(teams['SOUTH SUMMIT'].passing.yards,1414);assert.equal(teams.MONTICELLO.passing.yards,2261);assert.equal(teams.DUCHESNE.kicking.pat,54);
});
test('existing metric/team publishers still run without blanket certification files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rus-publishing-regression-'));
 try{
  const sample={season:2026,teams:{SCHOOL:{team:'SCHOOL',stats:[{category:'Passing',headers:['COMP-ATT','YARDS','TD'],rows:[{playerId:'p',name:'Player',values:{'COMP-ATT':'2-3',YARDS:'40',TD:'1'}}]}]}}};
  fs.writeFileSync(path.join(dir,'deseret-rosters-stats-2026.json'),JSON.stringify(sample));fs.writeFileSync(path.join(dir,'teams-data.json'),JSON.stringify([{team:'SCHOOL',classification:'2A',region:'Test'}]));fs.writeFileSync(path.join(dir,'standings-2026.json'),JSON.stringify({byClassification:{'2A':[{team:'SCHOOL',wins:1,losses:0,pointsFor:7,pointsAgainst:0}]}}));
  for(const script of ['build_deseret_stat_metrics.mjs','build_team_stats.mjs']){const r=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:dir,encoding:'utf8'});assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);}
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'deseret-stat-metrics-2026.json'))).teams.SCHOOL.stats[0].rows[0].values.Yards,'40');assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'team-stats-2026.json'))).teams.SCHOOL.passing.yards,40);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
