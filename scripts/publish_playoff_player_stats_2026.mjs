// Publish source-backed postseason game reports, without changing the
// canonical regular-season corrections, locked awards, or team results.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCompetitionIndex,teamKey,isoDate} from './lib/competition-scope-2026.mjs';
import {postseasonFinals,normalizePlayoffSubmission} from './lib/postseason-finals-2026.mjs';
import {mergeMaxPrepsGameLogs} from './merge_maxpreps_game_logs.mjs';
const require=createRequire(import.meta.url);
const primary=require('../maxpreps-primary-reported-2026.js');
const hunt=require('../reviewed-hunt-postseason-2026.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const norm=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const excluded=t=>norm(t)==='WHITEHORSE';
const find=(payload,team)=>Object.entries(payload.teams||{}).find(([k])=>teamKey(k)===teamKey(team));
const key=(date,team,opp)=>[isoDate(date),...[teamKey(team),teamKey(opp)].sort()].join('|');
const gameFile='player-game-stats-2026.json';
const baseline=read(gameFile),rosters=read('deseret-rosters-stats-2026.json');
const brackets=read('official-brackets-2026.json'),review=read('competition-scope-review-2026.json');
const cache=read('maxpreps-player-game-stats-2026.json'),seasonCache=read('maxpreps-stats-fallback-2026.json'),metadata=read('teams-data.json');
if([baseline,rosters,brackets,cache,seasonCache].some(x=>x.season!==2026))throw Error('Expected 2026 sources');
const finals=postseasonFinals(brackets),index=createCompetitionIndex({brackets,review});
if(!finals.length)throw Error('Missing official finals');
const finalMap=new Map(finals.map(g=>[key(g.date,g.awayTeam,g.homeTeam),g]));
const isPlayoff=(g,t)=>finalMap.has(key(g.date,t,g.opponent));
const playoffCache={season:2026,teams:{}},last=new Map();
for(const g of finals)for(const t of [g.awayTeam,g.homeTeam]){
 const k=teamKey(t);if(!last.has(k)||last.get(k)<g.date)last.set(k,g.date);
}
for(const [t,s] of Object.entries(cache.teams||{})){
 if(excluded(t))continue;
 const rows=(s.games||[]).map(g=>normalizePlayoffSubmission(g,t,finals)).filter(g=>isPlayoff(g,t));
 if(rows.length)playoffCache.teams[t]={team:t,games:rows};
}
const out=structuredClone(baseline);
const merge=mergeMaxPrepsGameLogs(out,playoffCache,null,null,[],{rosters,competitionIndex:index,playoffFinals:finals});
const h=find(out,'MOUNTAIN RIDGE');
if(h)hunt.applyGames(h[1]);
// Exact preservation of every non-playoff game and all excluded team data.
for(const [t,old] of Object.entries(baseline.teams||{})){
 const next=out.teams[t];
 if(!next)throw Error('Removed team '+t);
 const regular=x=>(x.games||[]).filter(g=>!isPlayoff(g,t)).map(g=>JSON.stringify(g)).sort();
 if(JSON.stringify(regular(old))!==JSON.stringify(regular(next)))throw Error('Changed non-playoff data '+t);
 if(excluded(t)){out.teams[t]=old;continue;}
 if(!last.has(teamKey(t)))out.teams[t]=old;
}
for(const [t,school] of Object.entries(out.teams||{})){
 if(excluded(t)&&!baseline.teams[t])throw Error('Unexpected Whitehorse import');
 if(!baseline.teams[t]&&(school.games||[]).some(g=>!isPlayoff(g,t)))throw Error('Added non-playoff game '+t);
}
const eligible={season:2026,teams:{}},holds=[];
for(const [t,s] of Object.entries(seasonCache.teams||{})){
 if(excluded(t)||!last.has(teamKey(t)))continue;
 const stamp=Date.parse(s.lastUpdated||''),end=last.get(teamKey(t));
 if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)<end||!s.rows?.length){holds.push(t);continue;}
 eligible.teams[t]=s;
}
const season=primary.applyPrimary(rosters,eligible,metadata);
hunt.apply(season.data);
const reported=p=>(p.statLines||[]).some(l=>Object.values(l.values||{}).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''));
const sides=[];
for(const g of finals)for(const [t,o] of [[g.awayTeam,g.homeTeam],[g.homeTeam,g.awayTeam]]){
 if(excluded(t))continue;
 const rows=payload=>{const team=find(payload,t)?.[1],hits=(team?.games||[]).filter(x=>isoDate(x.date)===g.date&&teamKey(x.opponent)===teamKey(o));return hits.length===1?(hits[0].players||[]).filter(reported).length:0;};
 sides.push({team:t,opponent:o,date:g.date,classification:g.classification,before:rows(baseline),after:rows(out)});
}
if(sides.some(s=>s.after<s.before))throw Error('Playoff coverage regressed');
const staged=[];
for(const file of fs.readdirSync('team-current-data').filter(f=>f.endsWith('.json'))){
 const path='team-current-data/'+file,shard=read(path),t=shard.team;
 if(shard.season!==2026||excluded(t)||!last.has(teamKey(t)))continue;
 const game=find(out,t)?.[1],oldGame=find(baseline,t)?.[1],provider=find(eligible,t),updated=find(season.data,t)?.[1];
 let changed=false;
 if(game&&JSON.stringify(game)!==JSON.stringify(shard.gameStats)){shard.gameStats=game;changed=true;}
 if(updated&&(provider||norm(t)==='MOUNTAINRIDGE')&&JSON.stringify(updated)!==JSON.stringify(shard.rosterStats)){shard.rosterStats=updated;changed=true;}
 if(changed)staged.push([path,shard]);
}
const gameChanged=JSON.stringify(out.teams)!==JSON.stringify(baseline.teams);
const report={season:2026,policy:'Reported playoff data, not certified complete. Whitehorse excluded; missing values unknown.',merge,eligibleSeasonSchools:Object.keys(eligible.teams).length,heldSeasonSchools:holds,seasonSummary:season.summary,eligibleSides:sides.length,before:sides.filter(s=>s.before).length,after:sides.filter(s=>s.after).length,remaining:sides.filter(s=>!s.after),playerGameRows:sides.reduce((n,s)=>n+s.after,0),shardsChanged:staged.length,gameChanged};
fs.mkdirSync('audit-output',{recursive:true});
fs.writeFileSync('audit-output/playoff-publication-2026.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--apply')){
 if(gameChanged){out.updatedAt=new Date().toISOString();out.summary={...(out.summary||{}),postseasonRecovery:merge};fs.writeFileSync(gameFile,JSON.stringify(out,null,2)+'\n');}
 for(const [path,shard] of staged){shard.updatedAt=out.updatedAt;fs.writeFileSync(path,JSON.stringify(shard));}
}
