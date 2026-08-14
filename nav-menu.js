(()=>{
  const GA_ID='G-VB4Y6BRN9M';
  function setupAnalytics(){
    if(!document.querySelector(`script[data-rus-ga="${GA_ID}"]`)){
      const s=document.createElement('script');
      s.async=true;
      s.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
      s.dataset.rusGa=GA_ID;
      document.head.appendChild(s);
    }
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    if(!window.__RUS_GA_CONFIGURED__){window.__RUS_GA_CONFIGURED__=true;window.gtag('js',new Date());window.gtag('config',GA_ID)}
  }
  setupAnalytics();
  const groups={
    history:[['Championships','championships.html'],['Season Explorer','season.html'],['Program Leaderboard','programs.html'],['Rivalry Hub','rivalry.html'],['Dynasty Explorer','dynasty.html'],['History Lab','history-lab.html'],['Greatest Seasons','greatest-seasons.html'],['Records','records.html']],
    analytics:[['ELO','elo.html'],['Scorigami','scorigami.html'],['Out of State','out-of-state.html'],['Team Comparison','compare.html'],['Football Map','map.html']],
    stats:[['Stat Leaders','stat-leaders.html'],['MVP Race','mvp-race.html'],['All-Utah Team','all-utah.html'],['All-State & Region Watch','all-state-watch.html']],
    simulators:[['Simulators Hub','simulators.html']]
  };
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase(),active=href=>path===href.toLowerCase(),groupActive=items=>items.some(([,href])=>active(href));
  function injectStyles(){
    if(document.getElementById('rus-nav-v2'))return;const style=document.createElement('style');style.id='rus-nav-v2';style.textContent=`
      nav{position:relative;z-index:50}.nav-content.rus-nav{display:flex;align-items:stretch;flex-wrap:wrap;gap:0}.rus-nav>a,.rus-nav details>summary{color:#fff;text-decoration:none;padding:15px 16px;font-size:13px;font-weight:900;text-transform:uppercase;cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px;min-height:48px}.rus-nav details>summary::-webkit-details-marker{display:none}.rus-nav>a:hover,.rus-nav>a.active,.rus-nav details.active>summary,.rus-nav details[open]>summary{background:#F14D07;color:#000}.rus-nav .home-link{padding-inline:13px}.rus-nav details{position:relative}.rus-nav .drop{position:absolute;left:0;top:100%;min-width:230px;background:#0b0b0b;border:1px solid #333;border-top:3px solid #F14D07;box-shadow:0 10px 24px rgba(0,0,0,.35);display:none;max-height:70vh;overflow:auto}.rus-nav details[open]>.drop{display:block}.rus-nav .drop a{display:block;color:#fff;text-decoration:none;padding:12px 14px;font-size:12px;font-weight:800;text-transform:uppercase;border-bottom:1px solid #242424;white-space:nowrap}.rus-nav .drop a:last-child{border-bottom:0}.rus-nav .drop a:hover,.rus-nav .drop a.active{background:#F14D07;color:#000}.rus-nav .caret{font-size:10px;transform:translateY(-1px)}.header-home{cursor:pointer}@media(min-width:701px){.rus-nav details:hover>.drop{display:block}}@media(max-width:700px){.nav-content.rus-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.rus-nav>a,.rus-nav details>summary{justify-content:center;text-align:center;padding:12px 7px;font-size:12px}.rus-nav details{position:static}.rus-nav .drop{position:static;grid-column:1/-1;min-width:0;width:100%;box-shadow:none;border-left:0;border-right:0;max-height:none}.rus-nav .drop a{text-align:center;white-space:normal;padding:11px 8px}}
    `;document.head.appendChild(style)
  }
  function link(label,href,extra=''){return `<a href="${href}" class="${active(href)?'active ':''}${extra}"${active(href)?' aria-current="page"':''}>${label}</a>`}
  function dropdown(label,key){const items=groups[key],cls=groupActive(items)?'active':'';return `<details class="${cls}"><summary>${label}<span class="caret">▼</span></summary><div class="drop">${items.map(([name,href])=>link(name,href)).join('')}</div></details>`}
  function addScript(src,key,async=true){const attr=`data-${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}`;if(document.querySelector(`script[${attr}]`))return;const s=document.createElement('script');s.src=src;s.async=async;s.dataset[key]='1';document.body.appendChild(s)}
  function loadExtras(){
    [['school-assets.js?v=20260813a','rusSchoolAssets'],['school-logo-integration.js?v=20260813b','rusSchoolLogoIntegration'],['site-extras.js','rusExtras'],['site-share.js','rusShare'],['record-watch-filter.js?v=20260812b','rusRecordWatchFilter'],['program-leaderboard-filter.js?v=20260812a','rusProgramLeaderboardFilter'],['history-tools-integration.js?v=20260812c','rusHistoryTools'],['school-colors.js?v=20260813c','rusSchoolColors'],['program-timeline.js?v=20260812a','rusProgramTimeline'],['did-you-know.js?v=20260812a','rusDidYouKnow'],['rivalry-interactive.js?v=20260812a','rusRivalryInteractive'],['team-greatest-paths.js?v=20260812a','rusTeamGreatestPaths'],['elo-explainer.js?v=20260812b','rusEloExplainer'],['team-tabs.js?v=20260813b','rusTeamTabs'],['today-history-more.js?v=20260813a','rusTodayHistoryMore']].forEach(([src,key])=>addScript(src,key,true));
    if(path.includes('simulator'))[['season-simulator-core.js?v=20260813a','rusSeasonCore'],['season-simulator-odds.js?v=20260813a','rusSeasonOdds'],['season-simulator-score.js?v=20260813a','rusSeasonScore'],['season-simulator-elo.js?v=20260813e','rusSeasonElo'],['season-simulator-run.js?v=20260813e','rusSeasonRun'],['season-simulator-view.js?v=20260813h','rusSeasonView'],['season-simulator-ui.js?v=20260813f','rusSeasonUi']].forEach(([src,key])=>addScript(src,key,false));
    addScript('mobile-optimizations.js?v=20260814a','rusMobileOptimizations',true);
    if(path==='scoreboard.html'){
      addScript('scoreboard-live-clock.js?v=20260813a','rusScoreboardLiveClock',true);
      addScript('scoreboard-rankings-ui.js?v=20260813a','rusScoreboardRankingsUi',true);
      addScript('scoreboard-card-enhancements.js?v=20260814a','rusScoreboardCardEnhancements',true);
      addScript('scoreboard-live-elo.js?v=20260814a','rusScoreboardLiveElo',true);
    }
    if(path==='team.html')addScript('player-profile-links.js?v=20260814a','rusPlayerProfileLinks',true);
    if(['player.html','mvp-race.html','all-state-watch.html','all-utah.html'].includes(path))addScript('player-awards-integration.js?v=20260814a','rusPlayerAwards',true);
    if(['all-state-watch.html','all-utah.html'].includes(path))addScript('award-school-branding.js?v=20260814a','rusAwardSchoolBranding',true);
    if(path==='stat-leaders.html')addScript('stat-leaders-branding.js?v=20260814b','rusStatLeadersBranding',true);
    if(path==='map.html')addScript('map-distance-tools.js?v=20260814b','rusMapDistanceTools',true);
    if(path==='storylines.html')addScript('storylines-live-fix.js?v=20260814a','rusStorylinesLiveFix',true);
    if(path==='all-state-watch.html')addScript('all-state-region-order.js?v=20260814a','rusAllStateRegionOrder',true);
  }
  function setup(){
    injectStyles();const host=document.querySelector('nav .nav-content');if(!host){loadExtras();return}host.classList.add('rus-nav');host.innerHTML=[link('Home','index.html','home-link'),link('Teams','teams.html'),link('Games','games.html'),link('Scoreboard','scoreboard.html'),link('Rankings','rankings.html'),link('Standings','standings.html'),dropdown('Stats','stats'),link('Storylines','storylines.html'),dropdown('History','history'),dropdown('Analytics','analytics'),dropdown('Simulators','simulators')].join('');
    document.querySelectorAll('.rus-nav details').forEach(d=>d.addEventListener('toggle',()=>{if(!d.open)return;document.querySelectorAll('.rus-nav details').forEach(other=>{if(other!==d)other.open=false})}));
    const logo=document.querySelector('header .logo');if(logo&&!logo.closest('a')){logo.classList.add('header-home');logo.setAttribute('title','Home');logo.setAttribute('role','link');logo.setAttribute('tabindex','0');const go=()=>{location.href='index.html'};logo.addEventListener('click',go);logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})}loadExtras()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();