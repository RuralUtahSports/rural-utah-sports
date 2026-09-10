import fs from 'node:fs';
import vm from 'node:vm';

// Scores stored here are neutral-field scores. Display code adds the existing
// three-point home adjustment; do not apply it twice.
const file='weekly-simulation.json';
const feed=JSON.parse(fs.readFileSync(file,'utf8'));
const data=JSON.parse(fs.readFileSync('simulator-data.json','utf8'));
// v2 keeps weekly projections and the interactive H2H predictor on the same live-season model.
const MODEL_VERSION='20260910-calibration-v2';
const prior=process.argv[2]&&fs.existsSync(process.argv[2])?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{games:[]};
const num=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const compact=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function day(v){const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:String(v)}
const key=g=>`${day(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
const previous=new Map(prior.games.map(g=>[key(g),g]));
const names=new Map(Object.keys(data.teams).map(n=>[compact(n),n]));
const html=fs.readFileSync('simulators.html','utf8');
const start=html.indexOf('<script>')+8,end=html.indexOf('function teamBox');
if(start<8||end<start)throw Error('Simulator model source not found');
const seasonFeed=fs.existsSync('standings-2026.json')?JSON.parse(fs.readFileSync('standings-2026.json','utf8')):{games:[]};
const context=vm.createContext({console,data,feed,seasonFeed});
vm.runInContext(html.slice(start,end)+'\nsimulator=data;weekly=feed.games||[];seasonResults=Array.isArray(seasonFeed.games)?seasonFeed.games:[];globalThis.project=(a,b)=>calculate(a,b);',context,{timeout:5000});
const now=new Date(process.env.PROJECTION_NOW||Date.now());
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
const today=`${parts.year}-${parts.month}-${parts.day}`;
function released(g){const d=new Date(`${day(g.date)}T12:00:00Z`);if(!Number.isFinite(d.getTime()))return false;d.setUTCDate(d.getUTCDate()-d.getUTCDay());const sunday=d.toISOString().slice(0,10);return today>sunday||(today===sunday&&Number(parts.hour)>=8)}
let generated=0,restored=0;const missing=[];
for(const g of feed.games){
  if(num(g.awayScore)!==null&&num(g.homeScore)!==null)continue;
  const old=previous.get(key(g));
  // Preserve previously published model picks even after the sheet is rebuilt
  // or a final arrives; never manufacture a pick using a completed game's data.
  if(old?.projectionSource==='rus-simulator'&&old?.projectionModel===MODEL_VERSION&&num(old.awayScore)!==null&&num(old.homeScore)!==null){
    for(const f of ['awayScore','homeScore','winner','projectionSource','projectionGeneratedAt','projectionModel'])g[f]=old[f];
    restored++;continue;
  }
  if(day(g.date)<today||num(g.actualAway)!==null||num(g.actualHome)!==null||!released(g))continue;
  const a=names.get(compact(g.awayTeam)),h=names.get(compact(g.homeTeam));
  if(!a||!h){missing.push(`${g.awayTeam} at ${g.homeTeam}`);continue}
  const p=context.project(a,h);
  if(!p||!Number.isFinite(p.p1)||!Number.isFinite(p.p2))throw Error(`Invalid projection: ${key(g)}`);
  if(num(g.awayScore)===null)g.awayScore=p.p1;
  if(num(g.homeScore)===null)g.homeScore=p.p2;
  g.winner=g.awayScore>g.homeScore+3?g.awayTeam:g.homeScore+3>g.awayScore?g.homeTeam:'TIE';
  g.projectionSource='rus-simulator';g.projectionModel=MODEL_VERSION;g.projectionGeneratedAt=now.toISOString();generated++;
}
fs.writeFileSync(file,JSON.stringify(feed));
console.log(JSON.stringify({generated,restored,missingTeamModels:missing}));
