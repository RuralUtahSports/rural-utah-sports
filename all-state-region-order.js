(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='all-state-watch.html')return;

function statValue(values,...wanted){
  const entries=Object.entries(values||{});
  for(const key of wanted){
    const target=compact(key);
    const hit=entries.find(([k])=>compact(k)===target);
    if(hit)return n(hit[1]);
  }
  return 0;
}

// Passing score used by the All-Utah / All-State / All-Region watch.
// Keeps volume important while giving efficient QBs credit for accuracy and yards per attempt.
if(typeof pts==='function'){
  const basePts=pts;
  pts=function(cat,v){
    if(!/^Pass/i.test(cat))return basePts(cat,v);
    const entries=Object.entries(v||{});
    const yards=statValue(v,'YARDS','PASS YARDS')||(()=>{const hit=entries.find(([k])=>/^yards$/i.test(String(k).trim()));return hit?n(hit[1]):0})();
    const td=statValue(v,'TD','TDS','PASS TD','PASS TDS');
    const interceptions=statValue(v,'INT','INTS','INTERCEPTIONS');
    const compAtt=entries.find(([k])=>compact(k)==='COMPATT');
    const match=compAtt?String(compAtt[1]??'').match(/(\d+)\s*[-/]\s*(\d+)/):null;
    const completions=match?Number(match[1]):0;
    const attempts=match?Number(match[2]):0;
    const pctEntry=entries.find(([k])=>/COMP(?:LETION)?\s*%|COMP(?:LETION)?\s*PCT/i.test(String(k)));
    const compPct=pctEntry?n(pctEntry[1]):(attempts?completions/attempts*100:0);
    const ypa=attempts?yards/attempts:0;

    // Base passing: 1 point per 40 yards, 5 per TD, -2.5 per interception.
    let score=yards*.025+td*5-interceptions*2.5;

    // Efficiency only kicks in once a QB has a real sample (10+ attempts).
    if(attempts>=10){
      score+=Math.max(-3,Math.min(5,(compPct-60)*.25));
      score+=Math.max(-2,Math.min(4,(ypa-7)*.8));
    }
    return score;
  };
}

// The page already adds each player's rushing category to the total. Give QBs a little
// extra value for rushing production so true dual-threat quarterbacks are not treated like
// pure pocket passers. Generic rushing is .035/yard + 6/TD; QBs become .050/yard + 6/TD.
if(typeof build==='function'){
  const baseBuild=build;
  build=function(){
    const rows=baseBuild();
    for(const p of rows){
      if(p.pos!=='QB')continue;
      let extraRush=0;
      for(const line of p.lines||[]){
        if(!/^Rush/i.test(line.cat||''))continue;
        const yards=statValue(line.values,'YARDS','RUSH YARDS');
        extraRush+=yards*.015;
      }
      if(extraRush){
        p.score+=extraRush;
        p.weightedScore=p.score*p.weight;
      }
    }
    return rows;
  };
}

// On QB cards, show both the passing and rushing lines when both are available so the
// ranking is easier to understand at a glance.
if(typeof topLine==='function'){
  const baseTopLine=topLine;
  topLine=function(p){
    if(p.pos!=='QB')return baseTopLine(p);
    const pass=(p.lines||[]).find(x=>/^Pass/i.test(x.cat||''));
    const rush=(p.lines||[]).find(x=>/^Rush/i.test(x.cat||''));
    const fmt=x=>x?`${x.cat}: ${Object.entries(x.values||{}).filter(([,v])=>String(v).trim()).slice(0,5).map(([k,v])=>`${k} ${v}`).join(', ')}`:'';
    if(pass&&rush)return `${fmt(pass)} • ${fmt(rush)}`;
    return baseTopLine(p);
  };
}

function addQBNote(){
  if(document.getElementById('rus-qb-score-note'))return;
  const controls=document.querySelector('.controls');
  if(!controls)return;
  const note=document.createElement('div');
  note.id='rus-qb-score-note';
  note.style.cssText='margin-top:12px;color:#888;font-size:10px;line-height:1.45;font-weight:800;text-transform:uppercase';
  note.textContent='QB score includes passing production + efficiency and rushing production (rush yards + rush TDs).';
  controls.appendChild(note);
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
  addQBNote();
  reorder();
  try{if(typeof data!=='undefined'&&data&&typeof render==='function')render()}catch(e){}
};
start();
})();