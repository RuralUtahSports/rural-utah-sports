import fs from 'node:fs';
import {loadReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import {applyVerifiedPlayerBatch} from './lib/verified-player-corrections-2026.mjs';
import {applyReviewedTeamAdjustments} from './lib/reviewed-team-stat-adjustments-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const roster=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json'),context={brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')};
for(const batch of loadReviewedBatches())if(applyVerifiedPlayerBatch(roster,games,batch,context).changes.length)throw Error('Apply reviewed player corrections before team adjustments');
const result=applyReviewedTeamAdjustments(read('team-stats-2026.json'),read('reviewed-team-stat-adjustments-2026.json'));
if(process.argv.includes('--check')){if(result.changes.length)throw Error('Reviewed team-stat adjustments are missing');}
else if(result.changes.length){fs.writeFileSync('team-stats-2026.json.verified-batch-tmp',JSON.stringify(result.data,null,2)+'\n');fs.renameSync('team-stats-2026.json.verified-batch-tmp','team-stats-2026.json');}
console.log(`Validated ${result.changes.length} pending reviewed aggregate adjustments; all unreviewed fields and rankings retained.`);
