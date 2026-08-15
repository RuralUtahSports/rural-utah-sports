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
  let records=new Map(),lastStamp='',smallSchoolArchive=null;

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
    document.querySelectorAll('.rank-row,.state25-row,.small-school-row').forEach(row=>{
      const rec=records.get(canon(teamNameFromRow(row)));
      if(rec)addRecordToPill(row.querySelector('.team-pill'),rec);
    });
  }

  function scheduleDecorate(){
    [0,120,450,1000].forEach(ms=>setTimeout(decorate,ms));
  }

  function classMovement(team,index,cls,snapIndex){
    const snaps=rankingArchive?.snapshots||[];
    if(snapIndex<=0)return{cls:'same',text:'—'};
    const prev=snaps[snapIndex-1];
    const old=(prev?.classifications?.[cls]||[]).findIndex(x=>x===team);
    if(old<0)return{cls:'new',text:'NEW'};
    const diff=old-index;
    if(diff>0)return{cls:'up',text:`▲ +${diff}`};
    if(diff<0)return{cls:'down',text:`▼ ${diff}`};
    return{cls:'same',text:'—'};
  }

  function decorateClassMovement(){
    const snaps=rankingArchive?.snapshots||[];
    if(!snaps.length)return;
    const selected=document.getElementById('rankingSnapshot')?.value;
    let snapIndex=snaps.findIndex(x=>x.key===selected);
    if(snapIndex<0)snapIndex=snaps.length-1;
    const snap=snaps[snapIndex];
    if(!snap)return;

    document.querySelectorAll('.rank-card').forEach(card=>{
      const cls=(card.querySelector('.rank-head h2')?.textContent||'').trim().toUpperCase();
      const teams=snap.classifications?.[cls]||[];
      card.querySelectorAll('.rank-row').forEach((row,index)=>{
        const team=teams[index]||teamNameFromRow(row);
        const move=classMovement(team,index,cls,snapIndex);
        let el=row.querySelector('.class-movement');
        if(!el){
          el=document.createElement('div');
          el.className='movement class-movement';
          const rank=row.querySelector('.rank-num');
          if(rank)rank.insertAdjacentElement('afterend',el);else row.prepend(el);
        }
        el.className=`movement class-movement ${move.cls}`;
        el.textContent=move.text;
        row.classList.add('has-class-movement');
      });
    });
  }

  function scheduleClassMovement(){
    [0,80,220,500].forEach(ms=>setTimeout(decorateClassMovement,ms));
  }

  function addClassRankingsNote(){
    if(document.getElementById('classRankingsUpdateNote'))return;
    const controls=document.querySelector('.archive-controls');
    if(!controls)return;
    const note=document.createElement('div');
    note.id='classRankingsUpdateNote';
    note.className='class-rankings-update-note';
    note.innerHTML='<strong>Class rankings update:</strong> The class-by-class rankings will be updated after all of today\'s games are finished.';
    controls.insertAdjacentElement('afterend',note);
  }

  function smallMovement(team,index,snapIndex){
    if(!smallSchoolArchive||snapIndex<=0)return{cls:'same',text:'—'};
    const prev=smallSchoolArchive.snapshots[snapIndex-1];
    const old=(prev?.teams||[]).findIndex(x=>(x.team||x)===team);
    if(old<0)return{cls:'new',text:'NEW'};
    const diff=old-index;
    if(diff>0)return{cls:'up',text:`▲ +${diff}`};
    if(diff<0)return{cls:'down',text:`▼ ${diff}`};
    return{cls:'same',text:'—'};
  }

  function smallSchoolRow(item,index,snapIndex){
    const team=item.team||item;
    const cls=item.classification||'';
    const color=rankingColors?.[team]||{backgroundColor:'#222222',textColor:'#FFFFFF'};
    const bg=/^#[0-9A-F]{6}$/i.test(String(color.backgroundColor||''))?color.backgroundColor:'#222222';
    const fg=/^#[0-9A-F]{6}$/i.test(String(color.textColor||''))?color.textColor:'#FFFFFF';
    const move=smallMovement(team,index,snapIndex);
    const eloVal=rankingElo?.[team];
    const elo=Number.isFinite(Number(eloVal))?Math.round(Number(eloVal)):'';
    const rank=index+1;
    const top=rank<=3?` top${rank}`:'';
    return `<li class="small-school-row" style="--small-accent:${bg}"><div class="rank-num${top}">${rank}</div><div class="movement ${move.cls}">${move.text}</div><a class="team-link" href="team.html?team=${encodeURIComponent(team)}"><span class="team-pill" style="background:${bg};color:${fg}">${typeof esc==='function'?esc(team):team}</span></a><span class="small-school-class">${typeof esc==='function'?esc(cls):cls}</span><span class="small-school-elo">${elo}</span></li>`;
  }

  function renderSmallSchool(key){
    const snaps=smallSchoolArchive?.snapshots||[];
    if(!snaps.length)return;
    let idx=snaps.findIndex(x=>x.key===key);
    if(idx<0)idx=snaps.length-1;
    const snap=snaps[idx];
    const teams=snap?.teams||[];
    const split=Math.ceil(teams.length/2);
    const left=teams.slice(0,split).map((x,i)=>smallSchoolRow(x,i,idx)).join('');
    const right=teams.slice(split).map((x,i)=>smallSchoolRow(x,i+split,idx)).join('');
    const list=document.getElementById('smallSchoolList');
    if(list)list.innerHTML=`<ol class="small-school-column">${left}</ol><ol class="small-school-column">${right}</ol>`;
    const help=document.getElementById('smallSchoolArchiveHelp');
    if(help)help.textContent=idx===0?'This is the first archived 3A–1A overall poll, so movement is not shown.':'Movement compares this poll with the previous published 3A–1A overall ranking.';
    scheduleDecorate();
  }

  async function loadSmallSchoolArchive(){
    if(smallSchoolArchive?.snapshots?.length)return smallSchoolArchive;
    try{
      const res=await fetch('small-school-rankings-history-2026.json',{cache:'no-cache'});
      if(res.ok)smallSchoolArchive=await res.json();
    }catch(e){console.warn('3A-1A rankings:',e.message)}
    return smallSchoolArchive;
  }

  async function addSmallSchoolView(){
    if(document.getElementById('smallSchoolToggle'))return;
    const jump=document.querySelector('.class-jump');
    const archiveControls=document.querySelector('.archive-controls');
    if(!jump||!archiveControls)return;

    const button=document.createElement('button');
    button.type='button';
    button.id='smallSchoolToggle';
    button.className='small-school-toggle';
    button.textContent='3A–1A Overall Rankings';
    const stateLink=jump.querySelector('a');
    if(stateLink)stateLink.insertAdjacentElement('afterend',button);else jump.prepend(button);

    const section=document.createElement('section');
    section.id='small-school-overall';
    section.className='small-school-section';
    section.hidden=true;
    section.innerHTML=`
      <div class="small-school-head">
        <div><h2>3A–1A Overall Rankings</h2><p>Every 3A, 2A and 1A football team ranked together from top to bottom.</p></div>
        <button type="button" class="small-school-close" id="smallSchoolClose" aria-label="Close 3A to 1A rankings">×</button>
      </div>
      <div class="state25-controls">
        <div class="archive-field"><label for="smallSchoolSnapshot">3A–1A Ranking Week</label><select id="smallSchoolSnapshot"></select></div>
        <div class="archive-help" id="smallSchoolArchiveHelp">Loading archive…</div>
      </div>
      <div class="small-school-labels"><span>Rank</span><span>Move</span><span>Team</span><span>Class</span><span>ELO</span></div>
      <div id="smallSchoolList" class="small-school-list"><div class="loading">Loading 3A–1A rankings…</div></div>`;
    archiveControls.insertAdjacentElement('beforebegin',section);

    const open=async()=>{
      section.hidden=false;
      button.classList.add('active');
      await loadSmallSchoolArchive();
      const snaps=smallSchoolArchive?.snapshots||[];
      const select=document.getElementById('smallSchoolSnapshot');
      if(select&&snaps.length){
        select.innerHTML=[...snaps].reverse().map(x=>`<option value="${x.key}">${x.label}${x.date?' — '+x.date:''}</option>`).join('');
        select.value=snaps.at(-1).key;
        renderSmallSchool(select.value);
      }
      section.scrollIntoView({behavior:'smooth',block:'start'});
    };
    const close=()=>{section.hidden=true;button.classList.remove('active')};
    button.addEventListener('click',()=>section.hidden?open():close());
    document.getElementById('smallSchoolClose')?.addEventListener('click',close);
    document.getElementById('smallSchoolSnapshot')?.addEventListener('change',e=>renderSmallSchool(e.target.value));
  }

  function styles(){
    if(document.getElementById('rus-rankings-live-record-style'))return;
    const s=document.createElement('style');
    s.id='rus-rankings-live-record-style';
    s.textContent=`
      .team-pill{gap:8px;flex-wrap:wrap}
      .rus-live-record{display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.28);font-size:10px;line-height:1;font-weight:900;letter-spacing:.2px;white-space:nowrap;color:inherit}
      .class-rankings-update-note{margin:-5px 0 20px;background:#151515;border:1px solid #333;border-left:5px solid #F14D07;border-radius:7px;padding:13px 15px;color:#aaa;font-size:12px;line-height:1.5}
      .class-rankings-update-note strong{color:#fff}
      .rank-row.has-class-movement{grid-template-columns:50px 64px minmax(0,1fr) auto}
      .class-movement{font-size:11px;font-weight:1000;text-align:center;white-space:nowrap}
      .class-movement.up{color:#62df8c}
      .class-movement.down{color:#ff7070}
      .class-movement.same{color:#777}
      .class-movement.new{color:#F14D07}
      .small-school-toggle{background:#1b1b1b;border:1px solid #3c3c3c;color:#ddd;padding:9px 13px;border-radius:5px;font-weight:900;font-size:12px;cursor:pointer;text-transform:none}
      .small-school-toggle:hover,.small-school-toggle.active{background:#F14D07;color:#000;border-color:#F14D07}
      .small-school-section{background:#000;border:1px solid #333;border-top:5px solid #F14D07;border-radius:9px;margin:0 0 28px;overflow:hidden;scroll-margin-top:18px}
      .small-school-section[hidden]{display:none!important}
      .small-school-head{padding:18px 20px;background:#151515;border-bottom:1px solid #333;display:flex;justify-content:space-between;gap:18px;align-items:flex-start}
      .small-school-head h2{font-size:28px;text-transform:uppercase}
      .small-school-head p{color:#999;line-height:1.5;margin-top:7px}
      .small-school-close{border:1px solid #444;background:#222;color:#fff;border-radius:50%;width:36px;height:36px;font-size:24px;line-height:1;cursor:pointer;flex:0 0 36px}
      .small-school-close:hover{background:#F14D07;color:#000;border-color:#F14D07}
      .small-school-list{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #242424}
      .small-school-column{list-style:none;min-width:0}
      .small-school-column:first-child{border-right:1px solid #333}
      .small-school-row{display:grid;grid-template-columns:46px 58px minmax(0,1fr) 42px 62px;gap:9px;align-items:center;padding:10px 12px;border-bottom:1px solid #252525;border-left:6px solid var(--small-accent,#333);min-height:62px}
      .small-school-row:last-child{border-bottom:0}
      .small-school-row .team-pill{width:100%;justify-content:center;text-align:center}
      .small-school-class{font-size:11px;font-weight:900;color:#F14D07;text-align:center}
      .small-school-elo{font-size:12px;font-weight:900;text-align:right;color:#eee}
      .small-school-labels{display:grid;grid-template-columns:46px 58px minmax(0,1fr) 42px 62px;gap:9px;padding:8px 12px;color:#666;font-size:9px;font-weight:900;text-transform:uppercase;background:#0d0d0d}
      .small-school-labels span:nth-child(1),.small-school-labels span:nth-child(2),.small-school-labels span:nth-child(4),.small-school-labels span:nth-child(5){text-align:center}
      @media(max-width:900px){.small-school-list{grid-template-columns:1fr}.small-school-column:first-child{border-right:0}.small-school-column:first-child .small-school-row:last-child{border-bottom:1px solid #252525}}
      @media(max-width:650px){
        .class-rankings-update-note{margin:-4px 0 18px;font-size:12px;padding:12px 13px}
        .rank-row.has-class-movement{grid-template-columns:40px 52px minmax(0,1fr)!important;gap:7px!important}
        .rank-row.has-class-movement>.team-class{display:none!important}
        .class-movement{font-size:10px}
        .small-school-toggle{flex:1 1 100%;padding:11px 13px}
        .small-school-head h2{font-size:22px}.small-school-head{padding:15px}
        .small-school-labels{display:none}
        .small-school-row{grid-template-columns:38px 52px minmax(0,1fr) 38px;grid-template-areas:"rank move team class" "rank move team elo";gap:5px 8px;padding:10px 9px}
        .small-school-row>.rank-num{grid-area:rank}
        .small-school-row>.movement{grid-area:move}
        .small-school-row>.team-link{grid-area:team}
        .small-school-row>.small-school-class{grid-area:class;text-align:right}
        .small-school-row>.small-school-elo{grid-area:elo;text-align:right;font-size:10px}
        .small-school-row .team-pill{font-size:12px;padding:8px 7px}
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
      if(typeof renderState25==='function'){
        const stateSnaps=state25Archive?.snapshots||[];
        const stateSelect=document.getElementById('state25Snapshot');
        const stateLatest=stateSnaps.at(-1);
        const stateKey=stateSelect?.value||stateLatest?.key;
        if(stateKey)renderState25(stateKey);
      }
      const snaps=rankingArchive?.snapshots||[];
      if(!snaps.length||typeof renderSnapshot!=='function')return;
      const select=document.getElementById('rankingSnapshot');
      if(select&&!select.options.length){
        select.innerHTML=[...snaps].reverse().map(x=>`<option value="${esc(x.key)}">${esc(x.label)}${x.date?' — '+esc(x.date):''}</option>`).join('');
      }
      const latest=snaps.at(-1);
      if(select&&latest&&!select.value)select.value=latest.key;
      renderSnapshot(select?.value||latest?.key);
      addClassRankingsNote();
      scheduleClassMovement();
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
          const smallSelect=document.getElementById('smallSchoolSnapshot');
          if(smallSelect?.value)renderSmallSchool(smallSelect.value);
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
  addClassRankingsNote();
  addSmallSchoolView();
  primeRankings();
  refresh();
  document.addEventListener('change',e=>{
    if(e.target?.id==='rankingSnapshot')scheduleClassMovement();
    if(e.target?.id==='rankingSnapshot'||e.target?.id==='state25Snapshot')scheduleDecorate();
  });
  window.addEventListener('load',()=>{addClassRankingsNote();addSmallSchoolView();scheduleClassMovement();scheduleDecorate()},{once:true});
})();
