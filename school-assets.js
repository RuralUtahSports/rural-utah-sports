(()=>{
  if(window.RUSSchoolAssets)return;
  const A=window.RUSSchoolAssets={};
  const ALIASES={
    'ALA':'American Leadership Academy',
    'CEDAR CITY':'Cedar',
    'GRAND':'Grand County',
    'GUNNISON VALLEY':'Gunnison Valley',
    'MONUMENT VAL':'Monument Valley',
    'MONUMENT VALLEY':'Monument Valley',
    'SAINT JOSEPH':'Saint Joseph',
    'UMA-LEHI':'Utah Military Academy - Camp Williams',
    'UMA-HILLFIELD':'Utah Military Academy - Hill Field',
    'WASATCH ACADEMY':'Wasatch Academy',
    'WEST FIELD':'West Field',
    'DESERET PEAK':'Deseret Peak',
    'LAYTON CHRISTIAN':'Layton Christian Academy'
  };
  const BAD=new Set(['ESCALANTE','USDB','UTAH SCH DEAF']);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const title=v=>String(v??'').trim().toLowerCase().replace(/(^|[\s-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());
  A.norm=norm;
  A.isFootballTeam=team=>!BAD.has(norm(team));
  A.uhsaaName=team=>ALIASES[norm(team)]||title(team);
  A.fallbackLogo=team=>`https://www.uhsaa.org/Logos/portfolio150/${encodeURIComponent(A.uhsaaName(team))}.png`;
  let directory=null,promise=null;
  A.load=async()=>{
    if(directory)return directory;
    if(promise)return promise;
    promise=fetch(`school-directory.json?v=${Date.now()}`).then(r=>r.ok?r.json():{}).catch(()=>({})).then(data=>{
      directory=data&&typeof data==='object'?data:{};
      return directory;
    });
    return promise;
  };
  A.get=(team)=>directory?.[norm(team)]||null;
  A.logoUrl=(team,entry)=>entry?.logoUrl||A.get(team)?.logoUrl||A.fallbackLogo(team);
  A.address=(team,entry)=>entry?.address||A.get(team)?.address||'';

  if(/(?:^|\/)scoreboard\.html$/i.test(location.pathname)){
    const style=document.createElement('style');
    style.textContent=`
      .winner .actual b{
        color:#73d977 !important;
        font-size:30px !important;
        font-weight:1000 !important;
        text-shadow:0 0 10px rgba(115,217,119,.45),0 0 20px rgba(115,217,119,.18) !important;
      }
      .winner .actual{color:#9ee7a1 !important}
      .rus-rank-inline{
        color:#F14D07;
        font-weight:1000;
        white-space:nowrap;
      }
      .rus-rank-inline.rus-rank-1{color:#d5ad35}
      .rus-rank-inline.rus-rank-2{color:#d7d9dc}
      .rus-rank-inline.rus-rank-3{color:#cf8754}
      .rus-box-record{
        display:inline-block;
        margin-left:7px;
        padding:2px 6px;
        border-radius:999px;
        background:#202020;
        border:1px solid #3a3a3a;
        color:#bbb;
        font-size:8px;
        font-weight:900;
        white-space:nowrap;
        vertical-align:middle;
      }
      .final-game .box-table tbody tr:first-child .rus-box-record,
      .final-game .box-table tbody tr:last-child .rus-box-record{color:#ddd}
      .rus-live-mercy{
        font-size:9px;
        font-weight:1000;
        text-transform:uppercase;
        padding:5px 8px;
        border-radius:999px;
        background:#ffd54a;
        color:#000;
        white-space:nowrap;
      }
      @media(max-width:700px){.winner .actual b{font-size:27px !important}.rus-box-record{font-size:7px;margin-left:4px;padding:2px 5px}.rus-live-mercy{font-size:8px}}
    `;
    document.head.appendChild(style);

    const rankingAliases={
      'CEDAR CITY':'CEDAR',
      'GRAND COUNTY':'GRAND',
      'MONUMENT VAL':'MONUMENT VALLEY',
      'UMA LEHI':'UMA-LEHI',
      'UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI',
      'LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN'
    };
    const rankKey=team=>rankingAliases[norm(team)]||norm(team);
    const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
    const isoDate=d=>{
      const s=String(d||'').trim();
      let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
      m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
    };
    const detailKey=g=>`${isoDate(g.date)}|${compact(g.awayTeam)}|${compact(g.homeTeam)}`;
    let rankMap=new Map();
    let recordMap=new Map();
    let mercyCount=null;

    function applyScoreboardRanks(){
      if(!rankMap.size)return;
      document.querySelectorAll('.team-row').forEach(row=>{
        const link=row.querySelector('.team-name');
        const meta=row.querySelector('.team-meta');
        if(!link||!meta||meta.querySelector('.rus-rank-inline'))return;
        let team='';
        try{team=new URL(link.href,location.href).searchParams.get('team')||link.textContent||''}catch{team=link.textContent||''}
        const info=rankMap.get(rankKey(team));
        if(!info)return;
        const rank=document.createElement('span');
        rank.className=`rus-rank-inline rus-rank-${info.rank}`;
        rank.textContent=` • #${info.rank}`;
        rank.title=`${info.cls} rank: #${info.rank}`;
        meta.appendChild(rank);
      });
    }

    function recordText(row){
      const w=Number(row?.wins||0),l=Number(row?.losses||0),t=Number(row?.ties||0);
      return t?`${w}-${l}-${t}`:`${w}-${l}`;
    }

    function applyFinalBoxRecords(){
      if(!recordMap.size)return;
      document.querySelectorAll('.game.final-game .box-table tbody tr').forEach(row=>{
        const cell=row.querySelector('td:first-child');
        if(!cell||cell.querySelector('.rus-box-record'))return;
        const team=[...cell.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim()||cell.textContent.trim();
        const rec=recordMap.get(rankKey(team));
        if(!rec)return;
        const badge=document.createElement('span');
        badge.className='rus-box-record';
        badge.textContent=rec;
        badge.title=`Current 2026 record: ${rec}`;
        cell.appendChild(badge);
      });
    }

    function applyLiveMercyBadges(){
      document.querySelectorAll('.game.live-game').forEach(card=>{
        if(card.querySelector('.mercy-badge,.rus-live-mercy'))return;
        const status=card.querySelector('.status')?.textContent||'';
        if(!/\bQ4\b|4TH|FOURTH/i.test(status))return;
        const scores=[...card.querySelectorAll('.actual b')].map(x=>Number(x.textContent.trim()));
        if(scores.length<2||!scores.every(Number.isFinite)||Math.abs(scores[0]-scores[1])<44)return;
        const foot=card.querySelector('.game-foot');
        if(!foot)return;
        const badge=document.createElement('span');
        badge.className='rus-live-mercy';
        badge.textContent='44+ Mercy Rule';
        badge.title='A 44-point lead was reached in the fourth quarter.';
        foot.insertBefore(badge,foot.querySelector('.deseret-link'));
      });
    }

    function applyMercySummary(){
      if(mercyCount===null)return;
      document.querySelectorAll('#summary .summary').forEach(box=>{
        const label=box.querySelector('span');
        if(!label||!/44\+.*Mercy Rule/i.test(label.textContent))return;
        const value=box.querySelector('strong');
        if(value)value.textContent=String(mercyCount);
      });
    }

    function refreshScoreboardExtras(){
      applyScoreboardRanks();
      applyFinalBoxRecords();
      applyLiveMercyBadges();
      applyMercySummary();
    }

    fetch(`rankings-history-2026.json?v=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        const snap=data?.snapshots?.at(-1);
        if(!snap)return;
        const next=new Map();
        for(const [cls,teams] of Object.entries(snap.classifications||{})){
          (teams||[]).forEach((team,i)=>next.set(rankKey(team),{rank:i+1,cls}));
        }
        rankMap=next;
        [0,100,400,1000].forEach(ms=>setTimeout(refreshScoreboardExtras,ms));
      })
      .catch(()=>{});

    fetch(`standings-2026.json?v=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        const next=new Map();
        for(const teams of Object.values(data?.byClassification||{})){
          for(const row of teams||[])if(row?.team)next.set(rankKey(row.team),recordText(row));
        }
        recordMap=next;
        [0,100,400,1000].forEach(ms=>setTimeout(refreshScoreboardExtras,ms));
      })
      .catch(()=>{});

    Promise.all([
      fetch(`weekly-simulation.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null),
      fetch(`deseret-game-details.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null)
    ]).then(([weekly,details])=>{
      if(!weekly)return;
      let count=0;
      for(const g of weekly.games||[]){
        const d=details?.games?.[detailKey(g)]||null;
        const sheetDone=g.actualAway!==null&&g.actualAway!==undefined&&g.actualHome!==null&&g.actualHome!==undefined;
        const box=d?.boxScore?.rows||[];
        const away=sheetDone?Number(g.actualAway):Number(box[0]?.total);
        const home=sheetDone?Number(g.actualHome):Number(box[1]?.total);
        if(!Number.isFinite(away)||!Number.isFinite(home)||Math.abs(away-home)<44)continue;
        const sourceFinal=sheetDone||!!d?.final;
        const status=String(d?.status||'');
        const q4=!sourceFinal&&(/\bQ4\b|4TH|FOURTH/i.test(status)||/\bQ4\b/i.test(String(d?.clock||''))||/\bQ4\b/i.test(String(d?.period||'')));
        if(sourceFinal||q4)count++;
      }
      mercyCount=count;
      refreshScoreboardExtras();
    }).catch(()=>{});

    document.addEventListener('change',e=>{
      if(e.target?.id==='classFilter'||e.target?.id==='statusFilter')setTimeout(refreshScoreboardExtras,0);
    });
    document.addEventListener('input',e=>{
      if(e.target?.id==='search')setTimeout(refreshScoreboardExtras,0);
    });
    document.addEventListener('click',e=>{
      if(e.target?.closest('.game-details>summary'))setTimeout(refreshScoreboardExtras,0);
    });
    setInterval(refreshScoreboardExtras,5000);
  }
})();