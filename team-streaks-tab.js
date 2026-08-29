(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;

const ALIASES={
  'GUNNISON VALLEY':'GUNNISON',
  'MAPLE MOUNTAIN':'MAPLE MTN',
  'MONUMENT VALLEY':'MONUMENT VAL',
  'CEDAR CITY':'CEDAR'
};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const esc=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

function addStyles(){
  if(document.getElementById('rus-team-streaks-style'))return;
  const s=document.createElement('style');
  s.id='rus-team-streaks-style';
  s.textContent=`
    .rus-streaks{background:#090909;border:1px solid #333;border-radius:8px;padding:20px}
    .rus-streaks-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}
    .rus-streaks-head h2{font-size:24px;text-transform:uppercase;margin:0}
    .rus-streaks-head p{color:#999;font-size:12px;line-height:1.45;max-width:620px;margin:4px 0 0}
    .rus-streak-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .rus-streak-card{background:#171717;border:1px solid #333;border-radius:7px;padding:17px;min-width:0}
    .rus-streak-card.primary{border-top:4px solid #F14D07}
    .rus-streak-label{font-size:10px;color:#999;font-weight:900;text-transform:uppercase;letter-spacing:.35px}
    .rus-streak-value{font-size:34px;font-weight:900;color:#F14D07;line-height:1.05;margin:6px 0 8px}
    .rus-streak-value.win{color:#5ee28a}.rus-streak-value.loss{color:#ff7777}
    .rus-streak-detail{font-size:12px;color:#ddd;line-height:1.5}
    .rus-streak-detail span{display:block;color:#888}
    .rus-streak-secondary-title{font-size:15px;color:#aaa;text-transform:uppercase;margin:22px 0 10px}
    .rus-streak-note{font-size:11px;color:#777;line-height:1.45;margin-top:14px}
    .rus-streak-empty{padding:36px 15px;text-align:center;color:#888}
    @media(max-width:900px){.rus-streak-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.rus-streaks{padding:14px}.rus-streaks-head{flex-direction:column}.rus-streak-grid{grid-template-columns:1fr}.rus-streak-value{font-size:30px}}
  `;
  document.head.appendChild(s);
}

function spanDetail(row){
  if(!row||!Number(row.length||0))return '<span>No active streak.</span>';
  const start=[clean(row.startDate),clean(row.startOpponent)?`vs ${clean(row.startOpponent)}`:''].filter(Boolean).join(' • ');
  const end=[clean(row.endDate),clean(row.endOpponent)?`vs ${clean(row.endOpponent)}`:''].filter(Boolean).join(' • ');
  return `${start?`<span>Started: ${esc(start)}</span>`:''}${end?`<span>Most recent/end: ${esc(end)}</span>`:''}`||'<span>Game span unavailable.</span>';
}

function recordCard(label,row,kind='',primary=false){
  const n=Number(row?.length||0);
  return `<article class="rus-streak-card${primary?' primary':''}"><div class="rus-streak-label">${esc(label)}</div><div class="rus-streak-value ${kind}">${n.toLocaleString()}</div><div class="rus-streak-detail">${spanDetail(row)}</div></article>`;
}

function currentCard(row){
  const win=Number(row?.currentWinStreak?.length||0);
  const loss=Number(row?.currentLossStreak?.length||0);
  const active=win>0?row.currentWinStreak:loss>0?row.currentLossStreak:null;
  const text=win>0?`W${win}`:loss>0?`L${loss}`:'—';
  const kind=win>0?'win':loss>0?'loss':'';
  return `<article class="rus-streak-card primary"><div class="rus-streak-label">Current Streak</div><div class="rus-streak-value ${kind}">${esc(text)}</div><div class="rus-streak-detail">${active?spanDetail(active):'<span>No active winning or losing streak.</span>'}</div></article>`;
}

function getTeamName(){
  const title=clean(document.querySelector('.team-title')?.textContent);
  if(title)return title.toUpperCase();
  return clean(new URLSearchParams(location.search).get('team')).toUpperCase();
}

async function render(panel){
  if(!panel||panel.dataset.rusStreaksLoaded==='1'||panel.dataset.rusStreaksLoading==='1')return;
  panel.dataset.rusStreaksLoading='1';
  panel.innerHTML='<div class="rus-streaks"><div class="rus-streak-empty">Loading streak records...</div></div>';
  try{
    const title=getTeamName();
    const key=ALIASES[title]||title;
    const payload=await fetch('streak-records.json?v=20260827-team-streaks2',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()});
    let row=payload[key];
    if(!row){
      const wanted=norm(key);
      const found=Object.keys(payload).find(k=>norm(k)===wanted);
      if(found)row=payload[found];
    }
    if(!row)throw new Error(`No streak record found for ${title||'team'}`);
    panel.innerHTML=`<section class="rus-streaks">
      <div class="rus-streaks-head"><div><h2>Streaks</h2><p>Winning and losing streak history for ${esc(title)}.</p></div></div>
      <div class="rus-streak-grid">
        ${currentCard(row)}
        ${recordCard('Longest Winning Streak',row.longestWinStreak,'win',true)}
        ${recordCard('Longest Losing Streak',row.longestLossStreak,'loss',true)}
      </div>
      <h3 class="rus-streak-secondary-title">Other Streak Records</h3>
      <div class="rus-streak-grid">
        ${recordCard('Longest Consecutive Games Scored In',row.longestScoringStreak)}
        ${recordCard('Current Consecutive Games Scored In',row.currentScoringStreak)}
        ${recordCard('Longest Consecutive Shutout Streak',row.longestShutoutStreak)}
      </div>
      <p class="rus-streak-note">Ties break winning and losing streaks.</p>
    </section>`;
    panel.dataset.rusStreaksLoaded='1';
  }catch(err){
    console.warn('Team streaks:',err);
    panel.innerHTML='<div class="rus-streaks"><div class="rus-streak-empty">Streak records are not available for this team yet.</div></div>';
  }finally{
    delete panel.dataset.rusStreaksLoading;
  }
}

