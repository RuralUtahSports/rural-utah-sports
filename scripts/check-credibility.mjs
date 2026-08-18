import fs from 'node:fs';

const required=['site-credibility.js','about.html','methodology.html','media.html','corrections.html'];
let failed=false;
const fail=m=>{console.error(`CREDIBILITY CHECK FAILED: ${m}`);failed=true};
for(const file of required)if(!fs.existsSync(file))fail(`Missing ${file}`);
const cred=fs.readFileSync('site-credibility.js','utf8');
for(const needle of ['Data updated','Sources & Methodology','Report an Error','about.html','methodology.html','media.html','corrections.html'])if(!cred.includes(needle))fail(`site-credibility.js missing ${needle}`);
const pwa=fs.readFileSync('pwa.js','utf8');if(!pwa.includes('site-credibility.js'))fail('pwa.js is not loading site-credibility.js');
const sw=fs.readFileSync('sw.js','utf8');if(!sw.includes('site-credibility'))fail('service worker does not refresh site-credibility assets');
const methodology=fs.readFileSync('methodology.html','utf8');for(const needle of ['ELO Ratings','RUS Line / Projected Margin','Scorigami','Corrections & Transparency'])if(!methodology.includes(needle))fail(`methodology.html missing ${needle}`);
const media=fs.readFileSync('media.html','utf8');if(!media.includes('Suggested Attribution'))fail('media.html missing attribution guidance');
const corrections=fs.readFileSync('corrections.html','utf8');for(const needle of ['Copy Correction Report','Share Report','Open GitHub Report'])if(!corrections.includes(needle))fail(`corrections.html missing ${needle}`);
if(failed)process.exit(1);console.log('RUS credibility checks passed.');
