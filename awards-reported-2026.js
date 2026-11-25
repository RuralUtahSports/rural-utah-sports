/* Shared postseason awards inputs. Reported season totals are not certified
 * regular-season-only fields. Never pass them to locked All-Region scoring. */
(function(root){
 'use strict';
 async function json(path,required=false){
  try{const r=await fetch(path+'?v='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw Error(path+' HTTP '+r.status);
   return await r.json();
  }catch(e){if(required)throw e;console.warn('Awards source unavailable:',path,e);return null;}
 }
 function applyDefenseReview(data,review){
  if(data?.season!==2026||review?.season!==2026||!Array.isArray(review.rows))return 0;
  const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const equivalents={
   TACKLES:['TACKLES','TOT TCKLS','TOT TCKS','TOTAL TACKLES','TOTAL TCKLS','TKL','TCKLS','TOT'],
   'TCK/G':['TCK/G','TCKL/G','T/G','TKL/G','TACKLES PER GAME'],
   SOLO:['SOLO','SOLO TACKLES','SOLO TCKLS','SOLO TCKS'],
   ASST:['ASST','AST','ASSISTED TACKLES','ASSISTED TCKLS','ASSISTED'],
   TFL:['TFL','TACKLES FOR LOSS'],SACKS:['SACKS','SACK','SAK','TOT SACKS'],
   GP:['GP','GAMES','GAMES PLAYED'],
   'PASS INT.':['PASS INT.','PASS INT','PASS INTS','INT','INTS','INTERCEPTIONS'],
   'CAUSED FUM':['CAUSED FUM','CAUSED FUMBLES','FORCED FUMBLES','FORCED FUM','FF','CAUS'],
   'FUM REC':['FUM REC','FUMBLE RECOVERIES','FMB REC','FR','FUMBLES RECOVERED'],
   'QB HURRIES':['QB HURRIES','QB HUR','HURRIES','HURS','HUR'],
   PD:['PD','PASSES DEFENDED','PASS DEFLECTIONS','PBU'],
   'SACK YDS':['SACK YDS','SACK YARDS','YDL']
  };
  let count=0;
  for(const record of review.rows){
   if(norm(record.team)==='WHITEHORSE')continue;
   const teams=Object.entries(data.teams||{}).filter(([k])=>norm(k)===norm(record.team));if(teams.length!==1)continue;
   const team=teams[0][1],members=(team.roster||[]).filter(p=>p.playerId===record.playerId&&norm(p.name)===norm(record.name)&&String(p.number)===record.number);
   if(members.length!==1)continue;
   const sections=(team.stats||[]).filter(s=>/^Defense/i.test(s.category));if(sections.length!==1)continue;
   const section=sections[0],hits=(section.rows||[]).filter(r=>r.playerId===record.playerId&&norm(r.name)===norm(record.name)&&String(r.number)===record.number);
   if(hits.length!==1)continue;
   const row=hits[0];row.values||={};row.statSources||={};row.statEvidence||={};
   for(const [field,evidence] of Object.entries(record.fields||{})){
    if(!equivalents[field]||!/^https:\/\/(?:www\.)?maxpreps\.com\//i.test(evidence.sourceUrl||'')||!/^\d+(?:\.\d+)?$/.test(evidence.value))continue;
    const aliases=new Set(equivalents[field].map(norm));
    // Use canonical headers so the scoring core and display read the same cell.
    for(const key of Object.keys(row.values))if(aliases.has(norm(key))&&key!==field){delete row.values[key];delete row.statSources[key];delete row.statEvidence[key];}
    row.values[field]=evidence.value;row.statSources[field]='MaxPreps (reviewed reported season)';
    row.statEvidence[field]={scope:'reported-season',source:evidence.sourceUrl,reviewedAt:review.reviewedAt};
    section.headers||=[];if(!section.headers.includes(field))section.headers.push(field);count++;
   }
  }
  return count;
 }
 async function loadReported(){
  const [source,metadata,cache,standings,rankings,defenseReview]=await Promise.all([
   json('deseret-rosters-stats-2026.json',true),
   json('teams-data.json',true),
   json('maxpreps-stats-fallback-2026.json'),
   json('standings-2026.json'),
   json('state-top25-history-2026.json'),
   json('audits/2026-postseason-defense-review.json')
  ]);
  if(source?.season!==2026||!source.teams||!Array.isArray(metadata))throw Error('Invalid 2026 award inputs');
  let data=source,primary=false;
  if(cache){
   try{
    const preferred=root.RUSMaxPrepsPrimary2026.applyPrimary(source,cache,metadata);
    data=preferred.data;primary=preferred.summary.schoolsWithMaxPreps>0;
   }catch(e){console.warn('MaxPreps-first award source unavailable',e);}
  }
  // 2026 player stats are withheld pending source review; preserve raw inputs and locked awards.
  data={...data,teams:Object.fromEntries(Object.entries(data.teams).filter(([team])=>String(team).toUpperCase().replace(/[^A-Z0-9]/g,'')!=='WHITEHORSE'))};
  root.RUSHuntPostseason2026?.apply(data);
  const reviewedDefenseFields=applyDefenseReview(data,defenseReview);
  const teamsWithStats=Object.values(data.teams).filter(t=>(t.stats||[]).some(s=>(s.rows||[]).length)).length;
  if(!teamsWithStats)throw Error('No reported player statistics in 2026 award source');
  const contextAvailable=Boolean(standings&&root.RUSAwardScoring?.buildTeamContexts);
  return {data,metadata,standings,rankings,teamsWithStats,primary,contextAvailable,reviewedDefenseFields,
   contexts:contextAvailable?root.RUSAwardScoring.buildTeamContexts(standings,rankings):new Map()};
 }
 async function loadLocked(){
  const publication=await json('regular-season-publication-2026.json',true);
  root.RUSRegularSeasonPolicy2026.requirePublication(publication);
  const r=await fetch('region-awards-2026.lock.json?v=20261023-lock-1',{cache:'no-store'});
  if(!r.ok)throw Error('Locked All-Region snapshot unavailable');
  const snapshot=await root.RUSRegularSeasonPolicy2026.verifyLockedSnapshot(await r.text(),publication);
  if(snapshot?.status!=='LOCKED'||!snapshot.data?.teams||!Array.isArray(snapshot.teamMeta))throw Error('Invalid locked All-Region snapshot');
  return {publication,snapshot,contexts:root.RUSLockedRegionScoring?.buildTeamContexts?.(snapshot.standings,snapshot.stateTop25)||new Map()};
 }
 function sourceLabel(result){
  return '2026 reported season totals • '+(result.primary?'MaxPreps preferred; Deseret fallback':'Deseret reporting; MaxPreps cache unavailable or unmatched')+' • '+result.teamsWithStats+' schools with reported stats'+(result.contextAvailable?'':' • schedule context unavailable')+(result.reviewedDefenseFields?' • '+result.reviewedDefenseFields+' reviewed defensive fields':'');
 }
 const api={loadReported,loadLocked,sourceLabel,applyDefenseReview};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.RUSAwardsReported2026=api;
})(typeof globalThis!=='undefined'?globalThis:this);
