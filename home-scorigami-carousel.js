(()=>{
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const parseDate=v=>{
  const text=String(v||'').trim();
  const m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return new Date(Number(m[3]),Number(m[1])-1,Number(m[2])).getTime();
  const t=Date.parse(text);
  return Number.isFinite(t)?t:0;
};
const nextTuesdayReset=ts=>{
  const d=new Date(ts);d.setHours(0,0,0,0);
  let add=(2-d.getDay()+7)%7;if(add===0)add=7;
  d.setDate(d.getDate()+add);return d.getTime();
};
const norm=v=>String(v??'').trim().toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const aliases={'CEDAR':'CEDAR CITY','MONUMENT VAL':'MONUMENT VALLEY','UMA CAMP WILLIAMS':'UMA LEHI','UTAH MILITARY ACADEMY CAMP WILLIAMS':'UMA LEHI','ST JOSEPH':'SAINT JOSEPH','AMERICAN LEADERSHIP':'ALA','WASATCH ACADEMY':'WASATCH ACAD'};
const teamKey=v=>aliases[norm(v)]||norm(v);
const safeHex=(v,f='#444444')=>/^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(String(v||''))?String(v):f;
const scoreKey=(w,l)=>`${Math.max(Number(w)||0,Number(l)||0)}-${Math.min(Number(w)||0,Number(l)||0)}`;
let recentAlerts=null,alertsPromise=null,shareDataPromise=null;

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
    .rus-scorigami-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto}
    .rus-scorigami-share-button{border:1px solid #000;border-radius:5px;background:#000;color:#fff;padding:8px 10px;font:inherit;font-size:8px;font-weight:1000;text-transform:uppercase;white-space:nowrap;cursor:pointer}
    .rus-scorigami-share-button:hover{background:#fff;color:#000}
    .rus-scorigami-share-button:disabled{opacity:.65;cursor:wait}
    @media(max-width:800px){
      .rus-scorigami-alert .rus-scorigami-wrap{display:block!important;padding:10px 12px 12px!important;text-align:left}
      .rus-scorigami-alert .rus-scorigami-burst{display:none!important}
      .rus-scorigami-carousel{width:100%;max-width:none}
      .rus-scorigami-kicker{font-size:8px!important;letter-spacing:.8px!important;padding:4px 8px!important;margin-bottom:5px!important}
      .rus-scorigami-main{font-size:15px!important;line-height:1.08!important;margin-top:0!important;overflow-wrap:anywhere}
      .rus-scorigami-main .rus-scorigami-score{font-size:21px!important;margin:0 2px!important;white-space:nowrap}
      .rus-scorigami-sub{font-size:8px!important;line-height:1.25!important;margin-top:4px!important}
      .rus-scorigami-nav{display:grid!important;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:8px;margin-top:8px!important}
      .rus-scorigami-nav-center{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px}
      .rus-scorigami-arrow{width:34px;height:34px;flex-basis:34px;font-size:21px}
      .rus-scorigami-position{font-size:8px;line-height:1}
      .rus-scorigami-dots{gap:5px;min-height:8px}
      .rus-scorigami-dot{width:6px;height:6px;flex-basis:6px}
      .rus-scorigami-alert .rus-scorigami-actions{display:flex!important;flex-direction:column;align-items:stretch;gap:4px;min-width:82px}
      .rus-scorigami-alert .rus-scorigami-actions .rus-scorigami-link{display:block!important;width:100%!important;margin:0!important;padding:6px 7px!important;text-align:center!important;font-size:7px!important}
      .rus-scorigami-alert .rus-scorigami-share-button{width:100%;padding:6px 7px;font-size:7px}
    }
    @media(max-width:390px){
      .rus-scorigami-main{font-size:14px!important}
      .rus-scorigami-main .rus-scorigami-score{font-size:20px!important}
      .rus-scorigami-kicker{font-size:7px!important;letter-spacing:.7px!important}
      .rus-scorigami-alert .rus-scorigami-actions{min-width:72px}
      .rus-scorigami-alert .rus-scorigami-share-button,.rus-scorigami-alert .rus-scorigami-actions .rus-scorigami-link{font-size:6px!important;padding:5px!important}
    }
  `;
  document.head.appendChild(s);
}

function freshAlerts(data){
  const now=Date.now();
  return (Array.isArray(data?.alerts)?data.alerts:[])
    .filter(a=>a&&a.date&&a.score)
    .map((a,i)=>({...a,_ts:parseDate(a.date),_sourceIndex:i}))
    .filter(a=>a._ts&&now>=a._ts&&now<nextTuesdayReset(a._ts))
    .sort((a,b)=>b._ts-a._ts||a._sourceIndex-b._sourceIndex);
}

async function loadAlerts(){
  if(recentAlerts)return recentAlerts;
  if(alertsPromise)return alertsPromise;
  alertsPromise=fetch(`scorigami-latest.json?v=${Date.now()}`,{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('scorigami-latest');return r.json()})
    .then(data=>{recentAlerts=freshAlerts(data);return recentAlerts})
    .finally(()=>{alertsPromise=null});
  return alertsPromise;
}

function resultHTML(a){
  if(a.tie)return `${esc(a.awayTeam)} <span class="rus-scorigami-score">${a.awayScore}–${a.homeScore}</span> ${esc(a.homeTeam)}`;
  return `${esc(a.winner)} <span class="rus-scorigami-score">${a.winnerScore}–${a.loserScore}</span> ${esc(a.loser)}`;
}

function chipHTML(a){
  const left=a.awayTeam||a.winner||'';
  const right=a.homeTeam||a.loser||'';
  const leftScore=a.awayScore??a.winnerScore??'';
  const rightScore=a.homeScore??a.loserScore??'';
  return `<a class="rus-home-chip" href="scorigami.html?score=${encodeURIComponent(a.score||'')}"><span>${esc(left)} ${esc(leftScore)}–${esc(rightScore)} ${esc(right)}</span><strong>NEW</strong></a>`;
}

function syncPersonalized(alerts){
  const heading=[...document.querySelectorAll('.rus-home-block h3')].find(h=>h.textContent.trim().toLowerCase()==='new scorigami');
  const mini=heading?.parentElement?.querySelector('.rus-home-mini');
  if(!mini)return;
  const top=alerts.slice(0,3);
  const signature=top.map(a=>`${a.date}|${a.score}`).join('||')||'none';
  if(mini.dataset.rusScorigamiFreshness===signature)return;
  mini.dataset.rusScorigamiFreshness=signature;
  mini.innerHTML=top.length?top.map(chipHTML).join(''):'<div class="rus-home-empty">No new Scorigami alerts loaded.</div>';
}

async function loadShareData(){
  if(shareDataPromise)return shareDataPromise;
  shareDataPromise=Promise.all([
    fetch(`teams-data.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]),
    fetch(`scorigami.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('scorigami-history');return r.json()})
  ]).then(([teams,history])=>{
    const teamMap=new Map();
    for(const t of Array.isArray(teams)?teams:[])if(t?.team){teamMap.set(teamKey(t.team),t);teamMap.set(norm(t.team),t)}
    return{teamMap,history};
  }).catch(e=>{shareDataPromise=null;throw e});
  return shareDataPromise;
}

function alertScores(a){
  const awayScore=Number(a.awayScore ?? (a.awayTeam===a.winner?a.winnerScore:a.loserScore));
  const homeScore=Number(a.homeScore ?? (a.homeTeam===a.winner?a.winnerScore:a.loserScore));
  return{away:Number.isFinite(awayScore)?awayScore:0,home:Number.isFinite(homeScore)?homeScore:0};
}

function scoreOrdinal(history,a){
  const scores=Array.isArray(history?.scores)?history.scores:[];
  const targetScores=alertScores(a),target=scoreKey(targetScores.away,targetScores.home);
  const rows=scores.map((s,i)=>{
    const games=Array.isArray(s?.games)?s.games:[];
    let first=Infinity;
    for(const g of games){const t=parseDate(g?.date);if(t&&t<first)first=t}
    if(!Number.isFinite(first))first=Date.UTC(Number(s?.firstYear)||9999,0,1);
    return{s,i,first,key:scoreKey(s?.winner,s?.loser)};
  }).sort((a,b)=>a.first-b.first||a.i-b.i);
  const idx=rows.findIndex(x=>x.key===target);
  return{number:idx>=0?idx+1:null,total:Number(history?.summary?.uniqueFinalScores)||scores.length};
}

function metaFor(teamMap,name){return teamMap.get(teamKey(name))||teamMap.get(norm(name))||null}
function logoFor(name){return window.RUSSchoolAssets?.logoUrl?.(name)||''}
function loadImage(src){
  return new Promise(resolve=>{
    if(!src){resolve(null);return}
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;
  });
}
function fitText(ctx,text,maxWidth,start,min=25,weight=1000){
  let size=start;ctx.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;
  while(size>min&&ctx.measureText(text).width>maxWidth){size-=2;ctx.font=`${weight} ${size}px Arial,Helvetica,sans-serif`}
  return size;
}
function rounded(ctx,x,y,w,h,r,fill,stroke=null,line=2){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
}
function contrastText(hex,fallback='#FFFFFF'){
  let h=String(hex||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
  if(!/^[0-9a-f]{6}$/i.test(h))return fallback;
  const n=parseInt(h,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  return (r*299+g*587+b*114)/1000>160?'#0A0A0A':'#FFFFFF';
}
function displayDate(v){const t=parseDate(v);return t?new Date(t).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):String(v||'')}

async function buildShareGraphic(a,weekIndex,weekCount){
  const {teamMap,history}=await loadShareData();
  const {away,home}=alertScores(a),ordinal=scoreOrdinal(history,a);
  const awayName=String(a.awayTeam||a.winner||'Away').trim(),homeName=String(a.homeTeam||a.loser||'Home').trim();
  const awayMeta=metaFor(teamMap,awayName),homeMeta=metaFor(teamMap,homeName);
  const awayColor=safeHex(awayMeta?.backgroundColor,'#353535'),homeColor=safeHex(homeMeta?.backgroundColor,'#353535');
  const awayText=safeHex(awayMeta?.textColor,contrastText(awayColor)),homeText=safeHex(homeMeta?.textColor,contrastText(homeColor));
  const [rusLogo,awayLogo,homeLogo]=await Promise.all([loadImage('RUSlogoNew.png'),loadImage(logoFor(awayMeta?.team||awayName)),loadImage(logoFor(homeMeta?.team||homeName))]);
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#090909';ctx.fillRect(0,0,1080,1350);
  const glow=ctx.createLinearGradient(0,0,1080,1350);glow.addColorStop(0,awayColor+'55');glow.addColorStop(.48,'#09090900');glow.addColorStop(1,homeColor+'55');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle='#F14D07';ctx.fillRect(0,0,1080,18);ctx.fillRect(0,1332,1080,18);

  if(rusLogo)ctx.drawImage(rusLogo,64,58,92,92);
  ctx.fillStyle='#fff';ctx.font='1000 31px Arial,Helvetica,sans-serif';ctx.fillText('RURAL UTAH SPORTS',180,101);
  ctx.fillStyle='#9a9a9a';ctx.font='900 20px Arial,Helvetica,sans-serif';ctx.fillText('UTAH HIGH SCHOOL FOOTBALL',180,132);
  rounded(ctx,780,64,230,76,38,'#F14D07');ctx.fillStyle='#000';ctx.textAlign='center';ctx.font='1000 28px Arial,Helvetica,sans-serif';ctx.fillText(ordinal.number?`SCORIGAMI #${ordinal.number}`:'SCORIGAMI',895,111);ctx.textAlign='left';

  ctx.fillStyle='#F14D07';ctx.font='1000 76px Arial,Helvetica,sans-serif';ctx.fillText('SCORIGAMI',64,258);
  ctx.fillStyle='#fff';ctx.font='1000 28px Arial,Helvetica,sans-serif';ctx.fillText('A FINAL SCORE NEVER BEFORE SEEN IN THE RUS DATABASE',66,304);
  ctx.fillStyle='#888';ctx.font='800 21px Arial,Helvetica,sans-serif';ctx.fillText(displayDate(a.date).toUpperCase(),66,344);

  const drawTeam=(y,name,score,color,textColor,img,isWinner)=>{
    rounded(ctx,64,y,952,242,20,color,'rgba(255,255,255,.16)',3);
    const wash=ctx.createLinearGradient(64,y,1016,y);wash.addColorStop(0,'rgba(0,0,0,.08)');wash.addColorStop(1,'rgba(0,0,0,.34)');ctx.fillStyle=wash;ctx.beginPath();ctx.roundRect(64,y,952,242,20);ctx.fill();
    if(img){ctx.save();ctx.beginPath();ctx.roundRect(94,y+38,166,166,22);ctx.clip();ctx.drawImage(img,94,y+38,166,166);ctx.restore()}
    else{rounded(ctx,94,y+38,166,166,22,'rgba(0,0,0,.24)')}
    ctx.fillStyle=textColor;ctx.textAlign='left';const label=String(name||'').toUpperCase();const sz=fitText(ctx,label,500,52,27);ctx.font=`1000 ${sz}px Arial,Helvetica,sans-serif`;ctx.fillText(label,294,y+99);
    ctx.globalAlpha=.78;ctx.font='900 20px Arial,Helvetica,sans-serif';ctx.fillText(isWinner?'WINNER':'FINAL',296,y+139);ctx.globalAlpha=1;
    ctx.textAlign='right';ctx.font='1000 112px Arial,Helvetica,sans-serif';ctx.fillText(String(score),970,y+157);ctx.textAlign='left';
  };
  const awayWins=away>home,homeWins=home>away;
  drawTeam(405,awayName,away,awayColor,awayText,awayLogo,awayWins);
  drawTeam(675,homeName,home,homeColor,homeText,homeLogo,homeWins);

  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='1000 38px Arial,Helvetica,sans-serif';ctx.fillText('FINAL',540,968);
  ctx.fillStyle='#F14D07';ctx.font='1000 32px Arial,Helvetica,sans-serif';
  const countLine=weekCount===1?'1 SCORIGAMI THIS WEEK':`${weekCount} SCORIGAMIS THIS WEEK`;
  ctx.fillText(countLine,540,1042);
  ctx.fillStyle='#fff';ctx.font='900 25px Arial,Helvetica,sans-serif';
  if(ordinal.number)ctx.fillText(`UNIQUE FINAL SCORE #${ordinal.number} OF ${ordinal.total.toLocaleString()}`,540,1090);
  else ctx.fillText(`${ordinal.total.toLocaleString()} UNIQUE FINAL SCORES TRACKED`,540,1090);
  ctx.fillStyle='#aaa';ctx.font='700 24px Arial,Helvetica,sans-serif';ctx.fillText(`Alert ${weekIndex+1} of ${weekCount} this week`,540,1131);

  rounded(ctx,82,1180,916,92,18,'rgba(0,0,0,.52)','rgba(241,77,7,.65)',2);
  ctx.fillStyle='#ddd';ctx.font='800 22px Arial,Helvetica,sans-serif';ctx.fillText('First time this final-score combination has appeared',540,1218);ctx.fillText('in the Rural Utah Sports football database.',540,1251);
  ctx.textAlign='left';
  return canvas;
}

async function shareGraphic(a,weekIndex,weekCount,button){
  const old=button?.textContent||'Share Graphic';if(button){button.disabled=true;button.textContent='Creating…'}
  try{
    const canvas=await buildShareGraphic(a,weekIndex,weekCount);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG failed')),'image/png'));
    const scores=alertScores(a),fileName=`rus-scorigami-${scoreKey(scores.away,scores.home)}.png`;
    const file=new File([blob],fileName,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:'Rural Utah Sports Scorigami',text:`${a.awayTeam} ${scores.away}-${scores.home} ${a.homeTeam} — Scorigami`});
    }else{
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
  }catch(e){if(e?.name!=='AbortError'){console.warn('Scorigami share graphic unavailable',e);alert('Unable to create the Scorigami graphic right now.')}}
  finally{if(button){button.disabled=false;button.textContent=old}}
}

