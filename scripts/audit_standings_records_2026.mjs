import fs from 'node:fs';
import assert from 'node:assert/strict';
import {canonicalTeam,reconcileFinalGames} from './reconcile-final-games.mjs';
const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const corrections=JSON.parse(fs.readFileSync('verified-finals-2026.json','utf8'));
const rows=Object.values(standings.byClassification||{}).flat();
assert.equal(rows.length,teams.length,'Every team must have one standings row');
assert.equal(new Set(rows.map(r=>canonicalTeam(r.team))).size,teams.length,'Duplicate standings team');
const corrected=reconcileFinalGames(standings.games,{corrections});
assert.equal(corrected.length,standings.games.length,'Duplicate or invalid final');
for(let i=0;i<corrected.length;i++)for(const field of ['actualAway','actualHome'])assert.equal(corrected[i][field],standings.games[i][field],'Verified correction missing');
const expected=new Map(teams.map(t=>[canonicalTeam(t.team),{wins:0,losses:0,ties:0,pointsFor:0,pointsAgainst:0}]));
for(const g of standings.games){
  for(const [team,pf,pa] of [[g.awayTeam,g.actualAway,g.actualHome],[g.homeTeam,g.actualHome,g.actualAway]]){
    const r=expected.get(canonicalTeam(team));if(!r)continue;
    r.pointsFor+=pf;r.pointsAgainst+=pa;r[pf>pa?'wins':pf<pa?'losses':'ties']++;
  }
}
for(const row of rows){
  const e=expected.get(canonicalTeam(row.team));assert.ok(e,row.team);
  for(const field of Object.keys(e))assert.equal(row[field],e[field],row.team+' '+field);
}
assert.equal(standings.summary.completedGames,standings.games.length);
console.log('PASS: '+rows.length+' team records and points totals match '+standings.games.length+' unique reconciled finals.');
