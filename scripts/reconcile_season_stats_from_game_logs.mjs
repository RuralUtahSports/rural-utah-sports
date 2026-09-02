import fs from 'node:fs';

const ROSTERS='deseret-rosters-stats-2026.json';
const GAMES='player-game-stats-2026.json';
const TEAM_DATA='deseret-team-data-2026.json';
const WEEKLY='weekly-simulation.json';
const clean=value=>String(value??'').trim();
const compact=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',STJOSEPH:'SAINTJOSEPH',JUANDIEGOCATHOLIC:'JUANDIEGO'};
const canon=value=>aliases[compact(value)]||compact(value);
const numeric=value=>{
  const number=Number(clean(value).replace(/,/g,'').replace(/%$/,''));
  return Number.isFinite(number)?number:null;
};
const rounded=(value,places=2)=>Number(value.toFixed(places)).toString();
const isoDate=value=>{const s=clean(value);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;return s};
const hasScore=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const CATEGORY_FIELDS={
  PASSING:['COMP-ATT','YARDS','TD','INT'],
  RUSHING:['CARRIES','YARDS','TD'],
  RECEIVING:['RECEPTIONS','YARDS','TD'],
  DEFENSESPECIALTEAMS:['TACKLES','SACKS','PASSINT','DEFENSETD','RETURNTD'],
  KICKING:['PAT','FG','PTS']
};

function addValue(bucket,key,value){
  const number=numeric(value);if(number===null)return;
  bucket.values[key]=(bucket.values[key]||0)+number;
  bucket.found.add(key);
}

function aggregatePlayer(player){
  const categories=new Map();
  for(const line of player.lines||[]){
    const category=compact(line.category),allowed=CATEGORY_FIELDS[category];if(!allowed)continue;
    const bucket=categories.get(category)||{category:line.category,values:{},found:new Set(),completions:0,attempts:0};
    for(const [header,value] of Object.entries(line.values||{})){
      const key=compact(header);
      if(category==='PASSING'&&key==='COMPATT'){
        const match=clean(value).match(/^(\d+)\s*-\s*(\d+)$/);if(match){bucket.completions+=Number(match[1]);bucket.attempts+=Number(match[2]);bucket.found.add('COMPATT')}
      }else if(allowed.includes(key))addValue(bucket,key,value);
    }
    categories.set(category,bucket);
  }
  return categories;
}

function outputValues(bucket){
  const values={};
  for(const key of bucket.found){
    if(key==='COMPATT')values['COMP-ATT']=`${bucket.completions}-${bucket.attempts}`;
    else values[key]=rounded(bucket.values[key]||0);
  }
  if(bucket.category&&compact(bucket.category)==='PASSING'&&bucket.found.has('COMPATT')){
    values['COMP%']=bucket.attempts?rounded(bucket.completions/bucket.attempts*100):'0';
    if(bucket.found.has('YARDS'))values['YARDS/COMP.']=bucket.completions?rounded((bucket.values.YARDS||0)/bucket.completions):'0';
  }
  if(compact(bucket.category)==='RUSHING'&&bucket.found.has('CARRIES')&&bucket.found.has('YARDS'))values['YARDS/CARRY']=bucket.values.CARRIES?rounded(bucket.values.YARDS/bucket.values.CARRIES):'0';
  if(compact(bucket.category)==='RECEIVING'&&bucket.found.has('RECEPTIONS')&&bucket.found.has('YARDS'))values['YARDS/RECEP.']=bucket.values.RECEPTIONS?rounded(bucket.values.YARDS/bucket.values.RECEPTIONS):'0';
  return values;
}

function scheduleFinal(game){const status=clean(game?.rusStatus).toUpperCase(),result=clean(game?.result).toUpperCase();return status.includes('FINAL')||(hasScore(game?.teamScore)&&hasScore(game?.opponentScore))||['W','L','T'].includes(result)}
function gameHasStats(game){return (game?.players||[]).some(player=>(player.statLines||[]).some(line=>Object.values(line.values||{}).some(value=>clean(value)!=='')))}
function gameFinal(game){return game?.final===true||clean(game?.status).toUpperCase().includes('FINAL')}
function expectedFinalKeys(teamName,sources={}){
  const expected=new Map(),teamKey=canon(teamName),team=Object.values(sources.teamData?.teams||{}).find(row=>canon(row?.team)===teamKey);
  for(const game of team?.schedule||[]){if(!scheduleFinal(game))continue;const opponent=clean(game.opponent)||(canon(game.awayTeam)===teamKey?game.homeTeam:game.awayTeam),date=isoDate(game.date);if(date&&opponent)expected.set(`${date}|${canon(opponent)}`,`${date} vs ${opponent}`)}
  for(const game of sources.weekly?.games||[]){if(!hasScore(game?.actualAway)||!hasScore(game?.actualHome))continue;const away=canon(game.awayTeam),home=canon(game.homeTeam);if(away!==teamKey&&home!==teamKey)continue;const opponent=away===teamKey?game.homeTeam:game.awayTeam,date=isoDate(game.date);if(date&&opponent)expected.set(`${date}|${canon(opponent)}`,`${date} vs ${opponent}`)}
  return expected;
}
function availableFinalKeys(gameTeam){const available=new Set();for(const game of gameTeam?.games||[]){if(!gameFinal(game)||!gameHasStats(game))continue;const date=isoDate(game.date),opponent=clean(game.opponent);if(date&&opponent)available.add(`${date}|${canon(opponent)}`)}return available}

