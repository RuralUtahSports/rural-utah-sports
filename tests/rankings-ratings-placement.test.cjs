/* Run: node --test tests/rankings-ratings-placement.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const file=name=>fs.readFileSync(path.join(root,name),"utf8");

test("Rankings dropdown presents both rating systems",()=>{
 const nav=file("nav-menu.js");
 assert.match(nav,/dropdown\("Rankings",\s*"rankings"\)/);
 assert.match(nav,/\["Team Ratings",\s*"rankings\.html#team-ratings"\]/);
 assert.match(nav,/\["Power Ratings & Spreads",\s*"power-ratings\.html"\]/);
 assert.match(nav,/\["Madden Ratings",\s*"madden-ratings\.html"\]/);
});
test("Rankings page contains integrated toggle without replacing editorial rankings",()=>{
 const markup=file("rankings.html");
 assert.match(markup,/id="state-top-25"/);
 assert.match(markup,/id="team-ratings"/);
 assert.match(markup,/id="classification-rankings"/);
 assert.match(markup,/rankings-team-ratings\.js/);
 const module=file("rankings-team-ratings.js");
 assert.match(module,/aria-selected/);
 assert.match(module,/RUSPowerRatings\.build/);
 assert.match(module,/RUSMaddenRatings\.build/);
 assert.match(module,/team\.html\?team=/);
 assert.doesNotThrow(()=>new Function(module));
});
test("Team pages load 2026 grades after current-season record section",()=>{
 const nav=file("nav-menu.js");
 const team=file("team.html");
 const widget=file("team-ratings-summary.js");
 assert.match(nav,/team-ratings-summary\.js/);
 assert.match(team,/ratings-nav1/);
 assert.match(widget,/rusTeamDashboard/);
 assert.match(widget,/grid\.insertAdjacentElement\("afterend",box\)/);
 assert.match(widget,/season&&season!=="2026"/);
 assert.match(widget,/Power and Madden team ratings/);
 assert.doesNotThrow(()=>new Function(widget));
});
test("Both rating models retain distinct definitions",()=>{
 const power=file("power-ratings-core.js"),madden=file("madden-ratings-core.js");
 assert.match(power,/root\.RUSPowerRatings/);
 assert.match(madden,/root\.RUSMaddenRatings/);
 assert.match(file("power-ratings.html"),/PWR/);
 assert.match(file("madden-ratings.html"),/OVR/);
});
