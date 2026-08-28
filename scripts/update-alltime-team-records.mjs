import fs from 'node:fs';

const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const CLEAN_GAMES_GID=process.env.CLEAN_GAMES_GID||'627882418';
const RANGE='A1:F50000';
const CURRENT_SEASON=2026;
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).replace(/\s+/g,' ').toUpperCase().replace(/\.+$/,'').trim();
const aliases={
  'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY','CEDAR':'CEDAR CITY',
  'SUMMIT':'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY','HINKLEY':'HINCKLEY',
  'BY HIGH':'BYH','BRIGHAM YOUNG':'BYH','AMERICAN LEADERSHIP':'ALA','AMERICAN LEADERSHIP ACADEMY':'ALA',
  'AMRICAN FORK':'AMERICAN FORK','DESERET HILLS':'DESERT HILLS','MOUNUMENT VALLEY':'MONUMENT VALLEY','MONTUMENT VALLEY':'MONUMENT VALLEY',
  'MONUMENT VAL':'MONUMENT VALLEY'
};
const teamName=v=>{const n=norm(v);if(n.startsWith('WASATCH ACAD'))return'WASATCH ACADEMY';return aliases[n]||n};
const num=v=>{const n=Number(clean(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
function parseCSV(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}
function yearOf(v){const s=clean(v),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?Number(m[3]):null}

if(!fs.existsSync('teams-data.json'))throw new Error('teams-data.json missing');
if(!fs.existsSync('standings-2026.json'))throw new Error('standings-2026.json missing');
const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
const website=new Set(teams.map(t=>teamName(t.team)));
const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CLEAN_GAMES_GID}&range=${encodeURIComponent(RANGE)}`;
const res=await fetch(url);if(!res.ok)throw new Error(`Clean Games download failed: ${res.status}`);
const rows=parseCSV(await res.text());
const stats={};for(const t of website)stats[t]={wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0,seasons:new Set()};
const seen=new Set();let used=0,dupes=0;

const apply=(t,pf,pa,year)=>{const s=stats[t];if(!s)return;s.games++;s.pointsFor+=pf;s.pointsAgainst+=pa;s.seasons.add(year);if(pf>pa)s.wins++;else if(pf<pa)s.losses++;else s.ties++};

// Historical source of truth: Clean Games through the end of 2025.
// Current-season rows are deliberately excluded here so a 2026 game can never
// be counted twice after it is later copied into Clean Games.
for(const r of rows.slice(1)){
  const date=clean(r[0]),a=teamName(r[1]),b=teamName(r[2]),sa=num(r[3]),sb=num(r[4]),year=yearOf(date);
  if(!date||!a||!b||a===b||sa===null||sb===null||!year||year>=CURRENT_SEASON)continue;
  const pair=[a,b].sort().join('|'),key=`${date}|${pair}`;
  if(seen.has(key)){dupes++;continue}seen.add(key);used++;
  apply(a,sa,sb,year);apply(b,sb,sa,year);
}

// Count 2026 directly from the finalized game list. This is the most durable
// current-season source because it does not depend on a classification/region
// summary being present or on a team being placed in the correct group first.
const currentSeen=new Set();
const current={};
let currentGames=0,currentDupes=0;
const applyCurrent=(t,pf,pa)=>{
  if(!stats[t])return;
  apply(t,pf,pa,CURRENT_SEASON);
  const s=current[t]||(current[t]={wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0});
  s.games++;s.pointsFor+=pf;s.pointsAgainst+=pa;
  if(pf>pa)s.wins++;else if(pf<pa)s.losses++;else s.ties++;
};
for(const game of standings.games||[]){
  const date=clean(game.date),a=teamName(game.awayTeam),h=teamName(game.homeTeam),sa=num(game.actualAway),sh=num(game.actualHome);
  if(!date||!a||!h||a===h||sa===null||sh===null)continue;
  const pair=[a,h].sort().join('|'),key=`${date}|${pair}`;
  if(currentSeen.has(key)){currentDupes++;continue}currentSeen.add(key);currentGames++;
  applyCurrent(a,sa,sh);applyCurrent(h,sh,sa);
}

let changed=0;
for(const team of teams){
  const key=teamName(team.team),s=stats[key];if(!s)continue;
  const next={
    wins:s.wins,losses:s.losses,ties:s.ties,games:s.games,
    winPct:s.games?(s.wins+s.ties*.5)/s.games:0,
    pointsFor:s.pointsFor,pointsAgainst:s.pointsAgainst,
    avgMargin:s.games?(s.pointsFor-s.pointsAgainst)/s.games:0,
    seasons:s.seasons.size
  };
  let different=false;for(const [k,v] of Object.entries(next))if(Number(team[k])!==Number(v)){different=true;break}
  Object.assign(team,next);if(different)changed++;
}

// Sanity check the first-year program that originally exposed this stale-record
// failure. Once it has a 2026 final, its all-time game count must exceed 2025's 10.
const deseretPeak=teams.find(t=>teamName(t.team)==='DESERET PEAK');
const dp2026=current['DESERET PEAK'];
if(deseretPeak&&dp2026&&dp2026.games>0&&Number(deseretPeak.games)<10+dp2026.games){
  throw new Error(`DESERET PEAK all-time record did not absorb 2026 results: ${deseretPeak.wins}-${deseretPeak.losses}-${deseretPeak.ties}`);
}

fs.writeFileSync('teams-data.json',JSON.stringify(teams));
console.log(`All-time records rebuilt from ${used} unique pre-${CURRENT_SEASON} Clean Games + ${currentGames} finalized ${CURRENT_SEASON} games for ${Object.keys(current).length} site teams; ${dupes} historical and ${currentDupes} current duplicates skipped; ${changed} team summaries changed.`);
