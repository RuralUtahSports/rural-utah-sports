import fs from 'node:fs';
import {postseasonFinals,normalizePlayoffSubmission} from './lib/postseason-finals-2026.mjs';
import {teamKey,isoDate} from './lib/competition-scope-2026.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const brackets=read('official-brackets-2026.json'),games=read('player-game-stats-2026.json'),rosters=read('deseret-rosters-stats-2026.json'),cache=read('maxpreps-player-game-stats-2026.json'),seasonCache=read('maxpreps-stats-fallback-2026.json'),finals=postseasonFinals(brackets);
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const match=(source,team)=>Object.entries(source.teams||{}).find(([name])=>teamKey(name)===teamKey(team))?.[1];
const reported=lines=>(lines||[]).some(l=>Object.values(l.values||{}).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''));
const keys=['YARDS','TD','CARRIES','RECEPTIONS','TACKLES','SACKS','PASSINT'];
const statNum=v=>String(v??'').trim()!==''&&Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):null;
const metrics=(lines,out)=>{for(const l of lines||[])for(const [k,v] of Object.entries(l.values||{})){const key=norm(k),n=statNum(v);if(keys.includes(key)&&n!==null){const id=norm(l.category)+'|'+key;out[id]=(out[id]||0)+n;}}};
const schoolMap=new Map(),missing=[],players=[],playerTotals=[];
for(const game of finals)for(const [team,opponent] of [[game.awayTeam,game.homeTeam],[game.homeTeam,game.awayTeam]]){
 const key=teamKey(team),g=schoolMap.get(key)||{team,classification:game.classification,expected:0,withStats:0,missing:0,cacheRecoverable:0};
 g.expected++;
 const saved=(match(games,team)?.games||[]).filter(x=>isoDate(x.date)===game.date&&teamKey(x.opponent)===teamKey(opponent));
 const rows=saved.length===1?(saved[0].players||[]).filter(p=>reported(p.statLines)):[];
 const existing=new Set(rows.map(p=>p.playerId));
 const candidates=(match(cache,team)?.games||[]).map(x=>normalizePlayoffSubmission(x,team,finals)).filter(x=>isoDate(x.date)===game.date&&teamKey(x.opponent)===teamKey(opponent)&&reported(x.statLines));
 const roster=match(rosters,team)?.roster||[],eligible=candidates.filter(p=>roster.some(r=>r.playerId===p.playerId&&norm(r.name)===norm(p.name)&&String(r.number)===String(p.number)));
 const extra=[...new Set(eligible.filter(p=>!existing.has(p.playerId)).map(p=>p.playerId))];
 if(rows.length)g.withStats++;else{g.missing++;if(eligible.length)g.cacheRecoverable++;missing.push({team,opponent,date:game.date,classification:game.classification,storedGameCount:saved.length,cachePlayerRows:eligible.length});}
 if(extra.length)players.push({team,opponent,date:game.date,missingReportedPlayerIds:extra});
 schoolMap.set(key,g);
}
for(const [team,school] of Object.entries(rosters.teams||{})){
 const published=match(games,team)?.games||[],maxpreps=match(seasonCache,team),sums=new Map(),counts=new Map();
 for(const game of published)for(const p of game.players||[]){if(!reported(p.statLines))continue;const sum=sums.get(p.playerId)||{};metrics(p.statLines,sum);sums.set(p.playerId,sum);counts.set(p.playerId,(counts.get(p.playerId)||0)+1);}
 for(const sec of school.stats||[])for(const p of sec.rows||[]){
  const sum=sums.get(p.playerId)||{};const discrepancies=[];
  for(const [field,value] of Object.entries(p.values||{})){const k=norm(field),s=sum[norm(sec.category)+'|'+k],v=statNum(value);if(keys.includes(k)&&v!==null&&s!==undefined&&v!==s)discrepancies.push({field,season:v,gameSum:s});}
  if(discrepancies.length)playerTotals.push({team,playerId:p.playerId,name:p.name,category:sec.category,storedGames:counts.get(p.playerId)||0,maxprepsTeamUpdated:maxpreps?.lastUpdated||null,discrepancies});
 }
}
const report={season:2026,policy:'Coverage flags, not certification. Missing stats are unknown; player season and game totals can differ because of missing reports or provider corrections. No automatic overwrite.',schoolsChecked:Object.keys(rosters.teams||{}).length,officialPostseasonFinals:finals.length,teamGameSides:finals.length*2,teams:[...schoolMap.values()],missingTeamGames:missing,missingPlayerGameRows:players,seasonVsGameDiscrepancies:playerTotals};
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/postseason-coverage-2026.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({schoolsChecked:report.schoolsChecked,officialPostseasonFinals:report.officialPostseasonFinals,teamGameSides:report.teamGameSides,missingTeamGames:missing.length,cacheRecoverable:report.teams.reduce((a,t)=>a+t.cacheRecoverable,0),missingPlayerGameGroups:players.length,seasonVsGameDiscrepancies:playerTotals.length,teams:report.teams},null,2));
