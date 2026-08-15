(()=>{
  if(window.__RUSSchoolLogoIntegrationV2)return;window.__RUSSchoolLogoIntegrationV2=true;
  const CUSTOM={
    'GREEN CANYON':'school-logos/green-canyon.svg','HILLCREST':'school-logos/hillcrest.svg','KEARNS':'school-logos/kearns.svg',
    'LAYTON CHRISTIAN':'school-logos/layton-christian.svg','LAYTON CHRISTIAN ACADEMY':'school-logos/layton-christian.svg',
    'LONE PEAK':'school-logos/lone-peak.svg','MAPLE MOUNTAIN':'school-logos/maple-mountain.svg','MILFORD':'school-logos/milford.svg',
    'MILLARD':'school-logos/millard.svg','MORGAN':'school-logos/morgan.svg','OREM':'school-logos/orem.svg',
    'PROVIDENCE HALL':'school-logos/providence-hall.svg','RICH':'school-logos/rich.svg','SAN JUAN':'school-logos/san-juan.svg','VIEWMONT':'school-logos/viewmont.svg'
  };
  const norm=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,' ');
  const customUrl=t=>CUSTOM[norm(t)]||'';
  const teamFromLink=el=>{const a=el?.closest?.('a[href*="team.html"]');if(!a)return'';try{return new URL(a.href,location.href).searchParams.get('team')||''}catch{return''}};
  const teamFromImage=img=>{
    const explicit=img.dataset.team||img.getAttribute('data-school')||img.getAttribute('data-team-name');if(explicit)return explicit;
    const alt=(img.alt||'').replace(/\s+(school\s+)?logo$/i,'').trim();if(customUrl(alt))return alt;
    const linkTeam=teamFromLink(img);if(linkTeam)return linkTeam;
    const parent=img.closest('.team-row,.team-card,.rank-row,.state25-row,.small-school-row,.standings-row,.standing-row,.award-card,.player-card,.game');
    if(parent){
      const n=parent.querySelector('.team-name,.team-link,.team-title,[data-team]');
      if(n){const t=n.dataset?.team||n.textContent?.trim();if(customUrl(t))return t}
    }
    return'';
  };
  const replaceExisting=()=>document.querySelectorAll('img').forEach(img=>{const team=teamFromImage(img),url=customUrl(team);if(url&&img.getAttribute('src')!==url){img.src=url;img.srcset='';img.dataset.rusCustomLogo='1'}});
  const style=document.createElement('style');style.textContent='.rus-card-logo-wrap{height:82px;display:flex;align-items:center;justify-content:center;margin:-2px 0 10px}.rus-card-logo{max-width:78px;max-height:78px;object-fit:contain}.rus-ranking-school-logo{width:34px;height:34px;object-fit:contain;flex:0 0 34px;margin-right:8px}.rus-standings-school-logo{width:30px;height:30px;object-fit:contain;flex:0 0 30px;margin-right:7px}@media(max-width:700px){.rus-ranking-school-logo{width:30px;height:30px;flex-basis:30px}.rus-standings-school-logo{width:27px;height:27px;flex-basis:27px}}';document.head.appendChild(style);
  const waitAssets=()=>{
    const A=window.RUSSchoolAssets;
    if(A){
      const original=A.logoUrl?.bind(A);A.logoUrl=(team,entry)=>customUrl(team)||(original?original(team,entry):'');
      Promise.resolve(A.load?.()).finally(enhance);
    }else enhance();
  };
  const addImg=(team,cls)=>{const img=document.createElement('img');img.className=cls;img.alt=`${team} logo`;img.dataset.team=team;img.loading='lazy';img.src=customUrl(team)||(window.RUSSchoolAssets?.logoUrl?.(team)||'');return img};
  const enhance=()=>{
    replaceExisting();
    document.querySelectorAll('.team-card:not([data-rus-school-logo])').forEach(card=>{const name=card.querySelector('.team-name')?.textContent?.trim();if(!name)return;const url=customUrl(name)||(window.RUSSchoolAssets?.logoUrl?.(name)||'');if(!url)return;card.dataset.rusSchoolLogo='1';const content=card.querySelector('.team-card-content');if(!content)return;const wrap=document.createElement('div');wrap.className='rus-card-logo-wrap';wrap.appendChild(addImg(name,'rus-card-logo'));content.insertBefore(wrap,content.firstChild)});
    document.querySelectorAll('.rank-row .team-link:not([data-rus-school-logo]),.state25-row .team-link:not([data-rus-school-logo]),.small-school-row .team-link:not([data-rus-school-logo])').forEach(link=>{const name=teamFromLink(link)||link.textContent.trim();const url=customUrl(name)||(window.RUSSchoolAssets?.logoUrl?.(name)||'');if(!url)return;link.dataset.rusSchoolLogo='1';link.insertBefore(addImg(name,'rus-ranking-school-logo'),link.firstChild)});
    document.querySelectorAll('.standings .team-link:not([data-rus-school-logo])').forEach(link=>{const name=teamFromLink(link)||link.textContent.trim();const url=customUrl(name)||(window.RUSSchoolAssets?.logoUrl?.(name)||'');if(!url)return;link.dataset.rusSchoolLogo='1';link.insertBefore(addImg(name,'rus-standings-school-logo'),link.firstChild)});
    replaceExisting();
  };
  waitAssets();[100,400,1000,2200].forEach(ms=>setTimeout(enhance,ms));
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
})();