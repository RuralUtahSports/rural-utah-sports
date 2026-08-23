import fs from 'node:fs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const norm=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
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
const weeklyFor=key=>(weekly.games||[]).filter(game=>canon(game?.awayTeam)===key||canon(game?.homeTeam)===key);

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
  const rawTeam=find(current.teams,key),rosterStats=find(roster.teams,key),playerGames=find(gameStats.teams,key);
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
