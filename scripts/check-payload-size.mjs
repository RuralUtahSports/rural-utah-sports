import fs from 'node:fs';

const full='deseret-rosters-stats-2026.json';
const slim='deseret-stat-metrics-2026.json';
for(const file of [full,slim,'rus-fetch-cache.js'])if(!fs.existsSync(file))throw new Error(`Missing payload dependency: ${file}`);

const source=JSON.parse(fs.readFileSync(full,'utf8'));
const metrics=JSON.parse(fs.readFileSync(slim,'utf8'));
const fetchCache=fs.readFileSync('rus-fetch-cache.js','utf8');
const fullBytes=fs.statSync(full).size;
const slimBytes=fs.statSync(slim).size;
const sourceTeams=Object.keys(source.teams||{});
const metricTeams=Object.keys(metrics.teams||{});

if(sourceTeams.length<100)throw new Error(`Full stat source only contains ${sourceTeams.length} teams`);
if(metricTeams.length!==sourceTeams.length)throw new Error(`Compact stat payload covers ${metricTeams.length}/${sourceTeams.length} teams`);
if(slimBytes>=fullBytes*.5)throw new Error(`Compact stat payload is still too large: ${slimBytes} bytes vs ${fullBytes}`);
if(metrics.updatedAt!==source.updatedAt)throw new Error('Compact stat payload freshness does not match the full source');

const allowed=new Set(['Yards','TD','Tackles','Sacks']);
let rows=0;
for(const team of Object.values(metrics.teams||{}))for(const section of team.stats||[]){
  for(const header of section.headers||[])if(!allowed.has(header))throw new Error(`Unexpected compact metric ${header}`);
  rows+=(section.rows||[]).length;
}
if(rows<50)throw new Error(`Compact stat payload only contains ${rows} tracked rows`);

for(const token of ["LIGHT_STAT_PAGES=new Set(['index.html','game-week.html','my-teams.html'])",'deseret-stat-metrics-2026.json','requestWithFallback','FULL_STATS']){
  if(!fetchCache.includes(token))throw new Error(`Fetch cache is missing payload routing token: ${token}`);
}

console.log(`Payload check passed: ${(fullBytes/1024).toFixed(1)} KB full -> ${(slimBytes/1024).toFixed(1)} KB compact (${(100-slimBytes/fullBytes*100).toFixed(1)}% smaller), ${rows} tracked rows.`);
