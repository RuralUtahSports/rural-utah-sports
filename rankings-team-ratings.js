(()=>{
"use strict";
if((location.pathname.split("/").pop()||"").toLowerCase()!=="rankings.html")return;
const host=document.getElementById("team-ratings");if(!host)return;
const $=id=>document.getElementById(id);
const css=document.createElement("style");
css.textContent="#team-ratings{margin:26px 0;background:#090909;border:1px solid #343434;border-top:5px solid #F14D07;border-radius:11px;padding:18px}#team-ratings h2{font-size:25px;margin:0 0 7px;text-transform:uppercase}#team-ratings .rus-tr-desc{font-size:12px;color:#aaa;line-height:1.55;margin:0 0 14px}#team-ratings .rus-tr-tabs{display:flex;gap:8px;margin:0 0 14px}#team-ratings .rus-tr-tab{flex:1;min-width:0;background:#1a1a1a;border:1px solid #444;color:#ddd;border-radius:7px;padding:12px;font-weight:900;font-size:12px;text-transform:uppercase;cursor:pointer}#team-ratings .rus-tr-tab[aria-selected=true]{background:#F14D07;color:#000;border-color:#F14D07}#team-ratings .rus-tr-filters{display:grid;grid-template-columns:1fr 1fr 1.4fr 1fr;gap:9px;margin-bottom:14px}#team-ratings label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:900;text-transform:uppercase;color:#999}#team-ratings select,#team-ratings input{min-width:0;width:100%;min-height:42px;background:#191919;border:1px solid #484848;color:#fff;padding:8px;border-radius:5px;font-size:12px}#team-ratings .rus-tr-status{font-size:11px;color:#aaa;margin:0 0 10px}#team-ratings .rus-tr-scroller{overflow:auto;max-height:520px;border:1px solid #292929;border-radius:6px}#team-ratings table{width:100%;min-width:470px;border-collapse:collapse;font-size:12px}#team-ratings thead th{position:sticky;top:0;background:#242424;color:#ccc;text-align:left;padding:10px;font-size:10px}#team-ratings tbody td{padding:10px;border-bottom:1px solid #292929;white-space:nowrap}#team-ratings .rus-tr-number{color:#F14D07;text-align:right;font-size:17px;font-weight:900}#team-ratings .rus-tr-school{color:#fff;text-decoration:none;font-weight:900}#team-ratings .rus-tr-school:hover{color:#F14D07}#team-ratings .rus-tr-bottom{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px}#team-ratings .rus-tr-bottom a{color:#F14D07;text-decoration:none;font-size:12px;font-weight:900}#team-ratings .rus-tr-bottom p{font-size:10px;color:#888;margin:0;line-height:1.5}@media(max-width:720px){#team-ratings{padding:13px}#team-ratings h2{font-size:21px}#team-ratings .rus-tr-filters{grid-template-columns:1fr 1fr}#team-ratings .rus-tr-filters label:nth-child(3){grid-column:1/-1}#team-ratings .rus-tr-tab{font-size:11px;padding:11px 5px}}";
document.head.appendChild(css);
host.innerHTML='<h2>Team Ratings</h2><p class="rus-tr-desc"><strong>Power Ratings (PWR)</strong> are projected neutral-field point-spread ratings. <strong>Madden Ratings (OVR / OFF / DEF)</strong> grade overall, offensive and defensive strength on a separate scale. Neither replaces the editorial rankings above. Played includes all finalized games, including out-of-state opponents; Analyzed includes only games directly used for ratings.</p><div class="rus-tr-tabs" role="tablist" aria-label="Team ratings systems"><button id="rus-tr-power" type="button" role="tab" aria-selected="true" aria-controls="rus-tr-panel" class="rus-tr-tab" data-mode="power">Power Ratings</button><button id="rus-tr-madden" type="button" role="tab" aria-selected="false" aria-controls="rus-tr-panel" class="rus-tr-tab" data-mode="madden">Madden Ratings</button></div><div class="rus-tr-filters"><label>Format<select id="rus-tr-format"><option value="11P">11-player statewide</option><option value="8P">8-player (separate)</option></select></label><label>Classification<select id="rus-tr-class"><option value="">All classes</option></select></label><label>Search teams<input id="rus-tr-search" type="search" placeholder="Find a team…"></label><label>Sort by<select id="rus-tr-sort"><option value="rating">Power (PWR)</option></select></label></div><p id="rus-tr-status" class="rus-tr-status" aria-live="polite">Ratings will load when this section is viewed.</p><div id="rus-tr-panel" role="tabpanel" aria-labelledby="rus-tr-power" class="rus-tr-scroller"><table><thead id="rus-tr-head"></thead><tbody id="rus-tr-rows"><tr><td>Loading ratings…</td></tr></tbody></table></div><div class="rus-tr-bottom"><a id="rus-tr-detail" href="power-ratings.html">Open Power Ratings &amp; Matchup Calculator →</a><p id="rus-tr-legend">One PWR point = one point on the projected neutral-field spread.</p></div>';
const fmt=$("rus-tr-format"),cls=$("rus-tr-class"),sort=$("rus-tr-sort");
let mode="power",data=null,started=false,playedCounts=new Map();
const gamesPlayed=team=>playedCounts.get(String(team).toUpperCase())??"—";
function setGamesPlayed(standings){playedCounts=new Map();for(const group of Object.values(standings?.byClassification||{})){if(!Array.isArray(group))continue;for(const row of group){const w=Number(row?.wins),l=Number(row?.losses),t=Number(row?.ties||0);if(row?.team&&Number.isFinite(w)&&Number.isFinite(l)&&Number.isFinite(t))playedCounts.set(String(row.team).toUpperCase(),w+l+t)}}}

const rows=()=>data?.[mode]?.[fmt.value]?.teams||[];
function option(select,value,label){const o=document.createElement("option");o.value=value;o.textContent=label;select.appendChild(o)}
function refreshFilters(){
 const prevClass=cls.value,prevSort=sort.value;
 cls.replaceChildren();option(cls,"","All classes");
 [...new Set(rows().map(t=>t.classification))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(c=>option(cls,c,c));
 if([...cls.options].some(o=>o.value===prevClass))cls.value=prevClass;
 sort.replaceChildren();
 if(mode==="power")option(sort,"rating","Power (PWR)");
 else{option(sort,"overall","Overall (OVR)");option(sort,"offense","Offense (OFF)");option(sort,"defense","Defense (DEF)")}
 option(sort,"name","Team A–Z");
 if([...sort.options].some(o=>o.value===prevSort))sort.value=prevSort;
}
function paint(){
 if(!data)return;
 const all=rows(),q=$("rus-tr-search").value.trim().toLowerCase(),key=sort.value;
 const filtered=all.filter(t=>(!cls.value||t.classification===cls.value)&&t.name.toLowerCase().includes(q)).sort((a,b)=>key==="name"?a.name.localeCompare(b.name):(b[key]-a[key])||a.name.localeCompare(b.name));
 const labels=mode==="power"?["#","Team","Class","Played","Analyzed","PWR"]:["#","Team","Class","Played","Analyzed","OVR","OFF","DEF"];
 const thead=$("rus-tr-head");thead.replaceChildren();const header=thead.insertRow();
 labels.forEach(label=>{const th=document.createElement("th");th.textContent=label;header.appendChild(th)});
 const body=$("rus-tr-rows");body.replaceChildren();
 if(!filtered.length){const cell=body.insertRow().insertCell();cell.colSpan=labels.length;cell.textContent="No teams match the filters."}
 for(const [index,t] of filtered.entries()){
  const tr=body.insertRow();tr.insertCell().textContent=index+1;
  const name=tr.insertCell(),link=document.createElement("a");link.className="rus-tr-school";link.href="team.html?team="+encodeURIComponent(t.name);link.textContent=t.name;name.appendChild(link);
  tr.insertCell().textContent=t.classification;
  const values=mode==="power"?[gamesPlayed(t.name),t.played,t.rating]:[gamesPlayed(t.name),t.played,t.overall,t.offense,t.defense];
  values.forEach((v,j)=>{const cell=tr.insertCell();cell.textContent=v;if(j===2)cell.className="rus-tr-number"});
 }
 $("rus-tr-status").textContent="Showing "+filtered.length+" of "+all.length+" teams · "+data[mode][fmt.value].games+" finalized in-state games analyzed · through "+(data[mode][fmt.value].updatedThrough||data[mode][fmt.value].latestGame||"—");
}
function changeMode(next){
 mode=next;
 for(const button of host.querySelectorAll(".rus-tr-tab")){const active=button.dataset.mode===next;button.setAttribute("aria-selected",active?"true":"false");button.tabIndex=active?0:-1}
 $("rus-tr-panel").setAttribute("aria-labelledby",next==="power"?"rus-tr-power":"rus-tr-madden");
 $("rus-tr-detail").href=mode==="power"?"power-ratings.html":"madden-ratings.html";
 $("rus-tr-detail").textContent=mode==="power"?"Open Power Ratings & Matchup Calculator →":"Open Madden Ratings & Team Comparison →";
 $("rus-tr-legend").textContent=mode==="power"?"One PWR point = one point on the projected neutral-field spread.":"Madden OVR/OFF/DEF grades do not predict scoring margins.";
 if(data){refreshFilters();paint()}
}
async function load(){
 if(started)return;started=true;$("rus-tr-status").textContent="Calculating current ratings…";
 try{
  const get=async name=>{const r=await fetch(name+"?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error(name);return r.json()};
  const [weekly,teams,elo]=await Promise.all(["weekly-simulation.json","teams-data.json","elo-summary.json"].map(get));
  if(!window.RUSPowerRatings||!window.RUSMaddenRatings)throw Error("Ratings engine missing");
  data={power:window.RUSPowerRatings.build(weekly,teams,elo),madden:window.RUSMaddenRatings.build(weekly,teams,elo)};
  const standings=await get("standings-2026.json").catch(()=>null);
  setGamesPlayed(standings);
  refreshFilters();paint();
 }catch(error){console.warn("Rankings team ratings:",error);$("rus-tr-status").textContent="Could not load ratings. Open a detail page or refresh.";const b=$("rus-tr-rows");b.replaceChildren();b.insertRow().insertCell().textContent="Ratings unavailable."}
}
host.querySelectorAll(".rus-tr-tab").forEach(b=>b.addEventListener("click",()=>{changeMode(b.dataset.mode);load()}));
fmt.addEventListener("change",()=>{if(data){refreshFilters();paint()}});
cls.addEventListener("change",paint);sort.addEventListener("change",paint);$("rus-tr-search").addEventListener("input",paint);
if(location.hash==="#team-ratings")load();
else if("IntersectionObserver" in window){const observer=new IntersectionObserver(items=>{if(items.some(x=>x.isIntersecting)){observer.disconnect();load()}},{rootMargin:"650px"});observer.observe(host)}
else load();
})();