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
  script.src='desktop-v2.js?v=20260817-desktop2';
  script.async=true;
  script.dataset.rusDesktopV2='1';
  document.body.appendChild(script);
}

function start(){
  document.body?.setAttribute('data-rus-page',document.body?.getAttribute('data-rus-page')||path);
  addStyles();
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
