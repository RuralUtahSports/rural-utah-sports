/* Shared read boundary for regular-season publication; reported caches stay intact. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RUSRegularSeasonPolicy2026=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const compact=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 function requirePublication(data){
  if(data?.season!==2026||data.scope!=='verified-regular-season'||!data.teams||!data.lockedSnapshotSha256||!data.gamePhases)throw Error('Reviewed regular-season publication unavailable');
  return data;
 }
 function date(v){
  const s=String(v??'');let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(!m){const us=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(us)m=[us[0],us[3],us[1],us[2]];}
  return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:null;
 }
 function phase(game,team,publication){
  const canon=v=>publication.aliases?.[compact(v)]||compact(v),day=date(game.date);
  const a=canon(game.awayTeam||team||game.team),b=canon(game.homeTeam||game.opponent);
  return day&&a&&b?publication.gamePhases[`${day}|${[a,b].sort().join('|')}`]||'unknown':'unknown';
 }
 async function verifyLockedSnapshot(text,publication){
  requirePublication(publication);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==publication.lockedSnapshotSha256)throw Error('Locked award snapshot changed; source review required');
  const snapshot=JSON.parse(text);
  if(snapshot.season!==2026||snapshot.status!=='LOCKED'||compact(snapshot.seasonPhase)!=='REGULARSEASON')throw Error('Invalid locked regular-season award scope');
  return snapshot;
 }
 function regularGames(games,team,publication){
  requirePublication(publication);
  const canon=v=>publication.aliases?.[compact(v)]||compact(v),groups=new Map();
  for(const game of games||[]){
   if(phase(game,team,publication)!=='regular-season')continue;
   const key=date(game.date)+'|'+canon(game.opponent),list=groups.get(key)||[];list.push(game);groups.set(key,list);
  }
  const result=[];
  for(const list of groups.values()){
   if(list.some(g=>JSON.stringify(g.players)!==JSON.stringify(list[0].players)))continue;
   const game=structuredClone(list[0]),players=new Map(),conflicts=new Set();
   for(const p of game.players||[]){
    if(!p.playerId||!p.name)continue;
    if(players.has(p.playerId)&&JSON.stringify(players.get(p.playerId))!==JSON.stringify(p))conflicts.add(p.playerId);
    else players.set(p.playerId,p);
   }
   game.players=[...players].filter(([id])=>!conflicts.has(id)).map(([,p])=>{
    const lines=new Map(),rejected=new Set();
    const expanded=(p.statLines||[]).flatMap(line=>compact(line.category)==='SPECIALTEAMS'?[
      {category:'Kicking',values:Object.fromEntries(Object.entries(line.values||{}).filter(([k])=>['FG','PAT','PTS','POINTS','LONGFG'].includes(compact(k))))},
      {category:'Defense/Special Teams',values:Object.fromEntries(Object.entries(line.values||{}).filter(([k])=>['RETURNTD','RETURNTDS'].includes(compact(k))))}
    ]:[line]);
    for(const line of expanded){
     let category=compact(line.category);
     if(['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS','TOUCHDOWNS'].includes(category))category='Defense/Special Teams';
     if(['KICKING','PATSANDFIELDGOALS'].includes(category))category='Kicking';
     const merged=lines.get(category)||{category:category==='Defense/Special Teams'||category==='Kicking'?category:line.category,values:{}};
     for(const [name,value] of Object.entries(line.values||{})){
      if(value===null||value===undefined||String(value).trim()==='')continue;
      let key=compact(name);
      if(category==='Defense/Special Teams'){
       if(['INTERCEPTIONS','INTS','PASSINTS'].includes(key))key='PASSINT';
       if(['TD','DEFENSIVETD'].includes(key))key='DEFENSETD';
       if(key==='RETURNTDS')key='RETURNTD';
      }
      const cell=category+'|'+key;
      if(Object.hasOwn(merged.values,key)&&String(merged.values[key])!==String(value))rejected.add(cell);
      if(!rejected.has(cell))merged.values[key]=value;else delete merged.values[key];
     }
     lines.set(category,merged);
    }
    return {...p,statLines:[...lines.values()]};
   });
   result.push(game);
  }
  return result;
 }
 return {requirePublication,phase,regularGames,verifyLockedSnapshot};
});
