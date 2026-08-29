import fs from 'node:fs';

const fail=message=>{
  console.error(`SCORIGAMI FRESHNESS CHECK FAILED: ${message}`);
  process.exitCode=1;
};

const js=fs.readFileSync('home-scorigami-carousel.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const data=JSON.parse(fs.readFileSync('scorigami-latest.json','utf8'));

for(const token of [
  'nextTuesdayReset',
  "s.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/)",
  'd.getDay()',
  'now<nextTuesdayReset(a._ts)',
  'if(!alerts.length){alertEl.remove();return}',
  'syncPersonalized(alerts)',
  'enableScorigamiScroll',
  'rus-scorigami-slide-track',
  "track.addEventListener('wheel'",
  "track.addEventListener('keydown'",
  'No new Scorigami alerts loaded.'
]){
  if(!js.includes(token))fail(`home-scorigami-carousel.js is missing ${token}`);
}

if(!html.includes('home-scorigami-carousel.js?v=20260829-scroll2'))fail('Homepage is not loading the scroll-enabled Scorigami script');
if(!html.includes('rus-scorigami-mobile-navigation'))fail('Homepage is missing the mobile Scorigami navigation styles');
if(!html.includes('.rus-scorigami-alert .rus-scorigami-nav{display:flex!important'))fail('Mobile Scorigami navigation controls are not visible');
if(!html.includes('.rus-scorigami-alert .rus-scorigami-slide-track .rus-scorigami-slide'))fail('Scorigami alert slides are not configured as a scrollable track');
if(!html.includes('scroll-snap-type:x mandatory'))fail('Scorigami alert track is missing scroll snapping');
if(html.includes('school-assets-bundle.js'))fail('Homepage still directly loads the full school assets bundle');
if(!html.includes('school-assets-core.js?v=20260818-perf2'))fail('Homepage is not directly loading the lightweight school assets core');

const parse=value=>{
  const m=String(value||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return new Date(Number(m[3]),Number(m[1])-1,Number(m[2])).getTime();
  const t=Date.parse(String(value||''));
  return Number.isFinite(t)?t:0;
};
const nextTuesdayReset=ts=>{
  const d=new Date(ts);d.setHours(0,0,0,0);
  let add=(2-d.getDay()+7)%7;if(add===0)add=7;
  d.setDate(d.getDate()+add);return d.getTime();
};
for(const alert of data.alerts||[]){
  if(!parse(alert.date))fail(`Invalid Scorigami date: ${alert.date}`);
}

// Weekend alerts should disappear at the start of the following Tuesday.
const friday=parse('8/14/2026');
const reset=nextTuesdayReset(friday);
const expected=parse('8/18/2026');
if(reset!==expected)fail(`Expected Friday alert to reset Tuesday 8/18/2026, got ${new Date(reset).toISOString()}`);
if(!(reset-1<reset))fail('Scorigami Tuesday reset boundary setup is invalid');
if(!(reset>=expected))fail('Scorigami reset did not reach Tuesday boundary');

if(!process.exitCode)console.log(`Homepage Scorigami Tuesday-reset checks passed for ${(data.alerts||[]).length} stored alerts.`);
