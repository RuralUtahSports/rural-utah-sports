(()=>{
  const norm=v=>String(v??'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const parseDate=v=>{const t=Date.parse(String(v||''));return Number.isFinite(t)?t:0};
  const box=document.querySelector('.featured-placeholder');
  if(!box)return;

  const style=document.createElement('style');
  style.textContent=`
    .watch-list{display:grid;gap:9px}.watch-game{display:block;background:#0d0d0d;border:1px solid #333;border-radius:7px;padding:12px 13px;color:#fff;text-decoration:none;transition:.15s}.watch-game:hover{border-color:#F14D07;transform:translateY(-1px)}.watch-top{display:flex;justify-content:space-between;gap:12px;align-items:center}.watch-matchup{font-weight:900;font-size:14px}.watch-date{font-size:10px;color:#888;white-space:nowrap}.watch-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.watch-badge{font-size:9px;font-weight:900;text-transform:uppercase;border-radius:999px;padding:4px 7px;background:#222;color:#bbb;border:1px solid #383838}.watch-badge.rank{background:#F14D07;color:#000;border-color:#F14D07}.watch-badge.elo{color:#e7c35a}.watch-note{font-size:10px;color:#777;margin-top:7px}.watch-empty{color:#888;line-height:1.5}
  `;
  document.head.appendChild(style);

  function rankMap(data){
    const map=new Map();
    for(const [cls,teams] of Object.entries(data?.classifications||{})){
      (teams||[]).forEach((team,i)=>map.set(norm(team),{class:cls,rank:i+1}));
    }
    return map;
  }
  function teamScore(team,ranks,elo){
    const key=norm(team),r=ranks.get(key),e=Number(elo?.[key]?.currentElo);
    const rankScore=r?Math.max(0,11-r.rank)*12:0;
    const eloScore=Number.isFinite(e)?Math.max(0,(e-1200)/8):0;
    return {rank:r,elo:Number.isFinite(e)?e:null,quality:rankScore+eloScore};
  }
  function gameScore(g,ranks,elo){
    const a=teamScore(g.awayTeam,ranks,elo),b=teamScore(g.homeTeam,ranks,elo);
    const rankedCount=(a.rank?1:0)+(b.rank?1:0);
    const bothRanked=rankedCount===2?90:rankedCount===1?25:0;
    const eloGap=(a.elo!==null&&b.elo!==null)?Math.abs(a.elo-b.elo):450;
    const closeness=Math.max(0,80-eloGap*.18);
    const balance=(a.quality&&b.quality)?Math.min(a.quality,b.quality)*.35:0;
    return {score:a.quality+b.quality+bothRanked+closeness+balance,a,b,eloGap};
  }
  function badge(team,info){
    const out=[];
    if(info.rank)out.push(`<span class="watch-badge rank">${esc(info.rank.class)} #${info.rank.rank} ${esc(team)}</span>`);
    if(info.elo!==null)out.push(`<span class="watch-badge elo">ELO ${Math.round(info.elo)}</span>`);
    return out.join('');
  }
  function reason(meta){
    if(meta.a.rank&&meta.b.rank)return 'Two ranked teams';
    if(meta.a.rank||meta.b.rank){
      if(meta.eloGap<120)return 'Ranked team in a close ELO matchup';
      return 'Top-10 team matchup';
    }
    return 'High-ELO matchup';
  }

  async function load(){
    try{
      const [wr,rr,er]=await Promise.all([
        fetch('weekly-simulation.json'),
        fetch('rankings-current-2026.json'),
        fetch('elo-summary.json')
      ]);
      if(!wr.ok||!rr.ok||!er.ok)throw new Error('data');
      const [weekly,rankings,elo]=await Promise.all([wr.json(),rr.json(),er.json()]);
      const ranks=rankMap(rankings);
      const games=(weekly.games||[]).filter(g=>g.awayTeam&&g.homeTeam&&parseDate(g.date)>0);
      const upcoming=games.filter(g=>g.actualAway==null&&g.actualHome==null);
      const pool=upcoming.length?upcoming:games;
      const selected=pool.map(g=>({g,...gameScore(g,ranks,elo)}))
        .filter(x=>x.a.rank||x.b.rank||x.a.elo!==null||x.b.elo!==null)
        .sort((x,y)=>y.score-x.score||parseDate(x.g.date)-parseDate(y.g.date))
        .slice(0,5);
      if(!selected.length){box.innerHTML='<div class="watch-empty">No featured matchups are available yet.</div>';return;}
      box.className='watch-list';
      box.innerHTML=selected.map(x=>`<a class="watch-game" href="simulators.html#weekly"><div class="watch-top"><span class="watch-matchup">${esc(x.g.awayTeam)} at ${esc(x.g.homeTeam)}</span><span class="watch-date">${esc(x.g.date)}</span></div><div class="watch-meta">${badge(x.g.awayTeam,x.a)}${badge(x.g.homeTeam,x.b)}</div><div class="watch-note">${reason(x)} • Open Weekly Simulation →</div></a>`).join('');
    }catch(e){
      console.warn('This Week feature unavailable',e);
      box.innerHTML='<div class="watch-empty">Featured games will appear here when the weekly data is available.</div>';
    }
  }
  load();
})();