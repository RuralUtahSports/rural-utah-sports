import fs from 'node:fs';
export function loadReviewedBatches(){
 const registry=JSON.parse(fs.readFileSync('regular-season-correction-batches-2026.json','utf8'));
 if(registry.season!==2026||!registry.batches?.length||new Set(registry.batches).size!==registry.batches.length)throw Error('Invalid correction registry');
 return registry.batches.map(file=>{
  if(!/^regular-season-corrections-batch-\d+-2026\.json$/.test(file))throw Error('Invalid batch path');
  return JSON.parse(fs.readFileSync(file,'utf8'));
 });
}
export const combineReviewedBatches=batches=>({evidenceSets:batches.flatMap(b=>b.evidenceSets),decisions:batches.flatMap(b=>b.decisions)});
