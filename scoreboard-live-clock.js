(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='scoreboard.html')return;

  const LIVE_URL='https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';
  const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isoDate=value=>{
    const s=String(value??'').trim();
    let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    const d=new Date(s);
    if(!Number.isFinite(d.getTime()))return'';
    return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const gameKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
  const pairKey=(a,h)=>`${compact(a)}|${compact(h)}`;

  const style=document.createElement('style');
  style.textContent=`
    .status.live.rus-live-clock{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
    .status.live.rus-live-clock:before{content:'●';font-size:7px;line-height:1}
    .rus-live-time{color:#ffd54a;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.2px;white-space:nowrap}
    .rus-live-time small{color:#999;font-size:8px;font-weight:900;margin-left:5px}
    @media(max-width:700px){.game-top{align-items:flex-start}.rus-live-time{font-size:9px;white-space:normal;text-align:right}.rus-live-time small{display:block;margin:2px 0 0}}
  `;
  document.head.appendChild(style);

  let weeklyGames=[];
  let details={};
  let lastUpdatedAt='';
  let applying=false;
  let mutationTimer=null;

  function periodLabel(d){
    const raw=String(d?.period||d?.status||'').trim().toUpperCase();
    if(raw==='Q1')return'1st Quarter';
    if(raw==='Q2')return'2nd Quarter';
    if(raw==='Q3')return'3rd Quarter';
    if(raw==='Q4')return'4th Quarter';
    if(raw==='HALF'||raw==='HALFTIME')return'Halftime';
    if(/^OT\d*$/.test(raw))return raw.replace('OT','Overtime ' ).trim();
    return String(d?.period||d?.status||'').trim();
  }

  function isLive(d){
    if(!d||d.final)return false;
    const raw=String(d.status||'');
    return !!d.clock||/live|q[1-4]|half|ot/i.test(raw);
  }

  function liveLabel(d){
    if(!d)return'';
    if(d.final)return'Final';
    if(isLive(d))return d.clock?`${d.clock} left • ${periodLabel(d)||'Live'}`:(periodLabel(d)||'Live');
    return String(d.status||'Upcoming');
  }

  function liveScores(d){
    const rows=d?.boxScore?.rows||[];
    if(rows.length<2)return null;
    const away=Number(rows[0]?.total),home=Number(rows[1]?.total);
    return Number.isFinite(away)&&Number.isFinite(home)?{away,home}:null;
  }

  function syncGlobalDetails(){
    try{
      if(typeof detailMap==='undefined'||!detailMap?.set)return;
      for(const [key,d] of Object.entries(details))detailMap.set(key,d);
    }catch{}
  }

  function apply(){
    if(applying)return;
    applying=true;
    try{
      const byPair=new Map(weeklyGames.map(g=>[pairKey(g.awayTeam,g.homeTeam),g]));
      document.querySelectorAll('#board .game').forEach(card=>{
        const teams=[...card.querySelectorAll('.team-name')].map(el=>el.textContent.replace(/Winner/gi,'').trim());
        if(teams.length<2)return;
        const g=byPair.get(pairKey(teams[0],teams[1]));
        if(!g)return;
        const d=details[gameKey(g)];
        if(!d)return;

        const status=card.querySelector('.status');
        const label=liveLabel(d);
        const live=isLive(d);
        if(status){
          status.textContent=d.final?'Final':live?(periodLabel(d)||'Live'):(d.status||'Upcoming');
          status.classList.toggle('final',!!d.final);
          status.classList.toggle('live',live);
          status.classList.toggle('rus-live-clock',live);
        }

        const top=card.querySelector('.game-top');
        let clock=card.querySelector('.rus-live-time');
        if(live&&top){
          if(!clock){
            clock=document.createElement('span');
            clock.className='rus-live-time';
            const pick=top.querySelector('.pick-result');
            if(pick)top.insertBefore(clock,pick);else top.appendChild(clock);
          }
          const period=periodLabel(d)||'Live';
          clock.innerHTML=d.clock?`${d.clock} left <small>${period}</small>`:period;
        }else if(clock){
          clock.remove();
        }

        const scores=liveScores(d);
        if(scores&&(live||d.final)){
          const scoreEls=[...card.querySelectorAll('.team-row .actual b')];
          if(scoreEls[0])scoreEls[0].textContent=String(scores.away);
          if(scoreEls[1])scoreEls[1].textContent=String(scores.home);
        }

        const detailStatus=card.querySelector('.detail-status');
        if(detailStatus)detailStatus.textContent=d.final?'Final':live?label:(d.status||'');
      });
    }finally{
      applying=false;
    }
  }

  async function loadWeekly(){
    if(weeklyGames.length)return true;
    try{
      const r=await fetch(`weekly-simulation.json?v=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)return false;
      const weekly=await r.json();
      weeklyGames=Array.isArray(weekly.games)?weekly.games:[];
      return true;
    }catch{return false}
  }

  async function fetchDetails(){
    const urls=[LIVE_URL,`deseret-game-details.json?v=${Date.now()}`];
    for(const url of urls){
      try{
        const r=await fetch(url,{cache:'no-cache'});
        if(!r.ok)continue;
        const data=await r.json();
        if(data?.games)return data;
      }catch{}
    }
    return null;
  }

  async function refresh(force=false){
    try{
      if(!await loadWeekly())return;
      const data=await fetchDetails();
      if(!data)return;
      const stamp=String(data.updatedAt||'');
      if(!force&&stamp&&stamp===lastUpdatedAt)return;
      lastUpdatedAt=stamp;
      details=data.games||{};
      syncGlobalDetails();
      try{if(typeof render==='function')render()}catch{}
      requestAnimationFrame(apply);
    }catch(err){console.warn('RUS live clock refresh failed',err)}
  }

  function start(){
    const board=document.getElementById('board');
    if(!board)return;
    new MutationObserver(()=>{
      clearTimeout(mutationTimer);
      mutationTimer=setTimeout(apply,100);
    }).observe(board,{childList:true,subtree:true});
    refresh(true);
    setInterval(()=>refresh(false),30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
