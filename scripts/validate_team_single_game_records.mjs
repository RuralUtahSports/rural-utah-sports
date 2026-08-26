import fs from 'node:fs';
import path from 'node:path';
const DIR='team-single-game-records';
const index=JSON.parse(fs.readFileSync(path.join(DIR,'index.json'),'utf8'));
const required=['totalOffenseYards','passingYards','rushingYards'];
if(!Array.isArray(index.teams)||!index.teams.length)throw new Error('No team record datasets generated');
if(index.categoryOrder.slice(0,3).join(',')!==required.join(','))throw new Error('Category order must be Total Offense, Passing, Rushing');
let rows=0,teamsWithData=0;
for(const t of index.teams){const file=path.join(DIR,t.file);if(!fs.existsSync(file))throw new Error(`Missing ${file}`);const doc=JSON.parse(fs.readFileSync(file,'utf8'));let has=false;for(const [key,list] of Object.entries(doc.records||{})){let prev=Infinity;const seen=new Set();for(const r of list){if(!Number.isFinite(r.value)||r.value<0)throw new Error(`${doc.team} ${key}: invalid value`);if(r.value>prev)throw new Error(`${doc.team} ${key}: not sorted`);prev=r.value;const id=String(r.gameId||`${r.date}|${r.opponent}`);if(seen.has(id))throw new Error(`${doc.team} ${key}: duplicate game ${id}`);seen.add(id);rows++;has=true}}if(has)teamsWithData++}
if(!rows||!teamsWithData)throw new Error('Generated dataset contains no records');
console.log(`Validated ${rows} ranked team-record rows across ${teamsWithData} teams`);
