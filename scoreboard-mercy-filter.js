(()=>{
  const board=document.getElementById('board'),filters=document.querySelector('.filters');
  if(!board||!filters||document.getElementById('mercyFilter'))return;

  const select=document.createElement('select');
  select.id='mercyFilter';
  select.setAttribute('aria-label','Mercy rule filter');
  select.innerHTML='<option value="ALL">All Mercy Status</option><option value="MERCY">44+ Mercy Rule</option>';
  const search=document.getElementById('search');
  filters.insertBefore(select,search||null);

  let applying=false;
  function apply(){
    if(applying)return;
    applying=true;
    const onlyMercy=select.value==='MERCY';
    board.querySelectorAll('.date-section').forEach(section=>{
      const cards=[...section.querySelectorAll('.game')];
      let visible=0;
      cards.forEach(card=>{
        const show=!onlyMercy||!!card.querySelector('.mercy-badge');
        card.style.display=show?'':'none';
        if(show)visible++;
      });
      section.style.display=visible?'':'none';
      const count=section.querySelector('.date-head span');
      if(count){
        if(!count.dataset.rusOriginalCount)count.dataset.rusOriginalCount=count.textContent||'';
        count.textContent=onlyMercy?`${visible} mercy game${visible===1?'':'s'}`:count.dataset.rusOriginalCount;
      }
    });
    applying=false;
  }

  select.addEventListener('change',apply);
  const observer=new MutationObserver(()=>queueMicrotask(apply));
  observer.observe(board,{childList:true,subtree:true});
  apply();
})();
