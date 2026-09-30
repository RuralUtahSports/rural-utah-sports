(() => {
  'use strict';
  const CLASSES=['6A','5A','4A','3A','2A','1A','8P'];
  const STORE='rus-custom-classifications-v1';
  const DYNASTY_STORE='rus-custom-classification-dynasty-v1';
  let baseData=null,state=null,allTeams=[],dragTeam='',selectedTeam='',dynasty=null,lastResult=null,baselineProfiles={};
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const clone=v=>JSON.parse(JSON.stringify(v));
  function seasonWeekDates(year){
    const first=new Date(Number(year),7,1),offset=(5-first.getDay()+7)%7,day=1+offset+7;
    return Array.from({length:10},(_,i)=>{const d=new Date(Number(year),7,day+i*7),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${dd}`});
  }
  const eloMapToObject=map=>Object.fromEntries([...(map||new Map()).entries()].map(([k,v])=>[norm(k),Number(v)||1500]));
  const objectToEloMap=obj=>new Map(Object.entries(obj||{}).map(([k,v])=>[norm(k),Number(v)||1500]));
  function pairMeetings(a,b){
    const key=[a,b].sort((x,y)=>x.localeCompare(y)).join('|||'),p=window.simulator?.pairs?.[key];
    return Number(p?.h2h?.meetings||0);
  }
  const status=(text,kind='')=>{const el=$('builderStatus');if(!el)return;el.textContent=text;el.className='status'+(kind?' '+kind:'')};
  const simStatus=(text,kind='')=>{const el=$('customSimStatus');if(!el)return;el.textContent=text;el.className='status'+(kind?' '+kind:'')};
  function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(src));document.body.appendChild(s)})}
  async function loadEngine(){
    for(const src of ['season-simulator-core.js?v=20260813a','season-simulator-score.js?v=20260813e','full-season-core.js?v=20260824b','full-season-run.js?v=20260813b','full-season-view.js?v=20260813a','full-season-playoffs.js?v=20260929-record1','full-season-playoff-view.js?v=20260824-boxscroll1','full-season-colors.js?v=20260929-builder1']) await script(src);
  }
  function emptyState(){return{regions:Object.fromEntries(CLASSES.map(c=>[c,[]])),unassigned:[]}}
  function currentState(){
    const next=emptyState(),seen=new Set();
    for(const r of baseData.alignment?.regions||[]){
      const c=String(r.classification||'').toUpperCase().includes('8')?'8P':String(r.classification||'').toUpperCase();
      if(!next.regions[c])continue;
      const teams=(r.teams||[]).map(resolveTeam).filter(Boolean);
      teams.forEach(t=>seen.add(norm(t)));
      next.regions[c].push({name:String(r.region||'Region'),teams});
    }
    for(const t of allTeams){
      if(seen.has(norm(t)))continue;
      const meta=baseData.meta.get(norm(t)),c=CLASSES.includes(meta?.classification)?meta.classification:'6A';
      let row=next.regions[c].find(r=>r.name==='Independent');
      if(!row){row={name:'Independent',teams:[]};next.regions[c].push(row)}
      row.teams.push(t);seen.add(norm(t));
    }
    return next;
  }
  function resolveTeam(raw){
    const k=norm(raw),m=baseData?.meta?.get(k);if(m?.team)return m.team;
    return allTeams.find(t=>norm(t)===k)||'';
  }
  function teamLocation(team){
    const k=norm(team);
    for(const c of CLASSES)for(const r of state.regions[c]||[])if((r.teams||[]).some(t=>norm(t)===k))return{classification:c,region:r.name};
    return null;
  }
  function removeTeam(team){
    const k=norm(team);
    for(const c of CLASSES)for(const r of state.regions[c]||[])r.teams=(r.teams||[]).filter(t=>norm(t)!==k);
    state.unassigned=(state.unassigned||[]).filter(t=>norm(t)!==k);
  }
  function ensureRegion(c,name){
    const rows=state.regions[c]||(state.regions[c]=[]),n=String(name||'').trim();
    let r=rows.find(x=>x.name===n);if(!r){r={name:n||`Region ${rows.length+1}`,teams:[]};rows.push(r)}return r;
  }
  function move(team,c,region){
    const real=resolveTeam(team);if(!real||!CLASSES.includes(c))return;
    removeTeam(real);ensureRegion(c,region).teams.push(real);selectedTeam=real;render();syncMover();
  }
  function unassign(team){const real=resolveTeam(team);if(!real)return;removeTeam(real);state.unassigned.push(real);selectedTeam=real;render();syncMover()}
  function addRegion(c){const name=prompt(`New ${c==='8P'?'8-Player':c} region name:`);if(!name?.trim())return;ensureRegion(c,name.trim());render();syncMover()}
  function renameRegion(c,old){const row=state.regions[c].find(r=>r.name===old);if(!row)return;const name=prompt('Rename region:',old);if(!name?.trim())return;row.name=name.trim();render();syncMover()}
  function deleteRegion(c,name){const i=state.regions[c].findIndex(r=>r.name===name);if(i<0)return;const [r]=state.regions[c].splice(i,1);for(const t of r.teams||[])state.unassigned.push(t);render();syncMover()}
  function chip(team){const selected=norm(team)===norm(selectedTeam)?' selected':'';return `<button type="button" class="team-chip${selected}" draggable="true" data-team="${esc(team)}" title="Tap to select ${esc(team)}">${esc(team)}</button>`}
  function render(){
    const q=String($('teamSearch')?.value||'').trim().toUpperCase(),grid=$('classGrid');grid.innerHTML='';
    let assigned=0;
    for(const c of CLASSES){
      const rows=state.regions[c]||[],count=rows.reduce((n,r)=>n+(r.teams||[]).length,0);assigned+=count;
      const section=document.createElement('section');section.className='class-section';section.innerHTML=`<div class="class-head"><div><span class="class-kicker">${c==='6A'?'Open-capable division':c==='8P'?'Eight-player':'Football classification'}</span><h2>${c==='8P'?'8-Player':c}</h2></div><div class="class-tools"><span class="count-pill">${count}</span><button type="button" class="tiny-btn" data-add-region="${c}">+ Region</button></div></div><div class="regions"></div>`;
      const host=section.querySelector('.regions');
      for(const r of rows){
        const card=document.createElement('article');card.className='region-card';card.dataset.classification=c;card.dataset.region=r.name;
        const visible=(r.teams||[]).filter(t=>!q||String(t).toUpperCase().includes(q));
        card.innerHTML=`<div class="region-head"><div><span class="class-kicker">${c==='8P'?'8-Player':c}</span><h3>${esc(r.name)}</h3></div><div class="region-actions"><span class="count-pill">${r.teams.length}</span><button type="button" class="tiny-btn" data-rename-region="${esc(c)}|||${esc(r.name)}">Rename</button><button type="button" class="tiny-btn" data-delete-region="${esc(c)}|||${esc(r.name)}">Delete</button></div></div><div class="team-drop" data-drop-class="${esc(c)}" data-drop-region="${esc(r.name)}">${visible.length?visible.sort().map(chip).join(''):`<span class="empty-region">${q?'No matching teams':'Drop teams here'}</span>`}</div>`;
        host.append(card);
      }
      if(!rows.length){const e=document.createElement('div');e.className='empty-region';e.textContent='No regions yet. Add a region to begin.';host.append(e)}
      grid.append(section);
    }
    const un=(state.unassigned||[]).filter(t=>!q||String(t).toUpperCase().includes(q));
    $('unassignedTeams').innerHTML=un.length?un.sort().map(chip).join(''):`<span class="empty-region">${q?'No matching teams':'Every team is assigned.'}</span>`;
    $('unassignedCount').textContent=String(state.unassigned.length);$('teamCount').textContent=`${assigned} assigned • ${state.unassigned.length} unassigned`;
    bindRendered();updateRunState();
  }
  function bindRendered(){
    document.querySelectorAll('[data-add-region]').forEach(b=>b.onclick=()=>addRegion(b.dataset.addRegion));
    document.querySelectorAll('[data-rename-region]').forEach(b=>b.onclick=()=>{const [c,r]=b.dataset.renameRegion.split('|||');renameRegion(c,r)});
    document.querySelectorAll('[data-delete-region]').forEach(b=>b.onclick=()=>{const [c,r]=b.dataset.deleteRegion.split('|||');deleteRegion(c,r)});
    document.querySelectorAll('.team-chip').forEach(b=>{
      b.onclick=()=>{selectedTeam=b.dataset.team;$('teamSelect').value=selectedTeam;syncMover();render()};
      b.ondragstart=e=>{dragTeam=b.dataset.team;e.dataTransfer.setData('text/plain',dragTeam);e.dataTransfer.effectAllowed='move'};
    });
    document.querySelectorAll('.team-drop').forEach(d=>{d.ondragover=e=>{e.preventDefault();d.classList.add('drag-over')};d.ondragleave=()=>d.classList.remove('drag-over');d.ondrop=e=>{e.preventDefault();d.classList.remove('drag-over');const team=e.dataTransfer.getData('text/plain')||dragTeam;if(!team)return;if(d.id==='unassignedTeams'||d.classList.contains('unassigned-drop'))unassign(team);else move(team,d.dataset.dropClass,d.dataset.dropRegion);dragTeam=''}});
  }
  function fillMover(){
    $('teamSelect').innerHTML=allTeams.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('classSelect').innerHTML=CLASSES.map(c=>`<option value="${c}">${c==='8P'?'8-Player':c}</option>`).join('');
    selectedTeam=selectedTeam||allTeams[0]||'';$('teamSelect').value=selectedTeam;syncMover();
  }
  function fillRegions(){
    const c=$('classSelect').value,rows=state.regions[c]||[];$('regionSelect').innerHTML=rows.map(r=>`<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('');
    if(!rows.length){const o=document.createElement('option');o.value='';o.textContent='Add a region first';$('regionSelect').append(o)}
  }
  function syncMover(){
    if(!$('teamSelect').options.length)return;selectedTeam=$('teamSelect').value||selectedTeam||allTeams[0];const loc=teamLocation(selectedTeam);
    if(loc){$('classSelect').value=loc.classification;fillRegions();if([...(state.regions[loc.classification]||[])].some(r=>r.name===loc.region))$('regionSelect').value=loc.region}else fillRegions();
  }
  function updateRunState(){const n=state?.unassigned?.length||0;$('runCustomSeason').disabled=!baseData||n>0;status(n?`Assign ${n} team${n===1?'':'s'} before simulating.`:`${allTeams.length} teams assigned. Ready to simulate.` ,n?'warn':'good')}
  function saved(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return[]}}
  function refreshSaved(){const list=saved();$('scenarioSelect').innerHTML=list.length?list.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join(''):'<option value="">No saved setups</option>'}
  function saveScenario(){const name=$('scenarioName').value.trim()||`Custom Alignment ${new Date().toLocaleDateString()}`,list=saved(),payload={name,savedAt:new Date().toISOString(),state:clone(state),scheduleMode:$('scheduleMode').value};const i=list.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());if(i>=0)list[i]=payload;else list.push(payload);localStorage.setItem(STORE,JSON.stringify(list.slice(-20)));refreshSaved();$('scenarioSelect').value=String(i>=0?i:list.length-1);status(`Saved “${name}” on this device.`,'good')}
  function loadScenario(){const i=Number($('scenarioSelect').value),row=saved()[i];if(!row)return;state=clone(row.state);$('scenarioName').value=row.name;$('scheduleMode').value=row.scheduleMode||'real';render();fillMover();status(`Loaded “${row.name}”.`,'good')}
  function deleteScenario(){const i=Number($('scenarioSelect').value),list=saved();if(!Number.isInteger(i)||!list[i])return;const name=list[i].name;list.splice(i,1);localStorage.setItem(STORE,JSON.stringify(list));refreshSaved();status(`Deleted saved setup “${name}”.`)}
  function clearAllRegions(){for(const c of CLASSES)for(const r of state.regions[c]||[])for(const t of r.teams||[])state.unassigned.push(t);for(const c of CLASSES)state.regions[c]=[];state.unassigned=[...new Map(state.unassigned.map(t=>[norm(t),t])).values()].sort();render();fillMover()}
  function metaFromState(){const map=new Map();for(const c of CLASSES)for(const r of state.regions[c]||[])for(const t of r.teams||[])map.set(norm(t),{team:t,classification:c,region:r.name});return map}
  function alignmentChanged(){
    const custom=metaFromState(),base=baseData?.meta||new Map();
    if(custom.size!==base.size)return true;
    for(const [k,m] of custom){
      const b=base.get(k);
      if(!b||String(b.classification||'')!==String(m.classification||'')||String(b.region||'')!==String(m.region||''))return true;
    }
    return false;
  }
  function roundRobin(teams){
    let a=[...teams];if(a.length<2)return[];if(a.length%2)a.push(null);const n=a.length,rounds=[];
    for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const x=a[i],y=a[n-1-i];if(x&&y)pairs.push([x,y])}rounds.push(pairs);a=[a[0],a[n-1],...a.slice(1,n-1)]}
    return rounds;
  }
  function originalOrientation(a,b){
    const ka=norm(a),kb=norm(b),g=(baseData.season.games||[]).find(x=>{const x1=norm(resolveTeam(x.teamA)||x.teamA),x2=norm(resolveTeam(x.teamB)||x.teamB);return(x1===ka&&x2===kb)||(x1===kb&&x2===ka)});if(!g)return null;return{a:resolveTeam(g.teamA)||g.teamA,b:resolveTeam(g.teamB)||g.teamB};
  }
  function rebuildSchedule(meta,year=2026,startElos=null){
    const dates=seasonWeekDates(year),games=[],busy=new Map(allTeams.map(t=>[norm(t),new Set()])),usedPairs=new Set(),pairCounts=new Map(),warnings=[],protectedRival=new Set();
    const pair=(a,b)=>[norm(a),norm(b)].sort().join('|'),mark=(team,w)=>busy.get(norm(team))?.add(w),free=(team,w)=>!busy.get(norm(team))?.has(w),rating=t=>Number(startElos?.get(norm(t))??baseData.startElos?.get(norm(t))??1500);
    const sameFormat=(a,b)=>{const ma=meta.get(norm(a)),mb=meta.get(norm(b));return !!(ma&&mb&&((ma.classification==='8P')===(mb.classification==='8P')))};
    const sameClass=(a,b)=>meta.get(norm(a))?.classification===meta.get(norm(b))?.classification;
    const sameRegion=(a,b)=>{const ma=meta.get(norm(a)),mb=meta.get(norm(b));return !!(ma&&mb&&ma.classification===mb.classification&&ma.region===mb.region)};
    const schedulePair=(a,b,w,kind,allowRepeat=false)=>{
      const k=pair(a,b),meetings=pairCounts.get(k)||0;
      if(!a||!b||!free(a,w)||!free(b,w)||(!allowRepeat&&usedPairs.has(k))||(allowRepeat&&meetings>=2)||!sameFormat(a,b))return false;
      const known=year===2026?originalOrientation(a,b):null,prior=allowRepeat?games.find(g=>pair(g.teamA,g.teamB)===k):null,flip=(year+w+games.length)%2===1;
      const x=prior?prior.teamB:(known?.a||(flip?b:a)),y=prior?prior.teamA:(known?.b||(flip?a:b));
      usedPairs.add(k);pairCounts.set(k,meetings+1);mark(x,w);mark(y,w);games.push({date:dates[w],teamA:x,teamB:y,[kind]:true,rematch:allowRepeat&&meetings>0});return true;
    };
    // 1) Region round robin always comes first.
    for(const c of CLASSES)for(const r of state.regions[c]||[]){
      const rounds=roundRobin(r.teams||[]),take=Math.min(10,rounds.length),startWeek=10-take;
      if(rounds.length>10)warnings.push(`${c} ${r.name} has ${r.teams.length} teams, so a full round robin does not fit in a 10-game season.`);
      for(let ri=0;ri<take;ri++)for(let pi=0;pi<rounds[ri].length;pi++){
        const [x,y]=rounds[ri][pi],w=startWeek+ri;
        if(schedulePair(x,y,w,'customRegion')===false)continue;
      }
    }
    // 2) Protect one historically meaningful rivalry per team when it is not
    // already a region game. A minimum of 10 recorded meetings avoids treating
    // ordinary matchups as rivalries.
    const rivalryCandidates=[];
    for(let i=0;i<allTeams.length;i++)for(let k=i+1;k<allTeams.length;k++){
      const x=allTeams[i],y=allTeams[k],meetings=pairMeetings(x,y);
      if(meetings<10||sameRegion(x,y)||!sameFormat(x,y))continue;
      rivalryCandidates.push({a:x,b:y,meetings,gap:Math.abs(rating(x)-rating(y))});
    }
    rivalryCandidates.sort((x,y)=>y.meetings-x.meetings||x.gap-y.gap);
    for(const x of rivalryCandidates){
      if(protectedRival.has(norm(x.a))||protectedRival.has(norm(x.b)))continue;
      const slots=[0,1,2,3,4,5,6,7,8,9].filter(w=>free(x.a,w)&&free(x.b,w));
      if(!slots.length)continue;
      if(schedulePair(x.a,x.b,slots[0],'protectedRivalry')){protectedRival.add(norm(x.a));protectedRival.add(norm(x.b))}
    }
    // 3) Fill open weeks with same-class non-region opponents. More historical
    // meetings are preferred, then closer ELO. 4) If a team still needs a game,
    // fill it with the closest available ELO opponent in the same football format.
    for(let w=0;w<10;w++){
      const takeBest=(team,pool,requireClass)=>{
        const cand=pool.filter(o=>o!==team&&free(o,w)&&!usedPairs.has(pair(team,o))&&sameFormat(team,o)&&(!requireClass||sameClass(team,o)));
        cand.sort((x,y)=>{
          if(requireClass){const history=pairMeetings(team,y)-pairMeetings(team,x);if(history)return history}
          return Math.abs(rating(team)-rating(x))-Math.abs(rating(team)-rating(y))||x.localeCompare(y);
        });
        return cand[0]||null;
      };
      for(const requireClass of [true,false]){
        let freeTeams=allTeams.filter(t=>meta.has(norm(t))&&free(t,w));
        while(freeTeams.length>1){
          const x=freeTeams.shift(),y=takeBest(x,freeTeams,requireClass);
          if(!y)continue;
          schedulePair(x,y,w,requireClass?'sameClassGame':'eloMatchedGame');
          freeTeams=freeTeams.filter(t=>norm(t)!==norm(y));
        }
      }
    }
    const counts=new Map(allTeams.map(t=>[norm(t),0]));for(const g of games){if(counts.has(norm(g.teamA)))counts.set(norm(g.teamA),counts.get(norm(g.teamA))+1);if(counts.has(norm(g.teamB)))counts.set(norm(g.teamB),counts.get(norm(g.teamB))+1)}
    // 5) If unique opponents leave open dates, allow one rematch as a last
    // resort. Prefer same-class, non-region opponents with matching open weeks
    // and alternate home/away from the first meeting.
    for(let w=0;w<10;w++){
      let pool=allTeams.filter(t=>meta.has(norm(t))&&free(t,w)&&(counts.get(norm(t))||0)<10);
      pool.sort((a,b)=>(counts.get(norm(a))||0)-(counts.get(norm(b))||0)||a.localeCompare(b));
      while(pool.length>1){
        const x=pool.shift(),xk=norm(x);
        const cand=pool.filter(y=>{
          const yk=norm(y),n=pairCounts.get(pair(x,y))||0;
          return free(y,w)&&(counts.get(yk)||0)<10&&sameFormat(x,y)&&!sameRegion(x,y)&&n===1;
        }).sort((a,b)=>{
          const classGap=(sameClass(x,b)?1:0)-(sameClass(x,a)?1:0);if(classGap)return classGap;
          const countGap=(counts.get(norm(a))||0)-(counts.get(norm(b))||0);if(countGap)return countGap;
          return Math.abs(rating(x)-rating(a))-Math.abs(rating(x)-rating(b))||a.localeCompare(b);
        });
        const y=cand[0];if(!y)continue;
        if(schedulePair(x,y,w,'rematchGame',true)){
          counts.set(xk,(counts.get(xk)||0)+1);counts.set(norm(y),(counts.get(norm(y))||0)+1);
          pool=pool.filter(t=>norm(t)!==norm(y));
        }
      }
    }
    const short=allTeams.filter(t=>(counts.get(norm(t))||0)<10);
    if(short.length)warnings.push(`${short.length} team${short.length===1?'':'s'} finished with fewer than 10 games in the generated ${year} schedule after unique-opponent and rematch fills.`);
    return{season:{season:year,games:games.sort((x,y)=>Date.parse(x.date)-Date.parse(y.date))},warnings,counts};
  }
  function readDynasty(){try{return JSON.parse(localStorage.getItem(DYNASTY_STORE)||'null')}catch{return null}}
  function endingElos(R){
    const out=new Map([...R.stats.values()].map(s=>[norm(s.team),Number(s.elo)||1500]));
    for(const c of CLASSES){
      const p=R.playoffs?.get(c);if(!p)continue;
      for(const round of p.rounds||[])for(const g of round.games||[]){
        if(g?.a?.team&&Number.isFinite(Number(g.eloAfterA)))out.set(norm(g.a.team),Number(g.eloAfterA));
        if(g?.b?.team&&Number.isFinite(Number(g.eloAfterB)))out.set(norm(g.b.team),Number(g.eloAfterB));
      }
    }
    return out;
  }
  function nextProfiles(R,endElos){
    const out={};
    for(const s of R.stats.values()){
      const rows=R.results?.get(s.team)||[],gp=s.w+s.l,last=rows.slice(-5),recent10=rows.slice(-10);
      const diff=recent10.length?recent10.reduce((n,g)=>{const [pf,pa]=String(g.score||'0-0').split('-').map(Number);return n+(pf-pa)},0)/recent10.length:0;
      out[norm(s.team)]={elo:Number(endElos.get(norm(s.team)))||Number(s.elo)||1500,winPct:gp?s.w/gp:.5,avgPF:Math.max(5,Math.min(70,gp?s.pf/gp:24)),avgPA:Math.max(5,Math.min(70,gp?s.pa/gp:21)),avgDiff:Math.max(-50,Math.min(50,gp?(s.pf-s.pa)/gp:0)),recent10Diff:Math.max(-50,Math.min(50,diff)),recentForm:last.map(g=>g.won?'W':'L').join('-')};
    }
    return out;
  }
  function applyProfiles(profiles){
    const bounded=(v,lo,hi,fallback)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(v))?Number(v):fallback));
    for(const [team,row] of Object.entries(profiles||{})){
      const name=allTeams.find(t=>norm(t)===team),entry=name?window.simulator?.teams?.[name]:null;if(!entry)continue;
      const base=baselineProfiles[team]||{},blend=(v,b,w=.65)=>bounded(v,-999,999,Number(b)||0)*w+(Number(b)||0)*(1-w);
      if(row.elo!=null)entry.elo=Number(row.elo)||Number(base.elo)||1500;
      if(row.winPct!=null)entry.winPct=bounded(blend(row.winPct,base.winPct,.72),.05,.95,.5);
      if(row.avgPF!=null)entry.avgPF=bounded(blend(row.avgPF,base.avgPF,.62),5,55,24);
      if(row.avgPA!=null)entry.avgPA=bounded(blend(row.avgPA,base.avgPA,.62),5,55,21);
      if(row.avgDiff!=null)entry.avgDiff=bounded(blend(row.avgDiff,base.avgDiff,.60),-40,40,0);
      if(row.recent10Diff!=null)entry.recent10Diff=bounded(blend(row.recent10Diff,base.recent10Diff,.70),-45,45,0);
      if(row.recentForm!=null)entry.recentForm=row.recentForm;
    }
  }
  function restoreBaselineProfiles(){for(const [team,row] of Object.entries(baselineProfiles)){const name=allTeams.find(t=>norm(t)===team),entry=name?window.simulator?.teams?.[name]:null;if(entry)Object.assign(entry,row)}}
  function summarizeSeason(R){
    const champions={};for(const [c,p] of R.playoffs||[])if(CLASSES.includes(c))champions[c]=p.champion?.team||'—';
    const top=[...R.stats.values()].sort((a,b)=>b.w-a.w||a.l-b.l||b.elo-a.elo||a.team.localeCompare(b.team))[0];
    return{year:Number(R.season),champions,topRecord:top?`${top.team} ${top.w}-${top.l}`:'—'};
  }
  function renderDynastyHistory(){
    const host=$('dynastyHistory');if(!host)return;
    const rows=dynasty?.history||[];
    if(!rows.length){host.innerHTML='<span class="empty-region">No completed seasons yet.</span>';return}
    host.innerHTML=`<table><thead><tr><th>Year</th><th>6A</th><th>5A</th><th>4A</th><th>3A</th><th>2A</th><th>1A</th><th>8P</th><th>Best Record</th></tr></thead><tbody>${rows.slice().reverse().map(r=>`<tr><td>${r.year}</td>${CLASSES.map(c=>`<td>${esc(r.champions?.[c]||'—')}</td>`).join('')}<td>${esc(r.topRecord||'—')}</td></tr>`).join('')}</tbody></table>`;
  }
  function updateDynastyControls(){
    const savedDynasty=readDynasty(),active=!!dynasty,current=Number(dynasty?.currentYear||2025),next=current+1;
    if($('dynastyYear'))$('dynastyYear').textContent=active?String(current):'2026';
    if($('advanceSeason')){$('advanceSeason').hidden=!active||!(dynasty?.history?.length);$('advanceSeason').disabled=false;$('advanceSeason').textContent=`Advance to ${next}`}
    if($('resetDynasty'))$('resetDynasty').hidden=!active;
    if($('resumeDynasty')){$('resumeDynasty').hidden=active||!savedDynasty;$('resumeDynasty').textContent=savedDynasty?`Resume ${Number(savedDynasty.currentYear||2025)+1}`:'Resume Dynasty'}
    if($('runCustomSeason'))$('runCustomSeason').textContent=active?'Restart From 2026':'Start 2026 Dynasty';
    renderDynastyHistory();
  }
  function persistDynasty(){
    if(!dynasty)return;
    dynasty.state=clone(state);dynasty.scheduleMode=$('scheduleMode').value;
    localStorage.setItem(DYNASTY_STORE,JSON.stringify(dynasty));updateDynastyControls();
  }
  function resumeDynasty(){
    const row=readDynasty();if(!row)return;
    dynasty=row;state=clone(row.state||state);$('scheduleMode').value=row.scheduleMode||'rebuild';applyProfiles(row.nextProfiles||{});render();fillMover();$('simulationSection').hidden=false;updateDynastyControls();simStatus(`Dynasty restored through ${row.currentYear}. Advance to ${Number(row.currentYear)+1} when ready.`,'good');$('simulationSection').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function resetDynasty(){
    localStorage.removeItem(DYNASTY_STORE);dynasty=null;lastResult=null;restoreBaselineProfiles();window.RUSFullSeason.data=baseData;updateDynastyControls();simStatus('Dynasty reset. Your classification layout is still here.','good');$('customSimOutput').innerHTML='';
  }
  async function simulateYear(year,restart=false){
    if(state.unassigned.length)return updateRunState();
    const btn=year===2026?$('runCustomSeason'):$('advanceSeason'),section=$('simulationSection');btn.disabled=true;btn.textContent='Simulating…';section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'start'});simStatus(`Preparing ${year} alignment and schedule…`);$('customSimOutput').innerHTML='';
    try{
      if(restart||year===2026){dynasty={currentYear:2025,history:[],nextStartElos:null,nextProfiles:null,state:clone(state),scheduleMode:$('scheduleMode').value};restoreBaselineProfiles()}
      else applyProfiles(dynasty?.nextProfiles||{});
      const meta=metaFromState(),startElos=year===2026?new Map(baseData.startElos):objectToEloMap(dynasty?.nextStartElos||{});
      const customAlignment=alignmentChanged(),requestedMode=year===2026?$('scheduleMode').value:'rebuild',mode=(year===2026&&!customAlignment)?requestedMode:'rebuild',rebuilt=mode==='rebuild'?rebuildSchedule(meta,year,startElos):null,season=rebuilt?.season||clone(baseData.season);
      season.season=year;
      const F=window.RUSFullSeason;F.data={...baseData,meta,season,startElos,seasonYear:year};
      simStatus(year===2026&&mode==='real'?'Using the real 2026 schedule because the alignment matches the current UHSAA setup.':customAlignment&&year===2026?`Custom alignment detected. Rebuilt ${year} so every region uses the new round-robin first, then rivalries, same-class games and ELO-matched games. Running the RUS model…`:`Generated ${season.games.length} games for ${year}: region games first, protected rivalries, same-class matchups, then ELO-matched games. Running the RUS model…`);
      const R=await F.simulate((Date.now()+year*997)%100000);R.playoffs?.delete?.('OPEN');R.playoffs?.delete?.('ALLTEAM');lastResult=R;await F.render(R,$('customSimOutput'));const playoffTitle=$('customSimOutput')?.querySelector('.fsp-title'),playoffSub=$('customSimOutput')?.querySelector('.fsp-sub');if(playoffTitle)playoffTitle.textContent=`${year} Playoff Brackets`;if(playoffSub)playoffSub.textContent='Seven classification playoffs based on your custom alignment.';
      const end=endingElos(R),profiles=nextProfiles(R,end),summary=summarizeSeason(R);
      dynasty.currentYear=year;dynasty.history=(dynasty.history||[]).filter(x=>Number(x.year)!==year);dynasty.history.push(summary);dynasty.nextStartElos=eloMapToObject(end);dynasty.nextProfiles=profiles;dynasty.state=clone(state);dynasty.scheduleMode=$('scheduleMode').value;persistDynasty();
      const warning=rebuilt?.warnings?.length?` ${rebuilt.warnings.join(' ')}`:'';
      simStatus(`${year} complete • ${R.games} regular-season games • ending ELOs and team form are saved for ${year+1}.${warning}`,warning?'warn':'good');
    }catch(e){console.error(e);simStatus(`The ${year} dynasty season could not be completed.`,'bad')}
    finally{updateRunState();updateDynastyControls()}
  }
  async function runSeason(){await simulateYear(2026,true)}
  async function advanceSeason(){if(!dynasty?.history?.length)return;await simulateYear(Number(dynasty.currentYear)+1,false)}
  function bind(){
    $('teamSelect').onchange=()=>{selectedTeam=$('teamSelect').value;syncMover();render()};$('classSelect').onchange=fillRegions;$('moveTeam').onclick=()=>{const t=$('teamSelect').value,c=$('classSelect').value,r=$('regionSelect').value;if(!r){addRegion(c);return}move(t,c,r)};
    $('teamSearch').oninput=render;$('resetCurrent').onclick=()=>{state=currentState();render();fillMover();status('Reset to the current UHSAA football alignment.','good')};$('clearRegions').onclick=clearAllRegions;$('saveScenario').onclick=saveScenario;$('loadScenario').onclick=loadScenario;$('deleteScenario').onclick=deleteScenario;$('runCustomSeason').onclick=runSeason;$('advanceSeason').onclick=advanceSeason;$('resetDynasty').onclick=resetDynasty;$('resumeDynasty').onclick=resumeDynasty;$('scrollToBuilder').onclick=()=>document.querySelector('.builder-hero')?.scrollIntoView({behavior:'smooth'});$('scheduleMode').onchange=()=>status($('scheduleMode').value==='rebuild'?'2026 region games will be rebuilt. Future dynasty seasons always generate region, rivalry and same-class schedules.':'2026 keeps the real schedule. Future dynasty seasons still generate region, rivalry and same-class schedules.','good');
  }
  async function init(){
    try{
      status('Loading teams and current simulator…');const s=await fetch(`simulator-data.json?v=${Date.now()}`,{cache:'no-store'});if(!s.ok)throw new Error('simulator-data');window.simulator=await s.json();await loadEngine();baseData=await window.RUSFullSeason.load();
    window.RUSFullSeason.runUi=()=>runSeason();
      allTeams=[...baseData.meta.values()].map(x=>x.team).filter(Boolean).sort((a,b)=>a.localeCompare(b));
      baselineProfiles=Object.fromEntries(allTeams.map(t=>{const x=window.simulator.teams?.[t]||{};return[norm(t),{elo:x.elo,winPct:x.winPct,avgPF:x.avgPF,avgPA:x.avgPA,avgDiff:x.avgDiff,recent10Diff:x.recent10Diff,recentForm:x.recentForm}]}));
      state=currentState();refreshSaved();bind();render();fillMover();updateDynastyControls();status(`${allTeams.length} Utah football programs loaded. Build your alignment, then start a continuing dynasty.`,'good');
    }catch(e){console.error(e);status('Classification builder data could not be loaded.','bad')}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
