import fs from 'node:fs';
import {teamKey,gameKey} from './competition-scope-2026.mjs';
export function resolveReviewedBatches(batches){
 const active=new Map(),ids=new Set(),norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,''),category=v=>['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS'].includes(norm(v))?'DEFENSE':norm(v)==='PATSANDFIELDGOALS'?'KICKING':norm(v);
 for(const batch of batches){
  if(!batch.id||ids.has(batch.id))throw Error('Duplicate correction batch');ids.add(batch.id);
  for(const d of batch.decisions||[]){
   const key=[d.target,teamKey(d.team),d.playerId,category(d.category),norm(d.field),d.target==='game'?gameKey(d,d.team):''].join('|'),previous=active.get(key);
   if(previous){
    if(previous.batch===batch)throw Error('Duplicate correction field within batch');
    if(d.supersedes?.batchId!==previous.batch.id||d.supersedes?.decisionId!==previous.decision.id||String(d.originalValue)!==String(previous.decision.verifiedReplacement)||!Number.isFinite(Date.parse(d.reportingDate))||Date.parse(d.reportingDate)<Date.parse(previous.decision.reportingDate))throw Error('Conflicting/stale correction needs explicit reviewed supersession');
   }else if(d.supersedes)throw Error('Superseded correction not found');
   active.set(key,{batch,decision:d});
  }
 }
 const kept=new Set([...active.values()].map(x=>x.decision));
 return batches.map(batch=>{
  const decisions=batch.decisions.filter(d=>kept.has(d)),evidenceIds=new Set(decisions.map(d=>d.evidenceId));
  return {...batch,decisions,evidenceSets:batch.evidenceSets.filter(e=>evidenceIds.has(e.id))};
 }).filter(batch=>batch.decisions.length);
}
export function loadReviewedBatches(){
 const registry=JSON.parse(fs.readFileSync('regular-season-correction-batches-2026.json','utf8'));
 if(registry.season!==2026||!registry.batches?.length||new Set(registry.batches).size!==registry.batches.length)throw Error('Invalid correction registry');
 return resolveReviewedBatches(registry.batches.map(file=>{
  if(!/^regular-season-corrections-batch-\d+-2026\.json$/.test(file))throw Error('Invalid batch path');
  return JSON.parse(fs.readFileSync(file,'utf8'));
 }));
}
export const combineReviewedBatches=batches=>({evidenceSets:batches.flatMap(b=>b.evidenceSets),decisions:batches.flatMap(b=>b.decisions)});
