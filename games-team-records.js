(()=>{
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const norm=v=>String(v??'').trim().toUpperCase();
  const key=v=>norm(v).replace(/[^A-Z0-9]/g,'');
  const dateValue=d=>{const t=Date.parse(String(d||''));return Number.isFinite(t)?t:0};

  const style=document.createElement('style');
  style.textContent=`
    .team-single-records{display:none;background:#000;border:1px solid #333;border-left:5px solid #F14D07;border-radius:7px;padding:17px;margin-bottom:15px}
    .team-single-records.show{display:block}
    .team-single-records h3{text-transform:uppercase;font-size:20px;margin-bottom:10px}
    .team-record-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
    .team-record-card{background:#181818;border:1px solid #2f2f2f;border-radius:5px;padding:13px}
    .team-record-card strong{display:block;color:#F14D07;font-size:24px}
    .team-record-card .label{display:block;color:#777;font-size:9px;font-weight:900;text-transform:uppercase;margin-top:4px}
    .team-record-card .detail{display:block;color:#aaa;font-size:11px;line-height:1.45;margin-top:7px}
    @media(max-width:600px){.team-record-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function getBox(){
    let box=document.getElementById('teamSingleRecords');
    if(box)return box;
    box=document.createElement('section');
    box.id='teamSingleRecords';
    box.className='team-single-records';
    const matchup=document.getElementById('matchup');
    if(matchup)matchup.parentNode.insertBefore(box,matchup);
    return box;
  }

  function parseOneTeam(){
    const input=document.getElementById('search');
    if(!input)return null;
    const raw=input.value.trim();
    if(!raw||/\s+(?:vs\.?|v\.?|@)\s+/i.test(raw))return null;
    if(typeof games==='undefined'||!Array.isArray(games)||!games.length)return null;
    const names=[...new Set(games.flatMap(g=>[g.team1,g.team2]).filter(Boolean))];
    const exact=names.find(n=>norm(n)===norm(raw));
    if(exact)return exact;
    const matches=names.filter(n=>norm(n).includes(norm(raw)));
    return matches.length===1?matches[0]:null;
  }

  function perspective(g,team){
    if(key(g.team1)===key(team))return{for:g.score1,against:g.score2,opp:g.team2};
    if(key(g.team2)===key(team))return{for:g.score2,against:g.score1,opp:g.team1};
    return null;
  }

  function render(){
    const box=getBox();
    if(!box)return;
    const team=parseOneTeam();
    if(!team){box.className='team-single-records';box.innerHTML='';return;}
    const set=games.filter(g=>key(g.team1)===key(team)||key(g.team2)===key(team));
    let scored=null,allowed=null;
    for(const g of set){
      const p=perspective(g,team);if(!p)continue;
      if(!scored||p.for>scored.value||(p.for===scored.value&&dateValue(g.date)>dateValue(scored.game.date)))scored={value:p.for,p,game:g};
      if(!allowed||p.against>allowed.value||(p.against===allowed.value&&dateValue(g.date)>dateValue(allowed.game.date)))allowed={value:p.against,p,game:g};
    }
    const card=(label,r)=>`<div class="team-record-card"><strong>${r?r.value:'—'}</strong><span class="label">${label}</span>${r?`<span class="detail">vs ${esc(r.p.opp)} • ${esc(r.game.date||r.game.year||'—')} • ${r.p.for}–${r.p.against}</span>`:''}</div>`;
    box.className='team-single-records show';
    box.innerHTML=`<h3>${esc(team)} Single-Game Records</h3><div class="team-record-grid">${card('Most Points Scored',scored)}${card('Most Points Allowed',allowed)}</div>`;
  }

  const search=document.getElementById('search');
  if(search)search.addEventListener('input',()=>setTimeout(render,0));
  ['year','type','sort'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>setTimeout(render,0));});
  window.addEventListener('load',()=>setTimeout(render,250));
  setTimeout(render,750);
})();