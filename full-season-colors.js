(()=>{
  const F=window.RUSFullSeason=window.RUSFullSeason||{};
  const safe=(v,f)=>/^#[0-9A-F]{6}$/i.test(String(v||'').trim())?String(v).trim():f;
  const info=n=>F.info?.(String(n||'').trim())||null;

  if(!document.getElementById('fsTeamColorStyle')){
    const s=document.createElement('style');
    s.id='fsTeamColorStyle';
    s.textContent=`
      #full-season .fs-team-pill{display:inline-block;padding:5px 9px;border-radius:6px;font-weight:900;text-decoration:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);white-space:nowrap}
      #full-season tr.fs-team-row td:first-child{box-shadow:inset 4px 0 0 var(--fs-team-color)}
      #full-season .fsp-team.fs-team-colored{box-shadow:inset 4px 0 0 var(--fs-team-color);background:linear-gradient(90deg,color-mix(in srgb,var(--fs-team-color) 18%,#151515) 0%,#151515 48%)}
      #full-season .fsp-team.fs-team-colored.win{background:linear-gradient(90deg,color-mix(in srgb,var(--fs-team-color) 30%,#202020) 0%,#202020 55%)}
      #full-season .fsp-team .fsp-name.fs-team-pill{padding:4px 7px}
      #full-season .fsp-champ.fs-team-champ{border-color:var(--fs-team-color)!important;box-shadow:inset 0 4px 0 var(--fs-team-color)}
      #full-season .fsp-champ.fs-team-champ small{color:var(--fs-team-color)!important}
    `;
    document.head.append(s);
  }

  const paintTableCell=td=>{
    const name=(td.textContent||'').trim(),t=info(name);if(!t)return;
    const bg=safe(t.backgroundColor,'#2a2a2a'),fg=safe(t.textColor,'#fff');
    td.dataset.fsColor='1';
    const a=document.createElement('a');
    a.className='fs-team-pill';a.href=`team.html?team=${encodeURIComponent(name)}`;a.textContent=name;
    a.style.backgroundColor=bg;a.style.color=fg;
    td.replaceChildren(a);
    const tr=td.closest('tr');if(tr){tr.classList.add('fs-team-row');tr.style.setProperty('--fs-team-color',bg)}
  };

  const paintPlayoffRow=row=>{
    const n=row.querySelector('.fsp-name');if(!n)return;
    const name=(n.textContent||'').trim();if(!name||name==='BYE')return;
    const t=info(name);if(!t)return;
    const bg=safe(t.backgroundColor,'#2a2a2a'),fg=safe(t.textColor,'#fff');
    row.classList.add('fs-team-colored');row.style.setProperty('--fs-team-color',bg);
    n.classList.add('fs-team-pill');n.style.backgroundColor=bg;n.style.color=fg;
  };

  const paint=host=>{
    host.querySelectorAll('td.stat-team').forEach(td=>{if(!td.dataset.fsColor)paintTableCell(td)});
    host.querySelectorAll('.fsp-team').forEach(paintPlayoffRow);
    const champBox=host.querySelector('.fsp-champ'),champ=champBox?.querySelector('strong');
    if(champBox&&champ){const name=(champ.textContent||'').trim(),t=info(name);if(t){const bg=safe(t.backgroundColor,'#F14D07'),fg=safe(t.textColor,'#fff');champBox.classList.add('fs-team-champ');champBox.style.setProperty('--fs-team-color',bg);champ.classList.add('fs-team-pill');champ.style.backgroundColor=bg;champ.style.color=fg}}
    host.querySelectorAll('.fsp-tab').forEach(b=>{if(b.dataset.fsColorBound)return;b.dataset.fsColorBound='1';b.addEventListener('click',()=>requestAnimationFrame(()=>paint(host)))})
  };

  const base=F.render;if(typeof base==='function'&&!base.__fsColors){const wrapped=async(R,host,filter='ALL')=>{await base(R,host,filter);paint(host)};wrapped.__fsColors=true;F.render=wrapped}
})();