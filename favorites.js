(()=>{
  'use strict';

  const TEAM_KEY='rus-favorite-teams-v1';
  const PAGE_KEY='rus-favorite-pages-v1';
  const TEAM_LIMIT=5;
  const PAGE_LIMIT=20;
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function fire(){window.dispatchEvent(new CustomEvent('rus-favorites-changed'))}

  function loadTeams(){
    try{const x=JSON.parse(localStorage.getItem(TEAM_KEY)||'[]');return Array.isArray(x)?x:[]}
    catch{return[]}
  }
  function saveTeams(a){
    try{localStorage.setItem(TEAM_KEY,JSON.stringify([...new Set(a.map(norm))].slice(0,TEAM_LIMIT)));fire()}
    catch{}
  }

  function cleanPage(x){
    if(!x||typeof x!=='object')return null;
    const url=String(x.url||'').trim();
    const title=String(x.title||'').trim();
    if(!url||!title)return null;
    return{url,title};
  }
  function loadPages(){
    try{
      const raw=JSON.parse(localStorage.getItem(PAGE_KEY)||'[]');
      if(!Array.isArray(raw))return[];
      const seen=new Set(),out=[];
      raw.forEach(item=>{const p=cleanPage(item);if(!p||seen.has(p.url))return;seen.add(p.url);out.push(p)});
      return out.slice(0,PAGE_LIMIT);
    }catch{return[]}
  }
  function savePages(a){
    try{
      const seen=new Set(),out=[];
      (Array.isArray(a)?a:[]).forEach(item=>{const p=cleanPage(item);if(!p||seen.has(p.url))return;seen.add(p.url);out.push(p)});
      localStorage.setItem(PAGE_KEY,JSON.stringify(out.slice(0,PAGE_LIMIT)));
      fire();
    }catch{}
  }

  function currentPageUrl(){
    const file=location.pathname.split('/').pop()||'index.html';
    return file+(location.search||'');
  }
  function pageTitle(){
    const preferred=document.querySelector('.page-title, main h1, main h2, #page h1, #page h2');
    let t=(preferred?.textContent||document.title||currentPageUrl()).replace(/\s+/g,' ').trim();
    t=t.replace(/\s*\|\s*Rural Utah Sports\s*$/i,'').trim();
    return t||currentPageUrl();
  }
  function hasPage(url=currentPageUrl()){return loadPages().some(p=>p.url===url)}
  function togglePage(url=currentPageUrl(),title=pageTitle()){
    const pages=loadPages();
    if(pages.some(p=>p.url===url)){savePages(pages.filter(p=>p.url!==url));return true}
    if(pages.length>=PAGE_LIMIT)return false;
    savePages([...pages,{url,title}]);
    return true;
  }
  function removePage(url){savePages(loadPages().filter(p=>p.url!==url))}

  window.RUSFavorites={
    load:loadTeams,
    save:saveTeams,
    has:t=>loadTeams().includes(norm(t)),
    toggle(t){
      const n=norm(t),a=loadTeams();
      if(a.includes(n))saveTeams(a.filter(x=>x!==n));
      else if(a.length<TEAM_LIMIT)saveTeams([...a,n]);
      else return false;
      return true;
    },
    loadPages,
    savePages,
    hasPage,
    togglePage,
    removePage
  };

  function injectStyles(){
    if(document.getElementById('rus-favorites-styles'))return;
    const style=document.createElement('style');
    style.id='rus-favorites-styles';
    style.textContent=`
      .rus-favorite-team,.rus-favorite-page{background:#171717;color:#fff;border:1px solid #555;border-radius:6px;padding:9px 12px;font-weight:900;text-transform:uppercase;cursor:pointer}
      .rus-favorite-team{margin-top:14px}.rus-favorite-team.on,.rus-favorite-page.on{border-color:#F14D07;color:#F14D07}
      .rus-favorite-page{display:inline-flex;align-items:center;gap:6px;margin:0 0 16px;font-size:11px}
      .rus-favorite-page:hover{border-color:#F14D07}
      .rus-favorites-nav .drop{min-width:270px}
      .rus-favorites-nav .fav-empty{padding:13px 14px;color:#888;font-size:11px;font-weight:800;text-transform:none;line-height:1.4}
      .rus-favorites-nav .fav-row{display:flex;align-items:stretch;border-bottom:1px solid #242424}
      .rus-favorites-nav .fav-row:last-child{border-bottom:0}
      .rus-favorites-nav .fav-row>a{flex:1;min-width:0;border-bottom:0!important;overflow:hidden;text-overflow:ellipsis}
      .rus-favorites-nav .fav-remove{width:38px;border:0;border-left:1px solid #242424;background:#111;color:#888;font-size:18px;font-weight:900;cursor:pointer}
      .rus-favorites-nav .fav-remove:hover{background:#F14D07;color:#000}
      .rus-favorites-nav .fav-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#F14D07;color:#000;font-size:9px}
      @media(max-width:700px){.rus-favorites-nav .drop{width:100%}.rus-favorite-page{margin-bottom:13px}}
    `;
    document.head.appendChild(style);
  }

  function addPageButton(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file==='index.html'||document.getElementById('rusFavoritePage'))return;
    const title=document.querySelector('.page-title, main h1, main h2, #page h1, #page h2');
    if(!title)return;
    const b=document.createElement('button');
    b.id='rusFavoritePage';
    b.type='button';
    b.className='rus-favorite-page';
    const paint=()=>{const on=hasPage();b.classList.toggle('on',on);b.textContent=on?'★ Favorited':'☆ Favorite Page';b.setAttribute('aria-pressed',String(on))};
    b.addEventListener('click',()=>{
      if(togglePage()===false){alert(`You can save up to ${PAGE_LIMIT} favorite pages. Remove one from Favorites first.`);return}
      paint();
    });
    title.insertAdjacentElement('afterend',b);
    paint();
  }

  function buildFavoritesNav(){
    const nav=document.querySelector('.nav-content.rus-nav');
    if(!nav)return;
    let details=document.getElementById('rusFavoritePagesNav');
    if(!details){
      details=document.createElement('details');
      details.id='rusFavoritePagesNav';
      details.className='rus-favorites-nav';
      const myTeams=nav.querySelector('a[href="my-teams.html"]');
      if(myTeams)myTeams.insertAdjacentElement('afterend',details);else nav.appendChild(details);
      details.addEventListener('toggle',()=>{if(!details.open)return;document.querySelectorAll('.rus-nav details').forEach(other=>{if(other!==details)other.open=false})});
    }
    const pages=loadPages();
    const rows=pages.length?pages.map(p=>`<div class="fav-row"><a href="${esc(p.url)}"${p.url===currentPageUrl()?' class="active" aria-current="page"':''}>${esc(p.title)}</a><button class="fav-remove" type="button" data-url="${esc(p.url)}" aria-label="Remove ${esc(p.title)} from favorites" title="Remove">×</button></div>`).join(''):'<div class="fav-empty">No favorite pages yet. Use “☆ Favorite Page” on any page to save it here.</div>';
    details.innerHTML=`<summary>Favorites${pages.length?` <span class="fav-count">${pages.length}</span>`:''}<span class="caret">▼</span></summary><div class="drop">${rows}</div>`;
    details.querySelectorAll('.fav-remove').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();removePage(b.dataset.url||'');buildFavoritesNav();const pageButton=document.getElementById('rusFavoritePage');if(pageButton){const on=hasPage();pageButton.classList.toggle('on',on);pageButton.textContent=on?'★ Favorited':'☆ Favorite Page';pageButton.setAttribute('aria-pressed',String(on))}}));
  }

  function addTeamButton(){
    if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
    const team=new URLSearchParams(location.search).get('team');
    if(!team)return;
    function add(){
      const hero=document.querySelector('#page .hero-content');
      if(!hero||document.getElementById('rusFavoriteTeam'))return;
      const b=document.createElement('button');
      b.id='rusFavoriteTeam';
      b.className='rus-favorite-team';
      const paint=()=>{const on=window.RUSFavorites.has(team);b.classList.toggle('on',on);b.textContent=on?'★ Saved to My Teams':'☆ Add to My Teams'};
      b.onclick=()=>{if(window.RUSFavorites.toggle(team)===false){alert('You can save up to 5 teams. Remove one from My Teams first.');return}paint()};
      hero.appendChild(b);paint();
    }
    add();
    const page=document.getElementById('page');
    if(page&&!document.getElementById('rusFavoriteTeam')){const o=new MutationObserver(()=>{add();if(document.getElementById('rusFavoriteTeam'))o.disconnect()});o.observe(page,{childList:true,subtree:true})}
  }

  function setup(){
    injectStyles();
    addPageButton();
    buildFavoritesNav();
    addTeamButton();
    window.addEventListener('rus-favorites-changed',()=>{buildFavoritesNav()});
    if(!document.getElementById('rusFavoritePage')){
      const main=document.querySelector('main,#page');
      if(main){const o=new MutationObserver(()=>{addPageButton();if(document.getElementById('rusFavoritePage'))o.disconnect()});o.observe(main,{childList:true,subtree:true})}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();