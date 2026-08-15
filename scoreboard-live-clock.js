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
  let lastUpdatedAt='';
  const mercyKeys=new Set();

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

  function normalizeDetails(){
    let mainNeedsRender=false;
    const byKey=new Map(weeklyGames.map(g=>[gameKey(g),g]));
    for(const [key,d] of Object.entries(details||{})){
      const g=byKey.get(key);
      if(!g||!d)continue;
      if(!d.boxScore?.rows?.length){
        const synth=syntheticBox(g,d);
        if(synth)d.boxScore=synth;
      }
      const scores=liveScores(g,d);
      if(scores&&Math.abs(scores.away-scores.home)>=44){
        d.final=true;
        d.status='Final';
        d.clock='';
        d.period='';
        d.mercyRule=true;
        mercyKeys.add(key);
      }
      try{
        if(typeof detailMap!=='undefined'&&detailMap?.set){
          const old=detailMap.get(key);
          if(!!old?.final!==!!d.final||!!old?.mercyRule!==!!d.mercyRule)mainNeedsRender=true;
          detailMap.set(key,d);
        }
      }catch{}
    }
    if(mainNeedsRender){
      try{if(typeof render==='function')render()}catch{}
    }
  }

  function updateSummary(){
    const all=weeklyGames.map(g=>({g,d:details[gameKey(g)]}));
    let mercy=0,finals=0;
    for(const {g,d} of all){
      const s=liveScores(g,d);
      const isMercy=!!d?.mercyRule||(s&&Math.abs(s.away-s.home)>=44);
      if(isMercy)mercy++;
      if(d?.final||isMercy||((g.actualAway!==null&&g.actualAway!==undefined)&&(g.actualHome!==null&&g.actualHome!==undefined)))finals++;
    }
    document.querySelectorAll('#summary .summary').forEach(x=>{
      const label=String(x.querySelector('span')?.textContent||'').toUpperCase();
      const value=x.querySelector('strong');
      if(!value)return;
      if(label==='FINAL')value.textContent=String(finals);
      else if(label==='REMAINING')value.textContent=String(Math.max(0,weeklyGames.length-finals));
      else if(label.includes('44+ POINT MERCY RULE'))value.textContent=String(mercy);
    });
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
        const key=gameKey(g),d=details[key];
        if(!d)return;
        const live=liveScores(g,d);
        const mercy=!!d.mercyRule||(live&&Math.abs(live.away-live.home)>=44);
        if(mercy&&!d.final){d.final=true;d.status='Final';d.clock='';d.period='';d.mercyRule=true;mercyKeys.add(key)}

        const label=liveLabel(d);
        if(label){
          const status=card.querySelector('.status');
          if(status&&status.textContent.trim()!==label)status.textContent=label;
          if(status){
            status.classList.toggle('final',!!d.final);
            status.classList.toggle('live',!d.final&&(!!d.clock||/live|q[1-4]|half|ot/i.test(String(d.status||''))));
          }
          const detailStatus=card.querySelector('.detail-status');
          if(detailStatus){
            const detailLabel=d.final?'Final':d.clock?`${d.clock}${d.period?' '+d.period:''}`:(d.status||'');
            if(detailStatus.textContent.trim()!==detailLabel)detailStatus.textContent=detailLabel;
          }
        }

        if(live){
          const scoreEls=[...card.querySelectorAll('.team-row .actual b')];
          if(scoreEls[0]&&scoreEls[0].textContent.trim()!==String(live.away))scoreEls[0].textContent=String(live.away);
          if(scoreEls[1]&&scoreEls[1].textContent.trim()!==String(live.home))scoreEls[1].textContent=String(live.home);
        }

        if(mercy){
          card.dataset.rusMercyFinal='1';
          const foot=card.querySelector('.game-foot');
          if(foot&&!foot.querySelector('.mercy-badge'))foot.insertAdjacentHTML('beforeend','<span class="mercy-badge">44+ Mercy Rule</span>');
        }

        const boxHtml=inlineBoxHtml(g,d);
        if(boxHtml){
          const sig=JSON.stringify(boxFor(g,d)?.rows?.map(r=>[r.total,...(r.quarters||[])])||[]);
          const old=card.querySelector('.rus-inline-box');
          if(old){
            if(old.dataset.rusSig!==sig){old.outerHTML=boxHtml;const fresh=card.querySelector('.rus-inline-box');if(fresh)fresh.dataset.rusSig=sig}
          }else{
            const foot=card.querySelector('.game-foot');
            if(foot){foot.insertAdjacentHTML('beforebegin',boxHtml);const fresh=card.querySelector('.rus-inline-box');if(fresh)fresh.dataset.rusSig=sig}
          }
        }
      });
      updateSummary();
    }finally{applying=false}
  }

  async function loadWeekly(){
    if(weeklyGames.length)return true;
    try{
      const r=await fetch(`weekly-simulation.json?v=${Date.now()}`,{cache:'force-cache'});
      if(!r.ok)return false;
      const weekly=await r.json();
      weeklyGames=Array.isArray(weekly.games)?weekly.games:[];
      return true;
    }catch{return false}
  }

  async function refresh(force=false){
    try{
      if(!await loadWeekly())return;
      const dr=await fetch(`deseret-game-details.json?v=${Date.now()}`,{cache:'no-store'});
      if(!dr.ok)return;
      const detailData=await dr.json();
      const stamp=String(detailData.updatedAt||'');
      if(!force&&stamp&&stamp===lastUpdatedAt)return;
      lastUpdatedAt=stamp;
      details=detailData.games||{};
      normalizeDetails();
      apply();
    }catch(err){console.warn('RUS live scoreboard refresh failed',err)}
  }

  function start(){
    const board=document.getElementById('board');
    if(!board)return;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(apply,120);
    }).observe(board,{childList:true,subtree:true});
    refresh(true);
    setInterval(()=>refresh(false),30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
