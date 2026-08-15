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
      .rus-rank-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:38px;
        height:22px;
        margin:0 6px 4px 0;
        padding:0 6px;
        border-radius:999px;
        background:#F14D07;
        color:#000;
        border:1px solid rgba(255,255,255,.2);
        font-size:9px;
        line-height:1;
        font-weight:1000;
        letter-spacing:.2px;
        vertical-align:middle;
        box-shadow:0 2px 7px rgba(0,0,0,.28);
      }
      .rus-rank-badge.rus-rank-1{background:#d5ad35}
      .rus-rank-badge.rus-rank-2{background:#b9bcc1}
      .rus-rank-badge.rus-rank-3{background:#ad6b3d;color:#fff}
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
      @media(max-width:700px){.winner .actual b{font-size:27px !important}.rus-rank-badge{height:20px;min-width:35px;font-size:8px}.rus-box-record{font-size:7px;margin-left:4px;padding:2px 5px}}
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
    let rankMap=new Map();
    let recordMap=new Map();

    function applyScoreboardRanks(){
      if(!rankMap.size)return;
      document.querySelectorAll('.team-row').forEach(row=>{
        const link=row.querySelector('.team-name');
        if(!link)return;
        const holder=link.parentElement;
        if(!holder||holder.querySelector('.rus-rank-badge'))return;
        let team='';
        try{team=new URL(link.href,location.href).searchParams.get('team')||link.textContent||''}catch{team=link.textContent||''}
        const info=rankMap.get(rankKey(team));
        if(!info)return;
        const badge=document.createElement('span');
        badge.className=`rus-rank-badge rus-rank-${info.rank}`;
        badge.textContent=`#${info.rank} ${info.cls}`;
        badge.title=`${info.cls} rank: #${info.rank}`;
        holder.insertBefore(badge,link);
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

    function refreshScoreboardExtras(){
      applyScoreboardRanks();
      applyFinalBoxRecords();
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

    document.addEventListener('change',e=>{
      if(e.target?.id==='classFilter'||e.target?.id==='statusFilter')setTimeout(refreshScoreboardExtras,0);
    });
    document.addEventListener('input',e=>{
      if(e.target?.id==='search')setTimeout(refreshScoreboardExtras,0);
    });
    document.addEventListener('click',e=>{
      if(e.target?.closest('.game-details>summary'))setTimeout(applyFinalBoxRecords,0);
    });
  }
})();