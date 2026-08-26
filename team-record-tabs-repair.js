(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;

function clearEmpty(panel){
  if(!panel)return;
  for(const n of panel.querySelectorAll(':scope > .rus-tab-empty'))n.remove();
}

function ensureTeamRecords(shell){
  if(!shell)return null;
  const bar=shell.querySelector('.rus-team-tabs');
  const panels=shell.querySelector('.rus-team-panels');
  if(!bar||!panels)return null;
  let panel=shell.querySelector('#rus-panel-team-records');
  let button=shell.querySelector('.rus-team-tab[data-tab="team-records"]');
  const playerButton=shell.querySelector('.rus-team-tab[data-tab="player-records"]');
  const playerPanel=shell.querySelector('#rus-panel-player-records');
  if(!button){
    button=document.createElement('button');
    button.className='rus-team-tab';
    button.id='rus-tab-team-records';
    button.dataset.tab='team-records';
    button.type='button';
    button.setAttribute('role','tab');
    button.textContent='Team Records';
    if(playerButton)bar.insertBefore(button,playerButton);else bar.appendChild(button);
  }
  if(!panel){
    panel=document.createElement('section');
    panel.className='rus-team-panel';
    panel.id='rus-panel-team-records';
    panel.dataset.tab='team-records';
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',button.id);
    panel.hidden=true;
    panel.style.display='none';
    if(playerPanel)panels.insertBefore(panel,playerPanel);else panels.appendChild(panel);
  }
  return panel;
}

function show(shell,key,save=true){
  if(!shell)return;
  const buttons=[...shell.querySelectorAll('.rus-team-tab')];
  const panels=[...shell.querySelectorAll('.rus-team-panel')];
  if(!buttons.some(b=>b.dataset.tab===key))key='overview';
  let active=null;
  for(const b of buttons){
    const on=b.dataset.tab===key;
    b.classList.toggle('active',on);
    b.setAttribute('aria-selected',on?'true':'false');
    b.tabIndex=on?0:-1;
  }
  for(const p of panels){
    const on=p.dataset.tab===key;
    p.hidden=!on;
    p.style.display=on?'block':'none';
    p.classList.toggle('active',on);
    if(on)active=p;
  }
  document.dispatchEvent(new CustomEvent('rus-team-tab-shown',{detail:{key}}));
  if(save){
    const u=new URL(location.href);
    if(key==='overview')u.searchParams.delete('tab');else u.searchParams.set('tab',key);
    history.replaceState({},'',u);
    requestAnimationFrame(()=>active?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
}

function moveRecords(page,shell){
  const teamPanel=ensureTeamRecords(shell);
  const playerPanel=shell?.querySelector('#rus-panel-player-records');
  const teamRecords=page.querySelector('#rusTeamStatRecords');
  const playerRecords=page.querySelector('#rusPlayerRecords');
  if(teamRecords&&teamPanel&&!teamPanel.contains(teamRecords)){
    clearEmpty(teamPanel);
    teamPanel.appendChild(teamRecords);
  }
  if(playerRecords&&playerPanel&&!playerPanel.contains(playerRecords)){
    clearEmpty(playerPanel);
    playerPanel.appendChild(playerRecords);
  }
  if(teamPanel&&teamPanel.querySelector('#rusTeamStatRecords'))clearEmpty(teamPanel);
  if(playerPanel&&playerPanel.querySelector('#rusPlayerRecords'))clearEmpty(playerPanel);
}

function install(){
  const page=document.getElementById('page');
  const shell=page?.querySelector('.rus-team-tabs-shell');
  if(!page||!shell)return false;
  ensureTeamRecords(shell);
  moveRecords(page,shell);
  const bar=shell.querySelector('.rus-team-tabs');
  if(bar&&!bar.dataset.rusRecordRepair){
    bar.dataset.rusRecordRepair='1';
    bar.addEventListener('click',e=>{
      const b=e.target.closest('.rus-team-tab');
      if(!b)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      show(shell,b.dataset.tab,true);
    },true);
    bar.addEventListener('keydown',e=>{
      const b=e.target.closest('.rus-team-tab');
      if(!b||!['ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const buttons=[...bar.querySelectorAll('.rus-team-tab')];
      const i=buttons.indexOf(b),step=e.key==='ArrowRight'?1:-1;
      const next=buttons[(i+step+buttons.length)%buttons.length];
      next.focus();
      show(shell,next.dataset.tab,true);
    },true);
  }
  if(!page.dataset.rusRecordTabsObserver){
    page.dataset.rusRecordTabsObserver='1';
    const observer=new MutationObserver(()=>moveRecords(page,shell));
    observer.observe(page,{childList:true,subtree:true});
  }
  window.RUSTeamTabs={show:key=>show(shell,key,true)};
  const requested=(new URLSearchParams(location.search).get('tab')||'').toLowerCase();
  if(requested==='team-records'||requested==='player-records')show(shell,requested,false);
  return true;
}

let tries=0;
const wait=()=>{
  if(install()||++tries>400)return;
  setTimeout(wait,75);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wait,0),{once:true});else wait();
})();
