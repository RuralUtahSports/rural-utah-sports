(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusTeamPageFixes)return;window.__rusTeamPageFixes=true;
const style=document.createElement('style');style.id='rus-team-page-fixes-style';style.textContent=`
#page,.hero,.hero-content,.rus-team-brand-head,.rus-team-brand-copy{min-width:0;max-width:100%}
.rus-team-page-logo{display:block!important;visibility:visible!important;opacity:1!important;max-width:none!important}
@media(min-width:901px){main.rus-desktop-layout>#page{grid-column:1!important;grid-row:1!important;min-width:0!important;width:100%!important;max-width:100%!important}main.rus-desktop-layout>.rus-desktop-sidebar{grid-column:2!important;grid-row:1!important;min-width:0!important}main.rus-desktop-layout .rus-side-logo{display:none!important}}
@media(max-width:700px){body[data-rus-page="team.html"] #page,body[data-rus-page="team.html"] .hero,body[data-rus-page="team.html"] .hero-content{width:100%!important;max-width:100%!important}body[data-rus-page="team.html"] .rus-team-brand-head{width:100%!important;align-items:center!important}body[data-rus-page="team.html"] .rus-team-page-logo{flex:0 0 68px!important;width:68px!important;height:68px!important}body[data-rus-page="team.html"] .rus-team-brand-copy{flex:1 1 0!important;overflow:hidden!important}}
`;document.head.appendChild(style);
const srcKey=img=>{try{return new URL(img.currentSrc||img.src,location.href).href}catch{return img.currentSrc||img.src||''}};
function clean(){
  document.querySelectorAll('.rus-desktop-sidebar .rus-side-logo').forEach(img=>img.remove());
  const hero=document.querySelector('#page .hero'),keep=hero?.querySelector('.rus-team-page-logo');
  if(!hero||!keep)return;
  const key=srcKey(keep);if(!key)return;
  hero.querySelectorAll('img').forEach(img=>{if(img===keep||img.closest('.rus-team-hero-sponsor'))return;if(srcKey(img)===key)img.remove()});
}
clean();
let timer=0;const observer=new MutationObserver(()=>{clean();clearTimeout(timer);timer=setTimeout(()=>observer.disconnect(),5000)});observer.observe(document.body,{childList:true,subtree:true});timer=setTimeout(()=>observer.disconnect(),8000);
})();
