(()=>{
  if(window.__RUSSchoolLogoIntegration)return;window.__RUSSchoolLogoIntegration=true;
  const style=document.createElement('style');style.textContent=`
    .rus-card-logo-wrap{height:82px;display:flex;align-items:center;justify-content:center;margin:-2px 0 10px}
    .rus-card-logo{max-width:78px;max-height:78px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.35))}
    .hero-content{position:relative}.rus-hero-school-logo{position:absolute;right:28px;top:22px;width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}.hero-content.rus-has-school-logo{padding-right:175px}
    .rus-ranking-school-logo{width:34px;height:34px;object-fit:contain;flex:0 0 34px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));margin-right:8px}
    .rus-standings-school-logo{width:30px;height:30px;object-fit:contain;flex:0 0 30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
    @media(max-width:700px){.rus-hero-school-logo{position:static;display:block;width:96px;height:96px;margin:0 auto 14px}.hero-content.rus-has-school-logo{padding-right:30px;text-align:center}.rus-ranking-school-logo{width:30px;height:30px;flex-basis:30px;margin-right:6px}.rus-standings-school-logo{width:27px;height:27px;flex-basis:27px}}
  `;document.head.appendChild(style);
  const wait=async()=>{
    const A=window.RUSSchoolAssets;if(!A)return setTimeout(wait,80);
    await A.load();
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    const addImg=(team,cls)=>{const img=document.createElement('img');img.className=cls;img.alt=`${team} logo`;img.loading='lazy';img.src=A.logoUrl(team);img.addEventListener('error',()=>img.remove(),{once:true});return img};
    const enhance=()=>{
      document.querySelectorAll('.team-card:not([data-rus-school-logo])').forEach(card=>{
        const name=card.querySelector('.team-name')?.textContent?.trim();if(!name||!A.isFootballTeam(name))return;card.dataset.rusSchoolLogo='1';const content=card.querySelector('.team-card-content');if(!content)return;const wrap=document.createElement('div');wrap.className='rus-card-logo-wrap';wrap.appendChild(addImg(name,'rus-card-logo'));content.insertBefore(wrap,content.firstChild);
      });
      document.querySelectorAll('.hero-content:not([data-rus-school-logo])').forEach(hero=>{
        const name=hero.querySelector('.team-title')?.textContent?.trim();if(!name||!A.isFootballTeam(name))return;hero.dataset.rusSchoolLogo='1';hero.classList.add('rus-has-school-logo');hero.appendChild(addImg(name,'rus-hero-school-logo'));
      });
      if(path==='rankings.html')document.querySelectorAll('.rank-row .team-link:not([data-rus-school-logo]),.state25-row .team-link:not([data-rus-school-logo])').forEach(link=>{
        const name=(link.querySelector('.team-pill')?.textContent||link.textContent||'').trim();if(!name||!A.isFootballTeam(name))return;link.dataset.rusSchoolLogo='1';link.insertBefore(addImg(name,'rus-ranking-school-logo'),link.firstChild);
      });
      if(path==='standings.html')document.querySelectorAll('.standings .team-link:not([data-rus-school-logo])').forEach(link=>{
        const name=(link.textContent||'').trim();if(!name||!A.isFootballTeam(name))return;link.dataset.rusSchoolLogo='1';const img=addImg(name,'rus-standings-school-logo'),swatch=link.querySelector('.swatch');if(swatch&&swatch.nextSibling)link.insertBefore(img,swatch.nextSibling);else if(swatch)link.appendChild(img);else link.insertBefore(img,link.firstChild);
      });
    };
    enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  };
  wait();
})();