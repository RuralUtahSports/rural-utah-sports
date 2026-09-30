(() => {
  'use strict';
  if (window.__RUS_CLASSIFICATION_ADVANCED__) return;
  window.__RUS_CLASSIFICATION_ADVANCED__ = true;

  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const norm = v => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const pairKey = (a,b) => [norm(a),norm(b)].sort().join('|');
  const $ = id => document.getElementById(id);
  let A = null, directory = {}, initialized = false, scheduleDraft = [];

  const css = `
  .advanced-tools{margin:18px 0;display:grid;gap:14px}
  .advanced-card{background:#050505;border:1px solid #333;border-top:4px solid #F14D07;border-radius:9px;padding:15px}
  .advanced-card h3{margin:0 0 10px;text-transform:uppercase;font-size:17px}
  .advanced-card h4{margin:14px 0 8px;text-transform:uppercase;font-size:12px;color:#F14D07}
  .advanced-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;align-items:end}
  .advanced-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
  .advanced-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
  .advanced-field{display:flex;flex-direction:column;gap:5px}
  .advanced-field label{font-size:9px;color:#888;text-transform:uppercase;font-weight:900}
  .advanced-field input,.advanced-field select,.advanced-field textarea{width:100%;background:#181818;color:#fff;border:1px solid #444;border-radius:5px;padding:8px;font:inherit}
  .advanced-field input,.advanced-field select{height:40px}
  .advanced-field textarea{min-height:90px;resize:vertical}
  .advanced-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .advanced-btn{min-height:38px;border:1px solid #444;background:#1a1a1a;color:#fff;border-radius:5px;padding:0 11px;font-size:10px;font-weight:900;text-transform:uppercase;cursor:pointer}
  .advanced-btn:hover{border-color:#F14D07;color:#F14D07}.advanced-btn.primary{background:#F14D07;color:#000;border-color:#F14D07}.advanced-btn.danger{background:#2a1111;border-color:#6a2929;color:#ffb7b7}
  .advanced-note{font-size:10px;color:#888;line-height:1.45;margin:8px 0 0}
  .advanced-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid #444;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;margin:3px}
  .target-grid,.playoff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}
  .target-row,.playoff-row{background:#111;border:1px solid #333;border-radius:6px;padding:9px}
  .target-row strong,.playoff-row strong{display:block;font-size:12px;margin-bottom:7px}
  .mini-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
  .mini-grid label{font-size:8px;color:#888;text-transform:uppercase;font-weight:900}
  .mini-grid input,.mini-grid select{width:100%;height:34px;background:#191919;color:#fff;border:1px solid #444;border-radius:5px;padding:0 7px;font-size:10px}
  .lock-chip::after{content:'🔒';font-size:9px;margin-left:4px}
  .schedule-tools{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-bottom:9px}
  .schedule-health{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;background:#111;border:1px solid #333;border-radius:7px;padding:11px;margin:10px 0}
  .health-score{font-size:30px;font-weight:900;color:#F14D07}.health-meta{font-size:10px;color:#aaa;line-height:1.5}
  .schedule-editor-table select{min-width:155px;background:#161616;color:#fff;border:1px solid #444;border-radius:4px;padding:5px}
  .schedule-editor-table input{background:#161616;color:#fff;border:1px solid #444;border-radius:4px;padding:5px}
  .realignment-due{border:2px solid #F14D07;background:#211207;border-radius:7px;padding:10px;margin:10px 0;font-size:11px;font-weight:900}
  .history-summary{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:8px;margin:9px 0}
  .history-stat{background:#111;border:1px solid #333;border-radius:6px;padding:9px}.history-stat small{display:block;color:#888;font-size:8px;text-transform:uppercase}.history-stat strong{display:block;margin-top:3px;font-size:13px}
  @media(max-width:900px){.advanced-grid,.advanced-grid.three,.advanced-grid.two{grid-template-columns:1fr 1fr}.history-summary{grid-template-columns:1fr 1fr}}
  @media(max-width:600px){.advanced-grid,.advanced-grid.three,.advanced-grid.two{grid-template-columns:1fr}.history-summary{grid-template-columns:1fr}.schedule-editor-table select{min-width:130px}}
  `;

  function injectStyle(){
    if(document.getElementById('classificationAdvancedStyle')) return;
    const s=document.createElement('style');s.id='classificationAdvancedStyle';s.textContent=css;document.head.appendChild(s);
  }

  async function loadDirectory(){
    try{
      const r=await fetch('school-directory.json?v=20260929-advanced1',{cache:'no-store'});
      directory=r.ok?await r.json():{};
    }catch{directory={}}
  }

  function state(){return A?.getState?.()||null}
  function teams(){return A?.getTeams?.()||[]}
  function classes(){return A?.getClasses?.()||[]}
  function teamInfo(name){return window.RUSFullSeason?.info?.(name)||window.simulator?.teams?.[name]||{}}
  function locationOf(s,team){
    const k=norm(team);
    for(const c of s.classOrder||[])for(const r of s.regions?.[c]||[])if((r.teams||[]).some(t=>norm(t)===k))return{classification:c,region:r.name};
    return null;
  }
  function ensureRegion(s,c,name){
    s.regions[c]=s.regions[c]||[];
    let r=s.regions[c].find(x=>x.name===name);
    if(!r){r={name,teams:[]};s.regions[c].push(r)}
    return r;
  }
  function removeTeam(s,team){
    const k=norm(team);
    for(const c of s.classOrder||[])for(const r of s.regions?.[c]||[])r.teams=(r.teams||[]).filter(t=>norm(t)!==k);
    s.unassigned=(s.unassigned||[]).filter(t=>norm(t)!==k);
  }
  function moveTeam(s,team,c,region){
    removeTeam(s,team);ensureRegion(s,c,region).teams.push(team);
  }
  function currentRating(team){
    const d=A?.getDynasty?.(),p=d?.nextProfiles?.[norm(team)];
    return Number(p?.elo)||Number(teamInfo(team)?.elo)||1500;
  }
  function geo(team){
    const d=directory[team]||directory[String(team).toUpperCase()]||Object.entries(directory).find(([k])=>norm(k)===norm(team))?.[1];
    return d&&Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lon))?{lat:Number(d.lat),lon:Number(d.lon)}:null;
  }
  const distance=(a,b)=>{
    if(!a||!b)return 999;
    const x=(a.lat-b.lat)*69,y=(a.lon-b.lon)*54;
    return Math.sqrt(x*x+y*y);
  };

  function mount(){
    if(initialized||!A?.getState?.())return;
    const s=A.getState();if(!s)return;
    initialized=true;injectStyle();
    const moveCard=document.querySelector('.move-card'),grid=document.getElementById('classGrid');
    const host=document.createElement('section');
    host.id='advancedBuilderTools';host.className='advanced-tools';
    host.innerHTML=`
      <section class="advanced-card" id="alignmentTools">
        <h3>Alignment Tools</h3>
        <div class="advanced-grid">
          <div class="advanced-field"><label>Auto-build method</label><select id="autoBuildMode"><option value="elo">Balance by ELO</option><option value="equal">Equal size</option><option value="geography">Geography</option><option value="hybrid">Hybrid ELO + geography</option><option value="enrollment">Enrollment</option></select></div>
          <div class="advanced-field"><label>Regions per class</label><input id="autoRegions" type="number" min="1" max="8" value="2"></div>
          <button class="advanced-btn primary" id="autoBuildAlignment" type="button">Auto-Build Alignment</button>
          <button class="advanced-btn" id="balanceRegions" type="button">Balance Regions Only</button>
        </div>
        <h4>Class Size Targets</h4><div id="classTargetGrid" class="target-grid"></div>
        <h4>Team / Rivalry Locks</h4>
        <div class="advanced-grid three">
          <button class="advanced-btn" id="toggleTeamLock" type="button">Lock Selected Team</button>
          <div class="advanced-field"><label>Rival A</label><select id="rivalA"></select></div>
          <div class="advanced-field"><label>Rival B</label><select id="rivalB"></select></div>
        </div>
        <div class="advanced-actions"><button class="advanced-btn" id="addRivalry" type="button">Protect Rivalry</button><span id="lockCount" class="advanced-note"></span></div>
        <div id="rivalryList"></div>
        <details><summary class="advanced-note" style="cursor:pointer">Enrollment import</summary><div class="advanced-field" style="margin-top:8px"><label>Paste Team,Enrollment (one per line)</label><textarea id="enrollmentPaste" placeholder="JUAB,850&#10;MANTI,790"></textarea></div><button class="advanced-btn" id="importEnrollment" type="button">Import Enrollment</button></details>
      </section>
      <section class="advanced-card" id="playoffTools"><h3>Custom Playoff Settings</h3><div id="playoffSettingsGrid" class="playoff-grid"></div></section>
      <section class="advanced-card" id="dynastyRules">
        <h3>Dynasty / Realignment Rules</h3>
        <div class="advanced-grid">
          <div class="advanced-field"><label>Realignment every N years</label><input id="realignmentInterval" type="number" min="1" max="10"></div>
          <div class="advanced-field"><label>Promotion / relegation</label><select id="promotionEnabled"><option value="false">Off</option><option value="true">On</option></select></div>
          <div class="advanced-field"><label>Teams moved per boundary</label><input id="promotionCount" type="number" min="1" max="8"></div>
          <button class="advanced-btn primary" id="runRealignment" type="button">Run Realignment Now</button>
        </div>
        <div class="advanced-actions"><button class="advanced-btn" id="markRealignmentComplete" type="button">Keep Current Alignment / Mark Complete</button></div>
        <div id="realignmentDue"></div>
      </section>
      <section class="advanced-card" id="shareTools">
        <h3>Share / Export Alignment</h3>
        <div class="advanced-actions"><button class="advanced-btn primary" id="copyShareLink" type="button">Copy Share Link</button><button class="advanced-btn" id="copySetupCode" type="button">Copy Setup Code</button></div>
        <div class="advanced-field" style="margin-top:8px"><label>Load setup code</label><textarea id="setupCode" placeholder="Paste a Rural Utah Sports alignment code here"></textarea></div>
        <button class="advanced-btn" id="loadSetupCode" type="button">Load Code</button>
        <p class="advanced-note">Share codes contain the classification/region setup, locks, playoff rules and class targets. Simulated season results are not included.</p>
      </section>`;
    if(grid)grid.parentNode.insertBefore(host,grid);else moveCard?.insertAdjacentElement('afterend',host);

    const sim=document.getElementById('simulationSection');
    if(sim){
      const schedule=document.createElement('section');schedule.id='scheduleEditor';schedule.className='advanced-card';schedule.style.marginTop='16px';schedule.hidden=true;
      schedule.innerHTML='<h3>Schedule Editor + Health Check</h3><div id="scheduleEditorBody"></div>';
      sim.append(schedule);
      const hist=document.createElement('section');hist.id='dynastyHistoryAdvanced';hist.className='advanced-card';hist.style.marginTop='16px';hist.innerHTML='<h3>Dynasty History</h3><div id="dynastyHistoryAdvancedBody"></div>';sim.append(hist);
    }
    bind();renderAll();loadSharedHash();
    const mo=new MutationObserver(()=>decorateLocks());const classGrid=document.getElementById('classGrid');if(classGrid)mo.observe(classGrid,{childList:true,subtree:true});
  }

  function saveState(s){A.setState(s);renderAll()}

  function renderTargets(){
    const s=state(),host=$('classTargetGrid');if(!s||!host)return;
    host.innerHTML=classes().map(c=>{
      const count=(s.regions?.[c]||[]).reduce((n,r)=>n+(r.teams||[]).length,0),target=Number(s.classTargets?.[c])||count;
      return `<div class="target-row"><strong>${esc(A.classLabel(c))}</strong><div class="mini-grid"><label>Current<input value="${count}" disabled></label><label>Target<input class="class-target-input" data-class="${esc(c)}" type="number" min="0" max="200" value="${target}"></label></div></div>`;
    }).join('');
    host.querySelectorAll('.class-target-input').forEach(i=>i.onchange=()=>{const x=state();x.classTargets=x.classTargets||{};x.classTargets[i.dataset.class]=Math.max(0,Number(i.value)||0);A.setState(x);renderTargets()});
  }

  function renderPlayoffs(){
    const s=state(),host=$('playoffSettingsGrid');if(!s||!host)return;
    host.innerHTML=classes().map(c=>{
      const p=s.playoffSettings?.[c]||{},field=Number(p.fieldSize)||16,seed=p.seeding||'rpi',site=p.siteMode||'higher';
      return `<div class="playoff-row" data-pclass="${esc(c)}"><strong>${esc(A.classLabel(c))}</strong><div class="mini-grid">
        <label>Field<select data-key="fieldSize">${[8,12,16,24,32].map(n=>`<option value="${n}" ${n===field?'selected':''}>${n} teams</option>`).join('')}</select></label>
        <label>Seeding<select data-key="seeding"><option value="rpi" ${seed==='rpi'?'selected':''}>RPI</option><option value="elo" ${seed==='elo'?'selected':''}>ELO</option><option value="record" ${seed==='record'?'selected':''}>Record</option></select></label>
        <label>Sites<select data-key="siteMode"><option value="higher" ${site==='higher'?'selected':''}>Higher seed hosts</option><option value="neutral" ${site==='neutral'?'selected':''}>Neutral site</option></select></label>
        <label>Region champs<select data-key="regionChampions"><option value="false" ${!p.regionChampions?'selected':''}>No auto-bid</option><option value="true" ${p.regionChampions?'selected':''}>Auto-qualify</option></select></label>
      </div></div>`;
    }).join('');
    host.querySelectorAll('.playoff-row select').forEach(sel=>sel.onchange=()=>{
      const row=sel.closest('.playoff-row'),c=row.dataset.pclass,x=state();x.playoffSettings=x.playoffSettings||{};x.playoffSettings[c]=x.playoffSettings[c]||{};
      const k=sel.dataset.key,v=sel.value;x.playoffSettings[c][k]=k==='fieldSize'?Number(v):k==='regionChampions'?v==='true':v;saveState(x);
    });
  }

  function decorateLocks(){
    const s=state();if(!s)return;
    document.querySelectorAll('.team-chip').forEach(b=>b.classList.toggle('lock-chip',!!s.teamLocks?.[norm(b.dataset.team)]));
  }

  function renderLocks(){
    const s=state();if(!s)return;
    const all=teams(),a=$('rivalA'),b=$('rivalB'),opts=all.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    if(a&&!a.options.length)a.innerHTML=opts;if(b&&!b.options.length){b.innerHTML=opts;if(b.options.length>1)b.selectedIndex=1}
    const n=Object.keys(s.teamLocks||{}).length,r=(s.protectedRivalries||[]).length;
    if($('lockCount'))$('lockCount').textContent=`${n} team lock${n===1?'':'s'} • ${r} protected rivalr${r===1?'y':'ies'}`;
    const host=$('rivalryList');if(host)host.innerHTML=(s.protectedRivalries||[]).map((x,i)=>`<span class="advanced-pill">${esc(x.a)} vs ${esc(x.b)} <button class="advanced-btn danger" style="min-height:24px;padding:0 6px" data-remove-rival="${i}">×</button></span>`).join('')||'<span class="advanced-note">No custom rivalry locks yet.</span>';
    host?.querySelectorAll('[data-remove-rival]').forEach(btn=>btn.onclick=()=>{const x=state();x.protectedRivalries.splice(Number(btn.dataset.removeRival),1);saveState(x)});
    decorateLocks();
  }

  function importEnrollment(){
    const text=$('enrollmentPaste')?.value||'',s=state();s.enrollments=s.enrollments||{};let count=0;
    for(const line of text.split(/\r?\n/)){const parts=line.split(/[,	]/),name=parts[0]?.trim(),n=Number(String(parts[1]||'').replace(/[^0-9.]/g,''));if(!name||!Number.isFinite(n)||n<=0)continue;const team=teams().find(t=>norm(t)===norm(name));if(team){s.enrollments[norm(team)]=n;count++}}
    saveState(s);alert(`Imported enrollment for ${count} team${count===1?'':'s'}.`);
  }

  function desiredCounts(s,classList,eligible){
    const out={},lockedCounts={};
    for(const c of classList){lockedCounts[c]=0;for(const t of eligible){const l=s.teamLocks?.[norm(t)];if(l?.classification===c)lockedCounts[c]++}}
    const supplied=classList.some(c=>Number.isFinite(Number(s.classTargets?.[c])));
    if(!supplied){
      const base=Math.floor(eligible.length/classList.length),rem=eligible.length%classList.length;
      classList.forEach((c,i)=>out[c]=base+(i<rem?1:0));
    }else{
      classList.forEach(c=>out[c]=Math.max(0,Number(s.classTargets?.[c])||0,lockedCounts[c]||0));
      let total=classList.reduce((n,c)=>n+out[c],0);
      if(total<eligible.length)out[classList[classList.length-1]]+=eligible.length-total;
      if(total>eligible.length){
        let over=total-eligible.length;
        for(let i=classList.length-1;i>=0&&over>0;i--){
          const c=classList[i],floor=lockedCounts[c]||0,cut=Math.min(over,Math.max(0,out[c]-floor));
          out[c]-=cut;over-=cut;
        }
      }
    }
    return out;
  }

  function rankForMode(list,mode,s){
    const withData=list.map((t,i)=>({t,elo:currentRating(t),enroll:Number(s.enrollments?.[norm(t)])||null,g:geo(t),i}));
    if(mode==='enrollment'){
      const missing=withData.filter(x=>!x.enroll).length;
      if(missing){alert(`Enrollment mode needs imported values. ${missing} team${missing===1?' is':'s are'} missing enrollment.`);return null}
      return withData.sort((a,b)=>b.enroll-a.enroll||b.elo-a.elo).map(x=>x.t);
    }
    if(mode==='geography')return withData.sort((a,b)=>(b.g?.lat??-999)-(a.g?.lat??-999)||(a.g?.lon??999)-(b.g?.lon??999)).map(x=>x.t);
    if(mode==='hybrid'){
      const elo=[...withData].sort((a,b)=>b.elo-a.elo),geoRows=[...withData].sort((a,b)=>(b.g?.lat??-999)-(a.g?.lat??-999));
      const er=new Map(elo.map((x,i)=>[norm(x.t),i])),gr=new Map(geoRows.map((x,i)=>[norm(x.t),i]));
      return withData.sort((a,b)=>((er.get(norm(a.t))*.72+gr.get(norm(a.t))*.28)-(er.get(norm(b.t))*.72+gr.get(norm(b.t))*.28))).map(x=>x.t);
    }
    if(mode==='equal')return withData.sort((a,b)=>a.t.localeCompare(b.t)).map(x=>x.t);
    return withData.sort((a,b)=>b.elo-a.elo||a.t.localeCompare(b.t)).map(x=>x.t);
  }

  function geographicRegions(teamList,k){
    k=clamp(Math.round(k)||1,1,Math.max(1,teamList.length));
    if(k===1)return [teamList.slice()];
    const located=teamList.map(t=>({t,g:geo(t)}));
    if(located.filter(x=>x.g).length<k)return snakeRegions(teamList,k);
    const valid=located.filter(x=>x.g).sort((a,b)=>a.g.lon-b.g.lon),centers=Array.from({length:k},(_,i)=>valid[Math.floor(i*(valid.length-1)/Math.max(1,k-1))].g);
    let buckets=Array.from({length:k},()=>[]);
    for(let it=0;it<8;it++){
      buckets=Array.from({length:k},()=>[]);
      for(const x of located){let best=0,bd=Infinity;for(let i=0;i<k;i++){const d=distance(x.g,centers[i]);if(d<bd){bd=d;best=i}}buckets[best].push(x)}
      for(let i=0;i<k;i++){const g=buckets[i].filter(x=>x.g);if(g.length)centers[i]={lat:g.reduce((n,x)=>n+x.g.lat,0)/g.length,lon:g.reduce((n,x)=>n+x.g.lon,0)/g.length}}
    }
    const empty=buckets.findIndex(b=>!b.length);if(empty>=0)return snakeRegions(teamList,k);
    return buckets.map(b=>b.map(x=>x.t));
  }
  function snakeRegions(teamList,k){
    const buckets=Array.from({length:k},()=>[]),rows=[...teamList].sort((a,b)=>currentRating(b)-currentRating(a));
    rows.forEach((t,i)=>{const block=Math.floor(i/k),pos=i%k,idx=block%2? k-1-pos:pos;buckets[idx].push(t)});return buckets;
  }

  function rebuildRegionsForClass(s,c,k){
    const all=(s.regions?.[c]||[]).flatMap(r=>r.teams||[]),locked=all.filter(t=>s.teamLocks?.[norm(t)]?.classification===c),unlocked=all.filter(t=>!s.teamLocks?.[norm(t)]);
    const buckets=geographicRegions(unlocked,k),regions=Array.from({length:k},(_,i)=>({name:`Region ${i+1}`,teams:buckets[i]||[]}));
    for(const t of locked){const l=s.teamLocks[norm(t)],idx=Math.max(0,regions.findIndex(r=>r.name===l.region));(regions[idx>=0?idx:0].teams).push(t)}
    s.regions[c]=regions;
  }

  function autoBuild(){
    const s=state(),mode=$('autoBuildMode').value,k=clamp(Number($('autoRegions').value)||2,1,8),classList=classes().filter(c=>c!=='8P');
    const eleven=teams().filter(t=>A.getBaseData()?.meta?.get(norm(t))?.classification!=='8P'),ranked=rankForMode(eleven,mode,s);if(!ranked)return;
    const counts=desiredCounts(s,classList,eleven),lockedTeams=new Set(Object.keys(s.teamLocks||{}));
    for(const c of classList)s.regions[c]=[];
    const assigned=new Set();
    for(const t of eleven){const l=s.teamLocks?.[norm(t)];if(l&&classList.includes(l.classification)){ensureRegion(s,l.classification,l.region||'Region 1').teams.push(t);assigned.add(norm(t))}}
    const pool=ranked.filter(t=>!assigned.has(norm(t)));let p=0;
    for(const c of classList){
      const have=(s.regions[c]||[]).reduce((n,r)=>n+r.teams.length,0),need=Math.max(0,(counts[c]||0)-have);
      for(let i=0;i<need&&p<pool.length;i++){ensureRegion(s,c,'Region 1').teams.push(pool[p++])}
    }
    while(p<pool.length){ensureRegion(s,classList[classList.length-1],'Region 1').teams.push(pool[p++])}
    for(const c of classList)rebuildRegionsForClass(s,c,k);
    if(s.regions['8P']){const eight=(s.regions['8P']||[]).flatMap(r=>r.teams||[]);s.regions['8P']=[{name:'8-Player',teams:eight}]}
    s.unassigned=[];saveState(s);
  }

  function balanceRegions(){
    const s=state(),k=clamp(Number($('autoRegions').value)||2,1,8);
    for(const c of classes()){if(c==='8P')continue;rebuildRegionsForClass(s,c,k)}
    saveState(s);
  }

  function toggleSelectedLock(){
    const team=A.getSelectedTeam(),s=state();if(!team)return;
    s.teamLocks=s.teamLocks||{};const k=norm(team);
    if(s.teamLocks[k])delete s.teamLocks[k];else{const loc=locationOf(s,team);if(!loc)return;s.teamLocks[k]={team,...loc}}
    saveState(s);
  }

  function addRivalry(){
    const a=$('rivalA').value,b=$('rivalB').value;if(!a||!b||norm(a)===norm(b))return;
    const s=state();s.protectedRivalries=s.protectedRivalries||[];
    if(!s.protectedRivalries.some(x=>pairKey(x.a,x.b)===pairKey(a,b)))s.protectedRivalries.push({a,b});
    saveState(s);
  }

  function scheduleKind(g){
    if(g.customRegion)return'Region';if(g.protectedRivalry)return'Rivalry';if(g.rematchGame||g.rematch)return'Rematch';if(g.sameClassGame)return'Same Class';if(g.eloMatchedGame)return'ELO Match';return'Non-Region';
  }

  function scheduleHealth(games){
    const s=state(),meta=new Map();
    for(const c of s.classOrder||[])for(const r of s.regions?.[c]||[])for(const t of r.teams||[])meta.set(norm(t),{team:t,c,r:r.name});
    const counts=new Map(teams().map(t=>[norm(t),{team:t,g:0,h:0,a:0}])),pairs=new Map(),issues=[];
    for(const g of games||[]){
      const ak=norm(g.teamA),bk=norm(g.teamB);if(counts.has(ak)){counts.get(ak).g++;counts.get(ak).a++}if(counts.has(bk)){counts.get(bk).g++;counts.get(bk).h++}
      const k=pairKey(g.teamA,g.teamB);pairs.set(k,(pairs.get(k)||0)+1);
    }
    let score=100,short=0,over=0,balance=0;
    for(const x of counts.values()){if(x.g<10){short++;score-=Math.min(9,(10-x.g)*3)}if(x.g>10){over++;score-=Math.min(9,(x.g-10)*3)}if(Math.abs(x.h-x.a)>2){balance++;score-=1}}
    const triple=[...pairs.values()].filter(n=>n>2).length;score-=triple*4;
    let missingRival=0;for(const rv of s.protectedRivalries||[])if(!pairs.has(pairKey(rv.a,rv.b))){missingRival++;score-=5}
    let mismatch=0;for(const g of games||[])if(Math.abs(currentRating(g.teamA)-currentRating(g.teamB))>450){mismatch++;score-=.5}
    for(const c of s.classOrder||[])for(const r of s.regions?.[c]||[]){const n=(r.teams||[]).length;if(n>11){issues.push(`${c} ${r.name} has ${n} teams: a full region round robin cannot fit in 10 games.`);score-=5}}
    return{score:Math.round(clamp(score,0,100)),short,over,balance,triple,missingRival,mismatch,issues};
  }

  function renderSchedule(){
    const dyn=A.getDynasty(),host=$('scheduleEditor'),body=$('scheduleEditorBody');if(!host||!body)return;
    const games=dyn?.lastSchedule||state()?.scheduleOverrides?.[dyn?.currentYear]||[];
    if(!dyn?.currentYear||!games.length){host.hidden=true;return}
    host.hidden=false;
    if(!scheduleDraft.length||scheduleDraft._year!==dyn.currentYear){scheduleDraft=JSON.parse(JSON.stringify(games));scheduleDraft._year=dyn.currentYear}
    const health=scheduleHealth(scheduleDraft),filter=$('scheduleTeamFilter')?.value||A.getSelectedTeam()||'ALL';
    const all=teams(),teamOptions=['ALL',...all].map(t=>`<option value="${esc(t)}" ${t===filter?'selected':''}>${t==='ALL'?'All Teams':esc(t)}</option>`).join('');
    const rows=scheduleDraft.map((g,i)=>({g,i})).filter(x=>filter==='ALL'||norm(x.g.teamA)===norm(filter)||norm(x.g.teamB)===norm(filter));
    body.innerHTML=`
      <div class="schedule-health"><div class="health-score">${health.score}/100</div><div class="health-meta">${health.short} short of 10 • ${health.over} over 10 • ${health.balance} home/away imbalances • ${health.missingRival} missing protected rivalries • ${health.triple} 3+ meeting pairs • ${health.mismatch} large ELO gaps${health.issues.length?'<br>'+health.issues.map(esc).join('<br>'):''}</div></div>
      <div class="schedule-tools"><div class="advanced-field"><label>Team filter</label><select id="scheduleTeamFilter">${teamOptions}</select></div><button class="advanced-btn" id="addScheduleGame">+ Add Game</button><button class="advanced-btn" id="resetScheduleDraft">Reset Draft</button><button class="advanced-btn primary" id="applySchedule">Save + Re-Simulate ${dyn.currentYear}</button></div>
      <div class="table-wrap"><table class="schedule-editor-table"><thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Type</th><th></th></tr></thead><tbody>${rows.map(({g,i})=>`<tr data-game-index="${i}"><td><input data-field="date" value="${esc(g.date)}"></td><td><select data-field="teamA">${all.map(t=>`<option value="${esc(t)}" ${norm(t)===norm(g.teamA)?'selected':''}>${esc(t)}</option>`).join('')}</select></td><td><select data-field="teamB">${all.map(t=>`<option value="${esc(t)}" ${norm(t)===norm(g.teamB)?'selected':''}>${esc(t)}</option>`).join('')}</select></td><td>${scheduleKind(g)}</td><td><button class="advanced-btn danger" data-delete-game="${i}">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
    $('scheduleTeamFilter').onchange=renderSchedule;
    body.querySelectorAll('tr[data-game-index] input,tr[data-game-index] select').forEach(el=>el.onchange=()=>{const row=el.closest('tr'),i=Number(row.dataset.gameIndex);scheduleDraft[i][el.dataset.field]=el.value;renderSchedule()});
    body.querySelectorAll('[data-delete-game]').forEach(b=>b.onclick=()=>{scheduleDraft.splice(Number(b.dataset.deleteGame),1);renderSchedule()});
    $('resetScheduleDraft').onclick=()=>{scheduleDraft=JSON.parse(JSON.stringify(games));scheduleDraft._year=dyn.currentYear;renderSchedule()};
    $('addScheduleGame').onclick=()=>{const dates=[...new Set(scheduleDraft.map(g=>g.date))].sort(),date=dates[0]||`${dyn.currentYear}-08-14`;scheduleDraft.push({date,teamA:all[0],teamB:all[1]});renderSchedule()};
    $('applySchedule').onclick=()=>applySchedule(dyn.currentYear);
  }

  function applySchedule(year){
    const s=state(),meta=new Map();for(const c of s.classOrder||[])for(const r of s.regions?.[c]||[])for(const t of r.teams||[])meta.set(norm(t),{c,r:r.name});
    const pairCount=new Map(),rivals=new Set((s.protectedRivalries||[]).map(x=>pairKey(x.a,x.b)));
    const clean=scheduleDraft.filter(g=>g.teamA&&g.teamB&&norm(g.teamA)!==norm(g.teamB)).map(g=>({date:g.date,teamA:g.teamA,teamB:g.teamB}));
    for(const g of clean){const a=meta.get(norm(g.teamA)),b=meta.get(norm(g.teamB)),k=pairKey(g.teamA,g.teamB),n=(pairCount.get(k)||0)+1;pairCount.set(k,n);if(a&&b&&a.c===b.c&&a.r===b.r)g.customRegion=true;else if(rivals.has(k))g.protectedRivalry=true;else if(a&&b&&a.c===b.c)g.sameClassGame=true;else g.eloMatchedGame=true;if(n>1)g.rematch=true}
    A.setScheduleOverride(year,clean);scheduleDraft=[];A.simulateYear(year,year===2026).then(()=>setTimeout(renderAll,100));
  }

  function aggregateHistory(){
    const d=A.getDynasty(),rows=d?.history||[],totals=new Map(),titles=new Map(),apps=new Map();let high={team:'—',elo:-Infinity,year:null},low={team:'—',elo:Infinity,year:null},streak={team:'—',n:0};
    const rivalries={};
    for(const y of rows){
      for(const [team,r] of Object.entries(y.teamRecords||{})){const x=totals.get(team)||{w:0,l:0,pf:0,pa:0};x.w+=Number(r.w)||0;x.l+=Number(r.l)||0;x.pf+=Number(r.pf)||0;x.pa+=Number(r.pa)||0;totals.set(team,x);const e=Number(r.elo);if(e>high.elo)high={team,elo:e,year:y.year};if(e<low.elo)low={team,elo:e,year:y.year}}
      for(const team of Object.values(y.champions||{})){if(team&&team!=='—')titles.set(team,(titles.get(team)||0)+1)}
      for(const list of Object.values(y.playoffTeams||{}))for(const team of list||[])apps.set(team,(apps.get(team)||0)+1);
      for(const [team,n] of Object.entries(y.streaks||{}))if(Number(n)>streak.n)streak={team,n:Number(n)};
      for(const [k,r] of Object.entries(y.rivalryRecords||{})){const x=rivalries[k]||{a:r.a,b:r.b,aWins:0,bWins:0};x.aWins+=Number(r.aWins)||0;x.bWins+=Number(r.bWins)||0;rivalries[k]=x}
    }
    return{rows,totals,titles,apps,high,low,streak,rivalries};
  }

  function renderHistory(){
    const host=$('dynastyHistoryAdvancedBody');if(!host)return;
    const H=aggregateHistory();if(!H.rows.length){host.innerHTML='<p class="advanced-note">Complete a dynasty season to build the historical database.</p>';return}
    const rank=[...H.totals.entries()].sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l||a[0].localeCompare(b[0]));
    const titleLeader=[...H.titles.entries()].sort((a,b)=>b[1]-a[1])[0]||['—',0],appLeader=[...H.apps.entries()].sort((a,b)=>b[1]-a[1])[0]||['—',0];
    host.innerHTML=`
      <div class="history-summary"><div class="history-stat"><small>Most Titles</small><strong>${esc(titleLeader[0])} • ${titleLeader[1]}</strong></div><div class="history-stat"><small>Most Playoff Trips</small><strong>${esc(appLeader[0])} • ${appLeader[1]}</strong></div><div class="history-stat"><small>Longest Win Streak</small><strong>${esc(H.streak.team)} • ${H.streak.n}</strong></div><div class="history-stat"><small>Highest ELO</small><strong>${esc(H.high.team)} • ${Number.isFinite(H.high.elo)?Math.round(H.high.elo):'—'}</strong></div><div class="history-stat"><small>Lowest ELO</small><strong>${esc(H.low.team)} • ${Number.isFinite(H.low.elo)?Math.round(H.low.elo):'—'}</strong></div></div>
      <details open><summary class="advanced-note" style="cursor:pointer">All-Time Dynasty Records</summary><div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>Team</th><th>W-L</th><th>Titles</th><th>Playoffs</th><th>PF-PA</th></tr></thead><tbody>${rank.map(([team,r])=>`<tr><td class="left stat-team">${esc(team)}</td><td>${r.w}-${r.l}</td><td>${H.titles.get(team)||0}</td><td>${H.apps.get(team)||0}</td><td>${r.pf}-${r.pa}</td></tr>`).join('')}</tbody></table></div></details>
      ${Object.keys(H.rivalries).length?`<details><summary class="advanced-note" style="cursor:pointer">Protected Rivalry Records</summary><div style="margin-top:8px">${Object.values(H.rivalries).map(r=>`<span class="advanced-pill">${esc(r.a)} ${r.aWins}-${r.bWins} ${esc(r.b)}</span>`).join('')}</div></details>`:''}`;
  }

  function promotionRealignment(){
    const s=state(),d=A.getDynasty(),last=d?.history?.[d.history.length-1];if(!last?.teamRecords){alert('Complete a season before running promotion/relegation.');return}
    const count=Math.max(1,Number(s.promotionRelegation?.count)||2),order=classes().filter(c=>c!=='8P'),moves=[];
    for(let i=0;i<order.length-1;i++){
      const up=order[i],down=order[i+1],upTeams=Object.entries(last.teamRecords).filter(([,r])=>r.classification===up).sort((a,b)=>(a[1].w/(a[1].w+a[1].l||1))-(b[1].w/(b[1].w+b[1].l||1))||a[1].elo-b[1].elo).slice(0,count);
      const downTeams=Object.entries(last.teamRecords).filter(([,r])=>r.classification===down).sort((a,b)=>(b[1].w/(b[1].w+b[1].l||1))-(a[1].w/(a[1].w+a[1].l||1))||b[1].elo-a[1].elo).slice(0,count);
      upTeams.forEach(([t])=>moves.push({t,to:down}));downTeams.forEach(([t])=>moves.push({t,to:up}));
    }
    for(const m of moves){if(s.teamLocks?.[norm(m.t)])continue;removeTeam(s,m.t);ensureRegion(s,m.to,'Region 1').teams.push(m.t)}
    const k=clamp(Number($('autoRegions')?.value)||2,1,8);for(const c of order)rebuildRegionsForClass(s,c,k);
    saveState(s);A.markRealignmentHandled?.();
  }

  function runRealignment(){
    const s=state();
    if(s.promotionRelegation?.enabled)promotionRealignment();else{autoBuild();A.markRealignmentHandled?.()}
    setTimeout(renderAll,50);
  }

  function renderRealignment(){
    const s=state(),d=A.getDynasty();if(!s)return;
    $('realignmentInterval').value=s.realignmentInterval||2;$('promotionEnabled').value=String(!!s.promotionRelegation?.enabled);$('promotionCount').value=s.promotionRelegation?.count||2;
    const due=$('realignmentDue');if(due)due.innerHTML=d?.realignmentDue?`<div class="realignment-due">REALIGNMENT TIME — ${d.currentYear} completed. Review the alignment or run your configured realignment before advancing.</div>`:'';
  }

  function exportState(){
    const s=state(),copy=JSON.parse(JSON.stringify(s));delete copy.scheduleOverrides;return copy;
  }
  function encode(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))}
  function decode(str){return JSON.parse(decodeURIComponent(escape(atob(str.trim()))))}
  async function copyText(t){try{await navigator.clipboard.writeText(t);alert('Copied.')}catch{prompt('Copy this:',t)}}
  function shareLink(){const code=encode(exportState()),url=new URL(location.href);url.hash='alignment='+code;copyText(url.toString())}
  function copyCode(){copyText(encode(exportState()))}
  function loadCode(code){try{const s=decode(code);A.setState(s);renderAll();alert('Alignment loaded.')}catch{alert('That setup code could not be read.')}}
  function loadSharedHash(){const m=location.hash.match(/alignment=([^&]+)/);if(m){try{A.setState(decode(m[1]));history.replaceState(null,'',location.pathname+location.search);renderAll()}catch{}}}

  function bind(){
    $('autoBuildAlignment').onclick=autoBuild;$('balanceRegions').onclick=balanceRegions;$('toggleTeamLock').onclick=toggleSelectedLock;$('addRivalry').onclick=addRivalry;$('importEnrollment').onclick=importEnrollment;
    $('realignmentInterval').onchange=()=>{const s=state();s.realignmentInterval=Math.max(1,Number($('realignmentInterval').value)||2);saveState(s)};
    $('promotionEnabled').onchange=()=>{const s=state();s.promotionRelegation=s.promotionRelegation||{};s.promotionRelegation.enabled=$('promotionEnabled').value==='true';saveState(s)};
    $('promotionCount').onchange=()=>{const s=state();s.promotionRelegation=s.promotionRelegation||{};s.promotionRelegation.count=Math.max(1,Number($('promotionCount').value)||2);saveState(s)};
    $('runRealignment').onclick=runRealignment;$('markRealignmentComplete').onclick=()=>{A.markRealignmentHandled?.();renderAll()};$('copyShareLink').onclick=shareLink;$('copySetupCode').onclick=copyCode;$('loadSetupCode').onclick=()=>loadCode($('setupCode').value);
    document.addEventListener('click',e=>{if(e.target.closest('.team-chip'))setTimeout(renderLocks,0);if(e.target.matches('[data-add-region],[data-delete-region],[data-delete-class]'))setTimeout(renderAll,0)});
  }

  function renderAll(){if(!initialized)return;renderTargets();renderPlayoffs();renderLocks();renderRealignment();renderSchedule();renderHistory()}
  setInterval(()=>{if(initialized){const d=A?.getDynasty?.();if(d?.currentYear)renderAll()}},4000);

  async function boot(){
    A=window.RUSClassificationBuilder;
    if(!A?.getState?.()||!A.getState()){setTimeout(boot,120);return}
    await loadDirectory();mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();