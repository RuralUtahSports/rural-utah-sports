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
const cat=v=>['DEFENSE','DEFENSESPECIALTEAMS','TACKLES','SACKS','DEFENSIVESTATISTICS'].includes(norm(v))?'DEFENSESPECIALTEAMS':norm(v);
const field=(c,v)=>{const k=norm(v);return c==='DEFENSESPECIALTEAMS'&&['INTERCEPTIONS','INTS','PASSINT'].includes(k)?'PASSINT':c==='DEFENSESPECIALTEAMS'&&['TD','DEFENSIVETD','DEFENSETD'].includes(k)?'DEFENSETD':k};
const fields=new Set(['YARDS','TD','CARRIES','RECEPTIONS','TACKLES','SACKS','PASSINT','DEFENSETD','RETURNTD','FG','PAT','PTS','INT']);
const number=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const s=String(v).replace(/,/g,'');return /^-?\d+(?:\.\d+)?$/.test(s)?Number(s):null};
const games=[],postseasonBoxes=[],counts={teams:0,seasonRows:0,scalarCells:0,regularTeamGames:0,postseasonTeamGames:0,unknownTeamGames:0,sourceComparisons:0};
const buckets=new Map();
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
   const key=[teamKey(team),row.playerId,c,f].join('|'),byGame=buckets.get(key)||new Map(),conflicts=[...byGame].filter(([,s])=>s.size!==1).map(([k,s])=>({gameKey:k,values:[...s]}));
   const knownSum=[...byGame.values()].filter(s=>s.size===1).reduce((sum,s)=>sum+[...s][0],0);
   const matches=(m?.rows||[]).filter(p=>cat(p.category)===c&&norm(p.name)===norm(row.name));
   const sourceValue=matches.length===1?number(Object.entries(matches[0].values||{}).find(([k])=>field(c,k)===f)?.[1]):null;
   if(sourceValue!==null){counts.sourceComparisons++;if(sourceValue!==n)issues.push({code:'CACHED_SOURCE_SEASON_DISAGREEMENT',team,playerId:row.playerId,name:row.name,category:section.category,field:h,retained:n,maxpreps:sourceValue,url:m.sourceUrl,sourceUpdatedAt:m.lastUpdated,action:'preserve-retained-value; verify source coverage and phase'});}
   if(conflicts.length)issues.push({code:'CONFLICTING_REGULAR_GAME_CELL',team,playerId:row.playerId,category:section.category,field:h,conflicts});
   if(byGame.size&&!conflicts.length&&knownSum>n)issues.push({code:'KNOWN_REGULAR_GAME_SUM_EXCEEDS_RETAINED',team,playerId:row.playerId,name:row.name,category:section.category,field:h,retained:n,knownRegularSum:knownSum,gameCount:byGame.size,complete:false,action:'review-only; incomplete game sum is not a replacement total'});
   cells.push({team,playerId:row.playerId,category:section.category,field:h,retained:n,knownRegularGameSum:byGame.size&&!conflicts.length?knownSum:null,regularGameCells:byGame.size,status:'not-certified'});
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
const issueCounts={};for(const i of issues)issueCounts[i.code]=(issueCounts[i.code]||0)+1;
fs.mkdirSync(output,{recursive:true});
const write=(f,data)=>{
  // One evidence row per line keeps large audits reviewable without discarding details.
  const entries=Object.entries(data).map(([k,v])=>'  '+JSON.stringify(k)+': '+(Array.isArray(v)?'[\n'+v.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]':JSON.stringify(v)));
  fs.writeFileSync(path.join(output,f),'{\n'+entries.join(',\n')+'\n}\n');
};
write('audit.json',{season:2026,policy:POLICY,inputHashes:hashes,counts,issueCounts,teams:teamScope,issues,awardReview:{lockedSnapshotPreserved:true,declaredScope:inputs[names[7]].seasonPhase,fieldLevelScopeCertified:false,unscopedSpecialTeamsExcludedFromScoring:true},limitations:inputs[names[6]].limitations});
write('game-classification.json',{policy:POLICY,games});if(process.argv.includes('--include-cells'))write('cell-review.json',{policy:POLICY,cells});
write('postseason-box-scores.json',{season:2026,scope:'postseason',note:'Exact stored box-score rows retained separately. Availability does not establish complete playoff reporting.',boxScores:postseasonBoxes});
const text=['# 2026 regular-season scope audit','',`Policy: ${POLICY}`,'',`Audited ${counts.teams} schools, ${counts.seasonRows} season rows and ${counts.scalarCells} numeric cells. No season total, player record, source box score or award winner was changed.`,'','## Findings',...Object.entries(issueCounts).map(([k,n])=>`- ${k}: ${n}`),'',`Game inventory (source/team views, not distinct matchups): ${counts.regularTeamGames} regular; ${counts.postseasonTeamGames} postseason; ${counts.unknownTeamGames} unknown.`,'','Unknown phase is excluded from verified regular-season sums. A game date, a missing playoff row, or the presence of stats for another player does not prove classification or field completeness. Cumulative season totals are never reduced by subtracting partial playoff statistics.','',`Retained ${postseasonBoxes.length} original postseason box-score rows separately in postseason-box-scores.json. Raw source files remain available and unchanged.`,'','Fresh web review covered three school schedules and selected source statistics; all other classification relies on cached official competition evidence or remains unknown. See source-audit-observations-2026.json for source URLs and limitations.','', 'This draft is not ready to publish regular-season datasets. No file-level certifications have been granted.'];
fs.writeFileSync(path.join(output,'README.md'),text.join('\n')+'\n');
for(const [f,digest] of Object.entries(hashes))if(sha256(fs.readFileSync(f))!==digest)throw new Error('Audit modified input '+f);
console.log(JSON.stringify({counts,issueCounts,postseasonBoxRows:postseasonBoxes.length,output}));
