/* Run: node --test tests/madden-statewide-calibration.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const readJSON=name=>JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
function engines(){
 const window={};
 vm.runInNewContext(fs.readFileSync(path.join(root,"power-ratings-core.js"),"utf8"),{window});
 vm.runInNewContext(fs.readFileSync(path.join(root,"madden-ratings-core.js"),"utf8"),{window});
 return window;
}
test("statewide 2026 benchmark avoids automatic 98+ grades for 3A dominance",()=>{
 const {RUSPowerRatings,RUSMaddenRatings}=engines();
 const weekly=readJSON("weekly-simulation.json"),teams=readJSON("teams-data.json"),elo=readJSON("elo-summary.json");
 const power=RUSPowerRatings.build(weekly,teams,elo);
 const madden=RUSMaddenRatings.build(weekly,teams,elo,power);
 assert.equal(madden["11P"].teams.length,106);
 assert.equal(madden["8P"].teams.length,12);
 const find=name=>madden["11P"].teams.find(t=>t.name===name);
 const morgan=find("MORGAN"),corner=find("CORNER CANYON"),mountain=find("MOUNTAIN RIDGE"),carbon=find("CARBON");
 assert.ok(morgan.overall>=85&&morgan.overall<=92, "Morgan statewide OVR should no longer be 98");
 assert.ok(corner.overall>=morgan.overall+5,"Corner Canyon should remain meaningfully higher");
 assert.ok(mountain.overall>=morgan.overall+5,"Mountain Ridge should remain meaningfully higher");
 assert.ok(carbon.overall<morgan.overall);
 for(const league of ["11P","8P"])for(const r of madden[league].teams){
  assert.ok(Number.isInteger(r.overall)&&r.overall>=50&&r.overall<=99,r.name);
  assert.ok(Number.isInteger(r.offense)&&r.offense>=50&&r.offense<=99,r.name);
  assert.ok(Number.isInteger(r.defense)&&r.defense>=50&&r.defense<=99,r.name);
  assert.equal(Math.round((r.offense+r.defense)/2),r.overall,r.name);
 }
});
test("power line remains unchanged and Madden ratings are not scoring margins",()=>{
 const {RUSPowerRatings,RUSMaddenRatings}=engines();
 const games=readJSON("weekly-simulation.json"),schools=readJSON("teams-data.json"),elo=readJSON("elo-summary.json");
 const power=RUSPowerRatings.build(games,schools,elo);
 const madden=RUSMaddenRatings.build(games,schools,elo,power);
 const a=power["11P"].teams.find(t=>t.name==="MORGAN"),b=power["11P"].teams.find(t=>t.name==="CARBON");
 const ma=madden["11P"].teams.find(t=>t.name==="MORGAN"),mb=madden["11P"].teams.find(t=>t.name==="CARBON");
 assert.equal(RUSPowerRatings.matchup(a,b,"neutral").spread,a.rating-b.rating);
 assert.notEqual(ma.overall-mb.overall,a.rating-b.rating,"Madden differential must not be used as the betting line");
});
test("Madden team grading responds to updated verified finals",()=>{
 const {RUSMaddenRatings}=engines();
 const games=readJSON("weekly-simulation.json"),teams=readJSON("teams-data.json"),elo=readJSON("elo-summary.json");
 const before=RUSMaddenRatings.build(games,teams,elo);
 const modified=JSON.parse(JSON.stringify(games));
 const base=modified.games.find(g=>g.actualAway!=null&&g.actualHome!=null&&
   teams.some(t=>t.team===g.awayTeam)&&teams.some(t=>t.team===g.homeTeam));
 assert.ok(base,"Expected at least one completed in-state game");
 base.actualAway=Number(base.actualAway)+30;
 base.actualWinner=base.actualAway>Number(base.actualHome)?base.awayTeam:
   base.actualAway<Number(base.actualHome)?base.homeTeam:"TIE";
 const after=RUSMaddenRatings.build(modified,teams,elo);
 const old=Object.fromEntries(before["11P"].teams.map(t=>[t.name,t.overall]));
 const changed=after["11P"].teams.some(t=>t.overall!==old[t.name]);
 assert.ok(changed,"A meaningful completed-game change should recalculate the ratings");
});
test("standalone Madden page loads its statewide power benchmark before recalculating",()=>{
 const html=fs.readFileSync(path.join(root,"madden-ratings.html"),"utf8");
 assert.ok(html.indexOf("power-ratings-core.js")>=0&&html.indexOf("madden-ratings-core.js")>html.indexOf("power-ratings-core.js"));
 assert.match(html,/RUSMaddenRatings\.build\(weekly,teams,elo,window\.RUSPowerRatings\.build\(weekly,teams,elo\)\)/);
 for(const filename of ["rankings-team-ratings.js","team-ratings-summary.js"]){
  const s=fs.readFileSync(path.join(root,filename),"utf8");
  assert.match(s,/RUSMaddenRatings\.build\([\s\S]*?elo,power(s)?\)/);
 }
});
