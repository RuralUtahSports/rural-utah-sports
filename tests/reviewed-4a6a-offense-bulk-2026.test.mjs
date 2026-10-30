import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex} from '../scripts/lib/competition-scope-2026.mjs';

const require=createRequire(import.meta.url);
const {validate,applyVerified}=require('../reviewed-4a6a-offense-bulk-2026.js');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const manifest=read('audits/2026-regular-season/4a6a-reviewed-offense-corrections-batch-1.json');
const team=read('team-current-data/desert-hills.json');
const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');

test('ten unique reviewed Desert Hills contests reconcile to minus 9 rushing yards on 30 carries',()=>{
 const d=validate(manifest),index=createCompetitionIndex({brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
 assert.equal(d.games.length,10);
 assert.equal(d.games.reduce((n,g)=>n+g.yards,0),-9);
 assert.equal(d.games.reduce((n,g)=>n+g.carries,0),30);
 for(const g of d.games){
  const sched=team.current.schedule.filter(s=>s.date===g.date&&norm(s.opponent)===norm(g.opponent)&&s.rusStatus==='Final');
  assert.equal(sched.length,1);
  assert.equal(sched[0].teamScore,g.verifiedFinalScore.team);
  assert.equal(sched[0].opponentScore,g.verifiedFinalScore.opponent);
  const game=team.gameStats.games.filter(x=>x.gameKey===g.gameKey&&x.date===g.date);
  assert.equal(game.length,1);
  assert.equal(game[0].maxprepsUrl,g.gameSourceUrl);
  const athlete=game[0].players.filter(p=>p.playerId===d.playerId&&p.name===d.name&&String(p.number)==='3');
  assert.equal(athlete.length,1);
  const rush=athlete[0].statLines.filter(l=>l.category==='Rushing');
  assert.equal(rush.length,1);
  assert.equal(Number(rush[0].values.YARDS??rush[0].values.Yards),g.yards);
  assert.equal(Number(rush[0].values.CARRIES??rush[0].values.Carries),g.carries);
  assert.equal(index.classify({date:g.date,opponent:g.opponent,url:g.gameSourceUrl},d.team).phase,'regular-season');
 }
 const stored=team.rosterStats.stats.filter(s=>s.category==='Rushing').flatMap(s=>s.rows).find(p=>p.playerId===d.playerId);
 assert.equal(stored.values.YARDS,'11');assert.equal(stored.values.CARRIES,'22');
});
test('bulk overlay modifies only correct player and two verified regular-season fields',()=>{
 const input=read('regular-season-publication-2026.json'),initial=JSON.stringify(input),p=structuredClone(input);
 const result=applyVerified(p,manifest);
 assert.deepEqual({yards:result.rushingYards,carries:result.carries,corrected:result.corrected},{yards:-9,carries:30,corrected:2});
 const desert=Object.entries(p.teams).find(([t])=>norm(t)==='DESERTHILLS')[1];
 const row=desert.stats.filter(s=>s.category==='Rushing').flatMap(s=>s.rows||[]).find(r=>r.playerId==='desert-hills-3-deacon-virgin');
 assert.equal(row.values.YARDS,'-9');assert.equal(row.values.CARRIES,'30');
 assert.equal(row.values.TD,undefined,'Cannot infer unreported TD from games');
 assert.equal(applyVerified(p,manifest).created,false,'Idempotency');
 assert.equal(JSON.stringify(input),initial);
 const page=fs.readFileSync('stat-leaders.html','utf8');
 assert.match(page,/RUSReviewed4A6AOffense2026\.applyVerified\(regularPublication,await source\.json\(\)\)/);
 assert.match(page,/sourceMode==='reported'\?reportedStats:regularPublication/);
});
test('truncated, changed, duplicated or contaminated source evidence fails without mutation',()=>{
 const mutations=[
  x=>{x.decisions[0].games.pop();},
  x=>{x.decisions[0].games[1].yards+=1;},
  x=>{x.decisions[0].games[1].gameKey=x.decisions[0].games[0].gameKey;},
  x=>{x.decisions[0].games[1].gameSourceUrl='https://untrusted.test';},
  x=>{x.decisions[0].fields.YARDS='0';},
  x=>{x.decisions[0].playerId='desert-hills-qb-deacon-virgin';}
 ];
 for(const mutate of mutations){
  const m=structuredClone(manifest),data=read('regular-season-publication-2026.json'),original=JSON.stringify(data);mutate(m);
  assert.throws(()=>applyVerified(data,m));
  assert.equal(JSON.stringify(data),original);
 }
 const data={...read('regular-season-publication-2026.json'),scope:'reported'};
 assert.throws(()=>applyVerified(data,manifest),/only verified/);
});
test('previously reviewed unexpected rushing value cannot be silently overwritten',()=>{
 const p=read('regular-season-publication-2026.json');
 applyVerified(p,manifest);
 const desert=Object.entries(p.teams).find(([t])=>norm(t)==='DESERTHILLS')[1];
 const row=desert.stats.filter(s=>s.category==='Rushing').flatMap(s=>s.rows||[]).find(r=>r.playerId==='desert-hills-3-deacon-virgin');
 row.values.YARDS='-8';
 const before=JSON.stringify(p);
 assert.throws(()=>applyVerified(p,manifest),/supersession/);
 assert.equal(JSON.stringify(p),before);
});
