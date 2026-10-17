(()=>{
'use strict';
const root=document.getElementById('featureRoot');if(!root)return;
const classes=['6A','5A','4A','3A','2A','1A','8P'];
const cutoffs={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11};
const pairs=[[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];
let lastRefreshAt=0;
let refreshing=null;
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
  const [calculated,colors]=await Promise.all([read('rpi-standings-2026.json',null),read('team-colors-exact.json',[])]);
  if(!calculated?.classifications)throw new Error('RUS calculated RPI standings are unavailable');
  const meta=new Map((Array.isArray(colors)?colors:[]).map(team=>[norm(team.team),team]));
  const pill=team=>{const item=meta.get(aliases[norm(team)]||norm(team))||{},name=item.team||team;return '<a class="team-pill" style="--bg:'+h(item.backgroundColor||'#222')+';--fg:'+h(item.textColor||'#fff')+'" href="team.html?team='+encodeURIComponent(name)+'">'+h(team)+'</a>'};
  const asOf=calculated.updatedAt?new Date(calculated.updatedAt):null;
  const dateLabel=asOf&&!Number.isNaN(asOf.valueOf())?asOf.toLocaleString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'unknown';
  const stale=asOf&&(Date.now()-asOf.valueOf()>4*60*60*1000);
  const nav='<div class="feature-note"><strong>Jump to a classification:</strong> '+classes.map(c=>'<a style="margin-right:12px" href="#playoff-'+c+'">'+(c==='8P'?'8-Player':c)+'</a>').join('')+'</div>';
  const note='<div class="feature-note"><strong>RUS projected playoff picture — updated through the latest recorded finals.</strong> RUS calculates RPI using 45% team winning percentage, 45% opponents\' winning percentage and 10% opponents\' opponents winning percentage. This page uses our own calculated standings, <strong>not</strong> the older official UHSAA snapshot. <strong>RUS data updated:</strong> '+h(dateLabel)+'. Projected seeds and byes are unofficial, and remaining games may change the bracket. Official UHSAA postseason rankings and brackets are expected Saturday, October 17. <a href="rpi.html">Compare with the separately labeled official UHSAA RPI</a>.'+(stale?' <strong>Heads up:</strong> The RUS RPI data is more than four hours old; recent results may not yet be reflected.':'')+' <button type="button" id="rusPlayoffRefresh" style="display:inline-block;margin-top:10px;padding:9px 13px;border:1px solid #F14D07;border-radius:7px;background:#F14D07;color:#080808;font-weight:900;cursor:pointer">Refresh RUS projections</button></div>';
  const sections=classes.map(classification=>{
    const rows=calculated.classifications[classification]||[];
    if(!rows.length)return '';
    const cutoff=cutoffs[classification];
    const top=rows.slice(0,cutoff);
    const bySeed=new Map(top.map(row=>[row.rank,row]));
    // Mirror the automatic first-round bye advances in the page's quarterfinal slots.
    const firstRound=pairs.map(([a,b])=>({a:bySeed.get(a)||null,b:bySeed.get(b)||null})).filter(match=>match.a);
    const byeAdvancers=firstRound.map(match=>match.a&&!match.b?match.a:null);
    const quarterfinals=Array.from({length:Math.ceil(firstRound.length/2)},(_,i)=>({
      a:byeAdvancers[i*2]||null,
      b:byeAdvancers[i*2+1]||null
    }));
    const quarterHtml=['3A','2A','1A','8P'].includes(classification)
      ?'<h3 style="margin:20px 0 9px;text-transform:uppercase;color:#F14D07">Quarterfinals — bye advances filled</h3><p>Teams with first-round byes advance automatically. Unplayed first-round matchups remain TBD; no winners are predicted.</p><div class="grid two">'+
        quarterfinals.map(match=>'<div class="card">'+
          (match.a?'<span class="pill">#'+match.a.rank+'</span> '+pill(match.a.team):'<span class="muted">TBD — first-round winner</span>')+
          '<div style="color:#999;margin:7px 0;font-size:10px;font-weight:900">VS</div>'+
          (match.b?'<span class="pill">#'+match.b.rank+'</span> '+pill(match.b.team):'<span class="muted">TBD — first-round winner</span>')+
          '</div>').join('')+'</div>'
      :'';
    const title=classification==='8P'?'8-Player':classification;
    const atRisk=rows.filter(row=>games(row)<6);
    const outside=rows.filter(row=>row.rank>cutoff).slice(0,3);
    const lastIn=rows.find(row=>row.rank===cutoff);
    const band=classification==='6A'||classification==='5A'||classification==='4A';
    const recap=band?'<p style="margin:8px 0 14px"><strong>RUS projected cutoff:</strong> #'+cutoff+' '+(lastIn?h(lastIn.team):'TBD')+' holds the final provisional berth'+(outside.length?'; just outside: '+outside.map(r=>'#'+r.rank+' '+h(r.team)).join(', '):'')+'.</p>':atRisk.length?'<p style="margin:8px 0 14px"><strong>Eligibility watch:</strong> '+atRisk.map(r=>h(r.team)+' ('+h(r.record)+')').join(', ')+' need at least six varsity games.</p>':'<p style="margin:8px 0 14px">Every ranked team in this classification is currently inside the projected field.</p>';
    return '<section id="playoff-'+classification+'"><h2 class="section-title">'+title+' Projected Seeds</h2>'+recap+
      '<div class="table-wrap"><table><thead><tr><th>Seed</th><th class="left">Team</th><th>Record</th><th>MWP</th><th>OWP</th><th>OOWP</th><th>RPI</th><th>Status</th></tr></thead><tbody>'+
      rows.map(row=>{const eligible=games(row)>=6,inside=eligible&&row.rank<=cutoff;return '<tr class="'+(band&&Math.abs(row.rank-cutoff)<=2?'rpi-bubble':'')+'"><td class="rank">'+row.rank+'</td><td class="left">'+pill(row.team)+'</td><td>'+h(row.record)+'</td><td>'+pct(row.mwp)+'</td><td>'+pct(row.owp)+'</td><td>'+pct(row.oowp)+'</td><td><strong>'+Number(row.rpi).toFixed(6)+'</strong></td><td class="'+(inside?'rpi-in':'rpi-out')+'">'+h(state(row,cutoff))+'</td></tr>'+(row.rank===cutoff&&rows.length>cutoff?'<tr class="playoff-cutoff-row"><td colspan="8"><strong>RUS PROJECTED PLAYOFF CUTOFF</strong></td></tr>':'')}).join('')+
      '</tbody></table></div><section class="rus-projected-bracket"><h3 style="margin:18px 0 9px;text-transform:uppercase;color:#F14D07">Projected Bracket Slots &amp; Byes</h3><p>Matchups use the latest RUS calculated RPI seeds, not released UHSAA bracket positions. A listed bye is not a scheduled game.</p><div class="grid two">'+
      pairs.map(([a,b])=>{const first=bySeed.get(a),second=bySeed.get(b);if(!first)return '';return '<div class="card"><span class="pill">#'+a+'</span> '+pill(first.team)+'<div style="color:#999;margin:7px 0;font-size:10px;font-weight:900">VS</div>'+(second?'<span class="pill">#'+b+'</span> '+pill(second.team)+(games(second)<6?'<small class="muted"> • Eligibility pending</small>':''):'<span class="muted">BYE</span>')+'</div>'}).join('')+
      '</div>'+quarterHtml+'</section></section>';
  }).join('');
  root.innerHTML=note+nav+sections;
  root.querySelector('#rusPlayoffRefresh')?.addEventListener('click',()=>refresh(true));
}
function refresh(force=false){
  if(refreshing)return refreshing;
  if(!force&&lastRefreshAt&&Date.now()-lastRefreshAt<120000)return Promise.resolve();
  refreshing=run().then(()=>{lastRefreshAt=Date.now()}).catch(error=>{
    console.error('RUS playoff RPI refresh failed:',error);
    if(!root.querySelector('.section-title')){
      root.innerHTML='<div class="empty">RUS playoff data could not load. Check your connection and reload the page.</div>';
    }else{
      const note=root.querySelector('.feature-note');
      if(note)note.insertAdjacentHTML('beforeend',' <strong>Refresh could not complete; showing last loaded projections.</strong>');
    }
  }).finally(()=>{refreshing=null});
  return refreshing;
}
// Installed iPhone web apps can keep the same page alive after a new score or
// deployment. Recheck on return and periodically while the page is in use.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('pageshow',()=>refresh());
window.addEventListener('focus',()=>refresh());
setInterval(()=>{if(!document.hidden)refresh()},120000);
refresh(true);
})();