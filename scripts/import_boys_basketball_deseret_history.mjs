import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
const BASE='https://sports.deseret.com';
const TEAM_FILE='boys-basketball-teams.json';
const END_YEAR=Number(process.argv[2]||2003);
if(!Number.isInteger(END_YEAR)||END_YEAR<1900||END_YEAR>2100)throw new Error('Pass the season ending year, such as 2003.');
const START_YEAR=END_YEAR-1;
const SEASON=`${START_YEAR}-${String(END_YEAR).slice(-2)}`;
const OUTPUT=`boys-basketball-games-${SEASON}.json`;
const REPORT=`boys-basketball-results-import-report-${SEASON}.json`;
const MAX_CONCURRENCY=4;

const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slugify=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const SLUG_OVERRIDES={
  ALA:'american-leadership',
  AMERICANLEADERSHIPACADEMY:'american-leadership',
  AMERICANLEADERSHIP:'american-leadership',
  GRANDCOUNTY:'grand',
  GRAND:'grand',
  GUNNISONVALLEY:'gunnison-valley',
  GUNNISON:'gunnison-valley',
  JUANDIEGO:'juan-diego',
  JUANDIEGOCATHOLIC:'juan-diego',
  LAYTONCHRISTIANACADEMY:'layton-christian',
  LAYTONCHRISTIAN:'layton-christian',
  MAESERPREPACADEMY:'maeser-prep',
  MONUMENTVALLEY:'monument-valley',
  MONUMENTVAL:'monument-valley',
  SAINTJOSEPH:'st-joseph',
  STJOSEPH:'st-joseph',
  AMERICANPREPWV:'american-prep-west-valley',
  UMAHILLFIELD:'utah-military-hillfield',
  UMACAMPWILLIAMS:'utah-military-camp-williams'
};

const CANON={
  ALA:'AMERICANLEADERSHIP',
  CEDAR:'CEDARCITY',
  AMERICANLEADERSHIPACADEMY:'AMERICANLEADERSHIP',
  GRANDCOUNTY:'GRAND',
  GUNNISON:'GUNNISONVALLEY',
  JUANDIEGOCATHOLIC:'JUANDIEGO',
  LAYTONCHRISTIANACADEMY:'LAYTONCHRISTIAN',
  MAESERPREPACADEMY:'MAESERPREP',
  MONUMENTVAL:'MONUMENTVALLEY',
  SAINTJOSEPH:'STJOSEPH',
  UMACAMPWILLIAMS:'UTAHMILITARYCAMPWILLIAMS',
  UMAHILLFIELD:'UTAHMILITARYHILLFIELD'
};
const canon=v=>CANON[compact(v)]||compact(v);
const schoolSlug=v=>SLUG_OVERRIDES[compact(v)]||slugify(v);

function nextData(html){
  const match=String(html||'').match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match)return null;
  try{return JSON.parse(match[1])}catch{return null}
}

function denverDate(value){
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function browserPath(){
  return ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p))||'';
}

async function browserDump(url){
  const browser=browserPath();
  if(!browser)throw new Error('Chrome/Chromium is not available.');
  const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'rus-deseret-basketball-'));
  const u=new URL(url);
  u.searchParams.set('_rus_history',Date.now().toString());
  try{
    const {stdout}=await execFileAsync(browser,[
      '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
      '--disable-background-networking','--disable-extensions','--no-first-run',
      '--disable-default-apps','--mute-audio','--window-size=1280,800',
      `--user-data-dir=${userDir}`,'--virtual-time-budget=5500','--dump-dom',u.toString()
    ],{encoding:'utf8',timeout:35000,maxBuffer:20*1024*1024});
    if(!clean(stdout))throw new Error('Browser returned empty DOM.');
    if(stdout.includes('Please contact the site owner for access'))throw new Error('Deseret blocked browser page.');
    return stdout;
  }finally{
    try{fs.rmSync(userDir,{recursive:true,force:true})}catch{}
  }
}

function rosterId(side){
  return Number(side?._id);
}

function periodsFor(game,side){
  const id=rosterId(side);
  if(!Number.isFinite(id))return [];
  return (Array.isArray(game?.periodScores)?game.periodScores:[])
    .filter(p=>Number(p?.roster?._id)===id&&Number.isFinite(Number(p?.period))&&Number.isFinite(Number(p?.points)))
    .sort((a,b)=>Number(a.period)-Number(b.period))
    .map(p=>({period:Number(p.period),points:Number(p.points)}));
}

