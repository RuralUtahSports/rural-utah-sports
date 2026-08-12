import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const n=v=>{const s=clean(v);if(!s)return null;const x=Number(s);return Number.isFinite(x)?x:null};
const dateStamp=v=>{const d=new Date(clean(v));return Number.isFinite(d.getTime())?d.getTime():0};
function parseCSV(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const teamByNorm=new Map(teams.map(t=>[norm(t.team),t.team]));
const aliases={
  GUNNISON:'GUNNISON VALLEY',MAPLEMTN:'MAPLE MOUNTAIN',MONUMENTVAL:'MONUMENT VAL',MONUMENTVALLEY:'MONUMENT VAL',
  AMERFORK:'AMERICAN FORK',CEDAR:'CEDAR CITY',WASATCHACAD:'WASATCH ACADEMY'
};
const resolve=v=>teamByNorm.get(norm(v))||aliases[norm(v)]||'';
const feature=Object.fromEntries(teams.map(t=>[t.team,t]));

const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const WEEKLY_GID=process.env.WEEKLY_GID||'1211467999';
const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${WEEKLY_GID}&range=${encodeURIComponent('A1:K1000')}`;
const res=await fetch(url);if(!res.ok)throw new Error(`Weekly Simulation download failed: ${res.status}`);
const rows=parseCSV(await res.text()).slice(1).filter(r=>clean(r[1])&&clean(r[2]));

// Include every current Utah team immediately, even before that school appears on the weekly sheet.
const st={};
for(const t of teams){
  const name=t.team;
  st[name]={team:name,classification:clean(t.classification),region:clean(t.region),backgroundColor:clean(t.backgroundColor),textColor:clean(t.textColor),wins:0,losses:0,ties:0,regionWins:0,regionLosses:0,regionTies:0,pointsFor:0,pointsAgainst:0,results:[]};
}

function apply(name,pf,pa,date,isRegion){const x=st[name];if(!x)return;x.pointsFor+=pf;x.pointsAgainst+=pa;let result='T';if(pf>pa){x.wins++;result='W';if(isRegion)x.regionWins++}else if(pf<pa){x.losses++;result='L';if(isRegion)x.regionLosses++}else{x.ties++;if(isRegion)x.regionTies++}x.results.push({date,result})}
let completed=0;
for(const r of rows){const aa=n(r[7]),ah=n(r[8]);if(aa===null||ah===null)continue;const a=resolve(r[1]),h=resolve(r[2]);if(!a&&!h)continue;completed++;const sameRegion=!!(a&&h&&st[a]&&st[h]&&st[a].classification===st[h].classification&&st[a].region&&st[a].region===st[h].region);if(a)apply(a,aa,ah,r[0],sameRegion);if(h)apply(h,ah,aa,r[0],sameRegion)}
for(const x of Object.values(st)){x.results.sort((a,b)=>dateStamp(a.date)-dateStamp(b.date));let streak='—';if(x.results.length){const last=x.results.at(-1).result;let count=0;for(let i=x.results.length-1;i>=0&&x.results[i].result===last;i--)count++;streak=last+count}x.streak=streak;delete x.results}
const wp=x=>{const g=x.wins+x.losses+x.ties;return g?(x.wins+x.ties*.5)/g:0};
const rwp=x=>{const g=x.regionWins+x.regionLosses+x.regionTies;return g?(x.regionWins+x.regionTies*.5)/g:0};
const diff=x=>x.pointsFor-x.pointsAgainst;
const overallSort=(a,b)=>wp(b)-wp(a)||(b.wins-a.wins)||diff(b)-diff(a)||a.team.localeCompare(b.team);
const regionSort=(a,b)=>rwp(b)-rwp(a)||(b.regionWins-a.regionWins)||wp(b)-wp(a)||diff(b)-diff(a)||a.team.localeCompare(b.team);
const byClassification={},byRegion={};
for(const x of Object.values(st)){(byClassification[x.classification]??=[]).push(x);byRegion[x.classification]??={};(byRegion[x.classification][x.region||'Independent']??=[]).push(x)}
for(const a of Object.values(byClassification))a.sort(overallSort);
for(const groups of Object.values(byRegion))for(const a of Object.values(groups))a.sort(regionSort);
const out={season:2026,updatedAt:new Date().toISOString(),summary:{scheduledGames:rows.length,completedGames:completed,teams:Object.keys(st).length},byClassification,byRegion};
fs.writeFileSync('standings-2026.json',JSON.stringify(out));
for(const name of ['MONTICELLO','MONUMENT VAL','PANGUITCH','GRAND']){if(!st[name])throw new Error(`${name} missing from standings`)}
console.log(`Standings: ${Object.keys(st).length} teams, ${completed}/${rows.length} games complete`);
console.log('8-player teams:',(byClassification['8P']||[]).map(x=>x.team).join(', '));
