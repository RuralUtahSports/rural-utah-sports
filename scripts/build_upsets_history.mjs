import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/\s+/g,' ');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const expected=(a,b)=>1/(1+Math.pow(10,(b-a)/400));

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const history=JSON.parse(fs.readFileSync('team-elo-history.json','utf8'));
const utah=new Set(teams.map(t=>norm(t.team)));

// One lookup per team/date/opponent lets us recover both pregame ELOs without
// shipping the entire ~10 MB team history file to the browser.
const lookup=new Map();
for(const [team,rows] of Object.entries(history)){
  for(const row of rows||[]){
    lookup.set(`${norm(team)}|${clean(row.date)}|${norm(row.opponent)}`,row);
  }
}

const rows=[];
for(const [winner,teamRows] of Object.entries(history)){
  const winnerKey=norm(winner);
  if(!utah.has(winnerKey))continue;
  for(const row of teamRows||[]){
    if(row?.result!=='W')continue;
    const loser=norm(row.opponent);
    // Upset Tracker is Utah-vs-Utah only. Out-of-state opponents are excluded.
    if(!utah.has(loser))continue;
    const loserRow=lookup.get(`${loser}|${clean(row.date)}|${winnerKey}`);
    const winnerElo=num(row.eloBefore),loserElo=num(loserRow?.eloBefore);
    if(winnerElo===null||loserElo===null||winnerElo>=loserElo)continue;
    const gap=loserElo-winnerElo;
    rows.push({
      season:Number(row.season)||null,
      date:clean(row.date),
      winner:winnerKey,
      loser,
      margin:Number(row.margin)||0,
      winnerElo,
      loserElo,
      eloGap:gap,
      winnerChance:expected(winnerElo,loserElo)
    });
  }
}
rows.sort((a,b)=>b.eloGap-a.eloGap||Number(b.season)-Number(a.season)||a.date.localeCompare(b.date));
const seasons=[...new Set(rows.map(r=>r.season).filter(Number.isFinite))].sort((a,b)=>b-a);
fs.writeFileSync('upsets-history.json',JSON.stringify({updatedAt:new Date().toISOString(),utahOnly:true,seasons,rows},null,2)+'\n');
console.log(`Built ${rows.length} Utah-vs-Utah ELO upsets across ${seasons.length} seasons.`);
