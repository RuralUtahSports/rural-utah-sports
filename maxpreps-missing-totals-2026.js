/* 2026 reported-view MaxPreps fallback, using ONLY RUS's stored cache.
 * Missing/blank field candidates; never replace a populated Deseret or
 * reviewed season field, never certify regular-season scope or scrape pages.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSMaxPrepsMissingTotals2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clean=v=>String(v??'').trim();
 const compact=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
 const category=v=>{
  const c=compact(v);
  if(c.startsWith('PASS'))return 'PASSING';
  if(c.startsWith('RUSH'))return 'RUSHING';
  if(c.startsWith('RECEIV'))return 'RECEIVING';
  if(c==='KICKING'||c==='PATSANDFIELDGOALS')return 'KICKING';
  if(['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS','TOUCHDOWNS'].includes(c))return 'DEFENSESPECIALTEAMS';
  return null;
 };
 const number=v=>{
  const s=clean(v).replace(/,/g,'');
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)?Number(s):null;
 };
 const nonblank=v=>v!==null&&v!==undefined&&clean(v)!=='';
 const isSource=url=>/^https:\/\/(?:www\.)?maxpreps\.com\//i.test(clean(url));
 const names=v=>{
  const parts=clean(v).replace(/\([^)]*\)/g,' ').replace(/[’]/g,"'").split(/\s+/).filter(Boolean);
  while(parts.length>1&&['JR','SR','II','III','IV'].includes(compact(parts.at(-1))))parts.pop();
  const first=compact(parts[0]||''),last=compact(parts.at(-1)||'');
  return {full:compact(parts.join(' ')),first,last,initial:first[0]||''};
 };
 function findPlayer(roster,incoming){
  const jersey=clean(incoming?.number),id=names(incoming?.name);
  if(!jersey||!id.last||!id.initial)return null;
  const candidates=(roster||[]).filter(p=>clean(p.number)===jersey&&p.playerId&&names(p.name).last===id.last&&names(p.name).initial===id.initial);
  if(candidates.length!==1)return null;
  const record=names(candidates[0].name);
  if(id.first.length>1&&record.first!==id.first)return null;
  return candidates[0];
 }
 function apply(reported,cache){
  if(reported?.season!==2026||cache?.season!==2026||!reported.teams||!cache.teams)
   throw Error('Expected cached 2026 reported and MaxPreps player statistics');
  const output=structuredClone(reported),stats={
   schoolsScanned:0,schoolsWithCache:0,matchedPlayerRows:0,
   filledFields:0,createdRows:0,ambiguousOrUnmatched:0,conflictingSourceFields:0,emptyOrInvalid:0,nonblankPreserved:0
  };
  for(const [teamName,team] of Object.entries(output.teams||{})){
   stats.schoolsScanned++;
   const source=Object.entries(cache.teams||{}).filter(([name])=>compact(name)===compact(teamName));
   if(source.length!==1)continue;
   const t=source[0][1];
   if(!isSource(t?.sourceUrl)||!Array.isArray(t.rows)||!t.rows.length)continue;
   stats.schoolsWithCache++;
   const grouped=new Map();
   for(const incoming of t.rows){
    const cat=category(incoming.category),player=cat?findPlayer(team.roster,incoming):null;
    if(!player){stats.ambiguousOrUnmatched++;continue}
    if(!incoming.values||typeof incoming.values!=='object')continue;
    stats.matchedPlayerRows++;
    const key=player.playerId+'|'+cat;
    const candidate=grouped.get(key)||{player,cat,fields:new Map()};
    for(const [header,value] of Object.entries(incoming.values)){
     if(!nonblank(value))continue;
     const canonical=compact(header),raw=clean(value);
     if(!canonical||canonical==='COMPATT'&&!/^\d+\s*-\s*\d+$/.test(raw)){stats.emptyOrInvalid++;continue}
     if(canonical!=='COMPATT'&&number(raw)===null){stats.emptyOrInvalid++;continue}
     const field=candidate.fields.get(canonical)||{header,values:new Set()};
     field.values.add(raw);candidate.fields.set(canonical,field);
    }
    grouped.set(key,candidate);
   }
   for(const entry of grouped.values()){
    let section=(team.stats||[]).find(s=>category(s.category)===entry.cat);
    if(!section){section={category:({'PASSING':'Passing','RUSHING':'Rushing','RECEIVING':'Receiving','KICKING':'Kicking','DEFENSESPECIALTEAMS':'Defense/Special Teams'})[entry.cat],headers:[],rows:[]};(team.stats||(team.stats=[])).push(section)}
    const existing=(section.rows||[]).filter(r=>r.playerId===entry.player.playerId);
    // A duplicate player ID or a mismatched existing name/jersey is a hold.
    if(existing.length>1||existing.length===1&&(
     clean(existing[0].number)!==clean(entry.player.number)||names(existing[0].name).full!==names(entry.player.name).full
    )){stats.ambiguousOrUnmatched++;continue}
    let row=existing[0];
    if(!row){
     // Prevent a second listing under the same visible name/jersey with an
     // inconsistent ID (especially when old roster imports changed IDs).
     if((section.rows||[]).some(r=>names(r.name).full===names(entry.player.name).full&&clean(r.number)===clean(entry.player.number))){
      stats.ambiguousOrUnmatched++;continue;
     }
     row={playerId:entry.player.playerId,number:entry.player.number,name:entry.player.name,values:{},statSources:{}};
    }
    let filled=0;
    for(const [canonical,cell] of entry.fields){
     if(cell.values.size!==1){stats.conflictingSourceFields++;continue}
     const existingKey=Object.keys(row.values||{}).find(k=>compact(k)===canonical);
     if(existingKey&&nonblank(row.values[existingKey])){stats.nonblankPreserved++;continue}
     const key=existingKey||cell.header,value=[...cell.values][0];
     (row.values||(row.values={}))[key]=value;
     (row.statSources||(row.statSources={}))[key]='MaxPreps (cached, unverified season scope)';
     if(!(section.headers||[]).some(h=>compact(h)===canonical))(section.headers||(section.headers=[])).push(key);
     stats.filledFields++;filled++;
    }
    if(filled&&!existing.length){(section.rows||(section.rows=[])).push(row);stats.createdRows++}
   }
  }
  return {data:output,summary:stats};
 }
 return {applyMissing:apply};
});
