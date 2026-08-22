import fs from 'node:fs';

const season=Number(process.argv[2]||2026);
if(![2025,2026].includes(season))throw new Error(`Unsupported season ${season}`);

const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const num=v=>{const m=clean(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
const round=(v,d=2)=>Number.isFinite(Number(v))?+Number(v).toFixed(d):null;
const aliases={
  CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',
  MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIP:'ALA',
  AMERICANLEADERSHIPACADEMY:'ALA',UMALEHI:'UMALEHI',UTAHMILITARYCAMPWILLIAMS:'UMALEHI'
};
const canon=v=>aliases[compact(v)]||compact(v);
const statKey=v=>compact(v).replace(/PERCENT|PCT/g,'');

function valueExact(values,...wanted){
  const entries=Object.entries(values||{});
  for(const w of wanted){
    const target=statKey(w);
    const hit=entries.find(([k])=>statKey(k)===target);
    if(hit)return num(hit[1]);
  }
  return 0;
}
function compAtt(values){
  const hit=Object.entries(values||{}).find(([k])=>statKey(k)==='COMPATT');
  const m=hit?clean(hit[1]).match(/(\d+)\s*[-/]\s*(\d+)/):null;
  return m?{completions:+m[1],attempts:+m[2]}:{completions:valueExact(values,'COMP','COMPLETIONS'),attempts:valueExact(values,'ATT','ATTEMPTS','PASS ATT')};
}
function fieldMade(values,key){
  const hit=Object.entries(values||{}).find(([k])=>statKey(k)===statKey(key));
  if(!hit)return 0;
  const m=clean(hit[1]).match(/(\d+)\s*[-/]\s*(\d+)/);
  return m?+m[1]:num(hit[1]);
}
function blank(team,meta={}){
  return {team,classification:clean(meta.classification),region:clean(meta.region),games:0,wins:0,losses:0,ties:0,pointsFor:0,pointsAgainst:0,categories:{passing:false,rushing:false,receiving:false,defense:false,kicking:false},passing:{completions:0,attempts:0,yards:0,td:0,interceptions:0},rushing:{carries:0,yards:0,td:0},receiving:{receptions:0,yards:0,td:0},defense:{tackles:0,sacks:0,interceptions:0,td:0,returnTd:0},kicking:{fieldGoals:0,pat:0}};
}
function aggregateStats(teamEntry,out){
  for(const sec of teamEntry?.stats||[]){
    const cat=clean(sec.category);
    if(/^Pass/i.test(cat))out.categories.passing=true;
    else if(/^Rush/i.test(cat))out.categories.rushing=true;
    else if(/^Receiv/i.test(cat))out.categories.receiving=true;
    else if(/Defense/i.test(cat))out.categories.defense=true;
    else if(/^Kick/i.test(cat))out.categories.kicking=true;
    for(const row of sec.rows||[]){
      const v=row.values||{};
      if(/^Pass/i.test(cat)){
        const ca=compAtt(v);out.passing.completions+=ca.completions;out.passing.attempts+=ca.attempts;
        out.passing.yards+=valueExact(v,'YARDS','PASS YARDS');out.passing.td+=valueExact(v,'TD','TDS','PASS TD','PASS TDS');out.passing.interceptions+=valueExact(v,'INT','INTS','INTERCEPTIONS');
      }else if(/^Rush/i.test(cat)){
        out.rushing.carries+=valueExact(v,'CARRIES','RUSH ATT','RUSH ATTEMPTS');out.rushing.yards+=valueExact(v,'YARDS','RUSH YARDS');out.rushing.td+=valueExact(v,'TD','TDS','RUSH TD','RUSH TDS');
      }else if(/^Receiv/i.test(cat)){
        out.receiving.receptions+=valueExact(v,'RECEPTIONS','REC');out.receiving.yards+=valueExact(v,'YARDS','REC YARDS','RECEIVING YARDS');out.receiving.td+=valueExact(v,'TD','TDS','REC TD','RECEIVING TD');
      }else if(/Defense/i.test(cat)){
        out.defense.tackles+=valueExact(v,'TACKLES');out.defense.sacks+=valueExact(v,'SACKS');out.defense.interceptions+=Math.max(valueExact(v,'PASS INT','PASS INTS'),valueExact(v,'INTERCEPTIONS','INTS'));out.defense.td+=valueExact(v,'DEFENSE TD','DEFENSIVE TD');out.defense.returnTd+=valueExact(v,'RETURN TD','RETURN TDS');
      }else if(/^Kick/i.test(cat)){
        out.kicking.fieldGoals+=fieldMade(v,'FG');out.kicking.pat+=fieldMade(v,'PAT');
      }
    }
  }
}
function finalize(x){
  const plays=x.passing.attempts+x.rushing.carries,totalOffense=x.passing.yards+x.rushing.yards;
  x.record=`${x.wins}-${x.losses}${x.ties?'-'+x.ties:''}`;
  x.ppg=x.games?round(x.pointsFor/x.games,1):null;x.pointsAllowedPerGame=x.games?round(x.pointsAgainst/x.games,1):null;x.scoringMargin=x.games?round((x.pointsFor-x.pointsAgainst)/x.games,1):null;
  x.totalOffense=totalOffense;x.totalYardsPerGame=x.games&&((x.categories.passing||x.categories.rushing))?round(totalOffense/x.games,1):null;x.yardsPerPlay=plays?round(totalOffense/plays,2):null;
  x.passing.compPct=x.passing.attempts?round(x.passing.completions/x.passing.attempts*100,1):null;x.passing.yardsPerAttempt=x.passing.attempts?round(x.passing.yards/x.passing.attempts,2):null;x.passing.yardsPerGame=x.games&&x.categories.passing?round(x.passing.yards/x.games,1):null;
  x.rushing.yardsPerCarry=x.rushing.carries?round(x.rushing.yards/x.rushing.carries,2):null;x.rushing.yardsPerGame=x.games&&x.categories.rushing?round(x.rushing.yards/x.games,1):null;
  x.receiving.yardsPerCatch=x.receiving.receptions?round(x.receiving.yards/x.receiving.receptions,2):null;x.receiving.yardsPerGame=x.games&&x.categories.receiving?round(x.receiving.yards/x.games,1):null;
  x.statCoverage=Object.entries(x.categories).filter(([,v])=>v).map(([k])=>k);
  x.hasPlayerStats=x.statCoverage.length>0;
  return x;
}
function yearOf(v){const m=clean(v).match(/(18\d{2}|19\d{2}|20\d{2})/);return m?+m[1]:0}

let meta=new Map();
if(season===2026){
  const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
  for(const t of teams)meta.set(canon(t.team),{team:t.team,classification:t.classification,region:t.region});
}else{
  const alignment=JSON.parse(fs.readFileSync('full-season-alignment-2025.json','utf8'));
  for(const r of alignment.regions||[])for(const team of r.teams||[])meta.set(canon(team),{team,classification:r.classification,region:r.region});
}

const rosterFile=`deseret-rosters-stats-${season}.json`;
if(!fs.existsSync(rosterFile))throw new Error(`${rosterFile} missing`);
const rosters=JSON.parse(fs.readFileSync(rosterFile,'utf8'));
const rows=new Map();
for(const [key,m] of meta)rows.set(key,blank(m.team,m));
for(const [sourceName,entry] of Object.entries(rosters.teams||{})){
  const key=canon(sourceName),m=meta.get(key)||{team:sourceName,classification:'',region:''};
  if(!rows.has(key))rows.set(key,blank(m.team,m));
  aggregateStats(entry,rows.get(key));
}

function applyGame(team,pf,pa){const key=canon(team),x=rows.get(key);if(!x)return;x.games++;x.pointsFor+=Number(pf)||0;x.pointsAgainst+=Number(pa)||0;if(pf>pa)x.wins++;else if(pf<pa)x.losses++;else x.ties++}
if(season===2026){
  const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
  for(const x of Object.values(standings.byClassification||{}).flat()){
    const row=rows.get(canon(x.team));if(!row)continue;
    row.wins=Number(x.wins)||0;row.losses=Number(x.losses)||0;row.ties=Number(x.ties)||0;row.games=row.wins+row.losses+row.ties;row.pointsFor=Number(x.pointsFor)||0;row.pointsAgainst=Number(x.pointsAgainst)||0;
  }
}else{
  const games=JSON.parse(fs.readFileSync('scorigami.json','utf8'));
  for(const e of games.scores||[])for(const g of e.games||[]){
    if(yearOf(g.date)!==season)continue;
    if(g.tie){applyGame(g.team1,Number(g.score1)||0,Number(g.score2)||0);applyGame(g.team2,Number(g.score2)||0,Number(g.score1)||0)}
    else{applyGame(g.winner,Number(g.winnerScore)||0,Number(g.loserScore)||0);applyGame(g.loser,Number(g.loserScore)||0,Number(g.winnerScore)||0)}
  }
}

const teams=[...rows.values()].map(finalize);
const metricDefs={
  ppg:{label:'Scoring Offense',path:'ppg',dir:'desc',eligible:x=>x.games>0},
  pointsAllowedPerGame:{label:'Scoring Defense',path:'pointsAllowedPerGame',dir:'asc',eligible:x=>x.games>0},
  scoringMargin:{label:'Scoring Margin',path:'scoringMargin',dir:'desc',eligible:x=>x.games>0},
  totalYardsPerGame:{label:'Total Offense',path:'totalYardsPerGame',dir:'desc',eligible:x=>x.games>0&&(x.categories.passing||x.categories.rushing)},
  yardsPerPlay:{label:'Yards Per Play',path:'yardsPerPlay',dir:'desc',eligible:x=>x.yardsPerPlay!==null},
  rushingYardsPerGame:{label:'Rushing Offense',path:'rushing.yardsPerGame',dir:'desc',eligible:x=>x.games>0&&x.categories.rushing},
  passingYardsPerGame:{label:'Passing Offense',path:'passing.yardsPerGame',dir:'desc',eligible:x=>x.games>0&&x.categories.passing},
  sacks:{label:'Sacks',path:'defense.sacks',dir:'desc',eligible:x=>x.categories.defense},
  defensiveInterceptions:{label:'Defensive INT',path:'defense.interceptions',dir:'desc',eligible:x=>x.categories.defense}
};
const getPath=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
function rankScope(pool,def){
  const eligible=pool.filter(def.eligible).filter(x=>Number.isFinite(Number(getPath(x,def.path))));
  eligible.sort((a,b)=>{const av=Number(getPath(a,def.path)),bv=Number(getPath(b,def.path));return def.dir==='asc'?av-bv:bv-av||a.team.localeCompare(b.team)});
  const map=new Map();let last=null,rank=0;eligible.forEach((x,i)=>{const v=Number(getPath(x,def.path));if(last===null||v!==last)rank=i+1;last=v;map.set(canon(x.team),rank)});return {map,total:eligible.length};
}
for(const x of teams)x.rankings={};
for(const [metric,def] of Object.entries(metricDefs)){
  const state=rankScope(teams,def);
  const classes=new Map(),regions=new Map();
  for(const x of teams){
    const c=x.classification||'—',r=`${c}|${x.region||'Independent'}`;
    if(!classes.has(c))classes.set(c,rankScope(teams.filter(t=>t.classification===x.classification),def));
    if(!regions.has(r))regions.set(r,rankScope(teams.filter(t=>t.classification===x.classification&&(t.region||'Independent')===(x.region||'Independent')),def));
    const key=canon(x.team),cr=classes.get(c),rr=regions.get(r);
    x.rankings[metric]={label:def.label,state:state.map.get(key)||null,stateTotal:state.total,class:cr.map.get(key)||null,classTotal:cr.total,region:rr.map.get(key)||null,regionTotal:rr.total};
  }
}

teams.sort((a,b)=>a.team.localeCompare(b.team));
const out={season,generatedAt:new Date().toISOString(),method:{note:'Team statistics are calculated from reported player season totals. Passing yards + rushing yards = total offense; receiving yards are displayed separately and are not added again. Points for/against come from completed game finals. Rankings only include teams with the required reported category.',totalOffense:'passing yards + rushing yards'},summary:{teams:teams.length,teamsWithPlayerStats:teams.filter(x=>x.hasPlayerStats).length,teamsWithGames:teams.filter(x=>x.games>0).length},metrics:metricDefs,teams:Object.fromEntries(teams.map(x=>[x.team,x]))};
const outputFile=`team-stats-${season}.json`;
if(fs.existsSync(outputFile)){
  try{
    const previous=JSON.parse(fs.readFileSync(outputFile,'utf8'));
    const comparable=value=>{const copy={...value};delete copy.generatedAt;return JSON.stringify(copy)};
    if(previous.generatedAt&&comparable(previous)===comparable(out))out.generatedAt=previous.generatedAt;
  }catch{}
}
fs.writeFileSync(outputFile,JSON.stringify(out,null,2)+'\n');
console.log(`${season} team stats: ${out.summary.teamsWithPlayerStats}/${out.summary.teams} teams with player stats; ${out.summary.teamsWithGames} with completed games.`);
