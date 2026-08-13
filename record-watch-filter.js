(()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(path!=='index.html')return;

  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const isJV=name=>/(^|\s)J\.?V\.?(\s|$)/i.test(String(name||''))||/JUNIOR\s+VARSITY/i.test(String(name||''));
  const isOutOfState=name=>/\(([A-Z]{2})\)\s*$/i.test(String(name||''))&&!/\(UT\)\s*$/i.test(String(name||''));

  async function setup(host){
    let allowed=new Set();
    try{
      const r=await fetch('teams-data.json?v='+Date.now());
      if(r.ok){
        const data=await r.json();
        allowed=new Set((Array.isArray(data)?data:[]).map(t=>norm(t.team)).filter(Boolean));
      }
    }catch(e){console.error('Record Watch team filter:',e)}

    const eligible=name=>{
      if(!name||isJV(name)||isOutOfState(name))return false;
      return !allowed.size||allowed.has(norm(name));
    };

    const filter=()=>{
      const grid=host.querySelector('.rus-watch-grid');
      if(!grid)return;
      for(const card of [...grid.querySelectorAll('.rus-watch-card')]){
        let team='';
        try{team=new URL(card.getAttribute('href')||'',location.href).searchParams.get('team')||''}catch(e){}
        if(!eligible(team))card.remove();
      }
      if(!grid.querySelector('.rus-watch-card')){
        host.innerHTML='<div class="rus-feature-loading">No Utah varsity multi-game active win streaks are available in the latest recorded results.</div>';
      }
    };

    const subtitle=document.querySelector('#rusRecordWatch .rus-feature-head p');
    if(subtitle)subtitle.textContent='Based on the newest results currently in the RUS game database. Utah varsity programs only.';

    const observer=new MutationObserver(filter);
    observer.observe(host,{childList:true,subtree:true});
    filter();
  }

  function init(attempt=0){
    const host=document.getElementById('rusWatchBody');
    if(host){setup(host);return}
    if(attempt<100)setTimeout(()=>init(attempt+1),100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init());
  else init();
})();