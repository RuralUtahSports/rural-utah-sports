(()=>{
'use strict';
if(window.__RUS_SHARE_PREVIEW_LINKS__)return;window.__RUS_SHARE_PREVIEW_LINKS__=true;
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const aliases={'CEDAR CITY':'CEDAR','GRAND COUNTY':'GRAND','MONUMENT VAL':'MONUMENT VALLEY','LAYTON CHRISTIAN ACADEMY':'LAYTON CHRISTIAN','AMERICAN LEADERSHIP ACADEMY':'ALA'};
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const rankKey=v=>aliases[norm(v)]||norm(v);
const compact=v=>rankKey(v).replace(/[^A-Z0-9]/g,'');
let mapPromise=null;
function loadMap(){return mapPromise||(mapPromise=fetch(`share-preview-map.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null))}
function gameKey(q){const date=q.get('date')||'',away=q.get('away')||q.get('team1')||'',home=q.get('home')||q.get('team2')||'';return`${date}|${compact(away)}|${compact(home)}`}
async function currentPreviewUrl(){const data=await loadMap();if(!data)return location.href;const q=new URLSearchParams(location.search);let rel='';if(path==='team.html'){const team=q.get('team');if(team)rel=data.team?.[rankKey(team)]||''}else if(path==='player.html'){const id=q.get('id');if(id)rel=data.player?.[id]||''}else if(path==='game.html'){rel=data.game?.[gameKey(q)]||''}return rel?new URL(rel,location.href).href:location.href}
window.RUSGetShareURL=currentPreviewUrl;
async function copy(url,button){try{await navigator.clipboard.writeText(url);if(button){const old=button.textContent;button.textContent='Preview Link Copied';setTimeout(()=>button.textContent=old,1500)}}catch{prompt('Copy this link:',url)}}
async function handle(e){const button=e.target.closest?.('[data-rus-share],#rusShareView');if(!button)return;e.preventDefault();e.stopImmediatePropagation();const url=await currentPreviewUrl();if(button.matches('[data-rus-share]')&&navigator.share){try{await navigator.share({title:document.title,text:document.title,url});return}catch(err){if(err?.name==='AbortError')return}}await copy(url,button)}
document.addEventListener('click',handle,true);
async function mark(){const url=await currentPreviewUrl();if(url===location.href)return;document.querySelectorAll('[data-rus-share],#rusShareView').forEach(b=>{b.dataset.rusBrandedShare='1';b.title='Shares a branded Rural Utah Sports preview link'});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mark,500),{once:true});else setTimeout(mark,500);
})();
