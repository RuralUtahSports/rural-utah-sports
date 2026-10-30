/* Source-reviewed 2026 regular-season rushing: Seth Brown, Desert Hills (#2).
 * Does not alter the postseason-inclusive reported totals, locked awards, or
 * canonical data files. Evidence is a separate ten-contest manifest.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewed4ARushingBrown2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const fields=['YARDS','CARRIES'];
 function validate(e){
  if(e?.id!=='2026-4a-seth-brown-desert-hills-rushing-10'||e.season!==2026||e.scope!=='verified-regular-season'||e.classification!=='4A'||e.team!=='DESERT HILLS'||e.playerId!=='desert-hills-2-seth-brown'||e.name!=='Seth Brown'||String(e.number)!=='2')
   throw Error('Unexpected rushing evidence identity/season/scope');
  if(!Array.isArray(e.sourceGames)||e.sourceGames.length!==10)throw Error('Not exactly ten documented rushing games');
  const seen=new Set(),counts={YARDS:0,CARRIES:0};
  for(const g of e.sourceGames){
   const key=g.gameKey,stamp=g.date+'|'+norm(g.opponent);
   if(!/^2026-(08|09|10)-\d\d$/.test(g.date)||g.date>'2026-10-14'||!g.opponent||!/^2026-/.test(key)||seen.has(key)||!/^https:\/\/www\.maxpreps\.com\//.test(g.sourceUrl))
    throw Error('Duplicate, outside-regular-season, or unsupported source contest');
   seen.add(key);
   if(!Number.isInteger(g.rushingYards)||!Number.isInteger(g.carries)||g.carries<0)throw Error('Incomplete game rushing measurements '+stamp);
   counts.YARDS+=g.rushingYards;counts.CARRIES+=g.carries;
  }
  if(counts.YARDS!==1008||counts.CARRIES!==149||String(e.reviewedFields?.YARDS)!=='1008'||String(e.reviewedFields?.CARRIES)!=='149')
   throw Error('Reviewed ten-game totals changed');
  if(String(e.originalRetainedFields?.YARDS)!=='886'||String(e.originalRetainedFields?.CARRIES)!=='121')
   throw Error('Baseline changed; review new evidence before supersession');
  return {YARDS:'1008',CARRIES:'149'};
 }
 function applyVerified(publication,evidence){
  if(publication?.season!==2026||publication.scope!=='verified-regular-season'||!publication.teams)
   throw Error('May publish only to reviewed 2026 regular season');
  const values=validate(evidence);
  const teams=Object.entries(publication.teams).filter(([team])=>norm(team)===norm(evidence.team));
  if(teams.length!==1)throw Error('Missing or ambiguous Desert Hills team');
  const team=teams[0][1];
  const roster=(team.roster||[]).filter(p=>p.playerId===evidence.playerId);
  if(roster.length!==1||roster[0].name!==evidence.name||String(roster[0].number)!=='2')
   throw Error('Verified roster identity changed');
  const sections=(team.stats||[]).filter(s=>norm(s.category)==='RUSHING');
  if(sections.length>1)throw Error('Multiple verified rushing sections');
  const section=sections[0],rows=section?.rows||[];
  const hits=rows.filter(r=>r.playerId===evidence.playerId);
  if(hits.length>1||hits.length===1&&(hits[0].name!==evidence.name||String(hits[0].number)!=='2')||
     rows.some(r=>r.playerId!==evidence.playerId&&norm(r.name)===norm(evidence.name)&&String(r.number)==='2'))
   throw Error('Duplicate or contradictory rushing athlete');
  const existing=hits[0],keys={};
  for(const f of fields){
   const aliases=Object.keys(existing?.values||{}).filter(k=>norm(k)===norm(f));
   if(aliases.length>1)throw Error('Ambiguous existing rushing value '+f);
   keys[f]=aliases[0]||f;
   if(aliases.length&&String(existing.values[keys[f]])!==values[f])
    throw Error('Existing independently reviewed rushing total changed: '+f);
  }
  // Validate all identity, fields and original-review guardrails before writes.
  const target=section||{category:'Rushing',headers:[],rows:[]};
  if(!section){team.stats||=[];team.stats.push(target)}
  target.rows||=[];target.headers||=[];
  const row=existing||{playerId:evidence.playerId,number:'2',name:evidence.name,values:{}};
  row.values||={};row.statSources||={};
  for(const f of fields){
   row.values[keys[f]]=values[f];
   row.statSources[keys[f]]='Verified regular season; 10 MaxPreps game reports; reviewed Oct 29';
   if(!target.headers.some(k=>norm(k)===norm(f)))target.headers.push(keys[f]);
  }
  if(!existing)target.rows.push(row);
  return {playerId:evidence.playerId,rushingYards:1008,carries:149,games:10,created:!existing};
 }
 return {validate,applyVerified};
});
