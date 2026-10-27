import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const batch=read('regular-season-corrections-batch-1-2026.json'),after=read('deseret-rosters-stats-2026.json'),before=structuredClone(after);
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
for(const d of batch.decisions.filter(d=>d.target==='season')){
 const section=before.teams[d.team].stats.find(s=>norm(s.category)===norm(d.category));const row=section.rows.find(p=>p.playerId===d.playerId),key=Object.keys(row.values).find(k=>norm(k)===norm(d.field));
 if(String(row.values[key])!==d.verifiedReplacement)throw Error('Apply the verified player batch before syncing team totals');
 row.values[key]=d.originalValue;
}
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rus-verified-team-stats-'));
function build(data){
 fs.writeFileSync(path.join(directory,'deseret-rosters-stats-2026.json'),JSON.stringify(data));
 const r=spawnSync(process.execPath,[path.resolve('scripts/build_team_stats.mjs')],{cwd:directory,encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);
 return JSON.parse(fs.readFileSync(path.join(directory,'team-stats-2026.json'),'utf8'));
}
try{
 for(const f of ['teams-data.json','standings-2026.json','manual-stat-corrections-2026.json'])fs.copyFileSync(f,path.join(directory,f));
 const oldDerived=build(before),newDerived=build(after),saved=read('team-stats-2026.json'),changes=[];
 const get=(o,keys)=>keys.reduce((x,k)=>x?.[k],o);
 function compare(a,b,keys=[]){
  if(keys[0]==='generatedAt')return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],[...keys,k]);return;}
  if(a===b)return;const current=get(saved,keys);if(current!==a&&current!==b)throw Error('Unrelated/stale team-stat value needs review: '+keys.join('.'));
  if(current!==b)changes.push({keys,value:b});
 }
 compare(oldDerived,newDerived);
 for(const c of changes){const parent=get(saved,c.keys.slice(0,-1));parent[c.keys.at(-1)]=c.value;}
 if(changes.length&&!process.argv.includes('--check')){fs.writeFileSync('team-stats-2026.json.verified-batch-tmp',JSON.stringify(saved,null,2)+'\n');fs.renameSync('team-stats-2026.json.verified-batch-tmp','team-stats-2026.json');}
 console.log(`${process.argv.includes('--check')?'Validated':'Synced'} ${changes.length} team aggregate/ranking fields using the existing generator; scores and team records unchanged.`);
}finally{fs.rmSync(directory,{recursive:true,force:true});}
