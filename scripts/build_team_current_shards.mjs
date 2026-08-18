import fs from 'node:fs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const norm=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=value=>aliases[norm(value)]||norm(value);
const slug=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const current=read('deseret-team-data-2026.json');
const roster=read('deseret-rosters-stats-2026.json');
const gameStats=read('player-game-stats-2026.json');
const details=read('deseret-game-details.json');
const standings=read('standings-2026.json');
const keys=new Set([
  ...Object.keys(current.teams||{}).map(canon),
  ...Object.keys(roster.teams||{}).map(canon),
  ...Object.keys(gameStats.teams||{}).map(canon)
]);
const find=(teams,key)=>Object.entries(teams||{}).find(([name])=>canon(name)===key)?.[1]||null;
const standingRows=Object.values(standings.byClassification||{}).flat();
fs.mkdirSync('team-current-data',{recursive:true});
let built=0;
for(const key of keys){
  const team=find(current.teams,key),rosterStats=find(roster.teams,key),playerGames=find(gameStats.teams,key);
  const name=team?.team||rosterStats?.team||playerGames?.team||key;
  const urls=new Set((team?.schedule||[]).map(game=>game?.gameUrl).filter(Boolean));
  const games={};
  for(const [gameKey,detail] of Object.entries(details.games||{}))if(detail?.url&&urls.has(detail.url))games[gameKey]=detail;
  const standing=standingRows.find(row=>canon(row?.team)===key)||null;
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
console.log(`Built ${built} team current-data shards.`);
