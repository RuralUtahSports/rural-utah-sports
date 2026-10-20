/* Regression checks for the interactive Game Center. Run with Node 22+. */
async function main(){
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const text=name=>fs.readFileSync(path.join(root,name),"utf8");
const html=text("game-center.html"),core=text("game-center.js"),script=text("game-center-v2.js");
const teamStats=JSON.parse(text("team-stats-2026.json"));
const playerStats=JSON.parse(text("deseret-stat-metrics-2026.json"));
const quarterData=JSON.parse(text("game-center-quarter-scores-2026.json"));
const playerAudit=JSON.parse(text("game-center-player-audit-2026.json"));
assert.equal(Object.keys(quarterData.games).length,quarterData.summary.verified);
assert.equal(quarterData.summary.complete+quarterData.summary.partial+quarterData.summary.unavailable+quarterData.summary.conflict,quarterData.summary.verified);
for(const row of Object.values(quarterData.games)){
 if(!["complete","partial"].includes(row.status))continue;
 for(let i=0;i<2;i++){
  const scored=row.quarters[i].reduce((sum,x)=>sum+(x??0),0);
  assert.ok(scored<=row.final[i],"Quarter scoring exceeds verified final");
  if(row.status==="complete")assert.equal(scored,row.final[i],"Quarter scoring does not add to final");
 }
}
assert.deepEqual(quarterData.games["2026-10-08|LOGAN|GRANTSVILLE"].quarters[0],[6,15,6,10]);
assert.equal(playerAudit.teams.GRANTSVILLE.Receiving["Dawson Dunlevy"].yards,333);

assert.match(html,/src="game-center-v2\.js\?v=/);
assert.match(html,/src="nav-menu\.js[^"]*"><\/script>/);
assert.match(core,/rus:game-center-update/);
assert.match(core,/rus:game-center-history-ready/);
for(const id of ["v2Stats","v2StatsA","v2StatsB","v2Probability","v2ProbMethod","v2Rivalry","v2Players","v2GameSelect","v2LoadDetail","v2GameReport","v2GameTitle"]){
 assert.ok(html.includes('id="'+id+'"'),"Required HTML id "+id);
}
new vm.Script(core);
new vm.Script(script);

const elements=new Map();
function el(id){
 if(!elements.has(id))elements.set(id,{
  id,value:"",innerHTML:"",textContent:"",disabled:false,hidden:false,style:{setProperty(){}},addEventListener(){},setAttribute(){}
 });
 return elements.get(id);
}
const listeners={};
const A={name:"MORGAN",rating:76,backgroundColor:"#a32a12"};
const B={name:"GRANTSVILLE",rating:55,backgroundColor:"#254292"};
const games=[
 {date:"10/2/2026",stamp:Date.UTC(2026,9,2),awayTeam:"GRANTSVILLE",homeTeam:"MORGAN",away:7,home:42},
 {date:"9/1/2026",stamp:Date.UTC(2026,8,1),awayTeam:"MORGAN",homeTeam:"RIDGELINE",away:20,home:21},
 // Mock games solely to exercise the minimum-sample threshold in the unit test.
 ...Array.from({length:20},(_,i)=>({date:"8/"+String(i+1)+"/2026",stamp:Date.UTC(2026,7,i+1),awayTeam:i%2?"MORGAN":"GRANTSVILLE",homeTeam:"RIDGELINE",away:14+i%12,home:21+i%10}))
];
let snapshot={
 a:A,b:B,neutral:21,difference:21,home:2.5,venue:"neutral",format:"11P",games,
 ratings:{"11P":{teams:[A,B,{name:"RIDGELINE",rating:80}],games:2}},history:[
  {stamp:Date.UTC(2025,9,3),date:"10/3/2025",team1:"MORGAN",team2:"GRANTSVILLE",score1:24,score2:10},
  {stamp:Date.UTC(2026,9,2),date:"10/2/2026",team1:"MORGAN",team2:"GRANTSVILLE",score1:42,score2:7}
 ]
};
const windowMock={
 RUSGameCenter:{snapshot:()=>snapshot},
 addEventListener(type,fn){listeners[type]=fn;}
};
const documentMock={getElementById:el,addEventListener(){},querySelector(){return null}};
const data={"team-stats-2026.json":teamStats,"deseret-stat-metrics-2026.json":playerStats,"game-center-quarter-scores-2026.json":quarterData,"game-center-player-audit-2026.json":playerAudit};
const fetchMock=async url=>({ok:true,json:async()=>data[url]});
vm.runInNewContext(script,{window:windowMock,document:documentMock,fetch:fetchMock,console,Date,Math,Number,String,Object,Map,Array,Promise,Set});
const funcs=windowMock.RUSGameCenterV2Test;
assert.equal(funcs.winChance(0,14),.5);
assert.ok(funcs.winChance(10,14)>.5);
assert.ok(funcs.winChance(-10,14)<.5);
assert.ok(Math.abs(funcs.winChance(10,14)+funcs.winChance(-10,14)-1)<1e-9);
assert.match(funcs.barRow("<unsafe>",1,2),/&lt;unsafe&gt;/);

const g={date:"8/14/2026",awayTeam:"MORGAN",homeTeam:"RIDGELINE",away:21,home:24};
const details={games:{"2026-08-14|MORGAN|RIDGELINE":{
 final:true,boxScore:{periods:["Q1","Q2","Q3","Q4"],rows:[
  {team:"Morgan",quarters:[7,7,7,0],total:21},{team:"Ridgeline",quarters:[7,7,7,3],total:24}
 ]},scoringPlays:["Verified scoring play"]
}}};
const matched=funcs.detailLookup(details,g);
assert.ok(matched);
const valid=funcs.breakdownHTML(matched,g);
assert.match(valid,/Q1/);
assert.match(valid,/Verified scoring play/);
const conflict=funcs.breakdownHTML(matched,{...g,away:38});
assert.match(conflict,/conflicts/);
assert.doesNotMatch(conflict,/Verified scoring play/);
assert.match(funcs.breakdownHTML(null,g),/No verified/);

listeners["rus:game-center-update"]();
assert.match(el("v2Probability").innerHTML,/v2-prob-track/);
assert.match(el("v2Rivalry").innerHTML,/<svg/);
assert.match(el("v2GameSelect").innerHTML,/MORGAN/);
await new Promise(resolve=>setTimeout(resolve,0));
assert.match(el("v2Stats").innerHTML,/Points scored/);
assert.match(el("v2Stats").innerHTML,/class="v2-stat-name">Points scored/);
assert.match(el("v2GameReport").innerHTML,/v2-quarters/);
assert.match(el("v2GameReport").innerHTML,/Q1/);
assert.match(el("v2Players").innerHTML,/2026|Owen Gilson|George Thurston|Bridger/i);
assert.match(el("v2Players").innerHTML,/Dawson Dunlavy/);
assert.match(el("v2Players").innerHTML,/333/);

// Changing teams after history has already loaded must not strand the chart.
snapshot={...snapshot,a:{...B},b:{...A},history:snapshot.history,difference:-21,neutral:-21};
listeners["rus:game-center-update"]();
assert.match(el("v2Rivalry").innerHTML,/<svg/);
console.log("Game Center v2 checks passed: verified-source comparisons, experimental odds, rivalry updates, player leaders and detail-score safeguards.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
