(()=>{
  'use strict';
  if(window.__rusPlayoffPictureShareBuild)return;
  window.__rusPlayoffPictureShareBuild='20260907-canvas1';

  const root=document.getElementById('featureRoot');
  if(!root)return;
  const ORANGE='#F14D07',BG='#0c0c0c',CARD='#161616';
  const PAIRS=[[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];
  const norm=v=>String(v??'').trim().toUpperCase().replace(/[.'’]/g,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const safeSlug=v=>String(v||'playoff').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function roundRect(c,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }
  function fit(c,value,maxWidth,start,min=9,weight=900){
    let size=start;
    for(;size>min;size--){
      c.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;
      if(c.measureText(String(value)).width<=maxWidth)break;
    }
    return size;
  }
  function drawContain(c,img,x,y,w,h,pad=.88){
    if(!img?.naturalWidth||!img?.naturalHeight)return;
    const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight)*pad;
    const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  function initials(team){
    return String(team||'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase();
  }
  function loadImage(src){
    if(!src)return Promise.resolve(null);
    return new Promise(resolve=>{
      let settled=false;
      const img=new Image();
      let url;
      try{url=new URL(src,location.href)}catch{return resolve(null)}
      const finish=value=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        resolve(value);
      };
      if(url.origin!==location.origin)img.crossOrigin='anonymous';
      img.decoding='async';
      img.onload=()=>finish(img);
      img.onerror=()=>finish(null);
      const timer=setTimeout(()=>finish(null),3500);
      img.src=url.href;
    });
  }
  let logoCachePromise=null;
  function loadLogoCache(){
    if(logoCachePromise)return logoCachePromise;
    logoCachePromise=fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():{})
      .catch(()=>({}));
    return logoCachePromise;
  }
  function pillColor(pill,variable,fallback){
    if(!pill)return fallback;
    const inline=pill.style?.getPropertyValue(variable)?.trim();
    if(inline)return inline;
    const computed=getComputedStyle(pill).getPropertyValue(variable).trim();
    return computed||fallback;
  }
  function findTable(title){
    let node=title.nextElementSibling;
    while(node){
      if(node.matches?.('.table-wrap'))return node;
      node=node.nextElementSibling;
    }
    return null;
  }
  function blockData(title){
    const table=findTable(title);
    if(!table)return null;
    const text=title.textContent.trim();
    const cls=text.replace(/\s+Projected Seeds\s*$/i,'').trim()||'CLASS';
    const rows=[...table.querySelectorAll('tbody tr')].map((row,index)=>{
      const cells=[...row.children];
      const pill=cells[1]?.querySelector('.team-pill');
      const team=pill?.textContent?.trim();
      if(!team)return null;
      const seed=Number.parseInt(cells[0]?.textContent||'',10);
      return{
        seed:Number.isFinite(seed)?seed:index+1,
        team,
        rpi:cells[6]?.textContent?.trim()||'',
        bg:pillColor(pill,'--bg','#2b2b2b'),
        fg:pillColor(pill,'--fg','#ffffff')
      };
    }).filter(Boolean).slice(0,16);
    return{cls,rows};
  }
  function injectStyle(){
    if(document.getElementById('rus-playoff-picture-share-style'))return;
    const style=document.createElement('style');
    style.id='rus-playoff-picture-share-style';
    style.textContent=`
      .rus-playoff-share-actions{display:flex;flex-wrap:wrap;gap:8px;margin:-2px 0 12px}
      .rus-playoff-share-btn{appearance:none;border:1px solid #F14D07;border-radius:6px;background:#181818;color:#fff;padding:10px 13px;font:1000 9px Arial,Helvetica,sans-serif;letter-spacing:.25px;text-transform:uppercase;cursor:pointer}
      .rus-playoff-share-btn:hover,.rus-playoff-share-btn:focus-visible{background:#F14D07;color:#000;outline:none}
      .rus-playoff-share-modal,.rus-playoff-share-preview{position:fixed;inset:0;z-index:2147483645;background:rgba(0,0,0,.92);display:flex;align-items:flex-end;justify-content:center;padding:16px}
      .rus-playoff-share-sheet,.rus-playoff-share-preview-card{width:min(560px,100%);max-height:94vh;overflow:auto;background:#111;border:1px solid #444;border-top:5px solid #F14D07;border-radius:14px;padding:16px;color:#fff;font-family:Arial,Helvetica,sans-serif}
      .rus-playoff-share-sheet h3,.rus-playoff-share-preview-card h3{margin:0 0 5px;font-size:21px}
      .rus-playoff-share-sheet p,.rus-playoff-share-preview-card p{margin:0 0 13px;color:#aaa;font-size:12px;line-height:1.45}
      .rus-playoff-share-formats{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .rus-playoff-share-formats button,.rus-playoff-share-cancel,.rus-playoff-share-preview-actions button{min-height:48px;border:1px solid #555;border-radius:8px;background:#1d1d1d;color:#fff;font:900 11px Arial,Helvetica,sans-serif;cursor:pointer}
      .rus-playoff-share-formats button strong{display:block;color:#F14D07;font-size:12px;margin-bottom:3px}
      .rus-playoff-share-cancel{width:100%;margin-top:10px}
      .rus-playoff-share-preview{align-items:center}
      .rus-playoff-share-preview-card{width:min(680px,100%)}
      .rus-playoff-share-preview-host canvas{display:block;width:100%;height:auto;max-height:67vh;object-fit:contain;background:#080808;border:1px solid #333}
      .rus-playoff-share-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
      .rus-playoff-share-preview-actions .primary{background:#F14D07;color:#000;border-color:#F14D07}
      .rus-playoff-share-preview-actions .close{grid-column:1/-1}
      @media(max-width:650px){.rus-playoff-share-actions{flex-direction:column}.rus-playoff-share-btn{width:100%}.rus-playoff-share-formats{grid-template-columns:1fr}.rus-playoff-share-preview-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }
  function injectButtons(){
    injectStyle();
    [...root.querySelectorAll('.section-title')].forEach((title,index)=>{
      if(title.dataset.rusPlayoffShareReady==='1')return;
      if(!findTable(title))return;
      if(!title.id)title.id=`rus-playoff-class-${index}`;
      const actions=document.createElement('div');
      actions.className='rus-playoff-share-actions';
      [['seeds','Share Projected Seeds'],['bracket','Share Projected Bracket']].forEach(([kind,label])=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='rus-playoff-share-btn';
        button.textContent=label;
        button.dataset.rusPlayoffShare=kind;
        button.dataset.rusPlayoffTitle=title.id;
        button.addEventListener('click',()=>openFormatModal(kind,title));
        actions.appendChild(button);
      });
      title.insertAdjacentElement('afterend',actions);
      title.dataset.rusPlayoffShareReady='1';
    });
  }
  function dims(format){
    return format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
  }
  function baseCanvas(format){
    const [w,h]=dims(format),canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const c=canvas.getContext('2d');
    c.fillStyle=BG;c.fillRect(0,0,w,h);
    const gradient=c.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,'rgba(255,255,255,.035)');
    gradient.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.fillStyle=ORANGE;c.fillRect(0,0,w,14);
    c.save();
    c.globalAlpha=.11;
    c.fillStyle='#3e454a';
    c.beginPath();
    c.moveTo(0,h-70);c.lineTo(w*.16,h-205);c.lineTo(w*.28,h-105);c.lineTo(w*.43,h-245);c.lineTo(w*.58,h-120);c.lineTo(w*.72,h-210);c.lineTo(w*.9,h-95);c.lineTo(w,h-155);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
    c.restore();
    return{canvas,c,w,h};
  }
  function drawHeader(c,w,format,cls,kind,margin){
    const story=format==='story',x=format==='x';
    const brand=story?27:x?23:25;
    const title=story?53:x?47:48;
    const sub=story?23:x?20:20;
    c.textAlign='left';c.textBaseline='alphabetic';
    c.fillStyle=ORANGE;c.font=`1000 ${brand}px Arial`;c.fillText('RURAL UTAH SPORTS',margin,55);
    c.fillStyle='#fff';
    const headline=kind==='seeds'?'PROJECTED PLAYOFF SEEDS':'PROJECTED FIRST-ROUND BRACKET';
    fit(c,headline,w-margin*2,title,28,1000);c.fillText(headline,margin,story?142:x?121:130);
    c.fillStyle='#aaa';c.font=`900 ${sub}px Arial`;
    c.fillText(`${cls.toUpperCase()}  •  IF THE PLAYOFFS STARTED TODAY`,margin,story?184:x?158:166);
    c.fillStyle='#666';c.font=`900 ${story?16:13}px Arial`;
    c.fillText('PROVISIONAL RUS RPI  •  UNOFFICIAL PROJECTION',margin,story?213:x?184:192);
  }
  function drawSeedCard(c,data,x,y,w,h,logo){
    c.save();
    c.fillStyle=CARD;roundRect(c,x,y,w,h,12);c.fill();
    c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=2;c.stroke();
    c.fillStyle=data.bg;c.fillRect(x,y,7,h);
    const circle=Math.max(18,Math.min(28,h*.24)),cx=x+26+circle/2,cy=y+h/2;
    c.fillStyle=data.seed<=3?'#d5ad35':'#2b2b2b';c.beginPath();c.arc(cx,cy,circle,0,Math.PI*2);c.fill();
    c.strokeStyle=data.seed<=3?'rgba(255,255,255,.6)':'#555';c.stroke();
    c.fillStyle=data.seed<=3?'#111':'#fff';c.textAlign='center';c.textBaseline='middle';c.font=`1000 ${Math.max(15,circle*.75)}px Arial`;c.fillText(String(data.seed),cx,cy+1);
    const logoSize=Math.min(h-18,Math.max(38,Math.min(64,w*.16))),logoX=x+circle*2+38,logoY=y+(h-logoSize)/2;
    if(logo)drawContain(c,logo,logoX,logoY,logoSize,logoSize);
    else{c.fillStyle='rgba(255,255,255,.14)';c.font=`1000 ${Math.min(24,logoSize*.35)}px Arial`;c.fillText(initials(data.team),logoX+logoSize/2,logoY+logoSize/2)}
    const tx=logoX+logoSize+13,right=x+w-16;
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';
    fit(c,data.team,Math.max(80,right-tx-76),Math.min(24,h*.33),10,1000);c.fillText(data.team,tx,y+h*.48);
    c.fillStyle='#888';c.font=`900 ${Math.max(10,Math.min(14,h*.18))}px Arial`;c.fillText('PROJECTED SEED',tx,y+h*.73);
    c.textAlign='right';c.fillStyle=ORANGE;c.font=`1000 ${Math.max(11,Math.min(16,h*.2))}px Arial`;c.fillText(data.rpi?`RPI ${data.rpi}`:'RPI —',right,y+h*.73);
    c.restore();
  }
  function drawMatchupTeam(c,data,x,y,w,h,logo){
    const badge=Math.max(19,Math.min(27,h*.42)),logoSize=Math.min(h-8,Math.max(28,Math.min(54,w*.15)));
    c.fillStyle='#2b2b2b';c.beginPath();c.arc(x+badge,y+h/2,badge/2,0,Math.PI*2);c.fill();
    c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font=`1000 ${Math.max(11,badge*.47)}px Arial`;c.fillText(String(data.seed),x+badge,y+h/2+1);
    const logoX=x+badge+15,logoY=y+(h-logoSize)/2;
    if(logo)drawContain(c,logo,logoX,logoY,logoSize,logoSize);else{c.fillStyle='rgba(255,255,255,.16)';c.font=`1000 ${Math.min(18,logoSize*.35)}px Arial`;c.fillText(initials(data.team),logoX+logoSize/2,logoY+logoSize/2)}
    const tx=logoX+logoSize+11;
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';
    fit(c,data.team,w-(tx-x)-12,Math.min(22,h*.45),9,1000);c.fillText(data.team,tx,y+h*.61);
  }
  function drawBracketCard(c,a,b,x,y,w,h,index,logos){
    c.save();c.fillStyle=CARD;roundRect(c,x,y,w,h,12);c.fill();c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=2;c.stroke();
    c.fillStyle=ORANGE;c.fillRect(x,y,7,h);
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#888';c.font=`1000 ${Math.max(11,Math.min(15,h*.09))}px Arial`;c.fillText(`GAME ${index+1}  •  PROJECTED FIRST ROUND`,x+22,y+25);
    const top=y+35,rowH=Math.max(42,(h-47)/2);
    drawMatchupTeam(c,a,x+22,top,w-44,rowH,logos.get(a.seed));
    c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;c.beginPath();c.moveTo(x+22,top+rowH);c.lineTo(x+w-22,top+rowH);c.stroke();
    if(b)drawMatchupTeam(c,b,x+22,top+rowH,w-44,rowH,logos.get(b.seed));
    else{c.fillStyle='#777';c.font=`900 ${Math.max(12,Math.min(17,h*.11))}px Arial`;c.fillText('BYE',x+22,top+rowH+rowH*.62)}
    c.restore();
  }
  async function makeCanvas(format,title,kind){
    const data=blockData(title);
    if(!data?.rows.length)throw new Error('Projected seeds are still loading.');
    const logosByName=await loadLogoCache();
    const rows=await Promise.all(data.rows.map(async row=>({...row,logo:await loadImage(logosByName?.[norm(row.team)]||'')})));
    const {canvas,c,w,h}=baseCanvas(format),margin=format==='x'?42:format==='story'?34:30;
    drawHeader(c,w,format,data.cls,kind,margin);
    if(kind==='seeds'){
      const cols=format==='story'?1:2,top=format==='story'?255:220,bottom=format==='story'?66:48,gap=format==='x'?12:11,rowCount=Math.ceil(rows.length/cols),usableW=w-margin*2-gap*(cols-1),cardW=usableW/cols,usableH=h-top-bottom-gap*(rowCount-1),cardH=usableH/rowCount;
      rows.forEach((row,i)=>{const col=Math.floor(i/rowCount),r=i%rowCount;drawSeedCard(c,row,margin+col*(cardW+gap),top+r*(cardH+gap),cardW,cardH,row.logo)});
    }else{
      const bySeed=new Map(rows.map(row=>[row.seed,row])),matches=PAIRS.map(([a,b])=>[bySeed.get(a),bySeed.get(b)]).filter(([a])=>a),cols=format==='story'?1:format==='x'?4:2,top=format==='story'?255:220,bottom=format==='story'?66:48,gap=format==='x'?12:12,rowCount=Math.ceil(matches.length/cols),usableW=w-margin*2-gap*(cols-1),cardW=usableW/cols,usableH=h-top-bottom-gap*(rowCount-1),cardH=usableH/rowCount;
      const logosBySeed=new Map(rows.map(row=>[row.seed,row.logo]));
      matches.forEach(([a,b],i)=>{const col=Math.floor(i/rowCount),r=i%rowCount;drawBracketCard(c,a,b,margin+col*(cardW+gap),top+r*(cardH+gap),cardW,cardH,i,logosBySeed)});
    }
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#777';c.font=`900 ${format==='story'?15:12}px Arial`;c.fillText('@ruralutahsports77',margin,h-20);
    return{canvas,cls:data.cls};
  }
  function canvasFile(canvas,name){
    const data=canvas.toDataURL('image/png',1),bin=atob(data.slice(data.indexOf(',')+1)),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new File([bytes],name,{type:'image/png'});
  }
  function saveCanvas(canvas,name){
    const link=document.createElement('a');link.href=canvas.toDataURL('image/png',1);link.download=name;document.body.appendChild(link);link.click();link.remove();
  }
  function preview(canvas,cls,kind,format){
    const label=kind==='seeds'?'Projected Seeds':'Projected Bracket',slug=safeSlug(`${cls}-${kind}`),name=`rus-${slug}-${format}-${Date.now()}.png`,overlay=document.createElement('div');
    overlay.className='rus-playoff-share-preview';
    overlay.innerHTML=`<div class="rus-playoff-share-preview-card"><h3>${esc(cls)} ${label} graphic is ready</h3><p>Rendered directly in a RUS social format. This projection shows teams and seeds only; the official UHSAA playoff bracket may change.</p><div class="rus-playoff-share-preview-host"></div><div class="rus-playoff-share-preview-actions"><button class="primary share">Share PNG</button><button class="save">Save PNG</button><button class="close">Close</button></div></div>`;
    overlay.querySelector('.rus-playoff-share-preview-host').appendChild(canvas);
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.close').onclick=close;
    overlay.querySelector('.save').onclick=()=>saveCanvas(canvas,name);
    const share=overlay.querySelector('.share');
    if(!navigator.share)share.remove();
    else share.onclick=async()=>{
      try{
        const file=canvasFile(canvas,name);
        if(navigator.canShare&&!navigator.canShare({files:[file]})){saveCanvas(canvas,name);return}
        await navigator.share({files:[file],title:`${cls} ${label} • Rural Utah Sports`});
      }catch(error){if(error?.name!=='AbortError')saveCanvas(canvas,name)}
    };
  }
  function openFormatModal(kind,title){
    const data=blockData(title),label=kind==='seeds'?'Projected Seeds':'Projected Bracket';
    if(!data?.rows.length){window.alert('Projected seeds are still loading.');return}
    const overlay=document.createElement('div');overlay.className='rus-playoff-share-modal';
    overlay.innerHTML=`<div class="rus-playoff-share-sheet"><h3>${esc(data.cls)} ${label}</h3><p>Choose a social format for this projected playoff graphic.</p><div class="rus-playoff-share-formats"><button data-format="square"><strong>Instagram Post</strong>Square PNG</button><button data-format="story"><strong>Instagram Story</strong>Vertical PNG</button><button data-format="x"><strong>X Post</strong>Landscape PNG</button></div><button class="rus-playoff-share-cancel">Cancel</button></div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.rus-playoff-share-cancel').onclick=close;
    overlay.querySelectorAll('[data-format]').forEach(button=>button.onclick=async()=>{
      const format=button.dataset.format;button.disabled=true;button.textContent='Creating…';
      try{const result=await makeCanvas(format,title,kind);close();preview(result.canvas,result.cls,kind,format)}
      catch(error){console.error(error);button.disabled=false;button.innerHTML=`<strong>Try Again</strong>${esc(error?.message||'Could not create graphic')}`}
    });
  }

  injectButtons();
  const observer=new MutationObserver(injectButtons);
  observer.observe(root,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),30000);
})();
