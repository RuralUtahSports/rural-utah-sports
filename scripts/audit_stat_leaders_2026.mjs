// Source-only, read-only 2026 player leaderboard audit. No stats are published.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCompetitionIndex,teamKey,sha256} from './lib/competition-scope-2026.mjs';

const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const numeric=v=>{const s=String(v??'').trim().replace(/,/g,'');return /^-?(?:\d+(\.\d+)?|\.\d+)$/.test(s)?Number(s):null};
const category=v=>{const s=norm(v);return s.startsWith('PASS')?'Passing':s.startsWith('RUSH')?'Rushing':s.startsWith('RECEIV')?'Receiving':s.includes('DEFEN')||s==='TACKLES'||s==='SACKS'?'Defense/Special Teams':s.startsWith('KICK')||s.includes('FIELDGOAL')?'Kicking':v};
const field=v=>({TDS:'TD',PASSYARDS:'YARDS',RUSHYARDS:'YARDS',RECYARDS:'YARDS',RECEIVINGYARDS:'YARDS',INTS:'INT',INTERCEPTIONS:'INT',PASSINTS:'PASSINT',TOTALTACKLES:'TACKLES'})[norm(v)]||norm(v);
const metricDefs=[['Passing','YARDS'],['Passing','TD'],['Rushing','YARDS'],['Rushing','TD'],['Receiving','YARDS'],['Receiving','TD'],['Defense/Special Teams','TACKLES'],['Defense/Special Teams','SACKS'],['Kicking','FG']];
const metricLabel=(c,f)=>c+' '+f.toLowerCase();
const playerIdentity=(team,player,cat)=>[teamKey(team),norm(player.name),norm(player.number),cat].join('|');
function value(values,stat){
 const v=Object.entries(values||{}).filter(([k])=>field(k)===stat).map(([,x])=>numeric(x)).filter(x=>x!==null);
 return new Set(v).size===1?v[0]:null;
}
function maxprepsLookup(data){
 const map=new Map();
 for(const [team,t] of Object.entries(data?.teams||{}))for(const p of t.rows||[]){
  const k=playerIdentity(team,p,category(p.category)),list=map.get(k)||[];
  list.push({values:p.values||{},url:t.sourceUrl||null,updatedAt:t.lastUpdated||null});map.set(k,list);
 }
 return map;
}
function verifiedLookup(data){
 const map=new Map();
 for(const [team,t] of Object.entries(data?.teams||{}))for(const s of t.stats||[])for(const p of s.rows||[])
  for(const [f,v] of Object.entries(p.values||{}))map.set([teamKey(team),p.playerId,category(s.category),field(f)].join('|'),numeric(v));
 return map;
}
function gameLookup(sources,index){
 const map=new Map(),seen=new Set();
 for(const [file,data] of sources)for(const [team,t] of Object.entries(data?.teams||{}))for(const g of t.games||[]){
  const review=index.classify(g,team);if(!review.key)continue;
  for(const p of g.players||[])for(const s of p.statLines||[]){
   const key=playerIdentity(team,p,category(s.category));
   for(const [h,v] of Object.entries(s.values||{})){
    const n=numeric(v);if(n===null)continue;
    const cell=key+'|'+field(h),dedup=[cell,review.key,file,n,g.url||''].join('~');
    if(seen.has(dedup))continue;seen.add(dedup);
    const byGame=map.get(cell)||new Map(),reports=byGame.get(review.key)||[];
    reports.push({gameKey:review.key,phase:review.phase,source:file,value:n,url:g.url||g.maxprepsUrl||null,date:g.date,opponent:g.opponent});
    byGame.set(review.key,reports);map.set(cell,byGame);
   }
  }
 }
 return map;
}
export function auditStatLeaders2026({rosters,maxpreps,mergedGames,maxprepsGames,publication,brackets,review,hashes={}}){
 if(publication?.scope!=='verified-regular-season'||publication.season!==2026||!rosters?.teams||!maxpreps?.teams)throw Error('Missing 2026 source evidence or reviewed publication');
 const mp=maxprepsLookup(maxpreps),verified=verifiedLookup(publication),games=gameLookup([['RUS game cache',mergedGames],['MaxPreps game cache',maxprepsGames]],createCompetitionIndex({brackets,review}));
 const cases=[],summary={schools:Object.keys(rosters.teams).length,athleteCategoryRows:0,reportedMetricCells:0,verifiedMetricCells:0,providerDisagreements:0,regularSumExceedsRetained:0,conflictingRegularCells:0,unknownGamePhaseCells:0,postseasonGameCells:0,ambiguousIdentities:0};
 for(const [team,t] of Object.entries(rosters.teams)){
  for(const s of t.stats||[])for(const p of s.rows||[]){
   summary.athleteCategoryRows++;
   const cat=category(s.category),identity=playerIdentity(team,p,cat),match=mp.get(identity)||[];
   for(const [mc,mf] of metricDefs.filter(([c])=>c===cat)){
    const retained=value(p.values,mf);if(retained===null)continue;summary.reportedMetricCells++;
    const comp=match.length===1?value(match[0].values,mf):null;
    const reviewed=verified.get([teamKey(team),p.playerId,cat,mf].join('|'))??null;
    if(reviewed!==null)summary.verifiedMetricCells++;
    const gp=games.get(identity+'|'+mf)||new Map(),contest=[...gp.entries()].map(([key,reports])=>({key,phase:new Set(reports.map(x=>x.phase)).size===1?reports[0].phase:'conflicting',values:[...new Set(reports.map(x=>x.value))].sort((a,b)=>a-b),reports})).sort((a,b)=>a.key.localeCompare(b.key));
    const regular=contest.filter(x=>x.phase==='regular-season'),confirmed=regular.filter(x=>x.values.length===1),disputed=regular.filter(x=>x.values.length>1);
    const lowerBound=confirmed.length?confirmed.reduce((n,x)=>n+x.values[0],0):null;
    const postseason=contest.filter(x=>x.phase==='postseason'),unknown=contest.filter(x=>!['regular-season','postseason'].includes(x.phase));
    const flags=[];
    if(match.length>1){flags.push('ambiguous-provider-identity');summary.ambiguousIdentities++}
    if(comp!==null&&retained!==comp){flags.push('provider-disagreement');summary.providerDisagreements++}
    if(lowerBound!==null&&lowerBound>retained){flags.push('regular-game-lower-bound-exceeds-retained');summary.regularSumExceedsRetained++}
    if(disputed.length){flags.push('conflicting-regular-game-cell');summary.conflictingRegularCells+=disputed.length}
    if(postseason.length){flags.push('postseason-boxes-must-be-separated');summary.postseasonGameCells+=postseason.length}
    if(unknown.length){flags.push('unknown-phase-not-counted');summary.unknownGamePhaseCells+=unknown.length}
    if(reviewed===null)flags.push('not-verified');
    cases.push({team,name:p.name,number:p.number,playerId:p.playerId||null,category:mc,field:mf,metric:metricLabel(mc,mf),reported:retained,maxpreps:comp,deltaToMaxpreps:comp===null?null:comp-retained,verifiedRegularSeason:reviewed,knownRegularSum:lowerBound,regularGameKeys:regular.length,postseasonGameKeys:postseason.length,unknownGameKeys:unknown.length,flags,games:contest});
   }
  }
 }
 const coverage=metricDefs.map(([cat,f])=>{
  const sorted=cases.filter(x=>x.category===cat&&x.field===f&&x.reported>0).sort((a,b)=>b.reported-a.reported||a.name.localeCompare(b.name));
  return {metric:metricLabel(cat,f),players:sorted.length,schools:new Set(sorted.map(x=>teamKey(x.team))).size,top25:sorted.slice(0,25).map(({games,...p},i)=>({...p,provisionalPosition:i+1}))};
 });
 const hunt=cases.find(x=>x.playerId==='mountain-ridge-11-jaxon-hunt'&&x.category==='Passing'&&x.field==='YARDS')||
 cases.find(x=>norm(x.name)==='JAXONHUNT'&&teamKey(x.team)===teamKey('MOUNTAIN RIDGE')&&x.category==='Passing'&&x.field==='YARDS')||null;
 const disagreements=cases.filter(x=>x.maxpreps!==null&&x.deltaToMaxpreps!==0).sort((a,b)=>Math.abs(b.deltaToMaxpreps)-Math.abs(a.deltaToMaxpreps));
 const reviewCases=cases.filter(x=>x.flags.some(f=>f!=='not-verified'));
 const out={season:2026,status:'read-only; publication of corrected values NOT approved',hashes,summary:{...summary,reviewCases:reviewCases.length,coverage:coverage.map(({metric,players,schools})=>({metric,players,schools}))},coverage,largestProviderDifferences:disagreements.slice(0,100).map(({games,...x})=>x),hunt,reviewCases:reviewCases.map(({games,...x})=>x),holds:[
  'A reported season total may include postseason; do not certify it as regular-season-only.',
  'Positively classified regular-season game values give a lower bound, not a complete season, until all expected games are checked.',
  'Provider differences do not automatically establish which cache is correct.',
  'Preserve existing PR 181 verified fields, source data, locked awards, standings and RPI.'
 ]};
 return out;
}
function markdown(x){
 const h=x.hunt;
 const lines=['# 2026 Stat Leaders source and competition-scope audit','','Read-only evidence: NO corrected totals have been published.','',
  '## Inventory','',JSON.stringify(x.summary,null,2),'',
  '## Jaxon Hunt — Mountain Ridge passing yards','',
  h?'RUS reported: '+h.reported+'; MaxPreps cache: '+h.maxpreps+'; difference: '+h.deltaToMaxpreps+'; positively classified regular-game sum (lower bound): '+h.knownRegularSum+'.':'No stable matching player-season field found.','',
  '| Canonical game | Phase | Cached yards | Sources |','|---|---|---|---|',
  ...(h?.games||[]).map(g=>'| '+g.key+' | '+g.phase+' | '+g.values.join(' / ')+' | '+g.reports.map(r=>r.source).join(', ')+' |'),
  '','## Category coverage','','| Metric | Players | Schools |','|---|---:|---:|',
  ...x.summary.coverage.map(c=>'| '+c.metric+' | '+c.players+' | '+c.schools+' |'),
  '','## Largest cached-provider differences (review candidates only)','','| Player | Team | Stat | RUS | MaxPreps | Difference |','|---|---|---|---:|---:|---:|',
  ...x.largestProviderDifferences.slice(0,30).map(p=>'| '+p.name+' | '+p.team+' | '+p.metric+' | '+p.reported+' | '+p.maxpreps+' | '+p.deltaToMaxpreps+' |'),
  '', '## Release holds','',...x.holds.map(v=>'- '+v),'',
  'Full top-25 category tables, individual disputed contests and cached provenance: audit.json.'
 ];
 return lines.join('\n')+'\n';
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const names=['deseret-rosters-stats-2026.json','maxpreps-stats-fallback-2026.json','player-game-stats-2026.json','maxpreps-player-game-stats-2026.json','regular-season-publication-2026.json','official-brackets-2026.json','competition-scope-review-2026.json'];
 const data=names.map(n=>JSON.parse(fs.readFileSync(n,'utf8'))),hashes=Object.fromEntries(names.map(n=>[n,sha256(fs.readFileSync(n))]));
 const dir=process.argv.find(v=>v.startsWith('--output='))?.slice(9)||'/tmp/rus-stat-leaders-audit';
 if(!path.isAbsolute(dir)||path.resolve(dir)===process.cwd())throw Error('Output must be an absolute directory outside the repo');
 const result=auditStatLeaders2026({rosters:data[0],maxpreps:data[1],mergedGames:data[2],maxprepsGames:data[3],publication:data[4],brackets:data[5],review:data[6],hashes});
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(dir,'AUDIT.md'),markdown(result));
 for(const [f,v] of Object.entries(hashes))if(sha256(fs.readFileSync(f))!==v)throw Error('Audit altered input '+f);
 console.log(JSON.stringify({summary:result.summary,hunt:result.hunt?{reported:result.hunt.reported,maxpreps:result.hunt.maxpreps,knownRegularSum:result.hunt.knownRegularSum,games:result.hunt.games.map(g=>({key:g.key,phase:g.phase,values:g.values}))}:null,output:dir}));
}
