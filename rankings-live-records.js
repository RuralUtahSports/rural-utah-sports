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
    s.textContent=`.team-pill{gap:8px;flex-wrap:wrap}.rus-live-record{display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.28);font-size:10px;line-height:1;font-weight:900;letter-spacing:.2px;white-space:nowrap;color:inherit}`;
    document.head.appendChild(s);
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
  refresh();
  document.addEventListener('change',e=>{
    if(e.target?.id==='rankingSnapshot')scheduleDecorate();
  });
  window.addEventListener('load',scheduleDecorate,{once:true});
})();
