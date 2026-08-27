(()=>{
'use strict';
if(window.__RUS_SITE_POLISH__)return;window.__RUS_SITE_POLISH__=true;
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const ORANGE='#F14D07';
function addStyles(){
  if(document.getElementById('rus-site-polish-style'))return;
  const s=document.createElement('style');s.id='rus-site-polish-style';s.textContent=`
:root{--rus-orange:#F14D07;--rus-bg:#111;--rus-panel:#0b0b0b;--rus-panel-2:#171717;--rus-border:#333;--rus-muted:#999;--rus-radius:9px;--rus-shadow:0 10px 26px rgba(0,0,0,.18)}
:where(a,button,input,select,textarea,summary):focus-visible{outline:3px solid var(--rus-orange)!important;outline-offset:3px!important}
:where(button,[role="button"],select,input[type="button"],input[type="submit"],.weekly-cta,.compare-link){min-height:44px}
:where(.table-wrap,.table-scroll,.history-wrap,.record-wrap){scrollbar-gutter:stable;-webkit-overflow-scrolling:touch}
:where(.rus-card-logo,.team-logo,.rus-ranking-school-logo,.rus-standings-school-logo){object-fit:contain!important;object-position:center!important}
@media(min-width:901px){html body[data-rus-desktop-v2="1"]>nav{z-index:10000!important;overflow:visible!important}html body[data-rus-desktop-v2="1"] .nav-content.rus-nav{overflow:visible!important}html body[data-rus-desktop-v2="1"] .rus-nav>details{overflow:visible!important}html body[data-rus-desktop-v2="1"] .rus-nav .drop{z-index:10001!important;overflow-x:hidden!important;overflow-y:auto!important}}
.rus-discovery{background:#000;border:1px solid var(--rus-border);border-top:5px solid var(--rus-orange);border-radius:var(--rus-radius);padding:23px;margin:0 0 30px}.rus-discovery-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:16px}.rus-discovery-head h2{margin:0;font-size:27px;text-transform:uppercase}.rus-discovery-head p{margin:6px 0 0;color:#999;line-height:1.45;max-width:760px}.rus-discovery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rus-discovery-card{background:#151515;border:1px solid var(--rus-border);border-radius:8px;padding:16px;min-width:0}.rus-discovery-card h3{margin:0 0 6px;color:var(--rus-orange);font-size:16px;text-transform:uppercase}.rus-discovery-card>p{margin:0 0 12px;color:#999;font-size:12px;line-height:1.45}.rus-discovery-links{display:grid;gap:7px}.rus-discovery-links a{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;padding:10px 11px;background:#0c0c0c;border:1px solid #303030;border-radius:6px;color:#fff;text-decoration:none;font-size:12px;font-weight:900}.rus-discovery-links a:after{content:'›';color:var(--rus-orange);font-size:18px;line-height:1}.rus-discovery-links a:hover{border-color:var(--rus-orange);background:#111}
.rus-explainer{margin:16px 0 20px;background:#090909;border:1px solid #333;border-left:5px solid var(--rus-orange);border-radius:7px;overflow:hidden}.rus-explainer>summary{cursor:pointer;list-style:none;padding:13px 15px;min-height:44px;display:flex;align-items:center;color:#fff;font-size:12px;font-weight:900;text-transform:uppercase}.rus-explainer>summary::-webkit-details-marker{display:none}.rus-explainer>summary:after{content:'+';margin-left:auto;color:var(--rus-orange);font-size:18px}.rus-explainer[open]>summary:after{content:'−'}.rus-explainer-body{border-top:1px solid #2a2a2a;padding:14px 15px;color:#aaa;font-size:12px;line-height:1.6}.rus-explainer-body strong{color:#fff}
.rus-polish-related{margin-top:26px;background:#000;border:1px solid #333;border-radius:8px;padding:18px}.rus-polish-related h2{margin:0 0 12px;border-left:5px solid var(--rus-orange);padding-left:10px;font-size:19px;text-transform:uppercase}.rus-polish-related-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rus-polish-related-grid a{display:block;background:#171717;border:1px solid #333;border-radius:6px;padding:12px;color:#fff;text-decoration:none;font-size:12px;font-weight:900}.rus-polish-related-grid a:hover{border-color:var(--rus-orange)}.rus-polish-related-grid span{display:block;margin-top:4px;color:#777;font-size:9px;text-transform:uppercase;font-weight:700}
@media(max-width:900px){.rus-discovery-grid{grid-template-columns:1fr 1fr}.rus-discovery-card:last-child{grid-column:1/-1}.rus-polish-related-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){:where(button,select,input,textarea){font-size:16px}.rus-discovery{padding:16px 12px;margin-bottom:22px}.rus-discovery-head{align-items:flex-start}.rus-discovery-head h2{font-size:23px}.rus-discovery-grid{grid-template-columns:1fr}.rus-discovery-card:last-child{grid-column:auto}.rus-discovery-card{padding:14px}.rus-discovery-links a{font-size:13px}.rus-polish-related-grid{grid-template-columns:1fr}.rus-explainer{margin-top:13px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
  `;document.head.appendChild(s);
}
function discoveryCard(title,desc,links){return `<article class="rus-discovery-card"><h3>${title}</h3><p>${desc}</p><div class="rus-discovery-links">${links.map(([label,href])=>`<a href="${href}">${label}</a>`).join('')}</div></article>`}
function setupHomeDiscovery(){
  if(path!=='index.html'||document.getElementById('rusExplore'))return;
  const hero=document.querySelector('main .hero'),week=document.querySelector('main .this-week');if(!hero&&!week)return;
  const section=document.createElement('section');section.id='rusExplore';section.className='rus-discovery';section.innerHTML=`<div class="rus-discovery-head"><div><h2>Explore Rural Utah Sports</h2><p>Jump straight to what you came for — this week's football, team and player data, or more than a century of Utah football history.</p></div></div><div class="rus-discovery-grid">${discoveryCard('Follow This Week','Scores, polls and the races happening right now.',[['Weekly Pick’em','simulators.html#weekly'],['Game Week','game-week.html'],['Scoreboard','scoreboard.html'],['Rankings','rankings.html'],['Standings','standings.html']])}${discoveryCard('Teams & Players','Find a program, compare teams and explore current stats.',[['Teams','teams.html'],['Stat Leaders','stat-leaders.html'],['Team Stats','team-stats.html'],['Fantasy Football','fantasy-football.html']])}${discoveryCard('Explore History','Go season by season or dig into the record book.',[['Past Season Rankings','historical-rankings.html'],['Season Explorer','season.html'],['Records','records.html'],['Scorigami','scorigami.html']])}</div>`;
  if(hero)hero.insertAdjacentElement('afterend',section);else week.insertAdjacentElement('beforebegin',section);
}
function setupPickemNav(){
  const details=[...document.querySelectorAll('.rus-nav details')].find(d=>/^Simulators\b/i.test((d.querySelector('summary')?.textContent||'').trim()));
  const drop=details?.querySelector('.drop');if(!drop||drop.querySelector('a[href="simulators.html#weekly"]'))return;
  const a=document.createElement('a');a.href='simulators.html#weekly';a.textContent='Weekly Pick’em';drop.appendChild(a);
}
function setupHistoricalHelp(){
  if(path!=='historical-rankings.html')return;
  const hero=document.querySelector('main .hero'),controls=document.querySelector('main .controls');
  if(hero&&!document.getElementById('rusHistoricalExplainer')){
    const d=document.createElement('details');d.id='rusHistoricalExplainer';d.className='rus-explainer';d.innerHTML=`<summary>How these historical rankings work</summary><div class="rus-explainer-body"><strong>These are computer reconstructions, not historical media polls.</strong> Each season is ordered by the RUS season rating already stored for that program and year. Record, strength of schedule and scoring margin are shown beside the rating for context. A team is included only when the RUS database contains at least one game for that season. Current-season teams are intentionally left off this page.</div>`;
    if(controls)controls.insertAdjacentElement('beforebegin',d);else hero.insertAdjacentElement('afterend',d);
  }
  const main=document.querySelector('main');if(main&&!document.getElementById('rusHistoricalRelated')){
    const y=Number(new URLSearchParams(location.search).get('season'))||'';
    const box=document.createElement('section');box.id='rusHistoricalRelated';box.className='rus-polish-related';box.innerHTML=`<h2>Keep Exploring</h2><div class="rus-polish-related-grid"><a href="season.html${y?`?year=${y}`:''}">Season Explorer<span>Games, champions and season context</span></a><a href="greatest-seasons.html">Greatest Seasons<span>Compare elite seasons across eras</span></a><a href="programs.html">Program Leaderboard<span>All-time program performance</span></a><a href="elo.html">ELO History<span>Game-by-game program strength</span></a></div>`;main.appendChild(box);
  }
}
function labelScrollableTables(){
  const apply=()=>document.querySelectorAll('.table-wrap,.table-scroll').forEach(w=>{if(w.dataset.rusPolishScroll)return;w.dataset.rusPolishScroll='1';w.setAttribute('tabindex','0');if(!w.getAttribute('aria-label'))w.setAttribute('aria-label','Scrollable data table')});
  apply();setTimeout(apply,600);setTimeout(apply,1800);
}
function init(){addStyles();setupHomeDiscovery();setupPickemNav();setupHistoricalHelp();labelScrollableTables()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();