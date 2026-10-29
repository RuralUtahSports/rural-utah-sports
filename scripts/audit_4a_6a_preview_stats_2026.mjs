// Read-only 4A, 5A, 6A player-stat preview preflight, as of 2026-10-29.
// Source disagreements are NOT certified corrections.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCompetitionIndex,gameKey,teamKey,sha256} from './lib/competition-scope-2026.mjs';

const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const num=v=>{const s=String(v??'').trim().replace(/,/g,'');return /^-?\d+(?:\.\d+)?$/.test(s)?Number(s):null};
const cat=v=>{const s=norm(v);if(s.startsWith('PASS'))return 'PASSING';if(s.startsWith('RUSH'))return 'RUSHING';if(s.startsWith('RECEIV'))return 'RECEIVING';if(s.startsWith('KICK')||s.includes('FIELDGOAL'))return 'KICKING';if(['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS'].includes(s))return 'DEFENSE';return null};
const field=(c,k)=>{const s=norm(k);if(['PASSYARDS','RUSHYARDS','RECYARDS','RECEIVINGYARDS'].includes(s))return 'YARDS';if(s==='TDS')return 'TD';if(c==='DEFENSE'&&['INTERCEPTIONS','INTS','PASSINT'].includes(s))return 'PASSINT';if(['FGMADE','FIELDGOALSMADE'].includes(s))return 'FG';return s};
const metrics=[['PASSING','YARDS'],['PASSING','TD'],['RUSHING','YARDS'],['RUSHING','TD'],['RECEIVING','YARDS'],['RECEIVING','RECEPTIONS'],['DEFENSE','TACKLES'],['DEFENSE','SACKS'],['DEFENSE','PASSINT'],['KICKING','FG']];
const numberIn=(obj,c,f)=>{const hits=Object.entries(obj||{}).filter(([k])=>field(c,k)===f);return hits.length===1?num(hits[0][1]):null};
const sameName=(a,b)=>{
 const words=v=>String(v||'').replace(/\([^)]*\)/g,' ').trim().split(/\s+/).filter(Boolean).map(norm);
 const x=words(a),y=words(b);return x.length>=2&&y.length>=2&&x.at(-1)===y.at(-1)&&x[0][0]===y[0][0]&&(x[0].length===1||y[0].length===1||x[0]===y[0]);
};
function playerMatch(rows,person,c){
 const hits=(rows||[]).filter(p=>cat(p.category)===c&&String(p.number??'')===String(person.number??'')&&sameName(p.name,person.name));
 if(!hits.length)return {kind:'missing'};
 // A provider may split one athlete into multiple category rows that hold
 // complementary fields. Merge only non-conflicting observations, per field.
 const firstNames=new Set(hits.map(p=>String(p.name||'').trim().split(/\s+/)[0]).map(norm).filter(n=>n.length>1));
 if(firstNames.size>1)return {kind:'ambiguous'};
 const values={},conflicts=new Set();
 for(const row of hits)for(const [head,raw] of Object.entries(row.values||{})){
  const label=field(c,head),n=num(raw);
  if(n===null)continue;
  if(Object.hasOwn(values,label)&&Number(values[label])!==n)conflicts.add(label);
  else if(!Object.hasOwn(values,label))values[label]=String(n);
 }
 return {kind:'unique',person:{values},conflicts};
}
function gameIndex(sources,scope){
 const out=new Map(),seen=new Set();
 for(const [provider,source] of sources)for(const [team,t] of Object.entries(source?.teams||{}))for(const g of t.games||[]){
  const review=scope.classify(g,team),key=review.key||gameKey(g,team);
  const phase=review.phase==='regular-season'&&String(g.date||'').slice(0,10)<='2026-10-29'?'regular-season':'unverified';
  if(!key)continue;
  for(const p of g.players||[])for(const line of p.statLines||[]){
   const c=cat(line.category);if(!c)continue;
   for(const [head,raw] of Object.entries(line.values||{})){
    const f=field(c,head),n=num(raw);if(n===null||!metrics.some(m=>m[0]===c&&m[1]===f))continue;
    const person=[teamKey(team),norm(p.name),String(p.number??''),c,f].join('|');
    const dedup=[person,key,provider,n].join('|');if(seen.has(dedup))continue;seen.add(dedup);
    const cells=out.get(person)||new Map(),reports=cells.get(key)||[];
    reports.push({provider,date:g.date,opponent:g.opponent,value:n,phase,url:g.url||null});
    cells.set(key,reports);out.set(person,cells);
   }
  }
 }
 return out;
}
export function auditPreview({rosters,maxpreps,mergedGames,maxprepsGames,brackets,review,metadata,hashes={}}){
 if(rosters?.season!==2026||maxpreps?.season!==2026||brackets?.season!==2026)throw Error('Wrong source season');
 const expected=new Map(),matchups=[];
 for(const c of ['4A','5A','6A']){
  const round=brackets.classifications[c]?.rounds[0];
  if(round?.games?.length!==8||!round.name.includes('First Round'))throw Error('Unexpected '+c+' bracket');
  for(const g of round.games){
   if(!String(g.date).includes('Oct 30'))throw Error('Postseason start changed');
   const a=g.a.name,b=g.b.name;matchups.push({classification:c,higherSeed:a,lowerSeed:b});
   for(const [name,other] of [[a,b],[b,a]]){
    const k=teamKey(name);if(expected.has(k))throw Error('Duplicate playoff participant');
    expected.set(k,{classification:c,opponent:other});
   }
  }
 }
 if(expected.size!==48)throw Error('Expected exactly 48 playoff teams');
 const bySource=new Map(Object.entries(maxpreps.teams||{}).map(([k,v])=>[teamKey(k),v]));
 const scope=createCompetitionIndex({brackets,review}),gameData=gameIndex([['RUS merged box',mergedGames],['MaxPreps cached box',maxprepsGames]],scope);
 const results=[],schools=[],missing=[];
 for(const [team,t] of Object.entries(rosters.teams||{})){
  const info=expected.get(teamKey(team));if(!info)continue;
  const mp=bySource.get(teamKey(team));const rosterIndex=new Map((t.roster||[]).map(p=>[p.playerId,p]));const current=[];
  for(const s of t.stats||[]){
   const c=cat(s.category);if(!c)continue;
   for(const p of s.rows||[]){
    const identity=rosterIndex.get(p.playerId),stable=!!identity&&norm(identity.name)===norm(p.name)&&String(identity.number)===String(p.number);
    const alt=stable?playerMatch(mp?.rows,p,c):{kind:'identity-hold'};
    for(const [mc,f] of metrics.filter(m=>m[0]===c)){
     const retained=numberIn(p.values,c,f),source=alt.kind==='unique'&&!alt.conflicts.has(f)?numberIn(alt.person.values,c,f):null;
     if(retained===null&&source===null)continue;
     const raw=gameData.get([teamKey(team),norm(p.name),String(p.number??''),c,f].join('|'))||new Map();
     const cellEvidence=[...raw.entries()].map(([key,reports])=>{
      const regular=[...new Set(reports.filter(r=>r.phase==='regular-season').map(r=>r.value))];
      return {gameKey:key,values:regular,unclassified:reports.some(r=>r.phase!=='regular-season'),sources:reports.filter(r=>r.phase==='regular-season').map(r=>({source:r.provider,value:r.value,url:r.url}))};
     });
     const known=cellEvidence.filter(x=>x.values.length===1),disputed=cellEvidence.filter(x=>x.values.length>1);
     const sum=known.length?known.reduce((n,g)=>n+g.values[0],0):null,flags=[];
     if(!stable)flags.push('identity-hold');
     if(alt.kind==='ambiguous')flags.push('ambiguous-maxpreps-player');
     if(alt.kind==='unique'&&alt.conflicts.has(f))flags.push('conflicting-maxpreps-field');
     if(retained===null&&source!==null)flags.push('missing-deseret');
     if(retained!==null&&source!==null&&retained!==source)flags.push('provider-disagreement');
     if(disputed.length)flags.push('game-stat-conflict');
     if(sum!==null&&retained!==null&&sum>retained)flags.push('known-game-sum-exceeds-retained');
     if(cellEvidence.some(x=>x.unclassified))flags.push('unknown-competition-phase');
     const item={classification:info.classification,team,opponent:info.opponent,playerId:p.playerId,name:p.name,number:p.number,category:c,field:f,deseret:retained,maxpreps:source,difference:source!==null&&retained!==null?source-retained:null,sourceUrl:alt.kind==='unique'?mp?.sourceUrl:null,sourceReportDate:alt.kind==='unique'?mp?.lastUpdated:null,regularGamesWithUniqueValue:known.length,knownRegularSum:sum,disputedGames:disputed.length,flags,status:flags.length?'REVIEW':'AGREES_OR_UNCOMPARABLE_UNVERIFIED',gameEvidence:cellEvidence};
     current.push(item);results.push(item);
    }
   }
  }
  const offense=current.filter(x=>['PASSING','RUSHING','RECEIVING'].includes(x.category));
  schools.push({team,classification:info.classification,opponent:info.opponent,allMetricCells:current.length,allReviewCells:current.filter(x=>x.flags.length).length,offenseReviewCells:offense.filter(x=>x.flags.length).length,offenseHighestPriority:offense.filter(x=>x.flags.length).sort((a,b)=>Math.abs(b.difference||0)-Math.abs(a.difference||0)).slice(0,12).map(({gameEvidence,...x})=>x)});
 }
 for(const [t,info] of expected)if(!schools.some(s=>teamKey(s.team)===t))missing.push({team:t,classification:info.classification});
 const keyStats=results.filter(x=>['PASSING','RUSHING','RECEIVING'].includes(x.category)&&x.field==='YARDS');
 const problems=keyStats.filter(x=>x.flags.length).sort((a,b)=>Math.abs(b.difference||0)-Math.abs(a.difference||0));
 const summary={playoffTeams:48,teamsAudited:schools.length,missingTeams:missing,playerMetricCells:results.length,allFlaggedCells:results.filter(x=>x.flags.length).length,offensiveYardageCases:problems.length,offensiveYardageProviderDisagreements:keyStats.filter(x=>x.flags.includes('provider-disagreement')).length,offensiveYardageKnownGameSumsExceed:keyStats.filter(x=>x.flags.includes('known-game-sum-exceeds-retained')).length,flagCounts:Object.fromEntries([...new Set(results.flatMap(x=>x.flags))].map(f=>[f,results.filter(x=>x.flags.includes(f)).length])),byClass:Object.fromEntries(['4A','5A','6A'].map(c=>[c,{teams:schools.filter(x=>x.classification===c).length,offenseCases:schools.filter(x=>x.classification===c).reduce((sum,x)=>sum+x.offenseReviewCells,0)}]))};
 return {season:2026,asOf:'2026-10-29',status:'REVIEW ONLY: NOT CERTIFIED TO PUBLISH',sourceHashes:hashes,summary,matchups,schools,topOffensiveYardDisputes:problems.slice(0,80).map(({gameEvidence,...x})=>x),cases:results,holds:['Source disagreement does not establish the correct value','No larger-source auto replacement; preserve reviewed 2026 correction batches','Player ID, name and jersey must match, and all game coverage must be verified before totals are certified','Only positively classified games can contribute to known regular-season sums','Postseason first round is October 30; revalidate after kickoff','Do not change team records, rankings, scores, or locked awards']};
}
function report(x){
 const lines=['# Rural Utah Sports: 2026 4A–6A preview stat readiness','','Read-only source review: no published stats were changed. All three classes start playoffs October 30.','',
 '## Summary',JSON.stringify(x.summary,null,2),'','## 48 first-round participants',
 ...['4A','5A','6A'].flatMap(c=>['### '+c,...x.matchups.filter(m=>m.classification===c).map(m=>'- '+m.higherSeed+' vs '+m.lowerSeed)]),
 '','## Team-by-team risk review','| Class | Team | First-round opponent | Offense cells requiring review | All field warnings |','|---|---|---|---:|---:|',
 ...x.schools.sort((a,b)=>a.classification.localeCompare(b.classification)||a.team.localeCompare(b.team)).map(s=>'| '+s.classification+' | '+s.team+' | '+s.opponent+' | '+s.offenseReviewCells+' | '+s.allReviewCells+' |'),
 '','## Highest priority passing, rushing, receiving yardage differences','| Team | Player | Metric | Deseret | MaxPreps | Difference | Known regular-game count | Flags |','|---|---|---|---:|---:|---:|---:|---|',
 ...x.topOffensiveYardDisputes.slice(0,65).map(s=>'| '+s.team+' | '+s.name+' | '+s.category+' '+s.field+' | '+(s.deseret??'—')+' | '+(s.maxpreps??'—')+' | '+(s.difference??'—')+' | '+s.regularGamesWithUniqueValue+' | '+s.flags.join(', ')+' |'),
 '','## Publication holds',...x.holds.map(s=>'- '+s),'','All source URLs, player IDs, contest values, and raw cases appear in audit.json.'];
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const files=['deseret-rosters-stats-2026.json','maxpreps-stats-fallback-2026.json','player-game-stats-2026.json','maxpreps-player-game-stats-2026.json','official-brackets-2026.json','competition-scope-review-2026.json','teams-data.json'];
 const hash=Object.fromEntries(files.map(f=>[f,sha256(fs.readFileSync(f))]));const data=files.map(read);
 const output=process.argv.find(s=>s.startsWith('--output='))?.slice(9)||'/tmp/rus-4a-6a-preview';
 if(!path.isAbsolute(output)||path.resolve(output)===process.cwd())throw Error('Output directory must be outside repo');
 const result=auditPreview({rosters:data[0],maxpreps:data[1],mergedGames:data[2],maxprepsGames:data[3],brackets:data[4],review:data[5],metadata:data[6],hashes:hash});
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(output,'PREVIEW-READINESS.md'),report(result));
 for(const [f,h] of Object.entries(hash))if(sha256(fs.readFileSync(f))!==h)throw Error('Source mutated: '+f);
 console.log(JSON.stringify({summary:result.summary,topDisputes:result.topOffensiveYardDisputes.slice(0,18).map(x=>({team:x.team,player:x.name,metric:x.category,retained:x.deseret,maxpreps:x.maxpreps,diff:x.difference,flags:x.flags})),artifact:output}));
}
