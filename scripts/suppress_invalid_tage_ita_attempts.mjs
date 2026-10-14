import fs from 'node:fs';

// Verified source-data exclusion: Tage Ita (Woods Cross) is incorrectly credited
// with 12-of-87 passing vs Olympus on Oct 8, 2026. The game has 87 passing
// YARDS; do not remove those yards or invent a correct attempts figure.
// Keep this correction in the generation pipelines so future imports do not
// recreate an unsupported 87-attempt state record.
const PLAYER='TAGEITA', TEAM='WOODSCROSS', OPPONENT='OLYMPUS', DATE='2026-10-08';
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const correctSeasonAttempts=new Set(['67199','55112']);
const badRow=e=>norm(e?.player)==='TAGEITA'&&norm(e?.team)==='WOODSCROSS'
  &&e?.date===DATE&&norm(e?.opponent)==='OLYMPUS'&&Number(e?.value)===87;
const isPassing=line=>norm(line?.category)==='PASSING';
const isIta=p=>norm(p?.name)==='TAGEITA'||norm(p?.playerId)==='WOODSCROSS14TAGEITA';
const isOlympus=g=>String(g?.date).slice(0,10)===DATE&&norm(g?.opponent)==='OLYMPUS';
function delKeys(obj, names){
  if(!obj || typeof obj!=='object')return 0;
  let changed=0;for(const name of Object.keys(obj)){
    if(names.includes(norm(name))){delete obj[name];changed++}
  }return changed;
}
function fixPlayer(player){
  if(!isIta(player))return 0;
  let n=0;
  for(const line of player.statLines||[])if(isPassing(line)){
    const value=Object.entries(line.values||{}).find(([k])=>norm(k)==='COMPATT')?.[1];
    if(!/^\s*12\s*[-/]\s*87\s*$/.test(String(value||'')))continue;
    n+=delKeys(line.values,['COMPATT','COMP']);
    n+=delKeys(line.values,['COMP%','COMPPERCENT','COMPLETIONPERCENTAGE']);
    delKeys(line.statSources,['COMPATT','COMP','COMP%','COMPPERCENT','COMPLETIONPERCENTAGE']);
  }
  return n;
}
function fixGameDataset(doc){
  let changed=0;
  for(const [teamName,team] of Object.entries(doc?.teams||{})){
    if(norm(teamName)!==TEAM&&norm(team?.team)!==TEAM)continue;
    for(const game of team.games||[]){
      if(!isOlympus(game))continue;
      for(const player of game.players||[])changed+=fixPlayer(player);
      if(isIta(game))changed+=fixPlayer({name:game.name,playerId:game.playerId,statLines:game.statLines});
    }
  }
  return changed;
}
function fixSeasonStats(sections){
  let n=0;
  for(const section of sections||[])if(isPassing(section))
    for(const row of section.rows||[])if(isIta(row)){
      const val=Object.entries(row.values||{}).find(([k])=>norm(k)==='COMPATT')?.[1];
      if(!correctSeasonAttempts.has(norm(val)))continue;
      n+=delKeys(row.values,['COMPATT','COMP%','COMPPERCENT']);
      delKeys(row.statSources,['COMPATT','COMP%','COMPPERCENT']);
    }
  return n;
}
function fixRosterDoc(doc){
  let n=0;
  for(const [key,t] of Object.entries(doc?.teams||{}))
    if(norm(key)===TEAM||norm(t?.team)===TEAM)n+=fixSeasonStats(t?.stats);
  return n;
}
function fixFallbackDoc(doc){
  let n=0;
  for(const [key,t] of Object.entries(doc?.teams||{}))
    if(norm(key)===TEAM||norm(t?.team)===TEAM)
      for(const row of t?.rows||[])if(isPassing(row)&&isIta(row)){
        const val=Object.entries(row.values||{}).find(([k])=>norm(k)==='COMPATT')?.[1];
        if(correctSeasonAttempts.has(norm(val)))n+=delKeys(row.values,['COMPATT','COMP%']);
      }
  return n;
}
function fixRecordsDoc(doc){
  let n=0;
  for(const cat of doc?.categories||[]){
    if(cat.key!=='passAttempts')continue;
    const before=cat.entries||[];
    const next=before.filter(e=>!badRow(e));
    if(next.length===before.length)continue;
    n+=before.length-next.length;
    // Preserve the record table's competition ranking with ties.
    let priorValue=null,rank=0;
    next.forEach((entry,index)=>{
      const value=Number(entry.value);
      if(priorValue!==value){rank=index+1;priorValue=value}
      entry.rank=rank;
    });
    cat.entries=next;
  }
  return n;
}
function fixAlertsDoc(doc){
  const before=doc.alerts||[];
  doc.alerts=before.filter(e=>!(e.recordType==='player'&&e.categoryKey==='passAttempts'&&badRow(e)));
  return before.length-doc.alerts.length;
}
function fixShard(doc){
  let n=0;
  n+=fixSeasonStats(doc.rosterStats?.stats);
  const sub={teams:{'WOODS CROSS':doc.gameStats||{games:[]}}};
  n+=fixGameDataset(sub);
  return n;
}
export function suppressInvalidItaStatInMemory(gameData){return fixGameDataset(gameData)}
const mods=process.argv.slice(2);
const only=(s)=>mods.length===0||mods.includes('--all')||mods.includes(s);
function updateFile(file,func){
  if(!fs.existsSync(file))return 0;
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const removed=func(data);
  if(removed>0){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log('CORRECTED',file,'invalid values removed:',removed)}
  return removed;
}
function main(){
  let fixed=0;
  if(only('--games-only')){
    fixed+=updateFile('maxpreps-player-game-stats-2026.json',fixGameDataset);
    fixed+=updateFile('player-game-stats-2026.json',fixGameDataset);
    fixed+=updateFile('deseret-rosters-stats-2026.json',fixRosterDoc);
    fixed+=updateFile('maxpreps-stats-fallback-2026.json',fixFallbackDoc);
  }
  if(only('--shards-only'))fixed+=updateFile('team-current-data/woods-cross.json',fixShard);
  if(only('--records-only')){
    fixed+=updateFile('player-single-game-records/2026.json',fixRecordsDoc);
    fixed+=updateFile('player-single-game-records/statewide.json',fixRecordsDoc);
    fixed+=updateFile('player-single-game-records/by-team/woods-cross.json',fixRecordsDoc);
  }
  if(only('--alerts-only'))fixed+=updateFile('record-alerts.json',fixAlertsDoc);
  console.log('Tage Ita vs Olympus invalid 87-attempt stat removed:',fixed,'fields/rows');
}
const direct=process.argv[1]?.replaceAll('\\','/').endsWith('/suppress_invalid_tage_ita_attempts.mjs');
if(direct)main();
