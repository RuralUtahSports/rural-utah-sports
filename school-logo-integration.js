(()=>{
'use strict';
function start(){
  if(window.__RUSSchoolLogoIntegrationV3)return;
  const A=window.RUSSchoolAssets;if(!A)return;
  window.__RUSSchoolLogoIntegrationV3=true;
  const main=document.querySelector('main')||document.body;
  const nodes=(root,selector)=>{
    const out=[];if(root?.nodeType===1&&root.matches?.(selector))out.push(root);
    root?.querySelectorAll?.(selector).forEach(el=>out.push(el));return out;
  };
  const teamFromLink=el=>{const a=el?.closest?.('a[href*="team.html"]');if(!a)return'';try{return new URL(a.href,location.href).searchParams.get('team')||''}catch{return''}};
  const teamFromImage=img=>{
    const explicit=img.dataset.team||img.getAttribute('data-school')||img.getAttribute('data-team-name');if(explicit)return explicit;
    const alt=(img.alt||'').replace(/\s+(school\s+)?logo$/i,'').trim();if(alt&&A.hasCustomLogo?.(alt))return alt;
    const linked=teamFromLink(img);if(linked)return linked;
    const parent=img.closest('.team-row,.team-card,.rank-row,.state25-row,.small-school-row,.standings-row,.standing-row,.award-card,.player-card,.game');
    const n=parent?.querySelector('.team-name,.team-link,.team-title,[data-team]');
    return n?(n.dataset?.team||n.textContent?.trim()||''):'';
  };
  const replaceExisting=root=>nodes(root,'img').forEach(img=>{
    const team=teamFromImage(img);if(!team)return;
    const url=A.logoUrl?.(team)||'';if(url&&img.getAttribute('src')!==url){img.src=url;img.srcset='';img.dataset.rusCustomLogo='1'}
  });
  const style=document.createElement('style');style.id='rus-school-logo-style';style.textContent='.rus-card-logo-wrap{height:82px;display:flex;align-items:center;justify-content:center;margin:-2px 0 10px;overflow:visible}.rus-card-logo{max-width:78px;max-height:78px;object-fit:contain}.rus-card-logo[data-team="Ridgeline"]{width:150px;height:78px;max-width:100%;max-height:78px;object-fit:contain;object-position:center;display:block}.rus-ranking-school-logo{width:34px;height:34px;object-fit:contain;flex:0 0 34px;margin-right:8px}.rus-standings-school-logo{width:30px;height:30px;object-fit:contain;flex:0 0 30px;margin-right:7px}.rank-card{border-radius:12px!important;background:#0b0b0b!important}.rank-card .rank-head{padding:13px 16px!important;background:linear-gradient(180deg,#171717,#101010)!important}.rank-card .rank-head h2{font-size:21px!important;letter-spacing:.5px}.rank-card .rank-row{grid-template-columns:44px minmax(0,1fr) auto!important;gap:8px!important;min-height:56px!important;padding:8px 12px 8px 8px!important;border-left-width:4px!important;background:linear-gradient(90deg,var(--team-tint,rgba(255,255,255,.04)) 0%,rgba(0,0,0,0) 46%)!important}.rank-card .rank-row:hover{background:linear-gradient(90deg,var(--team-tint-strong,rgba(255,255,255,.08)) 0%,rgba(0,0,0,0) 58%)!important}.rank-card .rank-num{width:32px!important;height:32px!important;font-size:14px!important}.rank-card .team-link{gap:0!important;min-width:0!important}.rank-card .rus-ranking-school-logo{width:32px;height:32px;flex-basis:32px;margin-right:9px}.rank-card .team-pill{background:transparent!important;color:#fff!important;box-shadow:none!important;padding:0!important;min-height:0!important;border-radius:0!important;font-size:13px!important;letter-spacing:.2px;white-space:normal}.rank-card .team-class{font-size:9px!important;color:#777!important;background:#171717;border:1px solid #2b2b2b;border-radius:999px;padding:4px 7px}@media(max-width:700px){.rus-ranking-school-logo{width:30px;height:30px;flex-basis:30px}.rus-standings-school-logo{width:27px;height:27px;flex-basis:27px}.rank-card .rank-head{padding:11px 12px!important}.rank-card .rank-head h2{font-size:19px!important}.rank-card .rank-row{grid-template-columns:38px minmax(0,1fr)!important;min-height:50px!important;padding:6px 9px 6px 7px!important;gap:5px!important}.rank-card .rank-num{width:29px!important;height:29px!important;font-size:13px!important}.rank-card .rus-ranking-school-logo{width:28px;height:28px;flex-basis:28px;margin-right:8px}.rank-card .team-pill{font-size:12px!important}.rank-card .team-class{display:none!important}}';document.head.appendChild(style);
  const addImg=(team,cls)=>{const img=document.createElement('img');img.className=cls;img.alt=`${team} logo`;img.dataset.team=team;img.loading='lazy';img.decoding='async';img.src=A.logoUrl?.(team)||'';return img};
  const enhance=root=>{
    replaceExisting(root);
    nodes(root,'.team-card:not([data-rus-school-logo])').forEach(card=>{const name=card.querySelector('.team-name')?.textContent?.trim(),content=card.querySelector('.team-card-content');if(!name||!content)return;const url=A.logoUrl?.(name)||'';if(!url)return;card.dataset.rusSchoolLogo='1';const wrap=document.createElement('div');wrap.className='rus-card-logo-wrap';wrap.appendChild(addImg(name,'rus-card-logo'));content.insertBefore(wrap,content.firstChild)});
    nodes(root,'.rank-row .team-link:not([data-rus-school-logo]),.state25-row .team-link:not([data-rus-school-logo]),.small-school-row .team-link:not([data-rus-school-logo])').forEach(link=>{const name=teamFromLink(link)||link.textContent.trim(),url=A.logoUrl?.(name)||'';if(!name||!url)return;link.dataset.rusSchoolLogo='1';link.insertBefore(addImg(name,'rus-ranking-school-logo'),link.firstChild)});
    nodes(root,'.standings .team-link:not([data-rus-school-logo])').forEach(link=>{const name=teamFromLink(link)||link.textContent.trim(),url=A.logoUrl?.(name)||'';if(!name||!url)return;link.dataset.rusSchoolLogo='1';link.insertBefore(addImg(name,'rus-standings-school-logo'),link.firstChild)});
    replaceExisting(root);
  };
  const pending=new Set();let queued=false;
  const queue=root=>{if(root?.nodeType===1)pending.add(root);if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const roots=[...pending];pending.clear();roots.forEach(enhance)})};
  Promise.resolve(A.load?.()).finally(()=>queue(main));queue(main);
  const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)queue(n)})));
  observer.observe(main,{childList:true,subtree:true});
  window.addEventListener('pageshow',()=>queue(main),{passive:true});
}
if(window.RUSSchoolAssets)start();else window.addEventListener('rus:school-assets-ready',start,{once:true});
})();