function parseTeamPage(html,targetName,url){
  const data=nextData(html);
  const page=data?.props?.pageProps;
  if(!page)throw new Error('Deseret __NEXT_DATA__ pageProps not found.');
  const selected=Number(page.selectedYear?.year??page.selectedYear??0);
  if(selected&&selected!==END_YEAR)throw new Error(`Deseret returned season ${selected}, expected ${END_YEAR}.`);

  const pageTeam=page.team;
  const pageName=clean(pageTeam?.school?.name||pageTeam?.name);
  if(pageName&&canon(pageName)!==canon(targetName)){
    throw new Error(`Deseret slug resolved to ${pageName}, not ${targetName}.`);
  }
  const teamSlug=clean(pageTeam?.slug);
  const games=[];
  const skippedTiedFinals=[];

  for(const game of Array.isArray(page.previousMatchupGames)?page.previousMatchupGames:[]){
    if(clean(game?.status).toLowerCase()!=='done')continue;
    const home=game?.home;
    const visitor=game?.visitor;
    const homeSlug=clean(home?.team?.slug);
    const visitorSlug=clean(visitor?.team?.slug);
    const isHome=teamSlug&&homeSlug===teamSlug;
    const isAway=teamSlug&&visitorSlug===teamSlug;
    if(!isHome&&!isAway)continue;

    const teamSide=isHome?home:visitor;
    const oppSide=isHome?visitor:home;
    const teamScore=Number(isHome?game.homeScore:game.visitorScore);
    const opponentScore=Number(isHome?game.visitorScore:game.homeScore);
    const date=denverDate(game.date);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(teamScore)||!Number.isFinite(opponentScore))continue;
    if(teamScore===0&&opponentScore===0)continue;
    if(teamScore===opponentScore){
      skippedTiedFinals.push({date,opponent:clean(oppSide?.team?.name),teamScore,opponentScore,gameId:game?._id??null});
      continue;
    }

    const opponent=clean(oppSide?.team?.name||oppSide?.team?.school?.name);
    const opponentState=clean(oppSide?.team?.school?.state).toUpperCase();
    const oppSchoolSlug=clean(oppSide?.team?.school?.slug);
    const result=teamScore>opponentScore?'W':'L';
    const row={
      date,
      opponent,
      opponentState,
      opponentUrl:oppSchoolSlug?`${BASE}/high-school/school/${oppSchoolSlug}/boys-basketball/scores-schedule/${END_YEAR}`:'',
      result,
      teamScore,
      opponentScore,
      location:isHome?'Home':'Away',
      deseretGameId:game?._id??null,
      tournament:clean(game?.tournament),
      teamPeriodScores:periodsFor(game,teamSide),
      opponentPeriodScores:periodsFor(game,oppSide)
    };
    games.push(row);
  }

  const deduped=new Map();
  for(const game of games){
    const key=[game.date,canon(game.opponent),game.teamScore,game.opponentScore].join('|');
    deduped.set(key,game);
  }
  const finalGames=[...deduped.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.opponent.localeCompare(b.opponent));
  const record={wins:0,losses:0,ties:0,games:finalGames.length};
  for(const game of finalGames){if(game.result==='W')record.wins++;else if(game.result==='L')record.losses++;}

  return {
    status:finalGames.length?'available':'no-results',
    schoolName:pageName||targetName,
    sourceUrl:url,
    record,
    games:finalGames,
    skippedTiedFinals
  };
}

const teams=JSON.parse(fs.readFileSync(TEAM_FILE,'utf8')).filter(t=>t.association==='UHSAA'||t.team==='Utah Prep');
const results={};
const failures=[];
let next=0;
let fetched=0;
let blocked=0;

async function buildOne(info){
  const slug=schoolSlug(info.team);
  const url=`${BASE}/high-school/school/${slug}/boys-basketball/scores-schedule/${END_YEAR}`;
  try{
    const html=await browserDump(url);
    const parsed=parseTeamPage(html,info.team,url);
    results[info.team]=parsed;
    fetched++;
    console.log(`${info.team}: ${parsed.games.length} completed results`);
  }catch(error){
    const message=error?.message||String(error);
    if(message.includes('blocked'))blocked++;
    results[info.team]={status:'error',sourceUrl:url,error:message,record:{wins:0,losses:0,ties:0,games:0},games:[]};
    failures.push({team:info.team,error:message,sourceUrl:url});
    console.warn(`${info.team}: ${message}`);
  }
}

async function worker(){
  while(true){
    const i=next++;
    if(i>=teams.length)return;
    await buildOne(teams[i]);
  }
}
await Promise.all(Array.from({length:Math.min(MAX_CONCURRENCY,teams.length)},()=>worker()));

const ordered=Object.fromEntries(Object.entries(results).sort(([a],[b])=>a.localeCompare(b)));
const tiedFinals=Object.entries(ordered).flatMap(([team,row])=>(row.skippedTiedFinals||[]).map(g=>({team,...g})));
for(const row of Object.values(ordered))delete row.skippedTiedFinals;

const payload={
  schemaVersion:1,
  season:SEASON,
  updatedAt:new Date().toISOString(),
  source:'Deseret News boys basketball team schedule pages',
  summary:{
    teams:teams.length,
    withResults:Object.values(ordered).filter(t=>t.status==='available').length,
    completedGames:Object.values(ordered).reduce((n,t)=>n+(t.games||[]).length,0),
    failures:failures.length,
    skippedTiedFinals:tiedFinals.length
  },
  teams:ordered
};
fs.writeFileSync(OUTPUT,JSON.stringify(payload,null,2)+'\n');
fs.writeFileSync(REPORT,JSON.stringify({
  season:SEASON,
  checkedAt:new Date().toISOString(),
  teamCount:teams.length,
  fetched,
  blocked,
  completedGames:payload.summary.completedGames,
  failures,
  skippedTiedFinals:tiedFinals,
  teams:Object.fromEntries(Object.entries(ordered).map(([name,row])=>[name,{status:row.status,games:(row.games||[]).length,record:row.record||null,sourceUrl:row.sourceUrl||'',error:row.error||''}]))
},null,2)+'\n');

console.log(`${SEASON} Deseret basketball import: ${fetched}/${teams.length} pages parsed; ${payload.summary.completedGames} team results; ${failures.length} page failures; ${tiedFinals.length} tied-score finals skipped.`);
if(fetched<Math.max(60,Math.floor(teams.length*.45)))throw new Error(`Too few Deseret team pages fetched: ${fetched}/${teams.length}`);
