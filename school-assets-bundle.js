(()=>{
'use strict';
const scorePage=/(?:^|\/)scoreboard\.html$/i.test(location.pathname),gamePage=/(?:^|\/)game\.html$/i.test(location.pathname),rankingsPage=/(?:^|\/)rankings\.html$/i.test(location.pathname);
const loadScoreboard=()=>{
  if(!scorePage||document.querySelector('script[data-rus-scoreboard-school-assets]'))return;
  const s=document.createElement('script');s.src='school-assets-scoreboard.js?v=20260818-perf4';s.async=true;s.dataset.rusScoreboardSchoolAssets='1';document.body.appendChild(s);
};
const loadGameVisuals=()=>{
  if(!gamePage||document.querySelector('script[data-rus-game-center-color-layout]'))return;
  const s=document.createElement('script');s.src='game-center-color-layout.js?v=20260819-colors2-previewpin';s.async=true;s.dataset.rusGameCenterColorLayout='1';document.body.appendChild(s);
};
const loadGameLiveStatus=()=>{
  if(!gamePage||document.querySelector('script[data-rus-game-live-status-fix]'))return;
  const s=document.createElement('script');s.src='game-live-status-fix.js?v=20260820-live-final1';s.async=true;s.dataset.rusGameLiveStatusFix='1';document.body.appendChild(s);
};
const loadRankingsSponsorRemoval=()=>{
  if(!rankingsPage||document.querySelector('script[data-rus-rankings-sponsor-removal]'))return;
  const s=document.createElement('script');s.src='rankings-sponsor-removal.js?v=20260819-remove-jh3d';s.async=true;s.dataset.rusRankingsSponsorRemoval='1';document.body.appendChild(s);
};
const loadOverallRankingsShare=()=>{
  if(!rankingsPage||window.__rusOverallDirectShareBuild==='ios3-overall-featured-top3-logos'||document.querySelector('script[data-rus-rankings-overall-share]'))return;
  const s=document.createElement('script');s.src='rankings-overall-share-direct-v3.js?v=20260820-ios3-overall-featured-top3-logos';s.async=true;s.dataset.rusRankingsOverallShare='1';document.body.appendChild(s);
};
const loadExtras=()=>{loadScoreboard();loadGameVisuals();loadGameLiveStatus();loadRankingsSponsorRemoval();loadOverallRankingsShare()};
if(window.RUSSchoolAssets){loadExtras();return}
let core=[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0].endsWith('school-assets-core.js'));
if(!core){
  core=document.createElement('script');core.src='school-assets-core.js?v=20260818-perf4';core.async=true;core.dataset.rusSchoolAssetsCore='1';document.body.appendChild(core);
}
core.addEventListener('load',loadExtras,{once:true});
window.addEventListener('rus:school-assets-ready',loadExtras,{once:true});
loadGameVisuals();loadGameLiveStatus();loadRankingsSponsorRemoval();loadOverallRankingsShare();
})();
