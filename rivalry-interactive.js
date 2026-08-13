(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
if(path!=='rivalry.html')return;
const SVG='http://www.w3.org/2000/svg';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

function addStyles(){
  if(document.getElementById('rus-rival-interactive-style'))return;
  const s=document.createElement('style');
  s.id='rus-rival-interactive-style';
  s.textContent=`
    .chart-wrap.rus-rival-interactive{position:relative;touch-action:pan-x pan-y}
    .rus-rival-hit{cursor:pointer;outline:none}
    .rus-rival-point{transition:r .12s ease,fill .12s ease,stroke-width .12s ease;pointer-events:none}
    .rus-rival-point.rus-active{r:8;fill:#F14D07!important;stroke:#fff!important;stroke-width:3!important}
    .rus-rival-guide{stroke:#999;stroke-width:1;stroke-dasharray:5 5;pointer-events:none;opacity:.7}
    .rus-rival-tooltip{position:absolute;z-index:12;display:none;width:250px;max-width:calc(100% - 16px);background:#050505;border:1px solid #F14D07;border-radius:7px;padding:11px 12px;box-shadow:0 8px 22px rgba(0,0,0,.55);pointer-events:none;line-height:1.35}
    .rus-rival-tooltip.show{display:block}
    .rus-rival-tooltip .date{color:#888;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.4px}
    .rus-rival-tooltip .score{display:block;color:#fff!important;font-size:14px;font-weight:900;margin:4px 0 7px}
    .rus-rival-tooltip .series{color:#F14D07;font-size:12px;font-weight:900}
    .rus-rival-tooltip .lead{color:#aaa;font-size:11px;margin-top:3px}
    .rus-rival-chart-hint{color:#777;font-size:10px;margin-top:7px;padding:0 3px;text-transform:uppercase;font-weight:800}
    @media(max-width:650px){.rus-rival-tooltip{width:220px}.rus-rival-chart-hint{font-size:9px}}
  `;
  document.head.appendChild(s);
}

function chartSection(){
  return [...document.querySelectorAll('#rivalryPage .section')].find(s=>s.querySelector('.section-head h2')?.textContent.trim().toLowerCase()==='series lead through time');
}
function meetingRows(){
  const sec=[...document.querySelectorAll('#rivalryPage .section')].find(s=>s.querySelector('.section-head h2')?.textContent.trim().toLowerCase()==='every recorded meeting');
  if(!sec)return[];
  return [...sec.querySelectorAll('tbody tr')].map(tr=>{
    const td=tr.querySelectorAll('td');
    if(td.length<5)return null;
    return {date:td[0].textContent.trim(),team1:td[1].textContent.trim(),score:td[2].textContent.trim(),team2:td[3].textContent.trim(),result:td[4].textContent.trim().toUpperCase()};
  }).filter(Boolean).reverse();
}
function seriesEntries(a,b){
  let aw=0,bw=0,t=0;
  return meetingRows().map(g=>{
    if(g.result==='W')aw++;else if(g.result==='L')bw++;else t++;
    return {...g,aw,bw,t,lead:aw-bw};
  });
}
function leadText(e,a,b){
  if(e.lead>0)return `${a} leads by ${e.lead}`;
  if(e.lead<0)return `${b} leads by ${Math.abs(e.lead)}`;
  return 'Series tied';
}
function seriesRecord(e){return `${e.aw}-${e.bw}${e.t?'-'+e.t:''}`}

function enhance(){
  const sec=chartSection(),wrap=sec?.querySelector('.chart-wrap'),svg=wrap?.querySelector('svg');
  if(!wrap||!svg||wrap.dataset.rusInteractive==='1')return;
  const a=document.getElementById('team1')?.value||'',b=document.getElementById('team2')?.value||'';
  const entries=seriesEntries(a,b),points=[...svg.querySelectorAll('circle')].filter(c=>!c.classList.contains('rus-rival-hit'));
  if(!entries.length||points.length!==entries.length)return;
  wrap.dataset.rusInteractive='1';wrap.classList.add('rus-rival-interactive');
  const intro=sec.querySelector('.section-head p');if(intro)intro.textContent='Each point shows the cumulative win lead after a meeting. Hover, tap, or use the keyboard to inspect any game.';

  const guide=document.createElementNS(SVG,'line');guide.classList.add('rus-rival-guide');guide.setAttribute('y1','25');guide.setAttribute('y2','225');guide.style.display='none';svg.appendChild(guide);
  const tip=document.createElement('div');tip.className='rus-rival-tooltip';tip.setAttribute('role','status');wrap.appendChild(tip);
  const hint=document.createElement('div');hint.className='rus-rival-chart-hint';hint.textContent='Hover or tap a point • arrow keys move between meetings • tap again to unpin';wrap.insertAdjacentElement('afterend',hint);

  let active=-1,pinned=false;
  const hits=[];
  points.forEach((p,i)=>{
    p.classList.add('rus-rival-point');
    const hit=document.createElementNS(SVG,'circle');
    hit.classList.add('rus-rival-hit');hit.dataset.index=String(i);hit.setAttribute('cx',p.getAttribute('cx'));hit.setAttribute('cy',p.getAttribute('cy'));hit.setAttribute('r','14');hit.setAttribute('fill','transparent');hit.setAttribute('stroke','transparent');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',`${entries[i].date}: ${entries[i].team1} ${entries[i].score} ${entries[i].team2}. Series ${seriesRecord(entries[i])}. ${leadText(entries[i],a,b)}.`);svg.appendChild(hit);hits.push(hit);
  });

  function hide(){
    if(active>=0)points[active]?.classList.remove('rus-active');
    active=-1;guide.style.display='none';tip.classList.remove('show');
  }
  function show(i){
    if(i<0||i>=entries.length)return;
    if(active>=0)points[active]?.classList.remove('rus-active');
    active=i;const p=points[i],e=entries[i];p.classList.add('rus-active');
    const cx=p.getAttribute('cx');guide.setAttribute('x1',cx);guide.setAttribute('x2',cx);guide.style.display='';
    tip.innerHTML=`<div class="date">${esc(e.date)} • Meeting ${i+1} of ${entries.length}</div><span class="score">${esc(e.team1)} ${esc(e.score)} ${esc(e.team2)}</span><div class="series">Series after game: ${esc(a)} ${seriesRecord(e)}</div><div class="lead">${esc(leadText(e,a,b))}</div>`;
    tip.classList.add('show');
    requestAnimationFrame(()=>{
      const pr=p.getBoundingClientRect(),wr=wrap.getBoundingClientRect();
      let left=(pr.left+pr.width/2-wr.left)+wrap.scrollLeft-tip.offsetWidth/2;
      let top=(pr.top-wr.top)+wrap.scrollTop-tip.offsetHeight-13;
      left=Math.max(wrap.scrollLeft+8,Math.min(left,wrap.scrollLeft+wrap.clientWidth-tip.offsetWidth-8));
      if(top<wrap.scrollTop+8)top=(pr.bottom-wr.top)+wrap.scrollTop+12;
      tip.style.left=`${left}px`;tip.style.top=`${top}px`;
    });
  }
  hits.forEach((hit,i)=>{
    hit.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!pinned)show(i)});
    hit.addEventListener('focus',()=>{pinned=false;show(i)});
    hit.addEventListener('click',e=>{e.stopPropagation();if(pinned&&active===i){pinned=false;hide()}else{pinned=true;show(i)}});
    hit.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();pinned=!pinned;if(pinned)show(i);else hide();return}
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();const n=Math.max(0,Math.min(hits.length-1,i+(e.key==='ArrowRight'?1:-1)));pinned=false;hits[n].focus();show(n);
      }
    });
  });
  wrap.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!pinned)hide()});
  wrap.addEventListener('click',e=>{if(e.target===wrap||e.target===svg){pinned=false;hide()}});
}

function init(){addStyles();enhance();const host=document.getElementById('rivalryPage');if(host)new MutationObserver(()=>requestAnimationFrame(enhance)).observe(host,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
