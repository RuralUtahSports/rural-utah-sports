(()=>{
  if(window.RUSShareGraphic)return;
  window.RUSShareGraphic={};
  const PAGE=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!/award|standings|scoreboard|rankings/.test(PAGE))return;

  const css=`
  .rus-share-btn{appearance:none;border:0;border-radius:999px;background:#F14D07;color:#000;font:900 12px Arial,sans-serif;text-transform:uppercase;padding:11px 15px;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.35)}
  .rus-share-float{position:fixed;right:18px;bottom:88px;z-index:9996}
  .rus-share-modal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:16px}
  .rus-share-sheet{width:min(520px,100%);background:#111;border:1px solid #444;border-top:5px solid #F14D07;border-radius:14px;padding:18px;color:#fff;font-family:Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .rus-share-sheet h3{margin:0 0 6px;font-size:22px}.rus-share-sheet p{margin:0 0 14px;color:#aaa;font-size:12px;line-height:1.45}
  .rus-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rus-share-option{border:1px solid #444;border-radius:8px;background:#1d1d1d;color:#fff;padding:13px 10px;font-weight:900;cursor:pointer}.rus-share-option strong{display:block;color:#F14D07;font-size:12px}.rus-share-close{width:100%;margin-top:10px;border:0;background:#333;color:#fff;padding:12px;border-radius:8px;font-weight:900}
  .rus-share-region-label{display:block;margin:0 0 6px;color:#aaa;font-size:10px;font-weight:900;text-transform:uppercase}.rus-share-region{width:100%;height:44px;margin:0 0 13px;background:#1d1d1d;color:#fff;border:1px solid #444;border-radius:8px;padding:0 10px;font-weight:900}
  .rus-exporting .rus-share-btn,.rus-exporting .rus-share-float{visibility:hidden!important}
  .rus-export-board{position:fixed;left:-12000px;top:0;background:#0f0f0f;color:#fff;font-family:Arial,Helvetica,sans-serif;z-index:-1;box-sizing:border-box}
  .rus-export-rank-grid{display:grid;width:100%;height:100%;box-sizing:border-box}
  .rus-export-rank-item{position:relative;border:1px solid rgba(255,255,255,.14);border-left:8px solid var(--accent,#555);border-radius:10px;padding:9px 8px 7px;overflow:hidden;box-sizing:border-box;background:linear-gradient(135deg,var(--tint,rgba(255,255,255,.12)),#141414 72%);display:flex;flex-direction:column;align-items:center}
  .rus-export-rank-num{position:absolute;left:9px;top:12px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#252525;border:1px solid #555;color:#fff;font-size:16px;font-weight:1000}
  .rus-export-rank-num.top1{background:#d5ad35;color:#000;border-color:#f0d169}.rus-export-rank-num.top2{background:#b9bcc1;color:#000;border-color:#e0e2e5}.rus-export-rank-num.top3{background:#ad6b3d;color:#000;border-color:#d6976a}
  .rus-export-team-line{width:100%;min-width:0;display:block;text-align:center;padding-left:40px;padding-right:2px}.rus-export-team-wrap{width:100%;min-width:0;text-align:center}.rus-export-team{display:inline-block;max-width:100%;padding:5px 8px;border-radius:5px;background:var(--accent,#333);color:var(--team-text,#fff);font-size:16px;font-weight:1000;line-height:1.02;white-space:normal;overflow:visible;text-overflow:clip;text-align:center}.rus-export-record{font-size:12px;color:#fff;margin-top:4px;font-weight:1000;text-align:center}.rus-export-logo-wrap{margin-top:auto;height:94px;min-height:94px;max-height:94px;width:100%;display:flex;align-items:center;justify-content:center;padding:0 2px;overflow:visible;box-sizing:border-box}.rus-export-logo-large{display:block;width:auto;height:auto;max-width:100%;max-height:90px;object-fit:contain;object-position:center center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
  .rus-export-board.rus-export-landscape .rus-export-rank-item{padding-top:7px;padding-bottom:5px}.rus-export-board.rus-export-landscape .rus-export-team{font-size:15px;padding:4px 7px}.rus-export-board.rus-export-landscape .rus-export-record{font-size:11px;margin-top:3px}.rus-export-board.rus-export-landscape .rus-export-meta{font-size:9px;margin-top:3px;gap:3px 6px}.rus-export-board.rus-export-landscape .rus-export-logo-wrap{height:62px;min-height:62px;max-height:62px;padding:2px 4px;overflow:visible}.rus-export-board.rus-export-landscape .rus-export-logo-large{max-width:92%;max-height:56px;object-fit:contain;object-position:center center}.rus-export-meta{display:flex;justify-content:center;gap:5px 8px;flex-wrap:wrap;margin-top:4px;color:#d8d8d8;font-size:10px;font-weight:1000;text-transform:uppercase;text-align:center;line-height:1.1}.rus-export-move{font-size:18px;font-weight:1000;line-height:1}.rus-export-move.up{color:#62df8c}.rus-export-move.down{color:#ff7070}.rus-export-move.new{color:#F14D07}.rus-export-board.rus-export-landscape .rus-export-move{font-size:16px}
  .rus-export-logo-large.rus-export-logo-tall{max-width:84%;max-height:78px}.rus-export-board.rus-export-landscape .rus-export-logo-large.rus-export-logo-tall{display:block;width:auto;height:46px;max-width:72%;max-height:46px;object-fit:contain;object-position:center center}
  .rus-export-board.rus-export-state25 .rus-export-move{font-size:12px}
  .rus-export-overall-board{display:flex;flex-direction:column;gap:10px}
  .rus-export-overall-top3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%}
  .rus-export-overall-feature{position:relative;border:1px solid rgba(255,255,255,.16);border-top:7px solid var(--accent,#555);border-radius:12px;background:linear-gradient(145deg,var(--tint,rgba(255,255,255,.16)),#141414 74%);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:12px 10px 8px;overflow:hidden}
  .rus-export-overall-feature .rus-export-rank-num{left:10px;top:10px;width:36px;height:36px;font-size:16px}
  .rus-export-overall-feature .rus-export-team-line{padding:0 34px}.rus-export-overall-feature .rus-export-team{font-size:17px;padding:5px 8px}
  .rus-export-overall-feature .rus-export-record{font-size:11px;margin-top:3px}.rus-export-overall-feature .rus-export-meta{font-size:9px;margin-top:3px;gap:3px 6px}
  .rus-export-overall-feature .rus-export-logo-wrap{height:auto;min-height:0;max-height:none;flex:1;margin-top:4px;overflow:visible;padding:0 6px}.rus-export-overall-feature .rus-export-logo-large{max-height:88px;max-width:88%}
  .rus-export-overall-rest{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:column;gap:6px 9px;flex:1;min-height:0}
  .rus-export-overall-row{position:relative;display:grid;grid-template-columns:34px 44px minmax(0,1fr) auto;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);border-left:6px solid var(--accent,#555);border-radius:8px;background:linear-gradient(90deg,var(--tint,rgba(255,255,255,.12)),#141414 82%);padding:5px 7px;overflow:hidden;min-height:0}
  .rus-export-overall-row .rus-export-rank-num{position:static;width:29px;height:29px;font-size:13px}
  .rus-export-overall-row-logo{width:40px;height:40px;display:flex;align-items:center;justify-content:center;overflow:visible}.rus-export-overall-row-logo img{display:block;max-width:40px;max-height:40px;width:auto;height:auto;object-fit:contain;object-position:center}
  .rus-export-overall-row-main{min-width:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px}.rus-export-overall-row .rus-export-team{font-size:12px;padding:3px 5px;line-height:1;max-width:100%}
  .rus-export-overall-row-sub{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:#aaa;font-size:8px;font-weight:900;text-transform:uppercase;line-height:1}.rus-export-overall-row-record{color:#fff}
  .rus-export-overall-row .rus-export-move{font-size:12px;text-align:right;white-space:nowrap}
  .rus-export-board.rus-export-landscape .rus-export-overall-feature .rus-export-logo-large{max-height:62px}.rus-export-board.rus-export-landscape .rus-export-overall-feature .rus-export-team{font-size:15px}
  .rus-export-board.rus-export-landscape .rus-export-overall-row{grid-template-columns:28px 34px minmax(0,1fr) auto;gap:5px;padding:3px 5px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-rank-num{width:24px;height:24px;font-size:11px}.rus-export-board.rus-export-landscape .rus-export-overall-row-logo{width:31px;height:31px}.rus-export-board.rus-export-landscape .rus-export-overall-row-logo img{max-width:31px;max-height:31px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-team{font-size:10px}.rus-export-board.rus-export-landscape .rus-export-overall-row-sub{font-size:7px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-move{font-size:10px}
  @media(min-width:700px){.rus-share-modal{align-items:center}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function loadCanvas(){
    if(window.html2canvas)return Promise.resolve();
    return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  }
  let logoCachePromise=null;
  function loadLogoCache(){
    if(logoCachePromise)return logoCachePromise;
    logoCachePromise=fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    return logoCachePromise;
  }
  let schoolDirectoryPromise=null;
  function loadSchoolDirectory(){
    if(schoolDirectoryPromise)return schoolDirectoryPromise;
    schoolDirectoryPromise=fetch(`school-directory.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    return schoolDirectoryPromise;
  }
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  function candidates(){
    let sels=[];
    if(PAGE.includes('scoreboard')) sels=['.game','.date-section','#board'];
    else if(PAGE.includes('standings')) sels=['.group','.region-card','.standings-card','.standings-section','section'];
    else if(PAGE.includes('rankings')) sels=['.state25','.rank-card','#rankings','section'];
    else sels=['.award-card','.award-section','.awards-section','.team-section','section'];
    return [...new Set(sels.flatMap(s=>[...document.querySelectorAll(s)]))].filter(el=>el.offsetWidth>250&&el.offsetHeight>80);
  }
  function currentSection(){
    const list=candidates();if(!list.length)return document.querySelector('main')||document.body;
    const mid=innerHeight*.52;let best=list[0],score=Infinity;
    list.forEach(el=>{const r=el.getBoundingClientRect(),visible=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);if(visible<=0)return;const d=Math.abs((r.top+r.bottom)/2-mid)-visible*.15;if(d<score){score=d;best=el}});
    return best;
  }
  function titleFor(el){
    if(PAGE.includes('rankings')){
      const card=el.matches?.('.rank-card')?el:el.closest?.('.rank-card');
      if(card){
        const cls=card.querySelector('.rank-head h2')?.textContent?.trim();
        const label=card.querySelector('.rank-head span')?.textContent?.trim();
        if(cls&&label)return `${cls} ${label}`.slice(0,70);
      }
    }
    const h=el.querySelector?.('h1,h2,h3,.team-name,.region-title,.rank-head')?.textContent?.trim();
    if(h)return h.slice(0,70);
    if(PAGE.includes('scoreboard'))return 'Rural Utah Sports Scoreboard';
    if(PAGE.includes('standings'))return 'Rural Utah Sports Standings';
    if(PAGE.includes('rankings'))return 'Rural Utah Sports Rankings';
    return 'Rural Utah Sports Awards';
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
  function teamFromRow(row){
    const link=row.querySelector('a.team-link[href*="team.html"],a[href*="team.html?team="]');
    if(link){try{const t=new URL(link.href,location.href).searchParams.get('team');if(t)return t.trim()}catch{}}
    return (row.querySelector('.team-pill')?.childNodes?.[0]?.textContent||row.querySelector('.team-pill')?.textContent||row.querySelector('.team-link')?.textContent||'').trim().replace(/\s+\d+[-–]\d+(?:[-–]\d+)?$/,'');
  }
  function rgba(hex,a){
    const m=String(hex||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return `rgba(255,255,255,${a})`;
    const n=parseInt(m[1],16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  function contrast(hex){
    const m=String(hex||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return '#fff';
    const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#000':'#fff';
  }
  async function overallRankingSource(root,rows,w,h){
    if(!rows?.length)return null;
    const [logos,directory]=await Promise.all([loadLogoCache(),loadSchoolDirectory()]);
    const top=108,bottom=54,pad=30,availableH=h-top-bottom;
    let richExportSrc='';
    if(rows.some(row=>norm(teamFromRow(row))==='RICH')){
      try{
        const richSvg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        richExportSrc=(richSvg.match(/href=[\"'](data:image\/(?:png|webp);base64,[^\"']+)[\"']/i)||[])[1]||'';
      }catch{}
    }
    const data=rows.map((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=teamFromRow(row);
      const cls=(row.querySelector('.small-school-class')?.textContent||'').trim();
      const elo=(row.querySelector('.small-school-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement'),move=(moveEl?.textContent||'').trim(),moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const record=(row.querySelector('.rus-ranking-record,.rus-live-record,.team-record,.record')?.textContent||'').trim();
      const existing=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const src=(norm(team)==='RICH'&&richExportSrc)||logos[norm(team)]||existing||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      const accent=getComputedStyle(row).getPropertyValue('--small-accent').trim()||getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555555';
      return {rank,team,cls,elo,move,moveClass,record,src,accent};
    });
    const board=document.createElement('div');board.className='rus-export-board rus-export-overall-board'+(w>h*1.25?' rus-export-landscape':'');board.style.width=`${w-pad*2}px`;board.style.height=`${availableH}px`;
    const featureH=w>h*1.25?145:(h>w*1.35?230:190);
    const top3=document.createElement('div');top3.className='rus-export-overall-top3';top3.style.height=`${featureH}px`;top3.style.flex=`0 0 ${featureH}px`;
    data.slice(0,3).forEach(d=>{
      const item=document.createElement('div');item.className='rus-export-overall-feature';item.style.setProperty('--accent',d.accent);item.style.setProperty('--tint',rgba(d.accent,.38));item.style.setProperty('--team-text',contrast(d.accent));
      const topClass=Number(d.rank)<=3?` top${Number(d.rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${topClass}">${esc(d.rank)}</div><div class="rus-export-team-line"><div class="rus-export-team-wrap"><div class="rus-export-team">${esc(d.team)}</div></div></div>${d.record?`<div class="rus-export-record">${esc(d.record)}</div>`:''}<div class="rus-export-meta">${d.cls?`<span>${esc(d.cls)}</span>`:''}${d.elo?`<span>ELO ${esc(d.elo)}</span>`:''}${d.move?`<span class="rus-export-move ${d.moveClass}">${esc(d.move)}</span>`:''}</div>${d.src?`<div class="rus-export-logo-wrap"><img class="rus-export-logo-large${norm(d.team)==='RICH'?' rus-export-logo-tall':''}" src="${esc(d.src)}" alt="${esc(d.team)} logo"></div>`:''}`;
      top3.appendChild(item);
    });
    const restData=data.slice(3),cols=3,rowsPerCol=Math.ceil(restData.length/cols);
    const rest=document.createElement('div');rest.className='rus-export-overall-rest';rest.style.gridTemplateRows=`repeat(${rowsPerCol},minmax(0,1fr))`;
    restData.forEach(d=>{
      const item=document.createElement('div');item.className='rus-export-overall-row';item.style.setProperty('--accent',d.accent);item.style.setProperty('--tint',rgba(d.accent,.24));item.style.setProperty('--team-text',contrast(d.accent));
      item.innerHTML=`<div class="rus-export-rank-num">${esc(d.rank)}</div>${d.src?`<div class="rus-export-overall-row-logo"><img src="${esc(d.src)}" alt="${esc(d.team)} logo"></div>`:'<div class="rus-export-overall-row-logo"></div>'}<div class="rus-export-overall-row-main"><div class="rus-export-team">${esc(d.team)}</div><div class="rus-export-overall-row-sub">${d.record?`<span class="rus-export-overall-row-record">${esc(d.record)}</span>`:''}${d.cls?`<span>${esc(d.cls)}</span>`:''}${d.elo?`<span>ELO ${esc(d.elo)}</span>`:''}</div></div>${d.move?`<div class="rus-export-move ${d.moveClass}">${esc(d.move)}</div>`:'<div></div>'}`;
      rest.appendChild(item);
    });
    board.append(top3,rest);document.body.appendChild(board);return {node:board,top,bottom,pad};
  }
  async function rankingSource(el,w,h){
    if(!PAGE.includes('rankings'))return null;
    const stateRoot=el.matches?.('.state25')?el:el.closest?.('.state25');
    const stateRows=stateRoot?[...stateRoot.querySelectorAll('.state25-row')]:[];
    const smallRoot=el.matches?.('.small-school-section')?el:el.closest?.('.small-school-section');
    const smallRows=smallRoot?[...smallRoot.querySelectorAll('.small-school-row')]:[];
    if(smallRows.length)return overallRankingSource(smallRoot,smallRows,w,h);
    const classRoot=el.matches?.('.rank-card')?el:el.closest?.('.rank-card');
    const classRows=classRoot?[...classRoot.querySelectorAll('.rank-row')]:[];
    const rows=(stateRows.length?stateRows:classRows).slice(0,25);if(!rows.length)return null;
    const [logos,directory]=await Promise.all([loadLogoCache(),loadSchoolDirectory()]);
    const top=108,bottom=54,pad=30,gap=10,availableH=h-top-bottom;
    const verticalClass=classRows.length>0&&!stateRows.length;
    const cols=verticalClass?2:rows.length>20?(h>w*1.35?3:5):rows.length>10?(h>w*1.35?2:4):2;
    const rowsPerCol=Math.ceil(rows.length/cols);
    const rowH=verticalClass?Math.max(100,Math.floor((availableH-gap*(rowsPerCol-1))/rowsPerCol)):Math.max(72,Math.floor((availableH-gap*(rowsPerCol-1))/rowsPerCol));
    const board=document.createElement('div');board.className='rus-export-board'+(w>h*1.25?' rus-export-landscape':'')+(stateRows.length?' rus-export-state25':'');board.style.width=`${w-pad*2}px`;board.style.height=`${availableH}px`;
    const grid=document.createElement('div');grid.className='rus-export-rank-grid';grid.style.gridTemplateColumns=`repeat(${cols},minmax(0,1fr))`;grid.style.gridTemplateRows=`repeat(${rowsPerCol},${rowH}px)`;grid.style.gridAutoFlow=verticalClass?'column':'row';grid.style.gap=`${gap}px`;
    let richExportSrc='';
    if(rows.some(row=>norm(teamFromRow(row))==='RICH')){
      try{
        const richSvg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        richExportSrc=(richSvg.match(/href=[\"'](data:image\/(?:png|webp);base64,[^\"']+)[\"']/i)||[])[1]||'';
      }catch{}
    }
    rows.forEach((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=teamFromRow(row);
      const cls=(row.querySelector('.state25-class')?.textContent||row.querySelector('.team-class')?.textContent||'').trim();
      const dirEntry=directory[norm(team)]||null;
      const region=dirEntry?.uhsaaRegion?`Region ${dirEntry.uhsaaRegion}`:'';
      const elo=(row.querySelector('.state25-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement'),move=(moveEl?.textContent||'').trim(),moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const record=(row.querySelector('.rus-ranking-record,.rus-live-record,.team-record,.record')?.textContent||'').trim();
      const existing=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const src=(norm(team)==='RICH'&&richExportSrc)||logos[norm(team)]||existing||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      const accent=getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555555';
      const item=document.createElement('div');item.className='rus-export-rank-item';item.style.setProperty('--accent',accent);item.style.setProperty('--tint',rgba(accent,.34));item.style.setProperty('--team-text',contrast(accent));
      const topClass=Number(rank)<=3?` top${Number(rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${topClass}">${esc(rank)}</div><div class="rus-export-team-line"><div class="rus-export-team-wrap"><div class="rus-export-team">${esc(team)}</div></div></div>${record?`<div class="rus-export-record">${esc(record)}</div>`:''}<div class="rus-export-meta">${cls?`<span>${esc(cls)}</span>`:''}${region?`<span>${esc(region)}</span>`:''}${elo?`<span>ELO ${esc(elo)}</span>`:''}${move?`<span class="rus-export-move ${moveClass}">${esc(move)}</span>`:''}</div>${src?`<div class="rus-export-logo-wrap"><img class="rus-export-logo-large${norm(team)==='RICH'?' rus-export-logo-tall':''}" src="${esc(src)}" alt="${esc(team)} logo"></div>`:''}`;
      grid.appendChild(item);
    });
    board.appendChild(grid);document.body.appendChild(board);return {node:board,top,bottom,pad};
  }
  async function render(el,w,h,label){
    await loadCanvas();document.documentElement.classList.add('rus-exporting');let special=null;
    try{
      special=await rankingSource(el,w,h);const target=special?.node||el;
      const source=await html2canvas(target,{backgroundColor:'#111111',scale:2,useCORS:true,allowTaint:false,logging:false,windowWidth:Math.max(document.documentElement.clientWidth,target.scrollWidth)});
      const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,w,h);
      let top=special?.top??120,bottom=special?.bottom??105,pad=special?.pad??42,maxW=w-pad*2,maxH=h-top-bottom;
      const scale=Math.min(maxW/source.width,maxH/source.height,2.1),dw=source.width*scale,dh=source.height*scale;
      const dx=(w-dw)/2,dy=special?top:top+(maxH-dh)/2;c.drawImage(source,dx,dy,dw,dh);
      c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
      c.fillStyle='#fff';c.font=`900 ${w>=1500?42:38}px Arial`;c.textAlign='left';c.fillText(label,50,58);
      c.fillStyle='#F14D07';c.font='900 21px Arial';c.fillText('RURAL UTAH SPORTS',50,91);
      c.fillStyle='#888';c.font='700 16px Arial';c.fillText('ruralutahsports.github.io',50,h-28);
      return await new Promise(r=>out.toBlob(r,'image/png',1));
    }finally{special?.node?.remove();document.documentElement.classList.remove('rus-exporting')}
  }
  async function deliver(blob,name){
    const file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Rural Utah Sports'});return}catch(e){if(e?.name==='AbortError')return}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  function standingsRegions(){
    return [...document.querySelectorAll('.group')].map((el,i)=>({el,title:(el.querySelector('.group-title')?.textContent||`Region ${i+1}`).trim()})).filter(x=>x.title);
  }
  async function ensureRegionView(){
    if(!PAGE.includes('standings'))return;
    const btn=document.getElementById('regionBtn');
    if(btn&&!btn.classList.contains('active')){
      btn.click();
      await new Promise(r=>setTimeout(r,90));
    }
    const filter=document.getElementById('filter');
    if(filter&&filter.value!=='all'){
      filter.value='all';
      filter.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,70));
    }
  }
  async function make(format,target=null,labelOverride=''){
    const el=target||currentSection(),label=labelOverride||titleFor(el),dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const blob=await render(el,dims[0],dims[1],label);await deliver(blob,`rural-utah-sports-${format}-${Date.now()}.png`);
  }
  async function modal(){
    let standingsControls='';
    if(PAGE.includes('standings')){
      await ensureRegionView();
      const regions=standingsRegions();
      const classSelect=document.getElementById('filter');
      const classes=classSelect?[...classSelect.options].filter(o=>o.value&&o.value!=='all').map(o=>({value:o.value,label:o.textContent.trim()})):[];
      standingsControls=`<label class="rus-share-region-label">Share View</label><select class="rus-share-region rus-share-standings-scope"><option value="region">Single Region</option><option value="classification">Whole Classification — Region by Region</option></select><div class="rus-share-region-picker"><label class="rus-share-region-label">Region</label><select class="rus-share-region rus-share-region-select">${regions.map((r,i)=>`<option value="${i}">${esc(r.title)}</option>`).join('')}</select></div><div class="rus-share-class-picker" style="display:none"><label class="rus-share-region-label">Classification</label><select class="rus-share-region rus-share-class-select">${classes.map(c=>`<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select></div>`;
    }
    const el=document.createElement('div');el.className='rus-share-modal';el.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>${PAGE.includes('standings')?'Share one region, or choose a whole classification to put every region in that class on one graphic using the same region-by-region standings look.':'Creates a branded graphic from the section currently in view. Rankings use team colors, local logos and a layout that fills the canvas.'}</p>${standingsControls}<div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(el);
    const scope=el.querySelector('.rus-share-standings-scope');
    if(scope){
      const sync=()=>{const whole=scope.value==='classification';el.querySelector('.rus-share-region-picker').style.display=whole?'none':'';el.querySelector('.rus-share-class-picker').style.display=whole?'':'none'};
      scope.addEventListener('change',sync);sync();
    }
    el.querySelector('.rus-share-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{const f=b.dataset.f;b.disabled=true;b.textContent='Creating…';try{let target=null,label='';if(PAGE.includes('standings')){const shareScope=el.querySelector('.rus-share-standings-scope')?.value||'region';if(shareScope==='classification'){
          const filter=document.getElementById('filter'),classValue=el.querySelector('.rus-share-class-select')?.value||'',classLabelText=el.querySelector('.rus-share-class-select')?.selectedOptions?.[0]?.textContent?.trim()||classValue;
          if(filter&&classValue){filter.value=classValue;filter.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,90));}
          target=document.getElementById('content');label=`${classLabelText} Standings • Region by Region`;
        }else{
          if(document.getElementById('filter')?.value!=='all'){const filter=document.getElementById('filter');filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,70));}
          const regions=standingsRegions(),idx=Number(el.querySelector('.rus-share-region-select')?.value||0);target=regions[idx]?.el||null;
        }}await make(f,target,label);el.remove()}catch(err){console.error(err);b.disabled=false;b.textContent='Try Again';alert('Could not create the graphic. Please try again.')}});
  }
  function init(){const b=document.createElement('button');b.className='rus-share-btn rus-share-float';b.textContent='Share Graphic';b.onclick=modal;document.body.appendChild(b)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();