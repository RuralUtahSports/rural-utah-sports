/* Run with node --test tests/ratings-image-share.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
test("ratings sharing works from all three tables and team details",()=>{
 const src=read("ratings-image-share.js");
 assert.doesNotThrow(()=>new Function(src));
 assert.match(src,/rankings\.html/);
 assert.match(src,/power-ratings\.html/);
 assert.match(src,/madden-ratings\.html/);
 assert.match(src,/team\.html/);
 assert.match(src,/collectList/);
 assert.match(src,/collectPowerMatch/);
 assert.match(src,/collectMaddenMatch/);
 assert.match(src,/collectTeam/);
});
test("buttons create shareable PNG graphics without approximating school logos",()=>{
 const src=read("ratings-image-share.js");
 assert.match(src,/width=1080/);
 assert.match(src,/height=1350/);
 assert.match(src,/toBlob/);
 assert.match(src,/navigator\.share/);
 assert.match(src,/\.download=filename/);
 assert.match(src,/@ruralutahsports77/);
 assert.doesNotMatch(src,/school-logo|drawLogo|drawImage\(/i);
});
test("ratings site pages and team navigation load share script",()=>{
 for(const name of ["rankings.html","power-ratings.html","madden-ratings.html"]){
  assert.match(read(name),/ratings-image-share\.js\?v=20261010-graphic1/,name);
 }
 assert.match(read("nav-menu.js"),/addScript\("ratings-image-share\.js\?v=20261010-graphic1"/);
});
