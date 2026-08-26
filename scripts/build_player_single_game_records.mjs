import fs from 'node:fs';
import path from 'node:path';

const BASE='https://sports.deseret.com';
const START_SEASON=2001;
const END_SEASON=Number(process.env.END_SEASON||new Date().getFullYear());
const OUT_DIR='player-single-game-records';
const STATE_LIMIT=100;
const TEAM_LIMIT=15;
const INDEX_CONCURRENCY=12;
const GAME_CONCURRENCY=10;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const normalize=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const decode=s=>String(s||'').replace(/<!--\s*-->/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const text=html=>clean(decode(String(html||'')).replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' '));
const cells=row=>{const out=[];const re=/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;let m;while((m=re.exec(row)))out.push(text(m[1]));return out};
const num=v=>{const m=clean(v).replace(/,/g,'').match(/^-?\d+(?:\.\d+)?$/);return m?Number(m[0]):null};
const isoDate=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):clean(v)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const CATEGORY_DEFS={
  passingYards:{label:'Passing Yards',unit:'yards'},
  passingTouchdowns:{label:'Passing Touchdowns',unit:'TD'},
  completions:{label:'Pass Completions',unit:'completions'},
  passAttempts:{label:'Pass Attempts',unit:'attempts'},
  rushingYards:{label:'Rushing Yards',unit:'yards'},
  rushingTouchdowns:{label:'Rushing Touchdowns',unit:'TD'},
  carries:{label:'Rushing Attempts',unit:'carries'},
  receivingYards:{label:'Receiving Yards',unit:'yards'},
  receptions:{label:'Receptions',unit:'receptions'},
  receivingTouchdowns:{label:'Receiving Touchdowns',unit:'TD'},
  totalOffenseYards:{label:'Total Offense',unit:'yards'},
  tackles:{label:'Tackles',unit:'tackles'},
  sacks:{label:'Sacks',unit:'sacks'},
  interceptions:{label:'Interceptions',unit:'INT'},
  defensiveTouchdowns:{label:'Defensive Touchdowns',unit:'TD'},
  fieldGoals:{label:'Field Goals',unit:'FG'},
  extraPoints:{label:'PAT Made',unit:'PAT'},
  returnTouchdowns:{label:'Return Touchdowns',unit:'TD'}
};

const HEADER_MAP={
  RUSHING:{CARRIES:'carries',YARDS:'rushingYards',TD:'rushingTouchdowns'},
  PASSING:{YARDS:'passingYards',TD:'passingTouchdowns'},
  RECEIVING:{RECEPTIONS:'receptions',YARDS:'receivingYards',TD:'receivingTouchdowns'},
  DEFENSE:{TACKLES:'tackles',SACKS:'sacks',PASSINT:'interceptions',TD:'defensiveTouchdowns'},
  SPECIALTEAMS:{FG:'fieldGoals',PAT:'extraPoints',RETURNTD:'returnTouchdowns'}
};

const ALIASES={
  ALA:'American Leadership Academy',AMERICANLEADERSHIP:'American Leadership Academy',AMERICANLEADERSHIPACADEMY:'American Leadership Academy',
  CEDARCITY:'Cedar',CEDARREDS:'Cedar',GRANDCOUNTY:'Grand',GUNNISON:'Gunnison Valley',MAPLEMTN:'Maple Mountain',MONUMENTVAL:'Monument Valley',
  JUANDIEGOCATHOLIC:'Juan Diego',LAYTONCHRISTIANACADEMY:'Layton Christian',SAINTJOSEPH:'St. Joseph',STJOSEPH:'St. Joseph',
  UMAHILLFIELD:'Utah Military Hillfield',UMALEHI:'Utah Military Camp Williams'
};

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8')).map(t=>clean(t?.team)).filter(Boolean);
const canonical=new Map(teams.map(t=>[normalize(t),t]));
for(const [a,t] of Object.entries(ALIASES))if(canonical.has(normalize(t)))canonical.set(a,canonical.get(normalize(t)));
function canonicalTeam(v){return canonical.get(normalize(v))||null}

