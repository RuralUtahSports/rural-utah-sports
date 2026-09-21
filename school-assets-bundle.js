(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const isScoreboard=path==='scoreboard.html';
const isGame=path==='game.html';
const isRankings=path==='rankings.html';

function add(src,key){
  const attr='data-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());
  const existing=document.querySelector(`script[${attr}]`)||[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0]===src.split('?')[0]);
  if(existing)return existing;
  const s=document.createElement('script');
  s.src=src;
  s.async=true;
  s.dataset[key]='1';
  document.body.appendChild(s);
  return s;
}

function loadExtras(){
  if(isScoreboard)add('school-assets-scoreboard.js?v=20260827-week3-ranks1','rusScoreboardSchoolAssets');
  if(isGame){
    add('game-center-color-layout.js?v=20260820-midwidth1','rusGameCenterColorLayout');
    add('game-live-status-fix.js?v=20260820-supabase-live1','rusGameLiveStatusFix');
  }
  if(isRankings){
    add('rankings-sponsor-removal.js?v=20260823-cardfix3','rusRankingsSponsorRemoval');
    add('rankings-overall-share-direct-v3.js?v=20260820-ios3-overall-featured-top3-logos','rusRankingsOverallShare');
  }
}

if(window.RUSSchoolAssets){
  loadExtras();
  return;
}

let core=[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0].endsWith('school-assets-core.js'));
if(!core)core=add('school-assets-core.js?v=20260821-emery-exact4','rusSchoolAssetsCore');
core?.addEventListener('load',loadExtras,{once:true});
window.addEventListener('rus:school-assets-ready',loadExtras,{once:true});
})();
