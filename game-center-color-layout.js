(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='game.html')return;
if(window.__RUS_GAME_CENTER_COLOR_LAYOUT__)return;window.__RUS_GAME_CENTER_COLOR_LAYOUT__=true;
const q=new URLSearchParams(location.search),away=q.get('away')||'',home=q.get('home')||'';
if(!away||!home)return;
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const safeHex=(v,f='#F14D07')=>/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(String(v||'').trim())?String(v).trim():f;
function rgba(hex,a){let h=safeHex(hex).slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');const n=parseInt(h,16);return`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function addStyles(){if(document.getElementById('rus-game-center-color-layout'))return;const s=document.createElement('style');s.id='rus-game-center-color-layout';s.textContent=`
.rus-gc-panel{--rus-away:#F14D07;--rus-home:#F14D07;--rus-away-soft:rgba(241,77,7,.13);--rus-home-soft:rgba(241,77,7,.13);position:relative!important;overflow:hidden!important;background:linear-gradient(115deg,var(--rus-away-soft),#0b0b0b 32%,#111 68%,var(--rus-home-soft))!important;border-top:0!important;padding-top:20px!important}.rus-gc-panel:before{content:''!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:6px!important;background:linear-gradient(90deg,var(--rus-away) 0 50%,var(--rus-home) 50% 100%)!important}.rus-gc-preview{border-left-color:var(--rus-away)!important;border-right:4px solid var(--rus-home)!important}.rus-gc-grid .rus-gc-stat:nth-child(3){border-top:3px solid var(--rus-away)!important}.rus-gc-grid .rus-gc-stat:nth-child(4){border-top:3px solid var(--rus-home)!important}.rus-gc-match .rus-gc-team:first-child{border-left:5px solid var(--rus-away)!important}.rus-gc-match .rus-gc-team:last-child{border-right:5px solid var(--rus-home)!important}
@media(min-width:901px){main.container.rus-desktop-layout>#page{grid-column:1!important;grid-row:auto!important;min-width:0!important;width:100%!important}main.container.rus-desktop-layout>.rus-desktop-sidebar{grid-column:2!important;grid-row:2 / span 30!important}main.container.rus-desktop-layout>.back{grid-column:1/-1!important}main.container.rus-desktop-layout>:not(.back):not(#page):not(.rus-desktop-sidebar){grid-column:1!important}}
@media(max-width:700px){.rus-gc-match .rus-gc-team:last-child{border-right:1px solid #303030!important;border-left:5px solid var(--rus-home)!important}}
`;document.head.appendChild(s)}
async function colors(){try{const r=await fetch(`teams-data.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return['#F14D07','#F14D07'];const teams=await r.json(),m=new Map((teams||[]).filter(t=>t?.team).map(t=>[norm(t.team),t]));return[safeHex(m.get(norm(away))?.backgroundColor),safeHex(m.get(norm(home))?.backgroundColor)]}catch{return['#F14D07','#F14D07']}}
function apply(a,h){document.documentElement.style.setProperty('--rus-game-away',a);document.documentElement.style.setProperty('--rus-game-home',h);const paint=()=>document.querySelectorAll('.rus-gc-panel').forEach(panel=>{panel.style.setProperty('--rus-away',a);panel.style.setProperty('--rus-home',h);panel.style.setProperty('--rus-away-soft',rgba(a,.13));panel.style.setProperty('--rus-home-soft',rgba(h,.13))});paint();const page=document.getElementById('page')||document.body,o=new MutationObserver(paint);o.observe(page,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),15000)}
addStyles();colors().then(([a,h])=>apply(a,h));
})();
