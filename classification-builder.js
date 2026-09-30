(() => {
  'use strict';
  const CLASSES=['6A','5A','4A','3A','2A','1A','8P'];
  const STORE='rus-custom-classifications-v1';
  const WEEK_DATES=['2026-08-14','2026-08-21','2026-08-28','2026-09-04','2026-09-11','2026-09-18','2026-09-25','2026-10-02','2026-10-09','2026-10-16'];
  let baseData=null,state=null,allTeams=[],dragTeam='',selectedTeam='';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const clone=v=>JSON.parse(JSON.stringify(v));
  const status=(text,kind='')=>{const el=$('builderStatus');if(!el)return;el.textContent=text;el.className='status'+(kind?' '+kind:'')};
  const simStatus=(text,kind='')=>{const el=$('customSimStatus');if(!el)return;el.textContent=text;el.className='status'+(kind?' '+kind:'')};
  function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(src));document.body.appendChild(s)})}
  async function loadEngine(){
    for(const src of ['season-simulator-core.js?v=20260813a','season-simulator-score.js?v=20260813e','full-season-core.js?v=20260824b','full-season-run.js?v=20260813b','full-season-view.js?v=20260813a','full-season-playoffs.js?v=20260824-open1','full-season-playoff-view.js?v=20260824-boxscroll1']) await script(src);
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
  function roundRobin(teams){
    let a=[...teams];if(a.length<2)return[];if(a.length%2)a.push(null);const n=a.length,rounds=[];
    for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const x=a[i],y=a[n-1-i];if(x&&y)pairs.push([x,y])}rounds.push(pairs);a=[a[0],a[n-1],...a.slice(1,n-1)]}
    return rounds;
  }
  function originalOrientation(a,b){
    const ka=norm(a),kb=norm(b),g=(baseData.season.games||[]).find(x=>{const x1=norm(resolveTeam(x.teamA)||x.teamA),x2=norm(resolveTeam(x.teamB)||x.teamB);return(x1===ka&&x2===kb)||(x1===kb&&x2===ka)});if(!g)return null;return{a:resolveTeam(g.teamA)||g.teamA,b:resolveTeam(g.teamB)||g.teamB};
  }
  function rebuildSchedule(meta){
    const games=[],busy=new Map(allTeams.map(t=>[norm(t),new Set()])),usedPairs=new Set(),warnings=[];
    const pair=(a,b)=>[norm(a),norm(b)].sort().join('|'),mark=(team,w)=>busy.get(norm(team))?.add(w),free=(team,w)=>!busy.get(norm(team))?.has(w);
    for(const c of CLASSES)for(const r of state.regions[c]||[]){
      const rounds=roundRobin(r.teams||[]),take=Math.min(10,rounds.length),start=10-take;
      if(rounds.length>10)warnings.push(`${c} ${r.name} has ${r.teams.length} teams, so a full round robin does not fit in a 10-game season.`);
      for(let ri=0;ri<take;ri++)for(let pi=0;pi<rounds[ri].length;pi++){
        const [x,y]=rounds[ri][pi],w=start+ri;if(!free(x,w)||!free(y,w))continue;const o=originalOrientation(x,y),swap=(ri+pi)%2===1,a=o?.a||(swap?y:x),b=o?.b||(swap?x:y),sig=pair(a,b);if(usedPairs.has(sig))continue;usedPairs.add(sig);mark(a,w);mark(b,w);games.push({date:WEEK_DATES[w],teamA:a,teamB:b,customRegion:true});
      }
    }
    const original=[...(baseData.season.games||[])].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
    for(const g of original){
      const a=resolveTeam(g.teamA)||g.teamA,b=resolveTeam(g.teamB)||g.teamB,ma=meta.get(norm(a)),mb=meta.get(norm(b)),sig=pair(a,b);if(usedPairs.has(sig))continue;
      if(ma&&mb&&ma.classification===mb.classification&&ma.region===mb.region)continue;
      const ta=ma?norm(a):null,tb=mb?norm(b):null;if(!ta&&!tb)continue;
      const target=Date.parse(g.date),slots=[0,1,2,3,4,5,6,7,8,9].sort((x,y)=>Math.abs(Date.parse(WEEK_DATES[x])-target)-Math.abs(Date.parse(WEEK_DATES[y])-target));
      const w=slots.find(i=>(!ma||free(a,i))&&(!mb||free(b,i)));if(w==null)continue;
      usedPairs.add(sig);if(ma)mark(a,w);if(mb)mark(b,w);games.push({date:WEEK_DATES[w],teamA:a,teamB:b,customNonRegion:true});
    }
    const counts=new Map(allTeams.map(t=>[norm(t),0]));for(const g of games){if(counts.has(norm(g.teamA)))counts.set(norm(g.teamA),counts.get(norm(g.teamA))+1);if(counts.has(norm(g.teamB)))counts.set(norm(g.teamB),counts.get(norm(g.teamB))+1)}
    const low=allTeams.filter(t=>(counts.get(norm(t))||0)<6);if(low.length)warnings.push(`${low.length} team${low.length===1?'':'s'} ended with fewer than 6 games after rebuilding the schedule.`);
    return{season:{season:2026,games:games.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))},warnings,counts};
  }
  async function runSeason(){
    if(state.unassigned.length)return updateRunState();const btn=$('runCustomSeason'),section=$('simulationSection');btn.disabled=true;btn.textContent='Simulating…';section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'start'});simStatus('Preparing custom alignment and schedule…');$('customSimOutput').innerHTML='';
    try{
      const meta=metaFromState(),mode=$('scheduleMode').value,rebuilt=mode==='rebuild'?rebuildSchedule(meta):null,season=rebuilt?.season||clone(baseData.season);
      const F=window.RUSFullSeason;F.data={...baseData,meta,season};
      simStatus(mode==='rebuild'?`Rebuilt ${season.games.length} games from your custom regions. Running the RUS model…`:`Using the real 2026 schedule with your custom region and classification assignments…`);
      const R=await F.simulate(Date.now()%100000);await F.render(R,$('customSimOutput'));
      const warning=rebuilt?.warnings?.length?` ${rebuilt.warnings.join(' ')}`:'';simStatus(`${R.games} regular-season games simulated • ${R.stats.size} teams • custom RPI, region standings and playoff brackets generated.${warning}`,warning?'warn':'good');
    }catch(e){console.error(e);simStatus('The custom season simulation could not be completed.','bad')}finally{btn.disabled=state.unassigned.length>0;btn.textContent='Simulate Custom Season'}
  }
  function bind(){
    $('teamSelect').onchange=()=>{selectedTeam=$('teamSelect').value;syncMover();render()};$('classSelect').onchange=fillRegions;$('moveTeam').onclick=()=>{const t=$('teamSelect').value,c=$('classSelect').value,r=$('regionSelect').value;if(!r){addRegion(c);return}move(t,c,r)};
    $('teamSearch').oninput=render;$('resetCurrent').onclick=()=>{state=currentState();render();fillMover();status('Reset to the current UHSAA football alignment.','good')};$('clearRegions').onclick=clearAllRegions;$('saveScenario').onclick=saveScenario;$('loadScenario').onclick=loadScenario;$('deleteScenario').onclick=deleteScenario;$('runCustomSeason').onclick=runSeason;$('scrollToBuilder').onclick=()=>document.querySelector('.builder-hero')?.scrollIntoView({behavior:'smooth'});$('scheduleMode').onchange=()=>status($('scheduleMode').value==='rebuild'?'Region games will be rebuilt from this custom alignment when you simulate.':'The real 2026 schedule will be kept; only alignment logic changes.','good');
  }
  async function init(){
    try{
      status('Loading teams and current simulator…');const s=await fetch(`simulator-data.json?v=${Date.now()}`,{cache:'no-store'});if(!s.ok)throw new Error('simulator-data');window.simulator=await s.json();await loadEngine();baseData=await window.RUSFullSeason.load();
    window.RUSFullSeason.runUi=()=>runSeason();
      allTeams=[...baseData.meta.values()].map(x=>x.team).filter(Boolean).sort((a,b)=>a.localeCompare(b));state=currentState();refreshSaved();bind();render();fillMover();status(`${allTeams.length} Utah football programs loaded. Build your alignment, then simulate it.`,'good');
    }catch(e){console.error(e);status('Classification builder data could not be loaded.','bad')}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
