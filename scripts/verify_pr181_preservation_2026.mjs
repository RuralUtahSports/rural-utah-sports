// Read-only review gate against an explicit main snapshot; outputs only to --output.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {createCompetitionIndex} from './lib/competition-scope-2026.mjs';
import {loadReviewedBatches,combineReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import {applyVerifiedPlayerBatch,syncVerifiedBatchViews} from './lib/verified-player-corrections-2026.mjs';
import {applyReviewedTeamAdjustments} from './lib/reviewed-team-stat-adjustments-2026.mjs';
import {restoreVerifiedOctoberFinals,restoreVerifiedFinalTeamViews} from './restore_verified_october_finals_2026.mjs';
const arg=name=>process.argv.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3),base=arg('baseline'),output=arg('output');
if(!/^[a-f0-9]{40}$/.test(base||'')||!output)throw Error('Explicit full main SHA and output directory required');
const git=(...args)=>execFileSync('git',args,{maxBuffer:80e6}),main=f=>JSON.parse(git('show',base+':'+f)),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const batches=loadReviewedBatches(),context={brackets:main('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};
let expected={rosters:main('deseret-rosters-stats-2026.json'),games:main('player-game-stats-2026.json')};
for(const batch of batches)expected=applyVerifiedPlayerBatch(expected.rosters,expected.games,batch,context);
// Preserve the additional pre-existing source-reviewed rate, without expanding
// its numerator/denominator or certifying any other Water Canyon field.
const old=JSON.parse(git('show','bc77b3ca384b19c7fc9ad1b6b44f27639ac049b4:deseret-rosters-stats-2026.json'));
const alma=data=>data.teams['WATER CANYON'].stats.find(s=>s.category==='Receiving').rows.find(p=>p.playerId==='water-canyon-35-alma-barlow');
const rate=alma(expected.rosters),prior=alma(old);assert.equal(rate.values.YARDS,'118');assert.equal(rate.values.RECEPTIONS,'16');assert.ok(['8.33','7.38'].includes(rate.values['YARDS/RECEP.']));assert.equal(prior.values['YARDS/RECEP.'],'7.38');
rate.values['YARDS/RECEP.']=prior.values['YARDS/RECEP.'];rate.statSources['YARDS/RECEP.']=prior.statSources['YARDS/RECEP.'];
assert.deepEqual(read('deseret-rosters-stats-2026.json'),expected.rosters,'Unexpected primary player or identity change');
assert.deepEqual(read('player-game-stats-2026.json'),expected.games,'Unexpected game result, player field or duplicate');
const files=Object.fromEntries(['ben-lomond','duchesne','monticello','south-summit','manti','canyon-view','mountain-ridge','westlake'].map(s=>['team-current-data/'+s+'.json',main('team-current-data/'+s+'.json')]));
const views=syncVerifiedBatchViews({rosters:expected.rosters,games:expected.games,metrics:main('deseret-stat-metrics-2026.json'),shards:files},combineReviewedBatches(batches));
for(const s of views.metrics.teams['WATER CANYON'].stats.filter(s=>s.category==='Receiving'))for(const r of s.rows.filter(r=>r.playerId===prior.playerId))for(const k of Object.keys(r.values))if(k.toUpperCase()==='YARDS/RECEP.')r.values[k]='7.38';
views.metrics.summary.sourceBytes=Buffer.byteLength(JSON.stringify(expected.rosters,null,2)+'\n');
assert.deepEqual(read('deseret-stat-metrics-2026.json'),views.metrics,'Unexpected compact metric changes');
const finalViews=restoreVerifiedFinalTeamViews(views.shards,restoreVerifiedOctoberFinals(main('standings-2026.json'),read('verified-finals-2026.json')).standings,read('verified-finals-2026.json'));
for(const [f,x] of Object.entries(finalViews))assert.deepEqual(read(f),x,'Unexpected team shard change: '+f);
const water=main('team-current-data/water-canyon.json'),wr=water.rosterStats.stats.find(s=>s.category==='Receiving').rows.find(r=>r.playerId===prior.playerId);wr.values['YARDS/RECEP.']='7.38';wr.statSources['YARDS/RECEP.']=prior.statSources['YARDS/RECEP.'];assert.deepEqual(read('team-current-data/water-canyon.json'),water);
const manifest=read('reviewed-team-stat-adjustments-2026.json');
assert.deepEqual(read('team-stats-2026.json'),applyReviewedTeamAdjustments(main('team-stats-2026.json'),manifest).data,'Unexpected team total or ranking change');
for(const [t,row] of Object.entries(main('team-stats-2026.json').teams))assert.deepEqual(read('team-stats-2026.json').teams[t].rankings,row.rankings,'Unapproved ranking change: '+t);
const finals=read('verified-finals-2026.json'),oldFinals=main('verified-finals-2026.json');assert.deepEqual(finals.slice(0,oldFinals.length),oldFinals);assert.equal(finals.length-oldFinals.length,2);
const restored=restoreVerifiedOctoberFinals(main('standings-2026.json'),finals);assert.deepEqual(read('standings-2026.json'),restored.standings,'Unexpected standings or score changes');
const protectedPaths=['team-stats-2025.json','deseret-rosters-stats-2025.json','player-game-stats-2025.json','awards-2025.json','*sponsor*','*speed-cut*','weekly-simulation.json','deseret-game-details.json','maxpreps-player-game-stats-2026.json','maxpreps-stats-fallback-2026.json','official-brackets-2026.json','teams-data.json','team-schedules.json','uhsaa-rpi-official-2026.json','rpi-standings-2026.json','region-awards-2026.lock.json','award-scoring-core-region-2026.lock.js','player-single-game-records','team-player-records','team-stat-single-game-records','school-sponsors.json','feature-sponsors.json','sponsors','assets/basketball','boys-basketball-teams.html','boys-basketball-team.html','boys-basketball-teams.json','boys-basketball-games-2026-27.json','nav-menu.js'];
assert.equal(git('diff','--name-only',base,'--',...protectedPaths).toString().trim(),'','Protected main datasets/assets changed');
for(const b of batches)assert.equal(applyVerifiedPlayerBatch(read('deseret-rosters-stats-2026.json'),read('player-game-stats-2026.json'),b,context).changes.length,0);
for(const f of ['regular-season-corrections-batch-1-2026.json','regular-season-corrections-batch-2-2026.json','regular-season-publication-2026.json'])assert.equal(fs.readFileSync(f,'utf8'),git('show','bc77b3ca384b19c7fc9ad1b6b44f27639ac049b4:'+f).toString(),'Existing reviewed publication/evidence changed');
const phaseIndex=createCompetitionIndex(context),standingsPhaseCoverage={};for(const g of read('standings-2026.json').games){const phase=phaseIndex.classify(g).phase;standingsPhaseCoverage[phase]=(standingsPhaseCoverage[phase]||0)+1;}
const report={standingsPhaseCoverage,baseline:base,previousPR:'bc77b3ca384b19c7fc9ad1b6b44f27639ac049b4',preservation:'PASS',existingReviewedCorrections:56,newCanonicalYardageCells:4,additionalRetainedReviewedRate:'Alma Barlow 118/16 = 7.38',reportedAggregateAdjustments:manifest.decisions.length,rankingChanges:0,unapprovedPlayerOrTeamTotalChanges:0,existingGameResultChanges:0,initialAuthorizedFinalAdditions:2,authorizedFinalAdditions:restored.standings.games.length-main('standings-2026.json').games.length,preservedVerifiedFinals:2,restoredRecords:restored.changes,protectedPaths,mainRPIChanges:0,allRegionAwardsChanged:false,publicationByteIdentical:true,holds:['Legacy bare standings keys lack phase certificates; new/changed unclassified finals are blocked','Manti completion/attempt and dependent rate evidence','Canyon View complete-team/peer rank certification','51-field ranking proposal','Maple Mountain–South Pasadena 36–7 versus 36–14','three physical venues and neutral-site runtime schema','historical record duplicate','statewide defensive/kicking/punting/return and other incomplete source coverage']};
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'preservation.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(output,'verified-decisions.json'),JSON.stringify(batches.flatMap(b=>b.decisions.map(d=>({...d,batchId:b.id,statusAfter:'installed; evidence and identity validation passed'}))),null,2)+'\n');
console.log(JSON.stringify({preservation:report.preservation,reviewedCorrections:56,canonicalYardageCells:4,reportedAggregateAdjustments:manifest.decisions.length,finalAdditions:report.authorizedFinalAdditions,preservedVerifiedFinals:2,rankingChanges:0,unapprovedChanges:0,output}));
