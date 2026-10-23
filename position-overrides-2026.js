(()=>{
'use strict';
/* Editorial roster-position corrections are separate from the immutable 2026
 * regular-season statistics snapshot. Never infer a position from stat totals. */
const path='richfield-positions-2026.json?v=20261023-maxpreps-roster1';
let cache=null,promise=null;
async function load(){
 if(cache)return cache;
 if(!promise)promise=fetch(path,{cache:'no-store'}).then(r=>{
  if(!r.ok)throw new Error('Richfield position corrections not available');
  return r.json();
 }).then(d=>{
  if(d?.team!=='RICHFIELD'||d?.season!==2026||!Array.isArray(d.players))throw new Error('Invalid Richfield position corrections');
  cache=d;return d;
 }).catch(e=>{promise=null;throw e});
 return promise;
}
function applyTo(source,catalog){
 if(!source||!catalog)return{updated:0,unverified:0};
 const team=source.data?.teams?.RICHFIELD||source.teams?.RICHFIELD;
 const roster=team?.roster||[];
 const byId=new Map(catalog.players.map(p=>[p.playerId,p]));
 let updated=0,unverified=0;
 for(const player of roster){
  const correction=byId.get(player.playerId);
  if(!correction)continue;
  player.positionMatchStatus=correction.matchStatus;
  player.positionSource=catalog.sourceUrl;
  player.positionReview=/mismatch/.test(correction.matchStatus||'');
  if(correction.position){
   // Keep a genuine existing position rather than overwriting it with a correction.
   const before=String(player.position||'').trim();
   if(!before||before==='-'){player.position=correction.position;updated++}
  }else{
   player.positionUnverified=true;unverified++;
  }
 }
 return{updated,unverified};
}
async function apply(...sources){
 const catalog=await load();
 return sources.map(source=>applyTo(source,catalog));
}
window.RUSPositionOverrides2026={load,apply,applyTo};
})();