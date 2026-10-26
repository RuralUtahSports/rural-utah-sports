import {aggregateGames} from './reconcile_season_stats_from_game_logs.mjs';
import fs from 'node:fs';

const ROOT='.';
const OUTPUT='audits/2026-player-stats-audit.json';
const DOC='audits/2026-player-stats-audit.md';
const read=(f,fallback)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return fallback}};
const compact=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const number=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(String(v).replace(/,/g,''));return Number.isFinite(x)?x:null};
const category=v=>compact(v).replace(/^DEFENSE$/,'DEFENSESPECIALTEAMS');
const field=v=>{const k=compact(v);return k==='INTERCEPTIONS'||k==='PASSINT'||k==='INTS'?'PASSINT':k==='DEFENSIVETD'?'DEFENSETD':k==='RETURNTDS'?'RETURNTD':k};
const requested=new Set(['YARDS','TD','CARRIES','RECEPTIONS','TACKLES','SACKS','PASSINT','FG','PAT','PTS','INT']);
const issues=[],summaries=[];
const tally={teams:0,rosterPlayers:0,uniqueRosterIDs:new Set(),statRows:0,athletesWithStats:new Set(),gamesWithPlayerRecords:0,gamePlayerRows:0,gameStatLines:0,missingStatPlayers:0,missingTeamStats:[],unmatchedSeasonStatPlayers:0,unmatchedGamePlayers:0,seasonAboveGameSum:0,gameAboveSeasonSum:0,reviewFlags:0,sourceStatsFetchFailures:0};
function flag(level,code,team,subject,detail={}){issues.push({level,code,team,subject,...detail})}
const rosters=read('deseret-rosters-stats-2026.json',{teams:{}});
const gameStats=read('player-game-stats-2026.json',{teams:{}});
const metrics=read('deseret-stat-metrics-2026.json',{teams:{}});
const aliases={CEDAR:'CEDARCITY',GRANDCOUNTY:'GRAND',MONUMENTVAL:'MONUMENTVALLEY',STJOSEPH:'SAINTJOSEPH',UMALEHI:'UTAHMILITARYACADEMYCAMPWILLIAMS'};
const canon=v=>aliases[compact(v)]||compact(v);
const byGameTeam=new Map(Object.entries(gameStats.teams||{}).map(([name,entry])=>[canon(name),entry]));
for(const [team,school] of Object.entries(rosters.teams||{})){
 tally.teams++;
 const roster=Array.isArray(school.roster)?school.roster:[],sections=school.stats||[];
 const rosterIds=new Map(),statIds=new Set(),gameSums=new Map();
 for(const player of roster){
  if(!player.playerId){flag('review','MISSING_ROSTER_ID',team,player.name||'Unnamed roster player');continue}
  if(rosterIds.has(player.playerId))flag('review','DUPLICATE_ROSTER_ID',team,player.name,{id:player.playerId});
  rosterIds.set(player.playerId,player);tally.uniqueRosterIDs.add(player.playerId);
 }
 tally.rosterPlayers+=roster.length;
 if(!sections.length)tally.missingTeamStats.push(team);
 if(school.statsFetched===false)tally.sourceStatsFetchFailures++;
 const games=byGameTeam.get(canon(team))?.games||[];
 const knownFinalGames=games.filter(g=>g.final===true),anyStatGames=knownFinalGames.filter(g=>(g.players||[]).some(p=>(p.statLines||[]).some(l=>Object.values(l.values||{}).some(v=>v!==''&&v!==null&&v!==undefined))));
 tally.gamesWithPlayerRecords+=anyStatGames.length;
 for(const game of games){
  if(game.final!==true)continue;
  const seen=new Set();
  for(const player of game.players||[]){
   tally.gamePlayerRows++;
   if(player.playerId&&!rosterIds.has(player.playerId))tally.unmatchedGamePlayers++;
   const pid=player.playerId||compact(player.name)+'|'+String(player.number||'');
   if(seen.has(pid))flag('review','DUPLICATE_PLAYER_IN_GAME',team,player.name,{date:game.date,opponent:game.opponent});
   seen.add(pid);
   for(const line of player.statLines||[]){
    tally.gameStatLines++;
    const group=category(line.category);
    for(const [key,value] of Object.entries(line.values||{})){
     const metric=field(key),v=number(value);
     if(!requested.has(metric)||v===null)continue;
     const sumKey=pid+'|'+group+'|'+metric;
     gameSums.set(sumKey,(gameSums.get(sumKey)||0)+v);
    }
   }
  }
 }
 const aggregate=aggregateGames({...byGameTeam.get(canon(team)),team},[...roster,...sections.flatMap(s=>s.rows||[])]);
 const verifiedGameSums=new Map([...aggregate.totals].filter(([,v])=>!v.conflict&&typeof v.value==='number').map(([key,v])=>[key,v.value]));
 for(const conflict of aggregate.conflicts)flag('review','CONFLICTING_GAME_CELL',team,conflict.name,conflict);
 let playerRowCount=0,missingIdentity=0,mismatches=0;
 const metricTeam=metrics.teams?.[team];
 for(const section of sections){
  const cat=category(section.category),seen=new Set();
  const compactSection=metricTeam?.stats?.find(s=>category(s.category)===cat);
  const compactRows=new Map((compactSection?.rows||[]).map(p=>[p.playerId,p]));
  for(const player of section.rows||[]){
   tally.statRows++;playerRowCount++;
   const id=player.playerId||compact(player.name)+'|'+String(player.number||'');
   tally.athletesWithStats.add(team+'|'+id);statIds.add(id);
   if(seen.has(id))flag('review','DUPLICATE_SEASON_ROW',team,player.name,{category:section.category});
   seen.add(id);
   if(!rosterIds.has(id)){missingIdentity++;tally.unmatchedSeasonStatPlayers++;if(player.rosterMatched===false)flag('review','UNMATCHED_ROSTER_IDENTITY',team,player.name,{category:section.category,id})}
   const reported=compactRows.get(id);
   for(const [key,value] of Object.entries(player.values||{})){
    const metric=field(key),v=number(value);
    if(v===null||!requested.has(metric))continue;
    if(v<0&&!['YARDS'].includes(metric))flag('review','NEGATIVE_COUNT',team,player.name,{category:section.category,field:key,reported:v});
    const mini=reported?.values?.[Object.keys(reported?.values||{}).find(q=>field(q)===metric)];
    if(mini!==undefined&&number(mini)!==null&&number(mini)!==v){
      flag('review','COMPACT_FEED_MISMATCH',team,player.name,{category:section.category,field:key,season:v,compact:number(mini)});mismatches++;
    }
    const total=verifiedGameSums.get(id+'|'+cat+'|'+metric);
    if(total===undefined)continue;
    if(total>v+.01){
      tally.gameAboveSeasonSum++;
      flag('review','GAME_SUM_EXCEEDS_SEASON',team,player.name,{category:section.category,field:key,season:v,gameLogSum:Number(total.toFixed(2)),difference:Number((total-v).toFixed(2))});
    }else if(total<v-.01){
      tally.seasonAboveGameSum++;
      // Game logs often omit individual statistics; this is a coverage note, not an error.
      if(knownFinalGames.length===anyStatGames.length&&knownFinalGames.length>0&&total>0){
       flag('info','SEASON_GT_AVAILABLE_GAME_LOG',team,player.name,{category:section.category,field:key,season:v,gameLogSum:Number(total.toFixed(2))});
      }
    }
   }
   const values=player.values||{};
   const carries=number(values.CARRIES??values.Carries),rushYards=number(values.YARDS??values.Yards);
   const yardsPerCarry=number(values['YARDS/CARRY']??values['Yards/Carry']);
   if(cat==='RUSHING'&&carries!==null&&carries>0&&rushYards!==null&&yardsPerCarry!==null&&Math.abs(rushYards/carries-yardsPerCarry)>.16)
    flag('review','RUSHING_RATE_MISMATCH',team,player.name,{yards:rushYards,carries,yardsPerCarry});
   const catches=number(values.RECEPTIONS??values.Receptions),recRate=number(values['YARDS/RECEP.']??values['Yards/Recep.']);
   if(cat==='RECEIVING'&&catches!==null&&catches>0&&rushYards!==null&&recRate!==null&&Math.abs(rushYards/catches-recRate)>.16)
    flag('review','RECEIVING_RATE_MISMATCH',team,player.name,{yards:rushYards,receptions:catches,yardsPerReception:recRate});
  }
 }
 let noStats=0;for(const id of rosterIds.keys())if(!statIds.has(id))noStats++;
 tally.missingStatPlayers+=noStats;
 summaries.push({team,rosterPlayers:roster.length,statRows:playerRowCount,rosterPlayersWithoutReportedStats:noStats,finalGameLogs:knownFinalGames.length,finalGameLogsWithPlayerData:anyStatGames.length,seasonRowsWithUnknownId:missingIdentity,compactMismatches:mismatches,sourceStatsFetched:school.statsFetched!==false});
}
const levels={};const codes={};
for(const row of issues){levels[row.level]=(levels[row.level]||0)+1;codes[row.code]=(codes[row.code]||0)+1}
const priority={GAME_SUM_EXCEEDS_SEASON:0,COMPACT_FEED_MISMATCH:1,NEGATIVE_COUNT:2,RUSHING_RATE_MISMATCH:3,RECEIVING_RATE_MISMATCH:4,UNMATCHED_ROSTER_IDENTITY:5,DUPLICATE_SEASON_ROW:6};
issues.sort((a,b)=>(priority[a.code]??10)-(priority[b.code]??10)||(b.difference||0)-(a.difference||0)||a.team.localeCompare(b.team));
const counts={...tally,uniqueRosterIDs:tally.uniqueRosterIDs.size,athletesWithStats:tally.athletesWithStats.size,reviewFlags:levels.review||0};
const result={generatedAt:new Date().toISOString(),scope:'2026 Utah football, all available schools and every roster/stat/game-log player',limitations:'Audits all local records; source fetches can be stale, school reporting incomplete, and game log gaps cannot be assumed to mean zero.',counts,issueCounts:codes,severityCounts:levels,teams:summaries,issues};
fs.mkdirSync('audits',{recursive:true});
fs.writeFileSync(OUTPUT,JSON.stringify(result,null,2)+'\n');
const top=issues.filter(i=>i.level==='review').slice(0,80);
const lines=['# 2026 Football Player Statistics Audit','','Generated: '+result.generatedAt,'','**'+counts.teams+' schools · '+counts.uniqueRosterIDs+' roster IDs · '+counts.athletesWithStats+' athletes with reported stats · '+counts.statRows+' category rows.**','','## Coverage','- '+counts.missingStatPlayers+' rostered athletes lack an individual season stat row (not necessarily a reporting error)','- '+counts.missingTeamStats.length+' teams have no season stats: '+(counts.missingTeamStats.join(', ')||'none'),'- '+counts.gamesWithPlayerRecords+' finalized team-game logs include player stats','- '+counts.sourceStatsFetchFailures+' failed school stats fetches','- '+counts.unmatchedSeasonStatPlayers+' stat rows have IDs missing from their own roster (may be MaxPreps-only entries)','','## Review flags',...Object.entries(codes).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'- '+k+': '+v),'','## Highest-priority examples',...top.map(x=>'- **'+x.code+'** '+x.team+' — '+x.subject+'; '+JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>!['level','code','team','subject'].includes(k))))),'','## Method / limitations','This is a comprehensive machine audit of the stored roster, season stat sections, and linked game logs. A flag is **not proof of error**. School-reported gaps, incomplete per-game player stats, and source snapshot timing require review. No automated changes to player scores, awards, or draft selections were made.'];
fs.writeFileSync(DOC,lines.join('\n')+'\n');
console.log(JSON.stringify({counts,issueCounts:codes,issueTotal:issues.length,report:OUTPUT,markdown:DOC}));
