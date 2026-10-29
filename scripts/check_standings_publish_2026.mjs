import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {isDeepStrictEqual} from 'node:util';
import {assertPublishSnapshot} from './check_stat_publish_2026.mjs';
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:60e6});if(r.status)throw Error(r.stderr);return r.stdout.trim();};
const base=process.env.STAT_SOURCE_COMMIT;
assertPublishSnapshot({base,head:git(['rev-parse','HEAD']),remote:git(['rev-parse','origin/main'])});
const protectedFiles=['deseret-rosters-stats-2026.json','player-game-stats-2026.json','deseret-stat-metrics-2026.json','team-stats-2026.json','regular-season-publication-2026.json','regular-season-correction-batches-2026.json','regular-season-corrections-batch-*-2026.json','reviewed-team-stat-adjustments-2026.json','verified-finals-2026.json','competition-scope-review-2026.json','region-awards-2026.lock.json','school-sponsors.json','feature-sponsors.json','sponsors','teams-data.json','player-single-game-records','team-player-records'];
if(spawnSync('git',['diff','--quiet',base,'--',...protectedFiles]).status!==0)throw Error('Standings publisher changed protected statistics or evidence');
for(const f of git(['diff','--name-only',base,'--','team-current-data']).split('\n').filter(Boolean)){
 const old=JSON.parse(git(['show',base+':'+f])),next=JSON.parse(fs.readFileSync(f,'utf8'));
 for(const section of ['rosterStats','gameStats'])if(!isDeepStrictEqual(old[section],next[section]))throw Error('Standings rebuild changed protected team shard '+f+'.'+section);
}
console.log('Current source snapshot and team-shard player statistics preserved; standings-only publication permitted.');
