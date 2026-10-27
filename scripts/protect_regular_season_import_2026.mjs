import {createCompetitionIndex} from './lib/competition-scope-2026.mjs';
import {loadReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {retainSeasonStatistics,retainVerifiedGameCells,retainReportedGameCells} from './lib/regular-season-import-2026.mjs';
import {applyVerifiedPlayerBatch} from './lib/verified-player-corrections-2026.mjs';
const baseline=process.argv.find(x=>x.startsWith('--baseline='))?.slice(11);
if(!baseline)throw Error('A pre-import baseline is required; never use the imported output as its own baseline');
const gamesBaseline=process.argv.find(x=>x.startsWith('--games-baseline='))?.slice(17);
if(!gamesBaseline)throw Error('A pre-import game baseline is required');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const file='deseret-rosters-stats-2026.json',gamesFile='player-game-stats-2026.json';
const incoming=read(file),candidate=process.argv.find(x=>x.startsWith('--candidate-output='))?.slice(19);
if([file,gamesFile].some(f=>[baseline,gamesBaseline,candidate].filter(Boolean).some(p=>path.resolve(p)===path.resolve(f)))||path.resolve(baseline)===path.resolve(gamesBaseline)||candidate&&[baseline,gamesBaseline].some(f=>path.resolve(candidate)===path.resolve(f)))throw Error('Baseline, candidate and published paths must be distinct');
if(candidate)fs.writeFileSync(candidate,JSON.stringify({season:2026,seasonCandidate:incoming,gameCandidate:read(gamesFile)},null,2)+'\n');
const retained=retainSeasonStatistics(read(baseline),incoming);
let result={rosters:retained.rosters,games:retainReportedGameCells(read(gamesBaseline),read(gamesFile),{competitionIndex:createCompetitionIndex({review:read('competition-scope-review-2026.json'),brackets:read('official-brackets-2026.json')})}),changes:[]};
const batches=loadReviewedBatches();
for(const batch of batches){
 const protectedGames=retainVerifiedGameCells(read(gamesBaseline),result.games,batch);
 const next=applyVerifiedPlayerBatch(result.rosters,protectedGames,batch,{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
 result={...next,changes:[...result.changes,...next.changes]};
}
for(const batch of batches)if(applyVerifiedPlayerBatch(result.rosters,result.games,batch,{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')}).changes.length)throw Error('Correction batch is not stable');
// Validate every selected cell before replacing either output. A changed
// identity or reviewed value fails the publishing job rather than guessing.
fs.writeFileSync(file,JSON.stringify(result.rosters,null,2)+'\n');
fs.writeFileSync(gamesFile,JSON.stringify(result.games,null,2)+'\n');
console.log(`Preserved published season statistics; ${retained.candidateTeams.length} imported teams need source review. Applied ${result.changes.length} reviewed cells.`);
