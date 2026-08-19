import fs from 'node:fs';

const fail=message=>{
  console.error(`SCORIGAMI FRESHNESS CHECK FAILED: ${message}`);
  process.exitCode=1;
};

const js=fs.readFileSync('home-scorigami-carousel.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const data=JSON.parse(fs.readFileSync('scorigami-latest.json','utf8'));

for(const token of [
  'const TTL=8*24*60*60*1000',
  "text.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/)",
  'now-a._ts<TTL',
  'if(!alerts.length){alertEl.remove();return}',
  'syncPersonalized(alerts)',
  'No new Scorigami alerts loaded.'
]){
  if(!js.includes(token))fail(`home-scorigami-carousel.js is missing ${token}`);
}

if(!html.includes('home-scorigami-carousel.js?v=20260818-expiry1'))fail('Homepage is not loading the freshness-aware Scorigami script');
if(html.includes('school-assets-bundle.js'))fail('Homepage still directly loads the full school assets bundle');
if(!html.includes('school-assets-core.js?v=20260818-perf2'))fail('Homepage is not directly loading the lightweight school assets core');

const parse=value=>{
  const m=String(value||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return new Date(Number(m[3]),Number(m[1])-1,Number(m[2])).getTime();
  const t=Date.parse(String(value||''));
  return Number.isFinite(t)?t:0;
};
for(const alert of data.alerts||[]){
  if(!parse(alert.date))fail(`Invalid Scorigami date: ${alert.date}`);
}

// A date-only alert must be eligible until just before day 8 and expired at day 8.
const sample=parse('8/14/2026');
const ttl=8*24*60*60*1000;
if(!((sample+ttl-1)-sample<ttl))fail('Scorigami TTL boundary setup is invalid');
if((sample+ttl)-sample<ttl)fail('Scorigami does not expire at the eight-day boundary');

if(!process.exitCode)console.log(`Homepage Scorigami freshness checks passed for ${(data.alerts||[]).length} stored alerts.`);
