(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='scoreboard.html')return;

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

  let weeklyGames=[];
  let details={};
  let timer=null;
  let applying=false;

  function liveLabel(d){
    if(!d)return'';
    if(d.final)return'Final';
    if(d.clock){
      const period=d.period||(/^Q[1-4]$/i.test(String(d.status||''))?String(d.status).toUpperCase():'');
      return`Live • ${d.clock}${period?' '+period:''}`;
    }
    if(d.status&&d.status!=='Scheduled')return d.status;
    return'';
  }

  function apply(){
    if(applying)return;
    applying=true;
    try{
      const byPair=new Map(weeklyGames.map(g=>[pairKey(g.awayTeam,g.homeTeam),g]));
      document.querySelectorAll('#board .game').forEach(card=>{
        const teams=[...card.querySelectorAll('.team-name')].map(el=>el.textContent.trim());
        if(teams.length<2)return;
        const g=byPair.get(pairKey(teams[0],teams[1]));
        if(!g)return;
        const d=details[gameKey(g)];
        if(!d)return;
        const label=liveLabel(d);
        if(!label)return;

        const status=card.querySelector('.status');
        if(status&&status.textContent.trim()!==label){
          status.textContent=label;
          status.classList.toggle('final',!!d.final);
          status.classList.toggle('live',!d.final&&!!d.clock);
        }

        const detailStatus=card.querySelector('.detail-status');
        if(detailStatus){
          const detailLabel=d.final?'Final':d.clock?`${d.clock}${d.period?' '+d.period:''}`:(d.status||'');
          if(detailStatus.textContent.trim()!==detailLabel)detailStatus.textContent=detailLabel;
        }
      });
    }finally{applying=false}
  }

  async function refresh(){
    try{
      const stamp=Date.now();
      const [wr,dr]=await Promise.all([
        fetch(`weekly-simulation.json?v=${stamp}`,{cache:'no-store'}),
        fetch(`deseret-game-details.json?v=${stamp}`,{cache:'no-store'})
      ]);
      if(!wr.ok||!dr.ok)return;
      const weekly=await wr.json();
      const detailData=await dr.json();
      weeklyGames=Array.isArray(weekly.games)?weekly.games:[];
      details=detailData.games||{};
      apply();
    }catch(err){console.warn('RUS live clock refresh failed',err)}
  }

  function start(){
    const board=document.getElementById('board');
    if(!board)return;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(apply,50);
    }).observe(board,{childList:true,subtree:true});
    refresh();
    setInterval(refresh,60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
