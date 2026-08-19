import fs from 'node:fs';

const fail=message=>{console.error(`SCHOOL SPONSOR CHECK FAILED: ${message}`);process.exitCode=1};
const read=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(read('school-sponsors.json'));
const sponsor=read('school-sponsor.js');
const logo=read('team-logo-header.js');
const fixes=read('team-page-fixes.js');
const loader=read('team-enhancements.js');
const integration=read('school-logo-integration.js');
const teams=read('teams.html');
const sponsorsPage=read('sponsors.html');
const promo=read('weekly-simulation-promo.js');
const scorigami=read('home-scorigami-carousel.js');
const nav=read('nav-menu.js');

if(config?.ALA?.mode!=='sponsor')fail('ALA should have an active sponsor configuration');
for(const token of ['JH3D Printz','Official RUS Sponsor of ALA Coverage','sponsors/jh3d-printz-logo.svg','jh3dprints@gmail.com','Click the sponsor logo to submit an order via email.','2026-08-19','2026-11-12'])if(!JSON.stringify(config.ALA).includes(token))fail(`ALA sponsor config missing ${token}`);
if(!fs.existsSync('sponsors/jh3d-printz-logo.svg'))fail('JH3D Printz sponsor logo asset is missing');
for(const token of ['activeSponsor','orderHref','rus-team-hero-sponsor-logo-link','rus-team-hero-sponsor-order-note','Presented by','content.insertBefore','DOMContentLoaded','pageshow'])if(!sponsor.includes(token))fail(`school-sponsor.js missing ${token}`);
for(const token of ['RUSSchoolAssets','logoUrl','rus-team-page-logo','fetchPriority','fallbackLogo','img.loading','DOMContentLoaded','rus:school-assets-ready','pageshow'])if(!logo.includes(token))fail(`team-logo-header.js missing ${token}`);
for(const token of ['rus-desktop-layout>#page','rus-side-logo','rus-team-page-logo','rus-team-hero-sponsor','desktop-v2.js?v=20260819-teamfix2','DOMContentLoaded','matchMedia'])if(!fixes.includes(token))fail(`team-page-fixes.js missing ${token}`);
for(const token of ['DOMContentLoaded','team-logo-header.js?v=20260819-teamfix2','school-sponsor.js?v=20260819-sponsor3','team-page-fixes.js?v=20260819-teamfix2'])if(!loader.includes(token))fail(`team loader missing ${token}`);
for(const token of ['isProtectedLogo','.team-sponsor-logo','.rus-team-hero-sponsor-logo','.sponsor-logo','if(isProtectedLogo(img))return'])if(!integration.includes(token))fail(`school-logo-integration.js missing sponsor protection ${token}`);
if(Buffer.byteLength(loader,'utf8')>900)fail('Team enhancement loader grew past the first-render budget');
for(const token of ['text-align:center','school-sponsors.json','team-sponsor','Official RUS Sponsor'])if(!teams.includes(token))fail(`teams.html missing ${token}`);
for(const token of ['RUS Sponsors','school-sponsors.json','Submit an Order by Email','View Sponsored Team'])if(!sponsorsPage.includes(token))fail(`sponsors.html missing ${token}`);
for(const token of ['New Sponsor','school-sponsors.json','sponsors.html','activeSponsor'])if(!promo.includes(token))fail(`weekly sponsor banner missing ${token}`);
for(const token of ['nextTuesdayReset','d.getDay()','now<nextTuesdayReset(a._ts)'])if(!scorigami.includes(token))fail(`Tuesday Scorigami reset missing ${token}`);
for(const token of ["about:[['About RUS','about.html'],['Sponsors','sponsors.html']]","dropdown('About','about')"])if(!nav.includes(token))fail(`About navigation missing ${token}`);

if(!process.exitCode)console.log('School sponsor checks passed: sponsor logos are protected from school-logo replacement, JH3D ordering is linked by email, sponsor visibility extends to Teams and the sponsor directory, the marquee announces active sponsors, team names are centered, and homepage Scorigami alerts reset on Tuesday.');
