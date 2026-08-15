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
  .rus-exporting .rus-share-btn,.rus-exporting .rus-share-float{visibility:hidden!important}
  .rus-export-board{position:fixed;left:-12000px;top:0;background:#0f0f0f;color:#fff;font-family:Arial,Helvetica,sans-serif;z-index:-1;box-sizing:border-box}
  .rus-export-rank-grid{display:grid;width:100%;height:100%;box-sizing:border-box}
  .rus-export-rank-item{position:relative;border:1px solid rgba(255,255,255,.14);border-left:8px solid var(--accent,#555);border-radius:10px;padding:12px 10px 10px 50px;overflow:hidden;box-sizing:border-box;background:linear-gradient(135deg,var(--tint,rgba(255,255,255,.12)),#141414 72%)}
  .rus-export-rank-num{position:absolute;left:9px;top:12px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#252525;border:1px solid #555;color:#fff;font-size:16px;font-weight:1000}
  .rus-export-rank-num.top1{background:#d5ad35;color:#000;border-color:#f0d169}.rus-export-rank-num.top2{background:#b9bcc1;color:#000;border-color:#e0e2e5}.rus-export-rank-num.top3{background:#ad6b3d;color:#000;border-color:#d6976a}
  .rus-export-team-line{display:flex;align-items:flex-start;gap:8px;min-width:0}.rus-export-logo{width:44px;height:44px;object-fit:contain;flex:0 0 44px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))}.rus-export-team-wrap{min-width:0;flex:1}.rus-export-team{display:inline-block;max-width:100%;padding:5px 7px;border-radius:5px;background:var(--accent,#333);color:var(--team-text,#fff);font-size:16px;font-weight:1000;line-height:1.02;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:normal}.rus-export-record{font-size:11px;color:#eee;margin-top:5px;font-weight:900}
  .rus-export-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;color:#d0d0d0;font-size:11px;font-weight:900;text-transform:uppercase}.rus-export-move.up{color:#62df8c}.rus-export-move.down{color:#ff7070}.rus-export-move.new{color:#F14D07}
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
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  function candidates(){
    let sels=[];
    if(PAGE.includes('scoreboard')) sels=['.game','.date-section','#board'];
    else if(PAGE.includes('standings')) sels=['.region-card','.standings-card','.standings-section','section'];
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
  async function rankingSource(el,w,h){
    if(!PAGE.includes('rankings'))return null;
    const stateRoot=el.matches?.('.state25')?el:el.closest?.('.state25');
    const stateRows=stateRoot?[...stateRoot.querySelectorAll('.state25-row')]:[];
    const classRoot=el.matches?.('.rank-card')?el:el.closest?.('.rank-card');
    const classRows=classRoot?[...classRoot.querySelectorAll('.rank-row')]:[];
    const rows=(stateRows.length?stateRows:classRows).slice(0,25);if(!rows.length)return null;
    const logos=await loadLogoCache();
    const top=108,bottom=54,pad=30,gap=10,availableH=h-top-bottom;
    const cols=rows.length>20?(h>w*1.35?3:5):rows.length>10?(h>w*1.35?2:4):2;
    const rowsPerCol=Math.ceil(rows.length/cols);
    const rowH=Math.max(72,Math.floor((availableH-gap*(rowsPerCol-1))/rowsPerCol));
    const board=document.createElement('div');board.className='rus-export-board';board.style.width=`${w-pad*2}px`;board.style.height=`${availableH}px`;
    const grid=document.createElement('div');grid.className='rus-export-rank-grid';grid.style.gridTemplateColumns=`repeat(${cols},minmax(0,1fr))`;grid.style.gridTemplateRows=`repeat(${rowsPerCol},${rowH}px)`;grid.style.gridAutoFlow='row';grid.style.gap=`${gap}px`;
    rows.forEach((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=teamFromRow(row);
      const cls=(row.querySelector('.state25-class')?.textContent||row.querySelector('.team-class')?.textContent||'').trim();
      const elo=(row.querySelector('.state25-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement'),move=(moveEl?.textContent||'').trim(),moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const record=(row.querySelector('.rus-ranking-record,.rus-live-record,.team-record,.record')?.textContent||'').trim();
      const existing=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const src=logos[norm(team)]||existing||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      const accent=getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555555';
      const item=document.createElement('div');item.className='rus-export-rank-item';item.style.setProperty('--accent',accent);item.style.setProperty('--tint',rgba(accent,.34));item.style.setProperty('--team-text',contrast(accent));
      const topClass=Number(rank)<=3?` top${Number(rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${topClass}">${esc(rank)}</div><div class="rus-export-team-line">${src?`<img class="rus-export-logo" src="${esc(src)}" alt="${esc(team)} logo">`:''}<div class="rus-export-team-wrap"><div class="rus-export-team">${esc(team)}</div>${record?`<div class="rus-export-record">${esc(record)}</div>`:''}</div></div><div class="rus-export-meta">${cls?`<span>${esc(cls)}</span>`:''}${elo?`<span>ELO ${esc(elo)}</span>`:''}${move?`<span class="rus-export-move ${moveClass}">${esc(move)}</span>`:''}</div>`;
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
  async function make(format){
    const el=currentSection(),label=titleFor(el),dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const blob=await render(el,dims[0],dims[1],label);await deliver(blob,`rural-utah-sports-${format}-${Date.now()}.png`);
  }
  function modal(){
    const el=document.createElement('div');el.className='rus-share-modal';el.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>Creates a branded graphic from the section currently in view. Rankings use team colors, local logos and a layout that fills the canvas.</p><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(el);el.querySelector('.rus-share-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{const f=b.dataset.f;b.disabled=true;b.textContent='Creating…';try{await make(f);el.remove()}catch(err){console.error(err);b.disabled=false;b.textContent='Try Again';alert('Could not create the graphic. Please try again.')}});
  }
  function init(){const b=document.createElement('button');b.className='rus-share-btn rus-share-float';b.textContent='Share Graphic';b.onclick=modal;document.body.appendChild(b)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
