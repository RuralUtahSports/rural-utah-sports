import fs from 'node:fs';
import {applyStoredMuseRecovery} from './apply_muse_postseason_2026.mjs';
import {createRequire} from 'node:module';
import {postseasonFinals} from './lib/postseason-finals-2026.mjs';
import {teamKey} from './lib/competition-scope-2026.mjs';
const require=createRequire(import.meta.url);

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const norm=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={EASTWOODTEXAS:'EASTWOODTX',STJOSEPH:'SAINTJOSEPH',CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=value=>aliases[norm(value)]||norm(value);
const slug=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isoDate=value=>{
  const s=String(value??'').trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return s;
};
const hasScore=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const current=read('deseret-team-data-2026.json');
const roster=read('deseret-rosters-stats-2026.json');
const gameStats=read('player-game-stats-2026.json');
 // Rebuild reported full-season display from the source cache each time;
 // canonical reviewed regular-season totals are not rewritten.
 const primary=require('../maxpreps-primary-reported-2026.js');
 const hunt=require('../reviewed-hunt-postseason-2026.js');
 const lastPlayoff=new Map();
 for(const g of postseasonFinals(read('official-brackets-2026.json')))for(const t of [g.awayTeam,g.homeTeam]){
  const key=teamKey(t);if(!lastPlayoff.has(key)||lastPlayoff.get(key)<g.date)lastPlayoff.set(key,g.date);
 }
 const cache=read('maxpreps-stats-fallback-2026.json');
 const eligible={...cache,teams:Object.fromEntries(Object.entries(cache.teams||{}).filter(([name,provider])=>{
  const key=teamKey(name),last=lastPlayoff.get(key),stamp=Date.parse(provider.lastUpdated||'');
  return key!=='WHITEHORSE'&&Boolean(last)&&Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)>=last;
 }))};
 const reported=primary.applyPrimary(roster,eligible,read('teams-data.json')).data;
 hunt.apply(reported);
 const muse=applyStoredMuseRecovery(gameStats,roster,read('official-brackets-2026.json'));
 console.log('Muse display recovery:',JSON.stringify(muse));
 const mountain=Object.entries(gameStats.teams||{}).find(([name])=>teamKey(name)==='MOUNTAINRIDGE');
 if(mountain)hunt.applyGames(mountain[1]);

const details=read('deseret-game-details.json');
const standings=read('standings-2026.json');
const weekly=read('weekly-simulation.json');
const keys=new Set([
  ...Object.keys(current.teams||{}).map(canon),
  ...Object.keys(roster.teams||{}).map(canon),
  ...Object.keys(gameStats.teams||{}).map(canon)
]);
const find=(teams,key)=>Object.entries(teams||{}).find(([name])=>canon(name)===key)?.[1]||null;
const standingRows=Object.values(standings.byClassification||{}).flat();
const weeklyFor=key=>[...(weekly.games||[]).filter(g=>!(standings.games||[]).some(f=>canon(f.awayTeam)===canon(g.awayTeam)&&canon(f.homeTeam)===canon(g.homeTeam)&&Math.abs(Date.parse(isoDate(f.date))-Date.parse(isoDate(g.date)))<=3*86400000)),...(standings.games||[])].filter(game=>canon(game?.awayTeam)===key||canon(game?.homeTeam)===key);

function mergeSchedule(team,key){
  if(!team)return team;
  const schedule=(team.schedule||[]).map(game=>({...game,date:isoDate(game.date)}));
  const index=new Map(schedule.map((game,i)=>[`${isoDate(game.date)}|${canon(game.opponent)}`,i]));
  for(const game of weeklyFor(key)){
    const awayKey=canon(game.awayTeam),isAway=awayKey===key;
    const opponent=isAway?game.homeTeam:game.awayTeam;
    const date=isoDate(game.date);
    const k=`${date}|${canon(opponent)}`;
    const direct={
      date,
      awayTeam:game.awayTeam,
      homeTeam:game.homeTeam,
      opponent,
      site:isAway?'away':'home',
      ...(game.deseretUrl?{gameUrl:game.deseretUrl}:{}),
      ...(hasScore(game.actualAway)&&hasScore(game.actualHome)?{
        teamScore:Number(isAway?game.actualAway:game.actualHome),
        opponentScore:Number(isAway?game.actualHome:game.actualAway),
        result:Number(isAway?game.actualAway:game.actualHome)>Number(isAway?game.actualHome:game.actualAway)?'W':Number(isAway?game.actualAway:game.actualHome)<Number(isAway?game.actualHome:game.actualAway)?'L':'T',
        rusStatus:'Final',
        rusVerified:true
      }:{})
    };
    if(!index.has(k)){const moved=schedule.findIndex(g=>canon(g.opponent)===canon(opponent)&&Math.abs(Date.parse(isoDate(g.date))-Date.parse(date))<=3*86400000);if(moved>=0)index.set(k,moved)}
    if(index.has(k)){
      const i=index.get(k);
      schedule[i]={...schedule[i],...direct,gameUrl:schedule[i].gameUrl||direct.gameUrl||''};
    }else{
      index.set(k,schedule.length);
      schedule.push({...direct,rusSupplemental:true});
    }
  }
  schedule.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.opponent).localeCompare(String(b.opponent)));
  return {...team,schedule};
}

function mergedStanding(base,key){
  if(base)return {...base,games:base.wins+base.losses+base.ties};
  const finals=weeklyFor(key).filter(game=>hasScore(game.actualAway)&&hasScore(game.actualHome));
  if(!finals.length)return base;
  let wins=0,losses=0,ties=0,pointsFor=0,pointsAgainst=0;
  for(const game of finals){
    const isAway=canon(game.awayTeam)===key;
    const us=Number(isAway?game.actualAway:game.actualHome),them=Number(isAway?game.actualHome:game.actualAway);
    pointsFor+=us;pointsAgainst+=them;
    if(us>them)wins++;else if(us<them)losses++;else ties++;
  }
  const games=wins+losses+ties;
  return {...(base||{}),wins,losses,ties,games,pointsFor,pointsAgainst,winPct:games?(wins+ties*.5)/games:0};
}

fs.mkdirSync('team-current-data',{recursive:true});
let built=0,supplemented=0;
for(const key of keys){
  const rawTeam=find(current.teams,key),rosterStats=find(reported.teams,key),playerGames=find(gameStats.teams,key);
  const team=mergeSchedule(rawTeam,key);
  const name=team?.team||rosterStats?.team||playerGames?.team||key;
  const urls=new Set((team?.schedule||[]).map(game=>game?.gameUrl).filter(Boolean));
  const games={};
  for(const [gameKey,detail] of Object.entries(details.games||{}))if(detail?.url&&urls.has(detail.url))games[gameKey]=detail;
  const baseStanding=standingRows.find(row=>canon(row?.team)===key)||null;
  const standing=mergedStanding(baseStanding,key);
  const added=(team?.schedule||[]).filter(game=>game.rusSupplemental).length;
  supplemented+=added;
  const payload={
    season:current.season||roster.season||gameStats.season||2026,
    updatedAt:[current.updatedAt,roster.updatedAt,gameStats.updatedAt,details.updatedAt,standings.updatedAt].filter(Boolean).sort().at(-1)||new Date().toISOString(),
    team:name,
    current:team,
    rosterStats,
    gameStats:playerGames,
    details:{games},
    standing
  };
  fs.writeFileSync(`team-current-data/${slug(name)}.json`,JSON.stringify(payload));
  built++;
}
console.log(`Built ${built} team current-data shards; added ${supplemented} weekly schedule supplement(s).`);
