(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='map.html')return;

const ORANGE='#F14D07';
const norm=v=>String(v??'').trim().toUpperCase();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const state={active:false,selected:[],layers:[],popupState:new Map(),installed:false};

function miles(a,b){
  const R=3958.7613,toRad=d=>d*Math.PI/180;
  const lat1=toRad(+a.location.lat),lat2=toRad(+b.location.lat);
  const dLat=lat2-lat1,dLon=toRad(+b.location.lon-(+a.location.lon));
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function fmt(v){return `${v<10?v.toFixed(1):Math.round(v).toLocaleString()} mi`}
function api(){return window.RUSFootballMap||null}
function teamByName(name){return api()?.teams?.find(t=>norm(t.team)===norm(name))||null}

function addStyles(){
  if(document.getElementById('rus-measure-style'))return;
  const style=document.createElement('style');
  style.id='rus-measure-style';
  style.textContent=`
.rus-measure{background:#000;border:1px solid #333;border-top:4px solid ${ORANGE};border-radius:8px;padding:11px 12px;margin-bottom:14px}
.rus-measure-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rus-measure-copy{min-width:0}.rus-measure-copy strong{display:block;font-size:14px;text-transform:uppercase}.rus-measure-copy span{display:block;color:#888;font-size:9px;line-height:1.4;margin-top:3px}
.rus-measure-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.rus-measure button{min-height:38px;border-radius:5px;border:1px solid #444;background:#191919;color:#fff;padding:0 11px;font-size:9px;font-weight:900;text-transform:uppercase;cursor:pointer}.rus-measure-toggle{background:${ORANGE}!important;border-color:${ORANGE}!important;color:#000!important}.rus-measure-toggle.active{background:#fff!important;border-color:#fff!important}.rus-measure button:disabled{opacity:.45;cursor:not-allowed}
.rus-measure-summary{display:grid;grid-template-columns:minmax(180px,.62fr) minmax(0,1.38fr);gap:9px;margin-top:10px}.rus-measure-total,.rus-measure-route{background:#121212;border:1px solid #2f2f2f;border-radius:7px;padding:10px}.rus-measure-total span{display:block;color:#777;font-size:8px;font-weight:900;text-transform:uppercase}.rus-measure-total strong{display:block;color:${ORANGE};font-size:25px;line-height:1;margin-top:5px}.rus-measure-total small{display:block;color:#888;font-size:9px;line-height:1.35;margin-top:5px}
.rus-measure-schools{display:flex;gap:6px;flex-wrap:wrap}.rus-measure-chip{display:inline-flex!important;align-items:center;gap:5px;min-height:28px!important;height:auto!important;border-color:#3b3b3b!important;border-radius:999px!important;padding:5px 8px!important;background:#1a1a1a!important;text-transform:none!important;font-size:9px!important}.rus-measure-chip b{color:${ORANGE}}.rus-measure-chip span{color:#fff}.rus-measure-chip em{font-style:normal;color:#777;font-size:11px}.rus-measure-chip:hover{border-color:${ORANGE}!important}.rus-measure-legs{margin-top:8px;border-top:1px solid #2d2d2d;padding-top:7px;display:grid;gap:5px}.rus-measure-leg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:9px;color:#aaa}.rus-measure-leg b{color:#fff;font-size:9px}.rus-measure-leg strong{color:${ORANGE};white-space:nowrap}.rus-measure-empty{color:#888;font-size:9px;line-height:1.4}
.rus-measure-pin-selected .rus-pin{box-shadow:0 0 0 3px #fff,0 0 0 6px ${ORANGE},0 2px 7px rgba(0,0,0,.5)}.school.rus-measure-school-selected{background:#202020;box-shadow:inset 0 0 0 1px ${ORANGE}}
.rus-measure-label{background:transparent!important;border:0!important}.rus-measure-label span{display:block;background:#050505;color:#fff;border:1px solid ${ORANGE};border-radius:999px;padding:3px 6px;font:900 9px Arial,Helvetica,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.55)}
@media(max-width:650px){.rus-measure{padding:9px}.rus-measure-head{align-items:flex-start;flex-direction:column}.rus-measure-actions{width:100%;display:grid;grid-template-columns:1fr auto}.rus-measure button{min-height:42px}.rus-measure-summary{grid-template-columns:1fr}.rus-measure-total strong{font-size:22px}}
`;
  document.head.appendChild(style);
}

function hostHTML(){
  return `<div class="rus-measure-head"><div class="rus-measure-copy"><strong>Straight-Line Distance</strong><span id="rusMeasureStatus">Tap Measure Distance, then select schools on the map or school list.</span></div><div class="rus-measure-actions"><button type="button" class="rus-measure-toggle" id="rusMeasureToggle">Measure Distance</button><button type="button" id="rusMeasureClear" disabled>Clear</button></div></div><div id="rusMeasureSummary"></div>`;
}

function clearLayers(){
  const m=api()?.map;
  if(m)state.layers.forEach(layer=>{try{m.removeLayer(layer)}catch{}});
  state.layers=[];
}

function restorePopups(){
  const data=api();
  if(!data)return;
  data.markers.forEach((marker,key)=>{
    const saved=state.popupState.get(key);
    if(saved&&!marker.getPopup())marker.bindPopup(saved.content,saved.options);
  });
  state.popupState.clear();
}

function suppressPopups(){
  const data=api();
  if(!data)return;
  data.map.closePopup();
  data.markers.forEach((marker,key)=>{
    const popup=marker.getPopup();
    if(!popup||state.popupState.has(key))return;
    state.popupState.set(key,{content:popup.getContent(),options:{...popup.options}});
    marker.unbindPopup();
  });
}

function setActive(on){
  state.active=!!on;
  const toggle=document.getElementById('rusMeasureToggle');
  if(toggle){toggle.classList.toggle('active',state.active);toggle.textContent=state.active?'Done Measuring':'Measure Distance';toggle.setAttribute('aria-pressed',String(state.active))}
  if(state.active)suppressPopups();else restorePopups();
  updateStatus();
}

function updateStatus(message=''){
  const el=document.getElementById('rusMeasureStatus');
  if(!el)return;
  if(message){el.textContent=message;return}
  if(state.active)el.textContent=state.selected.length?'Select another school to add the next straight-line segment.':'Select the first school on the map or school list.';
  else if(state.selected.length>=2)el.textContent='Measurement complete. Turn Measure Distance back on to add more schools.';
  else el.textContent='Tap Measure Distance, then select schools on the map or school list.';
}

function refreshHighlights(){
  const data=api();if(!data)return;
  const selected=new Set(state.selected.map(t=>norm(t.team)));
  data.markers.forEach((marker,key)=>marker.getElement()?.classList.toggle('rus-measure-pin-selected',selected.has(key)));
  document.querySelectorAll('.school[data-team]').forEach(el=>el.classList.toggle('rus-measure-school-selected',selected.has(norm(el.dataset.team))));
}

function drawRoute(){
  clearLayers();
  const data=api();
  if(!data||state.selected.length<2)return;
  const pts=state.selected.map(t=>[+t.location.lat,+t.location.lon]);
  for(let i=1;i<state.selected.length;i++){
    const a=state.selected[i-1],b=state.selected[i],latlngs=[[+a.location.lat,+a.location.lon],[+b.location.lat,+b.location.lon]];
    const casing=L.polyline(latlngs,{color:'#fff',weight:7,opacity:.72,interactive:false}).addTo(data.map);
    const line=L.polyline(latlngs,{color:ORANGE,weight:4,opacity:1,interactive:false}).addTo(data.map);
    const mid=[(+a.location.lat + +b.location.lat)/2,(+a.location.lon + +b.location.lon)/2];
    const label=L.marker(mid,{interactive:false,keyboard:false,icon:L.divIcon({className:'rus-measure-label',html:`<span>${fmt(miles(a,b))}</span>`,iconSize:null})}).addTo(data.map);
    state.layers.push(casing,line,label);
  }
  data.map.fitBounds(L.latLngBounds(pts),{padding:[55,55],maxZoom:10});
}

function renderSummary(){
  const out=document.getElementById('rusMeasureSummary'),clear=document.getElementById('rusMeasureClear');
  if(!out)return;
  if(clear)clear.disabled=!state.selected.length;
  if(!state.selected.length){out.innerHTML='';refreshHighlights();return}
  let total=0,legs='';
  for(let i=1;i<state.selected.length;i++){
    const d=miles(state.selected[i-1],state.selected[i]);total+=d;
    legs+=`<div class="rus-measure-leg"><div><b>${esc(state.selected[i-1].team)}</b> → <b>${esc(state.selected[i].team)}</b></div><strong>${fmt(d)}</strong></div>`;
  }
  const chips=state.selected.map((t,i)=>`<button type="button" class="rus-measure-chip" data-remove="${esc(t.team)}" title="Remove ${esc(t.team)}"><b>${i+1}</b><span>${esc(t.team)}</span><em>×</em></button>`).join('');
  out.innerHTML=`<div class="rus-measure-summary"><div class="rus-measure-total"><span>${state.selected.length>=2?'Total Straight-Line Distance':'Starting School'}</span><strong>${state.selected.length>=2?fmt(total):esc(state.selected[0].team)}</strong><small>${state.selected.length>=2?`${state.selected.length} schools • ${state.selected.length-1} segment${state.selected.length===2?'':'s'}`:'Select another school to calculate distance.'}</small></div><div class="rus-measure-route"><div class="rus-measure-schools">${chips}</div>${legs?`<div class="rus-measure-legs">${legs}</div>`:'<div class="rus-measure-empty" style="margin-top:7px">Your selected schools will connect in the order you tap them.</div>'}</div></div>`;
  out.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>removeSchool(btn.dataset.remove)));
  refreshHighlights();
}

