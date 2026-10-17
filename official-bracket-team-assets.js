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
const ready = Promise.all([
 fetch('school-logo-cache.json',{cache:'force-cache'}).then(r => { if (!r.ok) throw Error('logo cache'); return r.json() }),
 fetch('team-colors-exact.json',{cache:'force-cache'}).then(r => { if (!r.ok) throw Error('team colors'); return r.json() })
]).then(([logoRows, colorRows]) => {
 logos = logoRows || {};
 colors = Object.fromEntries((Array.isArray(colorRows) ? colorRows : []).map(t => [t.team, t]));
 window.dispatchEvent(new Event('rus:official-bracket-assets-ready'));
 return true;
}).catch(error => {console.warn('Bracket team assets could not load', error); return false});
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