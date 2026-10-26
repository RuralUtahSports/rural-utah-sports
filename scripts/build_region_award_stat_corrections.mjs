import fs from 'node:fs';
import {reconcileSeasonStats} from './reconcile_season_stats_from_game_logs.mjs';
import {atomicJSON,categoryKey,fieldKey,canonTeam} from './lib/player-stat-integrity.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const snapshot=read('region-awards-2026.lock.json');
const data=structuredClone(snapshot.data);data.season=2026;
const baseline=structuredClone(data);
const report=reconcileSeasonStats(data,read('player-game-stats-2026.json'),{cutoff:'2026-10-16',maxprepsSeason:read('maxpreps-stats-fallback-2026.json'),maxprepsGames:read('maxpreps-player-game-stats-2026.json'),corrections:read('manual-stat-corrections-2026.json').corrections});
const changes=[];
for(const [team,school] of Object.entries(data.teams))for(const section of school.stats||[])for(const row of section.rows||[]){
 const old=baseline.teams[team]?.stats?.find(s=>categoryKey(s.category)===categoryKey(section.category))?.rows?.find(r=>r.playerId===row.playerId);
 for(const [header,value] of Object.entries(row.values||{})){
  const before=old?.values?.[Object.keys(old.values).find(h=>fieldKey(section.category,h)===fieldKey(section.category,header))];
  if(before===value)continue;
  const evidence=row.statEvidence?.[header];
  // Derived rates are recomputed in the browser from accepted cells. Never
  // transfer undated cumulative manual overrides into the frozen award input.
  if(!evidence||evidence.throughDate>'2026-10-16')continue;
  changes.push({team,playerId:row.playerId,name:row.name,category:section.category,header,value,evidence});
 }
}
const coverage={};
for(const [team,school] of Object.entries(data.teams)){
 const review=report.decisions.filter(d=>d.team===team&&d.status==='review').length;
 const meta=read('teams-data.json').find(t=>canonTeam(t.team)===canonTeam(team));
 coverage[team]={region:meta?.region||null,hasReportedStats:!!school.stats?.some(s=>s.rows?.length),reviewFields:review,status:'incomplete',message:'Regular-season snapshot through October 16; reporting may be incomplete. Missing statistics are unknown, not zero. '+(review?`${review} source/game differences need review.`:'Source freshness and player/category completeness are not independently certified.')};
}
atomicJSON('region-awards-stat-corrections-2026.json',{season:2026,cutoff:'2026-10-16',generatedAt:new Date().toISOString(),policy:'Candidate statistics only. No saved selections, winners or locked snapshot changed. Only source season cells agreeing with unique regular-season source game cells are included.',changes,coverage});
console.log(`Built ${changes.length} regular-season candidate stat corrections; published winners and locked inputs unchanged.`);
