(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusTeamOverviewCleanup)return;window.__rusTeamOverviewCleanup=true;

function newestTeamStats(){
  const boxes=[...document.querySelectorAll('[id="rusTeamStats"]')];
  if(!boxes.length)return null;
  // If another enhancer mounts Team Stats again, keep the newest copy so the
  // page always retains the freshest data and remove every older duplicate.
  const keep=boxes[boxes.length-1];
  for(const box of boxes)if(box!==keep)box.remove();
  return keep;
}

function clean(){
  const box=newestTeamStats();
  if(!box)return false;
  if(box.dataset.rusCleaned==='1')return true;
  const details=[...box.querySelectorAll('.rus-ts-details')],overview=details.find(d=>d.querySelector(':scope > summary')?.textContent.trim().toLowerCase()==='overview');
  if(overview){
    const byLabel=new Map([...overview.querySelectorAll('.rus-ts-mini')].map(card=>[(card.querySelector('span')?.textContent||'').trim().toLowerCase(),card]));
    const hero=box.querySelector('.rus-ts-hero');
    if(hero){
      for(const label of ['games','allowed / game','scoring margin','yards / play']){
        const card=byLabel.get(label);if(!card)continue;
        const strong=card.querySelector('strong')?.textContent||'—',span=card.querySelector('span')?.textContent||label;
        const out=document.createElement('div');out.className='rus-ts-card';out.innerHTML=`<strong>${strong}</strong><span>${span}</span>`;hero.appendChild(out)
      }
      hero.style.gridTemplateColumns='repeat(4,minmax(0,1fr))'
    }
    overview.remove();
  }
  box.dataset.rusCleaned='1';
  return true;
}

// The team page has several async enhancers. Keep watching the page so a late
// re-render cannot append another Team Stats section after the first cleanup.
const root=document.getElementById('page')||document.body;
let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;clean()});
});
observer.observe(root,{childList:true,subtree:true});

let tries=0;const timer=setInterval(()=>{if(clean()||++tries>100)clearInterval(timer)},100);
clean();
})();
