(()=>{
  const norm=v=>String(v??'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const parseDate=v=>{const t=Date.parse(String(v||''));return Number.isFinite(t)?t:0};
  const safeHex=(v,f)=>/^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(String(v||'').trim())?String(v).trim():f;
  const CLASS_ORDER=['6A','5A','4A','3A','2A','1A','8P'];
  const classLabel=c=>c==='8P'?'8-Player':c;
  const box=document.querySelector('.featured-placeholder');
  if(!box)return;

  const style=document.createElement('style');
  style.textContent=`
    .watch-list{display:grid;gap:9px}.watch-game{display:block;background:#0d0d0d;border:1px solid #333;border-radius:7px;padding:12px 13px;color:#fff;text-decoration:none;transition:.15s}.watch-game:hover{border-color:#F14D07;transform:translateY(-1px)}.watch-top{display:flex;justify-content:space-between;gap:12px;align-items:center}.watch-matchup{font-weight:900;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.watch-team{display:inline-block;padding:4px 7px;border-radius:5px;background:var(--team-bg,#222);color:var(--team-fg,#fff)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);line-height:1.15}.watch-at{font-size:9px;color:#777;text-transform:uppercase;font-weight:900}.watch-date{font-size:10px;color:#888;white-space:nowrap}.watch-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.watch-badge{font-size:9px;font-weight:900;text-transform:uppercase;border-radius:999px;padding:4px 7px;background:#222;color:#bbb;border:1px solid #383838}.watch-badge.rank{background:var(--team-bg,#F14D07);color:var(--team-fg,#000);border-color:rgba(255,255,255,.2)}.watch-badge.elo{color:#e7c35a}.watch-note{font-size:10px;color:#777;margin-top:7px}.watch-empty{color:#888;line-height:1.5}
    .class-watch{margin-top:18px;padding-top:18px;border-top:1px solid #333}.class-watch-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:11px}.class-watch-head h3{font-size:16px;text-transform:uppercase;color:#F14D07;margin:0}.class-watch-head p{font-size:10px;color:#777;line-height:1.4;margin:0}.class-watch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.class-watch-game{display:block;background:#0d0d0d;border:1px solid #333;border-radius:7px;padding:11px 12px;color:#fff;text-decoration:none;transition:.15s}.class-watch-game:hover{border-color:#F14D07;transform:translateY(-1px)}.class-watch-label{font-size:9px;font-weight:900;color:#F14D07;text-transform:uppercase;margin-bottom:7px}.class-watch-matchup{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:12px;font-weight:900}.class-watch-date{color:#777;font-size:9px;margin-top:7px}.class-watch-reason{color:#777;font-size:9px;margin-top:5px}
    @media(max-width:800px){.class-watch-grid{grid-template-columns:1fr}.watch-top{align-items:flex-start}.watch-date{padding-top:4px}}
  `;
  document.head.appendChild(style);

  function rankMap(data){
    const map=new Map();
    for(const [cls,teams] of Object.entries(data?.classifications||{})){
      (teams||[]).forEach((team,i)=>map.set(norm(team),{class:cls,rank:i+1}));
    }
    return map;
  }
  function teamMap(data){
    const map=new Map();
    for(const t of (Array.isArray(data)?data:[]))if(t?.team)map.set(norm(t.team),t);
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
  function colors(team,meta){
    const t=meta.get(norm(team));
    return {bg:safeHex(t?.backgroundColor,'#222222'),fg:safeHex(t?.textColor,'#FFFFFF')};
  }
  function teamPill(team,meta){
    const c=colors(team,meta);
    return `<span class="watch-team" data-team="${esc(team)}" style="--team-bg:${c.bg};--team-fg:${c.fg}">${esc(team)}</span>`;
  }
  function matchup(g,meta){return `${teamPill(g.awayTeam,meta)}<span class="watch-at">at</span>${teamPill(g.homeTeam,meta)}`}
  function badge(team,info,meta){
    const out=[],c=colors(team,meta);
    if(info.rank)out.push(`<span class="watch-badge rank" data-team="${esc(team)}" style="--team-bg:${c.bg};--team-fg:${c.fg}">${esc(info.rank.class)} #${info.rank.rank} ${esc(team)}</span>`);
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
  function gameKey(g){return `${g.date}|${norm(g.awayTeam)}|${norm(g.homeTeam)}`}
  function classificationOf(team,meta){
    const c=String(meta.get(norm(team))?.classification||'').trim().toUpperCase();
    return c==='8-PLAYER'?'8P':c;
  }

  async function load(){
    try{
      const [wr,rr,er,tr]=await Promise.all([
        fetch('weekly-simulation.json?v='+Date.now()),
        fetch('rankings-current-2026.json?v='+Date.now()),
        fetch('elo-summary.json?v='+Date.now()),
        fetch('teams-data.json?v='+Date.now())
      ]);
      if(!wr.ok||!rr.ok||!er.ok||!tr.ok)throw new Error('data');
      const [weekly,rankings,elo,teamData]=await Promise.all([wr.json(),rr.json(),er.json(),tr.json()]);
      const ranks=rankMap(rankings),meta=teamMap(teamData),seasonYear=Number(rankings?.season)||new Date().getFullYear();
      const games=(weekly.games||[]).filter(g=>g.awayTeam&&g.homeTeam&&parseDate(g.date)>0&&new Date(parseDate(g.date)).getFullYear()===seasonYear);
      const upcoming=games.filter(g=>g.actualAway==null&&g.actualHome==null);
      const pool=upcoming.length?upcoming:games;
      const scored=pool.map(g=>({g,...gameScore(g,ranks,elo)}))
        .filter(x=>x.a.rank||x.b.rank||x.a.elo!==null||x.b.elo!==null)
        .sort((x,y)=>y.score-x.score||parseDate(x.g.date)-parseDate(y.g.date));
      const selected=scored.slice(0,5);
      if(!selected.length){box.innerHTML='<div class="watch-empty">No featured matchups are available yet.</div>';return;}
      box.className='watch-list';
      box.innerHTML=selected.map(x=>`<a class="watch-game" href="simulators.html#weekly" data-team1="${esc(x.g.awayTeam)}" data-team2="${esc(x.g.homeTeam)}"><div class="watch-top"><span class="watch-matchup">${matchup(x.g,meta)}</span><span class="watch-date">${esc(x.g.date)}</span></div><div class="watch-meta">${badge(x.g.awayTeam,x.a,meta)}${badge(x.g.homeTeam,x.b,meta)}</div><div class="watch-note">${reason(x)} • Open Weekly Simulation →</div></a>`).join('');

      const used=new Set(selected.map(x=>gameKey(x.g))),classPicks=[];
      for(const cls of CLASS_ORDER){
        const pick=scored.find(x=>{
          const key=gameKey(x.g);if(used.has(key))return false;
          return classificationOf(x.g.awayTeam,meta)===cls||classificationOf(x.g.homeTeam,meta)===cls;
        });
        if(!pick)continue;
        used.add(gameKey(pick.g));
        classPicks.push({cls,...pick});
      }
      const week=document.querySelector('.this-week');
      if(week){
        week.querySelector('.class-watch')?.remove();
        const section=document.createElement('section');
        section.className='class-watch';
        section.innerHTML=`<div class="class-watch-head"><div><h3>Top Game in Each Classification</h3><p>Best remaining matchup in each class after the 5 featured games above.</p></div></div><div class="class-watch-grid">${classPicks.map(x=>`<a class="class-watch-game" href="simulators.html#weekly" data-team1="${esc(x.g.awayTeam)}" data-team2="${esc(x.g.homeTeam)}"><div class="class-watch-label">${classLabel(x.cls)} Game to Watch</div><div class="class-watch-matchup">${matchup(x.g,meta)}</div><div class="class-watch-date">${esc(x.g.date)}</div><div class="class-watch-reason">${reason(x)} • Open Weekly Simulation →</div></a>`).join('')||'<div class="watch-empty">Classification picks will appear when weekly matchups are available.</div>'}</div>`;
        week.appendChild(section);
      }
    }catch(e){
      console.warn('This Week feature unavailable',e);
      box.innerHTML='<div class="watch-empty">Featured games will appear here when the weekly data is available.</div>';
    }
  }
  load();
})();