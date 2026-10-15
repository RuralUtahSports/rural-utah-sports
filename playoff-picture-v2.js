(()=>{
'use strict';
const root=document.getElementById('featureRoot');if(!root)return;
const classes=['6A','5A','4A','3A','2A','1A','8P'];
const cutoffs={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11};
const pairs=[[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];
const aliases={
  'CEDAR':'CEDAR CITY',
  'AMERICAN LEADERSHIP ACADEMY':'ALA',
  'JUAN DIEGO CATHOLIC':'JUAN DIEGO',
  'JUDGE MEMORIAL CATHOLIC':'JUDGE MEMORIAL',
  'ST. JOSEPH':'SAINT JOSEPH',
  'UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI',
  'UTAH MILITARY ACADEMY - HILL FIELD':'UMA-HILLFIELD',
  'MONUMENT VALLEY':'MONUMENT VAL'
};
const norm=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
const h=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const pct=value=>Number.isFinite(Number(value))?(Number(value)*100).toFixed(3)+'%':'—';
const games=row=>{const n=String(row.record||'').match(/^(\d+)-(\d+)(?:-(\d+))?$/);return n?Number(n[1])+Number(n[2])+Number(n[3]||0):0;};
const read=async(file,fallback)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(file+'?v='+Date.now(),{cache:'no-store',signal:controller.signal});return response.ok?await response.json():fallback}catch{return fallback}finally{clearTimeout(timer)}};
function state(row,cutoff){
  if(games(row)<6)return 'PENDING ELIGIBILITY • '+(6-games(row))+' more game'+(6-games(row)===1?'':'s');
  return row.rank<=cutoff?'PROJECTED IN':'PROJECTED OUT';
}
async function run(){
  const [official,colors]=await Promise.all([read('uhsaa-rpi-official-2026.json',null),read('team-colors-exact.json',[])]);
  if(!official?.classifications)throw new Error('Official UHSAA RPI snapshot is unavailable');
  const meta=new Map((Array.isArray(colors)?colors:[]).map(team=>[norm(team.team),team]));
  const pill=team=>{const item=meta.get(aliases[norm(team)]||norm(team))||{},name=item.team||team;return '<a class="team-pill" style="--bg:'+h(item.backgroundColor||'#222')+';--fg:'+h(item.textColor||'#fff')+'" href="team.html?team='+encodeURIComponent(name)+'">'+h(team)+'</a>'};
  const asOf=official.fetchedAt?new Date(official.fetchedAt):null;
  const dateLabel=asOf&&!Number.isNaN(asOf.valueOf())?asOf.toLocaleString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'unknown';
  const stale=asOf&&(Date.now()-asOf.valueOf()>24*60*60*1000);
  const nav='<div class="feature-note"><strong>Jump to a classification:</strong> '+classes.map(c=>'<a style="margin-right:12px" href="#playoff-'+c+'">'+(c==='8P'?'8-Player':c)+'</a>').join('')+'</div>';
  const note='<div class="feature-note"><strong>Projected 2026 playoff picture using the official UHSAA RPI snapshot.</strong> Source last synced: '+h(dateLabel)+'. These are hypothetical seeds, not the released tournament bracket. The UHSAA bracket reveal is Saturday, October 17, 2026 at 10 a.m. (final rankings and brackets expected around 11 a.m.). <a href="https://uhsaa.org/football-rpi/" target="_blank" rel="noopener">Official UHSAA source</a>.'+(stale?' <strong>Heads up:</strong> This snapshot is over 24 hours old; newer game results may not be reflected.':'')+'</div>';
  const sections=classes.map(classification=>{
    const rows=official.classifications[classification]?.rows||[];
    if(!rows.length)return '';
    const cutoff=cutoffs[classification];
    const top=rows.slice(0,cutoff);
    const bySeed=new Map(top.map(row=>[row.rank,row]));
    const title=classification==='8P'?'8-Player':classification;
    const atRisk=rows.filter(row=>games(row)<6);
    const outside=rows.filter(row=>row.rank>cutoff).slice(0,3);
    const lastIn=rows.find(row=>row.rank===cutoff);
    const band=classification==='6A'||classification==='5A'||classification==='4A';
    const recap=band?'<p style="margin:8px 0 14px"><strong>Cutoff:</strong> #'+cutoff+' '+(lastIn?h(lastIn.team):'TBD')+' holds the final provisional berth'+(outside.length?'; just outside: '+outside.map(r=>'#'+r.rank+' '+h(r.team)).join(', '):'')+'.</p>':atRisk.length?'<p style="margin:8px 0 14px"><strong>Eligibility watch:</strong> '+atRisk.map(r=>h(r.team)+' ('+h(r.record)+')').join(', ')+' need at least six varsity games.</p>':'<p style="margin:8px 0 14px">Every ranked team in this classification is currently inside the projected field.</p>';
    return '<section id="playoff-'+classification+'"><h2 class="section-title">'+title+' Projected Seeds</h2>'+recap+
      '<div class="table-wrap"><table><thead><tr><th>Seed</th><th class="left">Team</th><th>Record</th><th>MWP</th><th>OWP</th><th>OOWP</th><th>RPI</th><th>Status</th></tr></thead><tbody>'+
      rows.map(row=>{const eligible=games(row)>=6,inside=eligible&&row.rank<=cutoff;return '<tr class="'+(band&&Math.abs(row.rank-cutoff)<=2?'rpi-bubble':'')+'"><td class="rank">'+row.rank+'</td><td class="left">'+pill(row.team)+'</td><td>'+h(row.record)+'</td><td>'+pct(row.mwp)+'</td><td>'+pct(row.owp)+'</td><td>'+pct(row.oowp)+'</td><td><strong>'+Number(row.rpi).toFixed(6)+'</strong></td><td class="'+(inside?'rpi-in':'rpi-out')+'">'+h(state(row,cutoff))+'</td></tr>'+(row.rank===cutoff&&rows.length>cutoff?'<tr class="playoff-cutoff-row"><td colspan="8"><strong>PROJECTED PLAYOFF CUTOFF</strong></td></tr>':'')}).join('')+
      '</tbody></table></div><section class="rus-projected-bracket"><h3 style="margin:18px 0 9px;text-transform:uppercase;color:#F14D07">Projected Bracket Slots &amp; Byes</h3><p>Matches are based on today’s stored RPI seeds; official matchups are not final. A listed bye is not a scheduled game.</p><div class="grid two">'+
      pairs.map(([a,b])=>{const first=bySeed.get(a),second=bySeed.get(b);if(!first)return '';return '<div class="card"><span class="pill">#'+a+'</span> '+pill(first.team)+'<div style="color:#999;margin:7px 0;font-size:10px;font-weight:900">VS</div>'+(second?'<span class="pill">#'+b+'</span> '+pill(second.team)+(games(second)<6?'<small class="muted"> • Eligibility pending</small>':''):'<span class="muted">BYE</span>')+'</div>'}).join('')+
      '</div></section></section>';
  }).join('');
  root.innerHTML=note+nav+sections;
}
run().catch(error=>{console.error(error);root.innerHTML='<div class="empty">The official RPI playoff snapshot could not load. Try refreshing in a moment.</div>'});
})();