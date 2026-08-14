(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const MOBILE='(max-width:700px)';
function addStyles(){
  if(document.getElementById('rus-mobile-optimizations'))return;
  const s=document.createElement('style');s.id='rus-mobile-optimizations';s.textContent=`
html{scroll-behavior:auto;-webkit-text-size-adjust:100%}img{max-width:100%}body{overflow-x:hidden}.table-scroll,.table-wrap,.rus-mobile-table-scroll{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}button,a,select,input{touch-action:manipulation}.rus-mobile-table-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden}.rus-mobile-table-scroll>table{margin:0}
@media(max-width:700px){
  *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  body{font-size:15px;text-rendering:optimizeSpeed}.container,main{max-width:100%}.container{width:100%;overflow:hidden}.logo{height:auto}.table-wrap,.table-scroll,.rus-mobile-table-scroll{max-width:100vw}.rus-nav .drop{will-change:auto!important}.leaflet-marker-icon{will-change:auto!important}.chart-container canvas,canvas{max-width:100%!important}.leaflet-container{contain:layout paint style}
  input,select,textarea{font-size:16px!important}button,select,input[type="button"],input[type="submit"]{min-height:44px}
  .summary,.summary-card,.card,.story,.game,.team-card,.record-card,.section,.date-section,.region-section,.leader-section,.champ,.notable,.rus-history-card,.rus-watch-card,.matchup-card,.result-card,.tool-card,.sim-card,.stat-card,.metric-card,.timeline-item,.game-card{content-visibility:auto;contain-intrinsic-size:300px}
  .game,.card,.story,.summary,.summary-card,.team-card,.record-card,.champ,.notable,.rus-history-card,.rus-watch-card{box-shadow:none!important}
  table{contain:layout style}.table-wrap,.rus-mobile-table-scroll{contain:layout paint}
  tbody tr:nth-child(n+40){content-visibility:auto;contain-intrinsic-size:44px}
  .cards>*:nth-child(n+16),.grid>*:nth-child(n+16),.results>*:nth-child(n+20),.list>*:nth-child(n+24){content-visibility:auto;contain-intrinsic-size:140px}
  body[data-rus-page="index.html"] .rus-feature-section{content-visibility:auto;contain-intrinsic-size:700px}
  body[data-rus-page="scoreboard.html"] .date-section{contain-intrinsic-size:700px}
  body[data-rus-page="standings.html"] .region-section,body[data-rus-page="rankings.html"] .section{contain-intrinsic-size:550px}
  body[data-rus-page="team.html"] .tab-content,body[data-rus-page="player.html"] .section{content-visibility:auto;contain-intrinsic-size:650px}
  body[data-rus-page="games.html"] tbody tr:nth-child(n+60){contain-intrinsic-size:42px}
  body[data-rus-page="stat-leaders.html"] tbody tr:nth-child(n+45),body[data-rus-page="all-state-watch.html"] .card,body[data-rus-page="all-utah.html"] .card{contain-intrinsic-size:78px}
  body[data-rus-page="championships.html"] .summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}body[data-rus-page="championships.html"] .filter-grid{grid-template-columns:1fr!important}body[data-rus-page="championships.html"] .table-wrap{max-height:68vh}
  body[data-rus-page="season.html"] .summary-grid,body[data-rus-page="season.html"] .champ-grid,body[data-rus-page="season.html"] .notable-grid{grid-template-columns:1fr!important}body[data-rus-page="season.html"] .year-controls{position:sticky;top:0;z-index:12;background:#111;padding:7px 0}
  body[data-rus-page="records.html"] .record-header{align-items:flex-start!important;flex-direction:column!important}body[data-rus-page="records.html"] .record-header p{text-align:left!important}body[data-rus-page="records.html"] .leaderboard{min-width:620px}body[data-rus-page="records.html"] #leaderboardWrap,body[data-rus-page="records.html"] #rivalryLeaderboard{overflow-x:auto;-webkit-overflow-scrolling:touch}
  body[data-rus-page="greatest-seasons.html"] .card,body[data-rus-page="history-lab.html"] .card,body[data-rus-page="dynasty.html"] .card,body[data-rus-page="programs.html"] .card{contain-intrinsic-size:190px}
  body[data-rus-page="elo.html"] canvas,body[data-rus-page="compare.html"] canvas{max-height:62vh}body[data-rus-page="elo.html"] .chart-container,body[data-rus-page="compare.html"] .chart-container{overflow:hidden;contain:layout paint}
  body[data-rus-page="scorigami.html"] .grid>*:nth-child(n+20),body[data-rus-page="out-of-state.html"] .grid>*:nth-child(n+20){content-visibility:auto;contain-intrinsic-size:150px}
  body[data-rus-page="simulators.html"] .sim-card,body[data-rus-page="simulators.html"] .card{contain-intrinsic-size:240px}body[data-rus-page="simulators.html"] .grid{grid-template-columns:1fr!important}
  body[data-rus-page="storylines.html"] .story{contain-intrinsic-size:230px}
  body[data-rus-page="game.html"] .section,body[data-rus-page="game.html"] .card{contain-intrinsic-size:320px}
  body[data-rus-page="map.html"] .leaflet-container{max-height:72vh}
}
@media(max-width:430px){body[data-rus-page="championships.html"] .summary-grid{grid-template-columns:1fr!important}.page-title{overflow-wrap:anywhere}.rus-related-grid{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
  document.head.appendChild(s)
}
function applyImage(img){if(img.classList.contains('logo')||img.closest('header'))return;if(!img.hasAttribute('loading'))img.loading='lazy';if(!img.hasAttribute('decoding'))img.decoding='async';if(!img.hasAttribute('fetchpriority'))img.fetchPriority='low'}
function optimizeImages(root=document){if(root.nodeType===1&&root.matches?.('img'))applyImage(root);root.querySelectorAll?.('img').forEach(applyImage)}
function optimizeIframes(root=document){if(root.nodeType===1&&root.matches?.('iframe')&&!root.hasAttribute('loading'))root.loading='lazy';root.querySelectorAll?.('iframe').forEach(f=>{if(!f.hasAttribute('loading'))f.loading='lazy'})}
function wrapWideTables(root=document){if(!matchMedia(MOBILE).matches)return;const tables=[];if(root.nodeType===1&&root.matches?.('table'))tables.push(root);root.querySelectorAll?.('table').forEach(t=>tables.push(t));for(const table of tables){if(table.closest('.table-wrap,.table-scroll,.rus-mobile-table-scroll'))continue;const wrap=document.createElement('div');wrap.className='rus-mobile-table-scroll';wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');table.parentNode?.insertBefore(wrap,table);wrap.appendChild(table)}}
function optimize(root=document){optimizeImages(root);optimizeIframes(root);wrapWideTables(root)}
function install(){document.body.dataset.rusPage=path;addStyles();optimize(document);let queued=false,pending=[];const flush=()=>{queued=false;const nodes=pending;pending=[];for(const n of nodes)if(n?.nodeType===1)optimize(n)};new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)pending.push(n);if(!pending.length||queued)return;queued=true;requestAnimationFrame(flush)}).observe(document.body,{childList:true,subtree:true});addEventListener('resize',()=>{if(matchMedia(MOBILE).matches)wrapWideTables(document)},{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();