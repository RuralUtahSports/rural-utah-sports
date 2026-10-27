import fs from 'node:fs';
import {applyVerifiedPlayerBatch,syncVerifiedBatchViews} from './lib/verified-player-corrections-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const batch=read('regular-season-corrections-batch-1-2026.json');
const rosters=read('deseret-rosters-stats-2026.json'),games=read('player-game-stats-2026.json');
const result=applyVerifiedPlayerBatch(rosters,games,batch,{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')});
const shardFiles=Object.fromEntries([...new Set(batch.evidenceSets.map(e=>e.team))].map(t=>{const f='team-current-data/'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json';return [f,read(f)]}));
const views=syncVerifiedBatchViews({rosters:result.rosters,games:result.games,metrics:read('deseret-stat-metrics-2026.json'),shards:shardFiles},batch);
const full=JSON.stringify(result.rosters,null,2)+'\n';views.metrics.summary.sourceBytes=Buffer.byteLength(full);
const writes=new Map([['deseret-rosters-stats-2026.json',full],['player-game-stats-2026.json',JSON.stringify(result.games,null,2)+'\n'],['deseret-stat-metrics-2026.json',JSON.stringify(views.metrics)+'\n'],...Object.entries(views.shards).map(([f,x])=>[f,JSON.stringify(x)+'\n'])]);
// All evidence, identities and original-value preconditions pass before any file write.
if(!process.argv.includes('--check'))for(const [f,text] of writes)if(fs.readFileSync(f,'utf8')!==text){fs.writeFileSync(f+'.verified-batch-tmp',text);fs.renameSync(f+'.verified-batch-tmp',f);}
console.log(`${process.argv.includes('--check')?'Validated':'Applied'} ${result.changes.length} verified cells; source caches, scores, records, awards and sponsors are untouched.`);
