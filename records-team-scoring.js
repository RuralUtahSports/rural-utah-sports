(()=>{
'use strict';
if(window.__RUS_TEAM_SCORING_RECORDS__)return;window.__RUS_TEAM_SCORING_RECORDS__=true;

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const safeHex=(v,fallback)=>/^#[0-9A-F]{6}$/i.test(clean(v))?clean(v):fallback;
let data=null,teamMap=new Map();

const categories={
  quarter:[
    {key:'pointsScored',label:'Points Scored'},
    {key:'pointsAllowed',label:'Points Allowed'},
    {key:'combinedPoints',label:'Combined Points'}
  ],
  half:[
    {key:'pointsScored',label:'Points Scored'},
    {key:'pointsAllowed',label:'Points Allowed'},
    {key:'combinedPoints',label:'Combined Points'}
  ],
  game:[
    {key:'pointsScored',label:'Points Scored'},
    {key:'pointsAllowed',label:'Points Allowed'},
    {key:'combinedPoints',label:'Combined Points'},
    {key:'marginVictory',label:'Margin of Victory'},
    {key:'marginDefeat',label:'Margin of Defeat'}
  ]
};
const segments={
  quarter:[
    {key:'ANY',label:'Any Quarter'},
    {key:'Q1',label:'1st Quarter'},
    {key:'Q2',label:'2nd Quarter'},
    {key:'Q3',label:'3rd Quarter'},
    {key:'Q4',label:'4th Quarter'}
  ],
  half:[
    {key:'ANY',label:'Any Half'},
    {key:'H1',label:'1st Half'},
    {key:'H2',label:'2nd Half'}
  ],
  game:[{key:'GAME',label:'Full Game'}]
};

function addStyles(){
  if(document.getElementById('rus-team-scoring-style'))return;
  const s=document.createElement('style');
  s.id='rus-team-scoring-style';
  s.textContent=`
.rus-tsr{margin-top:20px;background:#050505;border:1px solid #333;border-radius:10px;overflow:hidden}
.rus-tsr-head{padding:20px;border-bottom:1px solid #333}.rus-tsr-head h3{font-size:25px;text-transform:uppercase}.rus-tsr-head p{margin-top:7px;color:#999;font-size:12px;line-height:1.5;max-width:900px}
.rus-tsr-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:16px 20px;background:#0b0b0b;border-bottom:1px solid #2b2b2b}
.rus-tsr-control{display:flex;flex-direction:column;gap:6px}.rus-tsr-control label{font-size:10px;color:#888;font-weight:900;text-transform:uppercase}
.rus-tsr-control select,.rus-tsr-control input{height:44px;background:#1b1b1b;border:1px solid #444;color:#fff;border-radius:7px;padding:0 11px}
.rus-tsr-wrap{overflow:auto;max-height:760px}.rus-tsr-table{width:100%;min-width:820px;border-collapse:collapse}.rus-tsr-table thead{position:sticky;top:0;z-index:2}
.rus-tsr-table th{background:#F14D07;color:#000;padding:11px 9px;font-size:10px;text-transform:uppercase;text-align:left}.rus-tsr-table th:first-child,.rus-tsr-table th:nth-child(4){text-align:center}
.rus-tsr-table td{padding:10px 9px;border-bottom:1px solid #252525;vertical-align:middle}.rus-tsr-table tbody tr:hover{background:#151515}
.rus-tsr-rank{width:58px;text-align:center;color:#F14D07;font-size:18px;font-weight:900}.rus-tsr-team a{color:inherit;text-decoration:none;font-weight:900}.rus-tsr-team a:hover{filter:brightness(1.12)}
.rus-tsr-team-badge,.rus-tsr-opponent-badge{display:inline-flex;align-items:center;gap:8px;min-width:170px;padding:7px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}.rus-tsr-opponent-badge{min-width:145px;padding:6px 8px;font-size:11px}.rus-tsr-logo{width:32px;height:32px;flex:0 0 32px;object-fit:contain;background:rgba(255,255,255,.14);border-radius:50%;padding:3px}.rus-tsr-opponent-badge .rus-tsr-logo{width:25px;height:25px;flex-basis:25px;padding:2px}.rus-tsr-badge-name{min-width:0;line-height:1.1}.rus-tsr-badge-name strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rus-tsr-meta{margin-top:4px;color:#8f8f8f;font-size:10px;font-weight:800;white-space:nowrap}.rus-tsr-record{color:#fff}
.rus-tsr-value{text-align:center;color:#F14D07;font-size:22px;font-weight:900}.rus-tsr-game{font-size:11px;line-height:1.45;color:#aaa;min-width:250px}.rus-tsr-game strong{display:block;color:#fff}.rus-tsr-game span{display:block;margin-top:2px}
.rus-tsr-source{padding:13px 20px;color:#777;font-size:11px;line-height:1.5;border-top:1px solid #222}.rus-tsr-empty{padding:45px;text-align:center;color:#999}
@media(max-width:900px){.rus-tsr-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.rus-tsr-head{padding:16px}.rus-tsr-controls{grid-template-columns:1fr;padding:12px}.rus-tsr-wrap{max-height:620px}.rus-tsr-table{min-width:760px}.rus-tsr-team-badge{min-width:160px}.rus-tsr-logo{width:30px;height:30px;flex-basis:30px}}
`;
  document.head.appendChild(s);
}

function valueFor(e,category){
  if(category==='pointsScored')return Number(e.teamPoints);
  if(category==='pointsAllowed')return Number(e.opponentPoints);
  if(category==='combinedPoints')return Number(e.combinedPoints);
  if(category==='marginVictory')return e.result==='W'&&Number.isFinite(Number(e.teamScore))&&Number.isFinite(Number(e.opponentScore))?Number(e.teamScore)-Number(e.opponentScore):null;
  if(category==='marginDefeat')return e.result==='L'&&Number.isFinite(Number(e.teamScore))&&Number.isFinite(Number(e.opponentScore))?Number(e.opponentScore)-Number(e.teamScore):null;
  return null;
}

function teamInfo(name){return teamMap.get(norm(name))||null}
function logoUrl(name){try{return window.RUSSchoolAssets?.logoUrl?.(name)||''}catch{return''}}
function teamBadge(e){
  const info=teamInfo(e.team),bg=safeHex(info?.backgroundColor,'#222222'),fg=safeHex(info?.textColor,'#FFFFFF'),logo=logoUrl(e.team);
  return `<a class="rus-tsr-team-badge" style="background:${bg};color:${fg}" href="team.html?team=${encodeURIComponent(e.team)}&tab=games">${logo?`<img class="rus-tsr-logo" src="${esc(logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`:''}<span class="rus-tsr-badge-name"><strong>${esc(e.team)}</strong><span class="rus-tsr-meta">${esc(e.classification||'')}${clean(e.record)?` • <span class="rus-tsr-record">${esc(e.record)}</span>`:''}</span></span></a>`;
}
function opponentBadge(name){
  const info=teamInfo(name),bg=safeHex(info?.backgroundColor,'#1f1f1f'),fg=safeHex(info?.textColor,'#FFFFFF'),logo=logoUrl(name);
  return `<span class="rus-tsr-opponent-badge" style="background:${bg};color:${fg}">${logo?`<img class="rus-tsr-logo" src="${esc(logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`:''}<span class="rus-tsr-badge-name"><strong>${esc(name||'—')}</strong></span></span>`;
}

function gameContext(e,type){
  const score=Number.isFinite(Number(e.teamScore))&&Number.isFinite(Number(e.opponentScore))?`${e.result||''} ${e.teamScore}–${e.opponentScore}`.trim():'Final score unavailable';
  if(type==='quarter'){
    const label=e.segment==='Q1'?'1st Quarter':e.segment==='Q2'?'2nd Quarter':e.segment==='Q3'?'3rd Quarter':'4th Quarter';
    return {strong:`${label}: ${e.teamPoints}–${e.opponentPoints} vs ${e.opponent||'—'}`,sub:`${score} • ${e.date||e.season}`};
  }
  if(type==='half'){
    const label=e.segment==='H1'?'1st Half':'2nd Half';
    return {strong:`${label}: ${e.teamPoints}–${e.opponentPoints} vs ${e.opponent||'—'}`,sub:`${score} • ${e.date||e.season}`};
  }
  return {strong:`${score} vs ${e.opponent||'—'}`,sub:clean(e.date||e.season)};
}

function buildOptions(id,rows,selected){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=rows.map(r=>`<option value="${esc(r.key)}">${esc(r.label)}</option>`).join('');
  if(rows.some(r=>r.key===selected))el.value=selected;
}

function syncControls(){
  const type=document.getElementById('rusTsrType')?.value||'game';
  const currentCategory=document.getElementById('rusTsrCategory')?.value||'pointsScored';
  const currentSegment=document.getElementById('rusTsrSegment')?.value||segments[type][0].key;
  buildOptions('rusTsrCategory',categories[type],currentCategory);
  buildOptions('rusTsrSegment',segments[type],currentSegment);
}

function sourceRows(){
  if(!data)return[];
  const view=document.getElementById('rusTsrView')?.value||'2026';
  const type=document.getElementById('rusTsrType')?.value||'game';
  return view==='2026'?(data.current?.[type]||[]):(data.records?.[type]||[]);
}

function rankRows(rows,category,segment){
  const filtered=rows
    .filter(e=>segment==='ANY'||e.segment===segment)
    .map(e=>({...e,__value:valueFor(e,category)}))
    .filter(e=>Number.isFinite(e.__value))
    .sort((a,b)=>b.__value-a.__value||Date.parse(b.date)-Date.parse(a.date)||clean(a.team).localeCompare(clean(b.team)));
  let last=null,rank=0;
  return filtered.map((e,index)=>{
    if(last===null||e.__value!==last){rank=index+1;last=e.__value}
    return {...e,__rank:rank};
  });
}

function statusText(view,type,shown,total){
  if(view==='2026')return `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} ranked 2026 team performances. Overall statewide ranks stay the same while filtering.`;
  if(type==='game')return `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} record-book candidates from 2001–present. Overall statewide ranks stay the same while filtering.`;
  const a=data?.coverage?.quarterHalfStartYear,b=data?.coverage?.quarterHalfEndYear;
  const years=a&&b?(a===b?String(a):`${a}–${b}`):'available seasons';
  return `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} reported ${type} record candidates from ${years}. Only games with usable scoring splits are included.`;
}

function render(){
  if(!data)return;
  syncControls();
  const type=document.getElementById('rusTsrType')?.value||'game';
  const category=document.getElementById('rusTsrCategory')?.value||'pointsScored';
  const segment=document.getElementById('rusTsrSegment')?.value||segments[type][0].key;
  const view=document.getElementById('rusTsrView')?.value||'2026';
  const cls=clean(document.getElementById('rusTsrClass')?.value||'all');
  const q=norm(document.getElementById('rusTsrSearch')?.value||'');
  const ranked=rankRows(sourceRows(),category,segment);
  const visible=ranked.filter(e=>(cls==='all'||clean(e.classification)===cls)&&(!q||norm(e.team).includes(q)||norm(e.opponent).includes(q))).slice(0,100);
  const body=document.getElementById('rusTsrBody');
  if(!body)return;
  if(!visible.length){
    body.innerHTML='<tr><td colspan="5"><div class="rus-tsr-empty">No scoring performances match this filter.</div></td></tr>';
  }else{
    body.innerHTML=visible.map(e=>{
      const ctx=gameContext(e,type);
      return `<tr><td class="rus-tsr-rank">#${e.__rank}</td><td class="rus-tsr-team">${teamBadge(e)}</td><td>${opponentBadge(e.opponent||'—')}</td><td class="rus-tsr-value">${Number(e.__value).toLocaleString()}</td><td class="rus-tsr-game"><strong>${esc(ctx.strong)}</strong><span>${esc(ctx.sub)}</span></td></tr>`;
    }).join('');
  }
  const status=document.getElementById('rusTsrStatus');
  if(status)status.textContent=statusText(view,type,visible.length,ranked.length);
}

function populateClasses(){
  const select=document.getElementById('rusTsrClass');if(!select)return;
  const rows=[...(data?.current?.game||[]),...(data?.records?.game||[])];
  const classes=[...new Set(rows.map(e=>clean(e.classification)).filter(Boolean))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
  select.insertAdjacentHTML('beforeend',classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''));
}

async function install(){
  addStyles();
  const anchor=document.getElementById('rusPlayerSingleGame')||document.getElementById('singleGameRecords')||document.getElementById('rivalryRecords');
  if(!anchor||document.getElementById('rusTeamScoringRecords'))return;
  const section=document.createElement('section');
  section.id='rusTeamScoringRecords';section.className='rus-tsr';
  section.innerHTML=`
    <div class="rus-tsr-head"><h3>Team Scoring Leaders & Records</h3><p>Track the biggest team scoring performances by quarter, half and full game. Current-season leaders use verified 2026 finals; the record view uses 2001-present full-game results and every reported quarter-by-quarter split available in the RUS data.</p></div>
    <div class="rus-tsr-controls">
      <div class="rus-tsr-control"><label for="rusTsrType">Record Type</label><select id="rusTsrType"><option value="quarter">Quarter</option><option value="half">Half</option><option value="game" selected>Game</option></select></div>
      <div class="rus-tsr-control"><label for="rusTsrCategory">Scoring Category</label><select id="rusTsrCategory"></select></div>
      <div class="rus-tsr-control"><label for="rusTsrSegment">Segment</label><select id="rusTsrSegment"></select></div>
      <div class="rus-tsr-control"><label for="rusTsrView">View</label><select id="rusTsrView"><option value="2026">2026 Leaders</option><option value="records">Record Book</option></select></div>
      <div class="rus-tsr-control"><label for="rusTsrClass">Current Classification</label><select id="rusTsrClass"><option value="all">All Classes</option></select></div>
      <div class="rus-tsr-control"><label for="rusTsrSearch">Team / Opponent</label><input id="rusTsrSearch" type="search" placeholder="Search..."></div>
    </div>
    <div class="rus-tsr-wrap"><table class="rus-tsr-table"><thead><tr><th>Rank</th><th>Team / Record</th><th>Opponent</th><th>Points</th><th>Game</th></tr></thead><tbody id="rusTsrBody"><tr><td colspan="5"><div class="rus-tsr-empty">Loading team scoring records…</div></td></tr></tbody></table></div>
    <div class="rus-tsr-source" id="rusTsrStatus">Loading quarter, half and game scoring data…</div>
  `;
  anchor.insertAdjacentElement('afterend',section);
  syncControls();

  try{
    const stamp=Date.now();
    const [r,tr]=await Promise.all([fetch(`team-scoring-records.json?v=${stamp}`,{cache:'no-store'}),fetch(`teams-data.json?v=${stamp}`,{cache:'no-store'})]);
    if(!r.ok)throw new Error('team scoring records '+r.status);
    data=await r.json();
    const teams=tr.ok?await tr.json():[];
    teamMap=new Map((teams||[]).map(team=>[norm(team.team),team]));
    try{if(window.RUSSchoolAssets?.load)await window.RUSSchoolAssets.load()}catch{}
    populateClasses();
    for(const id of ['rusTsrType','rusTsrCategory','rusTsrSegment','rusTsrView','rusTsrClass']){
      document.getElementById(id)?.addEventListener('change',()=>{
        if(id==='rusTsrType')syncControls();
        render();
      });
    }
    document.getElementById('rusTsrSearch')?.addEventListener('input',render);
    window.addEventListener('rus:school-assets-ready',async()=>{try{await window.RUSSchoolAssets?.load?.()}catch{}render()},{once:true});
    render();
  }catch(error){
    console.error('Team scoring records:',error);
    document.getElementById('rusTsrBody').innerHTML='<tr><td colspan="5"><div class="rus-tsr-empty">Team scoring record data is being generated. Try again shortly.</div></td></tr>';
    document.getElementById('rusTsrStatus').textContent='The scoring record feed is not available yet.';
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();