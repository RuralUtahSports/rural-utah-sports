(()=>{
'use strict';
if(window.__RUS_SITE_SEARCH__)return;window.__RUS_SITE_SEARCH__=true;
const pages=[
['Home','index.html','Home'],['Teams','teams.html','Football'],['Players','players.html','Stats'],['Games','games.html','Football'],['Scoreboard','scoreboard.html','Football'],['Rankings','rankings.html','Football'],['Standings','standings.html','Football'],['Stat Leaders','stat-leaders.html','Stats'],['Weekly Awards','weekly-awards.html','Stats'],['Team Stats','team-stats.html','Stats'],['MVP Race','mvp-race.html','Stats'],['All-Utah Team','all-utah.html','Stats'],['All-State & Region Watch','all-state-watch.html','Stats'],['Storylines','storylines.html','Football'],['ELO','elo.html','Analytics'],['Playoff Picture','playoff-picture.html','Analytics'],['Upset Tracker','upsets.html','Analytics'],['Scorigami','scorigami.html','Analytics'],['Out of State','out-of-state.html','Analytics'],['Fantasy Football','fantasy-football.html','Analytics'],['Team Comparison','compare.html','Analytics'],['Player Comparison','player-compare.html','Analytics'],['Football Map','map.html','Analytics'],['Championships','championships.html','History'],['Season Explorer','season.html','History'],['Past Season Rankings','historical-rankings.html','History'],['Program Leaderboard','programs.html','History'],['Active Streaks','streaks.html','History'],['Milestone Watch','milestones.html','History'],['Rivalry Hub','rivalry.html','History'],['Dynasty Explorer','dynasty.html','History'],['History Lab','history-lab.html','History'],['Greatest Seasons','greatest-seasons.html','History'],['Records','records.html','History'],['Simulators','simulators.html','Simulators'],['Promotion / Relegation','promotion-relegation.html','Simulators']
];
let layer,input,results,indexPromise,timer,revision=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const norm=v=>String(v??'').trim().toLowerCase();
const isoDate=v=>{const d=new Date(v);if(!Number.isFinite(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function addStyles(){if(document.getElementById('rus-search-style'))return;const s=document.createElement('style');s.id='rus-search-style';s.textContent=`
.rus-search-trigger{appearance:none;margin-left:auto;width:auto;min-height:44px;padding:0 13px;border:1px solid #383838;border-radius:12px;background:#171717;color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font:900 11px Arial,sans-serif;text-transform:uppercase;cursor:pointer}.rus-search-trigger svg{width:20px;height:20px;fill:none;stroke:#F14D07;stroke-width:2.2}.rus-favorites-button{margin-left:0!important}.rus-search-layer{position:fixed;inset:0;z-index:2147483400;background:rgba(0,0,0,.78);display:none;align-items:flex-start;justify-content:center;padding:8dvh 14px 20px}.rus-search-layer.open{display:flex}.rus-search-panel{width:min(720px,100%);max-height:82dvh;overflow:hidden;background:#101010;border:1px solid #3a3a3a;border-top:5px solid #F14D07;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.65);display:flex;flex-direction:column}.rus-search-head{display:flex;gap:8px;padding:12px;border-bottom:1px solid #2c2c2c}.rus-search-input{flex:1;min-width:0;height:48px;background:#1a1a1a;color:#fff;border:1px solid #444;border-radius:9px;padding:0 14px;font-size:16px;font-weight:800;outline:none}.rus-search-input:focus{border-color:#F14D07}.rus-search-close{width:48px;height:48px;border-radius:9px;border:1px solid #444;background:#1a1a1a;color:#fff;font-size:25px}.rus-search-results{overflow:auto;padding:8px}.rus-search-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;text-decoration:none;color:#fff;border:1px solid transparent;border-radius:9px;padding:11px 12px}.rus-search-result:hover,.rus-search-result:focus{background:#1b1b1b;border-color:#353535;outline:none}.rus-search-result b{display:block;font-size:14px}.rus-search-result small{display:block;color:#888;font-size:10px;margin-top:3px}.rus-search-type{color:#F14D07;font-size:9px;font-weight:900;text-transform:uppercase}.rus-search-empty{padding:28px 14px;text-align:center;color:#888;font-size:12px}.rus-search-hint{padding:8px 13px 12px;color:#666;font-size:10px;border-top:1px solid #242424}
@media(max-width:700px){.rus-search-trigger{width:46px;height:46px;padding:0;border-radius:12px}.rus-search-trigger span{display:none}.rus-search-layer{padding-top:4dvh}.rus-search-panel{max-height:90dvh}}
`;document.head.appendChild(s)}
function searchIndex(){
  if(!indexPromise)indexPromise=fetch('site-search-index.json').then(r=>{
    if(!r.ok)throw new Error('Search index unavailable');
    return r.json();
  }).then(data=>{
    if(data.v!==1||!Array.isArray(data.p)||!Array.isArray(data.t)||!Array.isArray(data.g))throw new Error('Invalid search index');
    return {
      teams:data.t.map(([team,classification,region])=>({team,classification,region,hay:norm(team)})),
      players:data.p.map(([id,n,t,no,p,c,y])=>({id,n,t,no,p,c,y,hay:norm(`${n} ${t} ${no} ${p} ${c}`),nameKey:norm(n)})),
      games:data.g.map(([away,home,date])=>({away,home,date:isoDate(date),hay:norm(`${away} ${home}`)}))
    };
  }).catch(error=>{indexPromise=null;throw error});
  return indexPromise;
}
function pageHits(q){return pages.filter(([name,,group])=>norm(name+' '+group).includes(q)).map(([name,href,group])=>({name,href,type:'Page',meta:group,score:norm(name).startsWith(q)?0:3}))}
function playerMeta(p){return [`#${p.no||''}`,p.t,p.p,p.c?`Class ${p.c}`:'',String(p.y||'')].filter(x=>x&&x!=='#').join(' • ')}
async function search(q){
  const request=++revision;
  q=norm(q);
  if(!q){render(pages.slice(0,9).map(([name,href,group])=>({name,href,type:'Quick Link',meta:group,score:0})));return}
  // Page matches paint immediately; network and parsing never block opening search.
  const out=pageHits(q);
  render(out);
  if(q.length<2)return;
  let data;
  try{data=await searchIndex()}catch{
    if(request===revision&&layer.classList.contains('open')){
      render(out);
      results.insertAdjacentHTML('beforeend','<div class="rus-search-empty">Team, player and game search is temporarily unavailable. Try again.</div>');
    }
    return;
  }
  if(request!==revision||!layer.classList.contains('open'))return;
  for(const t of data.teams)if(t.hay.includes(q))out.push({name:t.team,href:`team.html?team=${encodeURIComponent(t.team)}`,type:'Team',meta:[t.classification,t.region].filter(Boolean).join(' • '),score:t.hay.startsWith(q)?0:1});
  for(const p of data.players)if(p.hay.includes(q))out.push({name:p.n,href:`player.html?id=${encodeURIComponent(p.id)}&season=${p.y}`,type:'Player',meta:playerMeta(p),score:p.nameKey.startsWith(q)?.5:1.5,season:p.y});
  for(const g of data.games)if(g.hay.includes(q))out.push({name:`${g.away} at ${g.home}`,href:`game.html?${new URLSearchParams({date:g.date,away:g.away,home:g.home})}`,type:'Game',meta:g.date,score:2});
  out.sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name)||(b.season||0)-(a.season||0));
  render(out.slice(0,24));
}
function render(items){results.innerHTML=items.length?items.map(x=>`<a class="rus-search-result" href="${esc(x.href)}"><span><b>${esc(x.name)}</b><small>${esc(x.meta||'')}</small></span><span class="rus-search-type">${esc(x.type)}</span></a>`).join(''):'<div class="rus-search-empty">No matching teams, players, games or pages.</div>'}
function open(preset=''){clearTimeout(timer);layer.classList.add('open');layer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';input.value=String(preset||'');search(input.value);requestAnimationFrame(()=>input.focus())}
function close(){clearTimeout(timer);revision++;layer.classList.remove('open');layer.setAttribute('aria-hidden','true');document.body.style.overflow=''}
window.RUSOpenSearch=open;
function build(){addStyles();const head=document.querySelector('header .header-content');if(!head)return;const b=document.createElement('button');b.type='button';b.className='rus-search-trigger';b.setAttribute('aria-label','Search Rural Utah Sports');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg><span>Search</span>';const fav=head.querySelector('.rus-favorites-button');fav?head.insertBefore(b,fav):head.appendChild(b);layer=document.createElement('div');layer.className='rus-search-layer';layer.setAttribute('aria-hidden','true');layer.innerHTML='<div class="rus-search-panel" role="dialog" aria-modal="true" aria-label="Site search"><div class="rus-search-head"><input class="rus-search-input" type="search" autocomplete="off" placeholder="Search teams, players, games, pages…"><button class="rus-search-close" type="button" aria-label="Close search">×</button></div><div class="rus-search-results"></div><div class="rus-search-hint">Search Rural Utah Sports • Press / to open on desktop</div></div>';document.body.appendChild(layer);input=layer.querySelector('.rus-search-input');results=layer.querySelector('.rus-search-results');b.addEventListener('click',()=>open());layer.querySelector('.rus-search-close').addEventListener('click',close);layer.addEventListener('click',e=>{if(e.target===layer)close()});input.addEventListener('input',()=>{clearTimeout(timer);revision++;timer=setTimeout(()=>search(input.value),90)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&layer.classList.contains('open'))close();if(e.key==='/'&&!layer.classList.contains('open')&&!/input|textarea|select/i.test(document.activeElement?.tagName||'')){e.preventDefault();open()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
