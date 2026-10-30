/* Guarded multi-field 2026 4A-6A verified regular-season correction batch.
 * Only source-reviewed game sums may enter protected verified leaderboards.
 * Never rewrite reported/postseason values, cached source data, awards or RPI.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewed4A6AOffense2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const reviewedId='2026-4a6a-bulk-corrections-1';
 function validate(manifest){
  if(manifest?.id!==reviewedId||manifest.season!==2026||manifest.scope!=='verified-regular-season'||!Array.isArray(manifest.decisions)||manifest.decisions.length!==1)
   throw Error('Unexpected reviewed correction batch');
  const d=manifest.decisions[0];
  if(d.id!=='deacon-virgin-rushing-yards-carries'||d.team!=='DESERT HILLS'||d.classification!=='4A'||d.playerId!=='desert-hills-3-deacon-virgin'||d.name!=='Deacon Virgin'||String(d.number)!=='3'||d.category!=='Rushing')
   throw Error('Unexpected player identity or category in reviewed correction');
  if(d.maxprepsReportedAt!=='2026-10-18T13:12:24'||!/^https:\/\/www\.maxpreps\.com\//.test(d.maxprepsTeamSourceUrl||''))
   throw Error('Source reporting date or provenance changed');
  if(!Array.isArray(d.games)||d.games.length!==10)throw Error('Reviewed 10-game rushing coverage incomplete');
  const keys=new Set(),totals={YARDS:0,CARRIES:0};
  for(const game of d.games){
   const k=game.gameKey;
   if(!/^2026-(08|09|10)-\d\d$/.test(game.date)||game.date>'2026-10-14'||!game.opponent||!/^2026-/.test(k)||keys.has(k)||!/^https:\/\/www\.maxpreps\.com\//.test(game.gameSourceUrl))
    throw Error('Missing, duplicate or unsupported regular game');
   keys.add(k);
   if(!Number.isInteger(game.yards)||!Number.isInteger(game.carries)||game.carries<0)
    throw Error('Missing numeric source game fields');
   if(!Number.isInteger(game.verifiedFinalScore?.team)||!Number.isInteger(game.verifiedFinalScore?.opponent))
    throw Error('Game score source missing');
   totals.YARDS+=game.yards;totals.CARRIES+=game.carries;
  }
  if(totals.YARDS!==-9||totals.CARRIES!==30||
     String(d.fields?.YARDS)!=='-9'||String(d.fields?.CARRIES)!=='30'||
     String(d.originalRetained?.YARDS)!=='11'||String(d.originalRetained?.CARRIES)!=='22')
   throw Error('New result or original retained value needs renewed review');
  return d;
 }
 function applyVerified(publication,manifest){
  if(publication?.season!==2026||publication.scope!=='verified-regular-season'||!publication.teams)
   throw Error('Reviewed correction may modify only verified regular-season publication');
  const decision=validate(manifest);
  const schools=Object.entries(publication.teams).filter(([name])=>norm(name)===norm(decision.team));
  if(schools.length!==1)throw Error('Ambiguous/missing team in reviewed publication');
  const team=schools[0][1],roster=(team.roster||[]).filter(p=>p.playerId===decision.playerId);
  if(roster.length!==1||roster[0].name!==decision.name||String(roster[0].number)!=='3')
   throw Error('Verified athlete roster identity changed');
  const sections=(team.stats||[]).filter(s=>norm(s.category)==='RUSHING');
  if(sections.length>1)throw Error('Ambiguous rushing section');
  const section=sections[0],all=section?.rows||[],matches=all.filter(p=>p.playerId===decision.playerId);
  if(matches.length>1||matches.length===1&&(matches[0].name!==decision.name||String(matches[0].number)!=='3')||
    all.some(p=>p.playerId!==decision.playerId&&norm(p.name)===norm(decision.name)&&String(p.number)==='3'))
   throw Error('Duplicate/changed reviewed player');
  const existing=matches[0],mapping={};
  for(const field of ['YARDS','CARRIES']){
   const keys=Object.keys(existing?.values||{}).filter(k=>norm(k)===field);
   if(keys.length>1)throw Error('Duplicate reported field '+field);
   mapping[field]=keys[0]||field;
   if(keys.length&&String(existing.values[mapping[field]])!==decision.fields[field])
    throw Error('Prior verified value requires a supersession for '+field);
  }
  // Make zero mutations until all evidence and conflicts are checked.
  const target=section||{category:'Rushing',headers:[],rows:[]};
  if(!section){team.stats||=[];team.stats.push(target);}
  target.rows||=[];target.headers||=[];
  const person=existing||{playerId:decision.playerId,name:decision.name,number:'3',rosterMatched:true,values:{}};
  person.values||={};person.statSources||={};
  for(const field of ['YARDS','CARRIES']){
   const key=mapping[field];person.values[key]=decision.fields[field];
   person.statSources[key]='Verified 2026 regular season; 10 distinct MaxPreps game boxes; 2026-10-18 source';
   if(!target.headers.some(h=>norm(h)===field))target.headers.push(key);
  }
  if(!existing)target.rows.push(person);
  return {corrected:2,playerId:decision.playerId,rushingYards:-9,carries:30,games:10,created:!existing};
 }
 return {validate,applyVerified};
});
