import fs from 'node:fs';
let failed=false;const fail=m=>{console.error(`TRUST & GROWTH CHECK FAILED: ${m}`);failed=true};
const required=['seo-structured-data.js','changelog.json','whats-new.html','robots.txt','scripts/build-sitemap.mjs','scripts/audit-football-data.mjs','.github/workflows/data-audit.yml','.github/workflows/build-sitemap.yml'];
for(const f of required)if(!fs.existsSync(f))fail(`Missing ${f}`);
let changelog={};try{changelog=JSON.parse(fs.readFileSync('changelog.json','utf8'))}catch(e){fail(`changelog.json is invalid JSON: ${e.message}`)}
if(!changelog.latest)fail('changelog.json has no latest release id');if(!Array.isArray(changelog.entries)||!changelog.entries.some(x=>x.id===changelog.latest))fail('changelog latest id does not match an entry');
const pwa=fs.readFileSync('pwa.js','utf8');for(const n of ['site-credibility.js','seo-structured-data.js'])if(!pwa.includes(n))fail(`pwa.js does not load ${n}`);
const cred=fs.readFileSync('site-credibility.js','utf8');for(const n of ['whats-new.html','changelog.json','rus-changelog-seen-v1','rus-new-badge'])if(!cred.includes(n))fail(`site-credibility.js missing ${n}`);
const seo=fs.readFileSync('seo-structured-data.js','utf8');for(const n of ['Organization','SportsTeam','SportsEvent','Person','CollectionPage','canonical'])if(!seo.includes(n))fail(`SEO layer missing ${n}`);
const robots=fs.readFileSync('robots.txt','utf8');if(!robots.includes('sitemap.xml'))fail('robots.txt does not advertise sitemap.xml');
const whats=fs.readFileSync('whats-new.html','utf8');if(!whats.includes('changelog.json'))fail("What's New page is not data-driven from changelog.json");
const sw=fs.readFileSync('sw.js','utf8');for(const n of ['seo-structured-data','changelog','whats-new'])if(!sw.includes(n))fail(`service worker freshness rules missing ${n}`);
if(failed)process.exit(1);console.log('RUS Trust & Growth checks passed.');
