/* Verified 2026 REGULAR-SEASON rushing TDs; not a postseason/cumulative override.
 * MaxPreps coach-entered profile: 10 games, 36 rushing TD, updated Oct 21.
 * A Deseret season-record table currently lists 37, so do not silently promote
 * that disputed value. Other rushing fields remain unchanged.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewedFiefia2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const evidence=Object.freeze({
  season:2026,team:'RIDGELINE',playerId:'ridgeline-30-noah-fiefia',
  name:'Noah Fiefia',number:'30',category:'Rushing',
  games:10,rushingTouchdowns:36,reviewedAsOf:'2026-10-29',
  source:'https://www.maxpreps.com/ut/millville/ridgeline-riverhawks/athletes/noah-fiefia/football/stats/?careerid=54f61un1grng0'
 });
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 function applyVerified(publication){
  if(publication?.season!==2026||publication.scope!=='verified-regular-season'||!publication.teams)
   throw Error('Fiefia correction requires verified 2026 regular-season publication');
  const schools=Object.entries(publication.teams).filter(([name])=>norm(name)===norm(evidence.team));
  if(schools.length!==1)throw Error('Ridgeline publication school unavailable');
  const team=schools[0][1],roster=(team.roster||[]).filter(p=>p.playerId===evidence.playerId);
  if(roster.length!==1||norm(roster[0].name)!==norm(evidence.name)||String(roster[0].number)!==evidence.number)
   throw Error('Fiefia stable roster identity missing or changed');
  team.stats||=[];
  const sections=team.stats.filter(s=>norm(s.category)==='RUSHING');
  if(sections.length>1)throw Error('Duplicate verified rushing sections');
  let section=sections[0];
  if(!section){section={category:'Rushing',headers:[],rows:[]};team.stats.push(section);}
  section.rows||=[];section.headers||=[];
  const hits=section.rows.filter(p=>p.playerId===evidence.playerId);
  if(hits.length>1||hits.length===1&&(norm(hits[0].name)!==norm(evidence.name)||String(hits[0].number)!==evidence.number))
   throw Error('Ambiguous verified Fiefia rushing player');
  if(section.rows.some(p=>p.playerId!==evidence.playerId&&norm(p.name)===norm(evidence.name)&&String(p.number)===evidence.number))
   throw Error('Conflicting verified Fiefia rushing identity');
  const row=hits[0]||{playerId:evidence.playerId,name:evidence.name,number:evidence.number,values:{}};
  const existing=Object.keys(row.values||{}).filter(k=>norm(k)==='TD'||norm(k)==='TDS');
  if(existing.length>1)throw Error('Ambiguous existing rushing touchdown field');
  if(existing.length&&String(row.values[existing[0]])!==String(evidence.rushingTouchdowns))
   throw Error('Previously reviewed rushing TD disagrees; do not overwrite');
  const key=existing[0]||'TD';
  row.values||={};row.values[key]=String(evidence.rushingTouchdowns);
  (row.statSources||={})[key]='Verified regular season: MaxPreps coach-entered stats, Oct 21';
  if(!section.headers.some(k=>norm(k)===norm(key)))section.headers.push(key);
  if(!hits.length)section.rows.push(row);
  return {playerId:evidence.playerId,regularSeasonRushTD:evidence.rushingTouchdowns,games:evidence.games,created:!hits.length};
 }
 return {evidence,applyVerified};
});
