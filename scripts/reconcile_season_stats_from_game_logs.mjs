import fs from 'node:fs';

const ROSTERS='deseret-rosters-stats-2026.json';
const GAMES='player-game-stats-2026.json';
const clean=value=>String(value??'').trim();
const compact=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
const numeric=value=>{
  const number=Number(clean(value).replace(/,/g,'').replace(/%$/,''));
  return Number.isFinite(number)?number:null;
};
const rounded=(value,places=2)=>Number(value.toFixed(places)).toString();
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

export function reconcileSeasonStats(rosters,games){
  let teams=0,players=0,categories=0,fields=0;
  for(const [teamKey,gameTeam] of Object.entries(games.teams||{})){
    const rosterKey=Object.keys(rosters.teams||{}).find(key=>compact(key)===compact(teamKey));if(!rosterKey)continue;
    const team=rosters.teams[rosterKey],byPlayer=new Map();teams++;
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
          row.values||(row.values={});row.values[target]=value;row.statSources||(row.statSources={});row.statSources[target]='Calculated from game logs';
          if(!section.headers.some(key=>compact(key)===compact(target)))section.headers.push(target);fields++;
        }
        categories++;changedPlayer=true;
      }
      if(changedPlayer)players++;
    }
  }
  rosters.updatedAt=new Date().toISOString();
  rosters.summary={...(rosters.summary||{}),gameLogSeasonReconciliation:{teams,players,categories,fields,policy:'Season totals are calculated by summing available individual game logs; rate statistics are recalculated from those totals.'}};
  return{teams,players,categories,fields};
}

function selfTest(){
  const rosters={teams:{MANTI:{stats:[{category:'Passing',headers:['COMP-ATT','COMP%','YARDS','YARDS/COMP.','TD','Int'],rows:[{playerId:'wright',name:'Kingston Wright',number:'1',values:{'COMP-ATT':'52-70','COMP%':'74.29',YARDS:'725','YARDS/COMP.':'13.94',TD:'12',Int:'3'}}]}]}}};
  const games={teams:{MANTI:{games:[['41-56',525,3,3],['11-14',200,4,0],['22-37',466,5,1]].map(([attempts,yards,td,int])=>({players:[{playerId:'wright',name:'Kingston Wright',number:'1',statLines:[{category:'Passing',values:{'Comp-Att':attempts,Yards:String(yards),TD:String(td),Int:String(int)}}]}]}))}}};
  const result=reconcileSeasonStats(rosters,games),values=rosters.teams.MANTI.stats[0].rows[0].values;
  if(result.players!==1||values['COMP-ATT']!=='74-107'||values.YARDS!=='1191'||values.TD!=='12'||values.Int!=='4'||values['COMP%']!=='69.16')throw new Error('Season reconciliation self-test failed');
  console.log('Season reconciliation self-test passed.');
}

if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
if(!fs.existsSync(ROSTERS)||!fs.existsSync(GAMES))throw new Error('Season reconciliation inputs are missing.');
const rosters=JSON.parse(fs.readFileSync(ROSTERS,'utf8')),games=JSON.parse(fs.readFileSync(GAMES,'utf8')),summary=reconcileSeasonStats(rosters,games);
fs.writeFileSync(ROSTERS,JSON.stringify(rosters,null,2)+'\n');
console.log(`Season totals reconciled from game logs for ${summary.players} players across ${summary.teams} teams (${summary.fields} fields).`);
