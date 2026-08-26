import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIR='player-single-game-records/by-team';
const OUT_DIR='team-single-game-records';
const TEAM_LIMIT=15;
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

export const TEAM_RECORD_CATEGORY_ORDER=['totalOffenseYards','passingYards','rushingYards','firstDowns','passingTouchdowns','rushingTouchdowns','sacks','tacklesForLoss','interceptions','fumbleRecoveries','takeaways'];
export const TEAM_RECORD_CATEGORIES={
 totalOffenseYards:{label:'Total Offense',unit:'yards'},passingYards:{label:'Passing Yards',unit:'yards'},rushingYards:{label:'Rushing Yards',unit:'yards'},
 firstDowns:{label:'First Downs',unit:'first downs'},passingTouchdowns:{label:'Passing Touchdowns',unit:'TD'},rushingTouchdowns:{label:'Rushing Touchdowns',unit:'TD'},
 sacks:{label:'Sacks',unit:'sacks'},tacklesForLoss:{label:'Tackles for Loss',unit:'TFL'},interceptions:{label:'Interceptions',unit:'INT'},
 fumbleRecoveries:{label:'Fumble Recoveries',unit:'FR'},takeaways:{label:'Takeaways',unit:'takeaways'}
};
const PLAUSIBLE_MAX={totalOffenseYards:1000,passingYards:800,rushingYards:800,firstDowns:60,passingTouchdowns:12,rushingTouchdowns:12,sacks:20,tacklesForLoss:35,interceptions:10,fumbleRecoveries:10,takeaways:15};
function add(obj,key,value){if(!TEAM_RECORD_CATEGORIES[key]||!Number.isFinite(value)||value<0||value>PLAUSIBLE_MAX[key])return;obj[key]=(obj[key]||0)+value}
function loadPlayerTeamFiles(){if(!fs.existsSync(SOURCE_DIR))throw new Error(`Missing ${SOURCE_DIR}; run player single-game records build first.`);return fs.readdirSync(SOURCE_DIR).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(SOURCE_DIR,f),'utf8')))}
function performancesFromPlayerRecords(doc){const games=new Map();for(const key of ['passingYards','rushingYards','passingTouchdowns','rushingTouchdowns','sacks','interceptions']){for(const p of doc?.records?.[key]||[]){const id=String(p.gameId||`${p.date}|${p.opponent}`);let g=games.get(id);if(!g){g={team:doc.team,season:p.season,date:p.date,opponent:p.opponent,teamScore:p.teamScore,opponentScore:p.opponentScore,gameId:p.gameId,gameUrl:p.gameUrl,source:'Deseret News game stats',stats:{}};games.set(id,g)}add(g.stats,key,Number(p.value))}}
for(const g of games.values()){const total=(g.stats.passingYards||0)+(g.stats.rushingYards||0);if(total)g.stats.totalOffenseYards=total}return [...games.values()]}
function rank(perfs,key){return perfs.filter(p=>Number.isFinite(p.stats?.[key])).sort((a,b)=>b.stats[key]-a.stats[key]||String(a.date).localeCompare(String(b.date))).slice(0,TEAM_LIMIT).map((p,i)=>({...p,rank:i+1,value:p.stats[key]}))}
function main(){const docs=loadPlayerTeamFiles();fs.rmSync(OUT_DIR,{recursive:true,force:true});fs.mkdirSync(path.join(OUT_DIR,'by-team'),{recursive:true});const index={generatedAt:new Date().toISOString(),source:'Deseret News game stats',method:'Team totals reconstructed from available individual game-stat tables; categories unavailable in source data are omitted.',categoryOrder:TEAM_RECORD_CATEGORY_ORDER,categories:TEAM_RECORD_CATEGORIES,teams:[]};for(const doc of docs){const perfs=performancesFromPlayerRecords(doc),records={};for(const key of TEAM_RECORD_CATEGORY_ORDER){const rows=rank(perfs,key);if(rows.length)records[key]=rows}const out={team:doc.team,generatedAt:index.generatedAt,source:index.source,coverageNote:'Based on available Deseret News individual game statistics. This is not an official UHSAA all-time record book and historical coverage may be incomplete.',categoryOrder:TEAM_RECORD_CATEGORY_ORDER,categories:TEAM_RECORD_CATEGORIES,records};const file=`${slug(doc.team)}.json`;fs.writeFileSync(path.join(OUT_DIR,'by-team',file),JSON.stringify(out,null,2)+'\n');index.teams.push({team:doc.team,file:`by-team/${file}`,games:perfs.length,categories:Object.keys(records).length})}index.teams.sort((a,b)=>a.team.localeCompare(b.team));fs.writeFileSync(path.join(OUT_DIR,'index.json'),JSON.stringify(index,null,2)+'\n');console.log(`Built team single-game records for ${index.teams.length} teams`)}
main();
