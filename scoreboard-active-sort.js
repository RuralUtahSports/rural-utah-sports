(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='scoreboard.html')return;

let scheduled=false;
const statusText=card=>String(card.querySelector('.status')?.textContent||'').trim().toUpperCase();
function clockSeconds(text){
  const m=String(text||'').match(/\b(\d{1,2}):(\d{2})(?:\.\d+)?\b/);
  return m?(Number(m[1])*60+Number(m[2])):9999;
}
function state(card){
  const s=statusText(card);
  const final=/\bFINAL\b/.test(s);
  let stage=0;
  if(/\bOT\b/.test(s))stage=6;
  else if(/\bQ4\b|\b4Q\b|\b4TH\b/.test(s))stage=5;
  else if(/\bQ3\b|\b3Q\b|\b3RD\b/.test(s))stage=4;
  else if(/\bHALFTIME\b/.test(s))stage=3.5;
  else if(/\bQ2\b|\b2Q\b|\b2ND\b/.test(s))stage=3;
  else if(/\bQ1\b|\b1Q\b|\b1ST\b/.test(s))stage=2;
  else if(/\bLIVE\b/.test(s))stage=1;
  return{active:!final&&stage>0,stage,clock:clockSeconds(s)};
}
function cardCompare(a,b){
  const A=state(a),B=state(b);
  if(A.active!==B.active)return A.active?-1:1;
  if(A.active&&B.active){
    if(A.stage!==B.stage)return B.stage-A.stage;
    if(A.clock!==B.clock)return A.clock-B.clock;
  }
  return Number(a.dataset.rusOriginalIndex||0)-Number(b.dataset.rusOriginalIndex||0);
}
function sectionCompare(a,b){
  const ac=[...a.querySelectorAll(':scope > .games > .game')].map(state).filter(x=>x.active);
  const bc=[...b.querySelectorAll(':scope > .games > .game')].map(state).filter(x=>x.active);
  if(!!ac.length!==!!bc.length)return ac.length?-1:1;
  if(ac.length&&bc.length){
    const bestA=ac.sort((x,y)=>y.stage-x.stage||x.clock-y.clock)[0];
    const bestB=bc.sort((x,y)=>y.stage-x.stage||x.clock-y.clock)[0];
    if(bestA.stage!==bestB.stage)return bestB.stage-bestA.stage;
    if(bestA.clock!==bestB.clock)return bestA.clock-bestB.clock;
  }
  return Number(a.dataset.rusOriginalIndex||0)-Number(b.dataset.rusOriginalIndex||0);
}
function sortBoard(){
  scheduled=false;
  const board=document.getElementById('board');
  if(!board)return;
  const sections=[...board.querySelectorAll(':scope > .date-section')];
  sections.forEach((section,si)=>{
    if(section.dataset.rusOriginalIndex==null)section.dataset.rusOriginalIndex=String(si);
    const host=section.querySelector(':scope > .games');
    if(!host)return;
    const cards=[...host.querySelectorAll(':scope > .game')];
    cards.forEach((card,ci)=>{if(card.dataset.rusOriginalIndex==null)card.dataset.rusOriginalIndex=String(ci)});
    const ordered=[...cards].sort(cardCompare);
    if(ordered.some((card,i)=>card!==cards[i]))ordered.forEach(card=>host.appendChild(card));
  });
  const now=[...board.querySelectorAll(':scope > .date-section')];
  const orderedSections=[...now].sort(sectionCompare);
  if(orderedSections.some((section,i)=>section!==now[i]))orderedSections.forEach(section=>board.appendChild(section));
}
function queue(){
  if(scheduled)return;
  scheduled=true;
  setTimeout(sortBoard,80);
}
function start(){
  const board=document.getElementById('board');
  if(!board)return;
  new MutationObserver(queue).observe(board,{childList:true,subtree:true,characterData:true});
  sortBoard();
  setInterval(sortBoard,30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
