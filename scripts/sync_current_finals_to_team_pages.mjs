import fs from 'node:fs';
import path from 'node:path';

const ROOT='team-page-data';
const SCHEDULES='team-schedules.json';
const schedules=JSON.parse(fs.readFileSync(SCHEDULES,'utf8'));
const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
const weekly=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8'));
const norm=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN'};
const canon=value=>aliases[norm(value)]||norm(value);
const scheduleTeams=new Map(Object.keys(schedules).map(team=>[canon(team),team]));
const slug=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const iso=value=>{const s=String(value??'').trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:s};
const displayDate=value=>{const [y,m,d]=iso(value).split('-');return y&&m&&d?`${Number(m)}/${Number(d)}/${y}`:String(value??'')};
const pairKey=(a,b)=>[canon(a),canon(b)].sort().join('|');
const validDates=new Map();
for(const game of weekly.games||[]){const key=pairKey(game.awayTeam,game.homeTeam);if(!validDates.has(key))validDates.set(key,new Set());validDates.get(key).add(iso(game.date))}

const files=new Map();
for(const file of fs.readdirSync(ROOT).filter(file=>file.endsWith('.json')))files.set(file.slice(0,-5),path.join(ROOT,file));
let changed=0,added=0,repaired=0;
for(const game of standings.games||[]){
  if([game.actualAway,game.actualHome].some(value=>value==null||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0))continue;
  const date=iso(game.date),pair=pairKey(game.awayTeam,game.homeTeam),allowed=validDates.get(pair)||new Set([date]);
  for(const side of ['away','home']){
    const team=side==='away'?game.awayTeam:game.homeTeam,opponent=side==='away'?game.homeTeam:game.awayTeam;
    const file=files.get(slug(team));if(!file)continue;
    const teamScore=Number(side==='away'?game.actualAway:game.actualHome),opponentScore=Number(side==='away'?game.actualHome:game.actualAway);
    if(!Number.isFinite(teamScore)||!Number.isFinite(opponentScore))continue;
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    const scheduleTeam=scheduleTeams.get(canon(team))||team;
    scheduleTeams.set(canon(team),scheduleTeam);
    schedules[scheduleTeam]??={};
    const rows=[...(schedules[scheduleTeam]['2026']||[])];
    for(const row of data.schedules?.['2026']||[]){
      if(!rows.some(existing=>iso(existing.date)===iso(row.date)&&canon(existing.opponent)===canon(row.opponent)))rows.push(row);
    }
    const before=rows.length;
    const clean=rows.filter(row=>canon(row.opponent)!==canon(opponent)||iso(row.date)===date||allowed.has(iso(row.date))||row.playoff===true);
    repaired+=before-clean.length;
    const next={date:displayDate(date),opponent,teamScore,opponentScore,result:teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T',playoff:false,notes:''};
    const index=clean.findIndex(row=>iso(row.date)===date&&canon(row.opponent)===canon(opponent));
    if(index>=0)clean[index]={...clean[index],...next,playoff:clean[index].playoff===true,notes:clean[index].notes||''};else{clean.push(next);added++}
    clean.sort((a,b)=>iso(a.date).localeCompare(iso(b.date))||String(a.opponent).localeCompare(String(b.opponent)));
    data.schedules=data.schedules||{};data.schedules['2026']=clean;
    schedules[scheduleTeam]['2026']=clean;
    const output=JSON.stringify(data);
    if(output!==fs.readFileSync(file,'utf8')){fs.writeFileSync(file,output);changed++}
  }
}
const scheduleOutput=JSON.stringify(schedules);
if(scheduleOutput!==fs.readFileSync(SCHEDULES,'utf8'))fs.writeFileSync(SCHEDULES,scheduleOutput);
console.log(`Synced current finals into ${changed} team page file(s); added ${added} result(s); removed ${repaired} stale conflicting row(s).`);
