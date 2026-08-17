(()=>{
'use strict';
const MOBILE='(max-width:700px)';
const featurePages=new Set(['search.html','streaks.html','playoff-picture.html','player-compare.html','game-week.html','upsets.html','milestones.html','my-teams.html']);
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(!featurePages.has(path))return;

function addStyles(){
  if(document.getElementById('rus-feature-mobile-accordions-style'))return;
  const s=document.createElement('style');
  s.id='rus-feature-mobile-accordions-style';
  s.textContent=`
@media(max-width:700px){
  header{padding:6px 9px!important}
  .header-content{gap:8px!important}
  .logo{width:44px!important;height:44px!important;flex:0 0 44px!important}
  .site-title h1{font-size:17px!important;letter-spacing:.7px!important;line-height:1!important}
  .site-title p{display:none!important}
  .rus-mobile-nav-bar{padding:5px 8px!important;min-height:48px}
  .rus-mobile-nav-toggle{min-height:38px!important;padding:7px 11px!important;font-size:11px!important}
  .rus-mobile-nav-current{font-size:9px!important}

  body[data-feature-page] .container{padding-top:10px!important}
  body[data-feature-page] .feature-hero{padding:10px 11px!important;margin-bottom:8px!important;border-radius:7px!important}
  body[data-feature-page] .feature-hero h2{font-size:19px!important;margin:0!important}
  body[data-feature-page] .rus-mobile-page-about{margin-top:7px;border-top:1px solid #272727;padding-top:6px}
  body[data-feature-page] .rus-mobile-page-about>summary{list-style:none;cursor:pointer;color:#F14D07;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0}
  body[data-feature-page] .rus-mobile-page-about>summary::-webkit-details-marker{display:none}
  body[data-feature-page] .rus-mobile-page-about>summary::after{content:'＋';font-size:13px;color:#777}
  body[data-feature-page] .rus-mobile-page-about[open]>summary::after{content:'−'}
  body[data-feature-page] .rus-mobile-page-about p{margin:7px 0 1px!important;font-size:11px!important;line-height:1.4!important;color:#999!important}

  body[data-feature-page] .rus-mobile-section{display:block;background:#050505;border:1px solid #333;border-radius:7px;margin:8px 0;overflow:hidden}
  body[data-feature-page] .rus-mobile-section>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:10px 11px;color:#fff;background:#0b0b0b;border-left:4px solid #F14D07;font-size:13px;font-weight:1000;text-transform:uppercase;line-height:1.15}
  body[data-feature-page] .rus-mobile-section>summary::-webkit-details-marker{display:none}
  body[data-feature-page] .rus-mobile-section>summary::after{content:'＋';color:#F14D07;font-size:18px;font-weight:700;flex:0 0 auto}
  body[data-feature-page] .rus-mobile-section[open]>summary{background:#111}
  body[data-feature-page] .rus-mobile-section[open]>summary::after{content:'−'}
  body[data-feature-page] .rus-mobile-section-content{padding:2px 8px 9px}
  body[data-feature-page] .rus-mobile-section-content>.section-title,
  body[data-feature-page] .rus-mobile-section-content>*>.section-title:first-child{display:none!important}
  body[data-feature-page] .rus-mobile-section-content .table-wrap{margin-top:6px}
  body[data-feature-page] .rus-mobile-section-content .grid,
  body[data-feature-page] .rus-mobile-section-content .grid.two,
  body[data-feature-page] .rus-mobile-section-content .rus-week-grid{margin-top:6px!important;margin-bottom:4px!important}
  body[data-feature-page] .rus-mobile-section-content .rus-week-date-head{margin:10px 0 6px!important}
  body[data-feature-page] .feature-note{margin:6px 0 8px!important}
  body[data-feature-page] .toolbar{margin-bottom:8px!important}
}
`;
  document.head.appendChild(s);
}

function mobile(){return matchMedia(MOBILE).matches}

function compactHero(){
  const hero=document.querySelector('.feature-hero');
  if(!hero||hero.querySelector('.rus-mobile-page-about'))return;
  const p=hero.querySelector(':scope > p');
  if(!p)return;
  const d=document.createElement('details');
  d.className='rus-mobile-page-about';
  const sum=document.createElement('summary');
  sum.textContent='About this page';
  d.append(sum,p);
  hero.appendChild(d);
}

function restoreHero(){
  const d=document.querySelector('.feature-hero .rus-mobile-page-about');
  if(!d)return;
  const hero=d.parentElement,p=d.querySelector(':scope > p');
  if(p)hero.insertBefore(p,d);
  d.remove();
}

function topAnchor(root,heading){
  let node=heading;
  while(node.parentElement&&node.parentElement!==root)node=node.parentElement;
  return node.parentElement===root?node:null;
}

function nextSectionAnchor(root,start){
  let n=start.nextElementSibling;
  while(n){
    if(n.matches('.rus-mobile-section')||n.querySelector?.('.section-title'))return n;
    n=n.nextElementSibling;
  }
  return null;
}

function accordionize(root){
  const headings=[...root.querySelectorAll('.section-title')].filter(h=>!h.closest('.rus-mobile-section'));
  const seen=new Set();
  for(const heading of headings){
    const anchor=topAnchor(root,heading);
    if(!anchor||seen.has(anchor)||anchor.closest('.rus-mobile-section'))continue;
    seen.add(anchor);
    const details=document.createElement('details');
    details.className='rus-mobile-section';
    const summary=document.createElement('summary');
    summary.textContent=heading.textContent.trim();
    const content=document.createElement('div');
    content.className='rus-mobile-section-content';
    root.insertBefore(details,anchor);
    details.append(summary,content);
    let node=anchor;
    while(node){
      const next=node.nextElementSibling;
      content.appendChild(node);
      if(!next||next.matches('.rus-mobile-section')||next.querySelector?.('.section-title'))break;
      node=next;
    }
  }
  root.querySelectorAll('.rus-mobile-section').forEach(d=>{
    const h=d.querySelector('.section-title');
    const s=d.querySelector(':scope > summary');
    if(h&&s)s.textContent=h.textContent.trim();
  });
}

function restoreSections(root){
  [...root.querySelectorAll(':scope > .rus-mobile-section')].forEach(details=>{
    const content=details.querySelector(':scope > .rus-mobile-section-content');
    if(content){
      while(content.firstChild)root.insertBefore(content.firstChild,details);
    }
    details.remove();
  });
}

function sync(){
  const root=document.getElementById('featureRoot');
  if(!root)return;
  if(mobile()){
    compactHero();
    accordionize(root);
  }else{
    restoreHero();
    restoreSections(root);
  }
}

function init(){
  addStyles();
  const root=document.getElementById('featureRoot');
  if(!root)return;
  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;sync()});
  };
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  addEventListener('resize',schedule,{passive:true});
  sync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();