export function reconcileSeasonStats(rosters,games,sources={}){
  let teams=0,players=0,categories=0,fields=0,skippedTeams=0;const incompleteTeams=[];
  for(const [teamKey,gameTeam] of Object.entries(games.teams||{})){
    const rosterKey=Object.keys(rosters.teams||{}).find(key=>canon(key)===canon(teamKey));if(!rosterKey)continue;
    const team=rosters.teams[rosterKey],expected=expectedFinalKeys(rosterKey,sources),available=availableFinalKeys(gameTeam);teams++;
    const missing=[...expected.entries()].filter(([key])=>!available.has(key));
    if(missing.length){skippedTeams++;incompleteTeams.push({team:rosterKey,expectedFinalGames:expected.size,availableFinalStatGames:available.size,missing:missing.map(([,label])=>label)});continue}
    const byPlayer=new Map();
    for(const game of gameTeam.games||[])for(const player of game.players||[]){
      const key=clean(player.playerId)||`${compact(player.name)}|${clean(player.number)}`;
      const saved=byPlayer.get(key)||{playerId:player.playerId,number:player.number,name:player.name,lines:[]};
      saved.lines.push(...(player.statLines||[]));byPlayer.set(key,saved);
    }
    for(const player of byPlayer.values()){
      let changedPlayer=false;
      for(const bucket of aggregatePlayer(player).values()){
        const incoming=outputValues(bucket);if(!Object.keys(incoming).length)continue;
        let section=(team.stats||[]).find(row=>compact(row.category)===compact(bucket.category));
        if(!section){section={category:bucket.category,headers:[],rows:[]};(team.stats||(team.stats=[])).push(section)}
        let row=(section.rows||[]).find(item=>item.playerId===player.playerId)||(section.rows||[]).find(item=>compact(item.name)===compact(player.name)&&clean(item.number)===clean(player.number));
        if(!row){row={playerId:player.playerId,number:player.number,name:player.name,rosterMatched:true,values:{}};(section.rows||(section.rows=[])).push(row)}
        for(const [header,value] of Object.entries(incoming)){
          const target=Object.keys(row.values||{}).find(key=>compact(key)===compact(header))||header;
          row.values||(row.values={});row.values[target]=value;row.statSources||(row.statSources={});row.statSources[target]='Calculated from complete game logs';
          if(!section.headers.some(key=>compact(key)===compact(target)))section.headers.push(target);fields++;
        }
        categories++;changedPlayer=true;
      }
      if(changedPlayer)players++;
    }
  }
  rosters.updatedAt=new Date().toISOString();
  rosters.summary={...(rosters.summary||{}),gameLogSeasonReconciliation:{teams,players,categories,fields,skippedTeams,incompleteTeams,policy:'Season totals are recalculated only when every known final game has individual stat data; incomplete game-log sets preserve the existing season source totals.'}};
  return{teams,players,categories,fields,skippedTeams,incompleteTeams};
}

function selfTest(){
  const makeRoster=yards='725'=>({teams:{MANTI:{stats:[{category:'Passing',headers:['COMP-ATT','COMP%','YARDS','YARDS/COMP.','TD','Int'],rows:[{playerId:'wright',name:'Kingston Wright',number:'1',values:{'COMP-ATT':'52-70','COMP%':'74.29',YARDS:yards,'YARDS/COMP.':'13.94',TD:'12',Int:'3'}}]}]}}});
  const rows=[['2026-08-14','PINE VIEW','41-56',525,3,3],['2026-08-21','RICHFIELD','11-14',200,4,0],['2026-08-28','GRANTSVILLE','22-37',466,5,1]];
  const makeGame=([date,opponent,attempts,yards,td,int])=>({date,opponent,status:'Final',final:true,players:[{playerId:'wright',name:'Kingston Wright',number:'1',statLines:[{category:'Passing',values:{'Comp-Att':attempts,Yards:String(yards),TD:String(td),Int:String(int)}}]}]});
  const rosters=makeRoster(),games={teams:{MANTI:{games:rows.map(makeGame)}}},result=reconcileSeasonStats(rosters,games),values=rosters.teams.MANTI.stats[0].rows[0].values;
  if(result.players!==1||values['COMP-ATT']!=='74-107'||values.YARDS!=='1191'||values.TD!=='12'||values.Int!=='4'||values['COMP%']!=='69.16')throw new Error('Season reconciliation self-test failed');
  const guarded=makeRoster('1140'),partial={teams:{MANTI:{games:rows.slice(0,2).map(makeGame)}}},teamData={teams:{MANTI:{team:'MANTI',schedule:rows.map(([date,opponent])=>({date,opponent,teamScore:1,opponentScore:0,result:'W',rusStatus:'Final'}))}}};
  const guardResult=reconcileSeasonStats(guarded,partial,{teamData});
  if(guardResult.skippedTeams!==1||guarded.teams.MANTI.stats[0].rows[0].values.YARDS!=='1140')throw new Error('Incomplete game-log guard self-test failed');
  console.log('Season reconciliation self-test passed.');
}

if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
if(!fs.existsSync(ROSTERS)||!fs.existsSync(GAMES))throw new Error('Season reconciliation inputs are missing.');
const rosters=JSON.parse(fs.readFileSync(ROSTERS,'utf8')),games=JSON.parse(fs.readFileSync(GAMES,'utf8')),teamData=fs.existsSync(TEAM_DATA)?JSON.parse(fs.readFileSync(TEAM_DATA,'utf8')):null,weekly=fs.existsSync(WEEKLY)?JSON.parse(fs.readFileSync(WEEKLY,'utf8')):null,summary=reconcileSeasonStats(rosters,games,{teamData,weekly});
fs.writeFileSync(ROSTERS,JSON.stringify(rosters,null,2)+'\n');
console.log(`Season totals reconciled from complete game logs for ${summary.players} players across ${summary.teams-summary.skippedTeams} teams; ${summary.skippedTeams} incomplete team(s) preserved (${summary.fields} fields).`);
