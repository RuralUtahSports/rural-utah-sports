import fs from 'node:fs';
import path from 'node:path';

const DIR='team-stat-single-game-records';
const index=JSON.parse(fs.readFileSync(path.join(DIR,'index.json'),'utf8'));
const expected=['totalOffenseYards','passingYards','rushingYards'];
if(index.categoryOrder?.slice(0,3).join(',')!==expected.join(','))throw new Error('Category order must start Total Offense, Passing, Rushing');
if(Number(index.uniqueGamePages)<5000)throw new Error(`Too few game pages: ${index.uniqueGamePages}`);
if(Number(index.teamGamePerformances)<5000)throw new Error(`Too few team-game performances: ${index.teamGamePerformances}`);
const files=fs.readdirSync(path.join(DIR,'by-team')).filter(f=>f.endsWith('.json'));
if(files.length<100)throw new Error(`Too few team files: ${files.length}`);
let rows=0,teamsWithData=0;
for(const file of files){const doc=JSON.parse(fs.readFileSync(path.join(DIR,'by-team',file),'utf8'));let has=false;for(const c of doc.categories||[]){let prev=Infinity;const seen=new Set();for(const r of c.entries||[]){if(!Number.isFinite(Number(r.value))||Number(r.value)<=0)throw new Error(`${doc.team} ${c.key}: invalid value`);if(Number(r.value)>prev)throw new Error(`${doc.team} ${c.key}: sort order broken`);prev=Number(r.value);const id=String(r.gameId||`${r.date}|${r.opponent}`);if(seen.has(id))throw new Error(`${doc.team} ${c.key}: duplicate game ${id}`);seen.add(id);rows++;has=true}}if(has)teamsWithData++}
if(rows<1000||teamsWithData<80)throw new Error(`Dataset too small: ${rows} rows across ${teamsWithData} teams`);
const juab=JSON.parse(fs.readFileSync(path.join(DIR,'by-team','juab.json'),'utf8'));
const pass=juab.categories?.find(c=>c.key==='passingYards')?.entries||[];
if(!pass.some(r=>r.date==='2022-09-16'&&Number(r.value)>=558))throw new Error('Known Juab 2022 passing performance missing');
console.log(`Validated ${rows} ranked rows across ${teamsWithData} teams; ${index.teamGamePerformances} team-game performances total.`);
