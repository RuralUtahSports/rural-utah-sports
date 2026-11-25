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
 async function loadReported(){
  const [source,metadata,cache,standings,rankings]=await Promise.all([
   json('deseret-rosters-stats-2026.json',true),
   json('teams-data.json',true),
   json('maxpreps-stats-fallback-2026.json'),
   json('standings-2026.json'),
   json('state-top25-history-2026.json')
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
  const teamsWithStats=Object.values(data.teams).filter(t=>(t.stats||[]).some(s=>(s.rows||[]).length)).length;
  if(!teamsWithStats)throw Error('No reported player statistics in 2026 award source');
  const contextAvailable=Boolean(standings&&root.RUSAwardScoring?.buildTeamContexts);
  return {data,metadata,standings,rankings,teamsWithStats,primary,contextAvailable,
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
  return '2026 reported season totals • '+(result.primary?'MaxPreps preferred; Deseret fallback':'Deseret reporting; MaxPreps cache unavailable or unmatched')+' • '+result.teamsWithStats+' schools with reported stats'+(result.contextAvailable?'':' • schedule context unavailable');
 }
 const api={loadReported,loadLocked,sourceLabel};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.RUSAwardsReported2026=api;
})(typeof globalThis!=='undefined'?globalThis:this);
