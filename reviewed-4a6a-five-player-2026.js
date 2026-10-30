/* Only source-reviewed 2026 regular-season corrections.
 * Raw season and game datasets, reported playoff-inclusive totals,
 * locked awards, standings and RPI remain untouched.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSReviewedFivePlayer2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const targets=[
  {team:'WEST JORDAN',id:'west-jordan-3-kenyon-shockey',name:'Kenyon Shockey',number:'3',category:'Passing',fields:{YARDS:'1110','COMP-ATT':'105-201',Int:'12'},baseline:{YARDS:'1257','COMP-ATT':'118-221',Int:'10'}},
  {team:'LAYTON',id:'layton-5-tillman-thomas',name:'Tillman Thomas',number:'5',category:'Passing',fields:{YARDS:'2175','COMP-ATT':'180-311',Int:'15'},baseline:{YARDS:'1896','COMP-ATT':'153-268',Int:'13'}},
  {team:'MOUNTAIN RIDGE',id:'mountain-ridge-7-xander-thayer',name:'Xander Thayer',number:'7',category:'Receiving',fields:{YARDS:'892'},baseline:{YARDS:'751'}}
 ];
 function validate(book){
  if(book?.id!=='2026-4a6a-five-player-review-batch-1'||book.season!==2026||book.scope!=='verified-regular-season'||book.status!=='source-reviewed-display-only'||!Array.isArray(book.decisions)||book.decisions.length!==targets.length)
   throw Error('Unexpected reviewed batch season, scope or size');
  const used=new Set();
  for(const t of targets){
   const list=book.decisions.filter(d=>d.playerId===t.id);
   if(list.length!==1)throw Error('Duplicate or missing correction '+t.id);
   const d=list[0];
   if(d.team!==t.team||d.name!==t.name||String(d.number)!==t.number||d.category!==t.category||d.expectedRegGames!==10||!Array.isArray(d.sourceGames)||d.sourceGames.length!==10)
    throw Error('Reviewed player identity or game count changed');
   if(used.has(t.id))throw Error('Duplicate reviewed player');used.add(t.id);
   if(Object.keys(d.verified||{}).sort().join('|')!==Object.keys(t.fields).sort().join('|'))throw Error('Unexpected corrected fields');
   for(const field of Object.keys(t.fields)){
    if(String(d.verified[field])!==t.fields[field]||String(d.baseline?.[field])!==t.baseline[field])throw Error('Baseline/expected verified total changed: '+t.id+' '+field);
    const observations=[],keys=new Set();
    for(const g of d.sourceGames){
     if(!/^2026-(08|09|10)-\d\d$/.test(g.date)||g.date>'2026-10-16'||!g.opponent||!/^https:\/\/www\.maxpreps\.com\//.test(g.sourceUrl)||!g.gameKey||keys.has(g.gameKey))
      throw Error('Duplicate, out of phase or missing sourced game '+t.id);
     keys.add(g.gameKey);
     const v=g.sourceFieldValues?.[field];
     if(field==='COMP-ATT'){
      const m=String(v??'').match(/^(\d+)-(\d+)$/);
      if(!m||Number(m[1])>Number(m[2]))throw Error('Unknown passing pair '+t.id+' '+g.date);
      observations.push([Number(m[1]),Number(m[2])]);
     }else if(v===null||v===undefined||!Number.isInteger(Number(v)))throw Error('Unknown numeric game field '+t.id+' '+g.date);
     else observations.push(Number(v));
    }
    const summed=field==='COMP-ATT'?observations.reduce((a,v)=>[a[0]+v[0],a[1]+v[1]],[0,0]).join('-'):String(observations.reduce((a,v)=>a+v,0));
    if(summed!==t.fields[field])throw Error('Incomplete/changed ten-game sum '+t.id+' '+field);
   }
   if(t.id==='west-jordan-3-kenyon-shockey'){
    const g=d.sourceGames.find(g=>g.date==='2026-08-21'&&g.opponent==='COPPER HILLS');
    if(!g||g.sourceFieldValues.YARDS!==29||g.sourceFieldValues['COMP-ATT']!=='7-15'||g.sourceFieldValues.Int!==2)throw Error('Copper Hills source correction changed');
   }
   if(t.id==='layton-5-tillman-thomas'){
    const n=d.sourceGames.find(g=>g.date==='2026-08-21'&&g.opponent==='NORTHRIDGE'),f=d.sourceGames.find(g=>g.date==='2026-10-14'&&g.opponent==='FARMINGTON');
    if(!n||n.sourceFieldValues.YARDS!==315||n.sourceFieldValues['COMP-ATT']!=='25-36'||!f||f.sourceFieldValues.YARDS!==239||f.sourceFieldValues['COMP-ATT']!=='25-41'||f.sourceFieldValues.Int!==2||!f.newlyRecovered)
     throw Error('Northridge/Farmington evidence changed');
   }
   if(t.id==='mountain-ridge-7-xander-thayer'){
    const g=d.sourceGames.find(g=>g.date==='2026-10-15'&&g.opponent==='WESTLAKE');
    if(!g||g.sourceFieldValues.YARDS!==141||!g.newlyRecovered)throw Error('Westlake 141-yard game absent');
   }
  }
  return targets;
 }
 function applyVerified(publication,book){
  if(publication?.season!==2026||publication.scope!=='verified-regular-season'||!publication.teams)
   throw Error('Only 2026 verified regular-season leaderboard may be updated');
  const allowed=validate(book),plan=[];
  // Validate EVERY player and target before any object write.
  for(const t of allowed){
   const teams=Object.entries(publication.teams).filter(([k])=>norm(k)===norm(t.team));
   if(teams.length!==1)throw Error('Missing/ambiguous publication team '+t.team);
   const team=teams[0][1],athletes=(team.roster||[]).filter(x=>x.playerId===t.id);
   if(athletes.length!==1||athletes[0].name!==t.name||String(athletes[0].number)!==t.number)
    throw Error('Reviewed roster identity mismatch '+t.id);
   const sec=(team.stats||[]).filter(s=>norm(s.category)===norm(t.category));
   if(sec.length>1)throw Error('Ambiguous category '+t.id);
   const rows=sec[0]?.rows||[],hits=rows.filter(x=>x.playerId===t.id);
   if(hits.length>1||hits.length===1&&(hits[0].name!==t.name||String(hits[0].number)!==t.number)||
    rows.some(x=>x.playerId!==t.id&&norm(x.name)===norm(t.name)&&String(x.number)===t.number))
    throw Error('Duplicate player row '+t.id);
   const current=hits[0],keys={};
   for(const [field,value] of Object.entries(t.fields)){
    const aliases=Object.keys(current?.values||{}).filter(k=>norm(k)===norm(field));
    if(aliases.length>1)throw Error('Duplicate target field '+t.id);
    keys[field]=aliases[0]||field;
    if(aliases.length&&String(current.values[keys[field]])!==value)throw Error('Supersession required for '+t.id+' '+field);
   }
   plan.push({team,sec:sec[0],current,keys,t});
  }
  for(const p of plan){
   const sec=p.sec||{category:p.t.category,headers:[],rows:[]};
   if(!p.sec){p.team.stats||=[];p.team.stats.push(sec);}
   sec.rows||=[];sec.headers||=[];
   const row=p.current||{playerId:p.t.id,name:p.t.name,number:p.t.number,rosterMatched:true,values:{}};
   row.values||={};row.statSources||={};
   for(const [field,v] of Object.entries(p.t.fields)){
    const key=p.keys[field];row.values[key]=v;
    row.statSources[key]='2026 verified regular season; 10 reconciled MaxPreps opponent reports; 2026-10-29 review';
    if(!sec.headers.some(h=>norm(h)===norm(field)))sec.headers.push(key);
   }
   if(!p.current)sec.rows.push(row);
  }
  return {players:plan.length,fields:plan.reduce((n,x)=>n+Object.keys(x.t.fields).length,0),ids:plan.map(x=>x.t.id)};
 }
 return {validate,applyVerified};
});
