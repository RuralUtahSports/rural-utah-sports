(()=>{
  if(window.__RUSSchoolLogoIntegration)return;window.__RUSSchoolLogoIntegration=true;
  const style=document.createElement('style');style.textContent=`
    .rus-card-logo-wrap{height:82px;display:flex;align-items:center;justify-content:center;margin:-2px 0 10px}
    .rus-card-logo{max-width:78px;max-height:78px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.35))}
    .hero-content{position:relative}.rus-hero-school-logo{position:absolute;right:28px;top:22px;width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}.hero-content.rus-has-school-logo{padding-right:175px}
    @media(max-width:700px){.rus-hero-school-logo{position:static;display:block;width:96px;height:96px;margin:0 auto 14px}.hero-content.rus-has-school-logo{padding-right:30px;text-align:center}}
  `;document.head.appendChild(style);
  const wait=async()=>{
    const A=window.RUSSchoolAssets;if(!A)return setTimeout(wait,80);
    await A.load();
    const addImg=(team,cls)=>{const img=document.createElement('img');img.className=cls;img.alt=`${team} logo`;img.loading='lazy';img.src=A.logoUrl(team);img.addEventListener('error',()=>img.remove(),{once:true});return img};
    const enhance=()=>{
      document.querySelectorAll('.team-card:not([data-rus-school-logo])').forEach(card=>{
        const name=card.querySelector('.team-name')?.textContent?.trim();if(!name||!A.isFootballTeam(name))return;card.dataset.rusSchoolLogo='1';const content=card.querySelector('.team-card-content');if(!content)return;const wrap=document.createElement('div');wrap.className='rus-card-logo-wrap';wrap.appendChild(addImg(name,'rus-card-logo'));content.insertBefore(wrap,content.firstChild);
      });
      document.querySelectorAll('.hero-content:not([data-rus-school-logo])').forEach(hero=>{
        const name=hero.querySelector('.team-title')?.textContent?.trim();if(!name||!A.isFootballTeam(name))return;hero.dataset.rusSchoolLogo='1';hero.classList.add('rus-has-school-logo');hero.appendChild(addImg(name,'rus-hero-school-logo'));
      });
    };
    enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  };
  wait();
})();