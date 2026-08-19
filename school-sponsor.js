(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='team.html')return;
if(window.__rusSchoolSponsorLoaded)return;window.__rusSchoolSponsorLoaded=true;
const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const aliases={AMERICANLEADERSHIPACADEMY:'ALA'};
const teamKey=()=>aliases[norm(new URLSearchParams(location.search).get('team')||'')]||norm(new URLSearchParams(location.search).get('team')||'');
const validDate=d=>{const t=Date.parse(String(d||''));return Number.isFinite(t)?t:null};
function activeSponsor(s){
  if(!s||s.mode!=='sponsor')return false;
  const now=Date.now(),start=validDate(s.startDate),end=validDate(s.endDate);
  return (!start||now>=start)&&(!end||now<=end+86399999);
}
function orderHref(entry){
  const email=String(entry?.email||'').trim();
  if(!email)return'';
  const subject=`${entry.business||'Sponsor'} order inquiry`;
  if(window.matchMedia?.('(min-width:901px)').matches){
    return`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`;
  }
  return`mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
function externalAttrs(href){return /^https?:\/\//i.test(String(href||''))?' target="_blank" rel="noopener"':''}
function styles(){
  if(document.getElementById('rus-school-sponsor-style'))return;
  const s=document.createElement('style');s.id='rus-school-sponsor-style';s.textContent=`
.rus-team-hero-sponsor{margin-top:18px;background:#0b0b0b;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0}.rus-team-hero-sponsor-main{display:flex;align-items:center;gap:14px;min-width:0}.rus-team-hero-sponsor-logo-link{display:block;flex:0 0 88px;line-height:0;border-radius:8px;position:relative;z-index:2;cursor:pointer}.rus-team-hero-sponsor-logo-link:focus-visible{outline:2px solid #F14D07;outline-offset:3px}.rus-team-hero-sponsor-logo{display:block;width:88px;height:88px;object-fit:contain;max-width:none;background:transparent;border:0;border-radius:0;padding:0;pointer-events:none}.rus-team-hero-sponsor-copy{min-width:0}.rus-team-hero-sponsor-kicker{color:#F14D07;font-size:9px;font-weight:1000;letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px}.rus-team-hero-sponsor-name{font-size:17px;font-weight:1000;color:#fff;line-height:1.15}.rus-team-hero-sponsor-tagline{color:#999;font-size:10px;margin-top:4px;line-height:1.35}.rus-team-hero-sponsor-order-note{color:#ddd;font-size:10px;font-weight:800;margin-top:6px;line-height:1.35}.rus-team-hero-sponsor-link{display:inline-block;background:#F14D07;color:#000;text-decoration:none;border-radius:6px;padding:9px 12px;font-size:9px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rus-school-sponsor{margin:-12px 0 28px;background:#0a0a0a;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}.rus-school-sponsor-main{display:flex;align-items:center;gap:14px;min-width:0}.rus-school-sponsor-logo{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:8px;padding:6px;flex:0 0 70px}.rus-school-sponsor-kicker{color:#F14D07;font-size:9px;font-weight:1000;letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px}.rus-school-sponsor-name{font-size:19px;font-weight:1000;color:#fff;line-height:1.1}.rus-school-sponsor-copy{color:#999;font-size:11px;margin-top:5px;line-height:1.4}.rus-school-sponsor-link{display:inline-block;background:#F14D07;color:#000;text-decoration:none;border-radius:6px;padding:10px 13px;font-size:9px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rus-school-sponsor-placeholder{border-style:dashed;background:linear-gradient(90deg,#0a0a0a,#111)}.rus-school-sponsor-placeholder .rus-school-sponsor-logo{display:grid;place-items:center;background:#171717;color:#F14D07;border:1px dashed #555;font-size:24px;font-weight:1000}.rus-school-sponsor-placeholder .rus-school-sponsor-name{color:#ddd}@media(max-width:650px){.rus-team-hero-sponsor{align-items:stretch;flex-direction:column;margin-top:14px}.rus-team-hero-sponsor-main{align-items:center}.rus-team-hero-sponsor-logo-link{flex-basis:72px}.rus-team-hero-sponsor-logo{width:72px;height:72px}.rus-team-hero-sponsor-link{text-align:center;width:100%}.rus-school-sponsor{align-items:stretch;flex-direction:column;margin-top:-8px}.rus-school-sponsor-link{text-align:center;width:100%}.rus-school-sponsor-logo{width:58px;height:58px;flex-basis:58px}}
`;document.head.appendChild(s);
}
function renderSponsored(entry,hero){
  if(document.getElementById('rusTeamHeroSponsor'))return true;
  const content=hero.querySelector('.hero-content');if(!content)return false;
  styles();
  const el=document.createElement('aside');el.id='rusTeamHeroSponsor';el.className='rus-team-hero-sponsor';
  const mail=orderHref(entry),attrs=externalAttrs(mail);
  const logoImg=entry.logo?`<img class="rus-team-hero-sponsor-logo" src="${esc(entry.logo)}" alt="${esc(entry.business||'Sponsor')} logo" loading="eager" decoding="async">`:'';
  const logo=logoImg?(mail?`<a class="rus-team-hero-sponsor-logo-link" href="${esc(mail)}"${attrs} aria-label="Email ${esc(entry.business||'sponsor')} to submit an order">${logoImg}</a>`:logoImg):'';
  const link=entry.website?`<a class="rus-team-hero-sponsor-link" href="${esc(entry.website)}" target="_blank" rel="noopener sponsored">Visit Sponsor →</a>`:'';
  const orderNote=mail&&entry.orderNote?`<div class="rus-team-hero-sponsor-order-note">${esc(entry.orderNote)}</div>`:'';
  el.innerHTML=`<div class="rus-team-hero-sponsor-main">${logo}<div class="rus-team-hero-sponsor-copy"><div class="rus-team-hero-sponsor-kicker">${esc(entry.label||'Official RUS School Sponsor')}</div><div class="rus-team-hero-sponsor-name">Presented by ${esc(entry.business||'Sponsor')}</div>${entry.tagline?`<div class="rus-team-hero-sponsor-tagline">${esc(entry.tagline)}</div>`:''}${orderNote}</div></div>${link}`;
  const stats=content.querySelector('.stats');if(stats)content.insertBefore(el,stats);else content.appendChild(el);return true;
}
function renderPlaceholder(entry,hero){
  if(document.getElementById('rusSchoolSponsor'))return true;
  styles();
  const el=document.createElement('aside');el.id='rusSchoolSponsor';el.className='rus-school-sponsor rus-school-sponsor-placeholder';
  const link=entry.contactUrl?`<a class="rus-school-sponsor-link" href="${esc(entry.contactUrl)}" target="_blank" rel="noopener">${esc(entry.cta||'Sponsor This School')} →</a>`:'';
  el.innerHTML=`<div class="rus-school-sponsor-main"><div class="rus-school-sponsor-logo" aria-hidden="true">RUS</div><div><div class="rus-school-sponsor-kicker">${esc(entry.label||'School Sponsorship Available')}</div><div class="rus-school-sponsor-name">${esc(entry.headline||'Your Business Here')}</div><div class="rus-school-sponsor-copy">${esc(entry.message||'Sponsor this school on Rural Utah Sports.')}</div></div></div>${link}`;
  hero.insertAdjacentElement('afterend',el);return true;
}
function render(entry){
  const hero=document.querySelector('#page .hero');if(!hero)return false;
  if(activeSponsor(entry))return renderSponsored(entry,hero);
  if(entry?.mode==='placeholder')return renderPlaceholder(entry,hero);
  return true;
}
async function start(){
  const key=teamKey();if(!key)return;
  let data={};try{const r=await fetch(`school-sponsors.json?v=${Date.now()}`,{cache:'no-store'});if(r.ok)data=await r.json()}catch{}
  const entry=data[key]||null;if(!entry)return;
  if(render(entry))return;
  const root=document.getElementById('page');if(!root)return;
  const observer=new MutationObserver(()=>{if(render(entry))observer.disconnect()});observer.observe(root,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);
}
function boot(){start();window.addEventListener('pageshow',()=>setTimeout(start,0),{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
