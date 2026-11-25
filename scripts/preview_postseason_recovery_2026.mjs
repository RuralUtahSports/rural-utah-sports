// Read-only recovery preview; never write production statistical files.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex,teamKey,isoDate} from './lib/competition-scope-2026.mjs';
import {postseasonFinals,normalizePlayoffSubmission} from './lib/postseason-finals-2026.mjs';
import {mergeMaxPrepsGameLogs} from './merge_maxpreps_game_logs.mjs';
const require=createRequire(import.meta.url),primary=require('../maxpreps-primary-reported-2026.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const brackets=read('official-brackets-2026.json'),review=read('competition-scope-review-2026.json'),rosters=read('deseret-rosters-stats-2026.json'),baseline=read('player-game-stats-2026.json'),cache=read('maxpreps-player-game-stats-2026.json'),seasonCache=read('maxpreps-stats-fallback-2026.json'),metadata=read('teams-data.json');
const finals=postseasonFinals(brackets),index=createCompetitionIndex({brackets,review});
const key=(date,team,opponent)=>[isoDate(date),...[teamKey(team),teamKey(opponent)].sort()].join('|');
const finalMap=new Map(finals.map(g=>[key(g.date,g.awayTeam,g.homeTeam),g]));
const playoffCache={season:2026,teams:{}};
for(const [team,t] of Object.entries(cache.teams||{})){
 const rows=(t.games||[]).map(row=>normalizePlayoffSubmission(row,team,finals)).filter(row=>finalMap.has(key(row.date,team,row.opponent)));
 if(rows.length)playoffCache.teams[team]={team,games:rows};
}
const preview=structuredClone(baseline);
const merge=mergeMaxPrepsGameLogs(preview,playoffCache,null,null,[],{rosters,competitionIndex:index,playoffFinals:finals});
const match=(data,team)=>Object.entries(data.teams||{}).find(([name])=>teamKey(name)===teamKey(team))?.[1];
const reported=p=>(p.statLines||[]).some(l=>Object.values(l.values||{}).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''));
const stats=(data,g,team,opp)=>{const hits=(match(data,team)?.games||[]).filter(x=>isoDate(x.date)===g.date&&teamKey(x.opponent)===teamKey(opp));return hits.length===1?(hits[0].players||[]).filter(reported):[];};
const sides=[],lastPlayoff=new Map(),classes={};
for(const g of finals)for(const [team,opp] of [[g.awayTeam,g.homeTeam],[g.homeTeam,g.awayTeam]]){
 const before=stats(baseline,g,team,opp),after=stats(preview,g,team,opp),t=teamKey(team);
 if(!lastPlayoff.has(t)||lastPlayoff.get(t)<g.date)lastPlayoff.set(t,g.date);
 sides.push({team,opponent:opp,date:g.date,classification:g.classification,before:before.length,after:after.length});
 const c=classes[g.classification]??={expected:0,before:0,after:0,playerGameRows:0};
 c.expected++;c.before+=Number(before.length>0);c.after+=Number(after.length>0);c.playerGameRows+=after.length;
}
// Require a source update on or after the school's last known playoff date.
// This is evidence of freshness, not proof all individual fields include the game.
const freshness=[],eligibleCache={season:2026,teams:{}};
for(const [team,t] of Object.entries(rosters.teams||{})){
 const provider=match(seasonCache,team),last=lastPlayoff.get(teamKey(team))||'2026-10-17',stamp=Date.parse(provider?.lastUpdated||''),fresh=Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)>=last;
 const hasRows=Boolean(provider?.rows?.length),status=!hasRows?'no-cache':!fresh?'stale-or-undated':'fresh-date';
 freshness.push({team,lastKnownGame:last,lastUpdated:provider?.lastUpdated||null,status,rows:provider?.rows?.length||0,source:provider?.sourceUrl||null});
 if(status==='fresh-date')eligibleCache.teams[team]=provider;
}
const seasonPreview=primary.applyPrimary(rosters,eligibleCache,metadata);
const changed=[],normalize=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
for(const [team,school] of Object.entries(seasonPreview.data.teams||{})){
 const original=rosters.teams[team];
 for(const sec of school.stats||[])for(const row of sec.rows||[]){
  const prev=(original?.stats||[]).find(s=>normalize(s.category)===normalize(sec.category))?.rows?.find(p=>p.playerId===row.playerId);
  const fields=Object.entries(row.values||{}).filter(([k,v])=>row.statSources?.[k]?.startsWith('MaxPreps (preferred')&&String(v)!==String(prev?.values?.[k]??'')).map(([field,value])=>({field,previous:prev?.values?.[field]??null,maxpreps:value}));
  if(fields.length)changed.push({team,playerId:row.playerId,name:row.name,category:sec.category,fields});
 }
}
// Check that this preview didn't alter any pre-playoff game or the original data.
const originalGameMap=new Map();
for(const [team,t] of Object.entries(baseline.teams||{}))for(const game of t.games||[])if(!finalMap.has(key(game.date,team,game.opponent)))originalGameMap.set(team+'|'+game.gameKey,JSON.stringify(game));
for(const [team,t] of Object.entries(preview.teams||{}))for(const game of t.games||[])if(!finalMap.has(key(game.date,team,game.opponent))&&originalGameMap.get(team+'|'+game.gameKey)!==JSON.stringify(game))throw Error('Unexpected non-playoff game change: '+team+' '+game.date);
const remaining=sides.filter(s=>!s.after),report={season:2026,cacheUpdatedAt:cache.updatedAt,seasonCacheUpdatedAt:seasonCache.updatedAt,classes,merge,remaining,allSides:sides,freshness,seasonChanges:changed,seasonMerge:seasonPreview.summary};
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/postseason-recovery-preview-2026.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cacheUpdatedAt:report.cacheUpdatedAt,seasonCacheUpdatedAt:report.seasonCacheUpdatedAt,classes,merge,remaining,seasonFreshness:freshness.reduce((a,t)=>(a[t.status]=(a[t.status]||0)+1,a),{}),seasonMerge:seasonPreview.summary,changedPlayerCategoryRows:changed.length,changedPlayers:new Set(changed.map(x=>x.playerId)).size,holdSchools:freshness.filter(t=>t.status!=='fresh-date').map(t=>({team:t.team,status:t.status,lastUpdated:t.lastUpdated,lastKnownGame:t.lastKnownGame}))},null,2));
