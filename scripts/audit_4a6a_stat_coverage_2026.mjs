// Read-only 2026 4A-6A offensive stat audit. Never modifies site data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createCompetitionIndex} from './lib/competition-scope-2026.mjs';

const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const num=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;let s=String(x).trim().replace(/,/g,'');return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)?Number(s):null;};
const fields={Passing:['YARDS','COMP-ATT','TD','Int'],Rushing:['YARDS','CARRIES','TD'],Receiving:['YARDS','RECEPTIONS','TD']};
const identity=x=>norm(x.name)+'|'+norm(x.number);
const gameId=x=>String(x.date)+'|'+norm(x.opponent);
const val=(values,field)=>{
 const found=Object.keys(values||{}).filter(k=>norm(k)===norm(field));
 if(found.length!==1)return null;
 const raw=values[found[0]];
 if(field==='COMP-ATT'){const pair=String(raw||'').trim().match(/^(\d+)-(\d+)$/);return pair&&Number(pair[1])<=Number(pair[2])?[Number(pair[1]),Number(pair[2])]:null;}
 return num(raw);
};
const out=(v,f)=>v===null?null:f==='COMP-ATT'?v.join('-'):v;
const total=(v,f)=>f==='COMP-ATT'?v.reduce((s,x)=>[s[0]+x[0],s[1]+x[1]],[0,0]):v.reduce((s,x)=>s+x,0);
const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const hash=x=>createHash('sha256').update(x).digest('hex');

