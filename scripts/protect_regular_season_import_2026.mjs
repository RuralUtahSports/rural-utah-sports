import {loadReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import fs from 'node:fs';
import {retainSeasonStatistics,retainVerifiedGameCells} from './lib/regular-season-import-2026.mjs';
import {applyVerifiedPlayerBatch} from './lib/verified-player-corrections-2026.mjs';
const baseline=process.argv.find(x=>x.startsWith('--baseline='))?.slice(11);
if(!baseline)throw Error('A pre-import baseline is required; never use the imported output as its own baseline');
const gamesBaseline=process.argv.find(x=>x.startsWith('--games-baseline='))?.slice(17);
if(!gamesBaseline)throw Error('A pre-import game baseline is required');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const file='deseret-rosters-stats-2026.json',gamesFile='player-game-stats-2026.json';
const incoming=read(file),candidate=process.argv.find(x=>x.startsWith('--candidate-output='))?.slice(19);
if(candidate)fs.writeFileSync(candidate,JSON.stringify(incoming,null,2)+'\n');
const retained=retainSeasonStatistics(read(baseline),incoming);
let result={rosters:retained.rosters,games:read(gamesFile),changes:[]};
for(const batch of loadReviewedBatches()){
 const protectedGames=retainVerifiedGameCells(read(gamesBaseline),result.games,batch);
 const next=applyVerifiedPlayerBatch(result.rosters,protectedGames,batch,{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
 result={...next,changes:[...result.changes,...next.changes]};
}
// Validate every selected cell before replacing either output. A changed
// identity or reviewed value fails the publishing job rather than guessing.
fs.writeFileSync(file,JSON.stringify(result.rosters,null,2)+'\n');
fs.writeFileSync(gamesFile,JSON.stringify(result.games,null,2)+'\n');
console.log(`Preserved published season statistics; ${retained.candidateTeams.length} imported teams need source review. Applied ${result.changes.length} reviewed cells.`);
