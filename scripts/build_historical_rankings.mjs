import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const CURRENT_SEASON=2026;
const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const CLEAN_GAMES_GID=process.env.CLEAN_GAMES_GID||'627882418';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).replace(/\s+/g,' ').toUpperCase();
const num=v=>{const s=clean(v).replace(/,/g,'');if(s==='')return null;const n=Number(s);return Number.isFinite(n)?n:null};

// Keep the historical rankings on the same canonical school names used by
// the verified ELO rebuild. These aliases only normalize names; they do not
// determine whether a team is eligible for the Utah rankings.
const aliases={
  'GUNNISON':'GUNNISON VALLEY',
  'MAPLE MTN':'MAPLE MOUNTAIN',
  'MONUMENT VAL':'MONUMENT VALLEY',
  'CEDAR':'CEDAR CITY',
  'SUMMIT':'SUMMIT ACADEMY',
  'WASATCH ACAD':'WASATCH ACADEMY',
  'WASATCH ACAD.':'WASATCH ACADEMY',
  'HINKLEY':'HINCKLEY',
  'BY HIGH':'BYH',
  'BRIGHAM YOUNG':'BYH',
  'AMERICAN LEADERSHIP':'ALA',
  'AMERICAN LEADERSHIP ACADEMY':'ALA',
  'AMRICAN FORK':'AMERICAN FORK',
  'DESERET HILLS':'DESERT HILLS',
  'MOUNUMENT VALLEY':'MONUMENT VALLEY',
  'MONTUMENT VALLEY':'MONUMENT VALLEY',
  'MOAPA VALLEY(NV)':'MOAPA VALLEY (NV)',
  'VIRGIN VAL (NV)':'VIRGIN VALLEY (NV)',
  'VIRGIN VALLEY (NV))':'VIRGIN VALLEY (NV)',
  'BOULDER CITY(NV)':'BOULDER CITY (NV)',
  'HIGHLAND, ID':'HIGHLAND (ID)',
  'MARSH VALLEY(ID)':'MARSH VALLEY (ID)',
  'ONEIDA ACAD.(ID)':'ONEIDA ACADEMY (ID)',
  'RAYMOND, ALBERTA':'RAYMOND (ALBERTA)',
  'ST LOUIS (HI)':'ST. LOUIS (HI)',
  'CROWNPOINT (NM)':'CROWN POINT (NM)',
  'KIRKLAND (NM)':'KIRTLAND (NM)',
  'MTN CREST JV':'MOUNTAIN CREST JV',
  'EAST HIGH 2ND TEAM':'EAST 2ND TEAM',
  'WEST HIGH 2ND TEAM':'WEST 2ND TEAM',
  'LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN',
  'UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI',
  'UMA CAMP WILLIAMS':'UMA-LEHI'
};
function teamName(v){
  const n=norm(v).replace(/\.+$/,'').trim();
  if(n.startsWith('WASATCH ACAD'))return 'WASATCH ACADEMY';
  return aliases[n]||n;
}

function parseDate(v){
  const s=clean(v);
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m){
    const x=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(x)m=[x[0],x[2],x[3],x[1]];
  }
  if(!m)return null;
  const year=+m[3],month=+m[1],day=+m[2];
  return {year,month,day,key:year*10000+month*100+day,ms:Date.UTC(year,month-1,day),iso:`${m[3]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`};
}

function parseCSV(text){
  const rows=[];
  let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"')quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  return rows;
}

const pair=(a,b)=>[a,b].sort().join('|');
const sig=(a,sa,b,sb)=>[[a,sa],[b,sb]].sort((x,y)=>x[0].localeCompare(y[0])).map(x=>`${x[0]}:${x[1]}`).join('|');

