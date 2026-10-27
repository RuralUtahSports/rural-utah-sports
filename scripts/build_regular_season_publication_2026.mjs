import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,TEAM_ALIASES,createCompetitionIndex} from './lib/competition-scope-2026.mjs';
import {loadReviewedBatches} from './lib/reviewed-batches-2026.mjs';
import {applyVerifiedPlayerBatch} from './lib/verified-player-corrections-2026.mjs';
export const LOCKED_AWARDS_SHA256='7894e9ae7b3910a075d9ff5b40c59f23c6795bcc47c4a8a165e4b3c413c8246b';
export function buildRegularSeasonPublication(rosters,games,batches,context,lockedText){
 if(sha256(lockedText)!==LOCKED_AWARDS_SHA256)throw Error('Locked award inputs changed; publication refused');
 const teams=Object.fromEntries(Object.keys(rosters.teams).map(team=>[team,{team,roster:structuredClone(rosters.teams[team].roster||[]),stats:[]}]));
 const selected=new Set();let seasonFields=0,gameFields=0;
 for(const batch of batches){
  const checked=applyVerifiedPlayerBatch(rosters,games,batch,context);
  if(checked.changes.length)throw Error('Reviewed corrections must be installed before publication');
  for(const d of batch.decisions){
   if(d.target==='game'){gameFields++;continue;}
   const key=[d.team,d.playerId,d.category,d.field].join('|');
   if(selected.has(key))throw Error('Duplicate reviewed publication field');selected.add(key);
   let section=teams[d.team].stats.find(s=>s.category===d.category);
   if(!section){section={category:d.category,headers:[],rows:[]};teams[d.team].stats.push(section);}
   let row=section.rows.find(p=>p.playerId===d.playerId);
   if(!row){const p=rosters.teams[d.team].roster.find(p=>p.playerId===d.playerId);row={playerId:p.playerId,number:p.number,name:p.name,values:{},statEvidence:{}};section.rows.push(row);}
   row.values[d.field]=d.verifiedReplacement;
   row.statEvidence[d.field]={scope:'regular-season',source:d.source,reportingDate:d.reportingDate,evidenceId:d.evidenceId,batchId:batch.id};
   if(!section.headers.includes(d.field))section.headers.push(d.field);seasonFields++;
  }
 }
 const index=createCompetitionIndex(context),gamePhases={};
 for(const [key,rows] of index.observations){const phases=new Set(rows.map(r=>r.phase));gamePhases[key]=phases.size===1?[...phases][0]:'unknown';}
 const updatedAt=batches.flatMap(b=>b.decisions.map(d=>d.reportingDate)).sort().at(-1);
 return {season:2026,scope:'verified-regular-season',policy:'Only source-reviewed fields enter season rankings. Missing fields are unknown; no cumulative fallback.',lockedSnapshotSha256:LOCKED_AWARDS_SHA256,aliases:TEAM_ALIASES,gamePhases,identityMatches:index.identityMatches,verifiedSeasonFields:seasonFields,verifiedGameFields:gameFields,updatedAt,summary:{teams:Object.keys(teams).length,teamsWithStats:Object.values(teams).filter(t=>t.stats.length).length,reviewComplete:false},teams,eligibleTeamTotals:[],specialTeams:{},regularSeasonStandings:JSON.parse(lockedText).standings,regularSeasonStateTop25:JSON.parse(lockedText).stateTop25};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
 const output=buildRegularSeasonPublication(read('deseret-rosters-stats-2026.json'),read('player-game-stats-2026.json'),loadReviewedBatches(),{brackets:read('official-brackets-2026.json'),review:read('competition-scope-review-2026.json')},fs.readFileSync('region-awards-2026.lock.json','utf8'));
 const file='regular-season-publication-2026.json',text=JSON.stringify(output)+'\n';
 if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)throw Error('Regular-season publication is missing or stale');}
 else fs.writeFileSync(file,text);
 console.log(`Verified regular-season publication: ${output.verifiedSeasonFields} season fields and ${output.verifiedGameFields} protected game fields. All other season cells remain unpublished in this view.`);
}
