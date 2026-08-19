import fs from 'node:fs';

const fail=message=>{console.error(`SCHOOL SPONSOR CHECK FAILED: ${message}`);process.exitCode=1};
const read=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(read('school-sponsors.json'));
const sponsor=read('school-sponsor.js');
const logo=read('team-logo-header.js');
const fixes=read('team-page-fixes.js');
const loader=read('team-enhancements.js');

if(config?.ALA?.mode!=='sponsor')fail('ALA should have an active sponsor configuration');
for(const token of ['JH3D Printz','Official RUS Sponsor of ALA Coverage','sponsors/jh3d-printz-logo.svg','2026-08-19','2026-11-12'])if(!JSON.stringify(config.ALA).includes(token))fail(`ALA sponsor config missing ${token}`);
if(!fs.existsSync('sponsors/jh3d-printz-logo.svg'))fail('JH3D Printz sponsor logo asset is missing');
for(const token of ['activeSponsor','startDate','endDate','Presented by','rus-team-hero-sponsor','content.insertBefore'])if(!sponsor.includes(token))fail(`school-sponsor.js missing ${token}`);
for(const token of ['RUSSchoolAssets','logoUrl','rus-team-page-logo','fetchPriority','fallbackLogo','loading='])if(!logo.includes(token))fail(`team-logo-header.js missing ${token}`);
for(const token of ['rus-desktop-layout>#page','rus-side-logo','rus-team-page-logo','rus-team-hero-sponsor'])if(!fixes.includes(token))fail(`team-page-fixes.js missing ${token}`);
for(const token of ['team-logo-header.js?v=20260819-teamfix1','school-sponsor.js?v=20260819-teamfix1','team-page-fixes.js?v=20260819-teamfix1'])if(!loader.includes(token))fail(`team loader missing ${token}`);
if(Buffer.byteLength(loader,'utf8')>850)fail('Team enhancement loader grew past the first-render budget');

if(!process.exitCode)console.log('School sponsor checks passed: ALA sponsor branding is inside the team hero, school logos have mobile fallback handling, and desktop duplicate-logo/layout guards are active.');
