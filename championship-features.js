(()=>{
const norm=v=>String(v??'').trim().toUpperCase().replace(/^#\d+\s*/,'').replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const safeHex=(v,f)=>/^#[0-9A-F]{6}$/i.test(clean(v))?clean(v):f;
const state={highlight:'',requestedClass:'',requestedTeam:'',leaderMode:'titles',leaderRows:[],teamMap:new Map()};

function addStyles(){
  if(document.getElementById('rus-champ-features-style'))return;
  const s=document.createElement('style');s.id='rus-champ-features-style';s.textContent=`
  .bracket-highlight-select{min-width:170px}.bracket-copy{height:38px;border:1px solid #555;background:#222;color:#fff;border-radius:5px;padding:0 12px;font-weight:900;cursor:pointer}.bracket-copy:hover{border-color:#F14D07;color:#F14D07}
  .bracket-champion-bar{display:none;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;background:#050505;border:1px solid #333;border-left:5px solid #F14D07;border-radius:7px;padding:13px 15px;margin-bottom:12px}.bracket-champion-bar.show{display:flex}.bracket-champion-kicker{display:block;color:#F14D07;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.bracket-champion-name{font-size:20px;font-weight:900}.bracket-champion-name a{color:inherit;text-decoration:none}.bracket-champion-result{color:#aaa;font-size:12px;font-weight:800}
  .bracket-team{cursor:pointer;transition:opacity .15s ease,filter .15s ease,box-shadow .15s ease}.bracket-grid.has-team-highlight .bracket-game{opacity:.18;filter:saturate(.25);transition:opacity .15s ease,filter .15s ease}.bracket-grid.has-team-highlight .bracket-game.path-game{opacity:1;filter:none;box-shadow:0 0 0 1px rgba(241,77,7,.55)}.bracket-grid.has-team-highlight .bracket-game.path-game .bracket-team:not(.path-team){filter:saturate(.35) brightness(.62)}.bracket-team.path-team{box-shadow:inset 0 0 0 2px #fff!important}
  .champ-leaders{margin-top:34px;border-top:4px solid #F14D07;padding-top:24px}.champ-leader-head{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}.champ-leader-head h3{font-size:25px;text-transform:uppercase}.champ-leader-head p{color:#999;font-size:13px;margin-top:5px}.champ-leader-controls{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.champ-leader-tab{border:1px solid #444;background:#191919;color:#fff;padding:8px 10px;border-radius:5px;font-weight:900;cursor:pointer}.champ-leader-tab.active{background:#F14D07;color:#000;border-color:#F14D07}.champ-decade{height:35px;background:#191919;color:#fff;border:1px solid #444;border-radius:5px;padding:0 8px;font-weight:900}.champ-leader-list{background:#090909;border:1px solid #333;border-radius:8px;overflow:hidden}.champ-leader-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 14px;border-bottom:1px solid #292929}.champ-leader-row:last-child{border-bottom:0}.champ-leader-rank{color:#777;font-size:12px;font-weight:900}.champ-leader-team{font-weight:900;min-width:0}.champ-leader-team a{color:inherit;text-decoration:none}.champ-leader-detail{display:block;color:#777;font-size:10px;font-weight:700;margin-top:2px}.champ-leader-value{font-size:19px;font-weight:900;color:#F14D07;text-align:right}.champ-leader-value small{display:block;color:#777;font-size:9px;text-transform:uppercase;margin-top:2px}
  @media(max-width:600px){.bracket-copy{width:100%}.bracket-highlight-select{width:100%}.bracket-champion-name{font-size:17px}.champ-leader-row{grid-template-columns:30px minmax(0,1fr) auto;padding:10px}.champ-leader-head h3{font-size:21px}}
  `;document.head.appendChild(s);
}

function activeClass(tabs){return clean(tabs.querySelector('.bracket-tab.active')?.textContent)}
function rowKey(row){return norm(row.querySelector('.bracket-team-name')?.textContent||'')}
function updateURL(yearSelect,tabs){
  const p=new URLSearchParams();p.set('year',yearSelect.value);
  const cls=state.requestedClass||activeClass(tabs);if(cls)p.set('class',cls);
  const team=state.requestedTeam||state.highlight;if(team)p.set('team',team);
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
  const teams=new Map();for(const row of grid.querySelectorAll('.bracket-team')){const key=rowKey(row),label=clean(row.querySelector('.bracket-team-name')?.textContent);if(key&&label&&!teams.has(key))teams.set(key,label)}
  highlightSelect.innerHTML='<option value="">No Highlight</option>'+[...teams.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>`<option value="${esc(k)}">${esc(n)}</option>`).join('');
  if(state.requestedTeam&&teams.has(state.requestedTeam)){state.highlight=state.requestedTeam;state.requestedTeam=''}
  if(state.highlight&&teams.has(state.highlight))highlightSelect.value=state.highlight;else{state.highlight='';highlightSelect.value=''}
}
function updateChampionBar(championBar,grid,tabs,yearSelect){
  const rounds=[...grid.querySelectorAll('.bracket-round')],last=rounds[rounds.length-1],game=last?.querySelector('.bracket-game');if(!game){championBar.classList.remove('show');return}
  const rows=[...game.querySelectorAll('.bracket-team')],win=rows.find(r=>r.classList.contains('win')),cls=activeClass(tabs);if(!rows.length){championBar.classList.remove('show');return}
  if(!win){const a=rows[0],b=rows[1],an=clean(a?.querySelector('.bracket-team-name')?.textContent),bn=clean(b?.querySelector('.bracket-team-name')?.textContent),as=clean(a?.querySelector('.bracket-score')?.textContent),bs=clean(b?.querySelector('.bracket-score')?.textContent);championBar.style.borderLeftColor='#F14D07';championBar.innerHTML=`<div><span class="bracket-champion-kicker">${esc(yearSelect.value)} ${esc(cls)} Championship</span><div class="bracket-champion-name">${esc(an)} ${esc(as)} – ${esc(bs)} ${esc(bn)}</div></div>`;championBar.classList.add('show');return}
  const lose=rows.find(r=>r!==win),nameEl=win.querySelector('.bracket-team-name'),name=clean(nameEl?.textContent),score=clean(win.querySelector('.bracket-score')?.textContent),opp=clean(lose?.querySelector('.bracket-team-name')?.textContent),oppScore=clean(lose?.querySelector('.bracket-score')?.textContent),href=nameEl?.getAttribute('href');
  const cs=getComputedStyle(win),bg=cs.backgroundColor||'#F14D07',fg=cs.color||'#fff';championBar.style.borderLeftColor=bg;
  championBar.innerHTML=`<div><span class="bracket-champion-kicker">${esc(yearSelect.value)} ${esc(cls)} Champion</span><div class="bracket-champion-name" style="background:${bg};color:${fg};display:inline-block;padding:5px 9px;border-radius:5px">${href?`<a href="${esc(href)}">${esc(name)}</a>`:esc(name)}</div></div><div class="bracket-champion-result">Won ${esc(score)}–${esc(oppScore)} vs. ${esc(opp)}</div>`;championBar.classList.add('show');
}

function leaderTeamHTML(row){
  const t=state.teamMap.get(norm(row.key))||state.teamMap.get(norm(row.name));if(!t)return esc(row.name);
  const bg=safeHex(t.backgroundColor,'#222222'),fg=safeHex(t.textColor,'#FFFFFF');return `<a href="team.html?team=${encodeURIComponent(t.team)}" style="display:inline-block;background:${bg};color:${fg};padding:4px 7px;border-radius:4px">${esc(row.name)}</a>`
}
function renderLeaderboard(leaderControls,leaderList,leaderDecade,mode=state.leaderMode){
  state.leaderMode=mode;for(const b of leaderControls.querySelectorAll('.champ-leader-tab'))b.classList.toggle('active',b.dataset.mode===mode);leaderDecade.hidden=mode!=='decade';
  let rows=state.leaderRows.slice(),label='Titles',detail=r=>r.titles.length?`${r.titles[0]}–${r.titles[r.titles.length-1]}`:'',value=r=>r.titles.length;
  if(mode==='appearances'){label='Appearances';rows.sort((a,b)=>b.appearances-a.appearances||b.titles.length-a.titles.length||a.name.localeCompare(b.name));detail=r=>`${r.titles.length} title${r.titles.length===1?'':'s'}`;value=r=>r.appearances}
  else if(mode==='runnerups'){label='Runner-Up';rows.sort((a,b)=>b.runnerUps-a.runnerUps||b.appearances-a.appearances||a.name.localeCompare(b.name));detail=r=>`${r.appearances} title-game appearance${r.appearances===1?'':'s'}`;value=r=>r.runnerUps}
  else if(mode==='gaps'){label='Years';rows=rows.filter(r=>r.maxGap>0).sort((a,b)=>b.maxGap-a.maxGap||a.name.localeCompare(b.name));detail=r=>`${r.gapStart} to ${r.gapEnd} between titles`;value=r=>r.maxGap}
  else if(mode==='decade'){const d=Number(leaderDecade.value);label='Titles';rows=rows.map(r=>({...r,decadeTitles:r.titles.filter(y=>Math.floor(y/10)*10===d).length})).filter(r=>r.decadeTitles).sort((a,b)=>b.decadeTitles-a.decadeTitles||a.name.localeCompare(b.name));detail=()=>`${d}s`;value=r=>r.decadeTitles}
  else rows.sort((a,b)=>b.titles.length-a.titles.length||b.appearances-a.appearances||a.name.localeCompare(b.name));
  rows=rows.filter(r=>value(r)>0).slice(0,10);leaderList.innerHTML=rows.map((r,i)=>`<div class="champ-leader-row"><div class="champ-leader-rank">#${i+1}</div><div class="champ-leader-team">${leaderTeamHTML(r)}<span class="champ-leader-detail">${esc(detail(r))}</span></div><div class="champ-leader-value">${value(r)}<small>${esc(label)}</small></div></div>`).join('')||'<div class="bracket-loading">No leaderboard data is available.</div>';
}
async function buildLeaderboard(leaderControls,leaderList,leaderDecade){
  try{
    const stamp=Date.now(),[cr,tr]=await Promise.all([fetch('championships.json?v='+stamp),fetch('teams-data.json?v='+stamp)]);if(!cr.ok)throw new Error('Championship history unavailable');
    const entries=await cr.json();if(tr.ok){for(const t of await tr.json())state.teamMap.set(norm(t.team),t)}
    const programs=new Map();const get=(key,name)=>{key=norm(key||name);if(!programs.has(key))programs.set(key,{key,name:clean(name||key),titles:[],runnerUps:0,appearances:0,maxGap:0,gapStart:null,gapEnd:null});const p=programs.get(key);if(name)p.name=clean(name);return p};
    for(const e of entries){const y=Number(e.year);if(!Number.isFinite(y))continue;if(e.status==='championship'){const c=get(e.championKey,e.champion),r=get(e.runnerUpKey,e.runnerUp);c.titles.push(y);c.appearances++;r.runnerUps++;r.appearances++}else if(e.status==='co-champions'){for(const c of e.coChampions||[]){const p=get(c.key,c.name);p.titles.push(y);p.appearances++}}}
    state.leaderRows=[...programs.values()];for(const p of state.leaderRows){p.titles=[...new Set(p.titles)].sort((a,b)=>a-b);for(let i=1;i<p.titles.length;i++){const gap=p.titles[i]-p.titles[i-1];if(gap>p.maxGap){p.maxGap=gap;p.gapStart=p.titles[i-1];p.gapEnd=p.titles[i]}}}
    const decades=[...new Set(entries.map(e=>Math.floor(Number(e.year)/10)*10).filter(Number.isFinite))].sort((a,b)=>b-a);leaderDecade.innerHTML=decades.map(d=>`<option value="${d}">${d}s</option>`).join('');renderLeaderboard(leaderControls,leaderList,leaderDecade,'titles');
  }catch(e){console.error(e);leaderList.innerHTML='<div class="bracket-loading">Championship leaderboards could not be loaded.</div>'}
}

function init(){
  const sec=document.querySelector('.bracket-test');if(!sec){setTimeout(init,80);return}if(sec.dataset.featuresReady)return;sec.dataset.featuresReady='1';addStyles();
  const yearSelect=sec.querySelector('#bracketYear'),tabs=sec.querySelector('#bracketTabs'),grid=sec.querySelector('#bracketGrid'),scroll=sec.querySelector('.bracket-scroll'),controls=sec.querySelector('.bracket-controls');if(!yearSelect||!tabs||!grid||!controls)return;
  const wrap=document.createElement('div');wrap.className='bracket-year-wrap';wrap.innerHTML='<label for="bracketHighlight">Highlight Team</label><select id="bracketHighlight" class="bracket-year bracket-highlight-select"><option value="">No Highlight</option></select>';controls.appendChild(wrap);const highlightSelect=wrap.querySelector('select');
  const copy=document.createElement('button');copy.type='button';copy.className='bracket-copy';copy.textContent='Copy Bracket Link';controls.appendChild(copy);
  const championBar=document.createElement('div');championBar.className='bracket-champion-bar';scroll.before(championBar);
  const leaderSec=document.createElement('section');leaderSec.className='champ-leaders';leaderSec.innerHTML='<div class="champ-leader-head"><div><h3>Championship History Leaders</h3><p>All-time leaders calculated from the Rural Utah Sports Championship Log.</p></div><div class="champ-leader-controls"><button type="button" class="champ-leader-tab active" data-mode="titles">Titles</button><button type="button" class="champ-leader-tab" data-mode="appearances">Appearances</button><button type="button" class="champ-leader-tab" data-mode="runnerups">Runner-Up</button><button type="button" class="champ-leader-tab" data-mode="gaps">Title Gaps</button><button type="button" class="champ-leader-tab" data-mode="decade">By Decade</button><select class="champ-decade" hidden></select></div></div><div class="champ-leader-list"><div class="bracket-loading">Loading championship leaders…</div></div>';sec.after(leaderSec);
  const leaderControls=leaderSec.querySelector('.champ-leader-controls'),leaderList=leaderSec.querySelector('.champ-leader-list'),leaderDecade=leaderSec.querySelector('.champ-decade');
  const params=new URLSearchParams(location.search);const requestedYear=params.get('year'),requestedClass=params.get('class'),requestedTeam=params.get('team');state.requestedClass=clean(requestedClass);state.requestedTeam=norm(requestedTeam);
  function onRender(){
    if(state.requestedClass){const target=[...tabs.querySelectorAll('.bracket-tab')].find(b=>clean(b.textContent)===state.requestedClass);if(target&&!target.classList.contains('active')){state.requestedClass='';target.click();return}if(target)state.requestedClass=''}
    refreshHighlight(highlightSelect,grid);applyHighlight(grid);updateChampionBar(championBar,grid,tabs,yearSelect);updateURL(yearSelect,tabs);
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(onRender));observer.observe(grid,{childList:true,subtree:true});observer.observe(tabs,{childList:true,subtree:true});
  yearSelect.addEventListener('change',()=>{state.highlight='';highlightSelect.value='';setTimeout(onRender,0)});tabs.addEventListener('click',e=>{if(e.target.closest('.bracket-tab')){state.highlight='';highlightSelect.value='';setTimeout(onRender,0)}});
  highlightSelect.addEventListener('change',()=>{state.highlight=norm(highlightSelect.value);applyHighlight(grid);updateURL(yearSelect,tabs)});
  grid.addEventListener('click',e=>{if(e.target.closest('a'))return;const row=e.target.closest('.bracket-team');if(!row)return;const k=rowKey(row);state.highlight=state.highlight===k?'':k;highlightSelect.value=state.highlight;applyHighlight(grid);updateURL(yearSelect,tabs)});
  copy.addEventListener('click',async()=>{updateURL(yearSelect,tabs);const old=copy.textContent;try{await navigator.clipboard.writeText(location.href);copy.textContent='Copied!'}catch(e){copy.textContent='Link Ready'}setTimeout(()=>copy.textContent=old,1200)});
  leaderControls.addEventListener('click',e=>{const b=e.target.closest('.champ-leader-tab');if(b)renderLeaderboard(leaderControls,leaderList,leaderDecade,b.dataset.mode)});leaderDecade.addEventListener('change',()=>renderLeaderboard(leaderControls,leaderList,leaderDecade,'decade'));
  buildLeaderboard(leaderControls,leaderList,leaderDecade);
  if(requestedYear&&[...yearSelect.options].some(o=>o.value===requestedYear)&&yearSelect.value!==requestedYear){yearSelect.value=requestedYear;yearSelect.dispatchEvent(new Event('change',{bubbles:true}))}else setTimeout(onRender,0);
}
init();
})();
