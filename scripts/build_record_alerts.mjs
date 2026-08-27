import fs from 'node:fs';
import path from 'node:path';

const CURRENT_SEASON=Number(process.env.CURRENT_SEASON||new Date().getFullYear());
const OUT='record-alerts.json';
const UHSAA_FILE='data/uhsaa-football-single-game-records.json';
const MAX_ALERTS=80;

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const dateValue=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function filesIn(dir){return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f)):[]}
function best(rows){return [...rows].filter(r=>num(r.value)!=null).sort((a,b)=>num(b.value)-num(a.value)||dateValue(b.date)-dateValue(a.date))[0]||null}
function alertKey(a){return [a.recordType,a.categoryKey,a.gameId||a.date,a.team,a.player||''].join('|')}
function score(a){const prev=Math.max(1,Number(a.uhsaaListedValue??a.previousValue)||1);return (Number(a.value)||0)/prev}

function baseAlert(current,doc,cat,recordType){
  return {
    recordType,
    team:clean(current.team||doc.team),
    player:recordType==='player'?clean(current.player):null,
    categoryKey:clean(cat.key||cat.category||cat.label),
    category:clean(cat.label||cat.category||cat.key),
    unit:clean(cat.unit||cat.valueLabel),
    value:num(current.value),
    season:CURRENT_SEASON,
    date:current.date||null,
    opponent:clean(current.opponent),
    teamScore:num(current.teamScore),
    opponentScore:num(current.opponentScore),
    gameId:current.gameId||null,
    gameUrl:current.gameUrl||null
  };
}

function collectSchoolAlerts(dir,recordType){
  const alerts=[];
  for(const file of filesIn(dir)){
    const doc=readJson(file);
    for(const cat of doc.categories||[]){
      const rows=(cat.entries||[]).filter(r=>num(r.value)!=null);
      const current=best(rows.filter(r=>Number(r.season)===CURRENT_SEASON));
      const prior=best(rows.filter(r=>Number(r.season)<CURRENT_SEASON));
      if(!current||!prior||num(current.value)<=num(prior.value))continue;
      alerts.push({...baseAlert(current,doc,cat,recordType),scope:'school',previousValue:num(prior.value)});
    }
  }
  return alerts;
}

function collectStatewideAlerts(file,recordType){
  if(!fs.existsSync(file))return[];
  const doc=readJson(file),alerts=[];
  for(const cat of doc.categories||[]){
    const rows=(cat.entries||[]).filter(r=>num(r.value)!=null);
    const current=best(rows.filter(r=>Number(r.season)===CURRENT_SEASON));
    const prior=best(rows.filter(r=>Number(r.season)<CURRENT_SEASON));
    if(!current||!prior||num(current.value)<=num(prior.value))continue;
    alerts.push({...baseAlert(current,doc,cat,recordType),scope:'statewide',previousValue:num(prior.value)});
  }
  return alerts;
}

function collectUhsaaWatches(dir,recordType,refs,source){
  const watches=[];
  if(!refs||typeof refs!=='object')return watches;
  for(const file of filesIn(dir)){
    const doc=readJson(file);
    for(const cat of doc.categories||[]){
      const key=clean(cat.key||cat.category||cat.label);
      const ref=refs[key];
      if(!ref||num(ref.value)==null)continue;
      for(const current of (cat.entries||[])){
        if(Number(current.season)!==CURRENT_SEASON||num(current.value)==null||num(current.value)<=num(ref.value))continue;
        watches.push({
          ...baseAlert(current,doc,cat,recordType),
          scope:'uhsaa',
          previousValue:num(ref.value),
          uhsaaWatch:true,
          uhsaaListedValue:num(ref.value),
          uhsaaListedHolder:clean(ref.holder),
          uhsaaListedSchool:clean(ref.school),
          uhsaaListedDate:ref.date||null,
          uhsaaListedOpponent:clean(ref.opponent),
          uhsaaSource:source.source||'UHSAA Sports Records Book - Football',
          uhsaaSourceUrl:source.sourceUrl||null,
          uhsaaCheckedAt:source.checkedAt||null
        });
      }
    }
  }
  return watches;
}

const school=[
  ...collectSchoolAlerts('player-single-game-records/by-team','player'),
  ...collectSchoolAlerts('team-stat-single-game-records/by-team','team')
];
const statewide=[
  ...collectStatewideAlerts('player-single-game-records/statewide.json','player'),
  ...collectStatewideAlerts('team-stat-single-game-records/statewide.json','team')
];
const uhsaa=fs.existsSync(UHSAA_FILE)?readJson(UHSAA_FILE):null;
const watches=uhsaa?[
  ...collectUhsaaWatches('player-single-game-records/by-team','player',uhsaa.player,uhsaa),
  ...collectUhsaaWatches('team-stat-single-game-records/by-team','team',uhsaa.team,uhsaa)
]:[];

const merged=new Map(school.map(a=>[alertKey(a),a]));
for(const a of statewide){
  const key=alertKey(a),existing=merged.get(key);
  merged.set(key,{...(existing||{}),...a,scope:'statewide'});
}
for(const a of watches){
  const key=alertKey(a),existing=merged.get(key);
  if(existing){
    merged.set(key,{...existing,
      uhsaaWatch:true,
      uhsaaListedValue:a.uhsaaListedValue,
      uhsaaListedHolder:a.uhsaaListedHolder,
      uhsaaListedSchool:a.uhsaaListedSchool,
      uhsaaListedDate:a.uhsaaListedDate,
      uhsaaListedOpponent:a.uhsaaListedOpponent,
      uhsaaSource:a.uhsaaSource,
      uhsaaSourceUrl:a.uhsaaSourceUrl,
      uhsaaCheckedAt:a.uhsaaCheckedAt
    });
  }else merged.set(key,a);
}

const alerts=[...merged.values()].sort((a,b)=>
  Number(Boolean(b.uhsaaWatch))-Number(Boolean(a.uhsaaWatch))||
  dateValue(b.date)-dateValue(a.date)||score(b)-score(a)
).slice(0,MAX_ALERTS);

const out={
  updatedAt:new Date().toISOString(),
  currentSeason:CURRENT_SEASON,
  coverageNote:'School and RUS statewide record alerts compare reported single-game records in Rural Utah Sports Deseret News-derived datasets. UHSAA watch alerts only mean a performance exceeds the mark currently listed in the UHSAA football records book; official recognition may require UHSAA review.',
  uhsaaSource:uhsaa?{source:uhsaa.source,sourceUrl:uhsaa.sourceUrl,checkedAt:uhsaa.checkedAt}:null,
  alerts
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(`Built ${alerts.length} record alerts for ${CURRENT_SEASON} (${alerts.filter(a=>a.uhsaaWatch).length} UHSAA record watches)`);