// Match the historical corrections already enforced by the verified ELO
// builder, so the two site features are based on the same clean game set.
const verifiedBadScores=new Set([
  '2003-10-10|ALTAMONT|RICH|ALTAMONT:48|RICH:6',
  '2001-09-21|GUNNISON VALLEY|JUAB|GUNNISON VALLEY:19|JUAB:14',
  '1998-08-28|GUNNISON VALLEY|NORTH SEVIER|GUNNISON VALLEY:30|NORTH SEVIER:13',
  '2001-09-07|GUNNISON VALLEY|KANAB|GUNNISON VALLEY:16|KANAB:20',
  '2001-10-18|GUNNISON VALLEY|MANTI|GUNNISON VALLEY:39|MANTI:12',
  '2005-09-02|GUNNISON VALLEY|RICHFIELD|GUNNISON VALLEY:27|RICHFIELD:7',
  '2014-09-12|GUNNISON VALLEY|LAYTON CHRISTIAN|GUNNISON VALLEY:20|LAYTON CHRISTIAN:47',
  '2024-10-18|GUNNISON VALLEY|MILLARD|GUNNISON VALLEY:41|MILLARD:6',
  '2008-10-31|ENTERPRISE|RICH|ENTERPRISE:21|RICH:46',
  '2022-09-30|MONTICELLO|MONUMENT VALLEY|MONTICELLO:41|MONUMENT VALLEY:20'
]);
function verifiedBadKey(date,a,b,sa,sb){
  const d=parseDate(date);
  return d?`${d.iso}|${pair(a,b)}|${sig(a,sa,b,sb)}`:'';
}
function knownBad(date,a,b,sa,sb){
  const p=pair(a,b),s=sig(a,sa,b,sb);
  if(date==='9/19/2025'&&p==='MONUMENT VALLEY|PANGUITCH')return true;
  if(date==='10/18/2024'&&p==='COPPER HILLS|WESTLAKE'&&s==='COPPER HILLS:26|WESTLAKE:41')return true;
  return verifiedBadScores.has(verifiedBadKey(date,a,b,sa,sb));
}

function readJSON(file,fallback){
  try{return JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));}
  catch{return fallback;}
}

// Current teams provide branding only. Eligibility is broader: the old
// Greatest Seasons catalog supplies historical/defunct Utah programs, while
// current teams and the 2025 alignment make sure newer programs are included.
const currentTeams=readJSON('teams-data.json',[]);
const brandLookup=new Map();
const eligibleUtahTeams=new Set();
for(const row of currentTeams){
  const name=teamName(row?.team);
  if(!name)continue;
  eligibleUtahTeams.add(name);
  brandLookup.set(name,{
    backgroundColor:clean(row?.backgroundColor),
    textColor:clean(row?.textColor)
  });
}

const greatestSeasons=readJSON('greatest-seasons-data-v2.json',[]);
for(const row of Array.isArray(greatestSeasons)?greatestSeasons:[]){
  const name=teamName(row?.Team);
  if(name)eligibleUtahTeams.add(name);
}

const alignment=readJSON('full-season-alignment-2025.json',{});
for(const region of alignment?.regions||[]){
  for(const raw of region?.teams||[]){
    const name=teamName(raw);
    if(name)eligibleUtahTeams.add(name);
  }
}

