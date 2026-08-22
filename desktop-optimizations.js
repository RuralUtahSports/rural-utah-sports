(()=>{
'use strict';
const DESKTOP='(min-width:701px)';
if(!window.matchMedia(DESKTOP).matches)return;
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
document.body?.setAttribute('data-rus-desktop','1');

function addStyles(){
  if(document.getElementById('rus-desktop-optimizations'))return;
  const s=document.createElement('style');
  s.id='rus-desktop-optimizations';
  s.textContent=`
@media(min-width:701px){
  html{scroll-padding-top:74px}
  body{overflow-x:hidden;text-rendering:optimizeLegibility}
  nav{position:sticky;top:0;z-index:1000}
  .nav-content,.header-content,.container,main.container{width:min(100%,1500px);margin-left:auto;margin-right:auto}
  .container,main.container{padding-left:24px;padding-right:24px}
  .rus-nav>a,.rus-nav details>summary{transition:background-color .12s ease,color .12s ease}
  a,button,select,input{outline-offset:2px}
  a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #F14D07}
  .table-wrap,.table-scroll,.rus-mobile-table-scroll{max-width:100%;overflow-x:auto;overflow-y:visible!important;max-height:none!important;scrollbar-gutter:stable}
  .history-wrap,.record-wrap{overflow-x:auto;overflow-y:visible!important;max-height:none!important;scrollbar-gutter:stable}
  table{width:100%}
  th,td{vertical-align:middle}
  .card,.game,.team-card,.story,.record-card,.summary-card,.stat-card,.metric-card,.rank-card,.matchup-card,.result-card,.tool-card,.sim-card{transform:translateZ(0)}
  .card:hover,.game:hover,.team-card:hover,.story:hover,.record-card:hover,.rank-card:hover{will-change:transform}
  .filters,.toolbar,.controls,.control-grid,.filter-grid{scroll-margin-top:78px}
  img{image-rendering:auto}
}

@media(min-width:901px){
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav{align-items:stretch!important;flex-wrap:nowrap!important;min-height:46px!important}
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>a,
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>details>summary{
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    height:46px!important;
    min-height:46px!important;
    margin:0!important;
    padding:0 9px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>details{
    display:flex!important;
    align-items:stretch!important;
    height:46px!important;
    min-height:46px!important;
    margin:0!important;
    flex:0 0 auto!important;
  }
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>details>.drop{top:46px!important}

  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized{
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:12px!important;
    align-items:start!important;
  }
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized>.rus-home-dash-head{grid-column:1/-1!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized>.rus-home-desktop-main,
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized>.rus-home-desktop-rail,
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-row{display:contents!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-block{
    margin-top:0!important;
    min-width:0!important;
    background:#0d0d0d!important;
    border:1px solid #292929!important;
    border-radius:10px!important;
    padding:13px!important;
  }
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-teams{grid-column:span 2!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-games{grid-column:span 1!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-continue{grid-column:span 2!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-teams .rus-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-games .rus-home-grid{grid-template-columns:1fr!important}
}

@media(min-width:901px) and (max-width:1320px){
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>a,
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav>details>summary{
    padding-left:7px!important;
    padding-right:7px!important;
    font-size:9px!important;
    letter-spacing:0!important;
  }
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav{overflow-x:auto!important;scrollbar-width:none!important}
  body[data-rus-desktop-v2="1"] .nav-content.rus-nav::-webkit-scrollbar{display:none!important}
}

@media(min-width:901px) and (max-width:1120px){
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-teams,
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-main-games{grid-column:span 1!important}
  body[data-rus-desktop-v2="1"] .rus-home-dash.rus-home-desktopized .rus-home-continue{grid-column:1/-1!important}
}
`;
  document.head.appendChild(s);
}

function addRankingsStyles(){
  if(path!=='rankings.html'||document.getElementById('rus-rankings-desktop-layout'))return;
  const s=document.createElement('style');
  s.id='rus-rankings-desktop-layout';
  s.textContent=`
@media(min-width:901px){
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .rank-head{padding:11px 14px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .rank-row{
    grid-template-columns:34px minmax(0,1fr) auto!important;
    gap:6px!important;
    min-height:48px!important;
    padding:5px 10px 5px 7px!important;
    border-left-width:4px!important;
  }
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .rank-row.has-class-movement{
    grid-template-columns:34px 46px minmax(0,1fr) auto!important;
  }
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .rank-num{width:29px!important;height:29px!important;font-size:13px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .class-movement{font-size:10px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .team-link{gap:0!important;min-width:0!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .rus-ranking-school-logo{width:36px!important;height:36px!important;flex:0 0 36px!important;margin-right:8px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .team-link .team-pill{
    font-size:17px!important;
    line-height:1.08!important;
    letter-spacing:0!important;
    padding:0!important;
    min-height:0!important;
  }
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .rank-card .team-class{font-size:9px!important;padding:3px 6px!important}
}
@media(min-width:1001px){
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row,
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-labels{
    grid-template-columns:36px 52px minmax(220px,.9fr) 48px 64px minmax(280px,1.5fr)!important;
    gap:6px!important;
  }
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row{
    padding:7px 12px 7px 8px!important;
    min-height:54px!important;
    border-left-width:5px!important;
  }
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-labels{padding:7px 12px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .rank-num{width:30px!important;height:30px!important;font-size:13px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .movement{font-size:10px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .team-link{min-width:0!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .rus-ranking-school-logo{width:38px!important;height:38px!important;flex:0 0 38px!important;margin-right:8px!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .team-pill{font-size:17px!important;line-height:1.08!important;padding:6px 8px!important;min-height:0!important}
  body[data-rus-page="rankings.html"][data-rus-desktop="1"] .state25-row .state25-reason{font-size:12px!important;line-height:1.3!important}
}
`;
  document.head.appendChild(s);
}

function optimizeImages(){
  const imgs=[...document.images];
  imgs.forEach((img,i)=>{
    if(i<4||img.closest('header,.hero'))return;
    if(!img.hasAttribute('loading'))img.loading='lazy';
    if(!img.hasAttribute('decoding'))img.decoding='async';
  });
}

function removeNestedVerticalScroll(){
  const selectors=['.table-wrap','.table-scroll','.history-wrap','.record-wrap'];
  for(const el of document.querySelectorAll(selectors.join(','))){
    el.style.removeProperty('max-height');
    el.style.overflowY='visible';
  }
}

function loadDesktopV2(){
  if(!window.matchMedia('(min-width:901px)').matches||document.querySelector('script[data-rus-desktop-v2]'))return;
  const script=document.createElement('script');
  script.src='desktop-v2.js?v=20260818-tableheaderfix';
  script.async=true;
  script.dataset.rusDesktopV2='1';
  if(path==='scorigami.html'){
    script.addEventListener('load',()=>{
      document.querySelectorAll('table.score-table.rus-desktop-table').forEach(table=>table.classList.remove('rus-desktop-table'));
    },{once:true});
  }
  document.body.appendChild(script);
}

function start(){
  document.body?.setAttribute('data-rus-page',document.body?.getAttribute('data-rus-page')||path);
  addStyles();
  addRankingsStyles();
  optimizeImages();
  removeNestedVerticalScroll();
  loadDesktopV2();
  const observer=new MutationObserver(()=>{
    optimizeImages();
    removeNestedVerticalScroll();
  });
  observer.observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
