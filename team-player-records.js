(()=>{
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const slug=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function styles(){if(document.getElementById('rus-player-records-style'))return;const s=document.createElement('style');s.id='rus-player-records-style';s.textContent=`.rus-player-records-section{margin-top:0}.rus-player-records-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px}.rus-player-records-head h2{font-size:27px;text-transform:uppercase;border-left:6px solid #F14D07;padding-left:14px}.rus-player-records-head p{color:#999;font-size:13px;max-width:700px;line-height:1.5}.rus-player-records-subhead{font-size:20px;text-transform:uppercase;margin:28px 0 12px;border-left:5px solid #F14D07;padding-left:11px}.rus-player-records-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.rus-player-record-card{min-width:0;background:#080808;border:1px solid #333;border-radius:8px;overflow:hidden}.rus-player-record-card h3{background:#171717;border-bottom:3px solid #F14D07;padding:14px 16px;font-size:15px;text-transform:uppercase}.rus-player-record-wrap{overflow:auto;max-height:440px}.rus-player-record-wrap table{min-width:440px}.rus-player-record-wrap th{position:sticky;top:0;z-index:2}.rus-player-record-wrap td:first-child{text-align:left;font-weight:800}.rus-player-record-rank{color:#777;width:48px}.rus-player-record-value{color:#F14D07;font-weight:900}.rus-player-record-game{color:#aaa;font-size:11px;line-height:1.35;white-space:normal;min-width:170px}.rus-player-record-game a{color:#ddd;text-decoration:none;font-weight:800}.rus-player-record-game a:hover{color:#F14D07}.rus-player-records-source{margin-top:16px;background:#111;border:1px solid #333;border-radius:7px;padding:13px 15px;color:#999;font-size:12px;line-height:1.5}.rus-player-records-source a{color:#F14D07;font-weight:800}.rus-player-records-empty{background:#090909;border:1px solid #333;border-radius:8px;color:#999;padding:36px;text-align:center}@media(max-width:850px){.rus-player-records-head{align-items:flex-start;flex-direction:column}.rus-player-records-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function clearEmpty(panel){for(const n of panel?.querySelectorAll(':scope > .rus-tab-empty')||[])n.remove()}
function activateRecords(shell,key){for(const b of shell.querySelectorAll('.rus-team-tab')){const on=b.dataset.tab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1}for(const p of shell.querySelectorAll('.rus-team-panel')){const on=p.dataset.tab===key;p.hidden=!on;p.style.display=on?'block':'none';p.classList.toggle('active',on)}const u=new URL(location.href);u.searchParams.set('tab',key);history.replaceState({},'',u)}
function ensureRecordPanel(key,label){const shell=document.querySelector('.rus-team-tabs-shell');if(!shell)return null;const bar=shell.querySelector('.rus-team-tabs'),panels=shell.querySelector('.rus-team-panels');if(!bar||!panels)return null;let button=bar.querySelector(`.rus-team-tab[data-tab="${key}"]`),panel=panels.querySelector(`#rus-panel-${key}`);if(!button){button=document.createElement('button');button.className='rus-team-tab';button.id=`rus-tab-${key}`;button.dataset.tab=key;button.type='button';button.setAttribute('role','tab');button.textContent=label;const history=bar.querySelector('.rus-team-tab[data-tab="history"]');history?bar.insertBefore(button,history):bar.appendChild(button)}if(!panel){panel=document.createElement('section');panel.className='rus-team-panel';panel.id=`rus-panel-${key}`;panel.dataset.tab=key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.hidden=true;panel.style.display='none';const history=panels.querySelector('#rus-panel-history');history?panels.insertBefore(panel,history):panels.appendChild(panel)}if(!shell.dataset.rusRecordTabsDirect){shell.dataset.rusRecordTabsDirect='1';bar.addEventListener('click',e=>{const b=e.target.closest('.rus-team-tab');if(!b||!['team-records','player-records'].includes(b.dataset.tab))return;e.preventDefault();e.stopImmediatePropagation();activateRecords(shell,b.dataset.tab)},true)}return panel}
function mount(section,key,label){const panel=ensureRecordPanel(key,label);if(!panel)return false;clearEmpty(panel);if(!panel.contains(section))panel.appendChild(section);return true}
function watchMount(section,key,label){let tries=0;const t=setInterval(()=>{if(!section.isConnected){clearInterval(t);return}if(mount(section,key,label)||++tries>300)clearInterval(t)},100)}
function statPriority(nameValue){const name=String(nameValue||'').toLowerCase();let group=99,within=99;if(name.includes('passing')||name.includes('pass '))group=0;else if(name.includes('rushing')||name.includes('rush'))group=1;else if(name.includes('receiving')||name.includes('reception'))group=2;else if(name.includes('defense')||name.includes('tackle')||name.includes('sack')||name.includes('interception'))group=3;else if(name.includes('kicking')||name.includes('field goal')||name.includes('pat')||name.includes('extra point')||name.includes('return'))group=4;else if(name.includes('total offense'))group=5;if(group<=2){if(name.includes('yards'))within=0;else if(name.includes('touchdown'))within=1;else if(name.includes('completion'))within=2;else if(name.includes('attempt')||name.includes('carr'))within=3;else if(name.includes('reception'))within=4}else if(group===3){if(name.includes('tackle'))within=0;else if(name.includes('sack'))within=1;else if(name.includes('interception'))within=2;else if(name.includes('touchdown'))within=3}else if(group===4){if(name.includes('field goal'))within=0;else if(name.includes('pat')||name.includes('extra point'))within=1;else if(name.includes('return'))within=2}else if(group===5)within=0;return group*100+within}
function seasonTable(c){return `<article class="rus-player-record-card"><h3>${esc(c.category)}</h3><div class="rus-player-record-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Season</th><th>${esc(c.valueLabel)}</th></tr></thead><tbody>${c.entries.map((r,i)=>`<tr><td class="rus-player-record-rank">${i+1}</td><td>${esc(r.player)}</td><td>${esc(r.season)}</td><td class="rus-player-record-value">${typeof r.value==='number'?r.value.toLocaleString():esc(r.value)}</td></tr>`).join('')}</tbody></table></div></article>`}
function gameTable(c){return `<article class="rus-player-record-card"><h3>${esc(c.label)}</h3><div class="rus-player-record-wrap"><table><thead><tr><th>#</th><th>Player</th><th>${esc(c.unit||'Record')}</th><th>Game</th></tr></thead><tbody>${c.entries.map(r=>{const score=Number.isFinite(Number(r.teamScore))&&Number.isFinite(Number(r.opponentScore))?`${r.teamScore}–${r.opponentScore}`:'Score unavailable',game=`${esc(r.date||r.season)} • vs ${esc(r.opponent||'—')} • ${esc(score)}`;return `<tr><td class="rus-player-record-rank">${esc(r.rank)}</td><td>${esc(r.player)}</td><td class="rus-player-record-value">${Number(r.value).toLocaleString()}</td><td class="rus-player-record-game">${r.gameUrl?`<a href="${esc(r.gameUrl)}" target="_blank" rel="noopener">${game}</a>`:game}</td></tr>`}).join('')}</tbody></table></div></article>`}
const UHSAA_GAME_CATEGORY_MAP={
  PASSINGYARDS:'passingYards',PASSINGTOUCHDOWNS:'passingTouchdowns',
  PASSINGCOMPLETIONS:'completions',PASSINGATTEMPTS:'passAttempts',
  RUSHINGYARDS:'rushingYards',RUSHINGTOUCHDOWNS:'rushingTouchdowns',
  RUSHINGATTEMPTS:'carries',RECEIVINGYARDS:'receivingYards',RECEPTIONS:'receptions',
  RECEIVINGTOUCHDOWNS:'receivingTouchdowns',TOTALOFFENSE:'totalOffenseYards',
  TACKLES:'tackles',SACKS:'sacks',INTERCEPTIONS:'interceptions',
  DEFENSIVETOUCHDOWNS:'defensiveTouchdowns',FIELDGOALS:'fieldGoals',
  EXTRAPOINTS:'extraPoints',PATMADE:'extraPoints'
};
UHSAA_GAME_CATEGORY_MAP['KICKOFF'+'RETURNTOUCHDOWNS']='returnTouchdowns';
UHSAA_GAME_CATEGORY_MAP['PUNT'+'RETURNTOUCHDOWNS']='returnTouchdowns';
UHSAA_GAME_CATEGORY_MAP['RETURNTOUCHDOWNS']='returnTouchdowns';
const UHSAA_SCHOOL_ALIASES={
  'american-leadership-academy':'ala','american-leadership':'ala',
  cedar:'cedar-city','cedar-reds':'cedar-city','grand-county':'grand',
  gunnison:'gunnison-valley','maple-mtn':'maple-mountain',
  'monument-val':'monument-valley','juan-diego-catholic':'juan-diego',
  'layton-christian-academy':'layton-christian','saint-joseph':'st-joseph',
  'utah-military-hillfield':'utah-military-hillfield',
  'utah-military-camp-williams':'utah-military-camp-williams'
};
function uhsaaSchoolKey(value){const s=slug(value);return UHSAA_SCHOOL_ALIASES[s]||s}
function uhsaaCategoryKey(title){
  const base=String(title||'').replace(/\s*[-–—]\s*Game\s*$/i,'').replace(/\s+GAME$/i,'')
    .toUpperCase().replace(/[^A-Z0-9]/g,'');
  return UHSAA_GAME_CATEGORY_MAP[base]||null;
}
function uhsaaGameDetail(detail){
  const raw=String(detail||''),m=raw.match(/(\d{1,2})[-/](\d{1,2})-(\d{4})/);
  const date=m?m[3]+'-'+String(m[1]).padStart(2,'0')+'-'+String(m[2]).padStart(2,'0'):'';
  const opponent=raw.replace(m?.[0]||'','').replace(/^\s*(?:vs?\.?|at)\s*/i,'')
    .replace(/,?\s*(?:OT|2OT|3OT|quarterfinal|semifinal|final)\s*$/i,'').trim();
  return {date,opponent};
}
function uhsaaRecordKey(row){
  return [String(row.player||'').toUpperCase().replace(/[^A-Z0-9]/g,''),String(row.date||''),String(row.value)].join('|');
}
function mergeUhsaa(team,baseCats,parts){
  const wanted=uhsaaSchoolKey(team),out=baseCats.map(c=>({...c,entries:[...(c.entries||[])]}));
  const byKey=new Map(out.map(c=>[c.key,c]));
  for(const c of parts.flatMap(x=>x.categories||[])){
    if(!/game/i.test(c.title||''))continue;
    const key=uhsaaCategoryKey(c.title);if(!key)continue;
    const rows=(c.entries||[]).filter(e=>uhsaaSchoolKey(e.school)===wanted);
    if(!rows.length)continue;
    let target=byKey.get(key);
    if(!target){
      const labels={passingYards:['Passing Yards','yards'],passingTouchdowns:['Passing Touchdowns','TD'],
        completions:['Pass Completions','completions'],passAttempts:['Pass Attempts','attempts'],
        rushingYards:['Rushing Yards','yards'],rushingTouchdowns:['Rushing Touchdowns','TD'],
        carries:['Rushing Attempts','carries'],receivingYards:['Receiving Yards','yards'],
        receptions:['Receptions','receptions'],receivingTouchdowns:['Receiving Touchdowns','TD'],
        totalOffenseYards:['Total Offense','yards'],tackles:['Tackles','tackles'],
        sacks:['Sacks','sacks'],interceptions:['Interceptions','INT'],
        defensiveTouchdowns:['Defensive Touchdowns','TD'],fieldGoals:['Field Goals','FG'],
        extraPoints:['PAT Made','PAT'],returnTouchdowns:['Return Touchdowns','TD']}[key]||[key,''];
      target={key,label:labels[0],unit:labels[1],entries:[]};out.push(target);byKey.set(key,target);
    }
    for(const e of rows){
      const detail=uhsaaGameDetail(e.detail),candidate={
        rank:0,player:e.name,value:e.value,date:detail.date||e.detail,
        opponent:detail.opponent||'UHSAA record book',teamScore:null,opponentScore:null,
        gameUrl:'',source:'UHSAA record book'
      };
      if(!target.entries.some(x=>uhsaaRecordKey(x)===uhsaaRecordKey(candidate)))target.entries.push(candidate);
    }
  }
  for(const c of out){
    c.entries.sort((a,b)=>Number(b.value)-Number(a.value)||String(a.date||'').localeCompare(String(b.date||'')));
    let last=null,rank=0;c.entries.forEach((e,i)=>{if(e.value!==last){rank=i+1;last=e.value}e.rank=rank});
  }
  return out.filter(c=>c.entries.length);
}
async function install(){styles();let tries=0,team='';while(!(team=document.querySelector('.team-title')?.textContent?.trim())&&tries++<300)await new Promise(r=>setTimeout(r,100));if(!team||document.getElementById('rusPlayerRecords'))return;const section=document.createElement('section');section.id='rusPlayerRecords';section.className='rus-player-records-section';section.innerHTML='<div class="rus-player-records-empty">Loading player records…</div>';if(!mount(section,'player-records','Player Records')){const headings=[...document.querySelectorAll('#page .section-title')],target=headings.find(h=>h.textContent.trim()==='ELO History')||headings.find(h=>h.textContent.trim()==='Historical Records');if(target)target.insertAdjacentElement('beforebegin',section);else document.getElementById('page')?.appendChild(section);watchMount(section,'player-records','Player Records')}const stamp=Date.now();const [singleRes,seasonRes]=await Promise.allSettled([fetch(`player-single-game-records/by-team/${slug(team)}.json?v=${stamp}`,{cache:'no-store'}),fetch(`team-player-records/${slug(team)}.json?v=${stamp}`,{cache:'no-store'})]);let single=null,season=null;try{if(singleRes.status==='fulfilled'&&singleRes.value.ok)single=await singleRes.value.json()}catch(e){console.warn('Single-game player records:',e)}try{if(seasonRes.status==='fulfilled'&&seasonRes.value.ok)season=await seasonRes.value.json()}catch(e){console.warn('Single-season player records:',e)}let singleCats=Array.isArray(single?.categories)?single.categories.filter(c=>c.entries?.length).sort((a,b)=>statPriority(a.label||a.key)-statPriority(b.label||b.key)):[];try{const m=await fetch(`uhsaa-football-records-expanded.json?v=${Date.now()}`,{cache:'no-store'}),manifest=m.ok?await m.json():{},files=Array.isArray(manifest.parts)?manifest.parts:[],responses=await Promise.all(files.map(file=>fetch(`${file}?v=${Date.now()}`,{cache:'no-store'}))),parts=await Promise.all(responses.map(r=>r.ok?r.json():{}));singleCats=mergeUhsaa(team,singleCats,parts);}catch(e){console.warn('UHSAA player records:',e)}const seasonCats=Array.isArray(season?.categories)?season.categories.filter(c=>c.entries?.length).sort((a,b)=>statPriority(a.category)-statPriority(b.category)):[];mount(section,'player-records','Player Records');if(!singleCats.length&&!seasonCats.length){section.innerHTML='<div class="rus-player-records-empty">No reported historical player records are currently available for this team.</div>';return}section.innerHTML=`<div class="rus-player-records-head"><h2>Player Records</h2><p>${esc(team)} historical player leaderboards. Single-game records use reported Deseret News game statistics from 2009 to present plus official UHSAA record-book game entries when the school is identified.</p></div>${singleCats.length?`<h3 class="rus-player-records-subhead">Single-Game Records — 2009 to Present + UHSAA</h3><div class="rus-player-records-grid">${singleCats.map(gameTable).join('')}</div><div class="rus-player-records-source">Sources: Deseret News game statistics and UHSAA record book. ${esc(single.coverageNote||'Historical reporting may be incomplete.')}</div>`:''}${seasonCats.length?`<h3 class="rus-player-records-subhead">Single-Season Records</h3><div class="rus-player-records-grid">${seasonCats.map(seasonTable).join('')}</div><div class="rus-player-records-source">Source: ${season.sourceUrl?`<a href="${esc(season.sourceUrl)}" target="_blank" rel="noopener">Deseret News team records</a>`:'Deseret News team records'}. ${esc(season.coverageNote||'Historical coverage may be incomplete.')}</div>`:''}`}
let started=false;
function startForPlayerRecords(event){
  const requested=event?.detail?.key||new URLSearchParams(location.search).get('tab');
  if(requested!=='player-records'||started)return;
  started=true;
  install();
}
document.addEventListener('rus-team-tab-shown',startForPlayerRecords);
startForPlayerRecords();
})();
