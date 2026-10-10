(()=>{
"use strict";
if((location.pathname.split("/").pop()||"").toLowerCase()!=="team.html")return;
const season=new URLSearchParams(location.search).get("season");
if(season&&season!=="2026")return;
if(window.__rusTeamPowerMaddenInstalled)return;window.__rusTeamPowerMaddenInstalled=true;
const norm=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const aliases={MONUMENTVALLEY:"MONUMENTVAL",CEDAR:"CEDARCITY",MAPLEMTN:"MAPLEMOUNTAIN",GUNNISON:"GUNNISONVALLEY",UMACAMPWILLIAMS:"UMALEHI",SAINTJOSEPH:"SAINTJOSEPH"};
const canonical=s=>aliases[norm(s)]||norm(s);
const get=async file=>{const response=await fetch(file+"?v="+Date.now(),{cache:"no-store"});if(!response.ok)throw Error("Missing "+file);return response.json()};
function loadJs(src,flag){
 if(window[flag])return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src=src;script.onload=resolve;script.onerror=()=>reject(Error("Missing "+src));document.head.appendChild(script);
 });
}
const style=document.createElement("style");style.textContent="#rus-team-ratings-summary{background:#060606;border:1px solid #353535;border-left:5px solid #F14D07;border-radius:8px;padding:15px;margin:0 0 22px}#rus-team-ratings-summary .rus-t-rating-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:11px}#rus-team-ratings-summary h3{font-size:18px;text-transform:uppercase;margin:0}#rus-team-ratings-summary a{color:#F14D07;text-decoration:none;font-weight:900;font-size:11px}#rus-team-ratings-summary a:hover{text-decoration:underline}#rus-team-ratings-summary .rus-t-rating-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}#rus-team-ratings-summary .rus-t-rating-card{border:1px solid #303030;background:#171717;text-align:center;padding:12px 5px;border-radius:6px}#rus-team-ratings-summary .rus-t-rating-card strong{color:#F14D07;font-size:24px;display:block;font-variant-numeric:tabular-nums}#rus-team-ratings-summary .rus-t-rating-card span{color:#aaa;font-size:10px;font-weight:900;text-transform:uppercase;display:block;margin-top:5px}#rus-team-ratings-summary .rus-t-rating-foot{font-size:10px;color:#888;line-height:1.5;margin:9px 0 0}@media(max-width:490px){#rus-team-ratings-summary{padding:11px}#rus-team-ratings-summary .rus-t-rating-grid{gap:5px}#rus-team-ratings-summary .rus-t-rating-card strong{font-size:20px}#rus-team-ratings-summary .rus-t-rating-card span{font-size:9px}}";document.head.appendChild(style);
function createBox(power,madden){
 const box=document.createElement("section");box.id="rus-team-ratings-summary";box.setAttribute("aria-label","2026 Power and Madden team ratings");
 const top=document.createElement("div");top.className="rus-t-rating-head";
 const title=document.createElement("h3");title.textContent="2026 Team Ratings";
 const link=document.createElement("a");link.href="rankings.html#team-ratings";link.textContent="See all team ratings →";
 top.append(title,link);box.appendChild(top);
 const grid=document.createElement("div");grid.className="rus-t-rating-grid";
 const cards=[["PWR",power?.rating],["OVR",madden?.overall],["OFF",madden?.offense],["DEF",madden?.defense]];
 cards.forEach(([label,score])=>{
  const card=document.createElement("div");card.className="rus-t-rating-card";
  const n=document.createElement("strong");n.textContent=score??"—";
  const desc=document.createElement("span");desc.textContent=label;card.append(n,desc);grid.appendChild(card);
 });
 box.appendChild(grid);
 const p=document.createElement("p");p.className="rus-t-rating-foot";p.textContent="PWR differences estimate neutral-field point spreads. Madden OVR/OFF/DEF describe relative team strength; they do not determine spreads."+(madden?.provisional?" Madden ratings are provisional (fewer than four finalized in-state games).":"");
 box.appendChild(p);return box;
}
function place(box){
 const dashboard=document.getElementById("rusTeamDashboard");
 if(dashboard){
  const grid=dashboard.querySelector(".rus-dash-grid");
  if(grid){grid.insertAdjacentElement("afterend",box);return true;}
  dashboard.insertAdjacentElement("afterend",box);return true;
 }
 const hero=document.querySelector("#page .hero");
 if(hero){hero.insertAdjacentElement("afterend",box);return true;}
 return false;
}
async function init(){
 const hero=document.querySelector("#page .hero"),name=hero?.querySelector(".team-title")?.textContent;
 if(!name)return false;
 try{
  await Promise.all([loadJs("power-ratings-core.js?v=20261010-2","RUSPowerRatings"),loadJs("madden-ratings-core.js?v=20261010-calibrated2","RUSMaddenRatings")]);
  const [weekly,teams,elo]=await Promise.all(["weekly-simulation.json","teams-data.json","elo-summary.json"].map(get));
  const powers=window.RUSPowerRatings.build(weekly,teams,elo),maddens=window.RUSMaddenRatings.build(weekly,teams,elo,powers);
  const group=(teams.find(t=>canonical(t.team)===canonical(name))?.classification==="8P")?"8P":"11P";
  const find=(list)=>list.find(t=>canonical(t.name)===canonical(name));
  const power=find(powers[group].teams),madden=find(maddens[group].teams);
  if(!power||!madden)throw Error("Team not found in 2026 ratings");
  if(document.getElementById("rus-team-ratings-summary"))return true;
  const box=createBox(power,madden);
  if(!place(box))return false;
  // The season dashboard loads asynchronously. Move ratings directly below
  // the dashboard stat grid when it becomes available, without duplicating.
  if(!document.getElementById("rusTeamDashboard")){
   const page=document.getElementById("page");if(page){
    const obs=new MutationObserver(()=>{if(document.getElementById("rusTeamDashboard")){place(box);obs.disconnect()}});
    obs.observe(page,{subtree:true,childList:true});
    setTimeout(()=>obs.disconnect(),20000);
   }
  }
  return true;
 }catch(error){console.warn("Team rating summary unavailable:",error);return true;}
}
let checks=0;const timer=setInterval(()=>{if(document.querySelector("#page .hero")){clearInterval(timer);init()}else if(++checks>120)clearInterval(timer)},150);
})();