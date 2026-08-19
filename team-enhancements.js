(()=>{
'use strict';
if(!document.querySelector('script[data-rus-team-enhancements-runtime]')){const s=document.createElement('script');s.src='team-enhancements-runtime.js?v=20260819-lcp1';s.async=false;s.dataset.rusTeamEnhancementsRuntime='1';document.head.appendChild(s)}
for(const src of ['team-logo-header.js?v=20260819-sponsor1','school-sponsor.js?v=20260819-sponsor1']){if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))continue;const s=document.createElement('script');s.src=src;s.async=true;document.head.appendChild(s)}
})();
