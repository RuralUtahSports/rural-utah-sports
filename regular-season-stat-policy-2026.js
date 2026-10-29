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
 // Source IDs bind aliases and resumed dates to reviewed contests, never dates alone.
 function sourceId(value){
  try{const u=new URL(value);if(!['https:'].includes(u.protocol))return null;
   if(/^(www\.)?maxpreps\.com$/.test(u.hostname)){const id=u.searchParams.get('c');return /^[a-f0-9-]{36}$/i.test(id||'')?'maxpreps:'+id.toLowerCase():null;}
   if(u.hostname==='sports.deseret.com'&&u.pathname.includes('/football/game/')){const id=u.pathname.match(/\/(\d+)\/?$/)?.[1];return id?'deseret:'+id:null;}
  }catch{}return null;
 }
 function resolveGameKey(game,team,publication){
  const canon=v=>publication.aliases?.[compact(v)]||compact(v),day=date(game.date);
  const a=canon(game.awayTeam||team||game.team),b=canon(game.homeTeam||game.opponent);
  if(!day||!a||!b||a===b)return null;
  const key=`${day}|${[a,b].sort().join('|')}`,review=publication.identityMatches?.[key];
  if(!review)return key;
  const ids=[game.url,game.maxprepsUrl,game.sourceUrl].map(sourceId).filter(Boolean);
  return ids.some(id=>review.sourceIds.includes(id))?review.canonicalKey:null;
 }
 function phase(game,team,publication){
  const key=resolveGameKey(game,team,publication);
  return key?publication.gamePhases[key]||'unknown':'unknown';
 }
 function uniqueGames(games,team,publication){
  const groups=new Map();
  for(const game of games||[]){const key=resolveGameKey(game,team,publication);if(!key)continue;const rows=groups.get(key)||[];rows.push(game);groups.set(key,rows);}
  const result=[];
  for(const [key,rows] of groups){
   // A repeated date/source view must never add a second result or statistical sum.
   const payload=g=>JSON.stringify([g.teamScore,g.opponentScore,g.players]);
   if(rows.some(g=>payload(g)!==payload(rows[0])))continue;
   result.push({game:rows[0],key});
  }
  return result;
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
 function regularGames(games,team,publication,includePostseason=false){
  requirePublication(publication);
  const result=[];
  for(const {game:original} of uniqueGames(games,team,publication)){
   const competitionPhase=phase(original,team,publication);
   if(competitionPhase!=='regular-season'&&!(includePostseason&&competitionPhase==='postseason'))continue;
   const game=structuredClone(original),players=new Map(),conflicts=new Set();
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
 return {requirePublication,phase,regularGames,verifyLockedSnapshot,sourceId,resolveGameKey,uniqueGames};
});
