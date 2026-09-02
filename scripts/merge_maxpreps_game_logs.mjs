import fs from 'node:fs';

const FILE='player-game-stats-2026.json',CACHE='maxpreps-player-game-stats-2026.json';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',STJOSEPH:'SAINTJOSEPH',JUANDIEGOCATHOLIC:'JUANDIEGO'};
const canon=v=>aliases[compact(v)]||compact(v);
const nonEmpty=v=>v!==null&&v!==undefined&&clean(v)!=='';
const numeric=v=>{const n=Number(clean(v).replace(/,/g,'').replace(/%$/,''));return Number.isFinite(n)?n:null};
function gameCategoryTotal(game,category,header){let total=0,found=false;for(const player of game.players||[])for(const line of player.statLines||[]){if(compact(line.category)!==compact(category))continue;const key=Object.keys(line.values||{}).find(k=>compact(k)===compact(header)),value=key?numeric(line.values[key]):null;if(value===null)continue;total+=value;found=true}return found?total:null}

export function mergeMaxPrepsGameLogs(output,cache){
  let teamsMatched=0,gamesMatched=0,playersAdded=0,linesAdded=0,fieldsFilled=0,correctedFields=0,unmatchedGames=0;
  for(const [teamName,saved] of Object.entries(cache?.teams||{})){
    const outputKey=Object.keys(output.teams||{}).find(k=>canon(k)===canon(teamName));if(!outputKey)continue;
    const targetTeam=output.teams[outputKey];teamsMatched++;
    for(const incoming of saved.games||[]){
      const game=(targetTeam.games||[]).find(g=>g.date===incoming.date&&canon(g.opponent)===canon(incoming.opponent));if(!game){unmatchedGames++;continue}
      gamesMatched++;let player=(game.players||[]).find(p=>p.playerId===incoming.playerId)||(game.players||[]).find(p=>compact(p.name)===compact(incoming.name)&&clean(p.number)===clean(incoming.number));
      if(!player){player={playerId:incoming.playerId,number:incoming.number,name:incoming.name,position:'',rosterMatched:true,statLines:[],scoringPlays:[]};(game.players||(game.players=[])).push(player);playersAdded++}
      for(const incomingLine of incoming.statLines||[]){
        let line=(player.statLines||[]).find(x=>compact(x.category)===compact(incomingLine.category));if(!line){line={category:incomingLine.category,values:{},statSources:{}};(player.statLines||(player.statLines=[])).push(line);linesAdded++}
        for(const [header,value] of Object.entries(incomingLine.values||{})){line.values||(line.values={});const targetHeader=Object.keys(line.values).find(existing=>compact(existing)===compact(header))||header,existing=line.values[targetHeader];if(nonEmpty(existing)){const h=compact(header),receivingHeader=h==='YARDS'?'YARDS':h==='TD'?'TD':'',receivingTotal=compact(incomingLine.category)==='PASSING'&&receivingHeader?gameCategoryTotal(game,'Receiving',receivingHeader):null,incomingNumber=numeric(value),existingNumber=numeric(existing);if(receivingTotal===null||incomingNumber!==receivingTotal||existingNumber===incomingNumber)continue;line.values[targetHeader]=value;line.statSources||(line.statSources={});line.statSources[targetHeader]='MaxPreps (Deseret consistency correction)';correctedFields++;continue}line.values[targetHeader]=value;line.statSources||(line.statSources={});line.statSources[targetHeader]='MaxPreps';fieldsFilled++}
      }
      if(!game.maxprepsUrl&&incoming.url)game.maxprepsUrl=incoming.url;
    }
  }
  return{teamsMatched,gamesMatched,playersAdded,linesAdded,fieldsFilled,correctedFields,unmatchedGames};
}

function selfTest(){
  const output={teams:{MANTI:{games:[{date:'2026-08-14',opponent:'PINE VIEW',players:[{playerId:'wright',number:'1',name:'Kingston Wright',statLines:[{category:'Passing',values:{Yards:'79',TD:'3'}}]},{playerId:'receiver',number:'6',name:'Receiver',statLines:[{category:'Receiving',values:{Yards:'200',TD:'4'}}]}]}]}}};
  const cache={teams:{MANTI:{games:[{date:'2026-08-14',opponent:'Pine View',playerId:'wright',number:'1',name:'Kingston Wright',statLines:[{category:'Passing',values:{'COMP-ATT':'11-14',YARDS:'200',TD:'4',Int:'0'}}]}]}}};
  const result=mergeMaxPrepsGameLogs(output,cache),line=output.teams.MANTI.games[0].players[0].statLines[0];
  if(result.fieldsFilled!==2||result.correctedFields!==2||line.values.TD!=='4'||line.values.Yards!=='200'||Object.hasOwn(line.values,'YARDS'))throw new Error('MaxPreps game-log merge self-test failed');
  console.log('MaxPreps game-log merge self-test passed.');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
if(!fs.existsSync(FILE)||!fs.existsSync(CACHE)){console.log('MaxPreps game-log inputs missing; skipping.');process.exit(0)}
const output=JSON.parse(fs.readFileSync(FILE,'utf8')),cache=JSON.parse(fs.readFileSync(CACHE,'utf8')),summary=mergeMaxPrepsGameLogs(output,cache);
output.updatedAt=new Date().toISOString();output.summary={...(output.summary||{}),maxprepsFallback:summary};fs.writeFileSync(FILE,JSON.stringify(output,null,2)+'\n');
console.log(`MaxPreps game logs: ${summary.gamesMatched} games matched; ${summary.playersAdded} players added; ${summary.linesAdded} stat lines added; ${summary.fieldsFilled} fields filled; ${summary.correctedFields} inconsistent Deseret fields corrected; ${summary.unmatchedGames} games skipped.`);
