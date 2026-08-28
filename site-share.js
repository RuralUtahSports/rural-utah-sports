(()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  function recordsState(){
    if(path!=='records.html')return;const initial=new URLSearchParams(location.search);let tries=0;
    const sync=()=>{const q=new URLSearchParams(),mode=document.querySelector('.mode-button.active')?.dataset.mode||'alltime',stat=document.getElementById('statSelect')?.value||'',cls=document.getElementById('classSelect')?.value||'all';if(mode!=='alltime')q.set('mode',mode);if(stat&&stat!=='currentElo')q.set('stat',stat);if(cls&&cls!=='all')q.set('class',cls);history.replaceState(null,'',`records.html${q.toString()?'?'+q:''}`)};
    const apply=()=>{tries++;const stat=document.getElementById('statSelect'),cls=document.getElementById('classSelect');if(!stat||!stat.options.length||!cls||!cls.options.length){if(tries<70)setTimeout(apply,100);return}if(initial.get('mode')==='season')document.querySelector('.mode-button[data-mode="season"]')?.click();const wanted=initial.get('stat');if(wanted&&[...stat.options].some(o=>o.value===wanted)){stat.value=wanted;stat.dispatchEvent(new Event('change'))}const c=initial.get('class');if(c&&[...cls.options].some(o=>o.value===c)){cls.value=c;cls.dispatchEvent(new Event('change'))}sync()};
    document.querySelectorAll('.mode-button').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));document.getElementById('statSelect')?.addEventListener('change',()=>setTimeout(sync,0));document.getElementById('classSelect')?.addEventListener('change',()=>setTimeout(sync,0));document.getElementById('statChips')?.addEventListener('click',e=>{if(e.target.closest('.stat-chip'))setTimeout(sync,0)});setTimeout(apply,120);
  }
  function greatestSeasonsState(){
    if(path!=='greatest-seasons.html')return;const initial=new URLSearchParams(location.search);let tries=0;
    const ids=['searchBox','yearFilter','teamFilter','sortBy','sortDirection'];
    const sync=()=>{const q=new URLSearchParams(),search=document.getElementById('searchBox')?.value.trim()||'',year=document.getElementById('yearFilter')?.value||'all',team=document.getElementById('teamFilter')?.value||'all',sort=document.getElementById('sortBy')?.value||'Rank',dir=document.getElementById('sortDirection')?.value||'asc';if(search)q.set('search',search);if(year!=='all')q.set('year',year);if(team!=='all')q.set('team',team);if(sort!=='Rank')q.set('sort',sort);if(dir!=='asc')q.set('dir',dir);history.replaceState(null,'',`greatest-seasons.html${q.toString()?'?'+q:''}`)};
    const apply=()=>{tries++;const year=document.getElementById('yearFilter'),team=document.getElementById('teamFilter');if(!year||year.options.length<2||!team||team.options.length<2){if(tries<70)setTimeout(apply,100);return}const values={searchBox:initial.get('search'),yearFilter:initial.get('year'),teamFilter:initial.get('team'),sortBy:initial.get('sort'),sortDirection:initial.get('dir')};for(const id of ids){const el=document.getElementById(id),v=values[id];if(!el||!v)continue;if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===v))continue;el.value=v;el.dispatchEvent(new Event(id==='searchBox'?'input':'change',{bubbles:true}))}sync()};
    for(const id of ids){const el=document.getElementById(id);el?.addEventListener(id==='searchBox'?'input':'change',()=>setTimeout(sync,0))}document.querySelector('.clear-button')?.addEventListener('click',()=>setTimeout(sync,0));setTimeout(apply,120);
  }
  function gamesDeepLink(){
    if(path!=='games.html')return;const q=new URLSearchParams(location.search),year=q.get('year'),type=q.get('type'),sort=q.get('sort');if(!year&&!type&&!sort)return;let tries=0;const apply=()=>{tries++;const y=document.getElementById('year'),t=document.getElementById('type'),s=document.getElementById('sort');if(!y||!t||!s||(year&&![...y.options].some(o=>o.value===year))){if(tries<100)setTimeout(apply,100);return}if(year)y.value=year;if(type&&[...t.options].some(o=>o.value===type))t.value=type;if(sort&&[...s.options].some(o=>o.value===sort))s.value=sort;y.dispatchEvent(new Event('change',{bubbles:true}))};setTimeout(apply,180);
  }
  function championshipDeepLink(){
    if(path!=='championships.html')return;
    const q=new URLSearchParams(location.search),wantedYear=q.get('year'),wantedClass=q.get('class'),wantedTeam=q.get('team');
    if(!wantedYear&&!wantedClass&&!wantedTeam)return;
    let tries=0;
    const jump=()=>{
      tries++;
      const sec=document.querySelector('.bracket-test'),year=document.getElementById('bracketYear'),active=document.querySelector('.bracket-tab.active'),grid=document.getElementById('bracketGrid');
      if(!sec||!year||!active||!grid||grid.querySelector('.bracket-loading')){if(tries<140)setTimeout(jump,75);return}
      const activeClass=String(active.dataset.cls||active.textContent||'').trim();
      if((wantedYear&&year.value!==wantedYear)||(wantedClass&&activeClass!==wantedClass)){if(tries<140)setTimeout(jump,75);return}
      sec.style.scrollMarginTop='62px';
      sec.scrollIntoView({behavior:'auto',block:'start'});
      setTimeout(()=>sec.scrollIntoView({behavior:'auto',block:'start'}),140);
    };
    setTimeout(jump,0);
  }
  function addRelated(){
    const main=document.querySelector('main');if(!main||main.querySelector('.rus-related'))return;const links=[],add=(name,href,desc)=>links.push([name,href,desc]);
    if(path==='teams.html'){add('Program Leaderboard','programs.html','Rank every program');add('Season Explorer','season.html','Browse by year');add('Team Comparison','compare.html','Compare programs');add('Games','games.html','Game history')}
    else if(path==='rankings.html'||path==='standings.html'){add('Games','games.html','Historical results');add('Weekly Simulator','simulators.html#weekly','Make picks');add('Program Leaderboard','programs.html','Historical context');add('ELO','elo.html','Ratings history')}
    else if(path==='scorigami.html'){add('Games','games.html','Search every result');add('Season Explorer','season.html','Browse by year');add('Records','records.html','Record book');add('Program Leaderboard','programs.html','All programs')}
    else if(path==='out-of-state.html'){add('Games','games.html','Full database');add('Teams','teams.html','Team explorer');add('Program Leaderboard','programs.html','Program history');add('ELO','elo.html','Ratings history')}
    else if(path==='compare.html'){add('Teams','teams.html','Team explorer');add('Games','games.html','Series results');add('Program Leaderboard','programs.html','All programs');add('ELO','elo.html','Ratings history')}
    else if(path==='simulators.html'){add('Rankings','rankings.html','Current rankings');add('Standings','standings.html','Current races');add('ELO','elo.html','Ratings history');add('Games','games.html','Historical results')}
    else if(path==='greatest-seasons.html'){add('Season Explorer','season.html','Full season context');add('Program Leaderboard','programs.html','Program history');add('Championships','championships.html','Titles and brackets');add('Records','records.html','Record book')}
    if(!links.length)return;
    if(!document.getElementById('rus-share-extra-style')){const s=document.createElement('style');s.id='rus-share-extra-style';s.textContent='.rus-related{margin:34px 0 5px;background:#000;border:1px solid #333;border-radius:8px;padding:20px}.rus-related h2{text-transform:uppercase;font-size:20px;border-left:5px solid #F14D07;padding-left:11px;margin-bottom:13px}.rus-related-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.rus-related a{background:#171717;border:1px solid #333;color:#fff;text-decoration:none;border-radius:6px;padding:13px;font-weight:800;font-size:12px}.rus-related a:hover{border-color:#F14D07}.rus-related a span{display:block;color:#777;font-size:9px;text-transform:uppercase;margin-top:4px}@media(max-width:850px){.rus-related-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.rus-related-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}
    main.insertAdjacentHTML('beforeend',`<section class="rus-related"><h2>Related</h2><div class="rus-related-grid">${links.map(([n,h,d])=>`<a href="${h}">${esc(n)}<span>${esc(d)}</span></a>`).join('')}</div></section>`);
  }
  function shareButton(){
    const main=document.querySelector('main');if(!main||document.getElementById('rusShareView'))return;const b=document.createElement('button'),mobile=window.matchMedia?.('(max-width:700px)').matches;b.id='rusShareView';b.type='button';b.textContent='Copy Share Link';b.style.cssText=mobile?'display:block;margin:16px 16px 92px auto;background:#1b1b1b;color:#fff;border:1px solid #444;border-radius:999px;padding:9px 13px;font:700 10px Arial;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)':'position:fixed;right:16px;bottom:76px;z-index:40;background:#1b1b1b;color:#fff;border:1px solid #444;border-radius:999px;padding:9px 13px;font:700 10px Arial;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)';b.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);const old=b.textContent;b.textContent='Link Copied';setTimeout(()=>b.textContent=old,1400)}catch(e){prompt('Copy this link:',location.href)}};if(mobile)main.insertAdjacentElement('afterend',b);else document.body.appendChild(b);
  }
  function uiHotfixes(){
    if(document.getElementById('rus-20260818-ui-hotfix'))return;
    let css='';
    if(['mvp-race.html','all-state-watch.html','all-utah.html','awards-2025.html'].includes(path))css+=`
      .rus-award-name-pill .rus-player-link,
      .rus-award-name-pill .rus-player-link:visited,
      .rus-award-name-pill .rus-player-link:hover,
      .rus-award-name-pill .rus-player-link:active{color:inherit!important}
    `;
    if(path==='team-stats.html')css+=`
      @media(min-width:901px){
        body[data-rus-page="team-stats.html"] table.rus-desktop-table thead th,
        body[data-rus-page="team-stats.html"] .rank-table thead th{top:0!important;z-index:12!important}
      }
    `;
    if(!css)return;const s=document.createElement('style');s.id='rus-20260818-ui-hotfix';s.textContent=css;document.head.appendChild(s);
  }
  function init(){uiHotfixes();recordsState();greatestSeasonsState();gamesDeepLink();championshipDeepLink();setTimeout(addRelated,700);shareButton()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
