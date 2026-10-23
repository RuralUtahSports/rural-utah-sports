/* 2026 RUS awards: role-specific production scoring.
 * Scores are projections from frozen regular-season statistics, not final honors.
 * The general-purpose locked scoring engine intentionally remains unchanged.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.RUSAwardRoleScoring2026=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const offenseRoles=new Set(['QB','RB','WR','TE','FLEX']);
 const defenseRoles=new Set(['DL','DE','LB','MLB','DB','CB','S']);
 const canon=v=>String(v||'').toUpperCase().trim().replace(/^WR[123]$/,'WR');
 const category=v=>String(v||'').toUpperCase().trim();
 function allowed(role,section){
  const r=canon(role),c=category(section);
  if(r==='QB')return /^PASS|^RUSH/.test(c);
  if(r==='RB'||r==='FLEX')return /^RUSH|^RECEIV/.test(c);
  if(r==='WR'||r==='TE')return /^RECEIV/.test(c);
  if(defenseRoles.has(r))return /DEFENSE/.test(c);
  return false;
 }
 function forRole(scoring,role,lines){
  if(!scoring?.positionScore)return 0;
  const r=canon(role);
  if(r==='FLEX')return Math.max(...['RB','WR','TE'].map(p=>forRole(scoring,p,lines)));
  if(!offenseRoles.has(r)&&!defenseRoles.has(r))return 0;
  const engineRole=defenseRoles.has(r)?(['DL','DE'].includes(r)?'DL':['LB','MLB'].includes(r)?'LB':'DB'):r;
  const scoped=(lines||[]).filter(line=>allowed(r,line.category??line.cat??''));
  return scoring.positionScore(engineRole,scoped);
 }
 return Object.freeze({VERSION:'2026-role-specific-v1',allowed,forRole});
});