async function upgrade(alertEl){
  if(!alertEl||alertEl.dataset.carouselReady==='1')return;
  alertEl.dataset.carouselReady='1';
  try{
    const alerts=await loadAlerts();
    if(!alerts.length){alertEl.remove();return}
    addStyles();
    const wrap=alertEl.querySelector('.rus-scorigami-wrap');
    if(!wrap)return;
    const kicker=`🚨 ${alerts.length} SCORIGAMI${alerts.length===1?'':'S'} THIS WEEK 🚨`;
    const nav=alerts.length>1?`<div class="rus-scorigami-nav" aria-label="Scorigami navigation">
          <button class="rus-scorigami-arrow rus-scorigami-prev" type="button" aria-label="Previous Scorigami">‹</button>
          <div class="rus-scorigami-nav-center">
            <span class="rus-scorigami-position">1 of ${alerts.length}</span>
            <div class="rus-scorigami-dots">${alerts.map((_,i)=>`<button class="rus-scorigami-dot${i===0?' active':''}" type="button" aria-label="Show Scorigami ${i+1}" data-index="${i}"></button>`).join('')}</div>
          </div>
          <button class="rus-scorigami-arrow rus-scorigami-next" type="button" aria-label="Next Scorigami">›</button>
        </div>`:'';
    wrap.innerHTML=`
      <div class="rus-scorigami-burst" aria-hidden="true">🚨</div>
      <div class="rus-scorigami-carousel">
        <div class="rus-scorigami-kicker">${kicker}</div>
        ${alerts.map((a,i)=>`<div class="rus-scorigami-slide${i===0?' active':''}" data-index="${i}">
          <div class="rus-scorigami-main">${resultHTML(a)}</div>
          <div class="rus-scorigami-sub">First time this final score has ever appeared in the RUS Utah high school football database.</div>
        </div>`).join('')}
        ${nav}
      </div>
      <div class="rus-scorigami-actions">
        <a class="rus-scorigami-link" href="scorigami.html?score=${encodeURIComponent(alerts[0].score)}">Explore →</a>
        <button class="rus-scorigami-share-button" type="button">Share Graphic</button>
      </div>`;

    let current=0;
    const slides=[...wrap.querySelectorAll('.rus-scorigami-slide')];
    const dots=[...wrap.querySelectorAll('.rus-scorigami-dot')];
    const pos=wrap.querySelector('.rus-scorigami-position');
    const link=wrap.querySelector('.rus-scorigami-link');
    const shareButton=wrap.querySelector('.rus-scorigami-share-button');
    const show=i=>{
      current=(i+alerts.length)%alerts.length;
      slides.forEach((el,n)=>el.classList.toggle('active',n===current));
      dots.forEach((el,n)=>el.classList.toggle('active',n===current));
      if(pos)pos.textContent=`${current+1} of ${alerts.length}`;
      link.href=`scorigami.html?score=${encodeURIComponent(alerts[current].score)}`;
    };
    wrap.querySelector('.rus-scorigami-prev')?.addEventListener('click',()=>show(current-1));
    wrap.querySelector('.rus-scorigami-next')?.addEventListener('click',()=>show(current+1));
    dots.forEach(dot=>dot.addEventListener('click',()=>show(Number(dot.dataset.index))));
    shareButton?.addEventListener('click',()=>shareGraphic(alerts[current],current,alerts.length,shareButton));

    let startX=null;
    const carousel=wrap.querySelector('.rus-scorigami-carousel');
    if(alerts.length>1){
      carousel.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null},{passive:true});
      carousel.addEventListener('touchend',e=>{
        if(startX===null)return;
        const endX=e.changedTouches[0]?.clientX??startX,dx=endX-startX;
        startX=null;
        if(Math.abs(dx)>45)show(current+(dx<0?1:-1));
      },{passive:true});
    }
  }catch(e){
    alertEl.dataset.carouselReady='0';
    console.warn('Scorigami carousel unavailable',e);
  }
}

async function refresh(){
  try{
    const alerts=await loadAlerts();
    syncPersonalized(alerts);
    const alertEl=document.querySelector('.rus-scorigami-alert');
    if(alertEl)upgrade(alertEl);
  }catch(e){console.warn('Scorigami freshness unavailable',e)}
}

refresh();
const observer=new MutationObserver(()=>{
  if(recentAlerts)syncPersonalized(recentAlerts);
  const el=document.querySelector('.rus-scorigami-alert');
  if(el)upgrade(el);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>observer.disconnect(),10000);
})();
