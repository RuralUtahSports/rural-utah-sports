import fs from 'node:fs';
import path from 'node:path';

const CURRENT_SEASON=Number(process.env.CURRENT_SEASON||new Date().getFullYear());
const OUT='record-alerts.json';
const UHSAA_FILE='data/uhsaa-football-single-game-records.json';
const TEAM_HISTORY_DIR='team-page-data';
const TEAMS_FILE='teams-data.json';
const MAX_ALERTS=240;

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const dateValue=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};
const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`:null};

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
function filesIn(dir){return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f)):[]}
function best(rows){return [...rows].filter(r=>num(r.value)!=null).sort((a,b)=>num(b.value)-num(a.value)||dateValue(b.date)-dateValue(a.date))[0]||null}
function alertKey(a){return [a.recordType,a.categoryKey,a.gameId||a.date,a.team,a.player||''].join('|')}
function score(a){const prev=Math.max(1,Number(a.uhsaaListedValue??a.previousValue??a.value)||1);return (Number(a.value)||0)/prev}

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
      alerts.push({...baseAlert(current,doc,cat,recordType),scope:'school',previousValue:num(prior.value),previousDate:prior.date||null,previousSeason:prior.season||null});
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
    alerts.push({...baseAlert(current,doc,cat,recordType),scope:'statewide',previousValue:num(prior.value),previousDate:prior.date||null,previousSeason:prior.season||null});
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

const historyMetrics=[
  {key:'pointsScored',label:'Points Scored',value:g=>num(g.teamScore),eligible:()=>true},
  {key:'largestWin',label:'Largest Win',value:g=>num(g.teamScore)-num(g.opponentScore),eligible:g=>num(g.teamScore)>num(g.opponentScore)},
  {key:'pointsAllowed',label:'Points Allowed',value:g=>num(g.opponentScore),eligible:()=>true},
  {key:'largestLoss',label:'Largest Loss',value:g=>num(g.opponentScore)-num(g.teamScore),eligible:g=>num(g.opponentScore)>num(g.teamScore)}
];

function teamNameForFile(file,teams){
  const key=compact(path.basename(file,'.json'));
  return teams.find(team=>compact(team)===key)||clean(path.basename(file,'.json').replace(/-/g,' ')).toUpperCase();
}

function collectTeamHistoryTopFive(){
  if(!fs.existsSync(TEAM_HISTORY_DIR))return[];
  const teams=fs.existsSync(TEAMS_FILE)?readJson(TEAMS_FILE).map(row=>clean(row.team)).filter(Boolean):[];
  const alerts=[];
  for(const file of filesIn(TEAM_HISTORY_DIR)){
    const doc=readJson(file),team=teamNameForFile(file,teams),games=[];
    for(const [season,rows] of Object.entries(doc.schedules||{})){
      for(const game of rows||[]){
        const teamScore=num(game.teamScore),opponentScore=num(game.opponentScore),date=isoDate(game.date);
        if(!date||teamScore==null||opponentScore==null||!['W','L','T'].includes(clean(game.result).toUpperCase()))continue;
        games.push({...game,season:Number(season),date,teamScore,opponentScore});
      }
    }
    for(const metric of historyMetrics){
      const eligible=games.filter(metric.eligible).map(game=>({...game,value:metric.value(game)})).filter(game=>game.value!=null&&game.value>0);
      for(const game of eligible.filter(game=>game.season===CURRENT_SEASON)){
        const historyRank=1+eligible.filter(row=>row.value>game.value).length;
        if(historyRank<1||historyRank>5)continue;
        const tiedCount=eligible.filter(row=>row.value===game.value).length;
        const prior=eligible.filter(row=>row.date!==game.date||clean(row.opponent)!==clean(game.opponent)).sort((a,b)=>b.value-a.value||dateValue(b.date)-dateValue(a.date))[0]||null;
        alerts.push({
          recordType:'team',scope:'school',teamHistoryRank:true,team,player:null,
          categoryKey:`teamHistory-${metric.key}`,category:metric.label,unit:'points',value:game.value,
          season:CURRENT_SEASON,date:game.date,opponent:clean(game.opponent),teamScore:game.teamScore,opponentScore:game.opponentScore,
          gameId:null,gameUrl:null,historyRank,tiedCount,historyGamesReviewed:games.length,
          previousValue:prior?.value??game.value,previousDate:prior?.date||null,previousSeason:prior?.season||null
        });
      }
    }
  }
  return alerts;
}

const school=[
  ...collectSchoolAlerts('player-single-game-records/by-team','player'),
  ...collectSchoolAlerts('team-stat-single-game-records/by-team','team'),
  ...collectTeamHistoryTopFive()
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
  dateValue(b.date)-dateValue(a.date)||
  Number(Boolean(b.uhsaaWatch))-Number(Boolean(a.uhsaaWatch))||
  Number(a.historyRank||99)-Number(b.historyRank||99)||score(b)-score(a)
).slice(0,MAX_ALERTS);

const out={
  updatedAt:new Date().toISOString(),
  currentSeason:CURRENT_SEASON,
  coverageNote:'School and RUS statewide record alerts compare reported single-game records in Rural Utah Sports datasets. Team-history alerts flag completed games ranking in a program’s all-time top five for points scored, largest win, points allowed, or largest loss. UHSAA watch alerts only mean a performance exceeds the mark currently listed in the UHSAA football records book; official recognition may require UHSAA review.',
  uhsaaSource:uhsaa?{source:uhsaa.source,sourceUrl:uhsaa.sourceUrl,checkedAt:uhsaa.checkedAt}:null,
  alerts
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(`Built ${alerts.length} record alerts for ${CURRENT_SEASON} (${alerts.filter(a=>a.uhsaaWatch).length} UHSAA record watches; ${alerts.filter(a=>a.teamHistoryRank).length} team-history top-five alerts)`);
