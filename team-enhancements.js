(()=>{
'use strict';
if(document.querySelector('script[data-rus-team-enhancements-runtime]'))return;
const s=document.createElement('script');
s.src='team-enhancements-runtime.js?v=20260819-lcp1';
s.async=false;
s.dataset.rusTeamEnhancementsRuntime='1';
document.head.appendChild(s);
})();