async function fetchHtml(url,tries=3){let last;for(let attempt=1;attempt<=tries;attempt++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'},redirect:'follow',signal:AbortSignal.timeout(25000)});if(r.status===404)return null;if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.text()}catch(e){last=e;if(attempt<tries)await sleep(300*attempt)}}throw last}

function datesForSeason(year){const out=[];let d=new Date(Date.UTC(year,7,1)),end=new Date(Date.UTC(year,11,15));const now=new Date();if(year===now.getUTCFullYear()&&now<end)end=now;while(d<=end){out.push(d.toISOString().slice(0,10));d=new Date(d.getTime()+86400000)}return out}
function gameLinks(html){const out=[];const re=/href=["']([^"']*\/high-school\/football\/game\/[^"'#?]+\/\d+)["']/gi;let m;while((m=re.exec(html||''))){const href=decode(m[1]);out.push(href.startsWith('http')?href:`${BASE}${href.startsWith('/')?'':'/'}${href}`)}return [...new Set(out)]}
function gameId(url){return clean(url).match(/\/(\d+)\/?(?:\?|$)/)?.[1]||url}

async function collectGameUrls(){const byId=new Map(),seasonCounts={};for(let season=START_SEASON;season<=END_SEASON;season++){const dates=datesForSeason(season);let next=0,found=0,failures=0;async function worker(){while(true){const i=next++;if(i>=dates.length)return;const date=dates[i],url=`${BASE}/high-school/football/scores-schedule/${date}`;try{const html=await fetchHtml(url,2);if(html){for(const gameUrl of gameLinks(html)){const id=gameId(gameUrl);if(!byId.has(id)){byId.set(id,{url:gameUrl,season});found++}}}}catch(e){failures++;console.warn(`Index ${date}: ${e.message}`)}await sleep(35)}}await Promise.all(Array.from({length:Math.min(INDEX_CONCURRENCY,dates.length)},()=>worker()));seasonCounts[season]={uniqueGamesFound:found,indexFailures:failures};console.log(`${season}: +${found} unique game pages (${byId.size} total), ${failures} index failure(s)`)}return{games:[...byId.values()],seasonCounts}}

function pageTeams(html){const title=text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s*[-–]\s*Football Game[\s\S]*$/i,'');const parts=title.split(/\s+vs\.?\s+/i).map(clean).filter(Boolean);return parts.length>=2?parts.slice(0,2):[]}
function pageDate(html,url){const fromUrl=clean(url).match(/\/game\/(\d{4}-\d{2}-\d{2})\//)?.[1];if(fromUrl)return fromUrl;const body=text(html);const m=body.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/i);return m?isoDate(m[0]):''}
function pageScore(html,teams){const tables=[...String(html||'').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];for(const t of tables){const rows=[...t[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>cells(x[1])).filter(r=>r.length);if(rows.length<3)continue;const header=rows[0].map(normalize);if(!header.some(h=>h==='TOTAL'))continue;const out={};for(const row of rows.slice(1,3)){const label=clean(row[0]).replace(/^@\s*/,''),team=teams.find(x=>normalize(label).includes(normalize(x))||normalize(x).includes(normalize(label)));const score=num(row[row.length-1]);if(team&&score!==null)out[team]=score}if(Object.keys(out).length)return out}return{}}
function sectionBefore(html,index){const prior=String(html||'').slice(Math.max(0,index-8000),index),heads=[...prior.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];return normalize(text(heads.at(-1)?.[1]||''))}
function tableTeam(html,index,pageTeamNames){const prior=normalize(text(String(html||'').slice(Math.max(0,index-2500),index)));let best=null,bestIndex=-1;for(const team of pageTeamNames){const found=prior.lastIndexOf(normalize(team));if(found>bestIndex){bestIndex=found;best=team}}return best}
function add(perf,key,value){if(!CATEGORY_DEFS[key]||!Number.isFinite(value)||value<=0)return;const prev=perf.stats[key];if(prev==null||value>prev)perf.stats[key]=value}
function parseGame(html,url,season){const titleTeams=pageTeams(html),canonTitle=titleTeams.map(canonicalTeam),date=pageDate(html,url),scores=pageScore(html,titleTeams),game=gameId(url),performances=new Map();const tables=[...String(html||'').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];for(const tm of tables){const section=sectionBefore(html,tm.index||0);if(!HEADER_MAP[section])continue;const rawTeam=tableTeam(html,tm.index||0,titleTeams),team=canonicalTeam(rawTeam);if(!team)continue;const opponentIndex=canonTitle.findIndex(t=>t===team)===0?1:0,opponent=titleTeams[opponentIndex]||titleTeams.find(t=>canonicalTeam(t)!==team)||'';const rows=[...tm[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>cells(x[1])).filter(r=>r.some(Boolean));if(rows.length<2)continue;const headerIndex=rows.findIndex(r=>r.some(c=>normalize(c)==='PLAYER'));if(headerIndex<0)continue;const headers=rows[headerIndex].map(normalize),playerCol=headers.findIndex(h=>h==='PLAYER');if(playerCol<0)continue;for(const row of rows.slice(headerIndex+1)){const player=clean(row[playerCol]).replace(/^[-.\s]+/,'');if(!player||normalize(player)==='PLAYER')continue;const pkey=`${normalize(team)}|${normalize(player)}`;let perf=performances.get(pkey);if(!perf){const teamScore=scores[titleTeams.find(t=>canonicalTeam(t)===team)]??null,opponentScore=scores[opponent]??null;perf={player,team,season,date,opponent,teamScore,opponentScore,gameId:game,gameUrl:url,source:'Deseret News game stats',stats:{}};performances.set(pkey,perf)}if(section==='PASSING'){const ca=headers.findIndex(h=>h==='COMPATT');if(ca>=0&&row[ca]){const m=clean(row[ca]).match(/(\d+)\s*[-/]\s*(\d+)/);if(m){add(perf,'completions',Number(m[1]));add(perf,'passAttempts',Number(m[2]))}}}for(let i=0;i<headers.length;i++){const key=HEADER_MAP[section]?.[headers[i]];if(!key)continue;const value=num(row[i]);if(value!==null)add(perf,key,value)}}}
for(const perf of performances.values()){const total=(perf.stats.passingYards||0)+(perf.stats.rushingYards||0);if(total>0)add(perf,'totalOffenseYards',total)}return[...performances.values()]}

const MANUAL=[
  {player:'Brad Leggat',team:'Hillcrest',season:2001,date:'2001-08-31',opponent:'Layton',teamScore:26,opponentScore:46,gameId:'60618',gameUrl:'https://sports.deseret.com/high-school/football/game/2001-08-31/hillcrest-football-vs-layton-football/60618',source:'Deseret News roundup / prep record book',stats:{passingYards:538,totalOffenseYards:538,completions:30,passAttempts:49,passingTouchdowns:3}}
];
function mergeManual(perfs){for(const manual of MANUAL){const team=canonicalTeam(manual.team)||manual.team,key=`${manual.gameId}|${normalize(team)}|${normalize(manual.player)}`;let p=perfs.find(x=>`${x.gameId}|${normalize(x.team)}|${normalize(x.player)}`===key);if(!p){p={...manual,team,stats:{}};perfs.push(p)}for(const [stat,value] of Object.entries(manual.stats||{}))if(Number.isFinite(Number(value)))p.stats[stat]=Math.max(Number(p.stats[stat]||0),Number(value));p.source=manual.source}return perfs}

function rank(entries,limit){const sorted=[...entries].sort((a,b)=>b.value-a.value||a.date.localeCompare(b.date)||a.player.localeCompare(b.player));let last=null,rank=0;return sorted.slice(0,limit).map((e,i)=>{if(e.value!==last){rank=i+1;last=e.value}return{rank,...e}})}
function categoryPayload(key,entries,limit){const def=CATEGORY_DEFS[key];return{key,label:def.label,unit:def.unit,entries:rank(entries,limit)}}
function entryFromPerformance(p,key){return{player:p.player,team:p.team,season:p.season,date:p.date,opponent:p.opponent,teamScore:p.teamScore,opponentScore:p.opponentScore,value:Number(p.stats[key]),gameId:p.gameId,gameUrl:p.gameUrl,source:p.source}}

async function main(){fs.mkdirSync(OUT_DIR,{recursive:true});fs.mkdirSync(path.join(OUT_DIR,'by-team'),{recursive:true});const discovery=await collectGameUrls(),performances=[];let next=0,failures=0;async function worker(){while(true){const i=next++;if(i>=discovery.games.length)return;const game=discovery.games[i];try{const html=await fetchHtml(game.url,3);if(html)performances.push(...parseGame(html,game.url,game.season))}catch(e){failures++;console.warn(`Game ${game.url}: ${e.message}`)}if(i%100===0)console.log(`Parsed ${i+1}/${discovery.games.length} games`);await sleep(25)}}await Promise.all(Array.from({length:Math.min(GAME_CONCURRENCY,discovery.games.length)},()=>worker()));mergeManual(performances);
const statewide=[];for(const key of Object.keys(CATEGORY_DEFS)){const rows=performances.filter(p=>Number(p.stats[key])>0).map(p=>entryFromPerformance(p,key));if(rows.length)statewide.push(categoryPayload(key,rows,STATE_LIMIT))}
const byTeam=new Map();for(const p of performances){if(!byTeam.has(p.team))byTeam.set(p.team,[]);byTeam.get(p.team).push(p)}for(const team of teams){const ps=byTeam.get(team)||[],categories=[];for(const key of Object.keys(CATEGORY_DEFS)){const rows=ps.filter(p=>Number(p.stats[key])>0).map(p=>entryFromPerformance(p,key));if(rows.length)categories.push(categoryPayload(key,rows,TEAM_LIMIT))}const payload={team,range:`${START_SEASON}–present`,source:'Deseret News',coverageNote:'Single-game player records are built from statistics reported to Deseret News from 2001 to present. Early-season box scores and some games are incomplete, so this should not be treated as a complete pre-2001 or all-history UHSAA record book.',categories};fs.writeFileSync(path.join(OUT_DIR,'by-team',`${slug(team)}.json`),JSON.stringify(payload,null,2)+'\n')}
const statewidePayload={range:`${START_SEASON}–present`,source:'Deseret News',coverageNote:'Statewide UHSAA leaderboards use reported Deseret News game statistics from 2001 to present. Early years contain reporting gaps; verified roundup/record-book lines are added where structured tables are incomplete.',categories:statewide};fs.writeFileSync(path.join(OUT_DIR,'statewide.json'),JSON.stringify(statewidePayload,null,2)+'\n');const summary={updatedAt:new Date().toISOString(),startSeason:START_SEASON,endSeason:END_SEASON,uniqueGamePages:discovery.games.length,gamePageFailures:failures,performances:performances.length,teams:teams.length,teamsWithPerformances:[...byTeam.keys()].length,categories:statewide.length,seasonDiscovery:discovery.seasonCounts,manualVerifiedEntries:MANUAL.length};fs.writeFileSync(path.join(OUT_DIR,'index.json'),JSON.stringify(summary,null,2)+'\n');console.log(summary);if(discovery.games.length<5000)throw new Error(`Historical discovery unexpectedly small: ${discovery.games.length}`);if(performances.length<10000)throw new Error(`Performance output unexpectedly small: ${performances.length}`)}
export { parseGame };
if(process.env.PLAYER_RECORDS_SKIP_MAIN!=='1')await main();
