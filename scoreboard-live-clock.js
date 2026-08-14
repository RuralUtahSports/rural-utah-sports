(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='scoreboard.html')return;

  const compact=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
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

  function scoringPoints(text){
    const s=String(text||'').toLowerCase();
    if(/\bsafety\b/.test(s))return 2;
    if(/\bfield\s*goal\b|\b\d+\s*-?yard\s+fg\b/.test(s))return 3;
    if(/\bpat\b/.test(s)&&!/touchdown|\btd\b/.test(s))return /failed|missed|blocked/.test(s)?0:1;
    let pts=6;
    if(/\b(kick|pat)\b/.test(s)&&!/failed|missed|blocked|short|no good/.test(s))pts+=1;
    else if(/\((?:[^)]*\b(?:run|pass)\b[^)]*)\)/.test(s)&&!/failed|no good/.test(s))pts+=2;
    return pts;
  }

  function syntheticBox(g,d){
    const plays=Array.isArray(d?.scoringPlays)?d.scoringPlays:[];
    if(!plays.length)return null;
    const aq=[0,0,0,0],hq=[0,0,0,0];
    let matched=0;
    for(const play of plays){
      const text=String(play||'');
      const team=text.split('—')[0].trim();
      const teamKey=compact(team);
      const qm=text.match(/\b([1-4])Q\b/i)||text.match(/\bQ([1-4])\b/i);
      if(!qm)continue;
      const q=Number(qm[1])-1;
      if(q<0||q>3)continue;
      const pts=scoringPoints(text);
      if(teamKey===compact(g.awayTeam)){aq[q]+=pts;matched++}
      else if(teamKey===compact(g.homeTeam)){hq[q]+=pts;matched++}
    }
    if(!matched)return null;
    return{periods:['Q1','Q2','Q3','Q4'],rows:[
      {team:g.awayTeam,quarters:aq,total:aq.reduce((a,b)=>a+b,0)},
      {team:g.homeTeam,quarters:hq,total:hq.reduce((a,b)=>a+b,0)}
    ],synthetic:true};
  }

  function boxFor(g,d){
    const b=d?.boxScore;
    if(b?.rows?.length>=2)return b;
    return syntheticBox(g,d);
  }

  function liveScores(g,d){
    const b=boxFor(g,d);
    if(!b?.rows?.length)return null;
    const away=Number(b.rows[0]?.total),home=Number(b.rows[1]?.total);
    return Number.isFinite(away)&&Number.isFinite(home)?{away,home}:null;
  }

  function inlineBoxHtml(g,d){
    const b=boxFor(g,d);
    if(!b?.rows?.length)return'';
    const periods=b.periods?.length?b.periods:['Q1','Q2','Q3','Q4'];
    return `<div class="rus-inline-box"><div class="rus-inline-box-head"><b>Box Score</b><span>${b.synthetic?'Built from scoring plays':'Quarter by quarter'}</span></div><div class="table-scroll"><table><thead><tr><th>Team</th>${periods.map(x=>`<th>${esc(x)}</th>`).join('')}<th>T</th></tr></thead><tbody>${b.rows.map(r=>`<tr><td>${esc(r.team||'Team')}</td>${(r.quarters||[]).map(v=>`<td>${v??'—'}</td>`).join('')}<td>${r.total??'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
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
        if(label){
          const status=card.querySelector('.status');
          if(status&&status.textContent.trim()!==label){
            status.textContent=label;
            status.classList.toggle('final',!!d.final);
            status.classList.toggle('live',!d.final&&(!!d.clock||/live|q[1-4]|half|ot/i.test(String(d.status||''))));
          }
          const detailStatus=card.querySelector('.detail-status');
          if(detailStatus){
            const detailLabel=d.final?'Final':d.clock?`${d.clock}${d.period?' '+d.period:''}`:(d.status||'');
            if(detailStatus.textContent.trim()!==detailLabel)detailStatus.textContent=detailLabel;
          }
        }

        const live=liveScores(g,d);
        if(live){
          const scoreEls=[...card.querySelectorAll('.team-row .actual b')];
          if(scoreEls[0]&&scoreEls[0].textContent.trim()!==String(live.away))scoreEls[0].textContent=String(live.away);
          if(scoreEls[1]&&scoreEls[1].textContent.trim()!==String(live.home))scoreEls[1].textContent=String(live.home);
        }

        const boxHtml=inlineBoxHtml(g,d);
        if(boxHtml){
          const old=card.querySelector('.rus-inline-box');
          if(old)old.outerHTML=boxHtml;
          else{
            const foot=card.querySelector('.game-foot');
            if(foot)foot.insertAdjacentHTML('beforebegin',boxHtml);
          }
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
    }catch(err){console.warn('RUS live scoreboard refresh failed',err)}
  }

  function start(){
    const board=document.getElementById('board');
    if(!board)return;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(apply,50);
    }).observe(board,{childList:true,subtree:true});
    refresh();
    setInterval(refresh,30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
