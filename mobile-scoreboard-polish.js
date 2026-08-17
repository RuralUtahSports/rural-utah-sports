(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='scoreboard.html')return;
const mq=matchMedia('(max-width:700px)');
function addStyles(){
  if(document.getElementById('rus-scoreboard-mobile-polish'))return;
  const s=document.createElement('style');s.id='rus-scoreboard-mobile-polish';s.textContent=`
@media(max-width:700px){
  .rus-mobile-core-nav a{min-height:42px!important;padding:8px 4px!important;font-size:10.5px!important;line-height:1.05!important}
  .scoreboard-refresh-row{gap:8px!important;margin-bottom:14px!important}
  .scoreboard-refresh-row .rus-scoreboard-share-inline{position:static!important;display:block!important;width:100%!important;min-height:48px!important;margin:0!important;border-radius:8px!important;box-shadow:0 5px 16px rgba(0,0,0,.28)!important;font-size:13px!important;padding:12px 14px!important}
  .scoreboard-week-nav{margin-top:2px!important;margin-bottom:16px!important}
}
`;
  document.head.appendChild(s);
}
function placeShare(){
  if(!mq.matches)return;
  const btn=document.querySelector('.rus-share-btn.rus-share-float,.rus-share-btn.rus-scoreboard-share-inline');
  const row=document.querySelector('.scoreboard-refresh-row');
  if(!btn||!row)return false;
  btn.classList.remove('rus-share-float');
  btn.classList.add('rus-scoreboard-share-inline');
  if(btn.parentElement!==row)row.appendChild(btn);
  return true;
}
function install(){
  addStyles();
  if(placeShare())return;
  const o=new MutationObserver(()=>{if(placeShare())o.disconnect()});
  o.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>o.disconnect(),5000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();