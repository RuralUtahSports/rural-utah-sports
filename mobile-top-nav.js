(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const links=[
  ['Home','index.html','home'],
  ['Teams','teams.html','teams'],
  ['Games','games.html','games'],
  ['Scoreboard','scoreboard.html','scoreboard'],
  ['Rankings','rankings.html','rankings'],
  ['Standings','standings.html','standings'],
  ['Stat Leaders','stat-leaders.html','stats'],
  ['Storylines','storylines.html','storylines'],
  ['ELO','elo.html','elo'],
  ['Simulators','simulators.html','simulators']
];
function active(key){
  if(key==='teams')return ['teams.html','team.html','player.html','my-teams.html'].includes(path);
  if(key==='scoreboard')return ['scoreboard.html','game.html'].includes(path);
  if(key==='rankings')return ['rankings.html','historical-rankings.html'].includes(path);
  if(key==='stats')return ['stat-leaders.html','team-stats.html','mvp-race.html','all-utah.html','all-state-watch.html','awards-2025.html'].includes(path);
  if(key==='elo')return path==='elo.html';
  if(key==='simulators')return path.includes('simulator')||path==='promotion-relegation.html';
  return path===links.find(x=>x[2]===key)?.[1];
}
function addStyles(){
  if(document.getElementById('rus-mobile-core-nav-style'))return;
  const s=document.createElement('style');s.id='rus-mobile-core-nav-style';s.textContent=`
.rus-mobile-core-nav{display:none}
@media(max-width:700px){
  html body.rus-mobile-shell-ready>nav{display:block!important}
  nav .nav-content.rus-nav{display:none!important}
  nav .rus-mobile-core-nav{display:flex!important;flex-wrap:wrap!important;align-items:stretch!important;width:100%;max-width:100%;margin:0 auto;background:#050505;border-top:1px solid #222}
  .rus-mobile-core-nav a{display:flex;align-items:center;justify-content:center;min-height:46px;padding:10px 5px;color:#fff;text-decoration:none;text-align:center;font-size:11px;font-weight:900;line-height:1.08;text-transform:uppercase;border-right:1px solid #181818;border-bottom:1px solid #181818;-webkit-tap-highlight-color:transparent}
  .rus-mobile-core-nav a:nth-child(-n+4){flex:0 0 25%}
  .rus-mobile-core-nav a:nth-child(n+5){flex:0 0 33.333333%}
  .rus-mobile-core-nav a.active,.rus-mobile-core-nav a[aria-current="page"]{background:#F14D07;color:#000}
  .rus-mobile-core-nav a:active{background:#2a2a2a;color:#fff}
}
@media(max-width:360px){.rus-mobile-core-nav a{font-size:10px;padding-inline:3px}}
`;
  document.head.appendChild(s);
}
function build(){
  const nav=document.querySelector('body>nav')||document.querySelector('nav');
  if(!nav)return false;
  let core=document.getElementById('rusMobileCoreNav');
  if(!core){core=document.createElement('div');core.id='rusMobileCoreNav';core.className='nav-content rus-mobile-core-nav';nav.appendChild(core)}
  core.innerHTML=links.map(([label,href,key])=>`<a href="${href}"${active(key)?' class="active" aria-current="page"':''}>${label}</a>`).join('');
  return true;
}
function install(){addStyles();if(build())return;const o=new MutationObserver(()=>{if(build())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),5000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();