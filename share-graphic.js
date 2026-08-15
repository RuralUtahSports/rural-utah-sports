(()=>{
  if(window.RUSShareGraphic)return;
  const S=window.RUSShareGraphic={};
  const PAGE=(location.pathname.split('/').pop()||'').toLowerCase();
  const supported=/award|standings|scoreboard|rankings/.test(PAGE);
  if(!supported)return;

  const css=`
  .rus-share-btn{appearance:none;border:0;border-radius:999px;background:#F14D07;color:#000;font:900 12px Arial,sans-serif;text-transform:uppercase;padding:11px 15px;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.35)}
  .rus-share-float{position:fixed;right:18px;bottom:88px;z-index:9996}
  .rus-share-modal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:16px}
  .rus-share-sheet{width:min(520px,100%);background:#111;border:1px solid #444;border-top:5px solid #F14D07;border-radius:14px;padding:18px;color:#fff;font-family:Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .rus-share-sheet h3{margin:0 0 6px;font-size:22px}.rus-share-sheet p{margin:0 0 14px;color:#aaa;font-size:12px;line-height:1.45}
  .rus-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rus-share-option{border:1px solid #444;border-radius:8px;background:#1d1d1d;color:#fff;padding:13px 10px;font-weight:900;cursor:pointer}.rus-share-option strong{display:block;color:#F14D07;font-size:12px}.rus-share-close{width:100%;margin-top:10px;border:0;background:#333;color:#fff;padding:12px;border-radius:8px;font-weight:900}
  .rus-exporting .rus-share-btn,.rus-exporting .rus-share-float{visibility:hidden!important}
  .rus-export-board{position:fixed;left:-10000px;top:0;width:1400px;background:#0b0b0b;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:22px;z-index:-1}
  .rus-export-rank-grid{display:grid;gap:12px}.rus-export-rank-grid.cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}.rus-export-rank-grid.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rus-export-rank-item{position:relative;min-height:104px;background:#141414;border:1px solid #303030;border-left:7px solid var(--accent,#555);border-radius:9px;padding:12px 12px 10px 54px;overflow:hidden}
  .rus-export-rank-num{position:absolute;left:10px;top:12px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#252525;border:1px solid #444;color:#fff;font-size:16px;font-weight:1000}
  .rus-export-rank-num.top1{background:#d5ad35;color:#000;border-color:#f0d169}.rus-export-rank-num.top2{background:#b9bcc1;color:#000;border-color:#e0e2e5}.rus-export-rank-num.top3{background:#ad6b3d;color:#000;border-color:#d6976a}
  .rus-export-team-line{display:flex;align-items:center;gap:8px;min-width:0}.rus-export-logo{width:32px;height:32px;object-fit:contain;flex:0 0 32px}.rus-export-team{font-size:16px;font-weight:1000;line-height:1.08;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rus-export-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;color:#a8a8a8;font-size:10px;font-weight:900;text-transform:uppercase}.rus-export-move.up{color:#62df8c}.rus-export-move.down{color:#ff7070}.rus-export-move.new{color:#F14D07}
  @media(min-width:700px){.rus-share-modal{align-items:center}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function loadCanvas(){
    if(window.html2canvas)return Promise.resolve();
    return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  }
  function candidates(){
    let sels=[];
    if(PAGE.includes('scoreboard')) sels=['.game','.date-section','#board'];
    else if(PAGE.includes('standings')) sels=['.region-card','.standings-card','.standings-section','section'];
    else if(PAGE.includes('rankings')) sels=['.state25','.rank-card','#rankings','section'];
    else sels=['.award-card','.award-section','.awards-section','.team-section','section'];
    return [...new Set(sels.flatMap(s=>[...document.querySelectorAll(s)]))].filter(el=>el.offsetWidth>250&&el.offsetHeight>80);
  }
  function currentSection(){
    const list=candidates(); if(!list.length)return document.querySelector('main')||document.body;
    const mid=innerHeight*.52;
    let best=list[0],score=Infinity;
    list.forEach(el=>{const r=el.getBoundingClientRect();const visible=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);if(visible<=0)return;const d=Math.abs((r.top+r.bottom)/2-mid)-visible*.15;if(d<score){score=d;best=el}});
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
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function rankingSource(el){
    if(!PAGE.includes('rankings'))return null;
    const stateRows=[...el.querySelectorAll?.('.state25-row')||[]];
    const classRows=[...el.querySelectorAll?.('.rank-row')||[]];
    const rows=stateRows.length?stateRows:classRows;
    if(!rows.length)return null;
    const board=document.createElement('div');board.className='rus-export-board';
    const grid=document.createElement('div');
    const cols=rows.length>10?5:2;grid.className=`rus-export-rank-grid cols-${cols}`;
    rows.forEach((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=(row.querySelector('.team-pill')?.textContent||row.querySelector('.team-link')?.textContent||'').trim();
      const cls=(row.querySelector('.state25-class')?.textContent||row.querySelector('.team-class')?.textContent||'').trim();
      const elo=(row.querySelector('.state25-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement');const move=(moveEl?.textContent||'').trim();const moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const src=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const accent=getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555';
      const item=document.createElement('div');item.className='rus-export-rank-item';item.style.setProperty('--accent',accent);
      const top=Number(rank)<=3?` top${Number(rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${top}">${esc(rank)}</div><div class="rus-export-team-line">${src?`<img class="rus-export-logo" src="${esc(src)}" alt="">`:''}<div class="rus-export-team">${esc(team)}</div></div><div class="rus-export-meta">${cls?`<span>${esc(cls)}</span>`:''}${elo?`<span>ELO ${esc(elo)}</span>`:''}${move?`<span class="rus-export-move ${moveClass}">${esc(move)}</span>`:''}</div>`;
      grid.appendChild(item);
    });
    board.appendChild(grid);document.body.appendChild(board);return board;
  }
  async function render(el,w,h,label){
    await loadCanvas();
    document.documentElement.classList.add('rus-exporting');
    let special=null;
    try{
      special=rankingSource(el);
      const target=special||el;
      const source=await html2canvas(target,{backgroundColor:'#111111',scale:2,useCORS:true,allowTaint:false,logging:false,windowWidth:Math.max(document.documentElement.clientWidth,target.scrollWidth)});
      const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
      c.fillStyle='#111';c.fillRect(0,0,w,h);
      const top=120,bottom=105,pad=42,maxW=w-pad*2,maxH=h-top-bottom;
      const scale=Math.min(maxW/source.width,maxH/source.height,2.1);const dw=source.width*scale,dh=source.height*scale;
      c.drawImage(source,(w-dw)/2,top+(maxH-dh)/2,dw,dh);
      c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
      c.fillStyle='#fff';c.font=`900 ${w>=1500?42:38}px Arial`;c.textAlign='left';c.fillText(label,50,62);
      c.fillStyle='#F14D07';c.font='900 22px Arial';c.fillText('RURAL UTAH SPORTS',50,96);
      c.fillStyle='#888';c.font='700 18px Arial';c.fillText('ruralutahsports.github.io',50,h-48);
      return await new Promise(r=>out.toBlob(r,'image/png',1));
    }finally{special?.remove();document.documentElement.classList.remove('rus-exporting')}
  }
  async function deliver(blob,name){
    const file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'Rural Utah Sports'});return}catch(e){if(e?.name==='AbortError')return}
    }
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  async function make(format){
    const el=currentSection(),label=titleFor(el),dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const blob=await render(el,dims[0],dims[1],label);await deliver(blob,`rural-utah-sports-${format}-${Date.now()}.png`);
  }
  function modal(){
    const el=document.createElement('div');el.className='rus-share-modal';el.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>Creates a clean graphic from the section currently in view. Rankings automatically switch to a compact multi-column layout.</p><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(el);el.querySelector('.rus-share-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{const f=b.dataset.f;b.disabled=true;b.textContent='Creating…';try{await make(f);el.remove()}catch(err){console.error(err);b.disabled=false;b.textContent='Try Again';alert('Could not create the graphic. Please try again.')}});
  }
  function init(){const b=document.createElement('button');b.className='rus-share-btn rus-share-float';b.textContent='Share Graphic';b.onclick=modal;document.body.appendChild(b)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
