/* Run with: node --test tests/madden-ratings.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
function read(name){return JSON.parse(fs.readFileSync(path.join(root,name),"utf8"))}
function model(){
 const window={};
 vm.runInNewContext(fs.readFileSync(path.join(root,"madden-ratings-core.js"),"utf8"),{window});
 return window.RUSMaddenRatings;
}
test("Madden grades stay separate from spread power ratings",()=>{
 const current=model().build(read("weekly-simulation.json"),read("teams-data.json"),read("elo-summary.json"));
 assert.equal(current["11P"].teams.length,106);
 assert.equal(current["8P"].teams.length,12);
 assert.ok(current["11P"].games>0);
 assert.ok(current["8P"].games>0);
 for(const format of ["11P","8P"]){
  const rows=current[format].teams;
  for(const row of rows){
   for(const key of ["overall","offense","defense"]){
    assert.ok(Number.isInteger(row[key]),row.name+" "+key);
    assert.ok(row[key]>=50&&row[key]<=99,row.name+" "+key);
   }
   assert.equal(row.classification==="8P",format==="8P");
   assert.equal("spread" in row,false);
   assert.equal(row.provisional,row.played<4);
  }
  for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].overall>=rows[i].overall);
 }
});
test("grades distinguish teams without interpreting the gap as a predicted margin",()=>{
 const grades=model().build(read("weekly-simulation.json"),read("teams-data.json"),read("elo-summary.json"))["11P"].teams;
 const morgan=grades.find(t=>t.name==="MORGAN");
 const carbon=grades.find(t=>t.name==="CARBON");
 assert.ok(morgan.overall>carbon.overall);
 assert.ok(morgan.offense>carbon.offense);
 assert.ok(morgan.defense>carbon.defense);
 const powerWindow={};
 vm.runInNewContext(fs.readFileSync(path.join(root,"power-ratings-core.js"),"utf8"),{window:powerWindow});
 const power=powerWindow.RUSPowerRatings.build(read("weekly-simulation.json"),read("teams-data.json"),read("elo-summary.json"))["11P"].teams;
 const pMorgan=power.find(t=>t.name==="MORGAN"),pCarbon=power.find(t=>t.name==="CARBON");
 assert.equal(powerWindow.RUSPowerRatings.matchup(pMorgan,pCarbon,"neutral").spread,pMorgan.rating-pCarbon.rating);
 assert.notEqual(morgan.overall-carbon.overall,pMorgan.rating-pCarbon.rating);
});
test("scores with contradictory winners and cross-format opponents are omitted",()=>{
 const teams=[{team:"A",classification:"1A"},{team:"B",classification:"1A"},{team:"EIGHT",classification:"8P"}];
 const data={games:[
  {date:"10/09/2026",awayTeam:"A",homeTeam:"B",actualAway:30,actualHome:0,actualWinner:"B"},
  {date:"10/09/2026",awayTeam:"A",homeTeam:"EIGHT",actualAway:21,actualHome:7,actualWinner:"A"}
 ]};
 const result=model().build(data,teams,{});
 assert.equal(result["11P"].games,0);
 assert.equal(result["8P"].games,0);
 assert.equal(result["11P"].teams.length,2);
 assert.equal(result["8P"].teams.length,1);
 assert.ok(result["11P"].teams.every(t=>t.provisional));
});
