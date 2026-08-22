(()=>{
  if(!location.pathname.toLowerCase().includes('scoreboard'))return;

  const COMPACT_FORMATS=new Set(['square','story','x']);
  const ORANGE='#F14D07';
  const TEAM_ALIASES={'CEDAR':'CEDAR CITY','MONUMENT VAL':'MONUMENT VALLEY','GUNNISON':'GUNNISON VALLEY','GRAND COUNTY':'GRAND'};
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const canon=v=>TEAM_ALIASES[norm(v)]||norm(v);
  const withTimeout=(promise,ms,message='Timed out')=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

  function roundRect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function fitText(c,value,maxWidth,start,min=9,weight=900){let size=start;for(;size>min;size--){c.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;if(c.measureText(String(value||'')).width<=maxWidth)break}return size}
  function color(value,fallback='#252525'){const v=String(value||'').trim();return /^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\(/i.test(v)?v:fallback}
  function drawContain(c,img,x,y,w,h){if(!img?.naturalWidth||!img?.naturalHeight)return;const s=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}

  function loadImage(src){
    if(!src)return Promise.resolve(null);
    return new Promise(resolve=>{
      const img=new Image();let done=false,timer=null;
      const finish=value=>{if(done)return;done=true;if(timer)clearTimeout(timer);resolve(value)};
      try{
        const value=String(src).trim();
        if(!value){finish(null);return}
        if(!/^data:|^blob:/i.test(value)){
          const url=new URL(value,location.href);
          if(url.origin!==location.origin)img.crossOrigin='anonymous';
          img.src=url.href;
        }else img.src=value;
        img.onload=()=>finish(img);img.onerror=()=>finish(null);img.decoding='async';
        if(img.complete&&img.naturalWidth){finish(img);return}
        timer=setTimeout(()=>finish(null),2600);
      }catch{finish(null)}
    });
  }

  function loadFirstImage(candidates){
    const unique=[...new Set((candidates||[]).map(v=>String(v||'').trim()).filter(Boolean))];
    if(!unique.length)return Promise.resolve(null);
    return new Promise(resolve=>{
      let settled=false,pending=unique.length;
      unique.forEach(src=>loadImage(src).then(img=>{
        if(settled)return;
        if(img){settled=true;resolve(img);return}
        pending--;if(!pending){settled=true;resolve(null)}
      }));
    });
  }

  async function fetchJson(file,timeout=4000){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{const r=await fetch(`${file}?v=${Date.now()}`,{cache:'no-store',signal:controller.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(timer)}
  }

  let contextPromise=null;
  function loadContext(){
    contextPromise=null;
    contextPromise=(async()=>{
      const [standings,classData,stateData,logoCache]=await Promise.all([
        fetchJson('https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/standings-2026.json'),
        fetchJson('https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/rankings-current-2026.json'),
        fetchJson('https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/state-top25-history-2026.json'),
        fetchJson('school-logo-cache.json',5200)
      ]);
      const records=new Map(),classRanks=new Map(),stateRanks=new Map();
      for(const rows of Object.values(standings?.byClassification||{}))for(const row of rows||[])if(row?.team)records.set(canon(row.team),row);
      for(const [classification,teams] of Object.entries(classData?.classifications||{}))(teams||[]).forEach((team,index)=>{const name=typeof team==='string'?team:team?.team;if(name)classRanks.set(canon(name),{rank:index+1,classification:classification==='8-PLAYER'?'8P':classification})});
      const snapshots=stateData?.snapshots||[],latest=snapshots[snapshots.length-1]||stateData;
      (latest?.teams||latest?.rankings||[]).forEach((team,index)=>{const name=typeof team==='string'?team:team?.team;if(name)stateRanks.set(canon(name),{rank:Number(team?.rank)||index+1})});
      return{records,classRanks,stateRanks,logoCache:logoCache||{}};
    })();
    return contextPromise;
  }

  function recordText(row){if(!row)return'';const w=Number(row.wins),l=Number(row.losses),t=Number(row.ties||0);if(!Number.isFinite(w)||!Number.isFinite(l))return'';return`${w}-${l}${Number.isFinite(t)&&t?`-${t}`:''}`}

  function logoCandidates(name,img,context){
    const key=norm(name),canonical=canon(name),cache=context.logoCache||{},assets=window.RUSSchoolAssets;
    const assetUrls=[];
    try{assetUrls.push(assets?.logoUrl?.(name)||'')}catch{}
    if(canonical&&canonical!==key){try{assetUrls.push(assets?.logoUrl?.(canonical)||'')}catch{}}
    return[
      img?.currentSrc||'',
      img?.src||'',
      img?.getAttribute?.('src')||'',
      cache[key]||'',
      cache[canonical]||'',
      ...assetUrls
    ];
  }

  function parseGame(el,context){
    const rows=[...el.querySelectorAll('.team-row')].slice(0,2);
    if(rows.length<2)return null;
    const teams=rows.map(row=>{
      const nameEl=row.querySelector('.team-name'),name=nameEl?.textContent?.trim()||'Team',key=canon(name),standing=context.records.get(key),classRank=context.classRanks.get(key),stateRank=context.stateRanks.get(key),rawMeta=row.querySelector('.team-meta')?.textContent?.trim()||'',record=recordText(standing),meta=[];
      if(record)meta.push(record);
      if(classRank)meta.push(`${classRank.classification} #${classRank.rank}`);else if(rawMeta)meta.push(rawMeta.split('•')[0].trim());
      const region=rawMeta.split('•').slice(1).join(' • ').trim();if(region)meta.push(/^\d+$/.test(region)?`Region ${region}`:region);
      const img=row.querySelector('.team-logo'),style=getComputedStyle(nameEl||row),rowStyle=getComputedStyle(row),teamColor=color(style.getPropertyValue('--team-bg')||rowStyle.getPropertyValue('--team-wash'),'#252525');
      const score=row.querySelector('.actual b')?.textContent?.trim()||'—';
      return{
        name,
        displayName:stateRank?`#${stateRank.rank} ${name}`:name,
        meta:meta.join(' • '),
        score,
        hasScore:score!=='—',
        winner:row.classList.contains('winner')||row.classList.contains('rus-winner'),
        domImage:img||null,
        logoCandidates:logoCandidates(name,img,context),
        color:teamColor
      };
    });
    const status=el.querySelector('.status')?.textContent?.trim()||'UPCOMING',date=el.closest('.date-section')?.querySelector('.date-head h2')?.textContent?.trim()||'',pick=el.querySelector('.pick-result')?.textContent?.replace(/\s+/g,' ').trim()||'RUS SCOREBOARD';
    return{teams,status,date,pick};
  }

  async function loadTeamImage(team){
    const dom=team.domImage;
    if(dom?.complete&&dom.naturalWidth&&dom.naturalHeight)return dom;
    return loadFirstImage(team.logoCandidates);
  }

  function selectedGameElements(btn){
    const modal=btn.closest('.rus-share-modal');if(!modal)return[];
    const all=[...document.querySelectorAll('#board .game')];
    return [...modal.querySelectorAll('.rus-sb-choice input:checked')].map(box=>all[Number(box.value)]).filter(Boolean);
  }

  function titleFor(items,classValue){
    const dates=[...new Set(items.map(x=>x.date).filter(Boolean))],classLabel=classValue==='8P'?'8-Player':classValue;
    if(dates.length===1)return`${classValue!=='ALL'?classLabel+' • ':''}${dates[0]} • Scoreboard`;
    return`${classValue!=='ALL'?classLabel+' • ':''}Weekly Scoreboard • ${items.length} Games`;
  }

  async function renderCompact(format,elements,classValue='ALL'){
    const context=await loadContext(),items=elements.map(el=>parseGame(el,context)).filter(Boolean);if(!items.length)throw new Error('No games selected');
    const [w,h]=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080],cols=format==='x'?Math.min(3,items.length):(format==='story'&&items.length<=3?1:Math.min(2,items.length)),rows=Math.ceil(items.length/Math.max(1,cols)),margin=format==='x'?42:34,gap=format==='x'?12:10,headH=format==='story'?165:format==='x'?122:132,footerH=44,gridTop=headH,gridBottom=h-footerH-14,cardW=(w-margin*2-gap*(cols-1))/cols,cardH=(gridBottom-gridTop-gap*(rows-1))/rows;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,w,h);c.fillStyle=ORANGE;c.fillRect(0,0,w,12);
    const title=titleFor(items,classValue);c.fillStyle='#fff';c.textAlign='left';c.textBaseline='alphabetic';fitText(c,title,w-margin*2,format==='x'?42:40,24,1000);c.fillText(title,margin,format==='story'?72:60);c.fillStyle=ORANGE;c.font=`1000 ${format==='story'?22:18}px Arial,Helvetica,sans-serif`;c.fillText('RURAL UTAH SPORTS',margin,format==='story'?109:92);c.fillStyle='#777';c.font=`900 ${format==='story'?15:13}px Arial,Helvetica,sans-serif`;c.fillText(`${items.length} SELECTED GAME${items.length===1?'':'S'} • ${format==='story'?'INSTAGRAM STORY':format==='x'?'X POST':'INSTAGRAM POST'}`,margin,format==='story'?139:116);

    const images=await Promise.all(items.flatMap(item=>item.teams.map(loadTeamImage)));
    items.forEach((item,index)=>{
      const col=index%cols,row=Math.floor(index/cols),x=margin+col*(cardW+gap),y=gridTop+row*(cardH+gap),topH=Math.max(28,Math.min(40,cardH*.18)),footH=Math.max(24,Math.min(34,cardH*.15)),teamH=(cardH-topH-footH)/2;
      c.fillStyle='#050505';roundRect(c,x,y,cardW,cardH,9);c.fill();c.strokeStyle='#353535';c.lineWidth=2;c.stroke();c.save();roundRect(c,x,y,cardW,cardH,9);c.clip();c.fillStyle='#171717';c.fillRect(x,y,cardW,topH);
      const status=String(item.status||'UPCOMING').toUpperCase(),statusFill=/FINAL/.test(status)?ORANGE:/LIVE|Q[1-4]|HALF|OT/.test(status)?'#FFD54A':'#252525',badgeH=Math.max(18,topH-12),badgeW=Math.min(cardW*.42,Math.max(62,status.length*7+22));c.fillStyle=statusFill;roundRect(c,x+9,y+(topH-badgeH)/2,badgeW,badgeH,badgeH/2);c.fill();c.fillStyle=statusFill==='#252525'?'#bbb':'#080808';c.textAlign='center';c.textBaseline='middle';fitText(c,status,badgeW-14,11,8,1000);c.fillText(status,x+9+badgeW/2,y+topH/2);c.textAlign='right';c.fillStyle='#888';fitText(c,item.date,cardW-badgeW-32,10,7,900);c.fillText(item.date,x+cardW-9,y+topH*.58);

      item.teams.forEach((team,ti)=>{
        const ty=y+topH+ti*teamH,img=images[index*2+ti],showScore=team.hasScore,scoreW=showScore?Math.max(64,cardW*.19):0,maxLogo=format==='story'?120:format==='x'?82:104,logoSize=img?Math.max(48,Math.min(teamH-24,maxLogo)):0,logoX=x+16,logoY=ty+(teamH-logoSize)/2,nameX=img?logoX+logoSize+16:x+18,textRight=x+cardW-scoreW-12,textW=Math.max(70,textRight-nameX);
        c.fillStyle=ti?'#080808':'#0c0c0c';c.fillRect(x,ty,cardW,teamH);c.save();c.globalAlpha=.22;c.fillStyle=team.color;c.fillRect(x,ty,cardW-scoreW,teamH);c.restore();c.fillStyle=team.color;c.fillRect(x,ty,7,teamH);
        if(img)drawContain(c,img,logoX,logoY,logoSize,logoSize);
        c.fillStyle='#fff';c.textAlign='left';c.textBaseline='alphabetic';fitText(c,team.displayName,textW,Math.max(14,Math.min(24,teamH*.30)),11,1000);c.fillText(team.displayName,nameX,ty+teamH*.47);
        c.fillStyle='#aaa';fitText(c,team.meta,textW,Math.max(9,Math.min(12,teamH*.16)),8,900);c.fillText(team.meta,nameX,ty+teamH*.70);
        if(showScore){const sx=x+cardW-scoreW/2;c.textAlign='center';c.fillStyle='#777';c.font=`900 ${Math.max(7,Math.min(10,teamH*.12))}px Arial,Helvetica,sans-serif`;c.fillText('SCORE',sx,ty+teamH*.33);c.fillStyle=team.winner?'#73D977':ORANGE;c.font=`1000 ${Math.max(24,Math.min(38,teamH*.45))}px Arial,Helvetica,sans-serif`;c.fillText(team.score,sx,ty+teamH*.69)}
      });

      const fy=y+cardH-footH;c.fillStyle='#111';c.fillRect(x,fy,cardW,footH);c.textAlign='center';c.textBaseline='middle';c.fillStyle=/RUS PICK:\s*W/i.test(item.pick)?'#73D977':/RUS PICK:\s*L/i.test(item.pick)?'#FF7B7B':'#aaa';fitText(c,item.pick||'RUS SCOREBOARD',cardW-20,11,7,900);c.fillText(item.pick||'RUS SCOREBOARD',x+cardW/2,fy+footH/2);c.restore();
    });
    c.fillStyle='#777';c.textAlign='left';c.textBaseline='alphabetic';c.font='900 14px Arial,Helvetica,sans-serif';c.fillText('ruralutahsports.github.io',margin,h-18);return canvas;
  }

  async function canvasBlob(canvas){
    const blob=await withTimeout(new Promise(resolve=>canvas.toBlob(resolve,'image/png',1)),6000,'PNG encoding timed out');if(!blob)throw new Error('PNG export failed');return blob;
  }
  async function deliver(canvas,format){
    const blob=await canvasBlob(canvas),name=`rural-utah-sports-${format}-${Date.now()}.png`,file=new File([blob],name,{type:'image/png'});let shareable=false;try{shareable=!!(navigator.share&&navigator.canShare?.({files:[file]}))}catch{}
    if(shareable){try{await navigator.share({files:[file],title:'Rural Utah Sports Scoreboard'});return}catch(e){if(e?.name==='AbortError')return}}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  }

  async function handleCompact(btn,format){
    if(btn.dataset.rusNativeBusy==='1')return;const elements=selectedGameElements(btn);if(!elements.length){alert('Select at least one game.');return}if(elements.length>8){alert('Instagram and X single-image formats support up to 8 games. Select 8 or fewer.');return}const modal=btn.closest('.rus-share-modal'),classValue=modal?.querySelector('.rus-sb-class-filter')?.value||'ALL',old=btn.innerHTML;btn.dataset.rusNativeBusy='1';btn.disabled=true;btn.textContent='Creating…';try{const canvas=await withTimeout(renderCompact(format,elements,classValue),14000,'Graphic rendering timed out');await deliver(canvas,format);modal?.remove()}catch(e){console.error('Native scoreboard share failed',e);btn.disabled=false;btn.innerHTML=old;alert('Could not create the scoreboard graphic. Please try again.')}finally{delete btn.dataset.rusNativeBusy}}

  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('.rus-share-option[data-f]'),format=btn?.dataset?.f;if(!btn||!COMPACT_FORMATS.has(format))return;event.preventDefault();event.stopImmediatePropagation();handleCompact(btn,format);
  },true);

  const timers=new WeakMap();
  const armImage=img=>{if(!img||img.complete||timers.has(img))return;const finish=()=>{const timer=timers.get(img);if(timer)clearTimeout(timer);timers.delete(img)};img.addEventListener('load',finish,{once:true});img.addEventListener('error',finish,{once:true});const timer=setTimeout(()=>{timers.delete(img);if(img.complete)return;try{img.dispatchEvent(new Event('error'))}catch{}},3500);timers.set(img,timer)};
  const scan=root=>{if(root?.matches?.('.rus-sb-board img'))armImage(root);root?.querySelectorAll?.('.rus-sb-board img').forEach(armImage)};
  const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node)})));const start=()=>observer.observe(document.body,{childList:true,subtree:true});if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});

  const loadCore=()=>{if(document.querySelector('script[data-rus-scoreboard-share-core="1"]'))return;const core=document.createElement('script');core.src='scoreboard-share-layout-core.js?v=20260821-native-compact2';core.defer=true;core.dataset.rusScoreboardShareCore='1';document.head.appendChild(core)};
  loadCore();
})();
