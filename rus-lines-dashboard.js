(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='scoreboard.html')return;

const HOME_FIELD_POINTS=3;
const DAY=86400000;
const WEEK=7*DAY;
const num=v=>{
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
};
const norm=v=>String(v??'').trim().toUpperCase();
const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function isoDate(v){
  const s=String(v||'').trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:'';
}

async function get(name,fallback){
  try{const r=await fetch(`${name}?v=${Date.now()}`,{cache:'no-store'});return r.ok?await r.json():fallback}catch{return fallback}
}

function findOverride(data,g){
  return(data?.overrides||[]).find(x=>compact(x.awayTeam)===compact(g.awayTeam)&&compact(x.homeTeam)===compact(g.homeTeam)&&(!x.date||isoDate(x.date)===isoDate(g.date)))||null;
}

function project(g,overrides){
  const o=findOverride(overrides,g);
  if(o){const a=num(o.awayScore),h=num(o.homeScore);if(a!==null&&h!==null)return{away:a,home:h,edited:true}}
  const a=num(g.awayScore),h=num(g.homeScore);
  return a===null||h===null?null:{away:a,home:h+HOME_FIELD_POINTS,edited:false};
}

function info(g,overrides){
  const p=project(g,overrides);if(!p)return null;
  const margin=Math.abs(p.away-p.home),favorite=p.away===p.home?'':p.away>p.home?g.awayTeam:g.homeTeam;
  const label=p.away===p.home?'PK':`${favorite} -${Number.isInteger(margin)?margin:margin.toFixed(1)}`;
  return{g,...p,margin,favorite,label,total:p.away+p.home};
}

function final(g){return num(g.actualAway)!==null&&num(g.actualHome)!==null}

function startOfDay(value){const d=new Date(value);d.setHours(0,0,0,0);return d.getTime()}
function thursdayStart(value){const d=new Date(startOfDay(value));const daysSinceThursday=(d.getDay()+3)%7;d.setDate(d.getDate()-daysSinceThursday);return d.getTime()}
function seasonWeekOneStart(year){const d=new Date(Number(year),7,8);d.setHours(0,0,0,0);while(d.getDay()!==4)d.setDate(d.getDate()+1);return d.getTime()}
function gameWeekNumber(g){
  const date=isoDate(g.date);if(!date)return null;
  const t=Date.parse(`${date}T12:00:00`);if(!Number.isFinite(t))return null;
  const year=new Date(t).getFullYear();
  return Math.floor((thursdayStart(t)-seasonWeekOneStart(year))/WEEK)+1;
}
function selectedWeekNumber(){
  const select=document.getElementById('scoreboardWeekSelect');
  const fromSelect=Number(select?.value);
  if(Number.isInteger(fromSelect)&&fromSelect>0)return fromSelect;
  const fromUrl=Number(new URLSearchParams(location.search).get('week'));
  if(Number.isInteger(fromUrl)&&fromUrl>0)return fromUrl;
  return null;
}
function activeWeekGames(allGames){
  const selected=selectedWeekNumber();
  if(!selected)return allGames;
  const filtered=allGames.filter(g=>gameWeekNumber(g)===selected);
  return filtered.length?filtered:allGames;
}

function addStyles(){
  if(document.getElementById('rus-lines-dash-style'))return;
  const s=document.createElement('style');s.id='rus-lines-dash-style';
  s.textContent=`.rus-lines-dash{background:#090909;border:1px solid #333;border-top:5px solid #F14D07;border-radius:12px;padding:16px;margin:0 0 18px}.rus-lines-head{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:12px}.rus-lines-head h3{font-size:18px;text-transform:uppercase}.rus-lines-head p{color:#777;font-size:9px;text-transform:uppercase;font-weight:800}.rus-lines-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rus-line-card{background:#141414;border:1px solid #303030;border-radius:9px;padding:11px;color:#fff;text-decoration:none}.rus-line-card small{display:block;color:#777;font-size:8px;text-transform:uppercase;font-weight:900;margin-bottom:5px}.rus-line-card strong{display:block;color:#F14D07;font-size:15px;line-height:1.25}.rus-line-card span{display:block;color:#aaa;font-size:9px;margin-top:5px}.rus-line-card .rus-card-total{color:#ddd;font-size:11px;font-weight:900;margin-top:4px}.rus-lines-note{margin-top:10px;color:#666;font-size:9px;line-height:1.4}@media(max-width:780px){.rus-lines-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:430px){.rus-lines-grid{grid-template-columns:1fr 1fr}.rus-lines-head{align-items:flex-start;flex-direction:column}}`;
  document.head.appendChild(s);
}

