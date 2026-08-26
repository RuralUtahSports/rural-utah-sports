(()=>{
'use strict';
if(window.__RUS_APP_SHELL_POLISH__)return;window.__RUS_APP_SHELL_POLISH__=true;
const s=document.createElement('style');s.id='rus-app-shell-polish';s.textContent=`
:root{color-scheme:dark;--rus-orange:#F14D07;--rus-surface:#0d0d0d;--rus-surface-2:#171717;--rus-line:#303030;--rus-soft:#999;--rus-app-radius:12px}
body{background:radial-gradient(circle at 50% -140px,#252525 0,#111 420px)!important}
header{background:linear-gradient(180deg,#0d0d0d 0,#050505 100%)!important;border-bottom:1px solid #2b2b2b!important;box-shadow:0 8px 24px rgba(0,0,0,.2)}
header .header-content{width:100%;max-width:1450px;margin-inline:auto}
header .site-title h1{line-height:1.05}header .site-title p{letter-spacing:.25px}
nav{background:rgba(5,5,5,.98)!important;border-bottom:1px solid #2a2a2a!important}
:where(.card,.summary,.summary-card,.team-card,.record-card,.story,.game,.game-card,.section,.champ,.notable,.stat-card,.metric-card,.tool-card,.sim-card,.result-card,.matchup-card,.rank-card,.group,.rus-history-card,.rus-watch-card){border-radius:var(--rus-app-radius)!important;border-color:var(--rus-line)!important}
:where(.filters,.controls,.toolbar,.control-panel,.filter-panel,.picker,.lookup,.rus-discovery,.rus-polish-related,.rus-explainer){border-radius:var(--rus-app-radius)!important;border-color:var(--rus-line)!important}
:where(.table-wrap,.table-scroll,.history-wrap,.record-wrap,.board-wrap,.games-scroll){border-radius:var(--rus-app-radius)!important;border-color:var(--rus-line)!important}
:where(button,.button,.btn,.clear,.action,.go,.swap,select,input,textarea){border-radius:9px}
:where(button,.button,.btn,.clear,.action,.go,.swap){-webkit-tap-highlight-color:transparent}
:where(.page-title){letter-spacing:.2px}
:where(.section-title){border-left-color:var(--rus-orange)!important}
:where(.summary,.summary-card,.stat-card,.metric-card){background:linear-gradient(180deg,#111,#0a0a0a)!important}
:where(.card,.team-card,.record-card,.story,.game,.game-card,.section,.rank-card,.group){box-shadow:0 7px 22px rgba(0,0,0,.13)}
@media(hover:hover){:where(.card,.team-card,.record-card,.story,.game-card,.rank-card){transition:border-color .15s ease,transform .15s ease}:where(.card,.team-card,.record-card,.story,.game-card,.rank-card):hover{border-color:#444!important}}
@media(max-width:700px){
  body{background:linear-gradient(180deg,#151515 0,#111 180px)!important}
  header{box-shadow:none}
  :where(.card,.summary,.summary-card,.team-card,.record-card,.story,.game,.game-card,.section,.champ,.notable,.stat-card,.metric-card,.tool-card,.sim-card,.result-card,.matchup-card,.rank-card,.group){border-radius:10px!important}
  :where(.filters,.controls,.toolbar,.control-panel,.filter-panel,.picker,.lookup){border-radius:10px!important}
  :where(.table-wrap,.table-scroll,.history-wrap,.record-wrap,.board-wrap,.games-scroll){border-radius:10px!important;border-color:var(--rus-line)!important}
  .section-title{margin-top:24px!important}
  main>.page-title:first-child{margin-top:0!important}
  :where(.summary,.summary-card) strong{font-variant-numeric:tabular-nums}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;
document.head.appendChild(s);
if(!document.querySelector('script[data-rus-growth-features]')){const g=document.createElement('script');g.src='growth-features.js?v=20260818-growth1';g.defer=true;g.dataset.rusGrowthFeatures='1';document.body.appendChild(g)}
if(!document.querySelector('script[data-rus-share-previews]')){const p=document.createElement('script');p.src='share-preview-links.js?v=20260818-share1';p.defer=true;p.dataset.rusSharePreviews='1';document.body.appendChild(p)}
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(['index.html','team.html','game-week.html'].includes(page)&&!document.querySelector('script[data-rus-record-watch-everywhere]')){const r=document.createElement('script');r.src='record-watch-everywhere.js?v=20260818-rw1';r.defer=true;r.dataset.rusRecordWatchEverywhere='1';document.body.appendChild(r)}
if(page==='records.html'&&!document.querySelector('script[data-rus-player-single-game-records]')){const r=document.createElement('script');r.src='records-player-single-game.js?v=20260826-records1';r.defer=true;r.dataset.rusPlayerSingleGameRecords='1';document.body.appendChild(r)}
})();