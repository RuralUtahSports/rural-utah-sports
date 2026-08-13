(()=>{
'use strict';

const clean=v=>String(v??'').trim();
const baseNorm=v=>clean(v).replace(/^#\d+\s*/,'').toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const aliases={'ST JOSEPH':'SAINT JOSEPH','ST JOSEPH CATHOLIC':'SAINT JOSEPH','UMA CAMP WILLIAMS':'UMA LEHI','UMA HILLFIELD':'UMA HILLFIELD','AMERICAN LEADERSHIP':'ALA','CEDAR':'CEDAR CITY','MONUMENT VALLEY':'MONUMENT VAL','PANGUTICH':'PANGUITCH','GUNNISON':'GUNNISON VALLEY','WASATCH ACADEMY':'WASATCH ACAD'};
const teamKey=v=>aliases[baseNorm(v)]||baseNorm(v);
const esc=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const safeHex=(v,f)=>/^#[0-9A-F]{6}$/i.test(clean(v))?clean(v):f;
const ordinal=n=>{n=Number(n)||0;const m=n%100;if(m>=11&&m<=13)return n+'th';return n+(n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const state={highlight:'',leaderMode:'titles',leaderRows:[],teamMap:new Map(),initializing:true};

function addStyles(){
  if(document.getElementById('rus-champ-features-style'))return;
  const s=document.createElement('style');
  s.id='rus-champ-features-style';
  s.textContent=`
  .bracket-highlight-select{min-width:180px}.bracket-copy{height:38px;border:1px solid #555;background:#222;color:#fff;border-radius:5px;padding:0 12px;font-weight:900;cursor:pointer;white-space:nowrap}.bracket-copy:hover{border-color:#F14D07;color:#F14D07}
  .bracket-champion-bar{display:none;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;background:#050505;border:1px solid #333;border-left:5px solid #F14D07;border-radius:7px;padding:13px 15px;margin-bottom:12px}.bracket-champion-bar.show{display:flex}.bracket-champion-kicker{display:block;color:#F14D07;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.bracket-champion-name{font-size:20px;font-weight:900}.bracket-champion-name a{color:inherit;text-decoration:none}.bracket-champion-result{color:#aaa;font-size:12px;font-weight:800;line-height:1.45;text-align:right}
  .bracket-team{cursor:pointer;transition:opacity .15s ease,filter .15s ease,box-shadow .15s ease}.bracket-grid.has-team-highlight .bracket-game{opacity:.18;filter:saturate(.25);transition:opacity .15s ease,filter .15s ease,box-shadow .15s ease}.bracket-grid.has-team-highlight .bracket-game.path-game{opacity:1;filter:none;box-shadow:0 0 0 1px rgba(241,77,7,.62)}.bracket-grid.has-team-highlight .bracket-game.path-game .bracket-team:not(.path-team){filter:saturate(.35) brightness(.62)}.bracket-team.path-team{box-shadow:inset 0 0 0 2px #fff!important}
  .champ-leaders{margin-top:34px;border-top:4px solid #F14D07;padding-top:24px}.champ-leader-head{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}.champ-leader-head h3{font-size:25px;text-transform:uppercase}.champ-leader-head p{color:#999;font-size:13px;margin-top:5px;max-width:720px}.champ-leader-controls{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.champ-leader-tab{border:1px solid #444;background:#191919;color:#fff;padding:8px 10px;border-radius:5px;font-weight:900;cursor:pointer}.champ-leader-tab.active{background:#F14D07;color:#000;border-color:#F14D07}.champ-decade{height:35px;background:#191919;color:#fff;border:1px solid #444;border-radius:5px;padding:0 8px;font-weight:900}.champ-leader-list{background:#090909;border:1px solid #333;border-radius:8px;overflow:hidden}.champ-leader-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 14px;border-bottom:1px solid #292929}.champ-leader-row:last-child{border-bottom:0}.champ-leader-rank{color:#777;font-size:12px;font-weight:900}.champ-leader-team{font-weight:900;min-width:0}.champ-leader-team a{color:inherit;text-decoration:none}.champ-leader-detail{display:block;color:#777;font-size:10px;font-weight:700;margin-top:2px}.champ-leader-value{font-size:19px;font-weight:900;color:#F14D07;text-align:right}.champ-leader-value small{display:block;color:#777;font-size:9px;text-transform:uppercase;margin-top:2px}
  @media(max-width:750px){.bracket-copy,.bracket-highlight-select{width:100%}.bracket-champion-result{text-align:left}}
  @media(max-width:600px){.bracket-champion-name{font-size:17px}.champ-leader-row{grid-template-columns:30px minmax(0,1fr) auto;padding:10px}.champ-leader-head h3{font-size:21px}}
  `;
  document.head.appendChild(s);
}

function activeClass(tabs){return clean(tabs.querySelector('.bracket-tab.active')?.dataset.cls||tabs.querySelector('.bracket-tab.active')?.textContent)}
function rowKey(row){return teamKey(row.querySelector('.bracket-team-name')?.textContent||'')}
function rowLabel(row){return clean(row.querySelector('.bracket-team-name')?.textContent).replace(/^#\d+\s*/,'')}

function updateURL(yearSelect,tabs,highlightSelect){
  if(state.initializing||!history.replaceState)return;
  const p=new URLSearchParams();
  p.set('year',yearSelect.value);
  const cls=activeClass(tabs);if(cls)p.set('class',cls);
  if(state.highlight){const label=highlightSelect.options[highlightSelect.selectedIndex]?.textContent||state.highlight;p.set('team',label)}
  history.replaceState(null,'',location.pathname+'?'+p.toString()+location.hash);
}

function applyHighlight(grid){
  grid.classList.toggle('has-team-highlight',!!state.highlight);
  for(const game of grid.querySelectorAll('.bracket-game')){
    const rows=[...game.querySelectorAll('.bracket-team')];
    const hit=!!state.highlight&&rows.some(r=>rowKey(r)===state.highlight);
    game.classList.toggle('path-game',hit);
    for(const row of rows)row.classList.toggle('path-team',!!state.highlight&&rowKey(row)===state.highlight);
  }
}

function refreshHighlight(highlightSelect,grid){
  const teams=new Map();
  for(const row of grid.querySelectorAll('.bracket-team')){
    const key=rowKey(row),label=rowLabel(row);
    if(key&&label&&!teams.has(key))teams.set(key,label);
  }
  highlightSelect.innerHTML='<option value="">No Highlight</option>'+[...teams.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>`<option value="${esc(k)}">${esc(n)}</option>`).join('');
  if(state.highlight&&teams.has(state.highlight))highlightSelect.value=state.highlight;
  else{state.highlight='';highlightSelect.value=''}
  return teams;
}

function titleCountThrough(name,year){
  const key=teamKey(name),row=state.leaderRows.find(r=>r.key===key);
  return row?row.titles.filter(y=>y<=Number(year)).length:0;
}

function updateChampionBar(championBar,grid,tabs,yearSelect){
  const rounds=[...grid.querySelectorAll('.bracket-round')],last=rounds[rounds.length-1],game=last?.querySelector('.bracket-game');
  if(!game){championBar.classList.remove('show');championBar.innerHTML='';return}
  const rows=[...game.querySelectorAll('.bracket-team')],win=rows.find(r=>r.classList.contains('win')),cls=activeClass(tabs);
  if(rows.length<2){championBar.classList.remove('show');return}
  if(!win){
    const a=rows[0],b=rows[1],an=rowLabel(a),bn=rowLabel(b),as=clean(a?.querySelector('.bracket-score')?.textContent),bs=clean(b?.querySelector('.bracket-score')?.textContent);
    championBar.style.borderLeftColor='#F14D07';
    championBar.innerHTML=`<div><span class="bracket-champion-kicker">${esc(yearSelect.value)} ${esc(cls)} Championship</span><div class="bracket-champion-name">${esc(an)} ${esc(as)} – ${esc(bs)} ${esc(bn)}</div></div>`;
    championBar.classList.add('show');return;
  }
  const lose=rows.find(r=>r!==win),nameEl=win.querySelector('.bracket-team-name'),name=rowLabel(win),score=clean(win.querySelector('.bracket-score')?.textContent),opp=rowLabel(lose),oppScore=clean(lose?.querySelector('.bracket-score')?.textContent),href=nameEl?.getAttribute('href');
  const cs=getComputedStyle(win),bg=cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'?cs.backgroundColor:'#F14D07',fg=cs.color||'#fff';
  const count=titleCountThrough(name,yearSelect.value),titleNote=count?` • ${ordinal(count)} state championship`:'';
  championBar.style.borderLeftColor=bg;
  championBar.innerHTML=`<div><span class="bracket-champion-kicker">${esc(yearSelect.value)} ${esc(cls)} Champion</span><div class="bracket-champion-name" style="background:${bg};color:${fg};display:inline-block;padding:5px 9px;border-radius:5px">${href?`<a href="${esc(href)}">${esc(name)}</a>`:esc(name)}</div></div><div class="bracket-champion-result">Won ${esc(score)}–${esc(oppScore)} vs. ${esc(opp)}${esc(titleNote)}</div>`;
  championBar.classList.add('show');
}

function leaderTeamHTML(row){
  const t=state.teamMap.get(row.key)||state.teamMap.get(teamKey(row.name));
  if(!t)return esc(row.name);
  const bg=safeHex(t.backgroundColor,'#222222'),fg=safeHex(t.textColor,'#FFFFFF');
  return `<a href="team.html?team=${encodeURIComponent(t.team)}" style="display:inline-block;background:${bg};color:${fg};padding:4px 7px;border-radius:4px">${esc(row.name)}</a>`;
}

function renderLeaderboard(leaderControls,leaderList,leaderDecade,mode=state.leaderMode){
  state.leaderMode=mode;
  for(const b of leaderControls.querySelectorAll('.champ-leader-tab'))b.classList.toggle('active',b.dataset.mode===mode);
  leaderDecade.hidden=mode!=='decade';
  let rows=state.leaderRows.slice(),label='Titles',detail=r=>r.titles.length?`${r.titles[0]}–${r.titles[r.titles.length-1]}`:'',value=r=>r.titles.length;
  if(mode==='appearances'){
    label='Appearances';value=r=>r.appearances;detail=r=>`${r.titles.length} title${r.titles.length===1?'':'s'}`;
    rows.sort((a,b)=>b.appearances-a.appearances||b.titles.length-a.titles.length||a.name.localeCompare(b.name));
  }else if(mode==='runnerups'){
    label='Runner-Up';value=r=>r.runnerUps;detail=r=>`${r.appearances} title-game appearance${r.appearances===1?'':'s'}`;
    rows.sort((a,b)=>b.runnerUps-a.runnerUps||b.appearances-a.appearances||a.name.localeCompare(b.name));
  }else if(mode==='gaps'){
    label='Years';value=r=>r.maxGap;detail=r=>`${r.gapStart} to ${r.gapEnd} between titles`;
    rows=rows.filter(r=>r.maxGap>0).sort((a,b)=>b.maxGap-a.maxGap||a.name.localeCompare(b.name));
  }else if(mode==='decade'){
    const d=Number(leaderDecade.value);label='Titles';value=r=>r.titles.filter(y=>Math.floor(y/10)*10===d).length;detail=()=>`${d}s`;
    rows=rows.filter(r=>value(r)>0).sort((a,b)=>value(b)-value(a)||b.appearances-a.appearances||a.name.localeCompare(b.name));
  }else{
    rows.sort((a,b)=>b.titles.length-a.titles.length||b.appearances-a.appearances||a.name.localeCompare(b.name));
  }
  rows=rows.filter(r=>value(r)>0).slice(0,10);
  leaderList.innerHTML=rows.map((r,i)=>`<div class="champ-leader-row"><div class="champ-leader-rank">#${i+1}</div><div class="champ-leader-team">${leaderTeamHTML(r)}<span class="champ-leader-detail">${esc(detail(r))}</span></div><div class="champ-leader-value">${value(r)}<small>${esc(label)}</small></div></div>`).join('')||'<div class="bracket-loading">No leaderboard data is available.</div>';
}

async function buildLeaderboard(leaderControls,leaderList,leaderDecade,onLoaded){
  try{
    const stamp=Date.now(),[cr,tr]=await Promise.all([fetch('championships.json?v='+stamp),fetch('teams-data.json?v='+stamp)]);
    if(!cr.ok)throw new Error('Championship history unavailable');
    const entries=await cr.json();
    if(tr.ok){for(const t of await tr.json()){const key=teamKey(t.team);if(key)state.teamMap.set(key,t)}}
    const programs=new Map();
    const get=(key,name)=>{
      key=teamKey(key||name);if(!key)return null;
      if(!programs.has(key))programs.set(key,{key,name:clean(name||key),titles:[],runnerUps:0,appearances:0,maxGap:0,gapStart:null,gapEnd:null});
      const p=programs.get(key);if(name)p.name=clean(name);return p;
    };
    for(const e of entries){
      const y=Number(e.year);if(!Number.isFinite(y))continue;
      if(e.status==='championship'){
        const c=get(e.championKey,e.champion),r=get(e.runnerUpKey,e.runnerUp);
        if(c){c.titles.push(y);c.appearances++}if(r){r.runnerUps++;r.appearances++}
      }else if(e.status==='co-champions'){
        for(const c of e.coChampions||[]){const p=get(c.key,c.name);if(p){p.titles.push(y);p.appearances++}}
      }
    }
    state.leaderRows=[...programs.values()];
    for(const p of state.leaderRows){
      p.titles=[...new Set(p.titles)].sort((a,b)=>a-b);
      for(let i=1;i<p.titles.length;i++){
        const gap=p.titles[i]-p.titles[i-1];
        if(gap>p.maxGap){p.maxGap=gap;p.gapStart=p.titles[i-1];p.gapEnd=p.titles[i]}
      }
    }
    const decades=[...new Set(entries.filter(e=>e.status==='championship'||e.status==='co-champions').map(e=>Math.floor(Number(e.year)/10)*10).filter(Number.isFinite))].sort((a,b)=>b-a);
    leaderDecade.innerHTML=decades.map(d=>`<option value="${d}">${d}s</option>`).join('');
    renderLeaderboard(leaderControls,leaderList,leaderDecade,'titles');
    if(onLoaded)onLoaded();
  }catch(e){console.error(e);leaderList.innerHTML='<div class="bracket-loading">Championship leaderboards could not be loaded.</div>'}
}

async function waitFor(test,timeout=10000){
  const start=Date.now();
  while(Date.now()-start<timeout){if(test())return true;await sleep(50)}
  return false;
}

async function init(){
  const found=await waitFor(()=>document.querySelector('.bracket-test'));
  if(!found)return;
  const sec=document.querySelector('.bracket-test');
  if(sec.dataset.featuresReady)return;
  sec.dataset.featuresReady='1';addStyles();
  const yearSelect=sec.querySelector('#bracketYear'),tabs=sec.querySelector('#bracketTabs'),grid=sec.querySelector('#bracketGrid'),scroll=sec.querySelector('.bracket-scroll'),controls=sec.querySelector('.bracket-controls');
  if(!yearSelect||!tabs||!grid||!scroll||!controls)return;

  const wrap=document.createElement('div');wrap.className='bracket-year-wrap';wrap.innerHTML='<label for="bracketHighlight">Highlight Team</label><select id="bracketHighlight" class="bracket-year bracket-highlight-select"><option value="">No Highlight</option></select>';controls.appendChild(wrap);const highlightSelect=wrap.querySelector('select');
  const copy=document.createElement('button');copy.type='button';copy.className='bracket-copy';copy.textContent='Copy Bracket Link';controls.appendChild(copy);
  const championBar=document.createElement('div');championBar.className='bracket-champion-bar';scroll.before(championBar);
  const leaderSec=document.createElement('section');leaderSec.className='champ-leaders';leaderSec.innerHTML='<div class="champ-leader-head"><div><h3>Championship History Leaders</h3><p>All-time leaders calculated from the Rural Utah Sports Championship Log.</p></div><div class="champ-leader-controls"><button type="button" class="champ-leader-tab active" data-mode="titles">Titles</button><button type="button" class="champ-leader-tab" data-mode="appearances">Appearances</button><button type="button" class="champ-leader-tab" data-mode="runnerups">Runner-Up</button><button type="button" class="champ-leader-tab" data-mode="gaps">Longest Drought</button><button type="button" class="champ-leader-tab" data-mode="decade">By Decade</button><select class="champ-decade" hidden></select></div></div><div class="champ-leader-list"><div class="bracket-loading">Loading championship leaders…</div></div>';sec.after(leaderSec);
  const leaderControls=leaderSec.querySelector('.champ-leader-controls'),leaderList=leaderSec.querySelector('.champ-leader-list'),leaderDecade=leaderSec.querySelector('.champ-decade');

  let renderTimer=null;
  function sync(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(()=>{
      refreshHighlight(highlightSelect,grid);applyHighlight(grid);updateChampionBar(championBar,grid,tabs,yearSelect);updateURL(yearSelect,tabs,highlightSelect);
    },0);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(grid,{childList:true,subtree:true});observer.observe(tabs,{childList:true,subtree:true});

  yearSelect.addEventListener('change',()=>{state.highlight='';highlightSelect.value='';sync()});
  tabs.addEventListener('click',e=>{if(e.target.closest('.bracket-tab')){state.highlight='';highlightSelect.value='';sync()}});
  highlightSelect.addEventListener('change',()=>{state.highlight=teamKey(highlightSelect.value);applyHighlight(grid);updateURL(yearSelect,tabs,highlightSelect)});

  grid.addEventListener('click',e=>{
    const row=e.target.closest('.bracket-team');if(!row)return;
    const key=rowKey(row);if(!key)return;
    const anchor=e.target.closest('a'),mobile=matchMedia('(max-width:750px)').matches;
    if(mobile){
      if(state.highlight!==key){if(anchor)e.preventDefault();state.highlight=key;highlightSelect.value=key;applyHighlight(grid);updateURL(yearSelect,tabs,highlightSelect);return}
      if(anchor)return;
      state.highlight='';highlightSelect.value='';applyHighlight(grid);updateURL(yearSelect,tabs,highlightSelect);return;
    }
    if(anchor)return;
    state.highlight=state.highlight===key?'':key;highlightSelect.value=state.highlight;applyHighlight(grid);updateURL(yearSelect,tabs,highlightSelect);
  });

  copy.addEventListener('click',async()=>{
    updateURL(yearSelect,tabs,highlightSelect);const old=copy.textContent;
    try{await navigator.clipboard.writeText(location.href);copy.textContent='Copied!'}catch(e){copy.textContent='Link Ready'}
    setTimeout(()=>copy.textContent=old,1200);
  });
  leaderControls.addEventListener('click',e=>{const b=e.target.closest('.champ-leader-tab');if(b)renderLeaderboard(leaderControls,leaderList,leaderDecade,b.dataset.mode)});
  leaderDecade.addEventListener('change',()=>renderLeaderboard(leaderControls,leaderList,leaderDecade,'decade'));

  buildLeaderboard(leaderControls,leaderList,leaderDecade,()=>updateChampionBar(championBar,grid,tabs,yearSelect));

  const params=new URLSearchParams(location.search),requestedYear=params.get('year'),requestedClass=params.get('class'),requestedTeam=params.get('team');
  await waitFor(()=>tabs.querySelector('.bracket-tab')&&!grid.querySelector('.bracket-loading'));

  if(requestedYear&&[...yearSelect.options].some(o=>o.value===requestedYear)&&yearSelect.value!==requestedYear){
    yearSelect.value=requestedYear;yearSelect.dispatchEvent(new Event('change',{bubbles:true}));
    await waitFor(()=>yearSelect.value===requestedYear&&tabs.querySelector('.bracket-tab')&&!grid.querySelector('.bracket-loading'));
  }
  if(requestedClass){
    const target=[...tabs.querySelectorAll('.bracket-tab')].find(b=>clean(b.dataset.cls||b.textContent)===clean(requestedClass));
    if(target&&!target.classList.contains('active')){target.click();await sleep(0)}
  }

  const teams=refreshHighlight(highlightSelect,grid);
  if(requestedTeam){const key=teamKey(requestedTeam);if(teams.has(key)){state.highlight=key;highlightSelect.value=key}}
  state.initializing=false;
  applyHighlight(grid);updateChampionBar(championBar,grid,tabs,yearSelect);updateURL(yearSelect,tabs,highlightSelect);
}

init();
})();