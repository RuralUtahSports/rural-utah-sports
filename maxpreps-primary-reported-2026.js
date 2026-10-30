/* 2026 football reported-view source preference statewide.
 * MaxPreps cached reports FIRST; Deseret retains fields missing or ambiguous
 * at MaxPreps. This is NOT certified regular-season publication.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSMaxPrepsPrimary2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 const text=v=>String(v??'').trim();
 const number=v=>{const s=text(v).replace(/,/g,'');return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)?Number(s):null};
 const cat=v=>{
  const s=norm(v);
  return s.startsWith('PASS')?'PASSING':s.startsWith('RUSH')?'RUSHING':s.startsWith('RECEIV')?'RECEIVING':
   ['KICKING','PATSANDFIELDGOALS'].includes(s)?'KICKING':
   ['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS','TOUCHDOWNS'].includes(s)?'DEFENSESPECIALTEAMS':null;
 };
 const field=v=>{
  const f=norm(v);
  return ({PASSYARDS:'YARDS',RUSHYARDS:'YARDS',RECYARDS:'YARDS',RECEIVINGYARDS:'YARDS',
   TDS:'TD',INTS:'INT',INTERCEPTIONS:'INT',COMPATTEMPTS:'COMPATT',PASSINTS:'PASSINT',
   YARDSRECEPTION:'YARDSRECEP',YARDSRECEP:'YARDSRECEP',YARDSCOMP:'YARDSCOMP'})[f]||f;
 };
 const names=v=>{
  const words=text(v).replace(/\([^)]*\)/g,' ').replace(/[’]/g,"'").split(/\s+/).filter(Boolean);
  while(words.length>1&&['JR','SR','II','III','IV'].includes(norm(words.at(-1))))words.pop();
  return {first:norm(words[0]||''),last:norm(words.at(-1)||''),full:norm(words.join(' '))};
 };
 const isMaxpreps=url=>/^https:\/\/(?:www\.)?maxpreps\.com\//i.test(text(url));
 // Utah regular-season schedules were complete by October 17. An earlier or
 // undated MaxPreps snapshot cannot replace the newer Deseret season totals.
 // This does not certify regular-only scope or game-by-game accuracy.
 const lastRegularFinalUtc=Date.parse('2026-10-18T00:00:00Z');
 const completeSource=provider=>{const stamp=Date.parse(text(provider?.lastUpdated));return Number.isFinite(stamp)&&stamp>=lastRegularFinalUtc;};
 const numberValue=(canonical,raw)=>{
  if(canonical==='COMPATT'){
   const match=text(raw).match(/^(\d+)\s*-\s*(\d+)$/);
   return match&&Number(match[1])<=Number(match[2])?match[1]+'-'+match[2]:null;
  }
  const n=number(raw);
  if(n===null||!Number.isFinite(n))return null;
  return String(n);
 };
 function rosterMatch(roster,incoming){
  const jersey=text(incoming?.number),name=names(incoming?.name);
  if(!jersey||!name.last||!name.first)return null;
  const matches=(roster||[]).filter(p=>{
   const r=names(p.name);
   return p.playerId&&text(p.number)===jersey&&r.last===name.last&&r.first[0]===name.first[0]&&
    (name.first.length===1||r.first===name.first);
  });
  return matches.length===1?matches[0]:null;
 }
 function applyPrimary(reported,cache,metadata,options={}){
  if(reported?.season!==2026||cache?.season!==2026||!reported.teams||!cache.teams||!Array.isArray(metadata))
   throw Error('Expected 2026 reported, MaxPreps and team classification sources');
  const output=structuredClone(reported);
  const classMap=new Map(metadata.map(m=>[norm(m.team),text(m.classification)]));
  const summary={schoolsInScope:0,schoolsWithMaxPreps:0,playerCategoriesMatched:0,
   preferredFields:0,overwrittenFields:0,addedFields:0,sameValueFields:0,deseretFallbackFields:0,
   missingOrAmbiguousPlayer:0,conflictingProviderFields:0,invalidProviderValues:0,staleOrUndatedSchools:0};
  for(const [teamName,school] of Object.entries(output.teams)){
   if(options.targetTeam&&norm(teamName)!==norm(options.targetTeam))continue;
   if(!['6A','5A','4A','3A','2A','1A','8PLAYER','8P'].includes(norm(classMap.get(norm(teamName)))))continue;
   summary.schoolsInScope++;
   const providers=Object.entries(cache.teams).filter(([k])=>norm(k)===norm(teamName));
   if(providers.length!==1||!isMaxpreps(providers[0][1].sourceUrl))continue;
   const provider=providers[0][1];if(!Array.isArray(provider.rows))continue;
   if(!completeSource(provider)){summary.staleOrUndatedSchools++;continue;}
   summary.schoolsWithMaxPreps++;
   const group=new Map();
   for(const p of provider.rows){
    const c=cat(p.category);if(!c)continue;
    const member=rosterMatch(school.roster,p);
    if(!member){summary.missingOrAmbiguousPlayer++;continue}
    const key=member.playerId+'|'+c;
    const entry=group.get(key)||{member,c,fields:new Map()};
    for(const [h,raw] of Object.entries(p.values||{})){
     const f=field(h),v=numberValue(f,raw);
     if(v===null){summary.invalidProviderValues++;continue}
     const cell=entry.fields.get(f)||{values:new Set(),header:h};
     cell.values.add(v);entry.fields.set(f,cell);
    }
    group.set(key,entry);
   }
   for(const entry of group.values()){
    const sections=(school.stats||[]).filter(s=>cat(s.category)===entry.c);
    if(sections.length>1){summary.missingOrAmbiguousPlayer++;continue}
    let section=sections[0];
    if(!section){
     section={category:({PASSING:'Passing',RUSHING:'Rushing',RECEIVING:'Receiving',DEFENSESPECIALTEAMS:'Defense/Special Teams',KICKING:'Kicking'})[entry.c],headers:[],rows:[]};
     (school.stats||=([])).push(section);
    }
    const hits=(section.rows||[]).filter(r=>r.playerId===entry.member.playerId);
    if(hits.length>1||hits.length===1&&(
     norm(hits[0].name)!==norm(entry.member.name)||text(hits[0].number)!==text(entry.member.number)
    )){summary.missingOrAmbiguousPlayer++;continue}
    let row=hits[0],created=false;
    if(!row){
     if((section.rows||[]).some(r=>norm(r.name)===norm(entry.member.name)&&text(r.number)===text(entry.member.number))){
      summary.missingOrAmbiguousPlayer++;continue;
     }
     row={playerId:entry.member.playerId,number:entry.member.number,name:entry.member.name,values:{},statSources:{}};
     created=true;
    }
    summary.playerCategoriesMatched++;
    let added=0;
    for(const [f,cell] of entry.fields){
     if(cell.values.size!==1){summary.conflictingProviderFields++;continue}
     const sourceValue=[...cell.values][0];
     const existingKeys=Object.keys(row.values||{}).filter(k=>field(k)===f);
     if(existingKeys.length>1){
      // A duplicated local alias can silently display the stale number;
      // do not rewrite unless the row can be made unambiguous.
      summary.conflictingProviderFields++;continue;
     }
     const k=existingKeys[0]||cell.header,prior=row.values?.[k];
     const oldText=text(prior);
     if(oldText&&numberValue(f,oldText)===sourceValue){
      summary.sameValueFields++;
      (row.statSources||={})[k]='MaxPreps (preferred reported; phase unverified)';
      continue;
     }
     if(oldText)summary.overwrittenFields++;
     else summary.addedFields++;
     (row.values||={})[k]=sourceValue;
     (row.statSources||={})[k]='MaxPreps (preferred reported; phase unverified)';
     if(!(section.headers||[]).some(h=>field(h)===f))(section.headers||=[]).push(k);
     summary.preferredFields++;
     added++;
    }
    if(created&&added){section.rows.push(row)}
    else if(created&&!added){summary.missingOrAmbiguousPlayer++}
    // Every retained Deseret field not covered by MaxPreps remains unchanged.
    summary.deseretFallbackFields+=Object.keys(row.values||{}).filter(k=>!(row.statSources||{})[k]?.startsWith('MaxPreps')).length;
   }
  }
  return {data:output,summary};
 }
 return {applyPrimary};
});
