(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
function addStyles(){if(document.getElementById('rus-mobile-optimizations'))return;const s=document.createElement('style');s.id='rus-mobile-optimizations';s.textContent=`
html{scroll-behavior:auto;-webkit-text-size-adjust:100%}img{max-width:100%}body{overflow-x:hidden}.table-scroll,.table-wrap{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}button,a,select,input{touch-action:manipulation}
@media(max-width:700px){
  *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  body{font-size:15px;text-rendering:optimizeSpeed}.container{width:100%;max-width:100%;overflow:hidden}.summary,.card,.story,.game,.team-card,.record-card,.section,.date-section,.region-section,.leader-section{content-visibility:auto;contain-intrinsic-size:300px}.game,.card,.story,.summary,.team-card,.record-card{box-shadow:none!important}.logo{height:auto}.table-wrap,.table-scroll{max-width:100vw}.rus-nav .drop{will-change:auto!important}.leaflet-marker-icon{will-change:auto!important}.chart-container canvas,canvas{max-width:100%!important}.leaflet-container{contain:layout paint style}
  body[data-rus-page="scoreboard.html"] .date-section{contain-intrinsic-size:700px}
  body[data-rus-page="standings.html"] .region-section,body[data-rus-page="rankings.html"] .section{contain-intrinsic-size:550px}
  body[data-rus-page="team.html"] .tab-content,body[data-rus-page="player.html"] .section{content-visibility:auto;contain-intrinsic-size:650px}
  body[data-rus-page="games.html"] tbody tr:nth-child(n+80){content-visibility:auto;contain-intrinsic-size:42px}
  body[data-rus-page="stat-leaders.html"] tbody tr:nth-child(n+60),body[data-rus-page="all-state-watch.html"] .card,body[data-rus-page="all-utah.html"] .card{content-visibility:auto;contain-intrinsic-size:78px}
}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;document.head.appendChild(s)}
function optimizeImages(root=document){root.querySelectorAll('img').forEach(img=>{if(!img.classList.contains('logo')&&!img.closest('header')){if(!img.hasAttribute('loading'))img.loading='lazy';if(!img.hasAttribute('decoding'))img.decoding='async';if(!img.hasAttribute('fetchpriority'))img.fetchPriority='low'}})}
function optimizeIframes(root=document){root.querySelectorAll('iframe').forEach(f=>{if(!f.hasAttribute('loading'))f.loading='lazy'})}
function install(){document.body.dataset.rusPage=path;addStyles();optimizeImages();optimizeIframes();let queued=false;const run=()=>{queued=false;optimizeImages();optimizeIframes()};new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(run)}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();