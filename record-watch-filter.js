(()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(path!=='index.html')return;

  if(!document.querySelector('script[data-rus-home-school-colors]')){
    const s=document.createElement('script');
    s.src='school-colors.js?v=20260815a';
    s.async=true;
    s.dataset.rusHomeSchoolColors='1';
    document.body.appendChild(s);
  }

  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isJV=name=>/(^|\s)J\.?V\.?(\s|$)/i.test(String(name||''))||/JUNIOR\s+VARSITY/i.test(String(name||''));
  const isOutOfState=name=>/\(([A-Z]{2})\)\s*$/i.test(String(name||''))&&!/\(UT\)\s*$/i.test(String(name||''));

  async function setup(host){
    let allowed=new Set(),streakByTeam=new Map(),seasonGames=[];
    try{
      const stamp=Date.now();
      const [teamRes,streakRes,eloRes]=await Promise.all([
        fetch('teams-data.json?v='+stamp,{cache:'no-store'}),
        fetch('streak-records.json?v='+stamp,{cache:'no-store'}),
        fetch('elo-game-changes-2026.json?v='+stamp,{cache:'no-store'}).catch(()=>null)
      ]);
      if(teamRes.ok){
        const data=await teamRes.json();
        allowed=new Set((Array.isArray(data)?data:[]).map(t=>norm(t.team)).filter(Boolean));
      }
      if(streakRes.ok){
        const data=await streakRes.json();
        streakByTeam=new Map(Object.entries(data||{}).map(([team,row])=>[norm(team),row]));
      }
      if(eloRes?.ok){
        const data=await eloRes.json();
        seasonGames=Object.values(data?.games||{}).filter(g=>g?.date&&g?.awayTeam&&g?.homeTeam&&Number.isFinite(Number(g.awayScore))&&Number.isFinite(Number(g.homeScore)));
      }
    }catch(e){console.error('Record Watch data:',e)}

    const eligible=name=>{
      if(!name||isJV(name)||isOutOfState(name))return false;
      return allowed.size>0&&allowed.has(norm(name));
    };

    function currentWinStreak(team,base){
      const t=norm(team),through=Date.parse(String(base?.currentWinStreak?.endDate||'')),games=seasonGames.filter(g=>(norm(g.awayTeam)===t||norm(g.homeTeam)===t)&&(!Number.isFinite(through)||Date.parse(String(g.date||''))>through)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      if(!games.length)return Number(base?.currentWinStreak?.length)||0;
      let current=Number(base?.currentWinStreak?.length)||0;
      for(const g of games){
        const away=Number(g.awayScore),home=Number(g.homeScore),isAway=norm(g.awayTeam)===t;
        const teamScore=isAway?away:home,oppScore=isAway?home:away;
        if(teamScore>oppScore)current++;
        else current=0;
      }
      return current;
    }

    let filtering=false;
    const filter=()=>{
      if(filtering)return;
      const grid=host.querySelector('.rus-watch-grid');
      if(!grid)return;
      filtering=true;
      const kept=[];
      for(const card of [...grid.querySelectorAll('.rus-watch-card')]){
        let team='';
        try{team=new URL(card.getAttribute('href')||'',location.href).searchParams.get('team')||''}catch(e){}
        if(!eligible(team)){card.remove();continue}

        const streak=streakByTeam.get(norm(team));
        const current=currentWinStreak(team,streak);
        const best=Number(streak?.longestWinStreak?.length);
        if(Number.isFinite(current)){
          if(current<2){card.remove();continue}
          const strong=card.querySelector('strong');
          if(strong)strong.textContent=`${team} — ${current} straight wins`;
          const spans=[...card.querySelectorAll('span')];
          const program=spans.find(s=>/program record/i.test(s.textContent));
          if(program)program.textContent=`Program record: ${Number.isFinite(best)&&best>0?best:'—'} wins`;
          const distance=card.querySelector('.rus-record-distance');
          if(distance){
            const left=Number.isFinite(best)&&best>0?best-current:null;
            distance.textContent=left===null?'Program record unavailable':left<=0?'At listed program record':`${left} win${left===1?'':'s'} from record`;
          }
          card.dataset.current=String(current);
          card.dataset.best=String(Number.isFinite(best)?best:0);
          kept.push(card);
        }else card.remove();
      }
      kept.sort((a,b)=>{
        const ac=Number(a.dataset.current)||0,bc=Number(b.dataset.current)||0;
        const ab=Number(a.dataset.best)||0,bb=Number(b.dataset.best)||0;
        const ad=ab?Math.max(ab-ac,0):9999,bd=bb?Math.max(bb-bc,0):9999;
        return ad-bd||bc-ac;
      }).forEach(card=>grid.appendChild(card));
      if(!grid.querySelector('.rus-watch-card'))host.innerHTML='<div class="rus-feature-loading">No Utah varsity multi-game active win streaks are available in the latest recorded results.</div>';
      filtering=false;
    };

    const subtitle=document.querySelector('#rusRecordWatch .rus-feature-head p');
    if(subtitle)subtitle.textContent='Based on each Utah varsity program’s authoritative team schedule.';

    const observer=new MutationObserver(()=>setTimeout(filter,0));
    observer.observe(host,{childList:true,subtree:true});
    filter();
  }

  function init(attempt=0){
    const host=document.getElementById('rusWatchBody');
    if(host){setup(host);return}
    if(attempt<100)setTimeout(()=>init(attempt+1),100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init());
  else init();
})();
