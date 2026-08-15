(()=>{
  const board=document.getElementById('board'),filters=document.querySelector('.filters');
  if(!board||!filters||document.getElementById('mercyFilter'))return;

  const select=document.createElement('select');
  select.id='mercyFilter';
  select.setAttribute('aria-label','Mercy rule filter');
  select.innerHTML='<option value="ALL">All Mercy Status</option><option value="MERCY">44+ Mercy Rule</option>';
  const search=document.getElementById('search');
  filters.insertBefore(select,search||null);

  function apply(){
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
        const next=onlyMercy?`${visible} mercy game${visible===1?'':'s'}`:count.dataset.rusOriginalCount;
        if(count.textContent!==next)count.textContent=next;
      }
    });
  }

  select.addEventListener('change',apply);
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.target===board))apply();
  });
  observer.observe(board,{childList:true});
  apply();
})();
