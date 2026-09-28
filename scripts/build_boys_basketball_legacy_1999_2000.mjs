import fs from 'node:fs';

const INPUT='boys-basketball-legacy-games-1999-2000.json';
const OUTPUT='boys-basketball-legacy-teams-1999-2000.json';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');

const payload=JSON.parse(fs.readFileSync(INPUT,'utf8'));
const seen=new Set();
const teams={};
let duplicates=0;

for(const game of payload.games||[]){
  const pair=[norm(game.winner),norm(game.loser)].sort().join('|');
  const key=[game.date,pair,Number(game.winnerScore),Number(game.loserScore)].join('|');
  if(seen.has(key)){
    duplicates++;
    continue;
  }
  seen.add(key);

  for(const side of ['winner','loser']){
    const team=game[side];
    const opponent=side==='winner'?game.loser:game.winner;
    const teamScore=side==='winner'?Number(game.winnerScore):Number(game.loserScore);
    const opponentScore=side==='winner'?Number(game.loserScore):Number(game.winnerScore);
    const entry=teams[team]||(teams[team]={record:{wins:0,losses:0,ties:0,games:0},games:[]});

    entry.record.games++;
    if(teamScore>opponentScore)entry.record.wins++;
    else if(teamScore<opponentScore)entry.record.losses++;
    else entry.record.ties++;

    entry.games.push({
      date:game.date,
      opponent,
      result:teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T',
      teamScore,
      opponentScore,
      overtime:game.overtime||null,
      sourceId:game.sourceId,
      confidence:game.confidence||'verified'
    });
  }
}

for(const entry of Object.values(teams)){
  entry.games.sort((a,b)=>a.date.localeCompare(b.date)||a.opponent.localeCompare(b.opponent));
}

const output={
  schemaVersion:1,
  season:payload.season,
  status:'partial-staging',
  countedInAllTimeRecords:false,
  updatedAt:new Date().toISOString(),
  summary:{
    verifiedGames:seen.size,
    teams:Object.keys(teams).length,
    duplicatesRemoved:duplicates
  },
  sources:payload.sources||{},
  teams:Object.fromEntries(Object.entries(teams).sort(([a],[b])=>a.localeCompare(b)))
};

fs.writeFileSync(OUTPUT,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));
