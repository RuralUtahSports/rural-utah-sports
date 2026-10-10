/* Share 2026 RUS ratings as a downloadable 1080x1350 PNG; no school logos are generated. */
(()=>{
"use strict";
if(window.__rusRatingsShareInstalled)return;
const path=(location.pathname.split("/").pop()||"").toLowerCase();
if(!["rankings.html","power-ratings.html","madden-ratings.html","team.html"].includes(path))return;
window.__rusRatingsShareInstalled=true;
const orange="#F14D07",white="#f8f8f8",muted="#aeb7c2";
const $=id=>document.getElementById(id);
const norm=s=>String(s||"").trim();
const num=x=>{const n=Number(x);return Number.isFinite(n)?n:null};
const mode=()=>path==="madden-ratings.html"?"madden":path==="power-ratings.html"?"power":$("rus-tr-madden")?.getAttribute("aria-selected")==="true"?"madden":"power";
function collectList(){
 const index=path==="rankings.html",kind=mode();
 const table=index?$("rus-tr-panel")?.querySelector("table"):document.querySelector("#ratingRows")?.closest("table");
 if(!table)return null;
 const headers=[...table.querySelectorAll("thead th")].map(h=>norm(h.textContent).toUpperCase());
 const ix=key=>headers.indexOf(key);
 const grade=kind==="power"?"PWR":"OVR";
 const rows=[...table.querySelectorAll("tbody tr")].slice(0,10).map(tr=>{
  const cells=[...tr.querySelectorAll("td")].map(el=>norm(el.textContent));
  if(!cells.length||ix("TEAM")<0&&ix("SCHOOL")<0)return null;
  const name=cells[ix("TEAM")>=0?ix("TEAM"):ix("SCHOOL")];
  const cls=cells[ix("CLASS")];
  const primary=num(cells[ix(grade)]);
  if(!name||!cls||primary===null)return null;
  return {name,cls,primary,off:num(cells[ix("OFF")]),def:num(cells[ix("DEF")])};
 }).filter(Boolean);
 if(!rows.length)return null;
 const select=index?$("rus-tr-format"):$("format");
 const cl=index?$("rus-tr-class"):$("classification");
 return {type:"list",mode:kind,rows,title:cl?.value?cl.value+" RANKINGS":select?.value==="8P"?"8-PLAYER RATINGS":"STATEWIDE RATINGS"};
}
function collectPowerMatch(){
 const a=$("teamA"),b=$("teamB"),line=norm($("spreadDisplay")?.textContent);
 if(!a?.value||!b?.value||a.value===b.value||!line||line==="—"||/unavailable|loading/i.test(line))return null;
 const rating=select=>num(norm(select.selectedOptions?.[0]?.textContent).match(/\((\d+)\)/)?.[1]);
 const ra=rating(a),rb=rating(b);
 if(ra===null||rb===null)return null;
 return {type:"versus",mode:"power",title:"POWER MATCHUP",rows:[{name:a.value,primary:ra},{name:b.value,primary:rb}],result:line,venue:norm($("venue")?.selectedOptions?.[0]?.textContent)||"Neutral field"};
}
function collectMaddenMatch(){
 const cards=[...document.querySelectorAll("#compareGrid .compare-team")].slice(0,2);
 if(cards.length!==2)return null;
 const teams=cards.map(card=>{
  const nums=[...card.querySelectorAll(".compare-stat strong")].map(e=>num(e.textContent));
  return {name:norm(card.querySelector(".compare-title")?.textContent),primary:nums[0],off:nums[1],def:nums[2]};
 });
 if(teams.some(t=>!t.name||t.primary===null))return null;
 return {type:"versus",mode:"madden",title:"MADDEN COMPARISON",rows:teams};
}
function collectTeam(){
 const root=$("rus-team-ratings-summary"),name=norm(document.querySelector("#page .team-title")?.textContent);
 if(!root||!name)return null;
 const data={};
 root.querySelectorAll(".rus-t-rating-card").forEach(card=>data[norm(card.querySelector("span")?.textContent)]=num(card.querySelector("strong")?.textContent));
 if(data.PWR===undefined||data.OVR===undefined)return null;
 return {type:"team",mode:"team",title:name,rows:[{name,primary:data.PWR,overall:data.OVR,off:data.OFF,def:data.DEF}]};
}
function font(c,sz,weight="900"){c.font=weight+" "+sz+"px Arial,Helvetica,sans-serif"}
function text(c,str,x,y,size,color=white,weight="900",align="left"){c.fillStyle=color;c.textAlign=align;font(c,size,weight);c.fillText(String(str),x,y)}
function fit(c,str,max,size=42){let s=size;font(c,s);while(s>18&&c.measureText(str).width>max){s-=2;font(c,s)}return s}
function panel(c,x,y,w,h,fill="#17202c"){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,12);c.fill();}
function base(c,title,sub){
 const g=c.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#1b2532");g.addColorStop(.65,"#0b1018");g.addColorStop(1,"#07090f");c.fillStyle=g;c.fillRect(0,0,1080,1350);
 c.fillStyle=orange;c.fillRect(0,0,1080,17);c.fillRect(76,86,10,58);
 text(c,"RURAL UTAH SPORTS",104,122,31);text(c,"2026 UTAH HIGH SCHOOL FOOTBALL",80,184,23,muted,"700");
 text(c,title,80,275,fit(c,title,930,58));text(c,sub,82,329,22,muted,"700");
 c.strokeStyle="#35404c";c.lineWidth=2;c.beginPath();c.moveTo(80,358);c.lineTo(1000,358);c.stroke();
 c.beginPath();c.moveTo(80,1240);c.lineTo(1000,1240);c.stroke();
 text(c,"@ruralutahsports77",80,1293,27,orange);
 text(c,"RURALUTA HSPORTS.COM".replace(" ",""),1000,1293,20,muted,"800","right");
}
function drawList(c,d){
 const power=d.mode==="power";base(c,power?"RUS POWER RATINGS":"RUS MADDEN RATINGS",d.title);
 text(c,"TOP "+d.rows.length+" CURRENT RATINGS",80,415,24,orange);
 if(power){text(c,"TEAM",146,469,20,muted);text(c,"PWR",976,469,20,muted,"900","right")}
 else{for(const [name,x] of [["OVR",756],["OFF",874],["DEF",992]])text(c,name,x,469,20,muted,"900","right")}
 for(const [i,r] of d.rows.entries()){
  const y=487+i*68;panel(c,78,y,924,62,i%2?"#111923":"#1b2530");c.fillStyle=orange;c.fillRect(78,y,7,62);
  text(c,String(i+1).padStart(2,"0"),99,y+41,22,muted,"800");
  const max=power?595:480;const sz=fit(c,r.name,max,32);text(c,r.name,146,y+42,sz);
  if(power){text(c,r.cls,864,y+41,22,muted,"700","right");text(c,r.primary,975,y+44,34,orange,"900","right")}
  else{for(const [v,x] of [[r.primary,756],[r.off,874],[r.def,992]])text(c,v??"—",x,y+44,31,x===756?orange:white,"900","right")}
 }
 text(c,power?"PWR gap = predicted neutral-field point spread.":"OVR / OFF / DEF are relative team grades, not point spreads.",80,1208,19,muted,"600");
}
function drawMatch(c,d){
 const power=d.mode==="power";base(c,d.title,power?d.venue.toUpperCase():"2026 OVERALL • OFFENSE • DEFENSE");
 d.rows.forEach((r,i)=>{
  const y=415+i*(power?250:348);panel(c,78,y,924,power?203:308);
  text(c,r.name,112,y+78,fit(c,r.name,830,46));
  if(power){text(c,"PWR",115,y+134,22,muted);text(c,r.primary,953,y+138,72,orange,"900","right")}
  else{for(const [label,val,j] of [["OVR",r.primary,0],["OFF",r.off,1],["DEF",r.def,2]]){const x=114+j*295;text(c,label,x,y+163,22,muted);text(c,val??"—",x,y+256,70,j?white:orange)}}
 });
 if(power){panel(c,79,960,922,185,orange);text(c,"PROJECTED SPREAD",114,1014,25,"#080808");text(c,d.result,115,1105,fit(c,d.result,823,63),"#090909")}
 text(c,power?"Home-field adjustments apply if selected.":"Madden grades do not represent scoring margins.",80,1208,18,muted,"600");
}
function drawTeam(c,d){
 const r=d.rows[0];base(c,"TEAM RATINGS", "POWER + MADDEN  •  2026");
 panel(c,78,409,926,205);text(c,r.name,116,507,fit(c,r.name,825,57));text(c,"UTAH HIGH SCHOOL FOOTBALL",116,555,23,muted);
 [["PWR",r.primary],["OVR",r.overall],["OFF",r.off],["DEF",r.def]].forEach(([label,val],i)=>{
  const x=79+(i%2)*473,y=654+Math.floor(i/2)*227;panel(c,x,y,447,205);
  text(c,label,x+27,y+64,28,muted);text(c,val??"—",x+28,y+160,77,orange);
 });
 text(c,"PWR predicts margins; OVR / OFF / DEF are separate team grades.",80,1208,17,muted,"600");
}
function makeCanvas(d){
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const c=canvas.getContext("2d");
 if(!c)throw Error("Graphics are not supported on this browser");
 if(d.type==="list")drawList(c,d);else if(d.type==="versus")drawMatch(c,d);else drawTeam(c,d);
 return canvas;
}
function imagePreview(src,blob,filename){
 $("rus-ratings-share-modal")?.remove();
 const modal=document.createElement("div");modal.id="rus-ratings-share-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Save and share ratings graphic");
 modal.style.cssText="position:fixed;inset:0;z-index:2147483640;overflow-y:auto;padding:16px;background:rgba(0,0,0,.96);display:flex;align-items:center;flex-direction:column;gap:12px;color:white";
 const bar=document.createElement("div");bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center";
 const close=document.createElement("button");close.type="button";close.textContent="Close";const save=document.createElement("a");save.href=src;save.download=filename;save.textContent="Save PNG";
 const share=document.createElement("button");share.type="button";share.textContent="Share image";
 for(const x of [close,save,share])x.style.cssText="font:900 13px Arial;padding:12px 15px;border-radius:8px;border:1px solid #555;background:#202020;color:white;cursor:pointer;text-decoration:none";
 share.style.background=orange;share.style.color="#111";
 const preview=document.createElement("img");preview.src=src;preview.alt="RUS ratings graphic";preview.style.cssText="display:block;width:min(100%,465px);height:auto;border:1px solid #555;border-radius:8px";
 const note=document.createElement("p");note.style.cssText="color:#ccc;font:12px Arial;text-align:center;margin:0";note.textContent="On iPhone, use Share image or press and hold the graphic to save it.";
 close.onclick=()=>{modal.remove();URL.revokeObjectURL(src)};
 share.onclick=()=>{
  if(!navigator.share||!blob){note.textContent="To share, save the image to Photos, or press and hold it.";return}
  const file=new File([blob],filename,{type:"image/png"});
  if(navigator.canShare&&!navigator.canShare({files:[file]})){note.textContent="Your browser cannot share files here. Use Save PNG.";return}
  navigator.share({files:[file],title:"Rural Utah Sports Ratings"}).catch(err=>{if(err.name!=="AbortError")note.textContent="Sharing isn't supported here. Use Save PNG."});
 };
 bar.append(close,save,share);modal.append(bar,note,preview);document.body.append(modal);close.focus();
}
function makeButton(label,fn){
 const button=document.createElement("button");button.type="button";button.className="rus-rating-image-share";button.textContent=label;
 button.style.cssText="border:1px solid #F14D07;background:#F14D07;color:#111;padding:11px 14px;border-radius:7px;font:900 12px Arial,sans-serif;cursor:pointer;min-height:42px";
 button.addEventListener("click",()=>{
  const data=fn();if(!data){button.textContent="Ratings still loading";setTimeout(()=>button.textContent=label,1800);return}
  try{const canvas=makeCanvas(data),filename="RUS-2026-"+data.mode+"-"+data.type+".png";
   canvas.toBlob(blob=>{if(!blob){button.textContent="Image unavailable";return}imagePreview(URL.createObjectURL(blob),blob,filename)},"image/png");
  }catch(err){console.error("RUS rating share",err);button.textContent="Unable to create graphic";setTimeout(()=>button.textContent=label,2000)}
 });return button;
}
function appendTo(element,btn){if(!element||element.querySelector(".rus-rating-image-share"))return false;element.appendChild(btn);return true}
function setup(){
 if(path==="rankings.html"){
  const bottom=document.querySelector("#team-ratings .rus-tr-bottom");return appendTo(bottom,makeButton("Share Ratings Graphic",collectList));
 }
 if(path==="team.html"){
  const heading=document.querySelector("#rus-team-ratings-summary .rus-t-rating-head");return appendTo(heading,makeButton("Share Team Ratings",collectTeam));
 }
 const sections=[...document.querySelectorAll("section.panel")];
 if(!sections.length)return false;
 const controls=document.createElement("div");controls.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 16px";
 if(path==="power-ratings.html")controls.append(makeButton("Share Matchup Graphic",collectPowerMatch));
 else controls.append(makeButton("Share Comparison Graphic",collectMaddenMatch));
 sections[0].appendChild(controls);
 const row=document.createElement("div");row.style.cssText="margin:10px 0 14px";row.append(makeButton("Share Top 10 Graphic",collectList));
 sections[1]?.insertBefore(row,sections[1].querySelector(".table-wrap")||sections[1].firstChild);
 return true;
}
let tries=0;const watch=setInterval(()=>{if(setup()||++tries>90)clearInterval(watch)},220);
})();