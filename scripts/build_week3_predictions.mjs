import fs from 'node:fs';
import vm from 'node:vm';

const teamFeed=JSON.parse(fs.readFileSync('deseret-team-data-2026.json','utf8'));
const simulatorData=JSON.parse(fs.readFileSync('simulator-data.json','utf8'));
const weeklyData=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8'));
const aliases={
  'UTAH MILITARY HILLFIELD':'UMA-HILLFIELD','ARCHBISHOP RIORDAN CALI':'ARCHBISHOP RIORDAN, CA',
  'CAMPBELL HI':'CAMPBELL, HI','SOUTH PASADENA CA':'SOUTH PASADENA, CA','WEISER ID':'WEISER, ID',
  'HUN NJ':'HUN, NJ','MATER DEI CALIF':'MATER DEI, CA',
  'ST JAMES PERFORMANCE ACADEMY VA':'ST. JAMES PERFORMANCE ACADEMY, VA'
};
const canonical=new Map(Object.keys(simulatorData.teams).map(team=>[team.toUpperCase(),team]));
const teamName=value=>{const key=String(value||'').trim().toUpperCase().replace(/\s+/g,' ');return canonical.get(key)||aliases[key]||key.replace(/\s+,/g,',')};
const selected=new Map();
for(const team of Object.values(teamFeed.teams||{}))for(const game of team.schedule||[]){
  if(!['2026-08-27','2026-08-28','2026-08-29'].includes(game.date))continue;
  selected.set(game.gameId||[game.date,game.awayTeam,game.homeTeam].join('|'),{
    date:game.date,awayTeam:teamName(game.awayTeam),homeTeam:teamName(game.homeTeam),deseretUrl:game.gameUrl
  });
}
let source=fs.readFileSync('simulators.html','utf8');
source=source.slice(source.indexOf('<script>')+8,source.indexOf('function teamBox'));
source+=`\nsimulator=${JSON.stringify(simulatorData)};weekly=${JSON.stringify(weeklyData.games)};globalThis.runCalc=(a,b)=>calculate(a,b);`;
const context={console};
vm.runInNewContext(source,context);
const snap=(value,seed)=>{const n=Math.max(0,Math.round(value||0));if(n===1)return 0;if(n>=2&&n<=4)return 3;if(n===5)return seed%2?7:6;return n};
function fallback(away,home,seed){
  const a=simulatorData.teams[away],b=simulatorData.teams[home],ea=Number(a?.elo)||1500,eb=Number(b?.elo)||1500;
  const probability=1/(1+Math.pow(10,(eb-ea)/400));
  const total=Math.max(24,Math.min(75,((Number(a?.avgPF)||24)+(Number(a?.avgPA)||24)+(Number(b?.avgPF)||24)+(Number(b?.avgPA)||24))/2));
  const margin=(probability-.5)*32;
  let awayScore=snap((total+margin)/2,seed),homeScore=snap((total-margin)/2,seed+1);
  if(probability>=.5&&awayScore<=homeScore)awayScore=snap(homeScore+3,seed+2);
  if(probability<.5&&homeScore<=awayScore)homeScore=snap(awayScore+3,seed+3);
  return[awayScore,homeScore];
}
const games=[...selected.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.awayTeam.localeCompare(b.awayTeam)).map((game,index)=>{
  const result=context.runCalc(game.awayTeam,game.homeTeam);
  if(result){
    game.awayScore=snap(result.p1,index);game.homeScore=snap(result.p2,index+1);
    if(result.winner===game.awayTeam&&game.awayScore<=game.homeScore)game.awayScore=snap(game.homeScore+3,index+2);
    if(result.winner===game.homeTeam&&game.homeScore<=game.awayScore)game.homeScore=snap(game.awayScore+3,index+3);
  }else [game.awayScore,game.homeScore]=fallback(game.awayTeam,game.homeTeam,index);
  game.winner=game.awayScore>game.homeScore?game.awayTeam:game.homeTeam;
  return game;
});
process.stdout.write(JSON.stringify(games));
