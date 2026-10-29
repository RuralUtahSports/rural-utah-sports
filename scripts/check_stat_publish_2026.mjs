import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {applyReviewedTeamAdjustments} from './lib/reviewed-team-stat-adjustments-2026.mjs';
import {loadReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import {buildRegularSeasonPublication} from './build_regular_season_publication_2026.mjs';
export function assertPublishSnapshot({base,head,remote,protectedChanged=false}){
 if(!/^[a-f0-9]{40}$/.test(base||'')||head!==base||remote!==base)throw Error('Publishing snapshot changed; rerun from latest main');
 if(protectedChanged)throw Error('Statistics job changed protected scores, records, awards, sponsors, brackets or school data');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const git=args=>{const r=spawnSync('git',args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||'Git verification failed');return r.stdout.trim();};
 const base=process.env.STAT_SOURCE_COMMIT,protectedPaths=['reviewed-team-stat-adjustments-2026.json','regular-season-correction-batches-2026.json','regular-season-corrections-batch-*-2026.json','weekly-simulation.json','standings-2026.json','deseret-game-details.json','official-brackets-2026.json','teams-data.json','team-schedules.json','school-sponsors.json','feature-sponsors.json','sponsors','region-awards-2026.lock.json','award-scoring-core-region-2026.lock.js','player-single-game-records','team-player-records','team-stats-2025.json','deseret-rosters-stats-2025.json','player-game-stats-2025.json'];
 assertPublishSnapshot({base,head:git(['rev-parse','HEAD']),remote:git(['rev-parse','origin/main'])});
 // Derived consumers publish only their existing declared outputs. They never
 // write the correction stores; protect them from stale snapshot retries too.
 if(process.argv.includes('--snapshot-only')){
  const stores=['deseret-rosters-stats-2026.json','player-game-stats-2026.json','deseret-stat-metrics-2026.json','team-current-data','regular-season-correction-batches-2026.json','regular-season-corrections-batch-*-2026.json','reviewed-team-stat-adjustments-2026.json','competition-scope-review-2026.json','region-awards-2026.lock.json','weekly-simulation.json','official-brackets-2026.json','school-sponsors.json','feature-sponsors.json','teams-data.json'];
  const untouched=spawnSync('git',['diff','--quiet',base,'--',...stores],{encoding:'utf8'});
  if(untouched.status!==0)throw Error('Derived publisher changed correction stores or protected source inputs');
  console.log('Current-main snapshot verified; correction stores and protected inputs unchanged.');process.exit(0);
 }
 const changed=spawnSync('git',['diff','--quiet',base||'HEAD','--',...protectedPaths],{encoding:'utf8'});
 if(changed.status!==0&&changed.status!==1)throw Error(changed.stderr);
 assertPublishSnapshot({base,head:git(['rev-parse','HEAD']),remote:git(['rev-parse','origin/main']),protectedChanged:changed.status===1});
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
 const proof=buildRegularSeasonPublication(read('deseret-rosters-stats-2026.json'),read('player-game-stats-2026.json'),loadReviewedBatches(),{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')},fs.readFileSync('region-awards-2026.lock.json','utf8'));
 if(fs.readFileSync('regular-season-publication-2026.json','utf8')!==JSON.stringify(proof)+'\n')throw Error('Reviewed publication is stale');
 const teamReview=applyReviewedTeamAdjustments(read('team-stats-2026.json'),read('reviewed-team-stat-adjustments-2026.json'));if(teamReview.changes.length)throw Error('Reviewed team statistics were overwritten');
 console.log('Publishing preflight passed: current main snapshot, all reviewed corrections intact, protected inputs unchanged. A concurrent push is still rejected by Git.');
}
