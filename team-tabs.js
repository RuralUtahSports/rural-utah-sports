(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
const tabs=[['overview','Overview'],['seasons','Seasons'],['playoffs','Playoffs'],['games','Games'],['elo','ELO'],['history','History']];
function start(){console.log('RUS team tabs ready',tabs.length)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();