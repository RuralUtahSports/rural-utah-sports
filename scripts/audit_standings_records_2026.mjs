import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const n=v=>{const s=clean(v);if(!s)return null;const x=Number(s);return Number.isFinite(x)?x:null};
const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;return''};
const gameKey=(date,away,home)=>`${isoDate(date)}|${norm(away)}|${norm(home)}`;

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const weekly=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8')).games||[];
const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
let deseretGames={};
try{deseretGames=JSON.parse(fs.readFileSync('deseret-game-details.json','utf8')).games||{}}catch{}

const teamByNorm=new Map(teams.map(t=>[norm(t.team),t.team]));
const aliases={
  GUNNISON:'GUNNISON VALLEY',MAPLEMTN:'MAPLE MOUNTAIN',MONUMENTVAL:'MONUMENT VAL',MONUMENTVALLEY:'MONUMENT VAL',
  AMERFORK:'AMERICAN FORK',CEDAR:'CEDAR CITY',WASATCHACAD:'WASATCH ACADEMY'
};
const resolve=v=>teamByNorm.get(norm(v))||aliases[norm(v)]||'';

const expected={};
for(const t of teams)expected[t.team]={team:t.team,wins:0,losses:0,ties:0,pointsFor:0,pointsAgainst:0,games:0};
const apply=(name,pf,pa)=>{const r=expected[name];if(!r)return;r.games++;r.pointsFor+=pf;r.pointsAgainst+=pa;if(pf>pa)r.wins++;else if(pf<pa)r.losses++;else r.ties++};

let finalizedGames=0,weeklyFinals=0,deseretFinals=0;
const unresolvedFinalSides=[];
for(const g of weekly){
  let aa=n(g.actualAway),ah=n(g.actualHome),source='weekly';
  if(aa===null||ah===null){
    const d=deseretGames[gameKey(g.date,g.awayTeam,g.homeTeam)];
    const box=d?.boxScore?.rows||[];
    const da=n(box[0]?.total),dh=n(box[1]?.total);
    if((d?.final===true||/^final$/i.test(clean(d?.status)))&&da!==null&&dh!==null){aa=da;ah=dh;source='deseret'}
  }
  if(aa===null||ah===null)continue;
  finalizedGames++;
  if(source==='weekly')weeklyFinals++;else deseretFinals++;
  const away=resolve(g.awayTeam),home=resolve(g.homeTeam);
  if(away)apply(away,aa,ah);else unresolvedFinalSides.push({date:g.date,side:'away',team:g.awayTeam,opponent:g.homeTeam,score:`${aa}-${ah}`});
  if(home)apply(home,ah,aa);else unresolvedFinalSides.push({date:g.date,side:'home',team:g.homeTeam,opponent:g.awayTeam,score:`${ah}-${aa}`});
}

const actual=new Map();
const duplicates=[];
for(const [classification,rows] of Object.entries(standings.byClassification||{})){
  for(const r of rows||[]){
    if(!r?.team)continue;
    if(actual.has(r.team))duplicates.push(r.team);
    actual.set(r.team,{...r,classification});
  }
}

const mismatches=[];
const missing=[];
for(const t of teams){
  const e=expected[t.team],a=actual.get(t.team);
  if(!a){missing.push(t.team);continue}
  const fields=['wins','losses','ties','pointsFor','pointsAgainst'];
  const diffs={};
  for(const f of fields){if(Number(a[f]||0)!==Number(e[f]||0))diffs[f]={expected:e[f],actual:Number(a[f]||0)}}
  if(Object.keys(diffs).length)mismatches.push({team:t.team,expected:e,actual:{wins:a.wins,losses:a.losses,ties:a.ties,pointsFor:a.pointsFor,pointsAgainst:a.pointsAgainst},diffs});
}

const extras=[...actual.keys()].filter(name=>!expected[name]);
const deseretPeak=actual.get('DESERET PEAK');
console.log(`Record audit: ${teams.length} teams, ${finalizedGames} finalized games (${weeklyFinals} weekly, ${deseretFinals} Deseret).`);
console.log(`Deseret Peak: ${deseretPeak?.wins??'?'}-${deseretPeak?.losses??'?'}-${deseretPeak?.ties??'?'} PF ${deseretPeak?.pointsFor??'?'} PA ${deseretPeak?.pointsAgainst??'?'}`);
console.log(`Mismatches: ${mismatches.length}; missing: ${missing.length}; duplicate standings rows: ${duplicates.length}; extra standings teams: ${extras.length}.`);
if(unresolvedFinalSides.length)console.log(`Unresolved finalized sides (usually out-of-state opponents): ${unresolvedFinalSides.length}`);
if(mismatches.length)console.error(JSON.stringify(mismatches,null,2));
if(missing.length)console.error('Missing teams:',missing.join(', '));
if(duplicates.length)console.error('Duplicate teams:',duplicates.join(', '));
if(extras.length)console.error('Extra teams:',extras.join(', '));

if(mismatches.length||missing.length||duplicates.length||extras.length)process.exit(1);
console.log('PASS: all Utah team 2026 overall records and PF/PA match finalized game data.');
