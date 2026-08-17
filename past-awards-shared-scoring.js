(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='awards-2025.html')return;

function patch(){
  if(typeof card!=='function'||typeof positions!=='function'||typeof esc!=='function'){setTimeout(patch,50);return}
  if(window.__RUS_PAST_AWARD_SCORING_PATCHED__)return;
  window.__RUS_PAST_AWARD_SCORING_PATCHED__=true;

  const originalLine=typeof line==='function'?line:null;
  line=function(p,usePosition=false){
    const x=(usePosition?p.positionTopLines:p.topLines)?.[0];
    if(!x)return originalLine?originalLine(p):'Reported 2025 stats';
    return `${x.category}: ${Object.entries(x.values||{}).filter(([,v])=>String(v).trim()).slice(0,4).map(([k,v])=>`${k} ${v}`).join(', ')}`;
  };

  card=function(p,i,label='Score',final=false,usePosition=false){
    const score=usePosition
      ? Number(view==='All-Utah'?p.allUtahPositionScore:p.positionScore||0)
      : Number(view==='All-Utah'?p.allUtahScore:p.rawScore||0);
    return `<article class="card ${final&&i===0?'winner':''}"><div class="rank">${rankText(i,final)}</div><div><div class="name"><a class="playerlink" href="${playerURL(p)}">${esc(p.name)}</a></div><div class="meta">#${esc(p.number||'—')} • ${esc(p.rawPosition||p.position||'—')} • <a class="teamlink" href="${teamURL(p.team)}">${esc(p.team)}</a> • ${esc(p.classification||'—')}${p.region?' • '+esc(p.region):''} • ${p.teamRecord?.wins||0}-${p.teamRecord?.losses||0}${p.teamRecord?.ties?'-'+p.teamRecord.ties:''}</div><div class="stat">${esc(line(p,usePosition))}</div></div><div class="score"><strong>${score.toFixed(1)}</strong><span>${esc(label)}</span></div></article>`;
  };

  positions=function(obj,excludeKey=''){
    const entries=Object.entries(obj||{}).map(([pos,rows])=>[pos,(rows||[]).filter(p=>!excludeKey||playerKey(p)!==excludeKey)]).filter(([,rows])=>rows.length);
    if(!entries.length)return'<div class="empty">No position rankings available.</div>';
    const label=view==='All-Utah'?'Weighted position score':'Position score';
    return `<div class="position-grid">${entries.map(([pos,rows])=>`<section class="position"><h3>${esc(pos)}</h3><div class="cards">${rows.map((p,i)=>card(p,i,label,false,true)).join('')}</div></section>`).join('')}</div>`;
  };

  try{if(typeof data!=='undefined'&&data&&typeof render==='function')render()}catch(e){console.error(e)}
}
patch();
})();
