(()=>{
'use strict';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
if(path!=='team.html')return;
const clean=v=>String(v??'').trim(),esc=v=>clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const aliases={'GUNNISON':'GUNNISON VALLEY','MAPLE MTN':'MAPLE MOUNTAIN','MONUMENT VAL':'MONUMENT VALLEY','CEDAR':'CEDAR CITY','SUMMIT':'SUMMIT ACADEMY','WASATCH ACADEMY':'WASATCH ACAD','AMERICAN LEADERSHIP':'ALA','AMERICAN LEADERSHIP ACADEMY':'ALA'};
const norm=v=>clean(v).toUpperCase().replace(/\s+/g,' ').replace(/\.+$/,'').trim(),key=v=>aliases[norm(v)]||norm(v),stripSeed=v=>clean(v).replace(/^#\s*\d+\s*/,'').trim(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const scoreNum=v=>{const n=Number(clean(v));return Number.isFinite(n)?n:null};
function winner(g){const a=scoreNum(g?.[1]),b=scoreNum(g?.[3]);if(a===null||b===null||a===b)return'';return a>b?key(stripSeed(g[0])):key(stripSeed(g[2]))}
function opponent(g,team){const a=key(stripSeed(g?.[0])),b=key(stripSeed(g?.[2]));if(a===team)return b;if(b===team)return a;return''}
function findTable(){const h=[...document.querySelectorAll('#page .section-title')].find(x=>x.textContent.trim().toLowerCase()==='greatest seasons');return h?.nextElementSibling?.querySelector('table')||null}
function styles(){if(document.getElementById('rus-greatest-path-style'))return;const s=document.createElement('style');s.id='rus-greatest-path-style';s.textContent=`
.rus-greatest-path-table{min-width:1360px!important}.rus-path-accent{color:#F14D07;font-weight:900}.rus-path-finish{font-weight:900}.rus-path-finish.champion{color:#f7c948}.rus-path-finish.runner-up{color:#ddd}.rus-path-details{text-align:left;white-space:normal;min-width:245px}.rus-path-details summary{cursor:pointer;color:#F14D07;font-weight:900;white-space:nowrap}.rus-path-line{padding:5px 0;border-top:1px solid #292929;color:#bbb;font-size:11px}.rus-path-line:first-of-type{margin-top:6px}.rus-path-line b{color:#fff}.rus-path-note{color:#888;font-size:11px;line-height:1.45;margin-top:8px}.rus-path-loading{color:#777;font-size:11px}
`;document.head.appendChild(s)}
function seasonIndex(data){const m=new Map();for(const [name,rows] of Object.entries(data||{})){for(const r of rows||[])m.set(`${key(name)}|${Number(r.year)}`,r)}return m}
function bracketRun(data,team,year,index){
  let best=null;
  for(const [classification,raw] of Object.entries(data||{})){
    if(!Array.isArray(raw))continue;
    const rounds=raw.filter(r=>Array.isArray(r)&&Array.isArray(r[1]));
    const path=[];
    let finalIndex=-1;
    for(let ri=0;ri<rounds.length;ri++){
      const [roundName,games]=rounds[ri];
      const g=games.find(x=>{const a=key(stripSeed(x?.[0])),b=key(stripSeed(x?.[2]));return a===team||b===team});
      if(!g)continue;
      const w=winner(g),opp=opponent(g,team);
      if(!opp||!w)continue;
      const won=w===team,rec=index.get(`${opp}|${year}`)||null;
      path.push({round:clean(roundName)||`Round ${ri+1}`,opp,won,rec});
      finalIndex=ri;
      if(!won)break;
    }
    if(!path.length)continue;
    const last=path.at(-1),actualFinal=rounds.length-1;
    let finish='Playoffs';
    if(last.won&&finalIndex===actualFinal)finish='Champion';
    else if(!last.won&&finalIndex===actualFinal)finish='Runner-Up';
    else finish=last.round;
    const wins=path.filter(x=>x.won).length;
    const valid=path.filter(x=>x.rec&&Number(x.rec.games)>=3),need=Math.ceil(path.length*.8);
    let avgPct=null,avgMargin=null,strength=null;
    if(valid.length){
      avgPct=valid.reduce((sum,x)=>sum+Number(x.rec.winPct||0),0)/valid.length;
      avgMargin=valid.reduce((sum,x)=>sum+Number(x.rec.avgMargin||0),0)/valid.length;
      const winShare=valid.filter(x=>Number(x.rec.winPct||0)>.5).length/valid.length;
      if(valid.length>=need)strength=+(avgPct*70+winShare*15+clamp((avgMargin+10)/35,0,1)*15).toFixed(1);
    }
    const run={classification,path,wins,finish,avgPct,avgMargin,strength,valid:valid.length};
    if(!best||run.path.length>best.path.length)best=run;
  }
  return best;
}
function finishClass(v){return clean(v).toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'')}
function pathCell(run){if(!run)return'<span class="rus-path-loading">No recorded bracket</span>';return `<details><summary>View path</summary>${run.path.map(x=>{const r=x.rec,rec=r?`${Number(r.wins||0)}-${Number(r.losses||0)}${Number(r.ties||0)?'-'+Number(r.ties):''}, ${(Number(r.winPct||0)*100).toFixed(1)}%`:'record unavailable';return `<div class="rus-path-line"><b>${esc(x.round)}</b> — ${esc(x.opp)} (${esc(rec)})</div>`}).join('')}</details>`}
async function enhance(){styles();let tries=0;const wait=async()=>{const table=findTable();if(!table||!table.tBodies[0]?.rows.length){if(++tries<100)setTimeout(wait,100);return}if(table.dataset.rusPaths==='1')return;table.dataset.rusPaths='1';table.classList.add('rus-greatest-path-table');const rows=[...table.tBodies[0].rows].filter(r=>r.cells.length>=8),years=[...new Set(rows.map(r=>Number(r.cells[0]?.textContent)).filter(Number.isFinite))],team=key(new URLSearchParams(location.search).get('team')||document.querySelector('.team-title')?.textContent||'');if(!team||!years.length)return;
      const heads=['Finish','PO Wins','Opp. Win %','Opp. Avg Margin','Path Strength','Playoff Path'];for(const h of heads){const th=document.createElement('th');th.textContent=h;table.tHead.rows[0].appendChild(th)}for(const row of rows)for(let i=0;i<heads.length;i++){const td=document.createElement('td');td.innerHTML='<span class="rus-path-loading">…</span>';row.appendChild(td)}
      try{const sr=await fetch('season-history.json?v=20260812b');if(!sr.ok)throw new Error('season history');const idx=seasonIndex(await sr.json()),brackets=new Map();await Promise.all(years.map(async y=>{try{const r=await fetch(`brackets-${y}.json?v=20260812b`);if(r.ok)brackets.set(y,await r.json())}catch(e){}}));for(const row of rows){const y=Number(row.cells[0].textContent),run=brackets.has(y)?bracketRun(brackets.get(y),team,y,idx):null,base=8;row.cells[base].innerHTML=run?`<span class="rus-path-finish ${finishClass(run.finish)}">${esc(run.finish)}</span>`:'—';row.cells[base+1].textContent=run?String(run.wins):'—';row.cells[base+2].textContent=run&&run.avgPct!==null?(run.avgPct*100).toFixed(1)+'%':'—';row.cells[base+3].textContent=run&&run.avgMargin!==null?(run.avgMargin>0?'+':'')+run.avgMargin.toFixed(1):'—';row.cells[base+4].innerHTML=run&&run.strength!==null?`<span class="rus-path-accent">${run.strength.toFixed(1)}</span>`:'—';row.cells[base+5].className='rus-path-details';row.cells[base+5].innerHTML=pathCell(run)}const wrap=table.closest('.table-wrap');if(wrap&&!wrap.nextElementSibling?.classList.contains('rus-path-note'))wrap.insertAdjacentHTML('afterend','<p class="rus-path-note">Playoff context is calculated from the RUS bracket archive and opponent season records. Path Strength uses the same opponent-quality formula as History Lab; at least 80% of the playoff path must have usable opponent season data.</p>');
      }catch(e){console.warn('Greatest season playoff context unavailable',e);for(const row of rows)for(let i=8;i<14;i++)if(row.cells[i])row.cells[i].textContent='—'}
      const eloTitle=[...document.querySelectorAll('#page .section-title')].find(x=>x.textContent.trim().toLowerCase()==='elo history');if(eloTitle){let n=eloTitle.nextElementSibling;while(n&&!n.classList?.contains('section-title')){if(n.classList?.contains('note')){n.textContent='ELO is generated by the Clean ELO workflow from the deduplicated master game database. Hover over the chart (or tap it on mobile) to inspect individual games.';break}n=n.nextElementSibling}}
    };wait()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