function showStreaks(shell,save=true){
  if(!shell)return;
  const panel=shell.querySelector('#rus-panel-streaks');
  const button=shell.querySelector('#rus-tab-streaks');
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
  render(panel);
  if(save){
    const u=new URL(location.href);
    u.searchParams.set('tab','streaks');
    history.replaceState({},'',u);
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  document.dispatchEvent(new CustomEvent('rus-team-tab-shown',{detail:{key:'streaks'}}));
}

function install(){
  addStyles();
  const shell=document.querySelector('.rus-team-tabs-shell');
  const tabBar=shell?.querySelector('.rus-team-tabs');
  const panelsWrap=shell?.querySelector('.rus-team-panels');
  if(!shell||!tabBar||!panelsWrap)return false;

  let button=shell.querySelector('#rus-tab-streaks');
  let panel=shell.querySelector('#rus-panel-streaks');
  if(!button){
    button=document.createElement('button');
    button.className='rus-team-tab';
    button.id='rus-tab-streaks';
    button.dataset.tab='streaks';
    button.type='button';
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected','false');
    button.tabIndex=-1;
    button.textContent='Streaks';
    const before=tabBar.querySelector('[data-tab="team-records"]');
    if(before)tabBar.insertBefore(button,before);else tabBar.appendChild(button);
  }
  if(!panel){
    panel=document.createElement('section');
    panel.className='rus-team-panel';
    panel.id='rus-panel-streaks';
    panel.dataset.tab='streaks';
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby','rus-tab-streaks');
    panel.hidden=true;
    panel.style.display='none';
    const before=panelsWrap.querySelector('[data-tab="team-records"]');
    if(before)panelsWrap.insertBefore(panel,before);else panelsWrap.appendChild(panel);
  }

  if(!button.dataset.rusStreakBound){
    button.dataset.rusStreakBound='1';
    button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();showStreaks(shell,true)},true);
    button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();showStreaks(shell,true)}},true);
  }
  if(new URLSearchParams(location.search).get('tab')==='streaks')showStreaks(shell,false);
  document.body.dataset.rusStreaksTab='1';
  return true;
}

let tries=0;
const tick=()=>{if(install()||++tries>200)return;setTimeout(tick,100)};
const obs=new MutationObserver(()=>install());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});tick()},{once:true});
else{obs.observe(document.body,{childList:true,subtree:true});tick()}
})();
