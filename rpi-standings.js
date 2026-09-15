(()=>{'use strict';
const root=document.getElementById('featureRoot');if(!root)return;
const classes=['6A','5A','4A','3A','2A','1A','8P'];
const h=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
const value=value=>Number.isFinite(Number(value))?Number(value).toFixed(6):'—';
const get=async(file,fallback)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(`${file}?v=${Date.now()}`,{cache:'no-store',signal:controller.signal});return response.ok?await response.json():fallback}catch{return fallback}finally{clearTimeout(timer)}};
async function run(){
  const [data,teams]=await Promise.all([get('uhsaa-rpi-official-2026.json',null),get('teams-data.json',[])]);
  if(!data?.classifications)throw new Error('RPI data unavailable');
  const meta=new Map(teams.map(team=>[norm(team.team),team]));
  const pill=team=>{const item=meta.get(norm(team))||{};return `<a class="team-pill" style="--bg:${h(item.backgroundColor||'#222')};--fg:${h(item.textColor||'#fff')}" href="team.html?team=${encodeURIComponent(team)}">${h(team)}</a>`};
  const updated=data.fetchedAt?new Date(data.fetchedAt).toLocaleString():'';
  const tabs=classes.map((classification,index)=>`<button class="rpi-tab${index===0?' active':''}" type="button" data-rpi-class="${classification}">${classification==='8P'?'8-Player':classification}</button>`).join('');
  const sections=classes.map((classification,index)=>{const rows=data.classifications[classification]?.rows||[];return `<section class="rpi-class" data-rpi-section="${classification}"${index?' hidden':''}><h2 class="section-title">${classification==='8P'?'8-Player':classification} RPI</h2><div class="table-wrap"><table><thead><tr><th>RPI Rank</th><th class="left">Team</th><th>Record</th><th>RPI Value</th><th>MWP</th><th>OWP</th><th>OOWP</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="rank">${row.rank}</td><td class="left">${pill(row.team)}</td><td><strong>${h(row.record)}</strong></td><td><strong>${value(row.rpi)}</strong></td><td>${value(row.mwp)}</td><td>${value(row.owp)}</td><td>${value(row.oowp)}</td></tr>`).join('')}</tbody></table></div></section>`}).join('');
  root.innerHTML=`<div class="feature-note"><strong>Official UHSAA standings.</strong> Every rank, record, RPI, MWP, OWP and OOWP value below comes directly from UHSAA, not the Rural Utah Sports projection. <a href="https://uhsaa.org/football-rpi/" target="_blank" rel="noopener">View the UHSAA source</a>${updated?`<br><strong>Official data synced:</strong> ${h(updated)}`:''}</div><div class="rpi-tabs" role="tablist" aria-label="Football classification">${tabs}</div>${sections}`;
  root.querySelectorAll('[data-rpi-class]').forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.rpiClass;root.querySelectorAll('[data-rpi-class]').forEach(item=>item.classList.toggle('active',item===button));root.querySelectorAll('[data-rpi-section]').forEach(section=>{section.hidden=section.dataset.rpiSection!==selected})}));
}
run().catch(error=>{console.error(error);root.innerHTML='<div class="empty">The RPI standings could not load. Try refreshing in a moment.</div>'});
})();
