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
  let records=new Map(),lastResults=new Map(),lastStamp='',smallSchoolArchive=null;
  const scheduleCache=new Map(),scheduleInflight=new Map();
  let scheduleDetailsIndex=null,scheduleDetailsPromise=null,schedulePopover=null,scheduleActiveLink=null,scheduleHideTimer=0;

  function recordText(r){
    if(!r)return'';
    const w=Number(r.wins)||0,l=Number(r.losses)||0,t=Number(r.ties)||0;
    return t?`${w}-${l}-${t}`:`${w}-${l}`;
  }

  function resultText(r){
    if(!r)return'';
    const outcome=r.score>r.opponentScore?'W':r.score<r.opponentScore?'L':'T';
    return `Last: ${outcome} ${r.score}-${r.opponentScore} ${r.isAway?'@':'vs'} ${r.opponent}`;
  }

  function resultClass(r){
    if(!r)return'';
    if(r.score>r.opponentScore)return'win';
    if(r.score<r.opponentScore)return'loss';
    return'tie';
  }

  function buildLastResults(games){
    const next=new Map();
    (games||[]).forEach((g,order)=>{
      if(!g?.awayTeam||!g?.homeTeam)return;
      const awayScore=Number(g.actualAway),homeScore=Number(g.actualHome);
      if(!Number.isFinite(awayScore)||!Number.isFinite(homeScore))return;
      const ts=Date.parse(String(g.date||''));
      if(!Number.isFinite(ts))return;
      const put=(team,opponent,score,opponentScore,isAway)=>{
        const key=canon(team),prior=next.get(key);
        if(prior&&(ts<prior.ts||(ts===prior.ts&&order<prior.order)))return;
        next.set(key,{opponent,score,opponentScore,isAway,ts,order});
      };
      put(g.awayTeam,g.homeTeam,awayScore,homeScore,true);
      put(g.homeTeam,g.awayTeam,homeScore,awayScore,false);
    });
    lastResults=next;
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

  function addLastResultToPill(pill,result){
    if(!pill)return;
    let badge=pill.querySelector('.rus-last-result');
    if(!result){
      badge?.remove();
      return;
    }
    if(!badge){
      badge=document.createElement('span');
      badge.className='rus-last-result';
      const recordBadge=pill.querySelector('.rus-live-record');
      if(recordBadge)pill.insertBefore(badge,recordBadge);else pill.appendChild(badge);
    }
    badge.className=`rus-last-result ${resultClass(result)}`;
    badge.textContent=resultText(result);
  }


  function scheduleEscape(v){
    const t=String(v??'');
    if(typeof esc==='function')return esc(t);
    const entities={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
    return t.replace(/[&<>"']/g,ch=>entities[ch]);
  }

  function scheduleSlug(v){
    return String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function scheduleHasValue(v){
    return v!==null&&v!==undefined&&String(v).trim()!=='';
  }

  function scheduleDateValue(v){
    const raw=String(v??'').trim();
    const normalized=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T12:00:00':raw;
    const time=new Date(normalized).getTime();
    return Number.isFinite(time)?time:0;
  }

  function scheduleDateLabel(v){
    const raw=String(v??'').trim();
    const time=scheduleDateValue(raw);
    if(!time)return raw;
    return new Date(time).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  }

  function scheduleRows(rows){
    const sourceRows=(rows||[]).filter((raw,index,all)=>{
      if(!raw?.rusSupplemental)return true;
      return !all.some((other,otherIndex)=>otherIndex!==index&&other?.gameUrl&&other.date===raw.date&&(canon(other.awayTeam)===canon(raw.awayTeam)||canon(other.homeTeam)===canon(raw.homeTeam)));
    });
    const bySignature=new Map(),byUrl=new Map();
    for(const raw of sourceRows){
      if(!raw||typeof raw!=='object')continue;
      const signature=[raw.date,canon(raw.awayTeam),canon(raw.homeTeam)].join('|');
      const prior=bySignature.get(signature)||(raw.gameUrl?byUrl.get(raw.gameUrl):null);
      const merged=prior?{...prior,...raw}:{...raw};
      ['gameUrl','gameId','teamScore','opponentScore','result','rusStatus','rusVerified'].forEach(key=>{
        if(!scheduleHasValue(merged[key])&&scheduleHasValue(prior?.[key]))merged[key]=prior[key];
      });
      bySignature.set(signature,merged);
      if(scheduleHasValue(merged.gameUrl))byUrl.set(merged.gameUrl,merged);
    }
    return [...bySignature.values()].sort((a,b)=>scheduleDateValue(a.date)-scheduleDateValue(b.date));
  }

  function scheduleDetailFor(details,g){
    return details?.get?.(g?.gameUrl)||null;
  }

  function loadScheduleDetails(){
    if(scheduleDetailsIndex)return Promise.resolve(scheduleDetailsIndex);
    if(!scheduleDetailsPromise){
      scheduleDetailsPromise=fetch('deseret-live-details-2026.json?v='+Date.now(),{cache:'no-store'})
        .then(res=>res.ok?res.json():null)
        .then(data=>{
          const index=new Map();
          for(const d of Object.values(data?.games||{})){
            if(d?.url)index.set(d.url,d);
          }
          scheduleDetailsIndex=index;
          return index;
        })
        .catch(()=>{
          scheduleDetailsIndex=new Map();
          return scheduleDetailsIndex;
        });
    }
    return scheduleDetailsPromise;
  }

  function scheduleScoreNumber(v){
    return scheduleHasValue(v)&&Number.isFinite(Number(v))?Number(v):null;
  }

  function scheduleIsFinal(g,d){
    return d?.final===true||/^final$/i.test(String(d?.status||''))||/^final$/i.test(String(g?.rusStatus||''))||!!g?.result;
  }

  function scheduleScore(team,g,d){
    const rows=d?.boxScore?.rows||[];
    const awayDetail=scheduleScoreNumber(rows[0]?.total),homeDetail=scheduleScoreNumber(rows[1]?.total);
    let us=null,them=null;
    if(awayDetail!==null&&homeDetail!==null){
      const isAway=canon(g?.awayTeam)===canon(team);
      us=isAway?awayDetail:homeDetail;
      them=isAway?homeDetail:awayDetail;
    }else{
      us=scheduleScoreNumber(g?.teamScore);
      them=scheduleScoreNumber(g?.opponentScore);
    }
    if(us===null||them===null)return{label:'—',className:'',completed:false,hasScore:false};
    const completed=scheduleIsFinal(g,d);
    return{
      label:String(us)+'-'+String(them),
      className:completed?(us>them?'win':us<them?'loss':'tie'):'',
      completed,
      hasScore:true
    };
  }

  function scheduleStatus(d,g){
    if(scheduleIsFinal(g,d))return'Final';
    const detail=String(d?.status||'').trim();
    if(detail)return detail;
    const rus=String(g?.rusStatus||'').trim();
    return rus||'Scheduled';
  }

  function scheduleStatusClass(status){
    return /final/i.test(status)?'final':/live|q[1-4]|half|ot|progress/i.test(status)?'live':'';
  }

  function scheduleRecordFor(team,rows,details){
    let wins=0,losses=0,ties=0;
    for(const g of rows||[]){
      const score=scheduleScore(team,g,scheduleDetailFor(details,g));
      if(!score.completed||!score.hasScore)continue;
      const parts=score.label.split('-').map(Number);
      if(parts.length!==2||!parts.every(Number.isFinite))continue;
      if(parts[0]>parts[1])wins++;
      else if(parts[0]<parts[1])losses++;
      else ties++;
    }
    return wins+losses+ties?{wins,losses,ties}:null;
  }

  function loadTeamSchedule(team){
    const key=canon(team);
    if(scheduleCache.has(key))return Promise.resolve(scheduleCache.get(key));
    if(!scheduleInflight.has(key)){
      scheduleInflight.set(key,(async()=>{
        const slug=scheduleSlug(team);
        if(!slug)throw new Error('Missing team slug');
        const [response,liveDetails]=await Promise.all([
          fetch('team-current-data/'+slug+'.json?v='+Date.now(),{cache:'no-store'}),
          loadScheduleDetails()
        ]);
        if(!response.ok)throw new Error('Schedule data unavailable');
        const payload=await response.json();
        const current=payload?.current||payload||{};
        const details=new Map();
        for(const d of Object.values(payload?.details?.games||{})){
          if(d?.url)details.set(d.url,d);
        }
        for(const [url,d] of liveDetails||[])details.set(url,d);
        const data={...current,team:current.team||team,schedule:scheduleRows(current.schedule),details};
        scheduleCache.set(key,data);
        return data;
      })().catch(error=>{
        scheduleInflight.delete(key);
        throw error;
      }));
    }
    return scheduleInflight.get(key);
  }

  function schedulePopoverMarkup(team,data){
    const rows=data?.schedule||[];
    const details=data?.details;
    const record=scheduleRecordFor(team,rows,details);
    const recordLabel=record?record.wins+'-'+record.losses+(record.ties?'-'+record.ties:''):'No finals yet';
    if(!rows.length){
      return '<div class="rus-ranking-schedule-head"><div><strong>'+scheduleEscape(team)+'</strong><span>2026 SCHEDULE</span></div></div><div class="rus-ranking-schedule-empty">No 2026 schedule is posted yet.</div>';
    }
    const games=rows.map(g=>{
      const detail=scheduleDetailFor(details,g);
      const score=scheduleScore(team,g,detail);
      const status=scheduleStatus(detail,g);
      const opponent=g.opponent||(canon(g.awayTeam)===canon(team)?g.homeTeam:g.awayTeam)||'Opponent';
      const venue=g.site==='home'?'vs':g.site==='away'?'at':canon(g.awayTeam)===canon(team)?'at':'vs';
      return '<div class="rus-ranking-schedule-item">'+
        '<div class="rus-ranking-schedule-date">'+scheduleEscape(scheduleDateLabel(g.date))+'</div>'+
        '<div class="rus-ranking-schedule-match"><span>'+scheduleEscape(venue)+'</span><strong>'+scheduleEscape(opponent)+'</strong></div>'+
        '<div class="rus-ranking-schedule-result '+score.className+'"><span class="'+scheduleStatusClass(status)+'">'+scheduleEscape(status)+'</span><strong>'+scheduleEscape(score.label)+'</strong></div>'+
      '</div>';
    }).join('');
    return '<div class="rus-ranking-schedule-head"><div><strong>'+scheduleEscape(team)+'</strong><span>2026 SCHEDULE</span></div><div class="rus-ranking-schedule-record">'+scheduleEscape(recordLabel)+' <small>RECORD</small></div></div>'+
      '<div class="rus-ranking-schedule-meta">'+rows.length+' GAMES</div>'+
      '<div class="rus-ranking-schedule-list">'+games+'</div>';
  }

  function positionSchedulePopover(){
    if(!schedulePopover||schedulePopover.hidden||!scheduleActiveLink)return;
    const rect=scheduleActiveLink.getBoundingClientRect();
    const width=Math.min(370,Math.max(0,window.innerWidth-24));
    schedulePopover.style.width=width+'px';
    const height=schedulePopover.offsetHeight;
    let left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
    let top=rect.bottom+9;
    if(top+height>window.innerHeight-12&&rect.top-height-9>12)top=rect.top-height-9;
    schedulePopover.style.left=Math.round(left)+'px';
    schedulePopover.style.top=Math.round(Math.max(12,top))+'px';
  }

  function closeSchedulePopover(){
    if(scheduleHideTimer){clearTimeout(scheduleHideTimer);scheduleHideTimer=0}
    if(scheduleActiveLink)scheduleActiveLink.removeAttribute('aria-describedby');
    scheduleActiveLink=null;
    if(schedulePopover){
      schedulePopover.hidden=true;
      schedulePopover.innerHTML='';
    }
  }

  function queueSchedulePopoverHide(){
    if(scheduleHideTimer)clearTimeout(scheduleHideTimer);
    scheduleHideTimer=setTimeout(()=>{
      scheduleHideTimer=0;
      if(schedulePopover?.matches(':hover'))return;
      closeSchedulePopover();
    },220);
  }

  function ensureSchedulePopover(){
    if(schedulePopover||!document.body)return schedulePopover;
    schedulePopover=document.createElement('div');
    schedulePopover.id='rus-ranking-schedule-popover';
    schedulePopover.setAttribute('role','tooltip');
    schedulePopover.setAttribute('aria-live','polite');
    schedulePopover.hidden=true;
    schedulePopover.addEventListener('pointerenter',()=>{
      if(scheduleHideTimer){clearTimeout(scheduleHideTimer);scheduleHideTimer=0}
    });
    schedulePopover.addEventListener('pointerleave',queueSchedulePopoverHide);
    document.body.appendChild(schedulePopover);
    window.addEventListener('scroll',positionSchedulePopover,true);
    window.addEventListener('resize',positionSchedulePopover);
    return schedulePopover;
  }

  async function showSchedulePopover(team,link){
    if(scheduleHideTimer){clearTimeout(scheduleHideTimer);scheduleHideTimer=0}
    const popover=ensureSchedulePopover();
    if(!popover)return;
    if(scheduleActiveLink&&scheduleActiveLink!==link)scheduleActiveLink.removeAttribute('aria-describedby');
    scheduleActiveLink=link;
    link.setAttribute('aria-describedby',popover.id);
    popover.hidden=false;
    popover.innerHTML='<div class="rus-ranking-schedule-loading">Loading 2026 schedule…</div>';
    positionSchedulePopover();
    try{
      const data=await loadTeamSchedule(team);
      if(scheduleActiveLink!==link)return;
      popover.innerHTML=schedulePopoverMarkup(team,data);
      positionSchedulePopover();
    }catch(error){
      if(scheduleActiveLink!==link)return;
      popover.innerHTML='<div class="rus-ranking-schedule-loading">Schedule is unavailable right now.</div>';
      positionSchedulePopover();
      console.warn('Ranking schedule popover:',error.message);
    }
  }

  function bindScheduleHover(){
    if(!ensureSchedulePopover())return;
    document.querySelectorAll('.rank-row,.state25-row,.small-school-row').forEach(row=>{
      const link=row.querySelector('a.team-link');
      if(!link||link.dataset.rusScheduleBound)return;
      const team=(teamNameFromRow(row)||link.textContent||'').trim();
      if(!team)return;
      link.dataset.rusScheduleBound='1';
      link.addEventListener('pointerenter',event=>{
        if(event.pointerType==='touch')return;
        showSchedulePopover(team,link);
      });
      link.addEventListener('pointerleave',queueSchedulePopoverHide);
      link.addEventListener('focusin',()=>{
        if(window.matchMedia?.('(hover: none)')?.matches&&window.matchMedia?.('(pointer: coarse)')?.matches)return;
        showSchedulePopover(team,link);
      });
      link.addEventListener('focusout',event=>{
        if(event.relatedTarget&&link.contains(event.relatedTarget))return;
        queueSchedulePopoverHide();
      });
    });
  }

  function decorate(){
    bindScheduleHover();
    if(!records.size&&!lastResults.size)return;
    document.querySelectorAll('.rank-row,.state25-row,.small-school-row').forEach(row=>{
      const team=canon(teamNameFromRow(row)),pill=row.querySelector('.team-pill');
      addLastResultToPill(pill,lastResults.get(team));
      const rec=records.get(team);
      if(rec)addRecordToPill(pill,rec);
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

      #rus-ranking-schedule-popover{position:fixed;z-index:10050;display:block;box-sizing:border-box;width:min(370px,calc(100vw - 24px));max-height:min(420px,calc(100vh - 24px));overflow:auto;background:#090909;border:1px solid #555;border-top:4px solid #F14D07;border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,.72);color:#fff;font-size:12px}
      #rus-ranking-schedule-popover[hidden]{display:none!important}
      .rus-ranking-schedule-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:12px 13px 10px;background:#151515;border-bottom:1px solid #333}
      .rus-ranking-schedule-head>div:first-child{min-width:0}
      .rus-ranking-schedule-head strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;text-transform:uppercase}
      .rus-ranking-schedule-head span{display:block;margin-top:3px;color:#F14D07;font-size:9px;font-weight:900;letter-spacing:.6px}
      .rus-ranking-schedule-record{flex:0 0 auto;color:#fff;font-size:14px;font-weight:1000;text-align:right;white-space:nowrap}
      .rus-ranking-schedule-record small{display:block;color:#888;font-size:8px;letter-spacing:.5px}
      .rus-ranking-schedule-meta{padding:7px 13px;color:#777;font-size:9px;font-weight:900;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid #222}
      .rus-ranking-schedule-list{background:#000}
      .rus-ranking-schedule-item{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 12px;border-bottom:1px solid #252525}
      .rus-ranking-schedule-item:last-child{border-bottom:0}
      .rus-ranking-schedule-date{color:#aaa;font-size:10px;font-weight:900;white-space:nowrap}
      .rus-ranking-schedule-match{display:flex;align-items:baseline;gap:7px;min-width:0}
      .rus-ranking-schedule-match span{color:#777;font-size:9px;font-weight:900;text-transform:uppercase}
      .rus-ranking-schedule-match strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
      .rus-ranking-schedule-result{text-align:right;white-space:nowrap}
      .rus-ranking-schedule-result>span{display:block;color:#888;font-size:8px;font-weight:900;text-transform:uppercase}
      .rus-ranking-schedule-result>span.final{color:#F14D07}
      .rus-ranking-schedule-result>span.live{color:#ffd54a}
      .rus-ranking-schedule-result>strong{display:block;margin-top:2px;font-size:12px}
      .rus-ranking-schedule-result.win>strong{color:#62df8c}
      .rus-ranking-schedule-result.loss>strong{color:#ff7777}
      .rus-ranking-schedule-result.tie>strong{color:#ddd}
      .rus-ranking-schedule-loading,.rus-ranking-schedule-empty{padding:20px 14px;color:#aaa;line-height:1.5}
      @media (hover:none) and (pointer:coarse){#rus-ranking-schedule-popover{display:none!important}}

      .team-pill{gap:8px;flex-wrap:wrap}
      .rus-live-record{display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.28);font-size:10px;line-height:1;font-weight:900;letter-spacing:.2px;white-space:nowrap;color:inherit}
      .rus-last-result{display:inline-flex;align-items:center;justify-content:center;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.2);font-size:10px;line-height:1;font-weight:900;letter-spacing:.1px;white-space:nowrap}
      .rus-last-result.win{color:#b8ffd0}
      .rus-last-result.loss{color:#ffb0b0}
      .rus-last-result.tie{color:#e6e6e6}
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
      buildLastResults(data.games);
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
