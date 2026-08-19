import fs from 'node:fs';

const required=['record-watch-everywhere.js','app-shell-polish.js','deseret-rosters-stats-2026.json','uhsaa-football-records.json','weekly-simulation.json'];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing Record Watch dependency: ${file}`);

const shell=fs.readFileSync('app-shell-polish.js','utf8');
if(!shell.includes('record-watch-everywhere.js')) throw new Error('App shell is not loading record-watch-everywhere.js');
for(const page of ['index.html','team.html','game-week.html']) if(!shell.includes(page)) throw new Error(`Record Watch loader is missing ${page}`);

const source=fs.readFileSync('record-watch-everywhere.js','utf8');
for(const token of ['Statewide Record Watch','Record Watch This Week','Records That Could Fall This Week','rusTeamRecordWatch','one-game watch range','records.html#rusRecordWatch']){
  if(!source.includes(token)) throw new Error(`Record Watch module is missing ${token}`);
}

const stats=JSON.parse(fs.readFileSync('deseret-rosters-stats-2026.json','utf8'));
const base=JSON.parse(fs.readFileSync('uhsaa-football-records.json','utf8'));
const defense=fs.existsSync('uhsaa-records-defense.json')?JSON.parse(fs.readFileSync('uhsaa-records-defense.json','utf8')):{categories:[]};
const weekly=JSON.parse(fs.readFileSync('weekly-simulation.json','utf8'));
const official=new Map([...(base.categories||[]),...(defense.categories||[])].map(c=>[c.id,c]));
const defs=[
 ['pass-yards-season','Passing',['Yards']],['pass-td-season','Passing',['TD','Touchdowns']],['rush-yards-season','Rushing',['Yards']],['rush-td-season','Rushing',['TD','Touchdowns']],['receiving-yards-season','Receiving',['Yards']],['tackles-season','Defense/Special Teams',['Tackles','Total Tackles']],['sacks-season','Defense/Special Teams',['Sacks']]
];
const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const catKey=v=>{const x=String(v||'').toLowerCase();if(x.startsWith('pass'))return'Passing';if(x.startsWith('rush'))return'Rushing';if(x.startsWith('receiv'))return'Receiving';if(x.includes('defense'))return'Defense/Special Teams';return String(v||'')};
const metric=(section,wants)=>{const headers=section.headers||Object.keys(section.rows?.[0]?.values||{});for(const w of wants){const h=headers.find(x=>compact(x)===compact(w));if(h)return h}for(const w of wants){const h=headers.find(x=>compact(x).includes(compact(w)));if(h)return h}return''};
let active=0;
const activeTeams=new Set();
for(const [id,category,wants] of defs){const record=official.get(id)?.entries?.[0];if(!record||!Number.isFinite(Number(record.value))) throw new Error(`Official record missing for ${id}`);let categoryRows=0;for(const [team,t] of Object.entries(stats.teams||{})){for(const section of t.stats||[]){if(catKey(section.category)!==category)continue;const key=metric(section,wants);if(!key)continue;for(const row of section.rows||[]){const value=Number(String(row.values?.[key]??'').replace(/,/g,''));if(Number.isFinite(value)&&value>0){categoryRows++;active++;activeTeams.add(compact(team))}}}}if(!categoryRows)throw new Error(`No active 2026 rows found for ${id}`)}
if(active<50) throw new Error(`Only ${active} active Record Watch stat rows were found`);
const playing=new Set();for(const g of weekly.games||[]){playing.add(compact(g.awayTeam));playing.add(compact(g.homeTeam))}
if(playing.size<50) throw new Error(`Weekly slate only contains ${playing.size} unique teams`);
const overlap=[...activeTeams].filter(t=>playing.has(t)).length;
if(overlap<20) throw new Error(`Only ${overlap} teams have both weekly games and active record-watch stats`);
console.log(`Record Watch verified: ${active} active stat rows, ${activeTeams.size} stat teams, ${playing.size} teams in this week's slate, ${overlap} overlapping teams.`);
