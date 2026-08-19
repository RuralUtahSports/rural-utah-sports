import fs from 'node:fs';

const fail=message=>{console.error(`STATE TOP 25 SPONSOR CHECK FAILED: ${message}`);process.exitCode=1};
const read=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(read('feature-sponsors.json'));
const rankings=read('rankings.html');
const sponsor=read('rankings-sponsor.js');
const directory=read('sponsors.html');
const share=read('share-graphic.js');
const s=config?.stateTop25;

if(!s||s.mode!=='sponsor')fail('State Top 25 sponsor config is not active');
for(const token of ['JH3D Printz','Official Sponsor of the RUS State Top 25','sponsors/jh3d-printz-logo.svg','jh3dprintz@gmail.com','2026-08-19','2026-11-12'])if(!JSON.stringify(s).includes(token))fail(`State Top 25 config missing ${token}`);
if(!fs.existsSync('sponsors/jh3d-printz-logo.svg'))fail('JH3D logo asset is missing');
for(const token of ['rankings-sponsor.js?v=20260819-state25-sponsor1','share-graphic.js','id="state-top-25"'])if(!rankings.includes(token))fail(`rankings.html missing ${token}`);
for(const token of ['#state-top-25 .state25-head','Presented by','Rankings remain independently selected by Rural Utah Sports','feature-sponsors.json','rus-export-board.rus-export-state25','rus-export-state25-sponsor','MutationObserver','grid.style.gridTemplateRows','jh3d'])if(!sponsor.toLowerCase().includes(token.toLowerCase()))fail(`rankings-sponsor.js missing ${token}`);
if(sponsor.includes("querySelector('.rank-card')")||sponsor.includes('small-school-section'))fail('State Top 25 sponsor script should not target classification or 3A–1A ranking cards');
for(const token of ['feature-sponsors.json','featureCard','Official Sponsor of the RUS State Top 25','rankings.html#state-top-25'])if(!directory.includes(token))fail(`sponsors.html missing ${token}`);
for(const token of ['rus-export-state25','rankingSource','Share Graphic'])if(!share.includes(token))fail(`share-graphic.js missing State Top 25 export support token ${token}`);

if(!process.exitCode)console.log('State Top 25 sponsor checks passed: JH3D is limited to the statewide Top 25, listed in the sponsor directory, and injected into the State Top 25 PNG export board.');
