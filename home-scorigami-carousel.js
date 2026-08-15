(()=>{
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const parseDate=v=>{const t=Date.parse(String(v||''));return Number.isFinite(t)?t:0};

function addStyles(){
  if(document.getElementById('rus-scorigami-carousel-style'))return;
  const s=document.createElement('style');
  s.id='rus-scorigami-carousel-style';
  s.textContent=`
    .rus-scorigami-carousel{min-width:0}
    .rus-scorigami-slide{display:none;min-width:0}
    .rus-scorigami-slide.active{display:block}
    .rus-scorigami-nav{display:flex;align-items:center;gap:10px;margin-top:10px}
    .rus-scorigami-nav-center{display:flex;align-items:center;gap:8px}
    .rus-scorigami-arrow{width:30px;height:30px;flex:0 0 30px;border:0;border-radius:999px;background:#000;color:#fff;font-size:18px;font-weight:900;line-height:1;cursor:pointer;display:grid;place-items:center}
    .rus-scorigami-arrow:hover{background:#fff;color:#000}
    .rus-scorigami-position{font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.7px;white-space:nowrap;text-align:center}
    .rus-scorigami-dots{display:flex;gap:6px;align-items:center;justify-content:center}
    .rus-scorigami-dot{width:8px;height:8px;flex:0 0 8px;border:0;border-radius:50%;padding:0;background:rgba(0,0,0,.35);cursor:pointer}
    .rus-scorigami-dot.active{background:#000;transform:scale(1.2)}
    @media(max-width:800px){
      .rus-scorigami-alert .rus-scorigami-wrap{display:block!important;padding:16px 14px 18px!important;text-align:left}
      .rus-scorigami-alert .rus-scorigami-burst{display:none!important}
      .rus-scorigami-carousel{width:100%;max-width:none}
      .rus-scorigami-kicker{font-size:9px!important;letter-spacing:1px!important;padding:6px 10px!important;margin-bottom:8px}
      .rus-scorigami-main{font-size:18px!important;line-height:1.12!important;margin-top:0!important;overflow-wrap:anywhere}
      .rus-scorigami-main .rus-scorigami-score{font-size:25px!important;margin:0 3px!important;white-space:nowrap}
      .rus-scorigami-sub{font-size:9px!important;line-height:1.35!important;margin-top:6px!important}
      .rus-scorigami-nav{display:grid!important;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;gap:10px;margin-top:13px}
      .rus-scorigami-nav-center{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px}
      .rus-scorigami-arrow{width:40px;height:40px;flex-basis:40px;font-size:24px}
      .rus-scorigami-position{font-size:10px;line-height:1}
      .rus-scorigami-dots{gap:7px;min-height:10px}
      .rus-scorigami-dot{width:8px;height:8px;flex-basis:8px}
      .rus-scorigami-alert .rus-scorigami-link{display:block!important;width:100%;margin-top:14px!important;padding:13px 12px!important;text-align:center!important;font-size:10px!important}
    }
    @media(max-width:390px){
      .rus-scorigami-main{font-size:16px!important}
      .rus-scorigami-main .rus-scorigami-score{font-size:23px!important}
      .rus-scorigami-kicker{font-size:8px!important;letter-spacing:.8px!important}
    }
  `;
  document.head.appendChild(s);
}

function resultHTML(a){
  if(a.tie)return `${esc(a.awayTeam)} <span class="rus-scorigami-score">${a.awayScore}–${a.homeScore}</span> ${esc(a.homeTeam)}`;
  return `${esc(a.winner)} <span class="rus-scorigami-score">${a.winnerScore}–${a.loserScore}</span> ${esc(a.loser)}`;
}

async function upgrade(alertEl){
  if(!alertEl||alertEl.dataset.carouselReady==='1')return;
  alertEl.dataset.carouselReady='1';
  try{
    const r=await fetch(`scorigami-latest.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('scorigami-latest');
    const d=await r.json();
    const alerts=(Array.isArray(d.alerts)?d.alerts:[]).filter(a=>{
      const age=Date.now()-parseDate(a.date);
      return age>=0&&age<=8*24*3600*1000;
    });
    if(alerts.length<2)return;

    addStyles();
    const wrap=alertEl.querySelector('.rus-scorigami-wrap');
    if(!wrap)return;
    const kicker=`🚨 ${alerts.length} SCORIGAMIS THIS WEEK 🚨`;
    wrap.innerHTML=`
      <div class="rus-scorigami-burst" aria-hidden="true">🚨</div>
      <div class="rus-scorigami-carousel">
        <div class="rus-scorigami-kicker">${kicker}</div>
        ${alerts.map((a,i)=>`<div class="rus-scorigami-slide${i===0?' active':''}" data-index="${i}">
          <div class="rus-scorigami-main">${resultHTML(a)}</div>
          <div class="rus-scorigami-sub">First time this final score has ever appeared in the RUS Utah high school football database.</div>
        </div>`).join('')}
        <div class="rus-scorigami-nav" aria-label="Scorigami navigation">
          <button class="rus-scorigami-arrow rus-scorigami-prev" type="button" aria-label="Previous Scorigami">‹</button>
          <div class="rus-scorigami-nav-center">
            <span class="rus-scorigami-position">1 of ${alerts.length}</span>
            <div class="rus-scorigami-dots">${alerts.map((_,i)=>`<button class="rus-scorigami-dot${i===0?' active':''}" type="button" aria-label="Show Scorigami ${i+1}" data-index="${i}"></button>`).join('')}</div>
          </div>
          <button class="rus-scorigami-arrow rus-scorigami-next" type="button" aria-label="Next Scorigami">›</button>
        </div>
      </div>
      <a class="rus-scorigami-link" href="scorigami.html?score=${encodeURIComponent(alerts[0].score)}">Explore Scorigami →</a>`;

    let current=0;
    const slides=[...wrap.querySelectorAll('.rus-scorigami-slide')];
    const dots=[...wrap.querySelectorAll('.rus-scorigami-dot')];
    const pos=wrap.querySelector('.rus-scorigami-position');
    const link=wrap.querySelector('.rus-scorigami-link');
    const show=i=>{
      current=(i+alerts.length)%alerts.length;
      slides.forEach((el,n)=>el.classList.toggle('active',n===current));
      dots.forEach((el,n)=>el.classList.toggle('active',n===current));
      pos.textContent=`${current+1} of ${alerts.length}`;
      link.href=`scorigami.html?score=${encodeURIComponent(alerts[current].score)}`;
    };
    wrap.querySelector('.rus-scorigami-prev').addEventListener('click',()=>show(current-1));
    wrap.querySelector('.rus-scorigami-next').addEventListener('click',()=>show(current+1));
    dots.forEach(dot=>dot.addEventListener('click',()=>show(Number(dot.dataset.index))));

    let startX=null;
    const carousel=wrap.querySelector('.rus-scorigami-carousel');
    carousel.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null},{passive:true});
    carousel.addEventListener('touchend',e=>{
      if(startX===null)return;
      const endX=e.changedTouches[0]?.clientX??startX,dx=endX-startX;
      startX=null;
      if(Math.abs(dx)>45)show(current+(dx<0?1:-1));
    },{passive:true});
  }catch(e){
    alertEl.dataset.carouselReady='0';
    console.warn('Scorigami carousel unavailable',e);
  }
}

const existing=document.querySelector('.rus-scorigami-alert');
if(existing)upgrade(existing);
const observer=new MutationObserver(()=>{
  const el=document.querySelector('.rus-scorigami-alert');
  if(el)upgrade(el);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),10000);
})();
