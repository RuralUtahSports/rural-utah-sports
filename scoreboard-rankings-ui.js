(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='scoreboard.html')return;

  function addStyles(){
    if(document.getElementById('rus-scoreboard-rankings-ui'))return;
    const style=document.createElement('style');
    style.id='rus-scoreboard-rankings-ui';
    style.textContent=`
      .scoreboard-class-buttons{display:flex;gap:6px;flex-wrap:wrap;flex:1 1 100%}
      .scoreboard-class-button{appearance:none;background:#171717;color:#ddd;border:1px solid #444;border-radius:6px;padding:9px 12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}
      .scoreboard-class-button:hover,.scoreboard-class-button.active{background:#F14D07;color:#000;border-color:#F14D07}
      .team-meta{line-height:1.35;color:#8f8f8f;font-weight:800}
      .team-meta .scoreboard-rank{color:#F14D07;font-weight:900}
      @media(max-width:700px){.scoreboard-class-buttons{width:100%}.scoreboard-class-button{flex:1 1 calc(25% - 6px);min-width:65px}}
    `;
    document.head.appendChild(style);
  }

  function setupClassButtons(){
    const select=document.getElementById('classFilter');
    if(!select||document.getElementById('scoreboardClassButtons'))return;
    const wrap=document.createElement('div');
    wrap.id='scoreboardClassButtons';
    wrap.className='scoreboard-class-buttons';
    wrap.setAttribute('aria-label','Classification filter');
    const options=[['ALL','All'],['6A','6A'],['5A','5A'],['4A','4A'],['3A','3A'],['2A','2A'],['1A','1A'],['8P','8-Player']];
    for(const[value,label]of options){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='scoreboard-class-button'+(value==='ALL'?' active':'');
      btn.dataset.class=value;
      btn.textContent=label;
      btn.setAttribute('aria-pressed',value==='ALL'?'true':'false');
      btn.addEventListener('click',()=>{
        select.value=value;
        wrap.querySelectorAll('.scoreboard-class-button').forEach(x=>{
          const active=x===btn;
          x.classList.toggle('active',active);
          x.setAttribute('aria-pressed',active?'true':'false');
        });
        select.dispatchEvent(new Event('change',{bubbles:true}));
      });
      wrap.appendChild(btn);
    }
    select.parentNode.insertBefore(wrap,select);
    select.style.display='none';
  }

  async function setupRankingLabels(){
    try{
      const stamp=Date.now();
      const [classResponse,stateResponse]=await Promise.all([
        fetch('rankings-history-2026.json?v='+stamp).catch(()=>null),
        fetch('state-top25-history-2026.json?v='+stamp).catch(()=>null)
      ]);
      const classData=classResponse&&classResponse.ok?await classResponse.json():null;
      const stateData=stateResponse&&stateResponse.ok?await stateResponse.json():null;
      const classRanks=new Map(),stateRanks=new Map();
      const latest=classData?.snapshots?.at(-1);
      for(const[classification,list]of Object.entries(latest?.classifications||{})){
        (list||[]).forEach((team,index)=>classRanks.set(canon(team),{rank:index+1,classification}));
      }
      const stateSnapshots=stateData?.snapshots||[],label=String(latest?.label||'').trim();
      const matching=stateSnapshots.find(s=>String(s?.label||'').trim()===label);
      const dated=[...stateSnapshots].sort((a,b)=>Date.parse(a?.date||0)-Date.parse(b?.date||0));
      const currentState=matching||dated.at(-1)||stateData;
      (currentState?.teams||currentState?.rankings||[]).forEach((row,index)=>{
        const name=typeof row==='string'?row:row?.team;
        if(name)stateRanks.set(canon(name),{rank:Number(row?.rank)||index+1});
      });
      if(typeof teamBlock!=='function')return;
      teamBlock=function(name,score,pred){
        const t=teamInfo(name),bg=safeHex(t?.backgroundColor,'#222'),fg=safeHex(t?.textColor,'#fff'),cr=classRanks.get(canon(name)),sr=stateRanks.get(canon(name)),parts=[];
        if(t?.classification)parts.push(esc(t.classification));
        if(cr)parts.push(`<span class="scoreboard-rank">Class #${cr.rank}</span>`);
        if(sr)parts.push(`<span class="scoreboard-rank">State #${sr.rank}</span>`);
        if(t?.region)parts.push(esc(t.region));
        const meta=parts.join(' • ');
        return `<div class="team-row"><div class="team-main"><img class="team-logo" src="${esc(RUSSchoolAssets.logoUrl(name))}" alt="${esc(name)} logo" onerror="this.style.display='none'"><div><a class="team-name" href="team.html?team=${encodeURIComponent(name)}" style="--team-bg:${bg};--team-fg:${fg}">${esc(name)}</a><div class="team-meta">${meta}</div></div></div><div class="scores"><div class="pred">Pred<b>${pred??'—'}</b></div><div class="actual">Score<b>${score??'—'}</b></div></div></div>`;
      };
      if(typeof render==='function')render();
    }catch(e){console.warn('Scoreboard rankings unavailable',e)}
  }

  function setup(){addStyles();setupClassButtons();setupRankingLabels()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
