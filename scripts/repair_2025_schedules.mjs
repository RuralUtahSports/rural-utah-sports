import fs from 'node:fs';

const BASE='https://sports.deseret.com';
const SEASON=2025;
const SOURCE='full-season-2025.json';
const TEAM_FILE='deseret-team-data-2025.json';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const canon=v=>({CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIP:'ALA',AMERICANLEADERSHIPACADEMY:'ALA',STJOSEPH:'SAINTJOSEPH',UTAHMILITARYCAMPWILLIAMS:'UMALEHI',UTAHMILITARYHILLFIELD:'UMAHILLFIELD'}[compact(v)]||compact(v));
const iso=v=>{const m=clean(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`:clean(v)};
function nameKeys(v){const raw=clean(v),base=raw.replace(/\s*\([A-Z]{2}\)\s*$/i,'');return new Set([canon(raw),canon(base),compact(raw),compact(base)])}
function slugKeys(slug){const s=clean(slug).replace(/-football$/i,'');const parts=s.split('-').filter(Boolean);return new Set([canon(parts.join(' ')),compact(parts.join(' ')),compact(s)])}
function intersects(a,b){for(const x of a)if(b.has(x))return true;return false}
function extractLinks(html){const text=String(html||'').replace(/\\u002F/gi,'/').replace(/\\\//g,'/'),out=[];const re=/(?:href=["']|["'])(https?:\/\/sports\.deseret\.com)?(\/high-school\/football\/game\/(\d{4}-\d{2}-\d{2})\/([^"'?#<>]+?)\/(\d+))(?:[?"'#<]|$)/gi;let m;while((m=re.exec(text))){const mm=m[4].match(/^(.+?)-football-vs-(.+?)-football$/i);if(!mm)continue;out.push({date:m[3],awaySlug:mm[1],homeSlug:mm[2],url:`${BASE}${m[2]}`,gameId:m[5]})}return [...new Map(out.map(x=>[x.url,x])).values()]}
async function fetchHtml(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)'},redirect:'follow',signal:AbortSignal.timeout(22000)});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}
function matchLink(g,links){const a=nameKeys(g.teamA),b=nameKeys(g.teamB);let best=null,bestScore=-1;for(const l of links){const x=slugKeys(l.awaySlug),y=slugKeys(l.homeSlug);let score=0;if(intersects(a,x)&&intersects(b,y))score=10;else if(intersects(a,y)&&intersects(b,x))score=10;else{if(intersects(a,x)||intersects(a,y))score+=4;if(intersects(b,x)||intersects(b,y))score+=4}if(score>bestScore){best=l;bestScore=score}}return bestScore>=8?best:null}
function gameIdentity(g){const teams=[canon(g.teamA),canon(g.teamB)].sort();return `${iso(g.date)}|${teams[0]}|${teams[1]}|${Number(g.actualScoreA)}|${Number(g.actualScoreB)}`}
function teamEntryIdentity(row,team){return `${iso(row.date)}|${canon(team)}|${canon(row.opponent)}|${row.gameId||''}|${Number(row.actualScoreA)}|${Number(row.actualScoreB)}`}
if(!fs.existsSync(SOURCE)||!fs.existsSync(TEAM_FILE))throw new Error('2025 full season or team archive missing');
const season=JSON.parse(fs.readFileSync(SOURCE,'utf8')),archive=JSON.parse(fs.readFileSync(TEAM_FILE,'utf8'));
const rawGames=season.games||[],seenGames=new Set(),games=[];for(const g of rawGames){const key=gameIdentity(g);if(seenGames.has(key))continue;seenGames.add(key);games.push(g)}
const dates=[...new Set(games.map(g=>iso(g.date)))].sort();
const byDate=new Map();let next=0,failedDates=0;
async function worker(){while(true){const i=next++;if(i>=dates.length)return;const d=dates[i];try{const html=await fetchHtml(`${BASE}/high-school/football/scores-schedule/${d}`);byDate.set(d,extractLinks(html))}catch(e){failedDates++;console.warn(`${d}: ${e.message}`)}}}
await Promise.all(Array.from({length:4},()=>worker()));
for(const t of Object.values(archive.teams||{}))t.schedule=[];
const seenByTeam=new Map();for(const k of Object.keys(archive.teams||{}))seenByTeam.set(k,new Set());
let matched=0,total=0,entries=0,duplicateSourceGames=rawGames.length-games.length,duplicateTeamEntriesSkipped=0;
for(const g of games){const d=iso(g.date),link=matchLink(g,byDate.get(d)||[]);if(link)matched++;total++;const row={date:d,teamA:g.teamA,teamB:g.teamB,actualScoreA:g.actualScoreA,actualScoreB:g.actualScoreB,regionGame:!!g.regionGame,gameUrl:link?.url||'',gameId:link?.gameId||'',awayTeam:link?g.teamA:'',homeTeam:link?g.teamB:''};for(const team of [g.teamA,g.teamB]){const key=Object.keys(archive.teams||{}).find(k=>canon(k)===canon(team));if(!key)continue;const entry={...row,opponent:canon(team)===canon(g.teamA)?g.teamB:g.teamA},identity=teamEntryIdentity(entry,team),seen=seenByTeam.get(key);if(seen.has(identity)){duplicateTeamEntriesSkipped++;continue}seen.add(identity);archive.teams[key].schedule.push(entry);entries++}}
for(const t of Object.values(archive.teams||{}))t.schedule.sort((a,b)=>a.date.localeCompare(b.date)||canon(a.opponent).localeCompare(canon(b.opponent)));
archive.updatedAt=new Date().toISOString();archive.source='RUS 2025 results + Deseret archived daily score pages';archive.summary={...(archive.summary||{}),teamsWithGames:Object.values(archive.teams||{}).filter(t=>t.schedule?.length).length,totalTeamScheduleEntries:entries,uniqueGames:total,deseretGamesMatched:matched,deseretMatchPct:total?+(matched/total*100).toFixed(1):0,scoreDatesFetched:dates.length-failedDates,scoreDatesFailed:failedDates,duplicateSourceGamesRemoved:duplicateSourceGames,duplicateTeamEntriesSkipped};
fs.writeFileSync(TEAM_FILE,JSON.stringify(archive,null,2)+'\n');console.log('2025 repaired schedule',archive.summary);if(matched<Math.floor(total*.65))throw new Error(`Only matched ${matched}/${total} games to Deseret URLs`);
