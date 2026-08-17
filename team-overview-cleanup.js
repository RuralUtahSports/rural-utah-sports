(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusTeamOverviewCleanup)return;window.__rusTeamOverviewCleanup=true;
function clean(){const box=document.getElementById('rusTeamStats');if(!box||box.dataset.rusCleaned==='1')return false;const details=[...box.querySelectorAll('.rus-ts-details')],overview=details.find(d=>d.querySelector(':scope > summary')?.textContent.trim().toLowerCase()==='overview');if(!overview)return false;const byLabel=new Map([...overview.querySelectorAll('.rus-ts-mini')].map(card=>[(card.querySelector('span')?.textContent||'').trim().toLowerCase(),card]));const hero=box.querySelector('.rus-ts-hero');if(hero){for(const label of ['games','allowed / game','scoring margin','yards / play']){const card=byLabel.get(label);if(!card)continue;const strong=card.querySelector('strong')?.textContent||'—',span=card.querySelector('span')?.textContent||label;const out=document.createElement('div');out.className='rus-ts-card';out.innerHTML=`<strong>${strong}</strong><span>${span}</span>`;hero.appendChild(out)}hero.style.gridTemplateColumns='repeat(4,minmax(0,1fr))'}overview.remove();box.dataset.rusCleaned='1';return true}
let tries=0;const timer=setInterval(()=>{if(clean()||++tries>100)clearInterval(timer)},100);
})();
