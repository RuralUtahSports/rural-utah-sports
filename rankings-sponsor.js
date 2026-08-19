(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='rankings.html')return;
const ID='rus-state25-sponsor',STYLE_ID='rus-state25-sponsor-style';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const dateValue=v=>{const t=Date.parse(String(v||''));return Number.isFinite(t)?t:null};
const active=s=>{if(!s||s.mode!=='sponsor')return false;const now=Date.now(),start=dateValue(s.startDate),end=dateValue(s.endDate);return(!start||now>=start)&&(!end||now<=end+86399999)};
const isMobile=()=>matchMedia('(max-width:700px)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
const emailHref=s=>{const email=String(s?.email||'').trim();if(!email)return'';const subject=encodeURIComponent(`${s.business||'Sponsor'} order inquiry`);return isMobile()?`mailto:${email}?subject=${subject}`:`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}`};
function styles(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${ID}{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 18px;background:#090909;border-bottom:1px solid #292929;border-left:5px solid #F14D07}.rus-state25-sponsor-main{display:flex;align-items:center;gap:13px;min-width:0}.rus-state25-sponsor-logo-link{display:block;flex:0 0 70px;line-height:0;position:relative;z-index:2}.rus-state25-sponsor-logo{display:block;width:70px;height:70px;object-fit:contain;background:transparent;border:0;padding:0}.rus-state25-sponsor-copy{min-width:0}.rus-state25-sponsor-label{color:#F14D07;font-size:9px;font-weight:1000;letter-spacing:.7px;text-transform:uppercase}.rus-state25-sponsor-name{margin-top:4px;color:#fff;font-size:18px;font-weight:1000;line-height:1.1}.rus-state25-sponsor-note{margin-top:4px;color:#888;font-size:10px;line-height:1.35}.rus-state25-sponsor-link{color:#F14D07;font-size:10px;font-weight:1000;text-decoration:none;text-transform:uppercase;white-space:nowrap}.rus-export-state25-sponsor{height:62px;margin-top:8px;border-top:1px solid #383838;display:flex;align-items:center;justify-content:flex-end;gap:11px;padding:7px 9px;color:#fff;font-family:Arial,Helvetica,sans-serif}.rus-export-state25-sponsor img{display:block;width:48px;height:48px;object-fit:contain}.rus-export-state25-sponsor-copy{text-align:right;line-height:1.08}.rus-export-state25-sponsor-label{color:#F14D07;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.5px}.rus-export-state25-sponsor-name{color:#fff;font-size:14px;font-weight:1000;margin-top:3px}@media(max-width:650px){#${ID}{padding:11px 12px;align-items:center}.rus-state25-sponsor-logo-link{flex-basis:58px}.rus-state25-sponsor-logo{width:58px;height:58px}.rus-state25-sponsor-name{font-size:15px}.rus-state25-sponsor-link{display:none}}
`;document.head.appendChild(s)}
function render(s){if(document.getElementById(ID)||!active(s))return;const head=document.querySelector('#state-top-25 .state25-head');if(!head)return;styles();const href=emailHref(s),el=document.createElement('aside');el.id=ID;const logo=s.logo?`<img class="rus-state25-sponsor-logo" src="${esc(s.logo)}" alt="${esc(s.business||'Sponsor')} logo" loading="eager" decoding="async">`:'';const logoMarkup=logo&&href?`<a class="rus-state25-sponsor-logo-link" href="${esc(href)}"${isMobile()?'':` target="_blank" rel="noopener"`} aria-label="Contact ${esc(s.business||'sponsor')}">${logo}</a>`:logo;el.innerHTML=`<div class="rus-state25-sponsor-main">${logoMarkup}<div class="rus-state25-sponsor-copy"><div class="rus-state25-sponsor-label">${esc(s.label||'Official Sponsor of the RUS State Top 25')}</div><div class="rus-state25-sponsor-name">Presented by ${esc(s.business||'Sponsor')}</div><div class="rus-state25-sponsor-note">Sponsor of the State Top 25 rankings. Rankings remain independently selected by Rural Utah Sports.</div></div></div>${href?`<a class="rus-state25-sponsor-link" href="${esc(href)}"${isMobile()?'':` target="_blank" rel="noopener"`}>Contact Sponsor →</a>`:''}`;head.insertAdjacentElement('afterend',el)}
function enhanceExport(board,s){
  if(!board||board.dataset.rusState25Sponsor==='1'||!active(s))return;
  const grid=board.querySelector('.rus-export-rank-grid');if(!grid)return;
  board.dataset.rusState25Sponsor='1';styles();
  const footerH=70,rows=String(grid.style.gridTemplateRows||'').match(/repeat\(\s*(\d+)\s*,\s*(\d+)px\s*\)/i);
  if(rows){const count=Math.max(1,Number(rows[1])||1),oldH=Number(rows[2])||72,newH=Math.max(58,oldH-Math.ceil(footerH/count));grid.style.gridTemplateRows=`repeat(${count},${newH}px)`}
  grid.style.height=`calc(100% - ${footerH}px)`;
  const footer=document.createElement('div');footer.className='rus-export-state25-sponsor';footer.innerHTML=`<div class="rus-export-state25-sponsor-copy"><div class="rus-export-state25-sponsor-label">Presented by</div><div class="rus-export-state25-sponsor-name">${esc(s.business||'Sponsor')}</div></div>${s.logo?`<img src="${esc(s.logo)}" alt="${esc(s.business||'Sponsor')} logo">`:''}`;board.appendChild(footer);
}
function watchExports(s){
  if(window.__rusState25SponsorExportObserver)return;window.__rusState25SponsorExportObserver=true;
  const scan=node=>{if(node?.nodeType!==1)return;if(node.matches?.('.rus-export-board.rus-export-state25'))enhanceExport(node,s);node.querySelectorAll?.('.rus-export-board.rus-export-state25').forEach(board=>enhanceExport(board,s))};
  document.querySelectorAll('.rus-export-board.rus-export-state25').forEach(board=>enhanceExport(board,s));
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan))).observe(document.body,{childList:true,subtree:true});
}
async function start(){try{const r=await fetch(`feature-sponsors.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;const cfg=await r.json(),s=cfg?.stateTop25;if(!active(s))return;window.RUSState25FeatureSponsor=s;render(s);watchExports(s)}catch(e){console.warn('State Top 25 sponsor unavailable',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
