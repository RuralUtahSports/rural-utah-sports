(() => {
'use strict';
if(window.__rusOfficialBracketShare) return;
window.__rusOfficialBracketShare=true;
const ORANGE='#F14D07';
const FORMATS={
 square:{width:1600,height:1600,name:'Instagram Square Bracket',kind:'full'},
 full:{width:2000,height:1400,name:'Wide Full Bracket',kind:'full'},
 poster:{width:1080,height:1350,name:'Instagram Portrait Matchups',kind:'round'},
 story:{width:1080,height:1920,name:'Instagram Story Matchups',kind:'round'}
};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const getName=t=>typeof t==='string'?t:(t?.name||t?.team||'');
const placeholder=name=>!name||/^(?:TBD|BYE|Winner of |Semifinal |Quarterfinal )/i.test(name);
const asset=name=>window.RUSOfficialBracketTeamAssets?.resolve(name)||{logo:'',backgroundColor:'#303030',textColor:'#fff'};
const slug=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const hexrgba=(hex,a)=>{const h=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#303030';return 'rgba('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',')+','+a+')'};
function rect(c,x,y,w,h,r=12){
  if(w<=0||h<=0)return;
  r=Math.min(r,w/2,h/2);
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}
function fit(c,label,max,start=25,min=12,weight=900){
  const value=String(label||'');
  for(let size=start;size>=min;size--){
    c.font=weight+' '+size+'px Arial,Helvetica,sans-serif';
    if(c.measureText(value).width<=max)return{size,text:value};
  }
  c.font=weight+' '+min+'px Arial,Helvetica,sans-serif';
  let shorter=value;
  while(shorter.length>1&&c.measureText(shorter+'…').width>max)shorter=shorter.slice(0,-1);
  return{size:min,text:shorter+(shorter!==value?'…':'')};
}
function fitDraw(c,text,x,y,max,start,min,align='left',color='#fff'){
  const f=fit(c,text,max,start,min);
  c.font='900 '+f.size+'px Arial,Helvetica,sans-serif';c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';
  c.fillText(f.text,x,y);c.textAlign='left';
}
function drawImage(c,img,x,y,w,h){
  if(!img?.naturalWidth||!img?.naturalHeight)return;
  const factor=Math.min(w/img.naturalWidth,h/img.naturalHeight)*.93;
  const dw=img.naturalWidth*factor,dh=img.naturalHeight*factor;
  c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
function loadImg(path){
  if(!path)return Promise.resolve(null);
  return new Promise(resolve=>{
    let done=false;const img=new Image();
    const timer=setTimeout(()=>finish(null),3500);
    function finish(v){if(done)return;done=true;clearTimeout(timer);resolve(v)}
    img.onload=()=>finish(img);img.onerror=()=>finish(null);
    img.decoding='async';img.src=path;
  });
}
async function loadImages(data){
  await window.RUSOfficialBracketTeamAssets?.ready;
  const names=new Set();
  data.rounds.forEach(r=>r.games.forEach(g=>[g.a,g.b].forEach(t=>{const n=getName(t);if(!placeholder(n))names.add(n)})));
  const loaded=await Promise.all(Array.from(names).map(async name=>[name,await loadImg(asset(name).logo)]));
  return new Map(loaded);
}
function canvas(w,h){
  const element=document.createElement('canvas');element.width=w;element.height=h;
  const c=element.getContext('2d');if(!c)throw Error('Canvas unavailable');
  c.fillStyle='#080a0e';c.fillRect(0,0,w,h);
  const gradient=c.createRadialGradient(w/2,0,20,w/2,0,Math.max(w,h)*.9);
  gradient.addColorStop(0,'rgba(241,77,7,.25)');gradient.addColorStop(1,'rgba(241,77,7,0)');
  c.fillStyle=gradient;c.fillRect(0,0,w,h);
  c.fillStyle=ORANGE;c.fillRect(0,0,w,12);
  return {element,c};
}
function header(c,w,cls,subtitle){
  c.fillStyle=ORANGE;c.font='900 27px Arial,Helvetica,sans-serif';c.textAlign='left';
  c.fillText('RURAL UTAH SPORTS',55,62);
  c.font='900 '+(w>1500?57:49)+'px Arial,Helvetica,sans-serif';c.fillStyle='#fff';
  c.fillText('2026 OFFICIAL FOOTBALL PLAYOFFS',55,132);
  c.font='900 '+(w>1500?32:29)+'px Arial,Helvetica,sans-serif';c.fillStyle='#ffc7aa';
  c.fillText(cls.toUpperCase()+'  |  '+subtitle.toUpperCase(),55,184);
  c.textAlign='left';
}
function footer(c,w,h,text){
  c.fillStyle='#333';c.fillRect(55,h-102,w-110,2);
  c.font='800 19px Arial,Helvetica,sans-serif';c.fillStyle='#aaa';c.textAlign='left';
  c.fillText(text,55,h-63);
  c.fillStyle=ORANGE;c.textAlign='right';c.fillText('@ruralutahsports77',w-55,h-63);c.textAlign='left';
}
function knownCount(round){
  return round.games.filter(g=>!placeholder(getName(g.a))&&!placeholder(getName(g.b))).length;
}
function featuredRound(data){
  return data.rounds.map((round,i)=>({i,score:knownCount(round)})).sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.i||0;
}
function teamHalf(c,t,img,x,y,w,h,side){
  const name=getName(t)||'TBD',known=!placeholder(name),info=known?asset(name):{backgroundColor:'#343434',textColor:'#ddd'};
  const color=info.backgroundColor;
  c.fillStyle=known?hexrgba(color,.25):'#171b21';c.fillRect(x,y,w,h);
  c.fillStyle=known?color:'#444';c.fillRect(side==='left'?x:x+w-7,y,7,h);
  const logoSide=Math.min(78,h*.64),logoX=side==='left'?x+20:x+w-logoSide-20;
  if(known)drawImage(c,img,logoX,y+(h-logoSide)/2,logoSide,logoSide);
  const sx=side==='left'?logoX+logoSide+15:logoX-15;
  const align=side==='left'?'left':'right';
  const limit=w-logoSide-72;
  const seed=t?.seed?'#'+t.seed:'';
  c.fillStyle='#f8b899';c.font='900 18px Arial,Helvetica,sans-serif';c.textBaseline='middle';c.textAlign=align;
  c.fillText(seed,sx,y+h*.31);
  fitDraw(c,name,sx,y+h*.60,limit,h>=135?30:26,15,align,known?'#fff':'#b6b6b6');
  c.textAlign='left';
}
function largeGame(c,g,images,x,y,w,h){
  rect(c,x,y,w,h,13);c.fillStyle='#16191f';c.fill();c.strokeStyle='#3f4149';c.lineWidth=2;c.stroke();
  c.save();rect(c,x+2,y+2,w-4,h-4,11);c.clip();
  const detailHeight=h>=128?31:0,bodyH=h-detailHeight,half=w/2;
  teamHalf(c,g.a,images.get(getName(g.a)),x+2,y+2,half-2,bodyH-4,'left');
  teamHalf(c,g.b,images.get(getName(g.b)),x+half,y+2,half-2,bodyH-4,'right');
  c.fillStyle='#080a0e';rect(c,x+w/2-24,y+bodyH/2-17,48,34,9);c.fill();
  c.fillStyle=ORANGE;c.font='900 17px Arial,Helvetica,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('VS',x+w/2,y+bodyH/2);c.textAlign='left';
  if(detailHeight){
    c.fillStyle='#101217';c.fillRect(x,y+bodyH,w,detailHeight);
    const detail=[g.date,g.time,g.venue].filter(Boolean).join('  •  ');
    fitDraw(c,detail,x+w/2,y+bodyH+detailHeight/2,w-30,17,12,'center','#c9c9c9');
  }
  c.restore();
}
function makeRoundGraphic(cls,data,format,images){
  const w=format.width,h=format.height,view=canvas(w,h),c=view.c,idx=featuredRound(data);
  const round=data.rounds[idx],name=String(round.name||'Opening Matchups').split(' · ')[0];
  header(c,w,cls,name);
  const games=round.games||[],top=255,bot=h-135,area=bot-top;
  const gap=games.length>=8?11:18;
  const cardH=Math.min(games.length>=8?116:games.length>=5?155:games.length>=3?220:310,(area-gap*(games.length-1))/Math.max(games.length,1));
  const total=cardH*games.length+gap*(games.length-1);
  const start=top+Math.max(0,(area-total)/2);
  games.forEach((g,i)=>largeGame(c,g,images,55,start+i*(cardH+gap),w-110,cardH));
  footer(c,w,h,data.status==='partial'?'PARTIAL REVEAL  •  SOURCE: MAXPREPS / UHSAA':'BRACKET MATCHUPS  •  SOURCE: MAXPREPS / UHSAA');
  return view.element;
}
function smallTeam(c,t,img,x,y,w,h){
  const name=getName(t)||'TBD',known=!placeholder(name),meta=known?asset(name):{backgroundColor:'#303030'};
  c.fillStyle=known?hexrgba(meta.backgroundColor,.30):'#171b20';c.fillRect(x,y,w,h);
  c.fillStyle=known?meta.backgroundColor:'#333';c.fillRect(x,y,6,h);
  const sz=Math.min(36,h-11);if(known)drawImage(c,img,x+10,y+(h-sz)/2,sz,sz);
  const tx=x+(known?sz+19:18);
  fitDraw(c,(t?.seed?'#'+t.seed+'  ':'')+name,tx,y+h/2,w-(known?sz+31:27),21,13,'left',known?'#fff':'#b3b3b3');
}
function smallGame(c,g,images,x,y,w,h){
  rect(c,x,y,w,h,8);c.fillStyle='#14171c';c.fill();c.strokeStyle='#444';c.lineWidth=1.7;c.stroke();
  c.save();rect(c,x+1,y+1,w-2,h-2,7);c.clip();
  smallTeam(c,g.a,images.get(getName(g.a)),x+1,y+1,w-2,h/2-1);
  c.fillStyle='#454545';c.fillRect(x+4,y+h/2-1,w-8,2);
  smallTeam(c,g.b,images.get(getName(g.b)),x+1,y+h/2+1,w-2,h/2-2);
  c.restore();
}
/* Full 2026 UHSAA bracket graphic: official seeds, authentic local logos,
   advancing lines, and no assumed winners. The single-play-in formats map
   their opening games onto the correct quarterfinals, leaving byes intact. */
// Build site-owned logos into a legible Instagram bracket, never redraw them.
const shortName={'Utah Military Academy - Hill Field':'UMA - Hill Field','Utah Military Academy - Camp Williams':'UMA - Camp Williams','American Leadership Academy':'ALA','Judge Memorial Catholic':'Judge Memorial'};
const brief=name=>shortName[name]||name;
function bracketSlotLabel(team,opening){
 const name=getName(team)||'TBD';
 let m=name.match(/^Winner of opening matchup\s+(\d+)/i);
 if(m){const g=opening[Number(m[1])-1];if(g?.a?.seed&&g?.b?.seed)return 'Winner '+g.a.seed+'/'+g.b.seed;}
 const seeds=[...name.matchAll(/#(\d+)/g)].map(x=>x[1]);
 if(/^Winner of /i.test(name)&&seeds.length>=2)return 'Winner '+seeds[0]+'/'+seeds[1];
 m=name.match(/^Winner of QF\s*(\d+)/i);if(m)return 'Winner QF'+m[1];
 m=name.match(/^Semifinal\s+(\d+)\s+winner/i);if(m)return 'Winner SF'+m[1];
 return brief(name);
}
function drawBracketSlot(c,team,opening,images,x,y,w,h,sc){
 const name=getName(team)||'TBD',real=!placeholder(name),meta=real?asset(name):{backgroundColor:'#393939'};
 c.fillStyle=real?hexrgba(meta.backgroundColor,.43):'#1b1d21';c.fillRect(x,y,w,h);
 c.fillStyle=real?meta.backgroundColor:'#51535a';c.fillRect(x,y,Math.max(5,7*sc),h);
 const img=real?images.get(name):null,size=img?Math.min(h*.75,66*sc):0;
 if(img){
  const ix=x+w-size-12*sc,iy=y+(h-size)/2;
  rect(c,ix-3*sc,iy-3*sc,size+6*sc,size+6*sc,8*sc);
  c.fillStyle='#edf0f3';c.fill();drawImage(c,img,ix,iy,size,size);
 }
 const seed=team?.seed?'#'+team.seed:'',tx=x+17*sc,mid=y+h/2;
 if(seed)fitDraw(c,seed,tx,mid,47*sc,21*sc,14*sc,'left','#ffb98d');
 const textX=tx+(seed?52*sc:0),room=Math.max(25,x+w-textX-(img?size+25*sc:14*sc));
 fitDraw(c,bracketSlotLabel(team,opening),textX,mid,room,(h>70*sc?27:23)*sc,15*sc,'left',real?'#fff':'#c7c9ce');
}
function drawBracketMatch(c,g,opening,images,x,yCenter,w,h,sc){
 const y=yCenter-h/2;
 rect(c,x,y,w,h,10*sc);c.fillStyle='#151619';c.fill();c.strokeStyle='#55585f';c.lineWidth=2*sc;c.stroke();
 c.save();rect(c,x+1,y+1,w-2,h-2,9*sc);c.clip();
 drawBracketSlot(c,g.a,opening,images,x+1,y+1,w-2,h/2-2,sc);
 c.fillStyle='#505159';c.fillRect(x+5*sc,y+h/2-1,w-10*sc,2*sc);
 drawBracketSlot(c,g.b,opening,images,x+1,y+h/2+1,w-2,h/2-2,sc);
 c.restore();
}
function drawByes(c,quarters,opening,x,y,w,sc){
 const listed=new Set(opening.flatMap(g=>[getName(g.a),getName(g.b)]));
 const teams=quarters.flatMap(g=>[g.a,g.b]).filter(t=>t?.seed&&t?.name&&!listed.has(t.name)).sort((a,b)=>a.seed-b.seed);
 if(!teams.length)return;
 const height=(teams.length>3?380:215)*sc;
 rect(c,x,y,w,height,12*sc);c.fillStyle='rgba(9,13,17,.72)';c.fill();c.strokeStyle='rgba(241,77,7,.65)';c.lineWidth=2*sc;c.stroke();
 fitDraw(c,'FIRST-ROUND BYES',x+22*sc,y+36*sc,w-44*sc,24*sc,16*sc,'left','#ffb48b');
 teams.forEach((team,i)=>fitDraw(c,'#'+team.seed+'  '+brief(team.name),x+22*sc,y+75*sc+i*(teams.length>3?39:43)*sc,w-44*sc,21*sc,15*sc,'left','#f0f0f0'));
}
function makeFullGraphic(cls,data,images,format=FORMATS.full){
 const w=format.width,h=format.height,sc=Math.min(w/1600,h/1500),view=canvas(w,h),c=view.c;
 const stages=data.rounds.filter(r=>r.games?.length);
 if(stages.length<4)throw Error('Missing official bracket rounds');
 const first=stages[0].games,qf=stages[1].games,sf=stages[2].games,final=stages[3].games;
 if(!first.length||qf.length!==4||sf.length!==2||final.length!==1)throw Error('Unexpected tournament size');
 const pad=w*.035,gap=w*.018,space=w-2*pad-4*gap;
 const widths=[.333,.224,.181,.145,.117].map(r=>space*r),xs=[pad];
 for(let i=1;i<5;i++)xs.push(xs[i-1]+widths[i-1]+gap);
 c.fillStyle=ORANGE;c.fillRect(pad,22*sc,w-2*pad,3*sc);
 fitDraw(c,'RURAL UTAH SPORTS',pad,64*sc,w-2*pad,30*sc,20*sc,'left',ORANGE);
 fitDraw(c,'2026 OFFICIAL FOOTBALL PLAYOFFS',pad,133*sc,w-2*pad,60*sc,36*sc,'left','#fff');
 fitDraw(c,cls+'  |  OFFICIAL PLAYOFF BRACKET',pad,190*sc,w-2*pad,34*sc,23*sc,'left','#ffc09d');
 c.fillStyle='rgba(255,255,255,.28)';c.fillRect(pad,222*sc,w-2*pad,1*sc);
 const top=Math.max(h*.194,272*sc),bottom=h-115*sc,span=bottom-top;
 const yQ=[0,1,2,3].map(i=>top+(i+.5)*span/4),yS=[(yQ[0]+yQ[1])/2,(yQ[2]+yQ[3])/2],yF=[(yS[0]+yS[1])/2];
 const yFirst=first.length===8?first.map((_,i)=>top+(i+.5)*span/8):first.length===3?[yQ[0],yQ[2],yQ[3]]:first.length===1?[yQ[0]]:first.map((_,i)=>top+(i+.5)*span/first.length);
 const centers=[yFirst,yQ,yS,yF,yF],groups=[first,qf,sf,final];
 ['FIRST ROUND','QUARTERFINALS','SEMIFINALS','CHAMPIONSHIP','CHAMPION'].forEach((name,i)=>fitDraw(c,name,xs[i]+widths[i]/2,top-38*sc,widths[i],22*sc,14*sc,'center',i===4?ORANGE:'#ddd'));
 const compact=first.length>=8,cardH=Math.min((compact?133:175)*sc,compact?span/8-15*sc:span/4-28*sc);
 if(cardH<45*sc)throw Error('Bracket graphic height too small');
 const mapped=i=>first.length===8?Math.floor(i/2):first.length===3?[0,2,3][i]:first.length===1?0:Math.min(3,Math.floor(i*4/first.length));
 const edges=[];
 first.forEach((_,i)=>edges.push([0,i,1,mapped(i)]));
 qf.forEach((_,i)=>edges.push([1,i,2,Math.floor(i/2)]));
 sf.forEach((_,i)=>edges.push([2,i,3,0]));
 edges.push([3,0,4,0]);
 c.strokeStyle=ORANGE;c.lineWidth=3*sc;c.lineJoin='round';
 edges.forEach(([source,i,target,j])=>{
  const y1=centers[source][i],y2=centers[target][j],x1=xs[source]+widths[source],x2=xs[target],mid=(x1+x2)/2;
  c.beginPath();c.moveTo(x1,y1);c.lineTo(mid,y1);c.lineTo(mid,y2);c.lineTo(x2,y2);c.stroke();
 });
 groups.forEach((games,r)=>games.forEach((g,i)=>drawBracketMatch(c,g,first,images,xs[r],centers[r][i],widths[r],cardH,sc)));
 if(!compact)drawByes(c,qf,first,xs[0]+9*sc,top+span*.27,widths[0]-18*sc,sc);
 const cX=xs[4],cW=widths[4],cH=cardH*.82,cY=yF[0]-cH/2;
 rect(c,cX,cY,cW,cH,10*sc);c.fillStyle='#2b150e';c.fill();c.strokeStyle=ORANGE;c.lineWidth=3*sc;c.stroke();
 fitDraw(c,'CHAMPION: TBD',cX+cW/2,yF[0],cW-14*sc,21*sc,13*sc,'center',ORANGE);
 c.fillStyle='#414141';c.fillRect(pad,h-77*sc,w-2*pad,2*sc);
 fitDraw(c,'UHSAA / MaxPreps  •  No winners selected',pad,h-44*sc,w*.70,18*sc,13*sc,'left','#a7a7a7');
 fitDraw(c,'@ruralutahsports77',w-pad,h-44*sc,w*.28,20*sc,14*sc,'right',ORANGE);
 return view.element;
}
function closePopup(el){el?.remove()}
function popup(html){
  const overlay=document.createElement('div');overlay.className='rus-o-overlay';overlay.setAttribute('role','presentation');overlay.innerHTML=html;
  document.body.appendChild(overlay);const close=()=>closePopup(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  $('.rus-o-popup-close',overlay)?.addEventListener('click',close);
  return overlay;
}
function blobFor(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Unable to create PNG')),'image/png'))}
function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function preview(cls,format,rendered){
  const blob=await blobFor(rendered),name='rus-2026-'+slug(cls)+'-official-playoffs-'+format+'.png';
  const file=new File([blob],name,{type:'image/png'});
  const overlay=popup('<div class="rus-o-sheet" role="dialog" aria-modal="true" aria-label="Playoff share graphic preview"><h3>'+esc(cls)+' playoff graphic ready</h3><p>Preview the PNG, download it, or share it directly on your phone.</p><div class="rus-o-image-preview"></div><div class="rus-o-popup-buttons"><button type="button" class="rus-o-save-image">Save PNG</button><button type="button" class="rus-o-native-share">Share PNG</button><button type="button" class="rus-o-popup-close">Close</button></div></div>');
  $('.rus-o-image-preview',overlay).appendChild(rendered);
  $('.rus-o-save-image',overlay).onclick=()=>download(blob,name);
  const share=$('.rus-o-native-share',overlay);
  if(!(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))))share.hidden=true;
  else share.onclick=async()=>{try{await navigator.share({files:[file],title:'2026 '+cls+' Official Utah Football Playoffs'})}catch(e){if(e.name!=='AbortError'){console.warn(e);download(blob,name)}}};
  $('.rus-o-popup-close',overlay).onclick=()=>closePopup(overlay);
}
async function choose(cls){
  const overlay=popup('<div class="rus-o-sheet" role="dialog" aria-modal="true" aria-label="Choose playoff graphic"><h3>Share '+esc(cls)+' playoff bracket</h3><p>Use the authentic school logos and colors from Rural Utah Sports. No predicted winners are added.</p><div class="rus-o-format-options"><button type="button" data-format="square"><strong>Instagram Bracket</strong>1600 × 1600 • connected rounds</button><button type="button" data-format="full"><strong>Wide Full Bracket</strong>2000 × 1400 • connected rounds</button><button type="button" data-format="poster"><strong>Matchups Portrait</strong>1080 × 1350 • opening games</button><button type="button" data-format="story"><strong>Matchups Story</strong>1080 × 1920 • opening games</button></div><p class="rus-o-popup-note" aria-live="polite"></p><button type="button" class="rus-o-popup-close">Cancel</button></div>');
  $$('[data-format]',overlay).forEach(btn=>btn.addEventListener('click',async()=>{
    const f=FORMATS[btn.dataset.format],note=$('.rus-o-popup-note',overlay);
    $$('[data-format]',overlay).forEach(b=>b.disabled=true);note.textContent='Preparing the playoff graphic…';
    try{
      const response=await fetch('official-brackets-2026.json?v='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw Error('Bracket feed unavailable');
      const payload=await response.json(),data=payload.classifications?.[cls];
      if(!data?.rounds?.length||!['official','partial'].includes(data.status))throw Error('This classification is not published yet');
      const images=await loadImages(data);
      const graphic=f.kind==='full'?makeFullGraphic(cls,data,images,f):makeRoundGraphic(cls,data,f,images);
      closePopup(overlay);await preview(cls,btn.dataset.format,graphic);
    }catch(e){
      note.textContent='Could not create this graphic. '+String(e.message||'Please retry.');
      $$('[data-format]',overlay).forEach(b=>b.disabled=false);
    }
  }));
}
document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-official-share]');
  if(!btn)return;
  e.preventDefault();choose(btn.dataset.officialShare);
});
})();