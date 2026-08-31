(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusTeamPageFixes)return;window.__rusTeamPageFixes=true;
let singleGameSortPatched=false;
function addStyles(){
  if(document.getElementById('rus-team-page-fixes-style'))return;
  const style=document.createElement('style');style.id='rus-team-page-fixes-style';style.textContent=`
#page,.hero,.hero-content,.rus-team-brand-head,.rus-team-brand-copy{min-width:0;max-width:100%}
.rus-team-page-logo{display:block!important;visibility:visible!important;opacity:1!important;max-width:none!important}
@media(min-width:901px){main.rus-desktop-layout>#page{grid-column:1!important;grid-row:1!important;min-width:0!important;width:100%!important;max-width:100%!important}main.rus-desktop-layout>.rus-desktop-sidebar{grid-column:2!important;grid-row:1!important;min-width:0!important}main.rus-desktop-layout .rus-side-logo{display:none!important}}
@media(max-width:700px){body[data-rus-page="team.html"] #page,body[data-rus-page="team.html"] .hero,body[data-rus-page="team.html"] .hero-content{width:100%!important;max-width:100%!important}body[data-rus-page="team.html"] .rus-team-brand-head{width:100%!important;align-items:center!important}body[data-rus-page="team.html"] .rus-team-page-logo{flex:0 0 68px!important;width:68px!important;height:68px!important}body[data-rus-page="team.html"] .rus-team-brand-copy{flex:1 1 0!important;overflow:hidden!important}}
`;document.head.appendChild(style);
}
const srcKey=img=>{try{return new URL(img.currentSrc||img.src,location.href).href}catch{return img.currentSrc||img.src||''}};
function clean(){
  document.querySelectorAll('.rus-desktop-sidebar .rus-side-logo').forEach(img=>img.remove());
  const hero=document.querySelector('#page .hero'),keep=hero?.querySelector('.rus-team-page-logo');if(!hero||!keep)return;
  const key=srcKey(keep);if(!key)return;
  hero.querySelectorAll('img').forEach(img=>{if(img===keep||img.closest('.rus-team-hero-sponsor'))return;if(srcKey(img)===key)img.remove()});
}
function gameDateKey(v){
  const m=String(v||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m?(Number(m[3])*10000+Number(m[1])*100+Number(m[2])):0;
}
function installLossMarginSort(){
  if(!singleGameSortPatched&&typeof window.sortSingleGames==='function'){
    const baseSort=window.sortSingleGames;
    window.sortSingleGames=function(rows,mode){
      if(mode!=='loss-margin-desc')return baseSort(rows,mode);
      return [...rows]
        .filter(g=>Number(g?.margin)<0)
        .sort((a,b)=>Number(a.margin)-Number(b.margin)
          ||Number(b.opponentScore)-Number(a.opponentScore)
          ||Number(a.teamScore)-Number(b.teamScore)
          ||gameDateKey(b.date)-gameDateKey(a.date));
    };
    singleGameSortPatched=true;
  }
  const select=document.getElementById('singleGameSort');
  if(!select||select.querySelector('option[value="loss-margin-desc"]'))return;
  const option=document.createElement('option');
  option.value='loss-margin-desc';
  option.textContent='Biggest Loss Margin';
  const winMargin=select.querySelector('option[value="margin-desc"]');
  if(winMargin)winMargin.insertAdjacentElement('afterend',option);else select.appendChild(option);
}
function ensureDesktop(){
  if(!matchMedia('(min-width:901px)').matches)return;
  document.body?.setAttribute('data-rus-desktop','1');
  if(window.__RUS_DESKTOP_V2__||document.querySelector('script[data-rus-desktop-v2]'))return;
  const script=document.createElement('script');script.src='desktop-v2.js?v=20260831-sidebar-currentdata1';script.async=true;script.dataset.rusDesktopV2='1';document.body.appendChild(script);
}
function boot(){
  addStyles();ensureDesktop();clean();installLossMarginSort();
  let timer=0;const observer=new MutationObserver(()=>{clean();installLossMarginSort();clearTimeout(timer);timer=setTimeout(()=>observer.disconnect(),15000)});observer.observe(document.body,{childList:true,subtree:true});timer=setTimeout(()=>observer.disconnect(),30000);
  const mq=matchMedia('(min-width:901px)');mq.addEventListener?.('change',e=>{if(e.matches)ensureDesktop()});
  window.addEventListener('pageshow',()=>{ensureDesktop();clean();installLossMarginSort()},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
