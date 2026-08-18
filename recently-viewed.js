(()=>{
'use strict';
const KEY='rus-recent-pages-v1',MAX=8;
const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const allowed=new Set(['team.html','player.html','game.html','rankings.html','standings.html','scoreboard.html','storylines.html','elo.html','scorigami.html','records.html','playoff-picture.html','my-teams.html']);
if(!allowed.has(file))return;
const params=new URLSearchParams(location.search);
let title=document.title.replace(/\s*\|\s*Rural Utah Sports.*$/i,'').trim();
if(file==='team.html'&&params.get('team'))title=params.get('team');
if(file==='player.html'&&params.get('id'))title=title||'Player Profile';
if(file==='game.html'){
  const away=params.get('away'),home=params.get('home');
  if(away&&home)title=`${away} at ${home}`;
}
const item={url:file+(location.search||''),title:title||'Rural Utah Sports',type:file.replace('.html',''),at:Date.now()};
try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'[]'),list=Array.isArray(raw)?raw:[];
  const out=[item,...list.filter(x=>x&&x.url!==item.url)].slice(0,MAX);
  localStorage.setItem(KEY,JSON.stringify(out));
}catch{}
})();
