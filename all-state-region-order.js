(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='all-state-watch.html')return;

// Passing score used by the All-Utah / All-State / All-Region watch.
// Keeps volume important while giving efficient QBs credit for accuracy and yards per attempt.
if(typeof pts==='function'){
  const basePts=pts;
  pts=function(cat,v){
    if(!/^Pass/i.test(cat))return basePts(cat,v);
    const entries=Object.entries(v||{});
    const exact=(...keys)=>{
      for(const wanted of keys){
        const key=compact(wanted);
        const hit=entries.find(([k])=>compact(k)===key);
        if(hit)return n(hit[1]);
      }
      return 0;
    };
    const yards=exact('YARDS','PASS YARDS')||(()=>{const hit=entries.find(([k])=>/^yards$/i.test(String(k).trim()));return hit?n(hit[1]):0})();
    const td=exact('TD','TDS','PASS TD','PASS TDS');
    const interceptions=exact('INT','INTS','INTERCEPTIONS');
    const compAtt=entries.find(([k])=>compact(k)==='COMPATT');
    const match=compAtt?String(compAtt[1]??'').match(/(\d+)\s*[-/]\s*(\d+)/):null;
    const completions=match?Number(match[1]):0;
    const attempts=match?Number(match[2]):0;
    const pctEntry=entries.find(([k])=>/COMP(?:LETION)?\s*%|COMP(?:LETION)?\s*PCT/i.test(String(k)));
    const compPct=pctEntry?n(pctEntry[1]):(attempts?completions/attempts*100:0);
    const ypa=attempts?yards/attempts:0;

    // Base: 1 point per 40 passing yards, 5 per TD, -2.5 per interception.
    let score=yards*.025+td*5-interceptions*2.5;

    // Efficiency only kicks in once a QB has a real sample (10+ attempts).
    if(attempts>=10){
      score+=Math.max(-3,Math.min(5,(compPct-60)*.25));
      score+=Math.max(-2,Math.min(4,(ypa-7)*.8));
    }
    return score;
  };
  // If the page rendered before this deferred helper loaded, refresh with the new formula.
  try{if(typeof data!=='undefined'&&data&&typeof render==='function')render()}catch(e){}
}

function regionNumber(text){const m=String(text||'').match(/(?:REGION\s*)?(\d+)/i);return m?Number(m[1]):999}
function reorder(){
  const label=document.getElementById('scopeLabel'),host=document.getElementById('scopeBtns');
  if(!label||!host||!/region/i.test(label.textContent))return;
  const current=[...host.querySelectorAll('[data-scope]')];
  const sorted=[...current].sort((a,b)=>regionNumber(a.dataset.scope)-regionNumber(b.dataset.scope)||String(a.dataset.scope).localeCompare(String(b.dataset.scope),undefined,{numeric:true}));
  if(sorted.every((button,index)=>button===current[index]))return;
  const frag=document.createDocumentFragment();
  sorted.forEach(button=>frag.appendChild(button));
  host.appendChild(frag);
}
const obs=new MutationObserver(reorder);
const start=()=>{
  const h=document.getElementById('scopeBtns');
  if(!h){setTimeout(start,100);return}
  obs.observe(h,{childList:true});
  const l=document.getElementById('scopeLabel');
  if(l)obs.observe(l,{childList:true,characterData:true,subtree:true});
  reorder();
};
start();
})();