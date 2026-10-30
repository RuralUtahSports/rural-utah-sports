import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';
const require=createRequire(import.meta.url);
const {validateEvidence,applyVerified}=require('../reviewed-4a6a-passing-batch-2026.js');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const evidence=read('audits/2026-regular-season/4a-6a-passing-batch-1-evidence.json');
const source=read('team-current-data/desert-hills.json');
const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
test('Deacon Virgin: ten schedule-verified MaxPreps game reports equal exactly 1,904 passing yards',()=>{
 const totals=validateEvidence(evidence);
 assert.deepEqual(totals,{YARDS:'1904','COMP-ATT':'144-276',TD:'17',Int:'16'});
 assert.equal(evidence.sourceGames.length,10);
 assert.equal(source.current.schedule.filter(g=>g.rusStatus==='Final').length,10);
 const seen=new Set();
 for(const g of evidence.sourceGames){
  assert.ok(!seen.has(g.gameKey));seen.add(g.gameKey);
  const schedule=source.current.schedule.filter(s=>s.date===g.date&&norm(s.opponent)===norm(g.opponent)&&s.rusStatus==='Final');
  assert.equal(schedule.length,1,'Unique Final schedule entry '+g.date);
  const game=source.gameStats.games.filter(s=>s.gameKey===g.gameKey);
  assert.equal(game.length,1,'Canonical game '+g.gameKey);
  assert.equal(game[0].maxprepsUrl,g.sourceUrl);
  const hits=game[0].players.filter(p=>p.playerId===evidence.playerId&&p.name===evidence.name&&p.number===evidence.number);
  assert.equal(hits.length,1,'Stable source identity '+g.date);
  const lines=hits[0].statLines.filter(x=>x.category==='Passing');
  assert.equal(lines.length,1);
  const v=lines[0].values;
  assert.equal(Number(v.YARDS??v.Yards),g.yards);
  assert.equal(v['COMP-ATT']??v['Comp-Att'],g.completions);
  assert.equal(Number(v.TD??0),g.passingTD);
  assert.equal(Number(v.Int),g.interceptions);
 }
});
test('source games classify as regular season through reviewed competition identity, not date alone',()=>{
 const index=createCompetitionIndex({
  brackets:read('official-brackets-2026.json'),
  review:read('competition-scope-review-2026.json')
 });
 for(const g of evidence.sourceGames){
  const x=index.classify({date:g.date,opponent:g.opponent,url:g.sourceUrl},evidence.team);
  assert.equal(x.phase,'regular-season',g.gameKey+' classification');
 }
});
test('verified publication adds only uniquely matched Deacon passing values and never alters reported data',()=>{
 const original=read('regular-season-publication-2026.json');
 const out=structuredClone(original);
 const sourceClone=read('team-current-data/desert-hills.json');
 const before=JSON.stringify(sourceClone);
 const result=applyVerified(out,evidence);
 assert.equal(result.passingYards,1904);
 assert.equal(result.completions,'144-276');
 assert.equal(result.passingTD,17);
 assert.equal(result.interceptions,16);
 const school=Object.entries(out.teams).find(([name])=>norm(name)==='DESERTHILLS')[1];
 const row=school.stats.find(s=>s.category==='Passing').rows.find(r=>r.playerId===evidence.playerId);
 for(const [k,v] of Object.entries(evidence.totals))assert.equal(String(row.values[k]),String(v));
 assert.equal(applyVerified(out,evidence).created,false,'Idempotent reviewed values');
 assert.equal(JSON.stringify(sourceClone),before,'No source shard mutation');
 assert.equal(JSON.stringify(original),JSON.stringify(read('regular-season-publication-2026.json')),'Published source file unchanged');
 const page=fs.readFileSync('stat-leaders.html','utf8');
 assert.match(page,/RUSReviewedPassingBatch2026\.applyVerified\(regularPublication,await ev\.json\(\)\)/);
 assert.match(page,/audits\/2026-regular-season\/4a-6a-passing-batch-1-evidence\.json/);
});
test('held Kearns and Westlake source gaps cannot gain verified regular-season totals from this batch',()=>{
 assert.equal(evidence.holds.length,2);
 assert.deepEqual(evidence.holds.map(x=>x.team).sort(),['KEARNS','WESTLAKE']);
 for(const x of evidence.holds)assert.ok(x.playerGames<x.schoolGames);
 const old=read('regular-season-publication-2026.json'),out=structuredClone(old);
 applyVerified(out,evidence);
 const snapshot=(file,team,id,cat)=>Object.entries(file.teams).find(([name])=>norm(name)===norm(team))?.[1]?.stats?.filter(s=>norm(s.category)===norm(cat)).flatMap(s=>s.rows||[]).find(r=>r.playerId===id)?.values;
 for(const x of evidence.holds)assert.deepEqual(snapshot(out,x.team,x.playerId,x.category),snapshot(old,x.team,x.playerId,x.category));
});
test('tampered game evidence, wrong roster or conflicting verified values fail closed without mutation',()=>{
 for(const corrupt of [
  e=>{e.sourceGames[0].yards+=1},
  e=>{e.sourceGames.push(structuredClone(e.sourceGames[0]))},
  e=>{e.sourceGames[0].sourceUrl='https://unapproved.example.test'},
 ]){
  const e=structuredClone(evidence),p=read('regular-season-publication-2026.json'),original=JSON.stringify(p);corrupt(e);
  assert.throws(()=>applyVerified(p,e));
  assert.equal(JSON.stringify(p),original);
 }
 const out=read('regular-season-publication-2026.json');
 const school=Object.entries(out.teams).find(([name])=>norm(name)==='DESERTHILLS')[1];
 school.roster.find(p=>p.playerId===evidence.playerId).number='99';
 const before=JSON.stringify(out);assert.throws(()=>applyVerified(out,evidence),/roster identity/);
 assert.equal(JSON.stringify(out),before);
});
