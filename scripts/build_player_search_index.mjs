import fs from 'node:fs';

const source='deseret-rosters-stats-2026.json';
const output='player-search-index-2026.json';
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const players=[];

for(const [teamKey,teamData] of Object.entries(data?.teams||{})){
  const team=String(teamData?.team||teamKey||'').trim();
  for(const player of teamData?.roster||[]){
    const id=String(player?.playerId||'').trim();
    const name=String(player?.name||'').trim();
    if(!id||!name)continue;
    players.push([
      id,
      name,
      team,
      String(player?.number||'').trim(),
      String(player?.position||'').trim(),
      String(player?.class||'').trim()
    ]);
  }
}

players.sort((a,b)=>a[0].localeCompare(b[0]));
fs.writeFileSync(output,JSON.stringify({y:2026,p:players}));
console.log(`Wrote ${players.length} players to ${output}`);
