const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

test('unverified 2026 season record carousels are not mounted or fetched on homepage', async()=>{
  const script=fs.readFileSync(path.join(root,'home-season-record-alerts.js'),'utf8');
  const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
  let requests=0;
  let mountAttempts=0;
  const document={
    readyState:'complete',
    querySelector(){mountAttempts++;throw new Error('Season record widget should not mount before verification');},
    createElement(){mountAttempts++;throw new Error('Season record widget should not create elements');},
    addEventListener(){mountAttempts++;throw new Error('Season record widget should not register listeners');}
  };
  vm.runInNewContext(script,{
    document,
    fetch(){requests++;throw new Error('Season record data must not load');},
    console
  },{filename:'home-season-record-alerts.js'});
  await Promise.resolve();
  assert.equal(requests,0);
  assert.equal(mountAttempts,0);
  assert.match(script,/const SHOW_2026_SEASON_RECORDS=false;/);
  assert.match(page,/home-season-record-alerts\.js\?v=20261026-hide-until-verified-v1/);
  assert.match(page,/2026 RUS Playoff Pick/);
  assert.match(page,/home-record-alerts\.js/);
});
