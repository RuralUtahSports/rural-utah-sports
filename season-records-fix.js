(()=>{
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  if(path!=='season.html')return;

  const norm=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const varsityClass=v=>/^(6A|5A|4A|3A|2A|1A|8P|8-PLAYER)$/i.test(String(v??'').trim());
  let dataPromise=null,applying=false;

  const load=()=>dataPromise||(dataPromise=Promise.all([
    fetch('season-records.json?v='+Date.now()).then(r=>{if(!r.ok)throw new Error('season-records.json');return r.json()}),
    fetch('teams-data.json?v='+Date.now()).then(r=>{if(!r.ok)throw new Error('teams-data.json');return r.json()})
  ]));

  function bestTable(){
    const heading=[...document.querySelectorAll('.section-title')].find(h=>h.textContent.trim().toLowerCase()==='best records');
    return heading?.nextElementSibling?.querySelector('tbody')||null;
  }

  function recordText(r){return `${r.wins}-${r.losses}${r.ties?'-'+r.ties:''}`}

  async function apply(){
    if(applying)return;
    const body=bestTable(),year=Number(document.getElementById('yearSelect')?.value||new URLSearchParams(location.search).get('year'));
    if(!body||!year)return;
    const signature=String(year);
    if(body.dataset.rusAuthoritativeSeason===signature)return;
    applying=true;
    try{
      const [recordData,teams]=await load();
      const allowed=new Set((Array.isArray(teams)?teams:[])
        .filter(t=>varsityClass(t.classification)&&!['ESCALANTE','USDB'].includes(String(t.team||'').trim().toUpperCase()))
        .map(t=>norm(t.team)).filter(Boolean));
      const rows=[...((recordData?.seasons||{})[String(year)]||[])]
        .filter(r=>allowed.has(norm(r.team)))
        .sort((a,b)=>(Number(b.winPct)||0)-(Number(a.winPct)||0)||(Number(b.wins)||0)-(Number(a.wins)||0)||(Number(b.avgMargin)||0)-(Number(a.avgMargin)||0)||String(a.team).localeCompare(String(b.team)))
        .slice(0,40);
      body.innerHTML=rows.map((r,i)=>{
        const pct=Number(r.winPct)||0,margin=Number(r.avgMargin)||0;
        return `<tr><td class="rank">${i+1}</td><td><a class="team-link" href="team.html?team=${encodeURIComponent(r.team)}">${esc(r.team)}</a></td><td>${recordText(r)}</td><td>${(pct*100).toFixed(1)}%</td><td>${Number(r.pointsFor)||0}</td><td>${Number(r.pointsAgainst)||0}</td><td>${margin>0?'+':''}${margin.toFixed(1)}</td></tr>`;
      }).join('')||'<tr><td colspan="7">No Utah varsity records available.</td></tr>';
      body.dataset.rusAuthoritativeSeason=signature;
    }catch(e){
      console.error('Season record correction:',e);
      dataPromise=null;
    }finally{applying=false}
  }

  function init(){
    const page=document.getElementById('page');
    if(!page)return;
    const observer=new MutationObserver(()=>setTimeout(apply,0));
    observer.observe(page,{childList:true,subtree:true});
    document.getElementById('yearSelect')?.addEventListener('change',()=>setTimeout(apply,0));
    apply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
