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
  async function render(el,w,h,label){
    await loadCanvas();
    document.documentElement.classList.add('rus-exporting');
    try{
      const source=await html2canvas(el,{backgroundColor:'#111111',scale:2,useCORS:true,allowTaint:false,logging:false,windowWidth:Math.max(document.documentElement.clientWidth,el.scrollWidth)});
      const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
      c.fillStyle='#111';c.fillRect(0,0,w,h);
      const top=120,bottom=105,pad=50,maxW=w-pad*2,maxH=h-top-bottom;
      const scale=Math.min(maxW/source.width,maxH/source.height,1.65);const dw=source.width*scale,dh=source.height*scale;
      c.drawImage(source,(w-dw)/2,top+(maxH-dh)/2,dw,dh);
      c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
      c.fillStyle='#fff';c.font='900 38px Arial';c.textAlign='left';c.fillText(label,50,62);
      c.fillStyle='#F14D07';c.font='900 22px Arial';c.fillText('RURAL UTAH SPORTS',50,96);
      c.fillStyle='#888';c.font='700 18px Arial';c.fillText('ruralutahsports.github.io',50,h-48);
      return await new Promise(r=>out.toBlob(r,'image/png',1));
    }finally{document.documentElement.classList.remove('rus-exporting')}
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
    const el=document.createElement('div');el.className='rus-share-modal';el.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>Creates an image from the section currently in view. On iPhone it will open the share sheet when supported.</p><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(el);el.querySelector('.rus-share-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{const f=b.dataset.f;b.disabled=true;b.textContent='Creating…';try{await make(f);el.remove()}catch(err){console.error(err);b.disabled=false;b.textContent='Try Again';alert('Could not create the graphic. Please try again.')}});
  }
  function init(){const b=document.createElement('button');b.className='rus-share-btn rus-share-float';b.textContent='Share Graphic';b.onclick=modal;document.body.appendChild(b)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
