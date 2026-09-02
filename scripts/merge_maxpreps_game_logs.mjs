import fs from 'node:fs';

const FILE='player-game-stats-2026.json',CACHE='maxpreps-player-game-stats-2026.json',TEAM_DATA='deseret-team-data-2026.json';
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',STJOSEPH:'SAINTJOSEPH',JUANDIEGOCATHOLIC:'JUANDIEGO'};
const canon=v=>aliases[compact(v)]||compact(v);
const nonEmpty=v=>v!==null&&v!==undefined&&clean(v)!=='';
const numeric=v=>{const n=Number(clean(v).replace(/,/g,'').replace(/%$/,''));return Number.isFinite(n)?n:null};
const isoDate=v=>{const s=clean(v);let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;return s};
const hasScore=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
function gameCategoryTotal(game,category,header){let total=0,found=false;for(const player of game.players||[])for(const line of player.statLines||[]){if(compact(line.category)!==compact(category))continue;const key=Object.keys(line.values||{}).find(k=>compact(k)===compact(header)),value=key?numeric(line.values[key]):null;if(value===null)continue;total+=value;found=true}return found?total:null}
function scheduleTeam(scheduleData,teamName){return Object.values(scheduleData?.teams||{}).find(team=>canon(team?.team)===canon(teamName))||null}
function scheduleGameIsFinal(game){const status=clean(game?.rusStatus).toUpperCase(),result=clean(game?.result).toUpperCase();return status.includes('FINAL')||(hasScore(game?.teamScore)&&hasScore(game?.opponentScore))||['W','L','T'].includes(result)}
function expectedScheduleGame(scheduleData,teamName,incoming){const team=scheduleTeam(scheduleData,teamName);if(!team)return null;const date=isoDate(incoming?.date),finals=(team.schedule||[]).filter(game=>scheduleGameIsFinal(game)&&isoDate(game.date)===date);if(!finals.length)return null;return finals.find(game=>canon(game.opponent)===canon(incoming?.opponent))||(finals.length===1?finals[0]:null)}
function shellFromSchedule(teamName,schedule,incoming){const isAway=canon(schedule.awayTeam)===canon(teamName)||clean(schedule.site).toLowerCase()==='away',opponent=clean(schedule.opponent)||(isAway?schedule.homeTeam:schedule.awayTeam),awayTeam=clean(schedule.awayTeam)||(isAway?teamName:opponent),homeTeam=clean(schedule.homeTeam)||(isAway?opponent:teamName),teamScore=hasScore(schedule.teamScore)?Number(schedule.teamScore):null,opponentScore=hasScore(schedule.opponentScore)?Number(schedule.opponentScore):null;return{gameKey:`${isoDate(schedule.date||incoming.date)}|${compact(awayTeam)}|${compact(homeTeam)}`,date:isoDate(schedule.date||incoming.date),opponent,location:isAway?'Away':'Home',status:'Final',final:true,teamScore,opponentScore,url:clean(schedule.gameUrl)||clean(incoming.url),players:[],scoringPlays:[],maxprepsRecovered:true}}

export function mergeMaxPrepsGameLogs(output,cache,scheduleData=null){
  let teamsMatched=0,gamesMatched=0,gamesAdded=0,playersAdded=0,linesAdded=0,fieldsFilled=0,correctedFields=0,unmatchedGames=0;
  output.teams||(output.teams={});
  for(const [teamName,saved] of Object.entries(cache?.teams||{})){
    let outputKey=Object.keys(output.teams).find(k=>canon(k)===canon(teamName)),targetTeam=outputKey?output.teams[outputKey]:null,matchedTeam=!!targetTeam;
    if(matchedTeam)teamsMatched++;
    for(const incoming of saved.games||[]){
      const expected=expectedScheduleGame(scheduleData,teamName,incoming);
      if(!targetTeam&&expected){outputKey=teamName;targetTeam={team:teamName,games:[]};output.teams[outputKey]=targetTeam;if(!matchedTeam){teamsMatched++;matchedTeam=true}}
      if(!targetTeam){unmatchedGames++;continue}
      targetTeam.games||(targetTeam.games=[]);
      let game=targetTeam.games.find(g=>isoDate(g.date)===isoDate(incoming.date)&&canon(g.opponent)===canon(incoming.opponent));
      if(!game&&expected){const sameDate=targetTeam.games.filter(g=>isoDate(g.date)===isoDate(incoming.date));game=sameDate.find(g=>canon(g.opponent)===canon(expected.opponent))||(sameDate.length===1?sameDate[0]:null)}
      if(!game&&expected){game=shellFromSchedule(teamName,expected,incoming);targetTeam.games.push(game);gamesAdded++}
      if(!game){unmatchedGames++;continue}
      gamesMatched++;let player=(game.players||[]).find(p=>p.playerId===incoming.playerId)||(game.players||[]).find(p=>compact(p.name)===compact(incoming.name)&&clean(p.number)===clean(incoming.number));
      if(!player){player={playerId:incoming.playerId,number:incoming.number,name:incoming.name,position:'',rosterMatched:true,statLines:[],scoringPlays:[]};(game.players||(game.players=[])).push(player);playersAdded++}
      for(const incomingLine of incoming.statLines||[]){
        let line=(player.statLines||[]).find(x=>compact(x.category)===compact(incomingLine.category));if(!line){line={category:incomingLine.category,values:{},statSources:{}};(player.statLines||(player.statLines=[])).push(line);linesAdded++}
        for(const [header,value] of Object.entries(incomingLine.values||{})){line.values||(line.values={});const targetHeader=Object.keys(line.values).find(existing=>compact(existing)===compact(header))||header,existing=line.values[targetHeader];if(nonEmpty(existing)){const h=compact(header),receivingHeader=h==='YARDS'?'YARDS':h==='TD'?'TD':'',receivingTotal=compact(incomingLine.category)==='PASSING'&&receivingHeader?gameCategoryTotal(game,'Receiving',receivingHeader):null,incomingNumber=numeric(value),existingNumber=numeric(existing);if(receivingTotal===null||incomingNumber!==receivingTotal||existingNumber===incomingNumber)continue;line.values[targetHeader]=value;line.statSources||(line.statSources={});line.statSources[targetHeader]='MaxPreps (Deseret consistency correction)';correctedFields++;continue}line.values[targetHeader]=value;line.statSources||(line.statSources={});line.statSources[targetHeader]='MaxPreps';fieldsFilled++}
      }
      if(!game.maxprepsUrl&&incoming.url)game.maxprepsUrl=incoming.url;
    }
  }
  for(const team of Object.values(output.teams||{}))team.games?.sort((a,b)=>isoDate(a.date).localeCompare(isoDate(b.date))||clean(a.opponent).localeCompare(clean(b.opponent)));
  return{teamsMatched,gamesMatched,gamesAdded,playersAdded,linesAdded,fieldsFilled,correctedFields,unmatchedGames};
}

