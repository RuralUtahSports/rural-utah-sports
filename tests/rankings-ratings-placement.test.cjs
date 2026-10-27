/* Run: node --test tests/rankings-ratings-placement.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
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
 const team=file("team-page-content.html");
 const widget=file("team-ratings-summary.js");
 assert.match(nav,/team-ratings-summary\.js/);
 const dashboardLoad=nav.indexOf('addScript("team-dashboard.js');
 const ratingsLoad=nav.indexOf('addScript("team-ratings-summary.js');
 assert.ok(dashboardLoad>=0&&ratingsLoad>dashboardLoad,"navigation schedules the current-season dashboard before ratings");
 assert.match(team,/<script src="nav-menu\.js\?v=[^"']+"><\/script>/);
 assert.match(team,/load\(\);[\s\S]*<script src="nav-menu\.js/,"team initialization starts before navigation installs its enhancements");
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


test("Team wrapper installs fetched content before awaiting scripts in document order",async()=>{
 const wrapper=file("team.html");
 const source=wrapper.match(/<script>([\s\S]*?)<\/script>/)[1];
 const events=[],expected=[];
 let pending=false,installed=false,parsedScripts=[];
 const document={documentElement:{},head:{innerHTML:""},body:{
  set innerHTML(value){installed=true;events.push("content installed")},
 },createElement:()=>({setAttribute(name,value){this[name]=value}}),querySelectorAll:()=>parsedScripts};
 class DOMParser{
  parseFromString(html){
   assert.match(html,/load\(\);/,"fetched team bootstrap is retained");
   parsedScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((match,index)=>{
    const attributes=[...match[1].matchAll(/([\w-]+)(?:=["']([^"']*)["'])?/g)].map(a=>({name:a[1],value:a[2]||""}));
    const src=attributes.find(a=>a.name==="src")?.value||"";
    const label=src||`inline ${index}`;expected.push(label);
    return {src,attributes,textContent:match[2],replaceWith(script){
     assert.ok(installed,"content must be installed before scripts execute");
     assert.equal(pending,false,"next script must wait for the previous external load");
     events.push(label);
     for(const a of attributes)assert.equal(script[a.name],a.value);
     if(src){pending=true;queueMicrotask(()=>{pending=false;script.onload()})}
    }};
   });
   return {documentElement:{lang:"en"},head:{innerHTML:"fetched head"},body:{innerHTML:"fetched body"}};
  }
 }
 const context={document,DOMParser,console,fetch:async url=>{
  assert.match(url,/^team-page-content\.html\?v=/);
  return {ok:true,text:async()=>file("team-page-content.html")};
 }};
 context.window=context;
 vm.runInNewContext(source.replace('  fetch(`team-page-content.html','  window.loading = fetch(`team-page-content.html'),context);
 await context.loading;
 assert.deepEqual(events,["content installed",...expected]);
 assert.ok(expected.indexOf(expected.find(src=>src.startsWith("nav-menu.js?")))>expected.findIndex(src=>src.startsWith("inline ")));
 assert.ok(expected.some(src=>src.startsWith("team-tabs.js?")),"wrapper installs the team tab runtime");
});

test("Ratings wait for the season dashboard, move below its grid once, and skip historical seasons",async()=>{
 const source=file("team-ratings-summary.js");
 function environment(season){
  let tick,observer,dashboard=null,box=null;
  const moves=[],elements=[];
  const node=()=>({children:[],setAttribute(){},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},insertAdjacentElement(position,item){assert.equal(position,"afterend");box=item;moves.push(this)}});
  const hero=node(),grid=node(),page=node();hero.querySelector=()=>({textContent:"SOUTH SUMMIT"});
  const document={head:node(),createElement:()=>{const e=node();elements.push(e);return e},querySelector:selector=>selector==="#page .hero"?hero:null,getElementById:id=>id==="page"?page:id==="rusTeamDashboard"?dashboard:id==="rus-team-ratings-summary"?box:null};
  const teams=[{name:"SOUTH SUMMIT",rating:72,overall:81,offense:83,defense:79}];
  const context={document,location:{pathname:"/team.html",search:season?`?team=SOUTH+SUMMIT&season=${season}`:"?team=SOUTH+SUMMIT"},URLSearchParams,console,
   setInterval:fn=>{tick=fn;return 1},clearInterval(){},setTimeout(){},
   MutationObserver:class{constructor(fn){observer=this;this.callback=fn}observe(){}disconnect(){this.disconnected=true}},
   fetch:async url=>({ok:true,json:async()=>url.startsWith("teams-data")?[{team:"SOUTH SUMMIT",classification:"2A"}]:{}}),
   RUSPowerRatings:{build:()=>({"11P":{teams}})},RUSMaddenRatings:{build:()=>({"11P":{teams}})}};
  context.window=context;vm.runInNewContext(source,context);
  return {get tick(){return tick},get observer(){return observer},get box(){return box},moves,hero,grid,elements,
   installDashboard(){dashboard=node();dashboard.querySelector=()=>grid}};
 }
 const current=environment();current.tick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(current.moves[0],current.hero,"ratings can render while the dashboard loads");
 assert.ok(current.observer,"late dashboard insertion must be observed");
 current.installDashboard();current.observer.callback();
 assert.equal(current.moves.at(-1),current.grid,"ratings move immediately after the dashboard grid");
 assert.equal(current.observer.disconnected,true);
 assert.equal(current.elements.filter(e=>e.id==="rus-team-ratings-summary").length,1);
 assert.equal(environment("2025").tick,undefined,"historical pages must not receive 2026 ratings");
});
