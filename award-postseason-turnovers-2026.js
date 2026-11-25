/* 2026 postseason award scoring only. Leave weekly and locked regional scoring unchanged. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./award-scoring-core.js'):root.RUSAwardScoring);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RUSPostseasonAwardScoring2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
 'use strict';
 if(!base)throw Error('Base award scoring required');
 const aliases={
  lost:['FUMBLES LOST','FUM LOST','FUMBLE LOST','FUM LOST OFFENSE','OFFENSIVE FUMBLES LOST','FL'],
  forced:['CAUSED FUM','CAUSED FUMBLES','FORCED FUMBLES','FORCED FUM','FUMBLES FORCED','FF'],
  recovered:['FUM REC','FUMBLE RECOVERIES','FUMBLES RECOVERED','DEFENSIVE FUMBLE RECOVERIES','FR']
 };
 const category=line=>line.category??line.cat??'';
 // Only explicit, valid count fields. Never infer lost fumbles from total fumbles.
 // Repeated aliases or combined season totals are counted once; contradictory
 // totals are left unscored for that turnover type pending review.
 function count(lines,type){
  const wanted=new Set(aliases[type].map(base.compact)),reported=new Set();
  for(const line of lines)for(const [k,v] of Object.entries(line.values||{})){
   if(!wanted.has(base.compact(k)))continue;
   const s=String(v??'').trim().replace(/,/g,'');
   if(/^\d+$/.test(s)&&Number.isSafeInteger(Number(s)))reported.add(Number(s));
  }
  return reported.size===1?[...reported][0]:0;
 }
 function production(lines,position){
  const offense=lines.filter(l=>base.isOffenseLine(category(l)));
  const defense=lines.filter(l=>base.isDefense(category(l)));
  let total=0;
  for(const l of lines){
   const cat=category(l),v=l.values||{};
   total+=base.categoryScore(cat,v,position);
   if(base.isPassing(cat))total-=Math.min(base.categoryScore(cat,v,position),base.passDetails(v).interceptions*2.5);
  }
  return Math.max(0,total-5*count(offense,'lost')+5*count(defense,'forced')+5*count(defense,'recovered'));
 }
 function categoryScore(cat,values,pos=''){return production([{category:cat,values}],pos);}
 function positionScore(pos,lines){return production((lines||[]).filter(l=>base.positionLineAllowed(pos,category(l))),pos);}
 function sideScore(side,lines,pos=''){
  return production((lines||[]).filter(l=>side==='def'?base.isDefense(category(l)):base.isOffenseLine(category(l))||base.isKicking(category(l))),pos);
 }
 return {...base,VERSION:'2026-11-24-postseason-turnovers-v1',categoryScore,positionScore,sideScore};
});
