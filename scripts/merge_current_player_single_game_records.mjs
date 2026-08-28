import fs from 'node:fs';
import path from 'node:path';

const CURRENT='player-game-stats-2026.json';
const MANUAL='manual-player-single-game-records-2026.json';
const ROOT='player-single-game-records';
const BY_TEAM=path.join(ROOT,'by-team');
const STATEWIDE=path.join(ROOT,'statewide.json');
const TEAM_LIMIT=15;
const STATE_LIMIT=100;

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const number=v=>{const n=Number(clean(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
const findValue=(values,...names)=>{
  const keys=Object.keys(values||{});
  for(const name of names){const hit=keys.find(k=>norm(k)===norm(name));if(hit!==undefined)return values[hit]}
  return '';
};
const gameIdFromUrl=url=>clean(url).match(/\/(\d+)\/?(?:\?|$)/)?.[1]||clean(url)||'';

function addStat(stats,key,value){
  if(!Number.isFinite(value)||value<=0)return;
  stats[key]=Math.max(stats[key]??0,value);
}

function statsFromPlayer(player){
  const out={};
  for(const line of player?.statLines||[]){
    const cat=norm(line.category),v=line.values||{};
    if(cat==='RUSHING'){
      addStat(out,'carries',number(findValue(v,'Carries')));
      addStat(out,'rushingYards',number(findValue(v,'Yards')));
      addStat(out,'rushingTouchdowns',number(findValue(v,'TD')));
    }else if(cat==='PASSING'){
      const ca=clean(findValue(v,'Comp-Att','Comp Att'));
      const m=ca.match(/(\d+)\s*[-/]\s*(\d+)/);
      if(m){addStat(out,'completions',Number(m[1]));addStat(out,'passAttempts',Number(m[2]))}
      addStat(out,'passingYards',number(findValue(v,'Yards')));
      addStat(out,'passingTouchdowns',number(findValue(v,'TD')));
    }else if(cat==='RECEIVING'){
      addStat(out,'receptions',number(findValue(v,'Receptions')));
      addStat(out,'receivingYards',number(findValue(v,'Yards')));
      addStat(out,'receivingTouchdowns',number(findValue(v,'TD')));
    }else if(cat==='DEFENSE'){
      addStat(out,'tackles',number(findValue(v,'Tackles','Tot Tackles')));
      addStat(out,'sacks',number(findValue(v,'Sacks')));
      addStat(out,'interceptions',number(findValue(v,'Pass Int.','Pass Int','Interceptions')));
      addStat(out,'defensiveTouchdowns',number(findValue(v,'TD')));
    }else if(cat==='SPECIALTEAMS'){
      addStat(out,'fieldGoals',number(findValue(v,'FG')));
      addStat(out,'extraPoints',number(findValue(v,'PAT')));
      addStat(out,'returnTouchdowns',number(findValue(v,'Return TD')));
    }
  }
  const total=(out.passingYards||0)+(out.rushingYards||0);
  if(total>0)out.totalOffenseYards=total;
  return out;
}

function currentEntries(){
  const entries=[];
  if(fs.existsSync(CURRENT)){
    const data=JSON.parse(fs.readFileSync(CURRENT,'utf8'));
    const season=Number(data.season)||2026;
    for(const [teamName,team] of Object.entries(data.teams||{})){
      for(const game of team.games||[]){
        if(!game.final)continue;
        for(const player of game.players||[]){
          const stats=statsFromPlayer(player);
          for(const [category,value] of Object.entries(stats))entries.push({
            category,
            player:clean(player.name),
            team:clean(team.team||teamName),
            season,
            date:clean(game.date),
            opponent:clean(game.opponent),
            teamScore:Number.isFinite(Number(game.teamScore))?Number(game.teamScore):null,
            opponentScore:Number.isFinite(Number(game.opponentScore))?Number(game.opponentScore):null,
            value,
            gameId:gameIdFromUrl(game.url),
            gameUrl:clean(game.url),
            source:'Deseret News synced game stats'
          });
        }
      }
    }
  }
  if(fs.existsSync(MANUAL)){
    const manual=JSON.parse(fs.readFileSync(MANUAL,'utf8'));
    for(const row of manual.entries||[])entries.push({...row,season:Number(row.season||manual.season||2026)});
  }
  return entries.filter(e=>e.category&&e.player&&e.team&&e.date&&Number(e.value)>0);
}

function recordKey(e){return `${norm(e.team)}|${norm(e.player)}|${clean(e.date)}|${clean(e.category||'')}`}
function rankEntries(entries,limit){
  const dedup=new Map();
  for(const e of entries){
    const key=recordKey(e);
    const prior=dedup.get(key);
    if(!prior||Number(e.value)>Number(prior.value)||Number(e.season)>Number(prior.season))dedup.set(key,e);
  }
  const sorted=[...dedup.values()].sort((a,b)=>Number(b.value)-Number(a.value)||Number(b.season)-Number(a.season)||clean(b.date).localeCompare(clean(a.date))||clean(a.player).localeCompare(clean(b.player)));
  const kept=sorted.slice(0,limit);
  let lastValue=null,lastRank=0;
  for(let i=0;i<kept.length;i++){
    const value=Number(kept[i].value);
    if(value!==lastValue){lastRank=i+1;lastValue=value}
    kept[i]={...kept[i],rank:lastRank};
    delete kept[i].category;
  }
  return kept;
}

function mergeCategory(data,category,incoming,limit){
  const cat=(data.categories||[]).find(c=>c.key===category);
  if(!cat||!incoming.length)return false;
  const before=JSON.stringify(cat.entries||[]);
  cat.entries=rankEntries([...(cat.entries||[]).map(e=>({...e,category})),...incoming],limit);
  return JSON.stringify(cat.entries)!==before;
}

const incoming=currentEntries();
const byTeam=new Map();
for(const e of incoming){
  const key=norm(e.team);
  if(!byTeam.has(key))byTeam.set(key,[]);
  byTeam.get(key).push(e);
}

let changedFiles=0,insertedQualifiers=0;
for(const file of fs.readdirSync(BY_TEAM).filter(f=>f.endsWith('.json'))){
  const full=path.join(BY_TEAM,file),data=JSON.parse(fs.readFileSync(full,'utf8'));
  const rows=byTeam.get(norm(data.team))||[];
  if(!rows.length)continue;
  let changed=false;
  for(const category of new Set(rows.map(r=>r.category))){
    const relevant=rows.filter(r=>r.category===category);
    const beforeCount=(data.categories||[]).find(c=>c.key===category)?.entries?.filter(e=>Number(e.season)===2026).length||0;
    if(mergeCategory(data,category,relevant,TEAM_LIMIT)){
      changed=true;
      const afterCount=(data.categories||[]).find(c=>c.key===category)?.entries?.filter(e=>Number(e.season)===2026).length||0;
      insertedQualifiers+=Math.max(0,afterCount-beforeCount);
    }
  }
  if(changed){fs.writeFileSync(full,JSON.stringify(data,null,2)+'\n');changedFiles++}
}

if(fs.existsSync(STATEWIDE)){
  const data=JSON.parse(fs.readFileSync(STATEWIDE,'utf8'));
  let changed=false;
  for(const category of new Set(incoming.map(r=>r.category))){
    if(mergeCategory(data,category,incoming.filter(r=>r.category===category),STATE_LIMIT))changed=true;
  }
  if(changed){fs.writeFileSync(STATEWIDE,JSON.stringify(data,null,2)+'\n');changedFiles++}
}

const juab=JSON.parse(fs.readFileSync(path.join(BY_TEAM,'juab.json'),'utf8'));
const juabTackles=(juab.categories||[]).find(c=>c.key==='tackles')?.entries||[];
const cutoff=juabTackles.length?juabTackles.at(-1).value:null;
console.log(`Merged ${incoming.length} current-season candidate performances; updated ${changedFiles} record file(s), added ${insertedQualifiers} qualifying team entries.`);
console.log(`Juab tackle top-${TEAM_LIMIT} cutoff: ${cutoff ?? 'n/a'}. Current verified Payson tackles: Auston Brown 8, Marshall Draper 7, Jiles Barnes 5.`);
