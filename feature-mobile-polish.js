(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const featurePages=new Set(['search.html','streaks.html','playoff-picture.html','player-compare.html','game-week.html','upsets.html','milestones.html','my-teams.html']);
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const safeHex=(v,f)=>/^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(String(v||'').trim())?String(v).trim():f;

function addStyles(){
  if(document.getElementById('rus-feature-mobile-polish'))return;
  const s=document.createElement('style');
  s.id='rus-feature-mobile-polish';
  s.textContent=`
.rus-mobile-nav-bar{display:none}
.rus-feature-team-link{display:inline-flex!important;align-items:center;gap:7px;max-width:100%;vertical-align:middle}
.rus-feature-team-logo{width:26px;height:26px;object-fit:contain;object-position:center;flex:0 0 26px;display:block}
.rus-feature-team-card{position:relative;border-left:4px solid var(--rus-team-color,#F14D07)!important;padding-left:12px!important}
.rus-feature-result-logo{width:34px;height:34px;object-fit:contain;object-position:center;float:right;margin:0 0 6px 10px}
.team-pill.rus-feature-team-link{padding:5px 9px 5px 5px!important;line-height:1.1!important;white-space:normal!important}
@media(max-width:700px){
  header{padding:9px 12px!important}
  .header-content{flex-direction:row!important;text-align:left!important;gap:10px!important;align-items:center!important}
  .logo{width:58px!important;height:58px!important;flex:0 0 58px!important}
  .site-title{min-width:0}
  .site-title h1{font-size:20px!important;letter-spacing:1px!important;line-height:1.05!important;white-space:normal!important}
  .site-title p{font-size:11px!important;line-height:1.25!important;margin-top:4px!important}
  nav{position:relative!important}
  .rus-mobile-nav-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;background:#090909;border-bottom:1px solid #2b2b2b}
  .rus-mobile-nav-toggle{appearance:none;border:1px solid #444;background:#171717;color:#fff;border-radius:7px;min-height:42px;padding:9px 13px;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.4px}
  .rus-mobile-nav-current{color:#F14D07;font-size:10px;font-weight:1000;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
  .nav-content.rus-nav.rus-mobile-nav-panel{display:none!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:68vh;overflow-y:auto;overscroll-behavior:contain;border-top:1px solid #252525}
  nav.rus-mobile-open .nav-content.rus-nav.rus-mobile-nav-panel{display:grid!important}
  nav.rus-mobile-open .rus-mobile-nav-toggle{background:#F14D07;color:#000;border-color:#F14D07}
  .rus-nav>a,.rus-nav details>summary{min-height:44px!important;padding:10px 6px!important;font-size:11px!important}
  .rus-nav .drop a{padding:10px 7px!important;font-size:11px!important}
  .container{padding-top:17px!important;padding-left:8px!important;padding-right:8px!important}
  body[data-feature-page] .feature-hero{padding:14px 12px!important;margin-bottom:12px!important;border-top-width:4px!important}
  body[data-feature-page] .feature-hero h2{font-size:21px!important;line-height:1.08!important;margin-bottom:6px!important}
  body[data-feature-page] .feature-hero p{font-size:12px!important;line-height:1.42!important}
  body[data-feature-page] .feature-note{font-size:10px!important;padding:9px 10px!important;margin-top:8px!important}
  body[data-feature-page] .section-title{font-size:16px!important;line-height:1.15!important;margin:20px 0 8px!important;padding-left:8px!important;border-left-width:4px!important}
  body[data-feature-page] .grid,body[data-feature-page] .grid.two{gap:8px!important}
  body[data-feature-page] .card{padding:11px!important}
  body[data-feature-page] .card h3{font-size:12px!important}
  body[data-feature-page] .card p{font-size:10px!important}
  body[data-feature-page] .toolbar{gap:8px!important;margin-bottom:12px!important}
  body[data-feature-page] .field label{font-size:9px!important}
  body[data-feature-page] .field input,body[data-feature-page] .field select{padding:10px!important}
  body[data-feature-page] .table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:6px!important}
  body[data-feature-page] table{min-width:560px!important}
  body[data-feature-page] th,body[data-feature-page] td{padding:8px 6px!important;font-size:10px!important}
  body[data-feature-page] th{font-size:8px!important}
  body[data-feature-page] .rank{font-size:15px!important}
  body[data-feature-page] .big{font-size:25px!important}
  body[data-feature-page] .result,body[data-feature-page] .card-link{padding:11px!important}
  .rus-feature-team-logo{width:23px;height:23px;flex-basis:23px}
  .rus-feature-result-logo{width:30px;height:30px}
  .team-pill.rus-feature-team-link{padding:4px 7px 4px 4px!important;gap:5px!important;font-size:10px!important}
}
`;
  document.head.appendChild(s);
}

function pageLabel(){
  const active=document.querySelector('.rus-nav a.active,.rus-nav details.active>summary');
  if(active)return active.textContent.replace('▼','').trim();
  const h=document.querySelector('.feature-hero h2,.page-title,h2');
  return h?.textContent?.trim()||'Menu';
}

function setupMobileNav(){
  const nav=document.querySelector('nav');
  const host=nav?.querySelector('.nav-content.rus-nav');
  if(!nav||!host)return false;
  if(nav.querySelector('.rus-mobile-nav-bar'))return true;
  host.classList.add('rus-mobile-nav-panel');
  const bar=document.createElement('div');
  bar.className='rus-mobile-nav-bar';
  bar.innerHTML=`<button class="rus-mobile-nav-toggle" type="button" aria-expanded="false">☰ Menu</button><span class="rus-mobile-nav-current"></span>`;
  nav.insertBefore(bar,host);
  const btn=bar.querySelector('.rus-mobile-nav-toggle');
  bar.querySelector('.rus-mobile-nav-current').textContent=pageLabel();
  const setOpen=open=>{
    nav.classList.toggle('rus-mobile-open',open);
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent=open?'✕ Close':'☰ Menu';
  };
  btn.addEventListener('click',()=>setOpen(!nav.classList.contains('rus-mobile-open')));
  host.addEventListener('click',e=>{
    if(e.target.closest('a')&&matchMedia('(max-width:700px)').matches)setOpen(false);
  });
  const sync=()=>{if(!matchMedia('(max-width:700px)').matches)setOpen(false)};
  addEventListener('resize',sync,{passive:true});
  return true;
}

function ensureNav(){
  if(setupMobileNav())return;
  const nav=document.querySelector('nav');
  if(!nav)return;
  const mo=new MutationObserver(()=>{if(setupMobileNav())mo.disconnect()});
  mo.observe(nav,{childList:true,subtree:true});
}

function loadSchoolAssets(){
  if(window.RUSSchoolAssets)return Promise.resolve(window.RUSSchoolAssets);
  return new Promise(resolve=>{
    let s=document.querySelector('script[data-rus-feature-assets]');
    if(!s){
      s=document.createElement('script');
      s.src='school-assets-bundle.js?v=20260818-perf1';
      s.async=true;
      s.dataset.rusFeatureAssets='1';
      document.body.appendChild(s);
    }
    const done=()=>resolve(window.RUSSchoolAssets||null);
    s.addEventListener('load',done,{once:true});
    s.addEventListener('error',done,{once:true});
    setTimeout(done,1800);
  });
}

function teamFromLink(a){
  try{return new URL(a.href,location.href).searchParams.get('team')||a.textContent.trim()}catch{return a.textContent.trim()}
}

async function brandFeatureTeams(){
  if(!featurePages.has(path))return;
  const root=document.getElementById('featureRoot')||document.querySelector('main');
  if(!root)return;
  const [teams,assets]=await Promise.all([
    fetch(`teams-data.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    loadSchoolAssets()
  ]);
  const map=new Map((teams||[]).filter(t=>t?.team).map(t=>[norm(t.team),t]));
  const logoFor=team=>assets?.logoUrl?.(team,map.get(norm(team)))||'';
  const apply=()=>{
    root.querySelectorAll('a[href*="team.html?team="]').forEach(a=>{
      const team=teamFromLink(a);if(!team)return;
      const info=map.get(norm(team));
      const bg=safeHex(info?.backgroundColor,'#222222'),fg=safeHex(info?.textColor,'#FFFFFF');
      const src=logoFor(team);
      if(a.classList.contains('team-pill')||a.closest('td')||a.closest('.compare-side')||a.closest('.card')){
        a.classList.add('rus-feature-team-link');
        a.style.setProperty('--bg',bg);a.style.setProperty('--fg',fg);a.style.backgroundColor=bg;a.style.color=fg;
        if(src&&!a.querySelector('.rus-feature-team-logo')){
          const img=document.createElement('img');img.className='rus-feature-team-logo';img.alt='';img.loading='lazy';img.decoding='async';img.src=src;a.prepend(img);
        }
      }else{
        a.classList.add('rus-feature-team-card');a.style.setProperty('--rus-team-color',bg);
        if(src&&!a.querySelector('.rus-feature-result-logo')){
          const img=document.createElement('img');img.className='rus-feature-result-logo';img.alt='';img.loading='lazy';img.decoding='async';img.src=src;
          const target=a.querySelector('strong')||a.firstElementChild;
          if(target)target.insertAdjacentElement('beforebegin',img);else a.prepend(img);
        }
      }
    });
  };
  apply();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }).observe(root,{childList:true,subtree:true});
}

function init(){addStyles();ensureNav();brandFeatureTeams()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
