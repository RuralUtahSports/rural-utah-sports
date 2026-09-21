(()=>{
'use strict';
if(window.__RUS_SITE_SHARE_LITE__)return;window.__RUS_SITE_SHARE_LITE__=true;
function add(){
  const main=document.querySelector('main');
  if(!main||document.getElementById('rusShareView'))return;
  const mobile=window.matchMedia?.('(max-width:700px)').matches;
  const b=document.createElement('button');
  b.id='rusShareView';
  b.type='button';
  b.textContent='Copy Share Link';
  b.style.cssText=mobile
    ?'display:block;margin:16px 16px 92px auto;background:#1b1b1b;color:#fff;border:1px solid #444;border-radius:999px;padding:9px 13px;font:700 10px Arial;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)'
    :'position:fixed;right:16px;bottom:76px;z-index:40;background:#1b1b1b;color:#fff;border:1px solid #444;border-radius:999px;padding:9px 13px;font:700 10px Arial;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)';
  b.onclick=async()=>{
    try{
      await navigator.clipboard.writeText(location.href);
      const old=b.textContent;b.textContent='Link Copied';
      setTimeout(()=>b.textContent=old,1400);
    }catch{prompt('Copy this link:',location.href)}
  };
  if(mobile)main.insertAdjacentElement('afterend',b);else document.body.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();
