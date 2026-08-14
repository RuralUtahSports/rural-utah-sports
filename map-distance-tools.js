(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='map.html')return;
const ORANGE='#F14D07';
let line=null;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=v=>String(v??'').trim().toUpperCase();
function miles(a,b){
  const R=3958.7613,toRad=d=>d*Math.PI/180;
  const lat1=toRad(+a.location.lat),lat2=toRad(+b.location.lat),dLat=lat2-lat1,dLon=toRad(+b.location.lon-(+a.location.lon));
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function fmt(v){return `${v<10?v.toFixed(1):Math.round(v).toLocaleString()} mi`}
function pairStats(list){
  let near=null,far=null;
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const d=miles(list[i],list[j]),p={a:list[i],b:list[j],d};
    if(!near||d<near.d)near=p;
    if(!far||d>far.d)far=p;
  }
  return{near,far};
}
function nearestFrom(t,list){
  const rows=list.filter(x=>norm(x.team)!==norm(t.team)).map(x=>({team:x,d:miles(t,x)})).sort((a,b)=>a.d-b.d);
  return{near:rows[0]||null,far:rows[rows.length-1]||null};
}
function addStyles(){
  if(document.getElementById('rus-distance-style'))return;
  const s=document.createElement('style');s.id='rus-distance-style';s.textContent=`
  .rus-distance{background:#000;border:1px solid #333;border-top:4px solid ${ORANGE};border-radius:8px;padding:14px;margin-bottom:14px}.rus-distance h3{font-size:17px;text-transform:uppercase;margin-bottom:4px}.rus-distance>p{font-size:10px;color:#777;margin-bottom:12px;line-height:1.45}.rus-distance-grid{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end}.rus-distance label{display:block;color:#888;font-size:9px;font-weight:900;text-transform:uppercase}.rus-distance select,.rus-distance button{margin-top:6px;width:100%;height:42px;border-radius:5px;border:1px solid #444;background:#191919;color:#fff;padding:0 10px;font-weight:800}.rus-distance button{background:${ORANGE};border-color:${ORANGE};color:#000;cursor:pointer;font-weight:900;text-transform:uppercase;min-width:120px}.rus-distance-result{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.rus-distance-card{background:#151515;border:1px solid #333;border-radius:7px;padding:12px}.rus-distance-card span{display:block;color:#777;font-size:8px;text-transform:uppercase;font-weight:900}.rus-distance-card strong{display:block;font-size:17px;margin-top:4px}.rus-distance-card small{display:block;color:#aaa;font-size:10px;margin-top:4px;line-height:1.4}.rus-distance-card a{color:#fff;text-decoration:none}.rus-distance-card a:hover{color:${ORANGE}}.rus-pair-head{font-size:12px;text-transform:uppercase;margin:18px 0 8px;color:#bbb}.rus-pairs{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rus-pair{background:#0d0d0d;border:1px solid #333;border-radius:7px;padding:12px}.rus-pair b{color:${ORANGE};font-size:9px;text-transform:uppercase}.rus-pair strong{display:block;margin-top:5px}.rus-pair span{display:block;color:#888;font-size:10px;margin-top:4px;line-height:1.4}@media(max-width:760px){.rus-distance-grid{grid-template-columns:1fr}.rus-distance-result{grid-template-columns:1fr}.rus-pairs{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}
function optionHTML(list){return `<option value="">Choose school</option>${list.map(t=>`<option value="${esc(t.team)}">${esc(t.team)} (${esc(t.classification||'')})</option>`).join('')}`}
function teamLink(t){return `<a href="team.html?team=${encodeURIComponent(t.team)}">${esc(t.team)}</a>`}
function draw(a,b){
  if(typeof L==='undefined'||typeof map==='undefined')return;
  if(line){try{map.removeLayer(line)}catch{} line=null}
  line=L.polyline([[+a.location.lat,+a.location.lon],[+b.location.lat,+b.location.lon]],{color:ORANGE,weight:4,opacity:.9,dashArray:'8 7'}).addTo(map);
  map.fitBounds(line.getBounds(),{padding:[60,60],maxZoom:10});
}
function install(){
  if(typeof teams==='undefined'||!Array.isArray(teams)||!teams.length||!document.querySelector('.toolbar')||typeof map==='undefined'){setTimeout(install,150);return}
  if(document.getElementById('rusDistanceTools'))return;
  addStyles();
  const host=document.createElement('section');host.className='rus-distance';host.id='rusDistanceTools';
  host.innerHTML=`<h3>School Distance Calculator</h3><p>Choose two football schools to compare campus-to-campus straight-line distance. This is geographic distance, not driving mileage.</p><div class="rus-distance-grid"><label>School A<select id="rusFrom">${optionHTML(teams)}</select></label><label>School B<select id="rusTo">${optionHTML(teams)}</select></label><button type="button" id="rusCalc">Calculate</button></div><div id="rusDistanceResult"></div><div class="rus-pair-head">Statewide Distance Extremes</div><div class="rus-pairs" id="rusPairs"></div>`;
  document.querySelector('.toolbar').insertAdjacentElement('afterend',host);
  const pairs=pairStats(teams);
  document.getElementById('rusPairs').innerHTML=`${pairs.near?`<div class="rus-pair"><b>Closest Schools</b><strong>${teamLink(pairs.near.a)} ↔ ${teamLink(pairs.near.b)}</strong><span>${fmt(pairs.near.d)} apart</span></div>`:''}${pairs.far?`<div class="rus-pair"><b>Farthest Schools</b><strong>${teamLink(pairs.far.a)} ↔ ${teamLink(pairs.far.b)}</strong><span>${fmt(pairs.far.d)} apart</span></div>`:''}`;
  const from=document.getElementById('rusFrom'),to=document.getElementById('rusTo');
  function calculate(){
    const a=teams.find(t=>norm(t.team)===norm(from.value)),b=teams.find(t=>norm(t.team)===norm(to.value));
    const out=document.getElementById('rusDistanceResult');
    if(!a||!b){out.innerHTML='<div class="rus-distance-card" style="margin-top:12px"><small>Choose two schools to calculate a distance.</small></div>';return}
    if(norm(a.team)===norm(b.team)){out.innerHTML='<div class="rus-distance-card" style="margin-top:12px"><small>Choose two different schools.</small></div>';return}
    const d=miles(a,b),fromStats=nearestFrom(a,teams);
    out.innerHTML=`<div class="rus-distance-result"><div class="rus-distance-card"><span>Distance</span><strong>${fmt(d)}</strong><small>${teamLink(a)} to ${teamLink(b)}</small></div><div class="rus-distance-card"><span>Closest to ${esc(a.team)}</span><strong>${fromStats.near?fmt(fromStats.near.d):'—'}</strong><small>${fromStats.near?teamLink(fromStats.near.team):'—'}</small></div><div class="rus-distance-card"><span>Farthest from ${esc(a.team)}</span><strong>${fromStats.far?fmt(fromStats.far.d):'—'}</strong><small>${fromStats.far?teamLink(fromStats.far.team):'—'}</small></div></div>`;
    draw(a,b);
  }
  document.getElementById('rusCalc').addEventListener('click',calculate);
  from.addEventListener('change',()=>{if(to.value)calculate()});
  to.addEventListener('change',()=>{if(from.value)calculate()});
  const wanted=new URLSearchParams(location.search).get('team');if(wanted&&teams.some(t=>norm(t.team)===norm(wanted)))from.value=teams.find(t=>norm(t.team)===norm(wanted)).team;
}
install();
})();