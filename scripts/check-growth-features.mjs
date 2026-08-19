import fs from 'node:fs';

const required=['growth-features.js','players.html','app-shell-polish.js','corrections.html','deseret-rosters-stats-2026.json','uhsaa-football-records.json'];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing required growth feature file: ${file}`);

const shell=fs.readFileSync('app-shell-polish.js','utf8');
if(!shell.includes('growth-features.js')) throw new Error('App shell is not loading growth-features.js');

const players=fs.readFileSync('players.html','utf8');
for(const token of ['deseret-rosters-stats-2026.json','player.html?id=','All schools','All positions']){
  if(!players.includes(token)) throw new Error(`Players directory is missing ${token}`);
}

const growth=fs.readFileSync('growth-features.js','utf8');
for(const token of ['players.html','Report Correction','Friday Night','Record Watch','2026 Key Players','America/Denver']){
  if(!growth.includes(token)) throw new Error(`Growth feature layer is missing ${token}`);
}

const roster=JSON.parse(fs.readFileSync('deseret-rosters-stats-2026.json','utf8'));
const teams=Object.entries(roster.teams||{});
if(teams.length<100) throw new Error(`Roster dataset only contains ${teams.length} teams`);
const playerCount=teams.reduce((n,[,t])=>n+(t.roster||[]).filter(p=>p.playerId&&p.name).length,0);
if(playerCount<1000) throw new Error(`Roster dataset only contains ${playerCount} identified players`);

console.log(`Growth feature wiring verified with ${teams.length} teams and ${playerCount} identified players.`);