function href(g){return`game.html?${new URLSearchParams({date:g.date||'',away:g.awayTeam||'',home:g.homeTeam||''})}`}
function installScoreboardProjection(overrides){
  const projected=g=>project(g,overrides);
  try{window.projectedScores=projected}catch{}
  try{projectedScores=projected}catch{}
  if(typeof window.render==='function')setTimeout(()=>{try{window.render()}catch{}},0);
}

let cached=null;
async function loadData(){
  if(cached)return cached;
  const [weekly,elo,overrides]=await Promise.all([get('weekly-simulation.json',{}),get('elo-summary.json',{}),get('game-preview-overrides.json',{overrides:[]})]);
  cached={weekly,elo,overrides};
  installScoreboardProjection(overrides);
  return cached;
}

async function build(){
  const {weekly,elo,overrides}=await loadData();
  const weekGames=activeWeekGames(weekly?.games||[]);
  const rows=weekGames.map(g=>info(g,overrides)).filter(Boolean);
  if(!rows.length){document.querySelector('.rus-lines-dash')?.remove();return}
  const upcoming=rows.filter(x=>!final(x.g)),done=rows.filter(x=>final(x.g));
  const closest=[...upcoming].sort((a,b)=>a.margin-b.margin)[0]||[...rows].sort((a,b)=>a.margin-b.margin)[0];
  const largest=[...upcoming].sort((a,b)=>b.margin-a.margin)[0]||[...rows].sort((a,b)=>b.margin-a.margin)[0];
  let disagreement=null;
  for(const x of upcoming){
    if(!x.favorite)continue;
    const other=norm(x.favorite)===norm(x.g.awayTeam)?x.g.homeTeam:x.g.awayTeam;
    const fe=num(elo?.[norm(x.favorite)]?.currentElo),oe=num(elo?.[norm(other)]?.currentElo);
    if(fe!==null&&oe!==null&&fe<oe){const gap=oe-fe;if(!disagreement||gap>disagreement.gap)disagreement={...x,gap,other}}
  }
  let correct=0,errors=[];
  for(const x of done){
    const aa=num(x.g.actualAway),ah=num(x.g.actualHome);if(aa===ah||!x.favorite)continue;
    const actualWinner=aa>ah?x.g.awayTeam:x.g.homeTeam;
    if(norm(actualWinner)===norm(x.favorite))correct++;
    const favAway=norm(x.favorite)===norm(x.g.awayTeam),actualMargin=favAway?aa-ah:ah-aa;
    errors.push(Math.abs(actualMargin-x.margin));
  }
  const record=done.filter(x=>x.favorite&&num(x.g.actualAway)!==num(x.g.actualHome)).length;
  const avgErr=errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null;
  const gameCard=(x,title,note)=>`<a class="rus-line-card" href="${href(x.g)}"><small>${title}</small><strong>${esc(x.label)}</strong><span class="rus-card-total">O/U: ${x.total}</span><span>${note||`${esc(x.g.awayTeam)} at ${esc(x.g.homeTeam)}`}</span></a>`;
  const cards=[];
  if(closest)cards.push(gameCard(closest,'Closest Projected Game'));
  if(largest)cards.push(gameCard(largest,'Largest Projected Margin'));
  if(disagreement)cards.push(gameCard(disagreement,'Model / ELO Disagreement','RUS favors the lower-ELO team'));
  cards.push(`<div class="rus-line-card"><small>Model Results This Week</small><strong>${record?`${correct}-${record-correct}`:'No finals yet'}</strong><span>${avgErr===null?'Margin accuracy pending':`Avg margin error ${avgErr.toFixed(1)} pts`}</span></div>`);
  addStyles();
  document.querySelector('.rus-lines-dash')?.remove();
  const box=document.createElement('section');box.className='rus-lines-dash';
  box.innerHTML=`<div class="rus-lines-head"><div><h3>RUS Lines</h3><p>Selected week only • projected spreads and O/U totals • 3-point home-field adjustment unless an editorial projection is set</p></div></div><div class="rus-lines-grid">${cards.join('')}</div><div class="rus-lines-note">RUS spreads and O/U totals are model projections for analysis and comparison, not sportsbook or wagering lines.</div>`;
  const anchor=document.getElementById('summary')||document.querySelector('.filters');
  anchor?.insertAdjacentElement('beforebegin',box);
}

let rebuildTimer=0;
function scheduleBuild(){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(build,30)}
document.addEventListener('change',e=>{if(e.target?.id==='scoreboardWeekSelect')scheduleBuild()});
window.addEventListener('popstate',scheduleBuild);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
