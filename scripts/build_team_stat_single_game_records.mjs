import fs from 'node:fs';
import path from 'node:path';

process.env.PLAYER_RECORDS_SKIP_MAIN='1';
const {parseGame,gameLinks,mergeManual}=await import('./build_player_single_game_records.mjs');

const BASE='https://sports.deseret.com';
const START_SEASON=2009;
const END_SEASON=Number(process.env.END_SEASON||new Date().getFullYear());
const OUT_DIR='team-stat-single-game-records';
const TEAM_LIMIT=15;
const STATE_LIMIT=100;
const INDEX_CONCURRENCY=12;
const GAME_CONCURRENCY=10;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const normalize=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const CATEGORY_ORDER=['totalOffenseYards','passingYards','rushingYards','passingTouchdowns','rushingTouchdowns','sacks','interceptions'];
const CATEGORY_DEFS={
  totalOffenseYards:{label:'Total Offense',unit:'yards',max:1400},
  passingYards:{label:'Passing Yards',unit:'yards',max:1000},
  rushingYards:{label:'Rushing Yards',unit:'yards',max:1000},
  passingTouchdowns:{label:'Passing Touchdowns',unit:'TD',max:15},
  rushingTouchdowns:{label:'Rushing Touchdowns',unit:'TD',max:15},
  sacks:{label:'Sacks',unit:'sacks',max:25},
  interceptions:{label:'Interceptions',unit:'INT',max:12}
};
const SUM_KEYS=['passingYards','rushingYards','passingTouchdowns','rushingTouchdowns','sacks','interceptions'];
const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8')).map(t=>clean(t?.team)).filter(Boolean);
const teamByNorm=new Map(teams.map(t=>[normalize(t),t]));

