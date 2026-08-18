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
  const CUSTOM_LOGOS={
  'GREEN CANYON':'school-logos/green-canyon.svg',
  'HILLCREST':'school-logos/hillcrest.svg',
  'KEARNS':'school-logos/kearns.svg',
  'LAYTON CHRISTIAN':'school-logos/layton-christian.svg',
  'LAYTON CHRISTIAN ACADEMY':'school-logos/layton-christian.svg',
  'LONE PEAK':'school-logos/lone-peak.svg',
  'MAPLE MOUNTAIN':'school-logos/maple-mountain.svg',
  'MILFORD':'school-logos/milford.svg',
  'MILLARD':'school-logos/millard.svg',
  'MORGAN':'school-logos/morgan.svg',
  'OREM':'school-logos/orem.svg',
  'PROVIDENCE HALL':'school-logos/providence-hall.svg',
  'RICH':'school-logos/rich-user.svg',
  'SAN JUAN':'school-logos/san-juan.svg',
  'VIEWMONT':'school-logos/viewmont.svg'
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
  A.logoUrl=(team,entry)=>CUSTOM_LOGOS[norm(team)]||entry?.logoUrl||A.get(team)?.logoUrl||A.fallbackLogo(team);
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
      .rus-team-record{
        display:inline-block;
        margin-top:5px;
        padding:2px 6px;
        border-radius:999px;
        background:#202020;
        border:1px solid #3a3a3a;
        color:#ddd;
        font-size:9px;
        font-weight:1000;
        line-height:1.15;
        white-space:nowrap;
      }
      .rus-rank-line{
        margin-top:5px;
        color:#F14D07;
        font-size:10px;
        font-weight:1000;
        line-height:1.2;
        white-space:normal;
      }
      .rus-rank-line.rus-rank-1{color:#d5ad35}
      .rus-rank-line.rus-rank-2{color:#d7d9dc}
      .rus-rank-line.rus-rank-3{color:#cf8754}
      .rus-state-rank{color:#d7d7d7}
      .rus-rank-line.rus-state-top-1 .rus-state-rank{color:#d5ad35}
      .rus-rank-line.rus-state-top-2 .rus-state-rank{color:#d7d9dc}
      .rus-rank-line.rus-state-top-3 .rus-state-rank{color:#cf8754}
      .rus-elo-line{
        margin-top:5px;
        font-size:9px;
        font-weight:1000;
        line-height:1.25;
        color:#bbb;
        white-space:normal;
      }
      .rus-elo-line .rus-elo-change{margin-left:4px}
      .rus-elo-line .rus-elo-up{color:#73d977}
      .rus-elo-line .rus-elo-down{color:#ff7b7b}
      .rus-elo-line .rus-elo-even{color:#bbb}
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
      @media(max-width:700px){.winner .actual b{font-size:27px !important}.rus-team-record{font-size:8px;margin-top:4px}.rus-rank-line{font-size:9px;margin-top:4px}.rus-elo-line{font-size:8px;margin-top:4px}.rus-box-record{font-size:7px;margin-left:4px;padding:2px 5px}.rus-live-mercy{font-size:8px}}
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
    const state25=[
      'CORNER CANYON','SKYRIDGE','LONE PEAK','DAVIS','MOUNTAIN RIDGE','OREM','AMERICAN FORK','RIDGELINE','HERRIMAN','SPRINGVILLE',
      'WEST','CRIMSON CLIFFS','TIMPVIEW','SYRACUSE','LEHI','BINGHAM','BOUNTIFUL','OLYMPUS','FARMINGTON','MORGAN',
      'FREMONT','PROVO','WOODS CROSS','SKY VIEW','PARK CITY'
    ];
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
    const pairKey=(a,b)=>[rankKey(a),rankKey(b)].sort().join('|');
    let rankMap=new Map();
    const stateRankMap=new Map(state25.map((team,i)=>[rankKey(team),i+1]));
    let recordMap=new Map();
    let eloPairMap=new Map();
    let mercyCount=null;

    function teamFromLink(link){
      let team='';
      try{team=new URL(link.href,location.href).searchParams.get('team')||link.textContent||''}catch{team=link.textContent||''}
      return team;
    }

    function applyTeamRecords(){
      if(!recordMap.size)return;
      document.querySelectorAll('.team-row').forEach(row=>{
        const link=row.querySelector('.team-name');
        const meta=row.querySelector('.team-meta');
        if(!link||!meta)return;
        const holder=link.parentElement;
        if(!holder||holder.querySelector('.rus-team-record'))return;
        const rec=recordMap.get(rankKey(teamFromLink(link)));
        if(!rec)return;
        const badge=document.createElement('div');
        badge.className='rus-team-record';
        badge.textContent=rec;
        badge.title=`Current 2026 record: ${rec}`;
        holder.insertBefore(badge,meta);
      });
    }

    function applyScoreboardRanks(){
      document.querySelectorAll('.team-row').forEach(row=>{
        const link=row.querySelector('.team-name');
        const meta=row.querySelector('.team-meta');
        if(!link||!meta)return;
        const holder=link.parentElement;
        if(!holder||holder.querySelector('.rus-rank-line'))return;
        const team=teamFromLink(link);
        const key=rankKey(team),info=rankMap.get(key),stateRank=stateRankMap.get(key);
        if(!info&&!stateRank)return;
        const rank=document.createElement('div');
        const classTop=info?.rank<=3?` rus-rank-${info.rank}`:'';
        const stateTop=stateRank<=3?` rus-state-top-${stateRank}`:'';
        rank.className=`rus-rank-line${classTop}${stateTop}`;
        const classPart=info?`RUS ${info.cls} Rank: #${info.rank}`:'';
        const statePart=stateRank?`<span class="rus-state-rank">State: #${stateRank}</span>`:'';
        rank.innerHTML=[classPart,statePart].filter(Boolean).join(' &nbsp;•&nbsp; ');
        rank.title=[info?`${info.cls} rank: #${info.rank}`:'',stateRank?`State rank: #${stateRank}`:''].filter(Boolean).join(' • ');
        holder.insertBefore(rank,meta);
      });
    }

    function applyFinalEloChanges(){
      if(!eloPairMap.size)return;
      document.querySelectorAll('.game.final-game').forEach(card=>{
        const rows=[...card.querySelectorAll('.team-row')].slice(0,2);
        if(rows.length!==2)return;
        const links=rows.map(row=>row.querySelector('.team-name'));
        if(links.some(x=>!x))return;
        const names=links.map(teamFromLink);
        const game=eloPairMap.get(pairKey(names[0],names[1]));
        if(!game)return;
        rows.forEach((row,i)=>{
          const holder=links[i].parentElement;
          const meta=row.querySelector('.team-meta');
          if(!holder||!meta||holder.querySelector('.rus-elo-line'))return;
          const key=rankKey(names[i]);
          const info=key===rankKey(game.awayTeam)?game.away:key===rankKey(game.homeTeam)?game.home:null;
          if(!info||!Number.isFinite(Number(info.eloBefore))||!Number.isFinite(Number(info.eloAfter))||!Number.isFinite(Number(info.change)))return;
          const change=Number(info.change),cls=change>0?'rus-elo-up':change<0?'rus-elo-down':'rus-elo-even';
          const line=document.createElement('div');
          line.className='rus-elo-line';
          line.innerHTML=`ELO ${Number(info.eloBefore)} → ${Number(info.eloAfter)} <span class="rus-elo-change ${cls}">(${change>0?'+':''}${change})</span>`;
          line.title=`Postgame ELO change from this verified final`;
          holder.insertBefore(line,meta.nextSibling);
        });
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
      applyTeamRecords();
      applyScoreboardRanks();
      applyFinalEloChanges();
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

    fetch(`elo-game-changes-2026.json?v=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        const next=new Map();
        for(const game of Object.values(data?.games||{})){
          if(!game?.awayTeam||!game?.homeTeam)continue;
          const key=pairKey(game.awayTeam,game.homeTeam),prior=next.get(key);
          if(!prior||String(game.date||'')>String(prior.date||''))next.set(key,game);
        }
        eloPairMap=next;
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
(()=>{
  const here=document.currentScript?.src||location.href;
const A=window.RUSSchoolAssets;
  if(!A)return;
  const original=A.logoUrl.bind(A);
  const norm=A.norm||((v)=>String(v??'').trim().toUpperCase().replace(/\s+/g,' '));
  const asset=(path)=>new URL(path,here).href;
  const EMERY_LOGO='data:image/webp;base64,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';
  const replacements={
    'ALTA':asset('school-logos/alta.webp?v=20260817-1'),
    'BEAVER':asset('school-logos/beaver.webp?v=20260817-1'),
    'EMERY':EMERY_LOGO,
    'GRANTSVILLE':asset('school-logos/grantsville.webp?v=20260817-1')
  };
  A.logoUrl=(team,entry)=>replacements[norm(team)]||original(team,entry);
})();
