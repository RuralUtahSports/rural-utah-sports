(()=>{
'use strict';
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
function styles(){
  if(document.getElementById('rus-school-sponsor-style'))return;
  const s=document.createElement('style');s.id='rus-school-sponsor-style';s.textContent=`
.rus-school-sponsor{margin:-12px 0 28px;background:#0a0a0a;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}.rus-school-sponsor-main{display:flex;align-items:center;gap:14px;min-width:0}.rus-school-sponsor-logo{width:70px;height:70px;object-fit:contain;background:#fff;border-radius:8px;padding:6px;flex:0 0 70px}.rus-school-sponsor-kicker{color:#F14D07;font-size:9px;font-weight:1000;letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px}.rus-school-sponsor-name{font-size:19px;font-weight:1000;color:#fff;line-height:1.1}.rus-school-sponsor-copy{color:#999;font-size:11px;margin-top:5px;line-height:1.4}.rus-school-sponsor-link{display:inline-block;background:#F14D07;color:#000;text-decoration:none;border-radius:6px;padding:10px 13px;font-size:9px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rus-school-sponsor-placeholder{border-style:dashed;background:linear-gradient(90deg,#0a0a0a,#111)}.rus-school-sponsor-placeholder .rus-school-sponsor-logo{display:grid;place-items:center;background:#171717;color:#F14D07;border:1px dashed #555;font-size:24px;font-weight:1000}.rus-school-sponsor-placeholder .rus-school-sponsor-name{color:#ddd}@media(max-width:650px){.rus-school-sponsor{align-items:stretch;flex-direction:column;margin-top:-8px}.rus-school-sponsor-link{text-align:center;width:100%}.rus-school-sponsor-logo{width:58px;height:58px;flex-basis:58px}}
`;document.head.appendChild(s);
}
function render(entry){
  const hero=document.querySelector('#page .hero');
  if(!hero||document.getElementById('rusSchoolSponsor'))return false;
  const sponsored=activeSponsor(entry),placeholder=entry?.mode==='placeholder';
  if(!sponsored&&!placeholder)return true;
  styles();
  const el=document.createElement('aside');el.id='rusSchoolSponsor';el.className=`rus-school-sponsor${placeholder?' rus-school-sponsor-placeholder':''}`;
  if(sponsored){
    const logo=entry.logo?`<img class="rus-school-sponsor-logo" src="${esc(entry.logo)}" alt="${esc(entry.business||'Sponsor')} logo" loading="lazy" decoding="async">`:'';
    const link=entry.website?`<a class="rus-school-sponsor-link" href="${esc(entry.website)}" target="_blank" rel="noopener sponsored">Visit Sponsor →</a>`:'';
    el.innerHTML=`<div class="rus-school-sponsor-main">${logo}<div><div class="rus-school-sponsor-kicker">${esc(entry.label||'Official RUS School Sponsor')}</div><div class="rus-school-sponsor-name">Presented by ${esc(entry.business||'Sponsor')}</div>${entry.tagline?`<div class="rus-school-sponsor-copy">${esc(entry.tagline)}</div>`:''}</div></div>${link}`;
  }else{
    const link=entry.contactUrl?`<a class="rus-school-sponsor-link" href="${esc(entry.contactUrl)}" target="_blank" rel="noopener">${esc(entry.cta||'Sponsor This School')} →</a>`:'';
    el.innerHTML=`<div class="rus-school-sponsor-main"><div class="rus-school-sponsor-logo" aria-hidden="true">RUS</div><div><div class="rus-school-sponsor-kicker">${esc(entry.label||'School Sponsorship Available')}</div><div class="rus-school-sponsor-name">${esc(entry.headline||'Your Business Here')}</div><div class="rus-school-sponsor-copy">${esc(entry.message||'Sponsor this school on Rural Utah Sports.')}</div></div></div>${link}`;
  }
  hero.insertAdjacentElement('afterend',el);return true;
}
async function start(){
  const key=teamKey();if(!key)return;
  let data={};try{const r=await fetch(`school-sponsors.json?v=${Date.now()}`,{cache:'no-store'});if(r.ok)data=await r.json()}catch{}
  const entry=data[key]||null;if(!entry)return;
  if(render(entry))return;
  const root=document.getElementById('page');if(!root)return;
  const observer=new MutationObserver(()=>{if(render(entry))observer.disconnect()});observer.observe(root,{childList:true,subtree:true});
}
start();
})();
