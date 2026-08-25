import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const clean=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
const key=value=>clean(value).replace(/[^A-Z0-9]/g,'');
const aliases={
  UTAHMILITARYHILLFIELD:'UMA-HILLFIELD',
  UMAHILLFIELD:'UMA-HILLFIELD',
  PIEDRAVISTANM:'PIEDRA VISTA, NM',
  EASTWOODTEXAS:'EASTWOOD, TX',
  RANCHOBERNARDOCALIF:'RANCHO BERNARDO, CA',
  CHAPARRALCA:'CHAPARRAL, CA',
  MATERACADEMYNV:'MATER ACADEMY, NV'
};

export function normalizeWeeklyTeamName(value){
  const name=clean(value);
  return aliases[key(name)]||name;
}

export function normalizeWeeklyGames(games){
  let changes=0;
  for(const game of games||[])for(const field of ['awayTeam','homeTeam','winner','actualWinner']){
    if(!String(game?.[field]??'').trim())continue;
    const next=normalizeWeeklyTeamName(game[field]);
    if(next!==game[field]){game[field]=next;changes++}
  }
  return changes;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file='weekly-simulation.json',data=JSON.parse(fs.readFileSync(file,'utf8')),changes=normalizeWeeklyGames(data.games);
  if(changes)fs.writeFileSync(file,JSON.stringify(data));
  console.log(`Weekly team-name normalization: ${changes} field change(s).`);
}
