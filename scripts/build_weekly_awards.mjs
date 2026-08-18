import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const scoring=require('../award-scoring-core.js');
const PLAYER_GAMES='player-game-stats-2026.json';
const TEAMS='teams-data.json';
const WEEKLY='weekly-simulation.json';
const STATUS='weekly-awards-stat-status.json';
const OUT='weekly-awards-2026.json';
const DAY=86400000;
const classOrder=['6A','5A','4A','3A','2A','1A','8P'];
const classWeight={'6A':1.18,'5A':1.14,'4A':1.08,'3A':1,'2A':.95,'1A':.90,'8P':.88};
const ruralClasses=new Set(['3A','2A','1A','8P']);
const clean=v=>String(v??'').trim();
const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const aliases={CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',GRANDCOUNTY:'GRAND',GUNNISON:'GUNNISONVALLEY',MONUMENTVAL:'MONUMENTVALLEY',MAPLEMTN:'MAPLEMOUNTAIN',AMERICANLEADERSHIP:'ALA',AMERICANLEADERSHIPACADEMY:'ALA',STJOSEPH:'SAINTJOSEPH'};
const canon=v=>aliases[compact(v)]||compact(v);
const normalizeClass=v=>{const x=clean(v).toUpperCase();return x==='8-PLAYER'||x==='8PLAYER'?'8P':x};
const isoDay=t=>new Date(t).toISOString().slice(0,10);
function zonedDate(timeZone){const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=type=>parts.find(x=>x.type===type)?.value||'';return`${get('year')}-${get('month')}-${get('day')}`}
function dayStamp(v){const s=clean(v);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?Date.UTC(Number(m[3]),Number(m[1])-1,Number(m[2])):NaN}
function weekStart(v){const t=dayStamp(v);return Number.isFinite(t)?t-((new Date(t).getUTCDay()+6)%7)*DAY:NaN}
function isoDate(v){const t=dayStamp(v);return Number.isFinite(t)?isoDay(t):''}
function scoreValue(v){if(v===null||v===undefined||clean(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function gameKey(g){return`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`}
function primaryPosition(v){const x=clean(v).toUpperCase();if(/\bQB\b/.test(x))return'QB';if(/\b(?:RB|HB|FB)\b/.test(x))return'RB';if(/\b(?:WR|SE|FL)\b/.test(x))return'WR';if(/\bTE\b/.test(x))return'TE';if(/\b(?:DL|DE|DT|NT)\b/.test(x))return'DL';if(/\bLB\b/.test(x))return'LB';if(/\b(?:DB|CB|FS|SS|SAF)\b/.test(x))return'DB';if(/\b[KP]\b/.test(x))return'K/P';return'ATH'}
function splitLine(line){
  const category=clean(line?.category),values=line?.values||{},key=compact(category);
  if(key==='SPECIALTEAMS'){
    const kicking={},defense={};
    for(const [name,value] of Object.entries(values)){const k=compact(name);if(['FG','PAT','PTS','POINTS','LONGFG'].includes(k))kicking[name]=value;if(['RETURNTD','RETURNTDS'].includes(k))defense[name]=value}
    return[{category:'Kicking',values:kicking,side:'offense'},{category:'Defense',values:defense,side:'defense'}].filter(x=>Object.keys(x.values).length);
  }
  if(/Defense/i.test(category))return[{category:'Defense',values,side:'defense'}];
  if(/Passing|Rushing|Receiving|Kicking/i.test(category))return[{category,values,side:'offense'}];
  return[];
}
function displayLine(lines){
  return[...(lines||[])].filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2).map(line=>{
    const stats=Object.entries(line.values||{}).filter(([,v])=>clean(v)).slice(0,4).map(([k,v])=>`${k} ${v}`).join(', ');
    return stats?`${line.category}: ${stats}`:line.category;
  }).join(' • ')||'Reported game production';
}
function resultLabel(results){
  if(!results.length)return'';
  if(results.length===1){const g=results[0],result=g.teamScore===null||g.opponentScore===null?'':g.teamScore>g.opponentScore?'W':g.teamScore<g.opponentScore?'L':'T';return`${result}${result?` ${g.teamScore}-${g.opponentScore}`:''} vs ${g.opponent}`}
  const wins=results.filter(g=>g.win).length;return`${wins}-${results.length-wins} in ${results.length} games`;
}
function playerView(p,score,label){return{id:p.id,name:p.name,number:p.number,team:p.team,classification:p.classification,region:p.region,position:p.position||p.primaryPosition,score:Number(score.toFixed(2)),scoreLabel:label,offenseScore:Number(p.offense.toFixed(2)),defenseScore:Number(p.defense.toFixed(2)),winBonus:Number(p.winBonus.toFixed(2)),statLine:displayLine(p.lines),result:resultLabel(p.results),games:p.results.length}}
function sorted(players,metric,eligible=()=>true){return players.filter(p=>eligible(p)&&metric(p)>0).sort((a,b)=>metric(b)-metric(a)||b.rawOverall-a.rawOverall||a.name.localeCompare(b.name))}

if(!fs.existsSync(PLAYER_GAMES)||!fs.existsSync(TEAMS)||!fs.existsSync(WEEKLY))throw new Error('Weekly award inputs are missing');
const playerGames=JSON.parse(fs.readFileSync(PLAYER_GAMES,'utf8'));
const teams=JSON.parse(fs.readFileSync(TEAMS,'utf8'));
const weeklyGames=JSON.parse(fs.readFileSync(WEEKLY,'utf8')).games||[];
const manualStatus=fs.existsSync(STATUS)?JSON.parse(fs.readFileSync(STATUS,'utf8')):{weeks:{}};
const previous=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{weeks:[]};
const previousWeeks=new Map((previous.weeks||[]).map(w=>[Number(w.week),w]));
const utahToday=zonedDate('America/Denver');
const meta=new Map(teams.map(t=>[canon(t.team),t]));
const weekMap=new Map();
const reportedTeamGames=new Set();
const gameTeamIndex=new Map();
for(const [teamName,teamData] of Object.entries(playerGames.teams||{})){
  const tm=meta.get(canon(teamName))||{},classification=normalizeClass(tm.classification),region=clean(tm.region);
  for(const game of teamData.games||[]){
    const start=weekStart(game.date);if(!Number.isFinite(start))continue;
    gameTeamIndex.set(`${isoDate(game.date)}|${canon(teamName)}|${canon(game.opponent)}`,{teamName,classification,region,game});
    if(!weekMap.has(start))weekMap.set(start,{start,gameKeys:new Set(),teamGames:0,players:new Map()});
    const week=weekMap.get(start);week.gameKeys.add(game.gameKey||`${game.date}|${canon(teamName)}|${canon(game.opponent)}`);week.teamGames++;
    if((game.players||[]).some(p=>(p.statLines||[]).length))reportedTeamGames.add(`${game.gameKey}|${canon(teamName)}`);
    for(const player of game.players||[]){
      const id=clean(player.playerId)||`${canon(teamName)}|${compact(player.number)}|${compact(player.name)}`;
      if(!week.players.has(id))week.players.set(id,{id,name:clean(player.name)||'Unknown',number:clean(player.number),team:teamName,classification,region,position:clean(player.position),primaryPosition:primaryPosition(player.position),offense:0,defense:0,lines:[],results:[],winBonus:0});
      const p=week.players.get(id);if(!p.position&&player.position){p.position=clean(player.position);p.primaryPosition=primaryPosition(player.position)}
      for(const line of player.statLines||[])for(const part of splitLine(line)){
        const points=scoring.categoryScore(part.category,part.values,p.primaryPosition);if(part.side==='offense')p.offense+=points;else p.defense+=points;p.lines.push({...part,score:points});
      }
      const teamScore=scoreValue(game.teamScore),opponentScore=scoreValue(game.opponentScore),win=teamScore!==null&&opponentScore!==null&&teamScore>opponentScore;
      p.results.push({opponent:clean(game.opponent),teamScore,opponentScore,win});if(win)p.winBonus+=2;
    }
  }
}

const coverageByWeek=new Map();
for(const game of weeklyGames){
  const completed=game.actualAway!==null&&game.actualAway!==undefined&&game.actualHome!==null&&game.actualHome!==undefined;if(!completed)continue;
  const start=weekStart(game.date);if(!Number.isFinite(start))continue;
  if(!coverageByWeek.has(start))coverageByWeek.set(start,{teams:new Set(),reported:new Set(),missing:new Set()});
  const coverage=coverageByWeek.get(start),key=gameKey(game);
  for(const team of [game.awayTeam,game.homeTeam]){const name=clean(team);if(!name)continue;coverage.teams.add(name);if(reportedTeamGames.has(`${key}|${canon(name)}`))coverage.reported.add(name);else coverage.missing.add(name)}
}

const ordered=[...weekMap.values()].sort((a,b)=>a.start-b.start),first=ordered[0]?.start||0;
const weeks=ordered.map(week=>{
  const weekNumber=Math.round((week.start-first)/(7*DAY))+1,coverage=coverageByWeek.get(week.start)||{teams:new Set(),reported:new Set(),missing:new Set()},manualMissing=manualStatus.weeks?.[String(weekNumber)]?.missingTeams||[],missingTeams=new Set([...coverage.missing,...manualMissing].map(clean).filter(Boolean)),missingKeys=new Set([...missingTeams].map(canon));
  const players=[...week.players.values()].map(p=>{p.rawOverall=Math.max(p.offense,p.defense)+Math.min(p.offense,p.defense)*.35+p.winBonus;p.weight=classWeight[p.classification]||1;p.weightedOverall=p.rawOverall*p.weight;p.weightedOffense=(p.offense+p.winBonus)*p.weight;p.weightedDefense=(p.defense+p.winBonus)*p.weight;return p}).filter(p=>p.rawOverall>0&&classOrder.includes(p.classification)&&!missingKeys.has(canon(p.team)));
  const overall=sorted(players,p=>p.weightedOverall),offense=sorted(players,p=>p.weightedOffense,p=>p.offense>0),defense=sorted(players,p=>p.weightedDefense,p=>p.defense>0),rural=sorted(players,p=>p.rawOverall,p=>ruralClasses.has(p.classification)),ruralOffense=sorted(players,p=>p.offense+p.winBonus,p=>ruralClasses.has(p.classification)&&p.offense>0),ruralDefense=sorted(players,p=>p.defense+p.winBonus,p=>ruralClasses.has(p.classification)&&p.defense>0);
  const playerKey=p=>p?.id||`${canon(p?.team)}|${compact(p?.number)}|${compact(p?.name)}`,statewideMvpKey=playerKey(overall[0]),ruralMvpKey=playerKey(rural[0]),offenseAwardPool=offense.filter(p=>playerKey(p)!==statewideMvpKey),defenseAwardPool=defense.filter(p=>playerKey(p)!==statewideMvpKey),ruralOffenseAwardPool=ruralOffense.filter(p=>playerKey(p)!==ruralMvpKey),ruralDefenseAwardPool=ruralDefense.filter(p=>playerKey(p)!==ruralMvpKey);
  const majorAwardKeys=new Set([overall[0],offenseAwardPool[0],defenseAwardPool[0],rural[0],ruralOffenseAwardPool[0],ruralDefenseAwardPool[0]].filter(Boolean).map(playerKey));
  const classAwards=classOrder.map(classification=>{const rows=sorted(players,p=>p.rawOverall,p=>p.classification===classification&&!majorAwardKeys.has(playerKey(p)));return{classification,label:classification==='8P'?'8-Player':classification,winner:rows[0]?playerView(rows[0],rows[0].rawOverall,'RUS weekly score'):null,contenders:rows.slice(0,5).map(p=>playerView(p,p.rawOverall,'RUS weekly score'))}});
  const lockDate=isoDay(week.start+10*DAY),shouldLock=utahToday>=lockDate,prior=previousWeeks.get(weekNumber);
  if(shouldLock&&prior?.locked)return prior;
  return{week:weekNumber,startDate:isoDay(week.start),endDate:isoDay(week.start+6*DAY),lockDate,locked:shouldLock,lockedAt:shouldLock?new Date().toISOString():null,gameCount:week.gameKeys.size,teamGames:week.teamGames,playersReported:players.length,coverage:{teamsInCompletedGames:coverage.teams.size,teamsReportingStats:Math.max(0,coverage.teams.size-missingTeams.size),missingTeams:[...missingTeams].sort()},awards:{overall:overall[0]?playerView(overall[0],overall[0].weightedOverall,'Weighted Utah score'):null,offense:offenseAwardPool[0]?playerView(offenseAwardPool[0],offenseAwardPool[0].weightedOffense,'Weighted offense score'):null,defense:defenseAwardPool[0]?playerView(defenseAwardPool[0],defenseAwardPool[0].weightedDefense,'Weighted defense score'):null,rural:rural[0]?playerView(rural[0],rural[0].rawOverall,'Rural weekly score'):null,ruralOffense:ruralOffenseAwardPool[0]?playerView(ruralOffenseAwardPool[0],ruralOffenseAwardPool[0].offense+ruralOffenseAwardPool[0].winBonus,'Rural offense score'):null,ruralDefense:ruralDefenseAwardPool[0]?playerView(ruralDefenseAwardPool[0],ruralDefenseAwardPool[0].defense+ruralDefenseAwardPool[0].winBonus,'Rural defense score'):null},contenders:{overall:overall.slice(0,10).map(p=>playerView(p,p.weightedOverall,'Weighted Utah score')),offense:offenseAwardPool.slice(0,10).map(p=>playerView(p,p.weightedOffense,'Weighted offense score')),defense:defenseAwardPool.slice(0,10).map(p=>playerView(p,p.weightedDefense,'Weighted defense score')),rural:rural.slice(0,10).map(p=>playerView(p,p.rawOverall,'Rural weekly score')),ruralOffense:ruralOffenseAwardPool.slice(0,10).map(p=>playerView(p,p.offense+p.winBonus,'Rural offense score')),ruralDefense:ruralDefenseAwardPool.slice(0,10).map(p=>playerView(p,p.defense+p.winBonus,'Rural defense score'))},classes:classAwards};
});
const weekByNumber=new Map(weeks.map(row=>[row.week,row]));
function teamGame(date,team,opponent){return gameTeamIndex.get(`${isoDate(date)}|${canon(team)}|${canon(opponent)}`)||null}
function scoreGamePlayer(player,ctx,opponent,won,teamScore,opponentScore){
  const primary=primaryPosition(player.position),lines=[];let offense=0,defense=0;
  for(const line of player.statLines||[])for(const part of splitLine(line)){const points=scoring.categoryScore(part.category,part.values,primary);if(part.side==='offense')offense+=points;else defense+=points;lines.push({...part,score:points})}
  const winBonus=won?2:0,score=Math.max(offense,defense)+Math.min(offense,defense)*.35+winBonus;
  return{id:clean(player.playerId)||`${canon(ctx.teamName)}|${compact(player.number)}|${compact(player.name)}`,name:clean(player.name)||'Unknown',number:clean(player.number),team:ctx.teamName,classification:ctx.classification,region:ctx.region,position:clean(player.position)||primary,score,scoreLabel:'Player of the Game score',offenseScore:offense,defenseScore:defense,winBonus,lines,result:`${teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T'} ${teamScore}-${opponentScore} vs ${opponent}`,selectionSource:'reported-stats'};
}
function scoringPlayCandidates(ctx,opponent,won,teamScore,opponentScore){
  if(!ctx)return[];const rows=new Map(),add=(name,type)=>{name=clean(name).replace(/\s+/g,' ');if(!name||/^\d+[- ]yard|^(run|pass|safety)$/i.test(name))return;const key=compact(name);if(!rows.has(key))rows.set(key,{name,touchdowns:0,passTds:0});rows.get(key)[type]++};
  for(const raw of ctx.game.scoringPlays||[]){const text=clean(raw);if(!text||/\b(?:FG|field goal|safety)\b/i.test(text))continue;let body=text.includes('—')?text.slice(text.indexOf('—')+1):text;body=body.replace(/^\s*\([^)]*\)\s*/,'').trim();const scorer=body.match(/^([A-Za-z][A-Za-z .’'\-]{1,60}?)\s*,\s*(?:\d+[- ]yard|pass\b|run\b|rush\b|int\.?\b|interception\b|kick\b|punt\b|fumble\b)/i);if(scorer)add(scorer[1],'touchdowns');const passer=body.match(/\bpass from\s+([A-Za-z][A-Za-z .’'\-]{1,60}?)(?=\s*\(|$)/i);if(passer)add(passer[1],'passTds')}
  const winBonus=won?2:0;return[...rows.values()].map(row=>{const offense=row.touchdowns*6+row.passTds*5,details=[row.touchdowns?`${row.touchdowns} touchdown${row.touchdowns===1?'':'s'}`:'',row.passTds?`${row.passTds} passing TD${row.passTds===1?'':'s'}`:''].filter(Boolean).join(' • ');return{id:'',name:row.name,number:'',team:ctx.teamName,classification:ctx.classification,region:ctx.region,position:'Scoring',score:offense+winBonus,scoreLabel:'Player of the Game score',offenseScore:offense,defenseScore:0,winBonus,statLine:`Scoring plays: ${details}`,result:`${teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T'} ${teamScore}-${opponentScore} vs ${opponent}`,selectionSource:'touchdown-fallback'}})}
function anonymousScoringLeader(game,team,opponent,teamScore,opponentScore,classification='',region=''){
  const ctx=teamGame(game.date,team,opponent),plays=(ctx?.game.scoringPlays||[]).filter(play=>!/\b(?:FG|field goal|safety)\b/i.test(clean(play))),touchdowns=plays.length||Math.max(1,Math.floor(teamScore/7)),winBonus=teamScore>opponentScore?2:0,offense=touchdowns*6;
  return{id:'',name:'Name not reported',number:'',team,classification,region,position:'Scoring leader',score:offense+winBonus,scoreLabel:'Player of the Game score',offenseScore:offense,defenseScore:0,winBonus,statLine:`${touchdowns} team touchdown${touchdowns===1?'':'s'} recorded • Individual scorer not reported`,result:`${teamScore>opponentScore?'W':teamScore<opponentScore?'L':'T'} ${teamScore}-${opponentScore} vs ${opponent}`,selectionSource:'team-touchdown-fallback'}
}
const gameAwards=weeklyGames.filter(game=>game.actualAway!==null&&game.actualAway!==undefined&&game.actualHome!==null&&game.actualHome!==undefined).map(game=>{
  const key=gameKey(game),start=weekStart(game.date),weekNumber=Math.round((start-first)/(7*DAY))+1,weekInfo=weekByNumber.get(weekNumber)||{},away=teamGame(game.date,game.awayTeam,game.homeTeam),home=teamGame(game.date,game.homeTeam,game.awayTeam),manualMissing=new Set((manualStatus.weeks?.[String(weekNumber)]?.missingTeams||[]).map(canon)),missing=[];
  for(const [name,ctx] of [[game.awayTeam,away],[game.homeTeam,home]])if(!ctx||!(ctx.game.players||[]).some(player=>(player.statLines||[]).length)||manualMissing.has(canon(name)))missing.push(name);
  const base={gameKey:key,date:isoDate(game.date),awayTeam:game.awayTeam,homeTeam:game.homeTeam,awayScore:Number(game.actualAway),homeScore:Number(game.actualHome),week:weekNumber,lockDate:weekInfo.lockDate||'',locked:false,updatesWithStats:true};
  const candidates=[];
  for(const [ctx,opponent,teamScore,opponentScore] of [[away,game.homeTeam,Number(game.actualAway),Number(game.actualHome)],[home,game.awayTeam,Number(game.actualHome),Number(game.actualAway)]])if(ctx){for(const player of ctx.game.players||[]){const row=scoreGamePlayer(player,ctx,opponent,teamScore>opponentScore,teamScore,opponentScore);if(row.score>0)candidates.push(row)}candidates.push(...scoringPlayCandidates(ctx,opponent,teamScore>opponentScore,teamScore,opponentScore))}
  const bestByPlayer=new Map();for(const row of candidates){const playerKey=`${canon(row.team)}|${compact(row.name)}`,prior=bestByPlayer.get(playerKey);if(!prior||row.score>prior.score)bestByPlayer.set(playerKey,row)}const ranked=[...bestByPlayer.values()].sort((a,b)=>b.score-a.score||b.offenseScore-a.offenseScore||b.defenseScore-a.defenseScore||a.name.localeCompare(b.name));
  const winningAway=Number(game.actualAway)>Number(game.actualHome),fallbackTeam=winningAway?game.awayTeam:game.homeTeam,fallbackOpponent=winningAway?game.homeTeam:game.awayTeam,fallbackScore=winningAway?Number(game.actualAway):Number(game.actualHome),fallbackOppScore=winningAway?Number(game.actualHome):Number(game.actualAway),fallbackCtx=winningAway?away:home,winner=ranked[0]||anonymousScoringLeader(game,fallbackTeam,fallbackOpponent,fallbackScore,fallbackOppScore,fallbackCtx?.classification||'',fallbackCtx?.region||'');
  const statLine=winner.lines?displayLine(winner.lines):winner.statLine;
  return{...base,status:'awarded',provisional:missing.length>0||winner.selectionSource!=='reported-stats',missingTeams:missing,player:{id:winner.id,name:winner.name,number:winner.number,team:winner.team,classification:winner.classification,region:winner.region,position:winner.position,score:Number(winner.score.toFixed(2)),scoreLabel:winner.scoreLabel,offenseScore:Number(winner.offenseScore.toFixed(2)),defenseScore:Number(winner.defenseScore.toFixed(2)),winBonus:winner.winBonus,statLine,result:winner.result,selectionSource:winner.selectionSource}};
});
const output={season:2026,updatedAt:playerGames.updatedAt||new Date().toISOString(),generatedAt:new Date().toISOString(),method:{scoringVersion:scoring.VERSION,defenseScale:scoring.DEFENSE_SCALE||1,ruralClasses:['3A','2A','1A','8-Player'],statewideWeights:classWeight,winBonus:'2 points added for each team win across every weekly award score; statewide multipliers are applied after the bonus',playerOfGame:'One current unweighted overall winner per completed game. Full reported game statistics are preferred; named touchdown totals from scoring plays are the fallback. When no player name is reported, the winning team receives a clearly labeled unnamed scoring-leader placeholder until details arrive. Selections update whenever new stats arrive.',locking:'Each week remains provisional through Wednesday and locks at the start of the following Thursday in America/Denver time.'},weeks,gameAwards};
fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');
console.log(`Weekly awards: ${weeks.length} week(s), ${weeks.reduce((n,w)=>n+w.playersReported,0)} player-week candidates, ${gameAwards.filter(row=>row.player).length} game awards.`);
