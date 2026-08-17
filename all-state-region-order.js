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

function passDetails(v){
  const entries=Object.entries(v||{});
  const yards=statValue(v,'YARDS','PASS YARDS')||(()=>{const hit=entries.find(([k])=>/^yards$/i.test(String(k).trim()));return hit?n(hit[1]):0})();
  const td=statValue(v,'TD','TDS','PASS TD','PASS TDS');
  const interceptions=statValue(v,'INT','INTS','INTERCEPTIONS');
  const compAtt=entries.find(([k])=>compact(k)==='COMPATT');
  const match=compAtt?String(compAtt[1]??'').match(/(\d+)\s*[-/]\s*(\d+)/):null;
  const completions=match?Number(match[1]):statValue(v,'COMP','COMPLETIONS');
  const attempts=match?Number(match[2]):statValue(v,'ATT','ATTEMPTS','PASS ATT');
  const pctEntry=entries.find(([k])=>/COMP(?:LETION)?\s*%|COMP(?:LETION)?\s*PCT/i.test(String(k)));
  const compPct=pctEntry?n(pctEntry[1]):(attempts?completions/attempts*100:0);
  const ypa=attempts?yards/attempts:0;
  return {yards,td,interceptions,completions,attempts,compPct,ypa};
}

function qbPassingScore(v){
  const s=passDetails(v);
  let score=s.yards*.025+s.td*5-s.interceptions*2.5;

  // Efficiency is a bonus, not a punishment. A run-first QB should not have his
  // rushing value erased because he has a small or inefficient passing sample.
  if(s.attempts>=10){
    if(s.compPct>60)score+=Math.min(5,(s.compPct-60)*.25);
    if(s.ypa>7)score+=Math.min(4,(s.ypa-7)*.8);
  }
  return Math.max(0,score);
}

function qbRushingScore(v){
  const yards=statValue(v,'YARDS','RUSH YARDS');
  const td=statValue(v,'TD','TDS','RUSH TD','RUSH TDS');
  const carries=statValue(v,'CARRIES','RUSH ATT','RUSH ATTEMPTS','ATTEMPTS','ATT');
  const listedYpc=statValue(v,'YARDS/CARRY','YARDS PER CARRY','YPC');
  const ypc=carries?yards/carries:listedYpc;

  // Run-first QBs get full credit as runners: 1 point per 20 yards, 6 per TD,
  // plus a capped big-play bonus for sustained rushing efficiency.
  let score=yards*.05+td*6;
  if(carries>=5&&ypc>6)score+=Math.min(4,(ypc-6)*.35);
  return Math.max(0,score);
}

// Replace only the passing category score. The position-aware build below decides
// which stat categories are actually allowed to count toward each award group.
if(typeof pts==='function'){
  const basePts=pts;
  pts=function(cat,v){
    if(/^Pass/i.test(cat))return qbPassingScore(v);
    return basePts(cat,v);
  };
}

if(typeof build==='function'){
  const baseBuild=build;
  build=function(){
    const rows=baseBuild();
    for(const p of rows){
      if(p.pos==='QB'){
        // QB award score = passing + rushing only. Defensive stats never help a QB,
        // and a negative passing component can no longer erase a run-first QB's value.
        let score=0;
        for(const line of p.lines||[]){
          if(/^Pass/i.test(line.cat||''))score+=qbPassingScore(line.values);
          else if(/^Rush/i.test(line.cat||''))score+=qbRushingScore(line.values);
        }
        p.score=score;
        p.weightedScore=p.score*p.weight;
      }else if(p.pos==='RB'){
        // RB award score is offense only: rushing + receiving. Tackles, sacks,
        // interceptions and other defensive production do not count toward RB rank.
        let score=0;
        for(const line of p.lines||[]){
          if(/^Rush/i.test(line.cat||'')||/^Receiv/i.test(line.cat||''))score+=Math.max(0,line.score||0);
        }
        p.score=score;
        p.weightedScore=p.score*p.weight;
      }
    }
    return rows;
  };
}

if(typeof topLine==='function'){
  const baseTopLine=topLine;
  const fmt=x=>x?`${x.cat}: ${Object.entries(x.values||{}).filter(([,v])=>String(v).trim()).slice(0,5).map(([k,v])=>`${k} ${v}`).join(', ')}`:'';
  topLine=function(p){
    if(p.pos==='QB'){
      const pass=(p.lines||[]).find(x=>/^Pass/i.test(x.cat||''));
      const rush=(p.lines||[]).find(x=>/^Rush/i.test(x.cat||''));
      if(pass&&rush)return `${fmt(pass)} • ${fmt(rush)}`;
      if(pass)return fmt(pass);
      if(rush)return fmt(rush);
    }
    if(p.pos==='RB'){
      const offense=(p.lines||[]).filter(x=>/^Rush/i.test(x.cat||'')||/^Receiv/i.test(x.cat||''));
      if(offense.length){
        const best=[...offense].sort((a,b)=>(b.score||0)-(a.score||0))[0];
        return fmt(best);
      }
    }
    return baseTopLine(p);
  };
}

function addScoreNote(){
  if(document.getElementById('rus-position-score-note'))return;
  const controls=document.querySelector('.controls');
  if(!controls)return;
  const note=document.createElement('div');
  note.id='rus-position-score-note';
  note.style.cssText='margin-top:12px;color:#888;font-size:10px;line-height:1.45;font-weight:800;text-transform:uppercase';
  note.textContent='QB: passing + rushing only; run-first QBs receive rushing-efficiency credit and passing cannot subtract below zero. RB: rushing + receiving only; defensive stats are excluded.';
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
  addScoreNote();
  reorder();
  try{if(typeof data!=='undefined'&&data&&typeof render==='function')render()}catch(e){}
};
start();
})();