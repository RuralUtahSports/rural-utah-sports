/* 2026 4A–6A reviewed regular-season passing overlay.
 * The exact, independently reviewed 10-game evidence manifest is loaded by the
 * leaderboard. Never apply this to reported season-to-date/postseason sources.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewedPassingBatch2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const norm=x=>String(x??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const fields=['YARDS','COMP-ATT','TD','Int'];
 const canonical=v=>norm(v)==='INT'?'INT':norm(v);
 function validateEvidence(e){
  if(e?.id!=='2026-desert-hills-deacon-virgin-passing-regular-10'||e.season!==2026||e.scope!=='verified-regular-season'||e.team!=='DESERT HILLS'||e.playerId!=='desert-hills-3-deacon-virgin'||e.name!=='Deacon Virgin'||String(e.number)!=='3')
   throw Error('Unexpected reviewed passing evidence identity or scope');
  if(!Array.isArray(e.sourceGames)||e.sourceGames.length!==10)throw Error('Incomplete 10-game reviewed passing evidence');
  const used=new Set(),sum={YARDS:0,COMP:0,ATT:0,TD:0,Int:0};
  for(const g of e.sourceGames){
   const id=[g.date,norm(g.opponent),g.gameKey].join('|');
   if(!/^2026-\d{2}-\d{2}$/.test(g.date)||g.date>'2026-10-14'||used.has(id)||!/^https:\/\/www\.maxpreps\.com\//.test(g.sourceUrl)||!/^2026-/.test(g.gameKey))throw Error('Duplicate, outside-scope, or unsupported contest evidence');
   used.add(id);
   const pair=String(g.completions).match(/^(\d+)-(\d+)$/);
   if(!pair||Number(pair[1])>Number(pair[2])||![g.yards,g.passingTD,g.interceptions].every(v=>Number.isInteger(v)&&v>=0))throw Error('Malformed reviewed passing game');
   sum.YARDS+=g.yards;sum.COMP+=Number(pair[1]);sum.ATT+=Number(pair[2]);sum.TD+=g.passingTD;sum.Int+=g.interceptions;
  }
  const expected={YARDS:String(sum.YARDS),'COMP-ATT':sum.COMP+'-'+sum.ATT,TD:String(sum.TD),Int:String(sum.Int)};
  if(JSON.stringify(expected)!==JSON.stringify({YARDS:'1904','COMP-ATT':'144-276',TD:'17',Int:'16'}))throw Error('Ten-game passing sum changed');
  if(fields.some(k=>String(e.totals?.[k])!==expected[k]))throw Error('Published evidence does not match individual game totals');
  return expected;
 }
 function applyVerified(publication,evidence){
  if(publication?.season!==2026||publication?.scope!=='verified-regular-season'||!publication.teams)throw Error('Only reviewed 2026 regular-season publication may be updated');
  const totals=validateEvidence(evidence);
  const schools=Object.entries(publication.teams).filter(([key])=>norm(key)===norm(evidence.team));
  if(schools.length!==1)throw Error('Unique Desert Hills publication team missing');
  const team=schools[0][1],people=(team.roster||[]).filter(p=>p.playerId===evidence.playerId);
  if(people.length!==1||people[0].name!==evidence.name||String(people[0].number)!==String(evidence.number))throw Error('Reviewed quarterback roster identity changed');
  team.stats||=[];
  const secs=team.stats.filter(s=>norm(s.category)==='PASSING');
  if(secs.length>1)throw Error('Ambiguous passing sections');
  const sec=secs[0],all=sec?.rows||[],hits=all.filter(x=>x.playerId===evidence.playerId);
  if(hits.length>1||hits.length===1&&(hits[0].name!==evidence.name||String(hits[0].number)!==String(evidence.number)))throw Error('Conflicting verified quarterback row');
  if(all.some(x=>x.playerId!==evidence.playerId&&norm(x.name)===norm(evidence.name)&&String(x.number)===String(evidence.number)))throw Error('Duplicate verified name/jersey');
  const existing=hits[0];
  // Check every field before mutating anything. A separately verified future
  // replacement must use a reviewed supersession rather than an automatic reset.
  const keys={};
  for(const field of fields){
   const aliases=Object.keys(existing?.values||{}).filter(x=>canonical(x)===canonical(field));
   if(aliases.length>1)throw Error('Ambiguous verified passing field '+field);
   keys[field]=aliases[0]||field;
   if(aliases.length&&String(existing.values[keys[field]])!==totals[field])throw Error('Existing verified passing total differs: '+field);
  }
  const section=sec||{category:'Passing',headers:[],rows:[]};
  if(!sec)team.stats.push(section);
  section.rows||=[];section.headers||=[];
  const row=existing||{playerId:evidence.playerId,number:String(evidence.number),name:evidence.name,rosterMatched:true,values:{}};
  row.values||={};row.statSources||={};
  for(const field of fields){
   const key=keys[field];row.values[key]=totals[field];
   row.statSources[key]='Verified 2026 regular season · MaxPreps 10 unique reported games · reviewed Oct 29';
   if(!section.headers.some(h=>canonical(h)===canonical(key)))section.headers.push(key);
  }
  if(!existing)section.rows.push(row);
  return {playerId:evidence.playerId,games:evidence.sourceGames.length,passingYards:Number(totals.YARDS),completions:totals['COMP-ATT'],passingTD:Number(totals.TD),interceptions:Number(totals.Int),created:!existing};
 }
 return {validateEvidence,applyVerified};
});
