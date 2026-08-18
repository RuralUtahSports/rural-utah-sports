(()=>{
'use strict';
const mq=window.matchMedia('(max-width:700px)');

function hideTopNav(){
  if(!mq.matches)return;
  document.getElementById('rusMobileCoreNav')?.remove();
  const nav=document.querySelector('body > nav')||document.querySelector('nav');
  if(!nav)return;
  nav.style.setProperty('display','none','important');
  nav.setAttribute('aria-hidden','true');
}

function restoreDesktop(){
  if(mq.matches)return;
  const nav=document.querySelector('body > nav')||document.querySelector('nav');
  if(!nav)return;
  nav.style.removeProperty('display');
  nav.removeAttribute('aria-hidden');
}

function install(){
  hideTopNav();
  setTimeout(hideTopNav,150);
  setTimeout(hideTopNav,700);
  mq.addEventListener?.('change',e=>e.matches?hideTopNav():restoreDesktop());
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
