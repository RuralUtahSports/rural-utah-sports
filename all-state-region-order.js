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

function offensivePassingScore(v){
  const s=passDetails(v);
  let score=s.yards*.025+s.td*5-s.interceptions*2.5;

  // Efficiency is a bonus, not a punishment. It only applies with a real passing sample,
  // so one-off trick-play passes still get simple production credit without a fake boost.
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

function isOffenseLine(cat){return /^Pass/i.test(cat||'')||/^Rush/i.test(cat||'')||/^Receiv/i.test(cat||'')}
function isOffensePosition(pos){return ['QB','RB','WR','TE','ATH'].includes(pos)}

// Use the same passing production formula no matter who throws the ball. That way a
// RB/WR/TE trick-play completion or TD contributes to that player's offensive award score.
if(typeof pts==='function'){
  const basePts=pts;
  pts=function(cat,v){
    if(/^Pass/i.test(cat))return offensivePassingScore(v);
    return basePts(cat,v);
  };
}

if(typeof build==='function'){
  const baseBuild=build;
  build=function(){
    const rows=baseBuild();
    for(const p of rows){
      if(!isOffensePosition(p.pos))continue;

      // Every offensive award score uses ALL offensive production: passing + rushing +
      // receiving. Defensive and special-teams stats never inflate an offensive ranking.
      // QB rushing keeps its run-first weighting; everyone else uses the normal rush score.
      let score=0;
      for(const line of p.lines||[]){
        const cat=line.cat||'';
        if(/^Pass/i.test(cat))score+=offensivePassingScore(line.values);
        else if(/^Rush/i.test(cat))score+=p.pos==='QB'?qbRushingScore(line.values):Math.max(0,line.score||0);
        else if(/^Receiv/i.test(cat))score+=Math.max(0,line.score||0);
      }
      p.score=score;
      p.weightedScore=p.score*p.weight;
    }
    return rows;
  };
}

if(typeof topLine==='function'){
  const baseTopLine=topLine;
  const fmt=x=>x?`${x.cat}: ${Object.entries(x.values||{}).filter(([,v])=>String(v).trim()).slice(0,5).map(([k,v])=>`${k} ${v}`).join(', ')}`:'';
  topLine=function(p){
    if(isOffensePosition(p.pos)){
      const offense=(p.lines||[]).filter(x=>isOffenseLine(x.cat));
      if(offense.length){
        // Show up to two offensive categories so trick-play production is visible without
        // making mobile cards excessively tall.
        const ordered=[...offense].sort((a,b)=>{
          const score=x=>/^Pass/i.test(x.cat||'')?offensivePassingScore(x.values):(/^Rush/i.test(x.cat||'')&&p.pos==='QB'?qbRushingScore(x.values):Math.max(0,x.score||0));
          return score(b)-score(a);
        });
        return ordered.slice(0,2).map(fmt).join(' • ');
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
  note.textContent='OFFENSIVE AWARDS: passing + rushing + receiving all count for QB, RB, WR, TE and ATH. Defensive stats are excluded. Run-first QBs receive enhanced rushing credit.';
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