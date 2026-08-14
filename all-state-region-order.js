(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='all-state-watch.html')return;
function regionNumber(text){const m=String(text||'').match(/(?:REGION\s*)?(\d+)/i);return m?Number(m[1]):999}
function reorder(){const label=document.getElementById('scopeLabel'),host=document.getElementById('scopeBtns');if(!label||!host||!/region/i.test(label.textContent))return;const buttons=[...host.querySelectorAll('[data-scope]')];buttons.sort((a,b)=>regionNumber(a.dataset.scope)-regionNumber(b.dataset.scope)||String(a.dataset.scope).localeCompare(String(b.dataset.scope),undefined,{numeric:true}));buttons.forEach(b=>host.appendChild(b))}
const obs=new MutationObserver(reorder);const start=()=>{const h=document.getElementById('scopeBtns');if(!h){setTimeout(start,100);return}obs.observe(h,{childList:true});const l=document.getElementById('scopeLabel');if(l)obs.observe(l,{childList:true,characterData:true,subtree:true});reorder()};start();
})();