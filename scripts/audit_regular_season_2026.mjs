import fs from 'node:fs';
import path from 'node:path';
import {createCompetitionIndex,partitionGames,teamKey,gameKey,sha256,POLICY} from './lib/competition-scope-2026.mjs';

const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'audits/2026-regular-season';
if(path.resolve(output)===process.cwd())throw new Error('Audit outputs need a separate directory');
const names=['deseret-rosters-stats-2026.json','player-game-stats-2026.json','maxpreps-stats-fallback-2026.json','maxpreps-player-game-stats-2026.json','official-brackets-2026.json','competition-scope-review-2026.json','source-audit-observations-2026.json','region-awards-2026.lock.json'];
const inputs=Object.fromEntries(names.map(f=>[f,read(f)]));
const hashes=Object.fromEntries(names.map(f=>[f,sha256(fs.readFileSync(f))]));
const scope=createCompetitionIndex({brackets:inputs[names[4]],review:inputs[names[5]]});
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const cat=v=>['DEFENSE','DEFENSESPECIALTEAMS','TACKLES','SACKS','DEFENSIVESTATISTICS','TOUCHDOWNS'].includes(norm(v))?'DEFENSESPECIALTEAMS':norm(v)==='PATSANDFIELDGOALS'?'KICKING':norm(v);
const field=(c,v)=>{const k=norm(v);return c==='DEFENSESPECIALTEAMS'&&['INTERCEPTIONS','INTS','PASSINT'].includes(k)?'PASSINT':c==='DEFENSESPECIALTEAMS'&&['TD','DEFENSIVETD','DEFENSETD'].includes(k)?'DEFENSETD':k};
const fields=new Set(['YARDS','TD','CARRIES','RECEPTIONS','TACKLES','SACKS','PASSINT','DEFENSETD','RETURNTD','FG','PAT','PTS','INT','CAUSEDFUM','FUMREC','PD','PASSINTYDS','FRYDS']);
const number=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const s=String(v).replace(/,/g,'');return /^-?\d+(?:\.\d+)?$/.test(s)?Number(s):null};
const games=[],postseasonBoxes=[],counts={teams:0,seasonRows:0,scalarCells:0,regularTeamGames:0,postseasonTeamGames:0,unknownTeamGames:0,sourceComparisons:0};
const buckets=new Map(), sourceCells=new Map();
for(const [file,source] of [[names[1],'RUS merged game cache'],[names[3],'MaxPreps game cache']])for(const [team,t] of Object.entries(inputs[file].teams||{})){
 const unique=new Map();for(const g of t.games||[])unique.set(gameKey(g,team)||JSON.stringify([g.date,g.opponent]),g);
 const parts=partitionGames([...unique.values()],scope,team);
 for(const [phase,list] of Object.entries(parts))for(const {game:g,scope:s} of list){
  const item={team,date:g.date,opponent:g.opponent,key:s.key,phase:s.phase,reason:s.reason,source,file,url:g.url||null,evidence:s.evidence};games.push(item);
  counts[phase==='regular'?'regularTeamGames':phase==='postseason'?'postseasonTeamGames':'unknownTeamGames']++;
 }
 // Keep the original per-player rows, including repeated identities, in the
 // postseason export. Deduplication above affects the inventory, never box scores.
 for(const g of t.games||[]){const s=scope.classify(g,team);if(s.phase==='postseason')postseasonBoxes.push({team,sourceFile:file,competitionEvidence:s.evidence,boxScore:g});if(s.phase!=='regular-season')continue;
  for(const p of g.players||[g])for(const line of p.statLines||[]){const c=cat(line.category);
   for(const [h,v] of Object.entries(line.values||{})){const f=field(c,h),n=number(v);if(!fields.has(f)||n===null||!p.playerId)continue;
    const key=[teamKey(team),p.playerId,c,f].join('|'),byGame=buckets.get(key)||new Map(),values=byGame.get(s.key)||new Set();values.add(n);byGame.set(s.key,values);buckets.set(key,byGame);
    // Retain the provenance behind every disagreeing field. This evidence
    // does not choose a winner or establish when a provider updated a stat.
    const bySourceGame=sourceCells.get(key)||new Map(),reports=bySourceGame.get(s.key)||[];
    reports.push({source,sourceFile:file,url:g.url||g.maxprepsUrl||null,date:g.date,opponent:g.opponent,value:n});
    bySourceGame.set(s.key,reports);sourceCells.set(key,bySourceGame);
   }
  }
 }
}
const issues=[];
const cells=[];
for(const [team,t] of Object.entries(inputs[names[0]].teams||{})){
 counts.teams++;
 if(!(t.stats||[]).some(s=>s.rows?.length))issues.push({code:'MISSING_SCHOOL_STATS',team});
 const m=Object.entries(inputs[names[2]].teams||{}).find(([name])=>teamKey(name)===teamKey(team))?.[1];
 for(const section of t.stats||[])for(const row of section.rows||[]){counts.seasonRows++;const c=cat(section.category);
  for(const [h,v] of Object.entries(row.values||{})){const f=field(c,h),n=number(v);if(!fields.has(f)||n===null)continue;counts.scalarCells++;
   const key=[teamKey(team),row.playerId,c,f].join('|'),byGame=buckets.get(key)||new Map(),conflicts=[...byGame].filter(([,s])=>s.size!==1).map(([k,s])=>({
    gameKey:k,values:[...s].sort((a,b)=>a-b),
    reports:[...new Map((sourceCells.get(key)?.get(k)||[]).map(report=>[JSON.stringify(report),report])).values()]
   }));
   const knownSum=[...byGame.values()].filter(s=>s.size===1).reduce((sum,s)=>sum+[...s][0],0);
   const matches=(m?.rows||[]).filter(p=>cat(p.category)===c&&norm(p.name)===norm(row.name));
   const sourceValue=matches.length===1?number(Object.entries(matches[0].values||{}).find(([k])=>field(c,k)===f)?.[1]):null;
   if(matches.length===1&&String(matches[0].number)!==String(row.number))issues.push({code:'CACHED_SOURCE_IDENTITY_MISMATCH',team,playerId:row.playerId,name:row.name,retainedNumber:row.number,sourceNumber:matches[0].number,action:'manual identity review; do not replace by name alone'});
   if(sourceValue!==null&&String(matches[0].number)===String(row.number)){counts.sourceComparisons++;if(sourceValue!==n)issues.push({code:'CACHED_SOURCE_SEASON_DISAGREEMENT',team,playerId:row.playerId,name:row.name,category:section.category,field:h,retained:n,maxpreps:sourceValue,url:m.sourceUrl,sourceUpdatedAt:m.lastUpdated,action:'preserve-retained-value; verify source coverage and phase'});}
   if(conflicts.length)issues.push({code:'CONFLICTING_REGULAR_GAME_CELL',team,playerId:row.playerId,category:section.category,field:h,conflicts});
   if(byGame.size&&!conflicts.length&&knownSum>n)issues.push({code:'KNOWN_REGULAR_GAME_SUM_EXCEEDS_RETAINED',team,playerId:row.playerId,name:row.name,category:section.category,field:h,retained:n,knownRegularSum:knownSum,gameCount:byGame.size,complete:false,action:'review-only; incomplete game sum is not a replacement total'});
   cells.push({team,playerId:row.playerId,category:section.category,field:h,retained:n,knownRegularGameSum:byGame.size&&!conflicts.length?knownSum:null,regularGameCells:byGame.size,status:'not-certified'});
  }
  if(c==='PASSING'){
   const saved=Object.entries(row.values||{}).find(([h])=>norm(h)==='COMPATT')?.[1];
   const reported=(m?.rows||[]).filter(p=>cat(p.category)===c&&norm(p.name)===norm(row.name)&&String(p.number)===String(row.number));
   const pair=reported.length===1?Object.entries(reported[0].values||{}).find(([h])=>norm(h)==='COMPATT')?.[1]:null;
   if(saved&&pair){counts.sourceComparisons++;if(saved!==pair)issues.push({code:'CACHED_SOURCE_PASSING_PAIR_DISAGREEMENT',team,playerId:row.playerId,name:row.name,field:'COMP-ATT',retained:saved,maxpreps:pair,url:m.sourceUrl,sourceUpdatedAt:m.lastUpdated,action:'verify completions and attempts against individual regular games'});}
  }
  if(['RUSHING','RECEIVING'].includes(c)){
   const get=k=>number(Object.entries(row.values||{}).find(([h])=>norm(h)===k)?.[1]);const yards=get('YARDS'),denom=get(c==='RUSHING'?'CARRIES':'RECEPTIONS'),rate=get(c==='RUSHING'?'YARDSCARRY':'YARDSRECEP');
   if(yards!==null&&denom>0&&rate!==null&&Math.abs(rate-yards/denom)>.02)issues.push({code:'RETAINED_RATE_INCONSISTENCY',team,playerId:row.playerId,name:row.name,category:section.category,retained:rate,operandRatio:Math.round(yards/denom*100)/100,action:'review operands and reporting dates before changing rate'});
  }
 }
}
for(const o of inputs[names[6]].observations){const team=inputs[names[0]].teams[o.team],row=team?.stats?.find(s=>cat(s.category)===cat(o.category))?.rows?.find(p=>p.playerId===o.playerId);const retained=number(Object.entries(row?.values||{}).find(([h])=>field(cat(o.category),h)===field(cat(o.category),o.field))?.[1]);issues.push({code:'WEB_SOURCE_OBSERVATION',...o,retained,action:'record evidence only; no replacement applied'});}
const teamScope=[];
for(const team of Object.keys(inputs[names[0]].teams||{})){const rows=games.filter(g=>teamKey(g.team)===teamKey(team));teamScope.push({team,regular:rows.filter(g=>g.phase==='regular-season').length,postseason:rows.filter(g=>g.phase==='postseason').length,unknown:rows.filter(g=>g.phase==='unknown').length,status:'source-and-field-review-incomplete'});}
const metadata=new Map(read('teams-data.json').map(t=>[teamKey(t.team),t]));
const batchRegistry=read('regular-season-correction-batches-2026.json');
const verified=batchRegistry.batches.flatMap(f=>read(f).decisions);
const categories=['Passing','Rushing','Receiving','Defense/Special Teams','Kicking'];
const coverage=teamScope.map(t=>{
 const school=inputs[names[0]].teams[t.team],source=Object.entries(inputs[names[2]].teams).find(([name])=>teamKey(name)===teamKey(t.team))?.[1],findings=issues.filter(i=>teamKey(i.team)===teamKey(t.team));
 return {...t,classification:metadata.get(teamKey(t.team))?.classification||'unknown',deseretUrl:school.statsUrl,maxprepsUrl:source?.sourceUrl||null,sourceReportedAt:source?.lastUpdated||null,
  categories:categories.map(category=>({category,reportedRows:(school.stats||[]).filter(s=>cat(s.category)===cat(category)).reduce((n,s)=>n+s.rows.length,0),reviewedCells:verified.filter(d=>d.target==='season'&&d.team===t.team&&cat(d.category)===cat(category)).length,discrepancies:findings.filter(i=>cat(i.category)===cat(category)).length,status:'field-verification-incomplete'})),
  returns:{touchdownFieldsAvailable:(school.stats||[]).some(s=>(s.rows||[]).some(p=>Object.keys(p.values||{}).some(h=>norm(h)==='RETURNTD'))),kickAndPuntReturnYards:'not-covered-by-current-import-schema; source game review required'},
  unresolved:findings.map(i=>({code:i.code,playerId:i.playerId,category:i.category,field:i.field,retained:i.retained,maxpreps:i.maxpreps,knownRegularSum:i.knownRegularSum})),
  nextAction:'Verify stable player identities, source reporting dates, expected played regular games and explicit field coverage. Do not subtract incomplete playoffs or certify absent fields.'};
});
const issueCounts={};for(const i of issues)issueCounts[i.code]=(issueCounts[i.code]||0)+1;
fs.mkdirSync(output,{recursive:true});
const write=(f,data)=>{
  // One evidence row per line keeps large audits reviewable without discarding details.
  const entries=Object.entries(data).map(([k,v])=>'  '+JSON.stringify(k)+': '+(Array.isArray(v)?'[\n'+v.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]':JSON.stringify(v)));
  fs.writeFileSync(path.join(output,f),'{\n'+entries.join(',\n')+'\n}\n');
};
write('review-coverage.json',{season:2026,policy:POLICY,sourceAccess:'Stored Deseret/MaxPreps source comparison plus reviewed provider schedules. Cached responses may be stale. No statewide accuracy certification.',counts,issueCounts,verifiedCorrectionCells:verified.length,teams:coverage});
write('audit.json',{season:2026,policy:POLICY,inputHashes:hashes,counts,issueCounts,teams:teamScope,issues,awardReview:{lockedSnapshotPreserved:true,declaredScope:inputs[names[7]].seasonPhase,fieldLevelScopeCertified:false,unscopedSpecialTeamsExcludedFromScoring:true},limitations:inputs[names[6]].limitations});
write('game-classification.json',{policy:POLICY,games});if(process.argv.includes('--include-cells'))write('cell-review.json',{policy:POLICY,cells});
write('postseason-box-scores.json',{season:2026,scope:'postseason',note:'Exact stored box-score rows retained separately. Availability does not establish complete playoff reporting.',boxScores:postseasonBoxes});
const text=['# 2026 regular-season scope audit','',`Policy: ${POLICY}`,'',`Audited ${counts.teams} schools, ${counts.seasonRows} season rows and ${counts.scalarCells} numeric cells. No season total, player record, source box score or award winner was changed.`,'','## Findings',...Object.entries(issueCounts).map(([k,n])=>`- ${k}: ${n}`),'',`Game inventory (source/team views, not distinct matchups): ${counts.regularTeamGames} regular; ${counts.postseasonTeamGames} postseason; ${counts.unknownTeamGames} unknown.`,'','Unknown phase is excluded from verified regular-season sums. A game date, a missing playoff row, or the presence of stats for another player does not prove classification or field completeness. Cumulative season totals are never reduced by subtracting partial playoff statistics.','',`Retained ${postseasonBoxes.length} original postseason box-score rows separately in postseason-box-scores.json. Raw source files remain available and unchanged.`,'','Provider schedule rows have been reviewed statewide; conflicting aliases/dates remain unknown. Individual statistic certification is limited to the explicit correction batches, not every field on a reviewed schedule. See source-audit-observations-2026.json for source URLs and limitations.','', 'This draft is not ready to publish regular-season datasets. No file-level certifications have been granted.'];
fs.writeFileSync(path.join(output,'README.md'),text.join('\n')+'\n');
for(const [f,digest] of Object.entries(hashes))if(sha256(fs.readFileSync(f))!==digest)throw new Error('Audit modified input '+f);
console.log(JSON.stringify({counts,issueCounts,postseasonBoxRows:postseasonBoxes.length,output}));
