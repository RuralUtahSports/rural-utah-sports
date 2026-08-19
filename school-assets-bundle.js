(()=>{
'use strict';
const scorePage=/(?:^|\/)scoreboard\.html$/i.test(location.pathname);
const loadScoreboard=()=>{
  if(!scorePage||document.querySelector('script[data-rus-scoreboard-school-assets]'))return;
  const s=document.createElement('script');s.src='school-assets-scoreboard.js?v=20260818-perf4';s.async=true;s.dataset.rusScoreboardSchoolAssets='1';document.body.appendChild(s);
};
if(window.RUSSchoolAssets){loadScoreboard();return}
let core=[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0].endsWith('school-assets-core.js'));
if(!core){
  core=document.createElement('script');core.src='school-assets-core.js?v=20260818-perf4';core.async=true;core.dataset.rusSchoolAssetsCore='1';document.body.appendChild(core);
}
core.addEventListener('load',loadScoreboard,{once:true});
window.addEventListener('rus:school-assets-ready',loadScoreboard,{once:true});
})();
