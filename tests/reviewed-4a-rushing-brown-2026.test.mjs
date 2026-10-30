import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';
const require=createRequire(import.meta.url);
const {validate,applyVerified}=require('../reviewed-4a-rushing-brown-2026.js');
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const proof=read('audits/2026-regular-season/4a-rushing-seth-brown-evidence.json');
const teamData=read('team-current-data/desert-hills.json');
const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
test('Seth Brown: all 10 regular game box scores reconcile to 1008 yards and 149 carries',()=>{
 assert.deepEqual(validate(proof),{YARDS:'1008',CARRIES:'149'});
 assert.equal(proof.sourceGames.length,10);
 assert.equal(teamData.current.schedule.filter(g=>g.rusStatus==='Final').length,10);
 const index=createCompetitionIndex({brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
 const ids=new Set();
 for(const g of proof.sourceGames){
  assert.equal(ids.has(g.gameKey),false,'duplicate canonical game');ids.add(g.gameKey);
  const scheduled=teamData.current.schedule.filter(s=>s.date===g.date&&norm(s.opponent)===norm(g.opponent)&&s.rusStatus==='Final');
  assert.equal(scheduled.length,1);
  assert.deepEqual({for:scheduled[0].teamScore,against:scheduled[0].opponentScore},g.finalScore);
  const matches=teamData.gameStats.games.filter(x=>x.gameKey===g.gameKey&&x.date===g.date&&norm(x.opponent)===norm(g.opponent));
  assert.equal(matches.length,1);
  assert.equal(matches[0].maxprepsUrl,g.sourceUrl);
  const athlete=matches[0].players.filter(p=>p.playerId===proof.playerId&&p.name===proof.name&&String(p.number)==='2');
  assert.equal(athlete.length,1);
  const lines=athlete[0].statLines.filter(l=>l.category==='Rushing');
  assert.equal(lines.length,1);
  assert.equal(Number(lines[0].values.YARDS??lines[0].values.Yards),g.rushingYards);
  assert.equal(Number(lines[0].values.CARRIES??lines[0].values.Carries),g.carries);
  assert.equal(index.classify({date:g.date,opponent:g.opponent,url:g.sourceUrl},proof.team).phase,'regular-season');
 }
});
test('published overlay preserves all other players, TDs, reported season and awards',()=>{
 const original=read('regular-season-publication-2026.json'),p=structuredClone(original),first=JSON.stringify(p);
 const result=applyVerified(p,proof);
 assert.deepEqual(result,{playerId:proof.playerId,rushingYards:1008,carries:149,games:10,created:true});
 const school=Object.entries(p.teams).find(([key])=>norm(key)==='DESERTHILLS')?.[1];
 const row=school?.stats?.filter(s=>s.category==='Rushing').flatMap(s=>s.rows||[]).find(x=>x.playerId===proof.playerId);
 assert.equal(row?.values?.YARDS,'1008');assert.equal(row?.values?.CARRIES,'149');
 assert.equal(row?.values?.TD,undefined,'No touchdown number elevated without full evidence');
 assert.equal(applyVerified(p,proof).created,false,'overlay is idempotent');
 assert.equal(JSON.stringify(original),first,'input publication remains unchanged');
 const leaders=fs.readFileSync('stat-leaders.html','utf8');
 assert.match(leaders,/RUSReviewed4ARushingBrown2026\.applyVerified\(regularPublication,await ev\.json\(\)\)/);
 assert.match(leaders,/reviewed-4a-rushing-brown-2026\.js/);
 assert.match(leaders,/sourceMode==='reported'\?reportedStats:regularPublication/);
});
test('no publication of invalid, partial, duplicated or mismatched evidence',()=>{
 const variations=[
  p=>{p.sourceGames.pop();},
  p=>{p.sourceGames[0].rushingYards+=1;},
  p=>{p.sourceGames[1].gameKey=p.sourceGames[0].gameKey;},
  p=>{p.sourceGames[0].sourceUrl='https://not-maxpreps.example.test';},
  p=>{p.sourceGames[0].carries=-1;},
  p=>{p.playerId='desert-hills-other';}
 ];
 for(const change of variations){const ev=structuredClone(proof),p=read('regular-season-publication-2026.json');change(ev);const previous=JSON.stringify(p);assert.throws(()=>applyVerified(p,ev));assert.equal(JSON.stringify(p),previous);}
 const reported={season:2026,scope:'reported',teams:read('regular-season-publication-2026.json').teams};
 assert.throws(()=>applyVerified(reported,proof),/only to reviewed/);
});
test('existing conflicting verified values require reviewed supersession',()=>{
 const p=read('regular-season-publication-2026.json');
 applyVerified(p,proof);
 const school=Object.entries(p.teams).find(([name])=>norm(name)==='DESERTHILLS')?.[1];
 const row=school?.stats?.filter(s=>s.category==='Rushing').flatMap(s=>s.rows||[]).find(x=>x.playerId===proof.playerId);
 row.values.YARDS='1007';
 const previous=JSON.stringify(p);
 assert.throws(()=>applyVerified(p,proof),/reviewed rushing total changed/);
 assert.equal(JSON.stringify(p),previous);
});
