import fs from 'node:fs';
import path from 'node:path';

process.env.PLAYER_RECORDS_SKIP_MAIN='1';
const {parseGame,gameLinks}=await import('./build_player_single_game_records.mjs');

const BASE='https://sports.deseret.com';
const START_SEASON=2009;
const END_SEASON=Number(process.env.END_SEASON||new Date().getFullYear());
const PLAYER_DIR='player-single-game-records';
const TEAM_DIR='team-stat-single-game-records';
const PLAYER_LIMIT=15;
const STATE_LIMIT=100;
const TEAM_LIMIT=15;
const INDEX_CONCURRENCY=12;
const GAME_CONCURRENCY=8;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const normalize=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');

const PLAYER_DEFS={
  passingYards:{label:'Passing Yards',unit:'yards'},passingTouchdowns:{label:'Passing Touchdowns',unit:'TD'},completions:{label:'Pass Completions',unit:'completions'},passAttempts:{label:'Pass Attempts',unit:'attempts'},
  rushingYards:{label:'Rushing Yards',unit:'yards'},rushingTouchdowns:{label:'Rushing Touchdowns',unit:'TD'},carries:{label:'Rushing Attempts',unit:'carries'},receivingYards:{label:'Receiving Yards',unit:'yards'},receptions:{label:'Receptions',unit:'receptions'},receivingTouchdowns:{label:'Receiving Touchdowns',unit:'TD'},
  totalOffenseYards:{label:'Total Offense',unit:'yards'},tackles:{label:'Tackles',unit:'tackles'},sacks:{label:'Sacks',unit:'sacks'},interceptions:{label:'Interceptions',unit:'INT'},defensiveTouchdowns:{label:'Defensive Touchdowns',unit:'TD'},fieldGoals:{label:'Field Goals',unit:'FG'},extraPoints:{label:'PAT Made',unit:'PAT'},returnTouchdowns:{label:'Return Touchdowns',unit:'TD'}
};
const TEAM_ORDER=['totalOffenseYards','passingYards','rushingYards','passingTouchdowns','rushingTouchdowns','sacks','interceptions'];
const TEAM_DEFS={totalOffenseYards:{label:'Total Offense',unit:'yards',max:1400},passingYards:{label:'Passing Yards',unit:'yards',max:1000},rushingYards:{label:'Rushing Yards',unit:'yards',max:1000},passingTouchdowns:{label:'Passing Touchdowns',unit:'TD',max:15},rushingTouchdowns:{label:'Rushing Touchdowns',unit:'TD',max:15},sacks:{label:'Sacks',unit:'sacks',max:25},interceptions:{label:'Interceptions',unit:'INT',max:12}};
const TEAM_SUM_KEYS=['passingYards','rushingYards','passingTouchdowns','rushingTouchdowns','sacks','interceptions'];

