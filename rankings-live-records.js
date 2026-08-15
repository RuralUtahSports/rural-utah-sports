(()=>{
  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const aliases={
    CEDAR:'CEDARCITY',CEDARCITY:'CEDARCITY',
    GUNNISON:'GUNNISONVALLEY',GUNNISONVALLEY:'GUNNISONVALLEY',
    GRANDCOUNTY:'GRAND',MONUMENTVALLEY:'MONUMENTVAL',MONUMENTVAL:'MONUMENTVAL',
    LAYTONCHRISTIANACADEMY:'LAYTONCHRISTIAN',LAYTONCHRISTIAN:'LAYTONCHRISTIAN',
    AMERICANLEADERSHIPACADEMY:'ALA',AMERICANLEADERSHIP:'ALA',
    STJOSEPH:'SAINTJOSEPH'
  };
  const canon=v=>aliases[norm(v)]||norm(v);
  let records=new Map(),lastStamp='';

  function recordText(r){
    if(!r)return'';
    const w=Number(r.wins)||0,l=Number(r.losses)||0,t=Number(r.ties)||0;
    return t?`${w}-${l}-${t}`:`${w}-${l}`;
  }

  function teamNameFromRow(row){
    const link=row.querySelector('a[href*="team.html?team="]');
    if(link){
      try{return new URL(link.href,location.href).searchParams.get('team')||link.textContent}catch{}
    }
    return row.querySelector('.team-pill')?.textContent||'';
  }

  function addRecordToPill(pill,rec){
    if(!pill||!rec)return;
    let badge=pill.querySelector('.rus-live-record');
    if(!badge){
      badge=document.createElement('span');
      badge.className='rus-live-record';
      pill.appendChild(badge);
    }
    badge.textContent=recordText(rec);
  }

  function decorate(){
    if(!records.size)return;
    document.querySelectorAll('.rank-row,.state25-row').forEach(row=>{
      const rec=records.get(canon(teamNameFromRow(row)));
      if(rec)addRecordToPill(row.querySelector('.team-pill'),rec);
    });
  }

  function scheduleDecorate(){
    [0,120,450,1000].forEach(ms=>setTimeout(decorate,ms));
  }

  function styles(){
    if(document.getElementById('rus-rankings-live-record-style'))return;
    const s=document.createElement('style');
    s.id='rus-rankings-live-record-style';
    s.textContent=`
      .team-pill{gap:8px;flex-wrap:wrap}
      .rus-live-record{display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.28);font-size:10px;line-height:1;font-weight:900;letter-spacing:.2px;white-space:nowrap;color:inherit}
      @media(max-width:650px){
        .state25-row{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto!important;
          grid-template-areas:
            "rank move"
            "team team"
            "class elo"
            "reason reason"!important;
          gap:9px 12px!important;
          align-items:center!important;
          padding:14px 14px 16px 12px!important;
          min-height:0!important;
        }
        .state25-row>.rank-num{grid-area:rank!important;justify-self:start!important;width:36px!important;height:36px!important;font-size:15px!important}
        .state25-row>.movement{grid-area:move!important;justify-self:end!important;text-align:right!important;font-size:12px!important}
        .state25-row>.team-link{grid-area:team!important;width:100%!important;min-width:0!important;justify-self:stretch!important;display:flex!important;align-items:center!important;gap:8px!important}
        .state25-row>.team-link .team-pill{width:100%!important;max-width:none!important;min-width:0!important;justify-content:center!important;text-align:center!important;font-size:14px!important;line-height:1.15!important;padding:10px 12px!important;white-space:normal!important;overflow-wrap:anywhere!important}
        .state25-row>.team-link img{flex:0 0 34px!important;width:34px!important;height:34px!important;object-fit:contain!important}
        .state25-row>.state25-class{grid-area:class!important;display:block!important;text-align:left!important;justify-self:start!important;font-size:11px!important;color:#F14D07!important}
        .state25-row>.state25-elo{grid-area:elo!important;display:block!important;text-align:right!important;justify-self:end!important;font-size:12px!important}
        .state25-row>.state25-reason{grid-area:reason!important;grid-column:auto!important;width:100%!important;min-width:0!important;padding:0!important;margin:1px 0 0!important;font-size:13px!important;line-height:1.5!important;text-align:left!important}
      }
    `;
    document.head.appendChild(s);
  }

  function paintAvailableRankings(){
    try{
      if(typeof renderState25==='function')renderState25();
      const snaps=rankingArchive?.snapshots||[];
      if(!snaps.length||typeof renderSnapshot!=='function')return;
      const select=document.getElementById('rankingSnapshot');
      if(select&&!select.options.length){
        select.innerHTML=[...snaps].reverse().map(x=>`<option value="${esc(x.key)}">${esc(x.label)}${x.date?' — '+esc(x.date):''}</option>`).join('');
      }
      const latest=snaps.at(-1);
      if(select&&latest&&!select.value)select.value=latest.key;
      renderSnapshot(select?.value||latest?.key);
      scheduleDecorate();
    }catch(e){console.warn('Rankings quick paint:',e.message)}
  }

  async function primeRankings(){
    try{
      if(!(rankingArchive?.snapshots||[]).length){
        const res=await fetch('rankings-history-2026.json',{cache:'no-cache'});
        if(res.ok)rankingArchive=await res.json();
      }
      paintAvailableRankings();

      const loadSecondary=async()=>{
        try{
          const [c,e]=await Promise.allSettled([
            fetch('team-colors-exact.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]),
            fetch('elo-summary.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{})
          ]);
          if(c.status==='fulfilled'&&Array.isArray(c.value))for(const x of c.value)rankingColors[x.team]=x;
          if(e.status==='fulfilled'&&e.value)rankingElo=e.value;
          paintAvailableRankings();
        }catch{}
      };
      if('requestIdleCallback'in window)requestIdleCallback(loadSecondary,{timeout:1200});
      else setTimeout(loadSecondary,150);
    }catch(e){console.warn('Rankings quick load:',e.message)}
  }

  async function refresh(){
    try{
      const res=await fetch('standings-2026.json',{cache:'no-cache'});
      if(!res.ok)return;
      const data=await res.json();
      if(data.updatedAt&&data.updatedAt===lastStamp){scheduleDecorate();return}
      lastStamp=data.updatedAt||'';
      const next=new Map();
      for(const list of Object.values(data.byClassification||{}))for(const r of list||[])next.set(canon(r.team),r);
      records=next;
      scheduleDecorate();
    }catch(e){console.warn('Rankings live records:',e.message)}
  }

  styles();
  primeRankings();
  refresh();
  document.addEventListener('change',e=>{
    if(e.target?.id==='rankingSnapshot')scheduleDecorate();
  });
  window.addEventListener('load',scheduleDecorate,{once:true});
})();
