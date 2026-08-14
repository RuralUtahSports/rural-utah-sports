import fs from 'node:fs';

const BASE='https://sports.deseret.com';
const OUT='deseret-team-data-2026.json';
const SEASON=2026;
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slugify=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const KEY_ALIASES={
  ALA:['AMERICANLEADERSHIP'],AMERICANLEADERSHIPACADEMY:['AMERICANLEADERSHIP'],AMERICANLEADERSHIP:['AMERICANLEADERSHIP'],
  CEDARCITY:['CEDAR'],CEDAR:['CEDAR'],GRANDCOUNTY:['GRAND'],GRAND:['GRAND'],GUNNISON:['GUNNISONVALLEY'],GUNNISONVALLEY:['GUNNISONVALLEY'],
  JUANDIEGOCATHOLIC:['JUANDIEGO'],JUANDIEGO:['JUANDIEGO'],LAYTONCHRISTIANACADEMY:['LAYTONCHRISTIAN'],LAYTONCHRISTIAN:['LAYTONCHRISTIAN'],
  MONUMENTVAL:['MONUMENTVALLEY'],MONUMENTVALLEY:['MONUMENTVALLEY'],MAPLEMTN:['MAPLEMOUNTAIN'],MAPLEMOUNTAIN:['MAPLEMOUNTAIN'],
  UMALEHI:['UTAHMILITARYCAMPWILLIAMSFOOTBALL','UTAHMILITARYCAMPWILLIAMS'],SAINTJOSEPH:['STJOSEPHFOOTBALL','STJOSEPH'],
  DESERETPEAK:['DESERETPEAKFOOTBALL'],WESTFIELD:['WESTFIELDFOOTBALL']
};
const SCHOOL_SLUG_OVERRIDES={
  ALA:'american-leadership',AMERICANLEADERSHIPACADEMY:'american-leadership',AMERICANLEADERSHIP:'american-leadership',
  CEDARCITY:'cedar',CEDAR:'cedar',GRANDCOUNTY:'grand',GRAND:'grand',GUNNISON:'gunnison-valley',GUNNISONVALLEY:'gunnison-valley',
  JUANDIEGOCATHOLIC:'juan-diego',JUANDIEGO:'juan-diego',LAYTONCHRISTIANACADEMY:'layton-christian',LAYTONCHRISTIAN:'layton-christian',
  MONUMENTVAL:'monument-valley',MONUMENTVALLEY:'monument-valley',MAPLEMTN:'maple-mountain',MAPLEMOUNTAIN:'maple-mountain',
  SAINTJOSEPH:'st-joseph',UMALEHI:'utah-military-camp-williams'
};
function keysFor(name){const base=compact(name),out=new Set([base]);for(const k of KEY_ALIASES[base]||[])out.add(k);return out}
function schoolSlug(name){const k=compact(name);return SCHOOL_SLUG_OVERRIDES[k]||slugify(name)}
function humanize(slug){
  let s=clean(slug).replace(/-football$/i,'');
  const suffixes=[['-nev','NV'],['-nevada','NV'],['-hawaii','HI'],['-ariz','AZ'],['-arizona','AZ'],['-idaho','ID'],['-wyo','WY'],['-wyoming','WY'],['-colo','CO'],['-colorado','CO']];
  let state='';for(const [tail,abbr] of suffixes){if(s.endsWith(tail)){s=s.slice(0,-tail.length);state=abbr;break}}
  const name=s.split('-').filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ');
  return state?`${name}, ${state}`:name;
}
function extractGameLinks(html){
  const found=new Map();
  const text=String(html||'').replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
  const re=/(?:href=["']|["'])(https?:\/\/sports\.deseret\.com)?(\/high-school\/football\/game\/(\d{4}-\d{2}-\d{2})\/([^"'?#<>]+?)\/(\d+))(?:[?"'#<]|$)/gi;
  let m;while((m=re.exec(text))){const mm=m[4].match(/^(.+?)-football-vs-(.+?)-football$/i);if(!mm)continue;const url=`${BASE}${m[2]}`;found.set(url,{url,date:m[3],awayKey:compact(mm[1]),homeKey:compact(mm[2]),awaySlug:mm[1],homeSlug:mm[2],gameId:m[5]})}
  return [...found.values()];
}
async function fetchHtml(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; RuralUtahSports/1.0; +https://ruralutahsports.github.io/)'},redirect:'follow'});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}

if(!fs.existsSync('teams-data.json'))throw new Error('teams-data.json not found');
const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
let prior={teams:{}};if(fs.existsSync(OUT)){try{prior=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch{}}
const keyToTeam=new Map();
for(const t of teams){for(const k of keysFor(t.team))keyToTeam.set(k,t.team)}
const display=(key,slug)=>keyToTeam.get(key)||humanize(slug);
const output={season:SEASON,updatedAt:new Date().toISOString(),teams:{}};
let next=0,ok=0,failed=0,scheduled=0;
async function buildOne(t){
  const team=t.team,slug=schoolSlug(team),scheduleUrl=`${BASE}/high-school/school/${slug}/football/scores-schedule`,rosterUrl=`${BASE}/high-school/school/${slug}/football/roster`,statsUrl=`${BASE}/high-school/school/${slug}/football/stats`;
  try{
    const html=await fetchHtml(scheduleUrl),teamKeys=keysFor(team);
    const candidates=extractGameLinks(html).filter(c=>c.date.startsWith(`${SEASON}-`)&&(teamKeys.has(c.awayKey)||teamKeys.has(c.homeKey)));
    const games=candidates.map(c=>({
      date:c.date,
      awayTeam:display(c.awayKey,c.awaySlug),
      homeTeam:display(c.homeKey,c.homeSlug),
      opponent:teamKeys.has(c.awayKey)?display(c.homeKey,c.homeSlug):display(c.awayKey,c.awaySlug),
      site:teamKeys.has(c.awayKey)?'away':'home',
      gameUrl:c.url,
      gameId:c.gameId
    })).sort((a,b)=>a.date.localeCompare(b.date)||a.gameId.localeCompare(b.gameId));
    output.teams[team]={team,deseretSlug:slug,scheduleUrl,rosterUrl,statsUrl,schedule:games};
    ok++;scheduled+=games.length;
  }catch(err){
    failed++;console.warn(`${team}: ${err.message}`);
    const old=prior?.teams?.[team];
    output.teams[team]=old?{...old,team,deseretSlug:slug,scheduleUrl,rosterUrl,statsUrl}:{team,deseretSlug:slug,scheduleUrl,rosterUrl,statsUrl,schedule:[]};
  }
}
async function worker(){while(true){const i=next++;if(i>=teams.length)return;await buildOne(teams[i])}}
await Promise.all(Array.from({length:Math.min(8,teams.length)},()=>worker()));
output.summary={teams:teams.length,successfulFetches:ok,failedFetches:failed,totalTeamScheduleEntries:scheduled,teamsWithGames:Object.values(output.teams).filter(x=>x.schedule?.length).length};
fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');
console.log(`Deseret team data: ${ok}/${teams.length} pages fetched; ${output.summary.teamsWithGames} teams with 2026 schedules; ${scheduled} team schedule entries.`);
if(ok<Math.max(20,Math.floor(teams.length*.5)))throw new Error(`Too many Deseret team page failures: ${failed}/${teams.length}`);
