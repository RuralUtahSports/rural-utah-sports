// Read-only, case-level triage of the regular-season audit.
// Never alter primary stats, awards, player identities or game results here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const canon = value => String(value ?? '').trim().toUpperCase();
const byName = (a,b) => a.team.localeCompare(b.team) || (a.playerId||'').localeCompare(b.playerId||'');
const stable = values => [...new Set(values.map(x=>JSON.stringify(x)))].map(x=>JSON.parse(x));

export function triageRegularSeasonAudit(audit) {
 if(audit?.season!==2026||!Array.isArray(audit.issues)||!audit.inputHashes)throw Error('Expected source-hashed 2026 regular-season audit');
 const identities=new Map(),gameCells=new Map(),unattributed=[];
 let rawIdentityFindings=0,rawConflictingFieldFindings=0;
 for(const finding of audit.issues){
  const {team,playerId}=finding;
  if(finding.code==='CACHED_SOURCE_IDENTITY_MISMATCH'){
   rawIdentityFindings++;
   if(!team||!playerId)throw Error('Identity mismatch lacks team or stable ID');
   const key=JSON.stringify([team,playerId]);
   const row=identities.get(key)||{team,playerId,name:finding.name||null,retainedNumbers:[],sourceNumbers:[],sourceUrls:[],sourceCachedAt:[],rawFindings:0,status:'HOLD: verify roster identity, jersey and source mapping'};
   row.rawFindings++;
   if(finding.retainedNumber!==undefined)row.retainedNumbers.push(String(finding.retainedNumber));
   if(finding.sourceNumber!==undefined)row.sourceNumbers.push(String(finding.sourceNumber));
   if(finding.url)row.sourceUrls.push(finding.url);
   if(finding.sourceUpdatedAt)row.sourceCachedAt.push(finding.sourceUpdatedAt);
   identities.set(key,row);
  }
  if(finding.code==='CONFLICTING_REGULAR_GAME_CELL'){
   rawConflictingFieldFindings++;
   if(!team||!playerId||!finding.category||!finding.field)throw Error('Game-field conflict lacks stable identity');
   for(const c of finding.conflicts||[]){
    if(!c.gameKey){unattributed.push({team,playerId,category:finding.category,field:finding.field,reason:'missing canonical game key'});continue;}
    const key=JSON.stringify([team,playerId,canon(finding.category),canon(finding.field),c.gameKey]);
    const row=gameCells.get(key)||{team,playerId,category:finding.category,field:finding.field,gameKey:c.gameKey,reportedValues:[],sourceReports:[],rawFindings:0,status:'HOLD: provider/game cell disagreement'};
    row.reportedValues.push(...(c.values||[]));
    row.sourceReports.push(...(c.reports||[]));
    row.rawFindings++;
    gameCells.set(key,row);
   }
  }
 }
 const identityCases=[...identities.values()].map(x=>({
  ...x,retainedNumbers:[...new Set(x.retainedNumbers)].sort(),sourceNumbers:[...new Set(x.sourceNumbers)].sort(),
  sourceUrls:[...new Set(x.sourceUrls)].sort(),sourceCachedAt:[...new Set(x.sourceCachedAt)].sort(),
  sourceReportingDate:'unknown; cache update is not provider reporting date'
 })).sort(byName);
 const gameCellCases=[...gameCells.values()].map(x=>({
  ...x,reportedValues:[...new Set(x.reportedValues)].sort((a,b)=>a-b),
  sourceReports:stable(x.sourceReports).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
  sourceReportingDate:'unknown; independently verify provider entries'
 })).sort((a,b)=>byName(a,b)||a.gameKey.localeCompare(b.gameKey)||a.category.localeCompare(b.category)||a.field.localeCompare(b.field));
 const teamStats=new Map();
 for(const x of identityCases){const t=teamStats.get(x.team)||{team:x.team,distinctIdentityPlayers:0,distinctGameCells:0};t.distinctIdentityPlayers++;teamStats.set(x.team,t);}
 for(const x of gameCellCases){const t=teamStats.get(x.team)||{team:x.team,distinctIdentityPlayers:0,distinctGameCells:0};t.distinctGameCells++;teamStats.set(x.team,t);}
 const priorities=[...teamStats.values()].sort((a,b)=>b.distinctIdentityPlayers+b.distinctGameCells-(a.distinctIdentityPlayers+a.distinctGameCells)||a.team.localeCompare(b.team));
 return {
  season:2026,sourceInputHashes:audit.inputHashes,mode:'read-only; no scores, stats, identity or awards modified',
  summary:{
   rawIdentityFindings,distinctIdentityPlayers:identityCases.length,
   rawConflictingFieldFindings,distinctContestedPlayerGameFields:gameCellCases.length,
   distinctPlayersInGameConflicts:new Set(gameCellCases.map(x=>JSON.stringify([x.team,x.playerId]))).size,
   gameCasesMissingSourceReports:gameCellCases.filter(x=>!x.sourceReports.length).length,
   unattributedConflictRows:unattributed.length,
   teamsWithIdentityOrGameConflicts:priorities.length
  },
  auditIssueCounts:audit.issueCounts,
  priorities,identityCases,gameCellCases,unattributed,
  holds:[
   'Only stable roster identity plus verified source profile/jersey evidence can authorize identity changes',
   'A conflict between caches is not proof either cached value is correct',
   'Review actual regular-season game, positive competition classification and every required field before replacing season totals',
   'Provider cache update time is not the original reporting timestamp',
   'Reviewed PR #181 fields and locked awards are unchanged; all outputs are review candidates'
  ]
 };
}
function table(rows,headers){return ['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');}
function markdown(x){
 const s=x.summary;
 return [
 '# 2026 regular-season statistics: conflict and identity triage','',
 'This is a **read-only audit**, NOT a batch of approved statistical changes. The source-hash values in triage.json bind results to the audited caches.','',
 '## Cases (not repeated individual-field warnings)','',
 table([
 ['Jersey/identity mismatch findings',s.rawIdentityFindings],
 ['**Distinct affected player IDs**',s.distinctIdentityPlayers],
 ['Conflicting player-field findings',s.rawConflictingFieldFindings],
 ['**Distinct player/game/field cases**',s.distinctContestedPlayerGameFields],
 ['Distinct players with game-cell conflicts',s.distinctPlayersInGameConflicts],
 ['Cases lacking cache-source details',s.gameCasesMissingSourceReports],
 ['Unattributed contest rows',s.unattributedConflictRows]
 ],['Measure','Count']), '',
 '## Highest-volume school review queues','',
 table(x.priorities.slice(0,20).map(t=>[t.team,t.distinctIdentityPlayers,t.distinctGameCells]),['School','Player identities','Player/game fields']), '',
 '## Review workflow','',
 '1. Group identity reports by school and stable player ID; compare the source profile, roster, name, jersey, and position without merging similar names.',
 '2. Group game-cell conflicts by canonical contest + player + statistical field. Use sourceReports URLs/values to inspect both provider records; do not choose by whichever value is larger.',
 '3. Confirm the game is regular season, the athlete appears once, and all games required for a season total are accounted for.',
 '4. Prepare explicit evidence-backed, original-value-guarded correction decisions as a new batch in a separate PR. Keep unresolved cases held.',
 '5. Re-run PR #181 preservation tests, site checks and release review before accepting any data mutation.',
 '',
 '## Preserved boundaries','',
 ...x.holds.map(v=>'- '+v),'',
 'Detailed cases: triage.json. Neither source files nor locked awards were edited by this tool.',''
 ].join('\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const arg=n=>process.argv.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3);
 const source=arg('audit'),dir=arg('output');
 if(!source||!dir||path.resolve(source)===path.resolve(dir))throw Error('Require distinct --audit and --output paths');
 const reviewed=triageRegularSeasonAudit(JSON.parse(fs.readFileSync(source,'utf8')));
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'triage.json'),JSON.stringify(reviewed,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'TRIAGE.md'),markdown(reviewed));
 console.log(JSON.stringify(reviewed.summary));
}
