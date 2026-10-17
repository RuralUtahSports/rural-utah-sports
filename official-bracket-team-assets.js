(() => {
'use strict';
if (window.RUSOfficialBracketTeamAssets) return;
const keys = {
 'ST JOSEPH':'SAINT JOSEPH',
 'ST JOSEPH CATHOLIC':'SAINT JOSEPH',
 'CEDAR':'CEDAR CITY',
 'MONUMENT VALLEY':'MONUMENT VAL',
 'UTAH MILITARY ACADEMY CAMP WILLIAMS':'UMA-LEHI',
 'UTAH MILITARY ACADEMY HILL FIELD':'UMA-HILLFIELD',
 'UMA CAMP WILLIAMS':'UMA-LEHI',
 'UMA HILL FIELD':'UMA-HILLFIELD',
 'GUNNISON':'GUNNISON VALLEY',
 'JUDGE MEMORIAL CATHOLIC':'JUDGE MEMORIAL',
 'AMERICAN LEADERSHIP ACADEMY':'ALA'
};
const norm = value => String(value || '').toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const key = value => keys[norm(value)] || norm(value);
const safeHex = value => /^#[\da-f]{6}$/i.test(value || '') ? value : '';
let logos = {}, colors = {};
const VERSION='20261017-bracket-branding2';
const loadJson=async path => {
 const response=await fetch(path+'?v='+VERSION,{cache:'no-store'});
 if(!response.ok)throw new Error(path+' HTTP '+response.status);
 return response.json();
};
// Fetch each source independently: a color-feed error must never hide valid school logos.
const ready=Promise.allSettled([
 loadJson('school-logo-cache.json').then(rows => {logos=rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}}),
 loadJson('team-colors-exact.json').then(rows => {
   colors=Object.fromEntries((Array.isArray(rows)?rows:[]).map(t => [t.team,t]));
 })
]).then(results => {
 results.forEach((result,index) => {
  if(result.status==='rejected')console.warn('Official bracket '+(index?'colors':'logos')+' unavailable:',result.reason);
 });
 window.dispatchEvent(new Event('rus:official-bracket-assets-ready'));
 return results.some(result=>result.status==='fulfilled');
});
const resolve = name => {
 const k=key(name), row=colors[k] || {}, src=logos[k] || '';
 return {
  key:k,
  logo:/^(school-logos|school-logo-cache)\/[\w./-]+(?:\?[\w=&.-]+)?$/.test(src) ? src : '',
  backgroundColor:safeHex(row.backgroundColor) || '#303030',
  textColor:safeHex(row.textColor) || '#FFFFFF',
  known:!!row.team
 };
};
window.RUSOfficialBracketTeamAssets={resolve,ready};
})();