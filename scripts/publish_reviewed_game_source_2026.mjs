// Publish only previously reviewed, phase-verified 2026 game stat repairs.
// This intentionally bypasses a slow *source refresh*, not its evidence checks.
// A concurrent main change is rejected by the surrounding GitHub Actions job.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeSourceRepairs} from './propose_4a6a_canonical_game_repairs_2026.mjs';
import {createCompetitionIndex,teamKey} from './lib/competition-scope-2026.mjs';

const TEAM_NAMES=['WEST JORDAN','LAYTON','MOUNTAIN RIDGE','WESTLAKE'];
const fileFor=team=>'team-current-data/'+team.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const pretty=v=>JSON.stringify(v,null,2)+'\n';

export function prepareReviewedGamePublication({games,rosters,manifest,taylorReview,index,shards}){
 if(!games||!rosters||!index||!shards)throw Error('Complete source snapshot and reviewed phase index are mandatory');
 const repair=proposeSourceRepairs(games,rosters,manifest,{index,taylorReview});
 if(repair.holds.length)throw Error('Unresolved reviewed game source conflicts: '+JSON.stringify(repair.holds));
 const allowedIds=new Set(manifest.decisions.map(d=>d.playerId));
 allowedIds.add(taylorReview.identity.playerId);
 for(const p of repair.proposals){
  if(!TEAM_NAMES.includes(p.team)||!allowedIds.has(p.playerId)||
     !['correct-archived-game','recover-missing-game'].includes(p.kind))
   throw Error('Unapproved game-stat change in reviewed proposal: '+JSON.stringify(p));
 }
 if(repair.proposals.length!==0&&repair.proposals.length>5)throw Error('Source repair expanded beyond five approved game changes');
 const expected={...repair.repaired,updatedAt:repair.proposals.length?new Date().toISOString():repair.repaired.updatedAt};
 // Every reviewed correction must now be satisfied. Unknown or partial source
 // fields are not allowed to certify a season; no inferred zero, TD, or catches.
 const again=proposeSourceRepairs(expected,rosters,manifest,{index,taylorReview});
 if(again.proposals.length||again.holds.length)throw Error('Applied canonical source is not idempotent and fully supported');
 const updatedShards={},changedShards=[],originalShards={};
 for(const team of TEAM_NAMES){
  const file=fileFor(team),existing=shards[file];
  if(!existing||teamKey(existing.team)!==teamKey(team)||!existing.gameStats)
   throw Error('Missing/mismatched current team source payload '+file);
  originalShards[file]=existing;
  const gameTeams=Object.entries(expected.teams||{}).filter(([name])=>teamKey(name)===teamKey(team));
  if(gameTeams.length!==1)throw Error('Duplicate/missing canonical game school '+team);
  const copy=structuredClone(existing),before=JSON.stringify(copy.gameStats);
  copy.gameStats=structuredClone(gameTeams[0][1]);
  if(JSON.stringify(copy.gameStats)!==before){
   copy.updatedAt=expected.updatedAt;
   changedShards.push(file);
  }
  // Non-game fields, scoreboard, rosters, rankings and sponsor content are byte-identical objects.
  const a=structuredClone(existing),b=structuredClone(copy);
  delete a.gameStats;delete b.gameStats;delete a.updatedAt;delete b.updatedAt;
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Non-game team shard content modified '+file);
  updatedShards[file]=copy;
 }
 const preservedSeason=pretty(rosters);
 return {updatedGames:expected,updatedShards,changedShards,proposals:repair.proposals,
  summary:{status:'reviewed-source-only',reviewedGameChanges:repair.proposals.length,repairedTeams:TEAM_NAMES,
   affectedTeamShards:changedShards,seasonStatisticsChanged:false,sourceEvidence:manifest.id,
   supplementalReview:taylorReview.id},
  preservedSeason};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const shards=Object.fromEntries(TEAM_NAMES.map(t=>[fileFor(t),read(fileFor(t))]));
 const inputs={
  games:read('player-game-stats-2026.json'),
  rosters:read('deseret-rosters-stats-2026.json'),
  manifest:read('audits/2026-regular-season/reconciled-4a6a-player-cases-2026.json'),
  taylorReview:read('audits/2026-regular-season/westlake-taylor-oct15-reviewed-2026.json'),
  index:createCompetitionIndex({brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')}),
  shards
 };
 const beforeRoster=fs.readFileSync('deseret-rosters-stats-2026.json','utf8');
 const out=prepareReviewedGamePublication(inputs);
 if(beforeRoster!==fs.readFileSync('deseret-rosters-stats-2026.json','utf8'))throw Error('Verified source publisher mutated roster season stats');
 const targetFiles=new Map([['player-game-stats-2026.json',pretty(out.updatedGames)],...Object.entries(out.updatedShards).map(([file,obj])=>[file,JSON.stringify(obj)+'\n'])]);
 const changed=[...targetFiles].filter(([file,text])=>fs.readFileSync(file,'utf8')!==text);
 if(changed.some(([file])=>file!=='player-game-stats-2026.json'&&!TEAM_NAMES.some(t=>fileFor(t)===file)))throw Error('Out-of-scope file write');
 const base=process.argv.find(x=>x.startsWith('--output='))?.slice(9);
 if(base){
  if(!path.isAbsolute(base)||path.resolve(base)===process.cwd())throw Error('Report path must be absolute and outside repository');
  fs.mkdirSync(base,{recursive:true});
  fs.writeFileSync(path.join(base,'publication-audit.json'),pretty({...out.summary,changedFiles:changed.map(([file])=>file),proposals:out.proposals}));
 }
 if(process.argv.includes('--apply')){
  for(const [file,text] of changed){const temp=file+'.reviewed-source-tmp';fs.writeFileSync(temp,text);fs.renameSync(temp,file);}
  if(beforeRoster!==fs.readFileSync('deseret-rosters-stats-2026.json','utf8'))throw Error('Season statistics changed unexpectedly');
 }
 console.log(JSON.stringify({...out.summary,mode:process.argv.includes('--apply')?'applied':'dry-run',changedFiles:changed.map(([file])=>file)}));
}
