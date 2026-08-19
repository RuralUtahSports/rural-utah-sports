import fs from 'node:fs';

const fail=message=>{console.error(`SCHOOL SPONSOR CHECK FAILED: ${message}`);process.exitCode=1};
const read=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(read('school-sponsors.json'));
const sponsor=read('school-sponsor.js');
const logo=read('team-logo-header.js');
const loader=read('team-enhancements.js');

if(config?.ALA?.mode!=='placeholder')fail('ALA should start in placeholder mode until a real sponsor is configured');
for(const token of ['Sponsor ALA coverage','Your Business Here','Official RUS School Sponsor'])if(!JSON.stringify(config.ALA).includes(token))fail(`ALA placeholder missing ${token}`);
for(const token of ['activeSponsor','startDate','endDate','Presented by','rel="noopener sponsored"','hero.insertAdjacentElement'])if(!sponsor.includes(token))fail(`school-sponsor.js missing ${token}`);
for(const token of ['RUSSchoolAssets','logoUrl','rus-team-page-logo','fetchPriority'])if(!logo.includes(token))fail(`team-logo-header.js missing ${token}`);
for(const token of ['team-logo-header.js?v=20260819-sponsor1','school-sponsor.js?v=20260819-sponsor1'])if(!loader.includes(token))fail(`team loader missing ${token}`);
if(Buffer.byteLength(loader,'utf8')>700)fail('Team enhancement loader grew past the first-render budget');

if(!process.exitCode)console.log('School sponsor checks passed: ALA placeholder, sponsor expiry, and exact school-logo header wiring are active.');
