// Remove only exact same-game/player/stat duplicates in cached record lists.
// Conflicting values are left untouched and fail loudly for manual review.
import fs from 'node:fs';
import path from 'node:path';

const ROOT='player-single-game-records';
const BY_TEAM=path.join(ROOT,'by-team');
const keyOf=e=>[String(e.gameId||''),String(e.team||'').toUpperCase(),String(e.player||'').toUpperCase()].join('|');
function preferred(a,b){
  const urlDate=String(a.gameUrl||b.gameUrl||'').match(/\/game\/(\d{4}-\d{2}-\d{2})\//)?.[1];
  const aMatch=Boolean(urlDate&&a.date===urlDate),bMatch=Boolean(urlDate&&b.date===urlDate);
  if(aMatch!==bMatch)return aMatch?a:b;
  const aDetail=[a.gameUrl,a.source,a.opponent,a.teamScore,a.opponentScore].filter(v=>v!==null&&v!==undefined&&v!=='').length;
  const bDetail=[b.gameUrl,b.source,b.opponent,b.teamScore,b.opponentScore].filter(v=>v!==null&&v!==undefined&&v!=='').length;
  return bDetail>aDetail?b:a;
}
export function dedupe(entries,category){
  const map=new Map(),order=[];
  let removed=0;
  for(const e of entries){
    const key=keyOf(e);
    if(!map.has(key)){map.set(key,e);order.push(key);continue}
    const original=map.get(key);
    if(Number(original.value)!==Number(e.value))throw new Error(`${category}: conflicting values for ${key}: ${original.value} vs ${e.value}`);
    map.set(key,preferred(original,e));
    removed++;
  }
  if(!removed)return{entries,removed:0};
  const out=order.map(key=>map.get(key)).sort((a,b)=>Number(b.value)-Number(a.value)||String(a.date||'').localeCompare(String(b.date||''))||String(a.player||'').localeCompare(String(b.player||'')));
  let lastValue=null,lastRank=0;
  for(let i=0;i<out.length;i++){
    const value=Number(out[i].value);
    if(value!==lastValue){lastRank=i+1;lastValue=value}
    out[i].rank=lastRank;
  }
  return{entries:out,removed};
}
if(process.argv.includes('--self-test')){
  const original={rank:1,team:'HERRIMAN',player:'Filisi Filipe',gameId:'273541',date:'2026-09-19',value:4,gameUrl:'https://sports.deseret.com/high-school/football/game/2026-09-18/herriman-vs-westlake/273541'};
  const fixed={...original,date:'2026-09-18'};
  const r=dedupe([original,fixed],'rushingTouchdowns');
  if(r.removed!==1||r.entries.length!==1||r.entries[0].date!=='2026-09-18'||r.entries[0].rank!==1)throw Error('Dedupe regression failure');
  let rejected=false;try{dedupe([original,{...fixed,value:5}],'rushingTouchdowns')}catch{rejected=true}
  if(!rejected)throw Error('Conflicting stats must not silently merge');
  console.log('Player record duplicate-normalization tests passed.');
}else{
  const files=[path.join(ROOT,'statewide.json')];
  if(fs.existsSync(path.join(ROOT,'2026.json')))files.push(path.join(ROOT,'2026.json'));
  if(fs.existsSync(BY_TEAM))files.push(...fs.readdirSync(BY_TEAM).filter(f=>f.endsWith('.json')).map(f=>path.join(BY_TEAM,f)));
  const changed=[];let removedTotal=0;
  for(const file of files){
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    let removed=0;
    for(const category of data.categories||[]){
      const r=dedupe(category.entries||[],category.key);
      if(r.removed){category.entries=r.entries;removed+=r.removed}
    }
    if(removed){removedTotal+=removed;changed.push({file,removed,content:JSON.stringify(data,null,2)+'\n'})}
  }
  for(const {file,content} of changed)fs.writeFileSync(file,content);
  console.log(`Checked ${files.length} record files: removed ${removedTotal} exact duplicate entries in ${changed.length} files. Conflicting values require manual review.`);
}
