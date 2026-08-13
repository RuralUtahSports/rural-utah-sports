(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='programs.html')return;

  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isJV=name=>/(^|\s)J\.?V\.?(\s|$)/i.test(String(name||''))||/JUNIOR\s+VARSITY/i.test(String(name||''));
  const isOutOfState=name=>/\(([A-Z]{2})\)\s*$/i.test(String(name||''))&&!/\(UT\)\s*$/i.test(String(name||''));

  async function init(){
    let allowed=new Set();
    try{
      const r=await fetch('teams-data.json?v='+Date.now());
      if(r.ok){
        const data=await r.json();
        allowed=new Set((Array.isArray(data)?data:[]).map(t=>norm(t.team)).filter(Boolean));
      }
    }catch(e){console.error('Program leaderboard filter:',e)}

    const eligible=name=>{
      if(!name||isJV(name)||isOutOfState(name))return false;
      return !allowed.size||allowed.has(norm(name));
    };

    const filterRows=()=>{
      const tbody=document.querySelector('#page tbody');
      if(!tbody)return;
      let removed=false;
      for(const tr of [...tbody.querySelectorAll('tr')]){
        const a=tr.querySelector('td.team a');
        if(!a)continue;
        const team=a.textContent.trim();
        if(!eligible(team)){tr.remove();removed=true}
      }
      if(removed){
        [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
          const rank=tr.querySelector('td.rank');
          if(rank)rank.textContent=String(i+1);
        });
        const count=document.querySelector('#page .summary-card strong');
        if(count)count.textContent=String(tbody.querySelectorAll('tr').length);
      }
    };

    const page=document.getElementById('page');
    if(!page)return;
    new MutationObserver(filterRows).observe(page,{childList:true,subtree:true});
    filterRows();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