const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CLEAN_GAMES_GID}&range=${encodeURIComponent('A1:F50000')}`;
const response=await fetch(url);
if(!response.ok)throw new Error(`Clean Games download failed ${response.status}`);
const rows=parseCSV(await response.text());

let sourceRows=0,knownCorrectionsRemoved=0,duplicatesRemoved=0,conflictingDuplicates=0;
const candidates=[];
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  const date=clean(r[0]),d=parseDate(date),a=teamName(r[1]),b=teamName(r[2]),sa=num(r[3]),sb=num(r[4]);
  if(!d||d.year>=CURRENT_SEASON||!a||!b||a===b||sa===null||sb===null)continue;
  if(knownBad(date,a,b,sa,sb)){knownCorrectionsRemoved++;continue;}
  sourceRows++;
  candidates.push({date,d,a,b,sa,sb,index:i,pair:pair(a,b),sig:sig(a,sa,b,sb)});
}

// Use the same exact/near-duplicate policy as the verified historical ELO.
candidates.sort((x,y)=>x.d.ms-y.d.ms||x.index-y.index);
const exact=new Map(),lastSig=new Map(),games=[];
for(const g of candidates){
  const k=`${g.d.iso}|${g.pair}`;
  const prior=exact.get(k);
  if(prior){
    duplicatesRemoved++;
    if(prior.sig!==g.sig)conflictingDuplicates++;
    continue;
  }
  const sk=`${g.pair}|${g.sig}`;
  const near=lastSig.get(sk);
  if(near&&g.d.ms>near.d.ms&&(g.d.ms-near.d.ms)<=3*86400000){
    duplicatesRemoved++;
    continue;
  }
  exact.set(k,g);
  lastSig.set(sk,g);
  games.push(g);
}
games.sort((x,y)=>x.d.key-y.d.key||x.index-y.index);

const seasonStats=new Map();
const schedules=new Map();
const seasonKey=(year,team)=>`${year}||${team}`;
function getStats(year,team){
  const key=seasonKey(year,team);
  if(!seasonStats.has(key))seasonStats.set(key,{team,year,wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0});
  return seasonStats.get(key);
}
function addSchedule(year,team,row){
  const key=seasonKey(year,team);
  if(!schedules.has(key))schedules.set(key,[]);
  schedules.get(key).push(row);
}

for(const g of games){
  const a=getStats(g.d.year,g.a),b=getStats(g.d.year,g.b);
  a.games++;b.games++;
  a.pointsFor+=g.sa;a.pointsAgainst+=g.sb;
  b.pointsFor+=g.sb;b.pointsAgainst+=g.sa;
  if(g.sa>g.sb){a.wins++;b.losses++;}
  else if(g.sa<g.sb){a.losses++;b.wins++;}
  else{a.ties++;b.ties++;}
  addSchedule(g.d.year,g.a,{opponent:g.b,teamPoints:g.sa,opponentPoints:g.sb});
  addSchedule(g.d.year,g.b,{opponent:g.a,teamPoints:g.sb,opponentPoints:g.sa});
}

function adjustedOpponentRecord(record,teamPoints,opponentPoints){
  if(!record)return null;
  let wins=record.wins,losses=record.losses,ties=record.ties;
  // teamPoints are from the perspective of the team whose schedule we are
  // evaluating. Remove that game's result from the opponent's season record.
  if(teamPoints>opponentPoints){if(losses>0)losses--;}
  else if(teamPoints<opponentPoints){if(wins>0)wins--;}
  else if(ties>0)ties--;
  return {wins,losses,ties,games:wins+losses+ties};
}

function opponentWinPctFor(year,team){
  const schedule=schedules.get(seasonKey(year,team))||[];
  let wins=0,losses=0,ties=0,found=0;
  for(const game of schedule){
    const opponentRecord=seasonStats.get(seasonKey(year,game.opponent));
    const adjusted=adjustedOpponentRecord(opponentRecord,game.teamPoints,game.opponentPoints);
    if(!adjusted||adjusted.games<=0)continue;
    wins+=adjusted.wins;losses+=adjusted.losses;ties+=adjusted.ties;found++;
  }
  const total=wins+losses+ties;
  return total>0&&found>0?(wins+ties*.5)/total:null;
}

function opponentsOpponentWinPctFor(year,team){
  const schedule=schedules.get(seasonKey(year,team))||[];
  const firstLevelOpponents=new Set(schedule.map(g=>g.opponent).filter(Boolean));
  let wins=0,losses=0,ties=0,found=0;
  for(const firstOpponent of firstLevelOpponents){
    const opponentSchedule=schedules.get(seasonKey(year,firstOpponent))||[];
    for(const secondGame of opponentSchedule){
      if(secondGame.opponent===team)continue;
      const secondRecord=seasonStats.get(seasonKey(year,secondGame.opponent));
      const adjusted=adjustedOpponentRecord(secondRecord,secondGame.teamPoints,secondGame.opponentPoints);
      if(!adjusted||adjusted.games<=0)continue;
      wins+=adjusted.wins;losses+=adjusted.losses;ties+=adjusted.ties;found++;
    }
  }
  const total=wins+losses+ties;
  return total>0&&found>0?(wins+ties*.5)/total:null;
}

function ratingFor(winPct,avgMargin,sos,games){
  const winningScore=Math.max(0,Math.min(40,winPct*40));
  const cappedMargin=Math.max(0,Math.min(50,avgMargin));
  const dominanceScore=(cappedMargin/50)*30;
  const sosScore=Number.isFinite(sos)?Math.max(0,Math.min(20,sos)):0;
  const seasonLengthScore=Math.min(10,(games/14)*10);
  return winningScore+dominanceScore+sosScore+seasonLengthScore;
}

const seasons=new Map();
const emittedPrograms=new Set();
let seasonRows=0;
for(const record of seasonStats.values()){
  if(record.games<1||!eligibleUtahTeams.has(record.team))continue;
  const winPct=(record.wins+record.ties*.5)/record.games;
  const ppg=record.pointsFor/record.games;
  const papg=record.pointsAgainst/record.games;
  const avgMargin=(record.pointsFor-record.pointsAgainst)/record.games;
  const opponentWinPct=opponentWinPctFor(record.year,record.team);
  const opponentsOpponentWinPct=opponentsOpponentWinPctFor(record.year,record.team);
  const sos=Number.isFinite(opponentWinPct)?opponentWinPct*20:null;
  const rating=ratingFor(winPct,avgMargin,sos,record.games);
  const brand=brandLookup.get(record.team)||{};
  const out={
    team:record.team,
    year:record.year,
    rating,
    wins:record.wins,
    losses:record.losses,
    ties:record.ties,
    winPct,
    games:record.games,
    pointsFor:record.pointsFor,
    pointsAgainst:record.pointsAgainst,
    ppg,
    papg,
    avgMargin,
    opponentWinPct,
    opponentsOpponentWinPct,
    sos,
    backgroundColor:brand.backgroundColor||'',
    textColor:brand.textColor||''
  };
  if(!seasons.has(record.year))seasons.set(record.year,[]);
  seasons.get(record.year).push(out);
  emittedPrograms.add(record.team);
  seasonRows++;
}

// Preserve the established Greatest Seasons ranking order within each year:
// rating, win %, SOS, average margin, then season length.
const sortRows=(a,b)=>{
  if(Math.abs(b.rating-a.rating)>0.000001)return b.rating-a.rating;
  if(b.winPct!==a.winPct)return b.winPct-a.winPct;
  const as=Number.isFinite(a.sos)?a.sos:0,bs=Number.isFinite(b.sos)?b.sos:0;
  if(bs!==as)return bs-as;
  if(b.avgMargin!==a.avgMargin)return b.avgMargin-a.avgMargin;
  if(b.games!==a.games)return b.games-a.games;
  return a.team.localeCompare(b.team);
};

const ordered={};
for(const year of [...seasons.keys()].sort((a,b)=>b-a))ordered[String(year)]=seasons.get(year).sort(sortRows);

const output={
  generatedAt:new Date().toISOString(),
  currentSeason:CURRENT_SEASON,
  source:'Clean Games',
  summary:{
    seasons:Object.keys(ordered).length,
    programs:emittedPrograms.size,
    teamSeasonRows:seasonRows,
    historicalGames:games.length,
    sourceRows,
    duplicatesRemoved,
    knownCorrectionsRemoved,
    conflictingDuplicates
  },
  seasons:ordered
};
fs.writeFileSync(path.join(ROOT,'historical-rankings-data.json'),JSON.stringify(output));
console.log(`Built historical-rankings-data.json from recorded games: ${output.summary.seasons} seasons, ${output.summary.programs} Utah programs, ${seasonRows} team-seasons, ${games.length} historical games`);
console.log(`Clean Games audit: ${sourceRows} source rows, ${duplicatesRemoved} duplicates removed, ${knownCorrectionsRemoved} known corrections removed, ${conflictingDuplicates} conflicting duplicates kept at first occurrence`);

if((alignment?.regions||[]).length){
  const expected=[...new Set((alignment.regions||[]).flatMap(r=>r.teams||[]).map(teamName).filter(Boolean))];
  const expectedSet=new Set(expected);
  const actualList=(ordered['2025']||[]).map(x=>x.team);
  const actual=new Set(actualList);
  const missing=expected.filter(team=>!actual.has(team));
  const extras=actualList.filter(team=>!expectedSet.has(team));
  console.log(`2025 coverage audit: ${actual.size} ranking teams with recorded games; ${expected.length} alignment teams; ${expected.length-missing.length} aligned teams represented.`);
  console.log(`2025 alignment teams with no recorded games: ${missing.length?missing.join(' | '):'none'}`);
  console.log(`2025 Utah ranking teams outside alignment: ${extras.length?extras.join(' | '):'none'}`);
}
