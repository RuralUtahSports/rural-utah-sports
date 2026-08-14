import fs from 'node:fs';

const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const CLEAN_GAMES_GID=process.env.CLEAN_GAMES_GID||'627882418';
const RANGE='A1:F50000';
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).replace(/\s+/g,' ').toUpperCase().replace(/\.+$/,'').trim();
const aliases={
  'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY','CEDAR':'CEDAR CITY',
  'SUMMIT':'SUMMIT ACADEMY','WASATCH ACAD':'WASATCH ACADEMY','WASATCH ACAD.':'WASATCH ACADEMY','HINKLEY':'HINCKLEY',
  'BY HIGH':'BYH','BRIGHAM YOUNG':'BYH','AMERICAN LEADERSHIP':'ALA','AMERICAN LEADERSHIP ACADEMY':'ALA',
  'AMRICAN FORK':'AMERICAN FORK','DESERET HILLS':'DESERT HILLS','MOUNUMENT VALLEY':'MONUMENT VALLEY','MONTUMENT VALLEY':'MONUMENT VALLEY'
};
const teamName=v=>{const n=norm(v);if(n.startsWith('WASATCH ACAD'))return'WASATCH ACADEMY';return aliases[n]||n};
const num=v=>{const n=Number(clean(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
function parseCSV(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}
function yearOf(v){const s=clean(v),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?Number(m[3]):null}

if(!fs.existsSync('teams-data.json'))throw new Error('teams-data.json missing');
const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const website=new Set(teams.map(t=>teamName(t.team)));
const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CLEAN_GAMES_GID}&range=${encodeURIComponent(RANGE)}`;
const res=await fetch(url);if(!res.ok)throw new Error(`Clean Games download failed: ${res.status}`);
const rows=parseCSV(await res.text());
const stats={};for(const t of website)stats[t]={wins:0,losses:0,ties:0,games:0,pointsFor:0,pointsAgainst:0,seasons:new Set()};
const seen=new Set();let used=0,dupes=0;
for(const r of rows.slice(1)){
  const date=clean(r[0]),a=teamName(r[1]),b=teamName(r[2]),sa=num(r[3]),sb=num(r[4]),year=yearOf(date);
  if(!date||!a||!b||a===b||sa===null||sb===null||!year)continue;
  const pair=[a,b].sort().join('|'),key=`${date}|${pair}`;
  if(seen.has(key)){dupes++;continue}seen.add(key);used++;
  const apply=(t,pf,pa)=>{const s=stats[t];if(!s)return;s.games++;s.pointsFor+=pf;s.pointsAgainst+=pa;s.seasons.add(year);if(pf>pa)s.wins++;else if(pf<pa)s.losses++;else s.ties++};
  apply(a,sa,sb);apply(b,sb,sa);
}
let changed=0;
for(const team of teams){const key=teamName(team.team),s=stats[key];if(!s||!s.games)continue;const next={wins:s.wins,losses:s.losses,ties:s.ties,games:s.games,winPct:(s.wins+s.ties*.5)/s.games,pointsFor:s.pointsFor,pointsAgainst:s.pointsAgainst,avgMargin:(s.pointsFor-s.pointsAgainst)/s.games,seasons:s.seasons.size};let different=false;for(const [k,v] of Object.entries(next))if(Number(team[k])!==Number(v)){different=true;break}Object.assign(team,next);if(different)changed++}
fs.writeFileSync('teams-data.json',JSON.stringify(teams));
console.log(`All-time records rebuilt from ${used} unique Clean Games; ${dupes} duplicate rows skipped; ${changed} team summaries changed.`);
