import fs from 'node:fs';

const required=['my-teams.html','my-teams-dashboard.js','teams-data.json','standings-2026.json','elo-summary.json','weekly-simulation.json','rankings-current-2026.json','deseret-rosters-stats-2026.json','share-preview-map.json'];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing My Teams dependency: ${file}`);

const html=fs.readFileSync('my-teams.html','utf8');
for(const token of ['my-teams-dashboard.js?v=20260818-mt3','data-rus-my-teams-dashboard','without needing a full-season schedule']){
  if(!html.includes(token)) throw new Error(`My Teams page is missing ${token}`);
}

const js=fs.readFileSync('my-teams-dashboard.js','utf8');
for(const token of ['RUS Projection:','RUS Line:','2026 Key Players','Share Team','Share Game','Playing This Week','eloLast','share-preview-map.json','data-rus-key-players']){
  if(!js.includes(token)) throw new Error(`My Teams dashboard is missing ${token}`);
}

const teams=JSON.parse(fs.readFileSync('teams-data.json','utf8'));
const standings=JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
const elo=JSON.parse(fs.readFileSync('elo-summary.json','utf8'));
const weekly=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8'));
const rankings=JSON.parse(fs.readFileSync('rankings-current-2026.json','utf8'));
const stats=JSON.parse(fs.readFileSync('deseret-rosters-stats-2026.json','utf8'));
const share=JSON.parse(fs.readFileSync('share-preview-map.json','utf8'));

const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const teamKeys=new Set((teams||[]).map(x=>norm(x.team)));
const standingRows=Object.values(standings.byClassification||{}).flat();
const standingKeys=new Set(standingRows.map(x=>norm(x.team)));
const weeklyTeams=new Set((weekly.games||[]).flatMap(g=>[norm(g.awayTeam),norm(g.homeTeam)]));
const statKeys=new Set(Object.keys(stats.teams||{}).map(norm));
const rankedTeams=new Set(Object.values(rankings.classifications||{}).flat().map(x=>norm(typeof x==='string'?x:x.team)));

if(teamKeys.size<100) throw new Error(`Only ${teamKeys.size} teams available to favorite`);
if(standingKeys.size<100) throw new Error(`Only ${standingKeys.size} teams have standings rows`);
if(Object.keys(elo||{}).length<100) throw new Error('ELO summary coverage is unexpectedly small');
if(weeklyTeams.size<50) throw new Error(`Weekly slate only covers ${weeklyTeams.size} teams`);
if(statKeys.size<100) throw new Error(`Only ${statKeys.size} teams have 2026 roster/stat data`);
if(rankedTeams.size<50) throw new Error(`Only ${rankedTeams.size} teams appear in current rankings`);
if(Object.keys(share.team||{}).length<100) throw new Error('Team share-preview map is unexpectedly small');

const dashboardReady=[...weeklyTeams].filter(t=>teamKeys.has(t)&&standingKeys.has(t)&&statKeys.has(t));
if(dashboardReady.length<40) throw new Error(`Only ${dashboardReady.length} weekly teams have complete My Teams coverage`);

console.log(`My Teams verified: ${teamKeys.size} selectable teams, ${weeklyTeams.size} teams in the loaded week, ${dashboardReady.length} with standings + stats coverage.`);
