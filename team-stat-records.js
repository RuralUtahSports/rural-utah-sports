(()=>{
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const slug=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function styles(){if(document.getElementById('rus-team-stat-records-style'))return;const s=document.createElement('style');s.id='rus-team-stat-records-style';s.textContent=`.rus-team-stat-records-section{margin-top:0}.rus-team-stat-records-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px}.rus-team-stat-records-head h2{font-size:27px;text-transform:uppercase;border-left:6px solid #F14D07;padding-left:14px}.rus-team-stat-records-head p{color:#999;font-size:13px;max-width:760px;line-height:1.5}.rus-team-stat-records-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.rus-team-stat-record-card{min-width:0;background:#080808;border:1px solid #333;border-radius:8px;overflow:hidden}.rus-team-stat-record-card h3{background:#171717;border-bottom:3px solid #F14D07;padding:14px 16px;font-size:15px;text-transform:uppercase}.rus-team-stat-record-wrap{overflow:auto;max-height:440px}.rus-team-stat-record-wrap table{min-width:500px}.rus-team-stat-record-wrap th{position:sticky;top:0;z-index:2}.rus-team-stat-record-rank{color:#777;width:48px}.rus-team-stat-record-value{color:#F14D07;font-weight:900}.rus-team-stat-record-game{color:#aaa;font-size:11px;line-height:1.35;white-space:normal;min-width:190px}.rus-team-stat-record-game a{color:#ddd;text-decoration:none;font-weight:800}.rus-team-stat-record-game a:hover{color:#F14D07}.rus-team-stat-records-source{margin-top:16px;background:#111;border:1px solid #333;border-radius:7px;padding:13px 15px;color:#999;font-size:12px;line-height:1.5}.rus-felt-scope{margin:18px 0 24px}.rus-felt-scope .rus-season-scoring-title{margin:0 0 14px}.rus-felt-records>.rus-team-stat-records-source{margin-bottom:16px}.rus-team-stat-records-section>.rus-season-scoring-title{margin-top:24px}.rus-felt-records .rus-team-stat-record-wrap table{min-width:430px}.rus-team-stat-records-empty{background:#090909;border:1px solid #333;border-radius:8px;color:#999;padding:32px 24px;text-align:center;line-height:1.55}.rus-team-stat-records-empty strong{display:block;color:#fff;font-size:16px;margin-bottom:7px}.rus-team-stat-records-empty span{display:block;max-width:680px;margin:0 auto}.rus-season-scoring{margin:0 0 22px;background:#050505;border:1px solid #333;border-radius:8px;padding:16px}.rus-season-scoring-title{font-size:18px;text-transform:uppercase;border-left:5px solid #F14D07;padding-left:11px;margin:0 0 5px}.rus-season-scoring-note{font-size:11px;color:#888;line-height:1.5;margin:0 0 12px}.rus-season-scoring-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.rus-season-scoring-card{background:#111;border:1px solid #303030;border-radius:7px;padding:12px;min-width:0}.rus-season-scoring-card h4{font-size:11px;text-transform:uppercase;color:#aaa;margin:0 0 9px}.rus-season-scoring-row{display:grid;grid-template-columns:1fr auto;gap:3px 10px;padding:7px 0;border-top:1px solid #292929}.rus-season-scoring-row:first-of-type{border-top:0}.rus-season-scoring-label{font-size:9px;color:#888;text-transform:uppercase;font-weight:900}.rus-season-scoring-value{font-size:16px;color:#F14D07;font-weight:900;text-align:right}.rus-season-scoring-years{grid-column:1/-1;font-size:10px;color:#bbb;line-height:1.4}.rus-season-scoring-empty{color:#999;font-size:12px;padding:8px 0}@media(max-width:850px){.rus-season-scoring-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.rus-season-scoring{padding:12px}.rus-season-scoring-grid{gap:7px}.rus-season-scoring-card{padding:9px}.rus-season-scoring-years{font-size:9px}}@media(max-width:850px){.rus-team-stat-records-head{align-items:flex-start;flex-direction:column}.rus-team-stat-records-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function clearEmpty(panel){for(const n of panel?.querySelectorAll(':scope > .rus-tab-empty')||[])n.remove()}
function activateRecords(shell,key){for(const b of shell.querySelectorAll('.rus-team-tab')){const on=b.dataset.tab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1}for(const p of shell.querySelectorAll('.rus-team-panel')){const on=p.dataset.tab===key;p.hidden=!on;p.style.display=on?'block':'none';p.classList.toggle('active',on)}const u=new URL(location.href);u.searchParams.set('tab',key);history.replaceState({},'',u)}
function ensureRecordPanel(key,label){const shell=document.querySelector('.rus-team-tabs-shell');if(!shell)return null;const bar=shell.querySelector('.rus-team-tabs'),panels=shell.querySelector('.rus-team-panels');if(!bar||!panels)return null;let button=bar.querySelector(`.rus-team-tab[data-tab="${key}"]`),panel=panels.querySelector(`#rus-panel-${key}`);if(!button){button=document.createElement('button');button.className='rus-team-tab';button.id=`rus-tab-${key}`;button.dataset.tab=key;button.type='button';button.setAttribute('role','tab');button.textContent=label;const player=bar.querySelector('.rus-team-tab[data-tab="player-records"]');player?bar.insertBefore(button,player):bar.appendChild(button)}if(!panel){panel=document.createElement('section');panel.className='rus-team-panel';panel.id=`rus-panel-${key}`;panel.dataset.tab=key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.hidden=true;panel.style.display='none';const player=panels.querySelector('#rus-panel-player-records');player?panels.insertBefore(panel,player):panels.appendChild(panel)}if(!shell.dataset.rusRecordTabsDirect){shell.dataset.rusRecordTabsDirect='1';bar.addEventListener('click',e=>{const b=e.target.closest('.rus-team-tab');if(!b||!['team-records','player-records'].includes(b.dataset.tab))return;e.preventDefault();e.stopImmediatePropagation();activateRecords(shell,b.dataset.tab)},true)}return panel}
function mount(section,key,label){const panel=ensureRecordPanel(key,label);if(!panel)return false;clearEmpty(panel);if(!panel.contains(section))panel.appendChild(section);return true}
function watchMount(section,key,label){let tries=0;const t=setInterval(()=>{if(!section.isConnected){clearInterval(t);return}if(mount(section,key,label)||++tries>300)clearInterval(t)},100)}
function table(c){return `<article class="rus-team-stat-record-card"><h3>${esc(c.label)}</h3><div class="rus-team-stat-record-wrap"><table><thead><tr><th>#</th><th>${esc(c.unit||'Record')}</th><th>Game</th></tr></thead><tbody>${c.entries.map(r=>{const score=Number.isFinite(Number(r.teamScore))&&Number.isFinite(Number(r.opponentScore))?`${r.teamScore}–${r.opponentScore}`:'Score unavailable',game=`${esc(r.date||r.season)} • vs ${esc(r.opponent||'—')} • ${esc(score)}`;return `<tr><td class="rus-team-stat-record-rank">${esc(r.rank)}</td><td class="rus-team-stat-record-value">${Number(r.value).toLocaleString()}</td><td class="rus-team-stat-record-game">${r.gameUrl?`<a href="${esc(r.gameUrl)}" target="_blank" rel="noopener">${game}</a>`:game}</td></tr>`}).join('')}</tbody></table></div></article>`}
function renderHead(team){return `<div class='rus-team-stat-records-head'><h2>Team Records</h2><p>${esc(team)} season scoring records and single-season scoring from available schedules, Deseret News single-game statistics, and documented historical team performances from George Felt.</p></div>`}
function renderEmpty(team,d,seasonHTML=''){return `${renderHead(team)}${seasonHTML}<div class='rus-team-stat-records-empty'><strong>No reported team single-game statistical records yet</strong><span>No usable structured Deseret News team-stat entries are currently available for ${esc(team)} in this dataset. This can happen when game pages do not include complete individual stat tables.</span></div><div class='rus-team-stat-records-source'>Source: Deseret News game statistics. ${esc(d?.coverageNote||'Historical reporting may be incomplete.')}</div>}
function feltDate(entry){
 const raw=String(entry?.date||'');
 if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
  const parts=raw.split('-');
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
 }
 return String(entry?.year||'—');
}
function feltTable(title,unit,entries,scope){
 const ordered=[...entries].sort((a,b)=>{
  const dir=/^Fewest/.test(title)?1:-1;
  return dir*(Number(a.value)-Number(b.value)) || Number(b.year)-Number(a.year);
 });
 const rows=ordered.map(e=>`<tr><td class="rus-team-stat-record-value">${Number(e.value).toLocaleString()}</td><td>${esc(feltDate(e))}</td><td class="rus-team-stat-record-game">${esc(e.context||'')}</td></tr>`).join('');
 return `<article class="rus-team-stat-record-card"><h3>${esc(title)}</h3><div class="rus-team-stat-record-wrap"><table><thead><tr><th>${esc(unit||'Value')}</th><th>${scope==='season'?'Season':'Date'}</th><th>Reported context</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;
}
function renderFeltListings(team,data){
 const key=String(team||'').trim().toUpperCase();
 const entries=Array.isArray(data?.byTeam?.[key])?data.byTeam[key]:[];
 if(!entries.length)return '';
 const defs=data.categories||{};
 const sections=[['season','Documented Season Statistical Performances'],['game','Documented Single-Game Statistical Performances']];
 const html=sections.map(([scope,title])=>{
  const groups=new Map();
  for(const e of entries){
   const meta=defs[e.metric];
   if(!meta||meta.scope!==scope||!Number.isFinite(Number(e.value)))continue;
   if(!groups.has(e.metric))groups.set(e.metric,[]);
   groups.get(e.metric).push(e);
  }
  if(!groups.size)return '';
  const items=[...groups].map(([metric,rows])=>feltTable(defs[metric].label,defs[metric].unit,rows,scope)).join('');
  return `<section class="rus-felt-scope"><h3 class="rus-season-scoring-title">${esc(title)}</h3><div class="rus-team-stat-records-grid">${items}</div></section>`;
 }).join('');
 return `<div class="rus-felt-records"><div class="rus-team-stat-records-source"><strong>Historical source: George Felt</strong> — Utah High School Football All-Time Statistical Records, through 2026. These are documented entries from statewide leaderboards, <strong>not a complete ranking of every statistical performance in this school's history</strong>. Historical statistics can be incomplete or provisional.</div>${html}</div>`;
}
async function renderSeasonScoringRecords(team){
  try{
    const r=await fetch(`team-page-data/${slug(team)}.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)return '';
    const data=await r.json(),seasons=(data.seasonHistory||[]).filter(s=>Number(s.games)>0&&Number.isFinite(Number(s.year)));
    const defs=[
      {key:'pointsFor',label:'Points Scored (PS)',high:'Most',low:'Fewest',digits:0},
      {key:'pointsAgainst',label:'Points Allowed (PA)',high:'Most',low:'Fewest',digits:0},
      {key:'ppg',label:'Points per Game (PPG)',high:'Highest',low:'Lowest',digits:1},
      {key:'papg',label:'Points Allowed per Game (PAPG)',high:'Highest',low:'Lowest',digits:1}
    ];
    const valueOf=(s,key)=>{const raw=s[key];if(raw===null||raw===undefined||String(raw).trim()==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null};
    const yearsFor=(rows)=>rows.map(s=>{const ties=Number(s.ties)||0,record=`${s.wins}-${s.losses}${ties?`-${ties}`:''}`;return `${s.year} (${record})`}).join(', ');
    const fmt=(v,d)=>Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
    const cards=defs.map(def=>{
      const valid=seasons.filter(s=>valueOf(s,def.key)!==null);
      if(!valid.length)return `<article class='rus-season-scoring-card'><h4>${esc(def.label)}</h4><div class='rus-season-scoring-empty'>No season data available.</div></article>`;
      const vals=valid.map(s=>valueOf(s,def.key)),hi=Math.max(...vals),lo=Math.min(...vals),round=v=>Number(v.toFixed(def.digits));
      const highRows=valid.filter(s=>round(valueOf(s,def.key))===round(hi)),lowRows=valid.filter(s=>round(valueOf(s,def.key))===round(lo));
      return `<article class='rus-season-scoring-card'><h4>${esc(def.label)}</h4><div class='rus-season-scoring-row'><span class='rus-season-scoring-label'>${esc(def.high)}</span><strong class='rus-season-scoring-value'>${fmt(hi,def.digits)}</strong><span class='rus-season-scoring-years'>${esc(yearsFor(highRows))}</span></div><div class='rus-season-scoring-row'><span class='rus-season-scoring-label'>${esc(def.low)}</span><strong class='rus-season-scoring-value'>${fmt(lo,def.digits)}</strong><span class='rus-season-scoring-years'>${esc(yearsFor(lowRows))}</span></div></article>`;
    }).join('');
    return `<section class='rus-season-scoring' aria-labelledby='rusSeasonScoringTitle'><h3 class='rus-season-scoring-title' id='rusSeasonScoringTitle'>Single-Season Scoring Records</h3><p class='rus-season-scoring-note'>Highest and lowest marks are calculated automatically from this team’s available season history. Tied seasons are all shown.</p><div class='rus-season-scoring-grid'>${cards}</div></section>`;
  }catch(e){console.warn('Team season scoring records:',e);return ''}
}
async async function install(){
 styles();
 let tries=0,team='';
 while(!(team=document.querySelector('.team-title')?.textContent?.trim())&&tries++<300)await new Promise(r=>setTimeout(r,100));
 if(!team||document.getElementById('rusTeamStatRecords'))return;
 const section=document.createElement('section');
 section.id='rusTeamStatRecords';
 section.className='rus-team-stat-records-section';
 section.innerHTML='<div class="rus-team-stat-records-empty">Loading team records…</div>';
 if(window.RUSTeamRecordTheme)void window.RUSTeamRecordTheme.apply(section,team).catch(e=>console.warn('Team record colors:',e));
 if(!mount(section,'team-records','Team Records')){
  const player=document.getElementById('rusPlayerRecords');
  if(player)player.insertAdjacentElement('beforebegin',section);
  else{
   const headings=[...document.querySelectorAll('#page .section-title')],heading=headings.find(h=>h.textContent.trim()==='ELO History')||headings.find(h=>h.textContent.trim()==='Historical Records');
   if(heading)heading.insertAdjacentElement('beforebegin',section);
   else document.getElementById('page')?.appendChild(section);
  }
  watchMount(section,'team-records','Team Records');
 }
 const seasonHTML=await renderSeasonScoringRecords(team);
 let feltHTML='';
 try{
  const r=await fetch('george-felt-team-records.json?v=20261123-felt1',{cache:'no-store'});
  if(r.ok)feltHTML=renderFeltListings(team,await r.json());
 }catch(e){console.warn('George Felt team record listings:',e)}
 let d={},cats=[];
 try{
  const r=await fetch(`team-stat-single-game-records/by-team/${slug(team)}.json?v=20261123-felt1`,{cache:'no-store'});
  if(r.ok){
   d=await r.json();
   cats=Array.isArray(d?.categories)?d.categories.filter(c=>c.entries?.length):[];
  }
 }catch(e){console.warn('Deseret News team single-game records:',e)}
 mount(section,'team-records','Team Records');
 if(!cats.length){
  const missing=`<div class="rus-team-stat-records-empty"><strong>No additional Deseret News single-game statistic listings</strong><span>${esc(team)} may still have historical performances shown above. Not every historical game has a complete stat sheet.</span></div>`;
  section.innerHTML=`${renderHead(team)}${seasonHTML}${feltHTML}${missing}`;
  return;
 }
 section.innerHTML=`${renderHead(team)}${seasonHTML}${feltHTML}<h3 class="rus-season-scoring-title">Deseret News Single-Game Statistical Records</h3><p class="rus-season-scoring-note">Ranked within the available Deseret News game-stat dataset for this school, which is not necessarily a complete historical record.</p><div class="rus-team-stat-records-grid">${cats.map(table).join('')}</div><div class="rus-team-stat-records-source">Source: Deseret News game statistics. ${esc(d.coverageNote||'Historical reporting may be incomplete.')}</div>`;
}
let started=false;
function startForTeamRecords(event){
  const requested=event?.detail?.key||new URLSearchParams(location.search).get('tab');
  if(requested!=='team-records'||started)return;
  started=true;
  install();
}
document.addEventListener('rus-team-tab-shown',startForTeamRecords);
startForTeamRecords();
})();