async function fetchHtml(url,tries=3){let last;for(let attempt=1;attempt<=tries;attempt++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0)'},redirect:'follow',signal:AbortSignal.timeout(25000)});if(r.status===404)return null;if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}catch(e){last=e;if(attempt<tries)await sleep(300*attempt)}}throw last}
function datesForSeason(year){const out=[];let d=new Date(Date.UTC(year,7,1)),end=new Date(Date.UTC(year,11,15)),now=new Date();if(year===now.getUTCFullYear()&&now<end)end=now;while(d<=end){out.push(d.toISOString().slice(0,10));d=new Date(d.getTime()+86400000)}return out}
function gameId(url){return clean(url).match(/\/(\d+)\/?(?:\?|$)/)?.[1]||url}
async function collectGameUrls(){const byId=new Map(),seasonCounts={};for(let season=START_SEASON;season<=END_SEASON;season++){const dates=datesForSeason(season);let next=0,found=0,failures=0;async function worker(){while(true){const i=next++;if(i>=dates.length)return;const date=dates[i],url=`${BASE}/high-school/football/scores-schedule/${date}`;try{const html=await fetchHtml(url,2);if(html){for(const gameUrl of gameLinks(html,date)){const id=gameId(gameUrl);if(!byId.has(id)){byId.set(id,{url:gameUrl,season});found++}}}}catch(e){failures++;console.warn(`Index ${date}: ${e.message}`)}await sleep(35)}}await Promise.all(Array.from({length:Math.min(INDEX_CONCURRENCY,dates.length)},()=>worker()));seasonCounts[season]={uniqueGamesFound:found,indexFailures:failures};console.log(`${season}: +${found} game pages (${byId.size} total)`)}return{games:[...byId.values()],seasonCounts}}
function rank(entries,limit){const sorted=[...entries].sort((a,b)=>b.value-a.value||String(a.date).localeCompare(String(b.date))||String(a.opponent).localeCompare(String(b.opponent)));let last=null,rank=0;return sorted.slice(0,limit).map((e,i)=>{if(e.value!==last){rank=i+1;last=e.value}return{rank,...e}})}
function aggregate(performances){const games=new Map();for(const p of performances){if(Number(p.season)<START_SEASON)continue;const team=teamByNorm.get(normalize(p.team));if(!team)continue;const id=String(p.gameId||`${p.date}|${normalize(team)}|${normalize(p.opponent)}`),key=`${id}|${normalize(team)}`;let g=games.get(key);if(!g){g={team,season:p.season,date:p.date,opponent:p.opponent,teamScore:p.teamScore,opponentScore:p.opponentScore,gameId:p.gameId,gameUrl:p.gameUrl,source:'Deseret News game stats',stats:{}};games.set(key,g)}for(const stat of SUM_KEYS){const v=Number(p.stats?.[stat]);if(Number.isFinite(v)&&v>0)g.stats[stat]=(g.stats[stat]||0)+v}}
for(const g of games.values()){const pass=Number(g.stats.passingYards||0),rush=Number(g.stats.rushingYards||0);if(pass>0||rush>0)g.stats.totalOffenseYards=pass+rush;for(const key of Object.keys(g.stats)){const def=CATEGORY_DEFS[key];if(!def||!Number.isFinite(g.stats[key])||g.stats[key]<=0||g.stats[key]>def.max)delete g.stats[key]}}return [...games.values()].filter(g=>Object.keys(g.stats).length)}
function entry(g,key){return{team:g.team,season:g.season,date:g.date,opponent:g.opponent,teamScore:g.teamScore,opponentScore:g.opponentScore,value:g.stats[key],gameId:g.gameId,gameUrl:g.gameUrl,source:g.source}}
function writeOutput(games,discovery,failures,performances){fs.rmSync(OUT_DIR,{recursive:true,force:true});fs.mkdirSync(path.join(OUT_DIR,'by-team'),{recursive:true});const coverageNote='Team single-game statistical records are reconstructed from available Deseret News individual game-stat tables from 2009 to present. Reporting gaps remain, so this is not an official or complete UHSAA all-time record book.';const byTeam=new Map();for(const g of games){if(!byTeam.has(g.team))byTeam.set(g.team,[]);byTeam.get(g.team).push(g)}
for(const team of teams){const gs=byTeam.get(team)||[],categories=[];for(const key of CATEGORY_ORDER){const rows=gs.filter(g=>Number(g.stats[key])>0).map(g=>entry(g,key));if(rows.length)categories.push({key,label:CATEGORY_DEFS[key].label,unit:CATEGORY_DEFS[key].unit,entries:rank(rows,TEAM_LIMIT)})}fs.writeFileSync(path.join(OUT_DIR,'by-team',`${slug(team)}.json`),JSON.stringify({team,range:`${START_SEASON}–present`,source:'Deseret News',coverageNote,categories},null,2)+'\n')}
const statewide=[];for(const key of CATEGORY_ORDER){const rows=games.filter(g=>Number(g.stats[key])>0).map(g=>entry(g,key));if(rows.length)statewide.push({key,label:CATEGORY_DEFS[key].label,unit:CATEGORY_DEFS[key].unit,entries:rank(rows,STATE_LIMIT)})}fs.writeFileSync(path.join(OUT_DIR,'statewide.json'),JSON.stringify({range:`${START_SEASON}–present`,source:'Deseret News',coverageNote,categories:statewide},null,2)+'\n');const summary={updatedAt:new Date().toISOString(),startSeason:START_SEASON,endSeason:END_SEASON,categoryOrder:CATEGORY_ORDER,uniqueGamePages:discovery.games.length,gamePageFailures:failures,playerPerformancesParsed:performances.length,teamGamePerformances:games.length,teams:teams.length,teamsWithRecords:byTeam.size,categories:statewide.length,seasonDiscovery:discovery.seasonCounts};fs.writeFileSync(path.join(OUT_DIR,'index.json'),JSON.stringify(summary,null,2)+'\n');console.log(summary);if(discovery.games.length<5000)throw new Error(`Historical discovery unexpectedly small: ${discovery.games.length}`);if(games.length<5000)throw new Error(`Team-game output unexpectedly small: ${games.length}`)}

async function main(){const discovery=await collectGameUrls(),performances=[];let next=0,failures=0;async function worker(){while(true){const i=next++;if(i>=discovery.games.length)return;const game=discovery.games[i];try{const html=await fetchHtml(game.url,3);if(html)performances.push(...parseGame(html,game.url,game.season))}catch(e){failures++;console.warn(`Game ${game.url}: ${e.message}`)}if(i%100===0)console.log(`Parsed ${i+1}/${discovery.games.length} games`);await sleep(25)}}await Promise.all(Array.from({length:Math.min(GAME_CONCURRENCY,discovery.games.length)},()=>worker()));mergeManual(performances);const games=aggregate(performances);writeOutput(games,discovery,failures,performances)}
await main();
