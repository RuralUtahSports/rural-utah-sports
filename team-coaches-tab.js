(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;

function showCoaches(shell,save=true){
  if(!shell)return;
  const panel=shell.querySelector('#rus-panel-coaches');
  const button=shell.querySelector('#rus-tab-coaches');
  if(!panel||!button)return;
  for(const b of shell.querySelectorAll('.rus-team-tab')){
    const on=b===button;
    b.classList.toggle('active',on);
    b.setAttribute('aria-selected',on?'true':'false');
    b.tabIndex=on?0:-1;
  }
  for(const p of shell.querySelectorAll('.rus-team-panel')){
    const on=p===panel;
    p.hidden=!on;
    p.style.display=on?'block':'none';
    p.classList.toggle('active',on);
  }
  if(save){
    const u=new URL(location.href);
    u.searchParams.set('tab','coaches');
    history.replaceState({},'',u);
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  document.dispatchEvent(new CustomEvent('rus-team-tab-shown',{detail:{key:'coaches'}}));
}

function install(){
  const shell=document.querySelector('.rus-team-tabs-shell');
  const tabBar=shell?.querySelector('.rus-team-tabs');
  const panelsWrap=shell?.querySelector('.rus-team-panels');
  const coachSection=document.querySelector('.rus-coach-history');
  if(!shell||!tabBar||!panelsWrap)return false;

  let button=shell.querySelector('#rus-tab-coaches');
  let panel=shell.querySelector('#rus-panel-coaches');
  if(!button){
    button=document.createElement('button');
    button.className='rus-team-tab';
    button.id='rus-tab-coaches';
    button.dataset.tab='coaches';
    button.type='button';
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected','false');
    button.tabIndex=-1;
    button.textContent='Coaches';
    const before=tabBar.querySelector('[data-tab="team-records"]');
    if(before)tabBar.insertBefore(button,before); else tabBar.appendChild(button);
  }
  if(!panel){
    panel=document.createElement('section');
    panel.className='rus-team-panel';
    panel.id='rus-panel-coaches';
    panel.dataset.tab='coaches';
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby','rus-tab-coaches');
    panel.hidden=true;
    panel.style.display='none';
    const before=panelsWrap.querySelector('[data-tab="team-records"]');
    if(before)panelsWrap.insertBefore(panel,before); else panelsWrap.appendChild(panel);
  }

  if(coachSection&&coachSection.parentElement!==panel)panel.appendChild(coachSection);
  if(!button.dataset.rusCoachBound){
    button.dataset.rusCoachBound='1';
    button.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      showCoaches(shell,true);
    },true);
    button.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();showCoaches(shell,true)}
    });
  }
  if(new URLSearchParams(location.search).get('tab')==='coaches')showCoaches(shell,false);
  document.body.dataset.rusCoachesTab='1';
  return true;
}

let tries=0;
const tick=()=>{
  if(install()||++tries>200)return;
  setTimeout(tick,100);
};
const obs=new MutationObserver(()=>install());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});tick()},{once:true});
else{obs.observe(document.body,{childList:true,subtree:true});tick()}
})();
