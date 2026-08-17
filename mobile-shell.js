(()=>{
'use strict';
const MOBILE='(max-width:700px)';
const mq=matchMedia(MOBILE);
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
let shell=null,moreButton=null,lastFocus=null;

const icons={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z"/></svg>',
  scores:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 9h2m4 0h2M8 13h2m4 0h2"/></svg>',
  teams:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3.5 19c.5-4 2.7-6 5.5-6s5 2 5.5 6M14 14c3.5-.2 5.7 1.5 6.3 5"/></svg>',
  rankings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20V10h4v10M14 20V4h4v16M4 20h16"/></svg>',
  more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>'
};

function activeFor(key){
  if(key==='home')return path==='index.html';
  if(key==='scores')return ['scoreboard.html','game.html'].includes(path);
  if(key==='teams')return ['teams.html','team.html','player.html','my-teams.html'].includes(path);
  if(key==='rankings')return ['rankings.html','standings.html'].includes(path);
  return !['index.html','scoreboard.html','game.html','teams.html','team.html','player.html','my-teams.html','rankings.html','standings.html'].includes(path);
}
function navLink(key,label,href){return `<a class="rus-mobile-nav-item${activeFor(key)?' active':''}" href="${href}"${activeFor(key)?' aria-current="page"':''}>${icons[key]}<span>${label}</span></a>`}

function addStyles(){
  if(document.getElementById('rus-mobile-shell-style'))return;
  const s=document.createElement('style');s.id='rus-mobile-shell-style';s.textContent=`
.rus-mobile-bottom-nav,.rus-mobile-menu-layer{display:none}
@media(max-width:700px){
  body.rus-mobile-shell-ready{padding-bottom:calc(72px + env(safe-area-inset-bottom))!important}
  body.rus-mobile-shell-ready>nav{display:none!important}
  body.rus-mobile-menu-open{overflow:hidden!important;touch-action:none}
  header{padding:8px 10px!important}
  header .header-content{min-height:56px!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;text-align:left!important}
  header .logo{width:52px!important;height:52px!important;min-width:52px!important;object-fit:contain!important}
  header .site-title{min-width:0!important}
  header .site-title h1{font-size:20px!important;line-height:1.05!important;letter-spacing:1px!important;white-space:normal!important}
  header .site-title p{font-size:10px!important;line-height:1.2!important;margin-top:3px!important}
  .container{padding-top:22px!important;padding-bottom:32px!important}
  .page-title{font-size:clamp(27px,8vw,34px)!important;margin-bottom:8px!important}
  .section-title{font-size:21px!important;line-height:1.15!important}
  .subtitle{font-size:14px!important;margin-bottom:18px!important}
  .summary-grid,.grid,.cards,.teams-grid,.story-grid{gap:10px!important}
  .summary,.summary-card,.card,.team-card,.story,.game-card{border-radius:8px!important}
  .filters,.controls,.toolbar{border-radius:8px!important}
  .table-wrap,.table-scroll,.rus-mobile-table-scroll{border-radius:8px!important}

  .rus-mobile-bottom-nav{position:fixed;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));left:0;right:0;bottom:0;z-index:2147483000;background:rgba(8,8,8,.97);border-top:1px solid #333;padding:5px 5px calc(5px + env(safe-area-inset-bottom));box-shadow:0 -10px 28px rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  .rus-mobile-nav-item,.rus-mobile-more-button{appearance:none;border:0;background:transparent;color:#aaa;text-decoration:none;display:flex;min-width:0;min-height:55px;padding:5px 2px 3px;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:800 10px/1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.25px;-webkit-tap-highlight-color:transparent}
  .rus-mobile-nav-item svg,.rus-mobile-more-button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  .rus-mobile-nav-item.active,.rus-mobile-more-button.active{color:#F14D07}
  .rus-mobile-nav-item:active,.rus-mobile-more-button:active{background:#1b1b1b;border-radius:8px}

  .rus-mobile-menu-layer{position:fixed;display:block;inset:0;z-index:2147483100;pointer-events:none;visibility:hidden}
  .rus-mobile-menu-layer.open{pointer-events:auto;visibility:visible}
  .rus-mobile-menu-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);opacity:0;transition:opacity .18s ease}
  .rus-mobile-menu-layer.open .rus-mobile-menu-backdrop{opacity:1}
  .rus-mobile-menu-sheet{position:absolute;left:0;right:0;bottom:0;max-height:min(82dvh,760px);overflow:auto;overscroll-behavior:contain;background:#111;border:1px solid #333;border-bottom:0;border-radius:20px 20px 0 0;box-shadow:0 -18px 45px rgba(0,0,0,.55);padding:0 14px calc(18px + env(safe-area-inset-bottom));transform:translateY(102%);transition:transform .2s ease;-webkit-overflow-scrolling:touch}
  .rus-mobile-menu-layer.open .rus-mobile-menu-sheet{transform:translateY(0)}
  .rus-mobile-menu-handle{width:42px;height:4px;border-radius:99px;background:#555;margin:8px auto 4px}
  .rus-mobile-menu-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#111;padding:10px 0 12px;border-bottom:1px solid #2c2c2c}
  .rus-mobile-menu-title{font-size:19px;font-weight:950;text-transform:uppercase;letter-spacing:.5px}
  .rus-mobile-menu-title span{color:#F14D07}
  .rus-mobile-menu-close{width:44px;height:44px;min-height:44px;border:1px solid #3a3a3a;border-radius:50%;background:#1d1d1d;color:#fff;font-size:24px;line-height:1;display:grid;place-items:center}
  .rus-mobile-menu-group{padding:16px 0 3px}
  .rus-mobile-menu-group h3{color:#F14D07;font-size:11px;letter-spacing:1.15px;text-transform:uppercase;margin:0 0 8px}
  .rus-mobile-menu-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .rus-mobile-menu-links a{min-height:48px;display:flex;align-items:center;padding:10px 11px;border:1px solid #303030;border-radius:9px;background:#191919;color:#fff;text-decoration:none;font-size:12px;font-weight:850;line-height:1.2}
  .rus-mobile-menu-links a.active,.rus-mobile-menu-links a[aria-current="page"]{border-color:#F14D07;background:#24150f;color:#F14D07}
  .rus-mobile-menu-links a:active{background:#2a2a2a}
  .rus-mobile-menu-foot{color:#777;text-align:center;font-size:10px;padding:18px 4px 2px;text-transform:uppercase;letter-spacing:.7px}
}
@media(max-width:380px){
  .rus-mobile-nav-item,.rus-mobile-more-button{font-size:9px}
  .rus-mobile-menu-links{grid-template-columns:1fr}
  header .site-title h1{font-size:18px!important}
}
@media(prefers-reduced-motion:reduce){.rus-mobile-menu-backdrop,.rus-mobile-menu-sheet{transition:none!important}}
`;
  document.head.appendChild(s)
}

function makeGroup(title,links){
  if(!links.length)return '';
  return `<section class="rus-mobile-menu-group"><h3>${title}</h3><div class="rus-mobile-menu-links">${links.map(a=>a.outerHTML).join('')}</div></section>`
}
function sheetMarkup(nav){
  const explore=[],groups=[];
  [...nav.children].forEach(node=>{
    if(node.tagName==='A'){
      const a=node.cloneNode(true);a.removeAttribute('class');
      const href=(a.getAttribute('href')||'').toLowerCase();
      if(!['index.html','teams.html','scoreboard.html','rankings.html'].includes(href))explore.push(a);
      return;
    }
    if(node.tagName==='DETAILS'){
      const title=(node.querySelector('summary')?.childNodes?.[0]?.textContent||node.querySelector('summary')?.textContent||'More').trim();
      const links=[...node.querySelectorAll('.drop a')].map(a=>{const c=a.cloneNode(true);c.removeAttribute('class');return c});
      groups.push({title,links});
    }
  });
  return `${makeGroup('Football',explore)}${groups.map(g=>makeGroup(g.title,g.links)).join('')}<div class="rus-mobile-menu-foot">Rural Utah Sports</div>`;
}
function closeMenu(){
  if(!shell)return;
  shell.classList.remove('open');shell.setAttribute('aria-hidden','true');document.body.classList.remove('rus-mobile-menu-open');
  if(moreButton)moreButton.setAttribute('aria-expanded','false');
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});
}
function openMenu(){
  if(!shell)return;
  lastFocus=document.activeElement;shell.classList.add('open');shell.setAttribute('aria-hidden','false');document.body.classList.add('rus-mobile-menu-open');
  if(moreButton)moreButton.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>shell.querySelector('.rus-mobile-menu-close')?.focus({preventScroll:true}));
}
function buildShell(){
  if(!mq.matches||document.querySelector('.rus-mobile-bottom-nav'))return;
  const nav=document.querySelector('nav .rus-nav');if(!nav)return;
  document.body.classList.add('rus-mobile-shell-ready');
  const bottom=document.createElement('div');bottom.className='rus-mobile-bottom-nav';bottom.setAttribute('role','navigation');bottom.setAttribute('aria-label','Mobile navigation');
  bottom.innerHTML=navLink('home','Home','index.html')+navLink('scores','Scores','scoreboard.html')+navLink('teams','Teams','teams.html')+navLink('rankings','Rankings','rankings.html')+`<button type="button" class="rus-mobile-more-button${activeFor('more')?' active':''}" aria-label="Open more navigation" aria-expanded="false">${icons.more}<span>More</span></button>`;
  document.body.appendChild(bottom);
  moreButton=bottom.querySelector('.rus-mobile-more-button');

  shell=document.createElement('div');shell.className='rus-mobile-menu-layer';shell.setAttribute('aria-hidden','true');
  shell.innerHTML=`<div class="rus-mobile-menu-backdrop"></div><div class="rus-mobile-menu-sheet" role="dialog" aria-modal="true" aria-label="Site navigation"><div class="rus-mobile-menu-handle"></div><div class="rus-mobile-menu-head"><div class="rus-mobile-menu-title">Explore <span>RUS</span></div><button type="button" class="rus-mobile-menu-close" aria-label="Close menu">×</button></div>${sheetMarkup(nav)}</div>`;
  document.body.appendChild(shell);
  moreButton.addEventListener('click',openMenu);
  shell.querySelector('.rus-mobile-menu-close').addEventListener('click',closeMenu);
  shell.querySelector('.rus-mobile-menu-backdrop').addEventListener('click',closeMenu);
  shell.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell?.classList.contains('open'))closeMenu()});
}
function teardown(){
  if(mq.matches)return;
  closeMenu();document.body.classList.remove('rus-mobile-shell-ready','rus-mobile-menu-open');
  document.querySelector('.rus-mobile-bottom-nav')?.remove();document.querySelector('.rus-mobile-menu-layer')?.remove();shell=null;moreButton=null;
}
function install(){addStyles();if(mq.matches)buildShell();mq.addEventListener?.('change',e=>e.matches?buildShell():teardown())}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();