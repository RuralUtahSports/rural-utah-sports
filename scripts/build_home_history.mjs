import fs from 'node:fs';
import path from 'node:path';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clean=value=>String(value??'').trim();
const norm=value=>clean(value).toUpperCase().replace(/\s+/g,' ');
const aliases={
  CEDAR:'CEDAR CITY','GRAND COUNTY':'GRAND',GUNNISON:'GUNNISON VALLEY','MONUMENT VAL':'MONUMENT VALLEY',
  'ST JOSEPH':'SAINT JOSEPH','ST. JOSEPH':'SAINT JOSEPH','LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN',
  'AMERICAN LEADERSHIP ACADEMY':'ALA','UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI',
  'UTAH MILITARY ACADEMY - HILL FIELD':'UMA-HILLFIELD'
};
const canon=value=>aliases[norm(value)]||norm(value);
const yearOf=value=>{const match=clean(value).match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2})(?:\D|$)/);return match?Number(match[1]):null};
const dateValue=value=>{const time=Date.parse(clean(value));return Number.isFinite(time)?time:(yearOf(value)?Date.UTC(yearOf(value),0,1):0)};
const dateKey=value=>{const match=clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return match?`${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`:''};

const teams=read('teams-data.json');
const teamNames=new Map(teams.filter(team=>team?.team).map(team=>[canon(team.team),team.team]));
const isVarsity=team=>teamNames.has(canon(team));
const display=team=>teamNames.get(canon(team))||clean(team);
const scorigami=read('scorigami.json');
const streakRecords=read('streak-records.json');
const games=[];
const seen=new Set();

for(const score of scorigami.scores||[])for(const game of score.games||[]){
  const row=game.tie
    ?{date:game.date,team1:game.team1,team2:game.team2,score1:Number(game.score1),score2:Number(game.score2),tie:true}
    :{date:game.date,team1:game.winner,team2:game.loser,score1:Number(game.winnerScore),score2:Number(game.loserScore),tie:false};
  if(!row.team1||!row.team2||!Number.isFinite(row.score1)||!Number.isFinite(row.score2))continue;
  row.team1=display(row.team1);row.team2=display(row.team2);row.year=yearOf(row.date);row.total=row.score1+row.score2;
  const pair=[[canon(row.team1),row.score1],[canon(row.team2),row.score2]].sort((a,b)=>a[0].localeCompare(b[0]));
  const key=`${row.date}|${pair[0][0]}:${pair[0][1]}|${pair[1][0]}:${pair[1][1]}`;
  if(!seen.has(key)){seen.add(key);games.push(row)}
}

const outDir='home-history';
fs.mkdirSync(outDir,{recursive:true});
for(let month=1;month<=12;month++){
  const days=new Date(Date.UTC(2024,month,0)).getUTCDate();
  for(let day=1;day<=days;day++){
    const key=`${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const rows=games.filter(game=>dateKey(game.date)===key&&isVarsity(game.team1)&&isVarsity(game.team2))
      .sort((a,b)=>b.total-a.total||b.year-a.year);
    fs.writeFileSync(path.join(outDir,`${key}.json`),JSON.stringify({date:key,games:rows}));
  }
}

const byTeam=new Map();
for(const game of [...games].sort((a,b)=>dateValue(a.date)-dateValue(b.date))){
  const a=canon(game.team1),b=canon(game.team2);
  if(isVarsity(a)){
    const previous=byTeam.get(a)||{team:display(a),active:0,last:0};
    previous.active=game.tie?0:previous.active+1;previous.last=dateValue(game.date);byTeam.set(a,previous);
  }
  if(isVarsity(b)){
    const previous=byTeam.get(b)||{team:display(b),active:0,last:0};
    previous.active=0;previous.last=dateValue(game.date);byTeam.set(b,previous);
  }
}
const watch=[...byTeam.entries()].map(([key,value])=>{
  const record=streakRecords?.[key]||streakRecords?.[display(key)]||{};
  const best=Number(record?.longestWinStreak?.length||0);
  return{...value,best,distance:best-value.active};
}).filter(row=>row.active>=2)
  .sort((a,b)=>(Math.max(a.distance,0)-Math.max(b.distance,0))||b.active-a.active||b.last-a.last)
  .slice(0,6);
fs.writeFileSync('home-streak-watch.json',JSON.stringify({updatedAt:new Date().toISOString(),teams:watch}));
console.log(`Built ${games.length.toLocaleString()} compact history games, 366 day files and ${watch.length} streak cards.`);
