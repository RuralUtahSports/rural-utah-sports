import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const n=v=>{const s=clean(v);if(!s)return null;const x=Number(s);return Number.isFinite(x)?x:null};
const dateStamp=v=>{const d=new Date(clean(v));return Number.isFinite(d.getTime())?d.getTime():0};
const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;const d=new Date(s);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''};
function parseCSV(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const teamByNorm=new Map(teams.map(t=>[norm(t.team),t.team]));
const aliases={
  GUNNISON:'GUNNISON VALLEY',MAPLEMTN:'MAPLE MOUNTAIN',MONUMENTVAL:'MONUMENT VAL',MONUMENTVALLEY:'MONUMENT VAL',
  AMERFORK:'AMERICAN FORK',CEDAR:'CEDAR CITY',WASATCHACAD:'WASATCH ACADEMY'
};
const resolve=v=>teamByNorm.get(norm(v))||aliases[norm(v)]||'';
const gameKey=(date,away,home)=>`${isoDate(date)}|${norm(away)}|${norm(home)}`;

let deseretGames={};
try{deseretGames=JSON.parse(fs.readFileSync('deseret-game-details.json','utf8')).games||{}}catch{}

let weeklyGames=[];
try{weeklyGames=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8')).games||[]}catch{}
const weeklyByKey=new Map(weeklyGames.map(g=>[gameKey(g.date,g.awayTeam,g.homeTeam),g]));

const SHEET_ID=process.env.SHEET_ID||'1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo';
const WEEKLY_GID=process.env.WEEKLY_GID||'1211467999';
const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${WEEKLY_GID}&range=${encodeURIComponent('A1:K1000')}&_rus=${Date.now()}`;
const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error(`Weekly Simulation download failed: ${res.status}`);
const sheetRows=parseCSV(await res.text()).slice(1).filter(r=>clean(r[1])&&clean(r[2]));

// Use the Sheet as the primary schedule, but merge in any site game that
// the Sheet export omitted. A moved game may exist under two dates; treat
// the same home/away matchup within three days as one game and prefer the
// row carrying an authoritative result.
const teamAliases = new Map([
  ['UMALEHI', 'UMALEHI'],
  ['UMACAMPWILLIAMS', 'UMALEHI'],
  ['UTAHMILITARYCAMPWILLIAMS', 'UMALEHI'],
  ['UTAHMILITARYACADEMYCAMPWILLIAMS', 'UMALEHI'],
  ['SAINTJOSEPH', 'SAINTJOSEPH'],
  ['STJOSEPH', 'SAINTJOSEPH']
]);
const canonicalTeam = value => teamAliases.get(norm(value)) || norm(value);
const dayNumber = value => {
  const normalized = isoDate(value);
  const time = normalized ? Date.parse(normalized + 'T12:00:00Z') : NaN;
  return Number.isFinite(time) ? time / 86400000 : null;
};
const sameMovedMatchup = (left, right) => {
  const leftDay = dayNumber(left[0]), rightDay = dayNumber(right[0]);
  return leftDay !== null && rightDay !== null &&
    Math.abs(leftDay - rightDay) <= 3 &&
    canonicalTeam(left[1]) === canonicalTeam(right[1]) &&
    canonicalTeam(left[2]) === canonicalTeam(right[2]);
};
const hasRowScore = row => n(row[7]) !== null && n(row[8]) !== null;
const rows = [];
const addMergedRow = row => {
  const duplicateIndex = rows.findIndex(existing => sameMovedMatchup(existing, row));
  if (duplicateIndex < 0) {
    rows.push(row);
    return;
  }
  const existing = rows[duplicateIndex];
  if (hasRowScore(row) && !hasRowScore(existing)) {
    rows[duplicateIndex] = row;
    return;
  }
  if (!hasRowScore(existing) && dateStamp(row[0]) > dateStamp(existing[0])) {
    rows[duplicateIndex] = row;
  }
};
for (const row of sheetRows) addMergedRow(row);
for (const g of weeklyGames) {
  addMergedRow([
    g.date,
    g.awayTeam,
    g.homeTeam,
    '',
    '',
    '',
    '',
    g.actualAway ?? '',
    g.actualHome ?? '',
    g.actualWinner ?? '',
    g.wl ?? ''
  ]);
}
// Include every current Utah team immediately, even before that school appears on the weekly sheet.
const st={};
for(const t of teams){
  const name=t.team;
  st[name]={team:name,classification:clean(t.classification),region:clean(t.region),backgroundColor:clean(t.backgroundColor),textColor:clean(t.textColor),wins:0,losses:0,ties:0,regionWins:0,regionLosses:0,regionTies:0,pointsFor:0,pointsAgainst:0,results:[]};
}

function apply(name,pf,pa,date,isRegion){const x=st[name];if(!x)return;x.pointsFor+=pf;x.pointsAgainst+=pa;let result='T';if(pf>pa){x.wins++;result='W';if(isRegion)x.regionWins++}else if(pf<pa){x.losses++;result='L';if(isRegion)x.regionLosses++}else{x.ties++;if(isRegion)x.regionTies++}x.results.push({date,result})}
let completed=0,sheetFinals=0,weeklyFinals=0,deseretFinals=0;
const games=[];
for(const r of rows){
  const key=gameKey(r[0],r[1],r[2]);
  let aa=n(r[7]),ah=n(r[8]),source='';
  if(aa!==null&&ah!==null){
    source='sheet';
  }else{
    const local=weeklyByKey.get(key);
    const la=n(local?.actualAway),lh=n(local?.actualHome);
    if(la!==null&&lh!==null){
      aa=la;ah=lh;source='weekly';
    }else{
      const d=deseretGames[key];
      const box=d?.boxScore?.rows||[];
      const da=n(box[0]?.total),dh=n(box[1]?.total);
      if((d?.final||/^final$/i.test(clean(d?.status)))&&da!==null&&dh!==null){aa=da;ah=dh;source='deseret'}
    }
  }
  if(aa===null||ah===null)continue;
  const a=resolve(r[1]),h=resolve(r[2]);if(!a&&!h)continue;
  completed++;
  if(source==='sheet')sheetFinals++;
  else if(source==='weekly')weeklyFinals++;
  else if(source==='deseret')deseretFinals++;
  games.push({date:clean(r[0]),awayTeam:a||clean(r[1]),homeTeam:h||clean(r[2]),actualAway:aa,actualHome:ah,source});
  const sameRegion=!!(a&&h&&st[a]&&st[h]&&st[a].classification===st[h].classification&&st[a].region&&st[a].region===st[h].region);
  if(a)apply(a,aa,ah,r[0],sameRegion);if(h)apply(h,ah,aa,r[0],sameRegion)
}
games.sort((a,b)=>dateStamp(a.date)-dateStamp(b.date)||a.awayTeam.localeCompare(b.awayTeam)||a.homeTeam.localeCompare(b.homeTeam));
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

const base={season:2026,summary:{scheduledGames:rows.length,completedGames:completed,sheetFinals,weeklyFinals,deseretFinals,teams:Object.keys(st).length},games,byClassification,byRegion};
let updatedAt=new Date().toISOString();
try{
  const old=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
  const oldBase={season:old.season,summary:old.summary,games:old.games||[],byClassification:old.byClassification,byRegion:old.byRegion};
  if(JSON.stringify(oldBase)===JSON.stringify(base)&&old.updatedAt)updatedAt=old.updatedAt;
}catch{}
const out={season:2026,updatedAt,...base};
fs.writeFileSync('standings-2026.json',JSON.stringify(out));
for(const name of ['MONTICELLO','MONUMENT VAL','PANGUITCH','GRAND']){if(!st[name])throw new Error(`${name} missing from standings`)}
console.log(`Standings: ${Object.keys(st).length} teams, ${completed}/${rows.length} games complete (${sheetFinals} sheet, ${weeklyFinals} weekly, ${deseretFinals} Deseret)`);
console.log(`Season results exported for playoff RPI: ${games.length}`);
console.log('8-player teams:',(byClassification['8P']||[]).map(x=>x.team).join(', '));
