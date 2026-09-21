(()=>{
'use strict';
if(window.__RUS_TABLE_ACCESSIBILITY__)return;window.__RUS_TABLE_ACCESSIBILITY__=true;
function apply(root=document){
  const wraps=[];
  if(root?.nodeType===1&&root.matches?.('.table-wrap,.table-scroll'))wraps.push(root);
  root.querySelectorAll?.('.table-wrap,.table-scroll').forEach(x=>wraps.push(x));
  for(const w of wraps){
    if(w.dataset.rusTableA11y)return;
    w.dataset.rusTableA11y='1';
    w.tabIndex=0;
    if(!w.getAttribute('aria-label'))w.setAttribute('aria-label','Scrollable data table');
  }
}
function start(){
  apply();
  const main=document.querySelector('main');
  if(!main)return;
  const observer=new MutationObserver(records=>{
    for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)apply(n);
  });
  observer.observe(main,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