async function fetchHtml(url,tries=3){let last;for(let attempt=1;attempt<=tries;attempt++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0)'},redirect:'follow',signal:AbortSignal.timeout(25000)});if(r.status===404)return null;if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}catch(e){last=e;if(attempt<tries)await sleep(300*attempt)}}throw last}
function datesForSeason(year){const out=[];let d=new Date(Date.UTC(year,7,1)),end=new Date(Date.UTC(year,11,15)),now=new Date();if(year===now.getUTCFullYear()&&now<end)end=now;while(d<=end){out.push(d.toISOString().slice(0,10));d=new Date(d.getTime()+86400000)}return out}
function gameId(url){return clean(url).match(/\/(\d+)\/?(?:\?|$)/)?.[1]||url}
function isAlaUrl(url){const s=String(url||'').toLowerCase();return s.includes('american-leadership-academy')||s.includes('american-leadership-football')||s.includes('/ala-football')}
function rewriteAlaHtml(html){return String(html||'').replace(/American Leadership Academy/gi,'ALA').replace(/American Leadership(?! Academy)/gi,'ALA')}

async function discover(){const byId=new Map(),seasonCounts={};for(let season=START_SEASON;season<=END_SEASON;season++){const dates=datesForSeason(season);let next=0,found=0,failures=0;async function worker(){while(true){const i=next++;if(i>=dates.length)return;const date=dates[i],url=`${BASE}/high-school/football/scores-schedule/${date}`;try{const html=await fetchHtml(url,2);if(html){for(const gameUrl of gameLinks(html,date)){if(!isAlaUrl(gameUrl))continue;const id=gameId(gameUrl);if(!byId.has(id)){byId.set(id,{url:gameUrl,season});found++}}}}catch(e){failures++;console.warn(`ALA index ${date}: ${e.message}`)}await sleep(25)}}await Promise.all(Array.from({length:Math.min(INDEX_CONCURRENCY,dates.length)},()=>worker()));seasonCounts[season]={uniqueAlaGamesFound:found,indexFailures:failures};console.log(`ALA ${season}: +${found} games`)}return{games:[...byId.values()],seasonCounts}}

function rank(entries,limit,player=false){const sorted=[...entries].sort((a,b)=>b.value-a.value||String(a.date||'').localeCompare(String(b.date||''))||(player?String(a.player||'').localeCompare(String(b.player||'')):String(a.opponent||'').localeCompare(String(b.opponent||''))));let last=null,rankNo=0;return sorted.slice(0,limit).map((e,i)=>{if(e.value!==last){rankNo=i+1;last=e.value}return{rank:rankNo,...e}})}
function playerEntry(p,key){return{player:p.player,team:'ALA',season:p.season,date:p.date,opponent:p.opponent,teamScore:p.teamScore,opponentScore:p.opponentScore,value:Number(p.stats[key]),gameId:p.gameId,gameUrl:p.gameUrl,source:p.source}}
function playerCategories(perfs,limit){const out=[];for(const [key,def] of Object.entries(PLAYER_DEFS)){const rows=perfs.filter(p=>Number(p.stats?.[key])>0).map(p=>playerEntry(p,key));if(rows.length)out.push({key,label:def.label,unit:def.unit,entries:rank(rows,limit,true)})}return out}
function aggregateTeam(perfs){const games=new Map();for(const p of perfs){const id=String(p.gameId||`${p.date}|${p.opponent}`);let g=games.get(id);if(!g){g={team:'ALA',season:p.season,date:p.date,opponent:p.opponent,teamScore:p.teamScore,opponentScore:p.opponentScore,gameId:p.gameId,gameUrl:p.gameUrl,source:'Deseret News game stats',stats:{}};games.set(id,g)}for(const key of TEAM_SUM_KEYS){const v=Number(p.stats?.[key]);if(Number.isFinite(v)&&v>0)g.stats[key]=(g.stats[key]||0)+v}}
for(const g of games.values()){const pass=Number(g.stats.passingYards||0),rush=Number(g.stats.rushingYards||0);if(pass>0||rush>0)g.stats.totalOffenseYards=pass+rush;for(const key of Object.keys(g.stats)){const def=TEAM_DEFS[key];if(!def||!Number.isFinite(g.stats[key])||g.stats[key]<=0||g.stats[key]>def.max)delete g.stats[key]}}return[...games.values()].filter(g=>Object.keys(g.stats).length)}
function teamEntry(g,key){return{team:'ALA',season:g.season,date:g.date,opponent:g.opponent,teamScore:g.teamScore,opponentScore:g.opponentScore,value:Number(g.stats[key]),gameId:g.gameId,gameUrl:g.gameUrl,source:g.source}}
function teamCategories(games,limit){const out=[];for(const key of TEAM_ORDER){const rows=games.filter(g=>Number(g.stats?.[key])>0).map(g=>teamEntry(g,key));if(rows.length)out.push({key,label:TEAM_DEFS[key].label,unit:TEAM_DEFS[key].unit,entries:rank(rows,limit,false)})}return out}
function mergeStatewide(file,newCats,limit,player){if(!fs.existsSync(file))return;const doc=JSON.parse(fs.readFileSync(file,'utf8')),added=new Map(newCats.map(c=>[c.key,c]));for(const cat of doc.categories||[]){const extra=added.get(cat.key)?.entries||[],base=(cat.entries||[]).filter(e=>normalize(e.team)!=='ALA');cat.entries=rank([...base,...extra.map(({rank,...e})=>e)],limit,player);added.delete(cat.key)}for(const cat of added.values())doc.categories.push({...cat,entries:rank(cat.entries.map(({rank,...e})=>e),limit,player)});fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n')}
function markIndex(file,discovery,perfs,games){if(!fs.existsSync(file))return;const doc=JSON.parse(fs.readFileSync(file,'utf8'));doc.updatedAt=new Date().toISOString();doc.alaAliasRepair={updatedAt:doc.updatedAt,gamePages:discovery.games.length,playerPerformances:perfs.length,teamGames:games.length,seasonDiscovery:discovery.seasonCounts};fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n')}

async function main(){const discovery=await discover();if(discovery.games.length<60)throw new Error(`ALA discovery unexpectedly small: ${discovery.games.length}`);const perfs=[];let next=0,failures=0;async function worker(){while(true){const i=next++;if(i>=discovery.games.length)return;const game=discovery.games[i];try{const html=await fetchHtml(game.url,3);if(html){for(const p of parseGame(rewriteAlaHtml(html),game.url,game.season)){if(normalize(p.team)==='ALA')perfs.push({...p,team:'ALA'})}}}catch(e){failures++;console.warn(`ALA game ${game.url}: ${e.message}`)}await sleep(25)}}await Promise.all(Array.from({length:Math.min(GAME_CONCURRENCY,discovery.games.length)},()=>worker()));if(!perfs.length)throw new Error(`ALA repair parsed no performances from ${discovery.games.length} games (${failures} failures)`);
const playerCats=playerCategories(perfs,PLAYER_LIMIT),games=aggregateTeam(perfs),teamCats=teamCategories(games,TEAM_LIMIT);if(!playerCats.length)throw new Error('ALA repair produced no player categories');
const playerCoverage='Single-game player records use Deseret News game stat tables from 2009 to present. Reporting gaps remain, so this is not a complete all-history UHSAA record book.';fs.mkdirSync(path.join(PLAYER_DIR,'by-team'),{recursive:true});fs.writeFileSync(path.join(PLAYER_DIR,'by-team','ala.json'),JSON.stringify({team:'ALA',range:'2001–present',source:'Deseret News',coverageNote:playerCoverage,repairNote:'ALA game pages are normalized from the Deseret News name American Leadership Academy.',categories:playerCats},null,2)+'\n');mergeStatewide(path.join(PLAYER_DIR,'statewide.json'),playerCats,STATE_LIMIT,true);
const teamCoverage='Team single-game statistical records are reconstructed from available Deseret News individual game-stat tables from 2009 to present. Reporting gaps remain, so this is not an official or complete UHSAA all-time record book.';fs.mkdirSync(path.join(TEAM_DIR,'by-team'),{recursive:true});fs.writeFileSync(path.join(TEAM_DIR,'by-team','ala.json'),JSON.stringify({team:'ALA',range:'2009–present',source:'Deseret News',coverageNote:teamCoverage,repairNote:'ALA game pages are normalized from the Deseret News name American Leadership Academy.',categories:teamCats},null,2)+'\n');mergeStatewide(path.join(TEAM_DIR,'statewide.json'),teamCats,STATE_LIMIT,false);markIndex(path.join(PLAYER_DIR,'index.json'),discovery,perfs,games);markIndex(path.join(TEAM_DIR,'index.json'),discovery,perfs,games);console.log({alaGames:discovery.games.length,performances:perfs.length,playerCategories:playerCats.length,teamGames:games.length,teamCategories:teamCats.length,failures})}
await main();
