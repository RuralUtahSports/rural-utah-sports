import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex,gameKey,sha256} from '../scripts/lib/competition-scope-2026.mjs';
import {mergeMaxPrepsGameLogs} from '../scripts/merge_maxpreps_game_logs.mjs';
import {retainReportedGameCells} from '../scripts/lib/regular-season-import-2026.mjs';
import {reconcileSeasonStats} from '../scripts/reconcile_season_stats_from_game_logs.mjs';
import {loadReviewedBatches} from '../scripts/lib/reviewed-batches-2026.mjs';
import {applyVerifiedPlayerBatch} from '../scripts/lib/verified-player-corrections-2026.mjs';
const policy=createRequire(import.meta.url)('../regular-season-stat-policy-2026.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const plan=read('audits/2026-regular-season/game-identity-handoff/reviewed-changes.json');
const review=read('competition-scope-review-2026.json');
const context={review,brackets:read('official-brackets-2026.json')};
const index=createCompetitionIndex(context),publication=read('regular-season-publication-2026.json');
const caches=Object.fromEntries(['player-game-stats-2026.json','maxpreps-player-game-stats-2026.json'].map(f=>[f,read(f)]));
const raw=e=>caches[e.file].teams[e.team].games.find(g=>g.date===e.date&&g.opponent===e.opponent);

test('the exact 44 original source entries resolve to 31 existing regular-season contests',()=>{
 assert.equal(plan.entries.length,44);assert.equal(plan.games.length,31);assert.equal(review.games.length,653);
 const keys=new Set();
 for(const e of plan.entries){
  const game=raw(e);assert.ok(game,`entry ${e.entry}`);assert.equal(game.url,e.url);
  const expected=plan.games.find(g=>g.game===e.game).canonicalKey;
  assert.equal(index.classify(game,e.team).phase,'regular-season');assert.equal(index.resolveKey(game,e.team),expected);
  assert.equal(policy.resolveGameKey(game,e.team,publication),expected);assert.equal(policy.phase(game,e.team,publication),'regular-season');keys.add(expected);
 }
 assert.equal(keys.size,31);
 assert.equal(new Set(review.games.map(g=>g.identityReview?.canonicalKey||gameKey(g))).size,653);
});
test('only 16 approved directions reverse; 13 remain correct and two neutral encodings stay held',()=>{
 assert.equal(plan.games.filter(g=>g.directionStatus==='reverse').length,16);
 assert.equal(plan.games.filter(g=>g.directionStatus==='confirmed-unchanged').length,13);
 for(const r of plan.games){
  const after=review.games[r.scopeIndex];assert.deepEqual(after,r.after);
  assert.equal(after.phase,r.before.phase);assert.equal(after.date,r.before.date);
  assert.equal(after.awayTeam,r.directionStatus==='reverse'?r.before.homeTeam:r.before.awayTeam);
  assert.equal(after.homeTeam,r.directionStatus==='reverse'?r.before.awayTeam:r.before.homeTeam);
 }
 for(const id of ['G06','G08']){const g=plan.games.find(g=>g.game===id).after;assert.equal(g.identityReview.venueReview.status,'held-schema');assert.ok(!g.venue_type);assert.ok(!g.identityReview.physicalVenue);}
 for(const id of ['G10','G21','G24']){const r=plan.games.find(g=>g.game===id).after.identityReview;assert.equal(r.venueReview.status,'held-evidence');assert.ok(!r.physicalVenue);}
 for(const id of ['G11','G12'])assert.equal(plan.games.find(g=>g.game===id).after.identityReview.physicalVenue.name,'West High School');
});
test('state-disambiguated identities never conflate the two Libertys or Wyoming/Utah Mountain View',()=>{
 const nv=plan.entries.find(e=>e.game==='G25'),az=plan.entries.find(e=>e.game==='G26');
 assert.notEqual(index.resolveKey(raw(nv),nv.team),index.resolveKey(raw(az),az.team));
 assert.equal(index.classify({...raw(nv),opponent:'LIBERTY, AZ'},nv.team).phase,'unknown');
 const rich=plan.entries.find(e=>e.game==='G18');assert.equal(index.classify({...raw(rich),opponent:'MOUNTAIN VIEW',url:'',maxprepsUrl:''},rich.team).phase,'unknown');
});
for(const id of ['G30','G31']){
 test(`${id}: either source date binds one resumed contest; wrong or absent source ID cannot authorize it`,()=>{
  const e=plan.entries.find(e=>e.game===id),game=raw(e),copy={...game,date:'2026-09-18'};
  assert.equal(index.resolveKey(game,e.team),index.resolveKey(copy,e.team));
  const r=review.games.find(g=>g.identityReview?.handoffGame===id).identityReview;
  assert.equal(r.startDate,'2026-09-18');assert.equal(r.completionDate,'2026-09-19');
  for(const bad of [{...game,url:'',maxprepsUrl:''},{...game,url:game.url.replace(/\d+$/,'999999'),maxprepsUrl:''},{...game,date:'2026-09-20'}])assert.equal(index.classify(bad,e.team).phase,'unknown');
 });
 test(`${id}: repeated Friday/Saturday views contribute player statistics exactly once`,()=>{
  const e=plan.entries.find(e=>e.game===id),game=raw(e),friday={...structuredClone(game),date:'2026-09-18'};
  const before=JSON.stringify(game),view=policy.regularGames([game,friday,structuredClone(game)],e.team,publication);
  assert.equal(view.length,1);assert.deepEqual(view[0].players,policy.regularGames([game],e.team,publication)[0].players);
  const unique=index.uniqueGames([game,friday],e.team);assert.equal(unique.length,1);assert.deepEqual(unique[0].game.players,game.players);
  const conflicts=structuredClone(friday);conflicts.players[0].statLines[0].values.Yards='999999';
  assert.equal(policy.regularGames([game,conflicts],e.team,publication).length,0);
  const rosters={teams:{[e.team]:{stats:[]}}};
  const one=reconcileSeasonStats(structuredClone(rosters),{teams:{[e.team]:{games:[game]}}},context);
  const twice=reconcileSeasonStats(structuredClone(rosters),{teams:{[e.team]:{games:[game,friday]}}},context);
  assert.equal(one.candidatePlayers,twice.candidatePlayers);assert.equal(one.candidatePlayers>0,true);
  assert.equal(JSON.stringify(game),before);
 });
 test(`${id}: importer matches an approved resumed date without creating another game or changing totals`,()=>{
  const e=plan.entries.find(e=>e.game===id),game=structuredClone(raw(e));
  const p=game.players.find(p=>p.statLines?.some(l=>Object.keys(l.values||{}).length));assert.ok(p);
  const incoming={...structuredClone(p),date:'2026-09-18',opponent:game.opponent,url:game.maxprepsUrl||game.url};
  const target={teams:{[e.team]:{games:[game]}}},before=JSON.stringify(target);
  const result=mergeMaxPrepsGameLogs(target,{teams:{[e.team]:{games:[incoming,structuredClone(incoming)]}}},null,null,[],{competitionIndex:index});
  assert.equal(result.gamesAdded,0);assert.equal(result.gamesMatched,1);assert.equal(target.teams[e.team].games.length,1);assert.equal(JSON.stringify(target),before);
  const duplicate=structuredClone(game);duplicate.date='2026-09-18';
  assert.throws(()=>retainReportedGameCells(target,{teams:{[e.team]:{games:[game,duplicate]}}},{competitionIndex:index}),/Duplicate imported game/);
  const friday={teams:{[e.team]:{games:[duplicate]}}};assert.deepEqual(retainReportedGameCells(target,friday,{competitionIndex:index}),target);
 });
 test(`${id}: a rebuilt row with a wrong source cannot create a second resumed contest`,()=>{
  const e=plan.entries.find(e=>e.game===id),game=structuredClone(raw(e));
  const target={teams:{[e.team]:{games:[game]}}},bad=structuredClone(target);
  bad.teams[e.team].games[0].url='https://sports.deseret.com/high-school/football/game/2026-09-18/test/999999';delete bad.teams[e.team].games[0].maxprepsUrl;
  assert.throws(()=>retainReportedGameCells(target,bad,{competitionIndex:index}),/Unverified source identity/);
  const p=game.players[0],incoming={...p,date:'2026-09-18',opponent:game.opponent,url:game.url};
  const result=mergeMaxPrepsGameLogs(bad,{teams:{[e.team]:{games:[incoming]}}},null,null,[],{competitionIndex:index});
  assert.equal(result.gamesAdded,0);assert.equal(result.conflictingSubmissions,1);assert.equal(bad.teams[e.team].games.length,1);
 });
}
test('all 56 existing reviewed corrections remain installed with zero reapplied changes',()=>{
 const roster=read('deseret-rosters-stats-2026.json'),games=caches['player-game-stats-2026.json'];
 const batches=loadReviewedBatches();assert.equal(batches.reduce((n,b)=>n+b.decisions.length,0),56);
 for(const batch of batches)assert.equal(applyVerifiedPlayerBatch(roster,games,batch,context).changes.length,0);
 assert.equal(sha256(fs.readFileSync('audits/2026-regular-season/game-identity-handoff/MUSE-HANDOFF.md')),plan.handoffSha256);
});