function selfTest(){
  const output={teams:{MANTI:{games:[{date:'2026-08-14',opponent:'PINE VIEW',players:[{playerId:'wright',number:'1',name:'Kingston Wright',statLines:[{category:'Passing',values:{Yards:'79',TD:'3'}}]},{playerId:'receiver',number:'6',name:'Receiver',statLines:[{category:'Receiving',values:{Yards:'200',TD:'4'}}]}]}]}}};
  const cache={teams:{MANTI:{games:[{date:'2026-08-14',opponent:'Pine View',playerId:'wright',number:'1',name:'Kingston Wright',statLines:[{category:'Passing',values:{'COMP-ATT':'11-14',YARDS:'200',TD:'4',Int:'0'}}]}]}}};
  const result=mergeMaxPrepsGameLogs(output,cache),line=output.teams.MANTI.games[0].players[0].statLines[0];
  if(result.fieldsFilled!==2||result.correctedFields!==2||line.values.TD!=='4'||line.values.Yards!=='200'||Object.hasOwn(line.values,'YARDS'))throw new Error('MaxPreps game-log merge self-test failed');
  const missing={teams:{MANTI:{team:'MANTI',games:[]}}},missingCache={teams:{MANTI:{games:[{date:'2026-08-21',opponent:'Grantsville',url:'https://example.test/game',playerId:'wright',number:'1',name:'Kingston Wright',statLines:[{category:'Passing',values:{YARDS:'466'}}]}]}}},schedule={teams:{MANTI:{team:'MANTI',schedule:[{date:'2026-08-21',awayTeam:'GRANTSVILLE',homeTeam:'MANTI',opponent:'GRANTSVILLE',site:'home',teamScore:46,opponentScore:47,result:'L',rusStatus:'Final'}]}}};
  const recovered=mergeMaxPrepsGameLogs(missing,missingCache,schedule),game=missing.teams.MANTI.games[0];
  if(recovered.gamesAdded!==1||!game?.final||game.opponent!=='GRANTSVILLE'||game.players[0]?.statLines[0]?.values?.YARDS!=='466')throw new Error('MaxPreps missing-final recovery self-test failed');
  console.log('MaxPreps game-log merge self-test passed.');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
if(!fs.existsSync(FILE)||!fs.existsSync(CACHE)){console.log('MaxPreps game-log inputs missing; skipping.');process.exit(0)}
const output=JSON.parse(fs.readFileSync(FILE,'utf8')),cache=JSON.parse(fs.readFileSync(CACHE,'utf8')),scheduleData=fs.existsSync(TEAM_DATA)?JSON.parse(fs.readFileSync(TEAM_DATA,'utf8')):null,summary=mergeMaxPrepsGameLogs(output,cache,scheduleData);
output.updatedAt=new Date().toISOString();output.summary={...(output.summary||{}),maxprepsFallback:summary};fs.writeFileSync(FILE,JSON.stringify(output,null,2)+'\n');
console.log(`MaxPreps game logs: ${summary.gamesMatched} games matched; ${summary.gamesAdded} missing final games recovered; ${summary.playersAdded} players added; ${summary.linesAdded} stat lines added; ${summary.fieldsFilled} fields filled; ${summary.correctedFields} inconsistent Deseret fields corrected; ${summary.unmatchedGames} games skipped.`);