function addSchool(name){
  const t=teamByName(name);if(!t)return;
  if(state.selected.some(x=>norm(x.team)===norm(t.team))){updateStatus(`${t.team} is already in this measurement.`);return}
  state.selected.push(t);
  renderSummary();drawRoute();
  if(state.selected.length===1)api()?.map?.panTo([+t.location.lat,+t.location.lon]);
  updateStatus();
}

function removeSchool(name){
  state.selected=state.selected.filter(t=>norm(t.team)!==norm(name));
  renderSummary();drawRoute();updateStatus();
}

function clearAll(){
  state.selected=[];clearLayers();renderSummary();updateStatus();
}

function bindMarkerClicks(){
  const data=api();if(!data)return;
  data.markers.forEach((marker,key)=>{
    if(marker.__rusMeasureBound)return;
    marker.__rusMeasureBound=true;
    marker.on('click',()=>{if(!state.active)return;addSchool(key);data.map.closePopup()});
  });
}

function bindSchoolList(){
  const list=document.getElementById('schoolList');if(!list||list.__rusMeasureBound)return;
  list.__rusMeasureBound=true;
  list.addEventListener('click',e=>{
    if(!state.active)return;
    const row=e.target.closest('.school[data-team]');if(!row||!list.contains(row))return;
    e.preventDefault();e.stopImmediatePropagation();addSchool(row.dataset.team);
  },true);
  const observer=new MutationObserver(()=>refreshHighlights());
  observer.observe(list,{childList:true,subtree:true});
}

function install(){
  const data=api(),toolbar=document.querySelector('.toolbar');
  if(!data?.map||!data?.teams?.length||!data?.markers||!toolbar)return false;
  if(state.installed)return true;
  state.installed=true;addStyles();
  const host=document.createElement('section');host.className='rus-measure';host.id='rusMeasureTools';host.innerHTML=hostHTML();toolbar.insertAdjacentElement('afterend',host);
  document.getElementById('rusMeasureToggle').addEventListener('click',()=>setActive(!state.active));
  document.getElementById('rusMeasureClear').addEventListener('click',clearAll);
  bindMarkerClicks();bindSchoolList();renderSummary();updateStatus();
  window.RUSMapDistance={clear:clearAll,start:()=>setActive(true),stop:()=>setActive(false),getSelected:()=>state.selected.map(t=>t.team)};
  return true;
}

if(!install()){
  window.addEventListener('rus-football-map-ready',install,{once:true});
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},125);
}
})();