export function audit4a6a({teamList,shards,maxpreps={},index,priorReview={}}){
 if(!Array.isArray(teamList)||typeof index?.classify!=='function')throw Error('Missing teams or competition phase index');
 const cls=['4A','5A','6A'],selected=teamList.filter(x=>cls.includes(x.classification)),names=new Set();
 for(const t of selected){if(names.has(norm(t.team)))throw Error('Duplicate team '+t.team);names.add(norm(t.team));}
 const report={season:2026,scope:'4A-6A regular-season offense',status:'READ ONLY: no stat corrections authorized',
  summary:{teams:selected.length,byClass:Object.fromEntries(cls.map(c=>[c,selected.filter(t=>t.classification===c).length])),teamScheduleGaps:0,unknownPhaseSchools:0,offensiveRows:0,metricFields:0,completeFields:0,completeDisagreements:0,providerCorroborated:0,providerConflicts:0,partialFields:0},
  teams:[],candidates:[],holds:[],policy:[
   'Never infer regular season from date alone; require reviewed contest classification.',
   'Blank or absent game or player field means unknown, not zero.',
   'A full-game discrepancy is a review candidate; a unique MaxPreps season match and current reporting date are additional corroboration, not automatic authorization.',
   'Do not edit scores, roster identities, source caches, RPI, awards or previously verified publication data.'
  ]};
 const snapshot=new Map();
 for(const team of priorReview.teams||[])for(const p of team.unresolved||[]){
  if(p.code==='KNOWN_REGULAR_GAME_SUM_EXCEEDS_RETAINED'||p.code==='CACHED_SOURCE_SEASON_DISAGREEMENT')
   snapshot.set(norm(team.team)+'|'+p.playerId+'|'+norm(p.category)+'|'+norm(p.field),p);
 }
 for(const team of selected){
  const shard=shards[team.team]||shards[norm(team.team)];
  if(!shard||norm(shard.team)!==norm(team.team)){report.teams.push({team:team.team,classification:team.classification,status:'missing-or-ambiguous-source'});continue;}
  const schedule=(shard.current?.schedule||[]).filter(g=>g.rusStatus==='Final'&&String(g.date).startsWith('2026-'));
  const byPhase=schedule.map(g=>({g,phase:index.classify({...g,url:g.gameUrl||g.url,opponent:g.opponent},team.team).phase}));
  const regular=byPhase.filter(x=>x.phase==='regular-season').map(x=>x.g);
  const unknown=byPhase.filter(x=>!['regular-season','postseason'].includes(x.phase));
  if(unknown.length)report.summary.unknownPhaseSchools++;
  const logs=(shard.gameStats?.games||[]).filter(g=>String(g.date).startsWith('2026-')&&index.classify(g,team.team).phase==='regular-season');
  const map=new Map();
  for(const g of logs){const id=gameId(g),list=map.get(id)||[];list.push(g);map.set(id,list);}
  const missing=regular.filter(g=>(map.get(gameId(g))||[]).length!==1);
  const extra=logs.filter(g=>!regular.some(s=>gameId(s)===gameId(g)));
  const duplicated=regular.filter((g,i)=>regular.findIndex(a=>gameId(a)===gameId(g))!==i);
  const full=regular.length>=8&&unknown.length===0&&missing.length===0&&extra.length===0&&duplicated.length===0;
  if(!full)report.summary.teamScheduleGaps++;
  report.teams.push({team:team.team,classification:team.classification,regularGames:regular.length,regularLogs:logs.length,unknownPhase:unknown.map(x=>({date:x.g.date,opponent:x.g.opponent})),missingOrDuplicated:missing.map(g=>({date:g.date,opponent:g.opponent})),unmatchedLogs:extra.map(g=>({date:g.date,opponent:g.opponent})),fullSchedule:full});
  const roster=shard.rosterStats?.roster||[],pteams=Object.entries(maxpreps?.teams||{}).filter(([n])=>norm(n)===norm(team.team));
  const pteam=pteams.length===1?pteams[0][1]:null;
  for(const section of shard.rosterStats?.stats||[]){
   if(!fields[section.category])continue;
   for(const athlete of section.rows||[]){
    report.summary.offensiveRows++;
    const people=roster.filter(p=>p.playerId===athlete.playerId),samePlayer=people.length===1&&identity(people[0])===identity(athlete);
    const prow=(pteam?.rows||[]).filter(p=>norm(p.category)===norm(section.category)&&identity(p)===identity(athlete));
    const distinct=[...new Map(prow.map(p=>[JSON.stringify(p.values||{}),p])).values()];
    const old=distinct.length===1?distinct[0]:null;
    for(const field of fields[section.category]){
     const retained=val(athlete.values,field);if(retained===null)continue;
     report.summary.metricFields++;
     const observed=regular.map(s=>{
      const g=(map.get(gameId(s))||[]);if(g.length!==1)return {date:s.date,opponent:s.opponent,issue:'no-unique-game'};
      const candidates=(g[0].players||[]).filter(p=>p.playerId===athlete.playerId&&identity(p)===identity(athlete));
      if(candidates.length!==1)return {date:s.date,opponent:s.opponent,issue:'missing-or-ambiguous-player'};
      const lines=(candidates[0].statLines||[]).filter(l=>norm(l.category)===norm(section.category));
      if(lines.length!==1)return {date:s.date,opponent:s.opponent,issue:'missing-or-ambiguous-category'};
      const value=val(lines[0].values,field);
      if(value===null)return {date:s.date,opponent:s.opponent,issue:'unreported-field'};
      if(!/^https:\/\/(?:www\.)?maxpreps\.com\//.test(g[0].maxprepsUrl||''))return {date:s.date,opponent:s.opponent,issue:'no-game-source-url'};
      return {date:s.date,opponent:s.opponent,key:g[0].gameKey,sourceUrl:g[0].maxprepsUrl,parsed:value,value:out(value,field)};
     });
     const good=observed.filter(x=>!x.issue),bad=observed.filter(x=>x.issue);
     const complete=full&&samePlayer&&good.length===regular.length&&regular.length>=8;
     const gameSum=good.length?total(good.map(x=>x.parsed),field):null;
     const certifiedSum=complete?gameSum:null;
     const provider=old?val(old.values,field):null;
     const last=regular.map(s=>date(s.date)).filter(x=>x!==null).sort((a,b)=>b-a)[0];
     const pDate=date(pteam?.lastUpdated),recent=pDate!==null&&last!==undefined&&pDate>=last;
     const agreement=provider===null?'missing-provider':!recent?'stale-or-undated-provider':certifiedSum!==null&&eq(provider,certifiedSum)?'agrees':'disagrees';
     const previous=snapshot.get(norm(team.team)+'|'+athlete.playerId+'|'+norm(section.category)+'|'+norm(field));
     const previousDelta=typeof previous?.knownRegularSum==='number'&&typeof previous?.retained==='number'?previous.knownRegularSum-previous.retained:null;
     const obj={classification:team.classification,team:team.team,playerId:athlete.playerId,name:athlete.name,number:athlete.number,category:section.category,field,retained:out(retained,field),maxpreps:out(provider,field),maxprepsLastUpdated:pteam?.lastUpdated||null,providerAgreement:agreement,regularGames:regular.length,reportedFieldGames:good.length,unreportedGames:bad,partialGameSubtotal:out(gameSum,field),completeGameTotal:out(certifiedSum,field),previousDelta};
     if(complete)report.summary.completeFields++;else report.summary.partialFields++;
     if(certifiedSum!==null&&!eq(certifiedSum,retained)){
      report.summary.completeDisagreements++;
      if(agreement==='agrees')report.summary.providerCorroborated++;else report.summary.providerConflicts++;
      report.candidates.push({...obj,delta:field==='COMP-ATT'?null:certifiedSum-retained,release:'review-only-'+agreement,gameEvidence:good.map(({parsed,...g})=>g)});
     }else if(!complete&&(previousDelta>0||good.length>=Math.min(4,regular.length)||!samePlayer)){
      report.holds.push({...obj,release:'held-incomplete-reporting',identityMatched:samePlayer,reason:!samePlayer?'roster-player-conflict':!full?'school-game-coverage-or-phase-incomplete':'player-game-fields-incomplete'});
     }
    }
   }
  }
 }
 report.candidates.sort((a,b)=>Number(b.providerAgreement==='agrees')-Number(a.providerAgreement==='agrees')||Math.abs(b.delta||0)-Math.abs(a.delta||0));
 report.holds.sort((a,b)=>(b.previousDelta||0)-(a.previousDelta||0));
 return report;
}
function markdown(result){
 const s=result.summary;
 const lines=['# 2026 4A-6A offensive player stat reconciliation','','**Read-only: no player stats were changed.**','',
  '## Reconciliation coverage','',JSON.stringify(s,null,2),'',
  '## Complete regular-season game fields with disagreement','','| Class | Team | Player | Field | RUS | Regular game sum | MaxPreps cached | Review |','|---|---|---|---|---:|---:|---:|---|'];
 for(const p of result.candidates.slice(0,50))lines.push('| '+[p.classification,p.team,p.name,p.category+' '+p.field,p.retained,p.completeGameTotal,p.maxpreps,p.providerAgreement].join(' | ')+' |');
 lines.push('','## Largest incomplete/uncertain cases','','| Team | Player | Field | Stored | Reported fields | Expected games |','|---|---|---|---:|---:|---:|');
 for(const p of result.holds.slice(0,40))lines.push('| '+[p.team,p.name,p.category+' '+p.field,p.retained,p.reportedFieldGames,p.regularGames].join(' | ')+' |');
 lines.push('','## Safeguards','',...result.policy.map(x=>'- '+x),'','Full 74-team evidence, source dates, game URLs and held fields are in audit.json.','');
 return lines.join('\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const inputs=['audits/2026-regular-season/current-review-coverage.json','maxpreps-stats-fallback-2026.json','official-brackets-2026.json','competition-scope-review-2026.json'];
 const source=Object.fromEntries(inputs.map(f=>[f,fs.readFileSync(f,'utf8')]));
 const [review,maxpreps,brackets,scope]=inputs.map(f=>JSON.parse(source[f]));
 const teamList=review.teams.filter(t=>['4A','5A','6A'].includes(t.classification));
 if(teamList.length!==74)throw Error('Expected 74 schools, do not audit partial classification.');
 const shards={},checks=Object.fromEntries(inputs.map(f=>[f,hash(source[f])]));
 for(const team of teamList){
  const filename='team-current-data/'+team.team.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json';
  const data=fs.readFileSync(filename,'utf8');checks[filename]=hash(data);shards[team.team]=JSON.parse(data);
 }
 const result=audit4a6a({teamList,shards,maxpreps,index:createCompetitionIndex({brackets,review:scope}),priorReview:review});
 result.sourceHashes=checks;
 const dir=process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'/tmp/rus-4a6a-audit';
 if(!path.isAbsolute(dir)||path.resolve(dir)===process.cwd())throw Error('Audit output must be outside repository');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'AUDIT.md'),markdown(result)+'\n');
 for(const [filename,sha] of Object.entries(checks))if(hash(fs.readFileSync(filename,'utf8'))!==sha)throw Error('Audit modified source '+filename);
 console.log(JSON.stringify({summary:result.summary,candidates:result.candidates.slice(0,20).map(p=>({team:p.team,name:p.name,category:p.category,field:p.field,retained:p.retained,gameSum:p.completeGameTotal,maxpreps:p.maxpreps,agreement:p.providerAgreement})),holds:result.holds.slice(0,20).map(p=>({team:p.team,name:p.name,category:p.category,field:p.field,knownDifference:p.previousDelta,reported:p.reportedFieldGames,total:p.regularGames})),artifact:dir}));
}
