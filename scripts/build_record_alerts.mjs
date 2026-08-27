import fs from 'node:fs';
import path from 'node:path';

const CURRENT_SEASON=Number(process.env.CURRENT_SEASON||new Date().getFullYear());
const OUT='record-alerts.json';
const MAX_ALERTS=40;

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const dateValue=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function filesIn(dir){return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f)):[]}
function best(rows){return [...rows].filter(r=>num(r.value)!==null).sort((a,b)=>num(b.value)-num(a.value)||dateValue(b.date)-dateValue(a.date))[0]||null}
function alertKey(a){return [a.recordType,a.categoryKey,a.gameId||a.date,a.team,a.player||''].join('|')}
function score(a){const prev=Math.max(1,Number(a.previousValue)||1);return (Number(a.value)||0)/prev}

function collectSchoolAlerts(dir,recordType){
  const alerts=[];
  for(const file of filesIn(dir)){
    const doc=readJson(file);
    for(const cat of doc.categories||[]){
      const rows=(cat.entries||[]).filter(r=>num(r.value)!==null);
      const current=best(rows.filter(r=>Number(r.season)===CURRENT_SEASON));
      const prior=best(rows.filter(r=>Number(r.season)<CURRENT_SEASON));
      if(!current||!prior||num(current.value)<=num(prior.value))continue;
      alerts.push({
        scope:'school',recordType,team:clean(current.team||doc.team),player:recordType==='player'?clean(current.player):null,
        categoryKey:clean(cat.key||cat.category||cat.label),category:clean(cat.label||cat.category||cat.key),unit:clean(cat.unit||cat.valueLabel),
        value:num(current.value),previousValue:num(prior.value),season:CURRENT_SEASON,date:current.date||null,opponent:clean(current.opponent),
        teamScore:num(current.teamScore),opponentScore:num(current.opponentScore),gameId:current.gameId||null,gameUrl:current.gameUrl||null
      });
    }
  }
  return alerts;
}

function collectStatewideAlerts(file,recordType){
  if(!fs.existsSync(file))return[];
  const doc=readJson(file),alerts=[];
  for(const cat of doc.categories||[]){
    const rows=(cat.entries||[]).filter(r=>num(r.value)!==null);
    const current=best(rows.filter(r=>Number(r.season)===CURRENT_SEASON));
    const prior=best(rows.filter(r=>Number(r.season)<CURRENT_SEASON));
    if(!current||!prior||num(current.value)<=num(prior.value))continue;
    alerts.push({
      scope:'statewide',recordType,team:clean(current.team),player:recordType==='player'?clean(current.player):null,
      categoryKey:clean(cat.key||cat.category||cat.label),category:clean(cat.label||cat.category||cat.key),unit:clean(cat.unit||cat.valueLabel),
      value:num(current.value),previousValue:num(prior.value),season:CURRENT_SEASON,date:current.date||null,opponent:clean(current.opponent),
      teamScore:num(current.teamScore),opponentScore:num(current.opponentScore),gameId:current.gameId||null,gameUrl:current.gameUrl||null
    });
  }
  return alerts;
}

const school=[
  ...collectSchoolAlerts('player-single-game-records/by-team','player'),
  ...collectSchoolAlerts('team-stat-single-game-records/by-team','team')
];
const statewide=[
  ...collectStatewideAlerts('player-single-game-records/statewide.json','player'),
  ...collectStatewideAlerts('team-stat-single-game-records/statewide.json','team')
];

const merged=new Map(school.map(a=>[alertKey(a),a]));
for(const a of statewide){const key=alertKey(a);merged.set(key,{...(merged.get(key)||{}),...a,scope:'statewide'})}
const alerts=[...merged.values()].sort((a,b)=>dateValue(b.date)-dateValue(a.date)||score(b)-score(a)).slice(0,MAX_ALERTS);

const out={
  updatedAt:new Date().toISOString(),currentSeason:CURRENT_SEASON,
  coverageNote:'Record alerts compare reported single-game records in the Rural Utah Sports Deseret News-derived datasets. Historical reporting gaps may exist.',
  alerts
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(`Built ${alerts.length} record alerts for ${CURRENT_SEASON}`);
