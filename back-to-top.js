(()=>{
  if(document.getElementById('rus-back-to-top')) return;

  const style=document.createElement('style');
  style.textContent=`
    #rus-back-to-top{
      position:fixed;
      right:max(16px,env(safe-area-inset-right));
      bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      min-width:52px;
      height:48px;
      padding:0 14px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;
      background:#F14D07;
      color:#000;
      font:900 12px/1 Arial,Helvetica,sans-serif;
      text-transform:uppercase;
      letter-spacing:.4px;
      box-shadow:0 6px 22px rgba(0,0,0,.38);
      cursor:pointer;
      opacity:0;
      visibility:hidden;
      transform:translateY(10px);
      transition:opacity .18s ease,transform .18s ease,visibility .18s ease;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    #rus-back-to-top.show{opacity:1;visibility:visible;transform:translateY(0)}
    #rus-back-to-top:hover{filter:brightness(1.06)}
    #rus-back-to-top:focus-visible{outline:3px solid #fff;outline-offset:3px}
    #rus-back-to-top .rus-top-arrow{font-size:20px;line-height:1;transform:translateY(-1px)}
    .rus-champ-winners-title{font-size:22px;font-weight:900;text-transform:uppercase;border-left:5px solid #F14D07;padding-left:11px;margin:24px 0 8px}
    .rus-champ-winners-scroll{max-height:480px!important;overflow-y:auto!important;overflow-x:auto!important;overscroll-behavior:contain;border:1px solid #444!important;box-shadow:inset 0 -18px 24px -22px rgba(255,255,255,.28)}
    .rus-champ-winners-scroll thead th{position:sticky!important;top:0!important;z-index:8!important}
    @media(max-width:700px){
      #rus-back-to-top{right:max(12px,env(safe-area-inset-right));bottom:max(14px,calc(env(safe-area-inset-bottom) + 8px));height:46px;padding:0 13px;min-width:48px}
      .rus-champ-winners-scroll{max-height:430px!important}
      .rus-champ-winners-title{font-size:19px}
    }
    @media(prefers-reduced-motion:reduce){#rus-back-to-top{transition:none}}
  `;
  document.head.appendChild(style);

  const button=document.createElement('button');
  button.id='rus-back-to-top';
  button.type='button';
  button.setAttribute('aria-label','Back to top');
  button.innerHTML='<span class="rus-top-arrow" aria-hidden="true">↑</span><span>Top</span>';
  document.body.appendChild(button);

  let ticking=false;
  const update=()=>{
    button.classList.toggle('show',window.scrollY>500);
    ticking=false;
  };
  const onScroll=()=>{
    if(!ticking){requestAnimationFrame(update);ticking=true;}
  };

  window.addEventListener('scroll',onScroll,{passive:true});
  button.addEventListener('click',()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
  });
  update();

  function setupCompactTeamFilters(){
    if(!/(^|\/)teams\.html$/.test(location.pathname)&&!location.pathname.endsWith('/teams'))return;
    const panel=document.querySelector('.filter-panel'),title=panel?.querySelector('.filter-title'),grid=panel?.querySelector('.filter-grid');
    if(!panel||!title||!grid||document.getElementById('rusMobileTeamFilterToggle'))return;
    document.body.classList.add('rus-compact-team-filters');
    const compactStyle=document.createElement('style');
    compactStyle.id='rus-compact-team-filter-style';
    compactStyle.textContent=`
      .rus-mobile-team-filter-toggle{display:none}
      @media(max-width:700px){
        body.rus-compact-team-filters .compare-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:34px!important;height:auto!important;padding:7px 10px!important;margin:0 0 10px!important;font-size:10px!important;border-radius:6px!important}
        body.rus-compact-team-filters .filter-panel{padding:10px 12px!important;margin-bottom:12px!important;border-top-width:3px!important;border-radius:8px!important}
        body.rus-compact-team-filters .filter-title{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0 0 8px!important;font-size:14px!important;line-height:1!important}
        body.rus-compact-team-filters .rus-mobile-team-filter-toggle{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:32px!important;height:32px!important;padding:0 10px!important;border:1px solid #444!important;border-radius:999px!important;background:#171717!important;color:#fff!important;font:900 10px/1 Arial,Helvetica,sans-serif!important;text-transform:uppercase!important;letter-spacing:.35px!important}
        body.rus-compact-team-filters .rus-mobile-team-filter-toggle[aria-expanded="true"]{border-color:#F14D07!important;color:#F14D07!important}
        body.rus-compact-team-filters .filter-grid{display:grid!important;grid-template-columns:1fr!important;gap:7px!important}
        body.rus-compact-team-filters .filter-grid>.filter-group:first-child{display:flex!important;gap:0!important}
        body.rus-compact-team-filters .filter-grid>.filter-group:first-child label{display:none!important}
        body.rus-compact-team-filters .filter-grid>.filter-group:nth-child(n+2){display:none!important}
        body.rus-compact-team-filters .filter-panel.rus-filter-open .filter-grid>.filter-group:nth-child(n+2){display:flex!important}
        body.rus-compact-team-filters .filter-panel.rus-filter-open .filter-grid>.filter-group{gap:4px!important}
        body.rus-compact-team-filters .filter-input{height:42px!important;min-height:42px!important;padding:0 12px!important;font-size:16px!important}
        body.rus-compact-team-filters .filter-select,body.rus-compact-team-filters .clear-button{height:40px!important;min-height:40px!important;font-size:14px!important}
        body.rus-compact-team-filters .filter-panel.rus-filter-open{padding-bottom:12px!important}
        body.rus-compact-team-filters .result-count{margin:0 0 8px!important;font-size:12px!important;line-height:1.2!important}
      }
    `;
    document.head.appendChild(compactStyle);
    const toggle=document.createElement('button');
    toggle.id='rusMobileTeamFilterToggle';
    toggle.className='rus-mobile-team-filter-toggle';
    toggle.type='button';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','teamsFilterGrid');
    toggle.textContent='Filters';
    grid.id=grid.id||'teamsFilterGrid';
    title.appendChild(toggle);
    const sync=()=>{const open=panel.classList.contains('rus-filter-open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Hide Filters':'Filters'};
    toggle.addEventListener('click',()=>{panel.classList.toggle('rus-filter-open');sync()});
    const clear=panel.querySelector('.clear-button');
    clear?.addEventListener('click',()=>{if(matchMedia('(max-width:700px)').matches){panel.classList.remove('rus-filter-open');sync()}},{capture:false});
    matchMedia('(min-width:701px)').addEventListener?.('change',e=>{if(e.matches){panel.classList.remove('rus-filter-open');sync()}});
  }
  setupCompactTeamFilters();

  if(/(^|\/)championships\.html$/.test(location.pathname)||location.pathname.endsWith('/championships')){
    const champRows=document.getElementById('champRows');
    const winnersWrap=champRows?.closest('.table-wrap');
    const resultCount=document.getElementById('resultCount');
    if(winnersWrap){
      winnersWrap.classList.add('rus-champ-winners-scroll');
      if(resultCount&&!document.getElementById('rusChampWinnersTitle')){
        const title=document.createElement('h3');
        title.id='rusChampWinnersTitle';
        title.className='rus-champ-winners-title';
        title.textContent='Championship Winners';
        resultCount.before(title);
      }
    }

    const summary=document.getElementById('summary');
    if(summary&&!document.getElementById('playoffBracketPreview')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='playoff-brackets-2025.css';
      document.head.appendChild(css);
      const section=document.createElement('section');
      section.className='playoff-preview';
      section.id='playoffBracketPreview';
      section.innerHTML=`
        <div class="playoff-preview-head">
          <div><div class="playoff-preview-title">2025 Playoff Brackets</div><div class="playoff-preview-sub">Bracket preview using the 2025 UHSAA All Time Playoffs sheet. Choose a classification to see the path to the title.</div></div>
          <div class="bracket-tabs" aria-label="2025 playoff classification">
            <button class="bracket-tab" data-cls="6A">6A</button><button class="bracket-tab" data-cls="5A">5A</button><button class="bracket-tab" data-cls="4A">4A</button><button class="bracket-tab" data-cls="3A">3A</button><button class="bracket-tab" data-cls="2A">2A</button><button class="bracket-tab" data-cls="1A">1A</button><button class="bracket-tab" data-cls="8-Player">8-Player</button>
          </div>
        </div>
        <div class="bracket-scroll" aria-live="polite"></div>
        <p class="bracket-source-note">2025 prototype • Source: UHSAA All Time Playoffs. On phones, swipe the bracket sideways if needed.</p>`;
      summary.parentNode.insertBefore(section,summary);
      const js=document.createElement('script');
      js.src='playoff-brackets-2025.js';
      document.body.appendChild(js);
    }
  }
})();