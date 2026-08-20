(()=>{
  if(!location.pathname.toLowerCase().includes('scoreboard'))return;
  const ORANGE='#F14D07',MAX_GAMES=32,COMPACT_FORMAT_LIMIT=8,GRID_COLUMNS=4,GRID_ROWS=8,CAROUSEL_GAMES=10,CAROUSEL_COLUMNS=2,CAROUSEL_ROWS=5;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const loadCanvas=()=>window.html2canvas?Promise.resolve():new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  const normTeam=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const TEAM_ALIASES={'CEDAR':'CEDAR CITY','MONUMENT VAL':'MONUMENT VALLEY','GUNNISON':'GUNNISON VALLEY','GRAND COUNTY':'GRAND'};
  const canonTeam=v=>TEAM_ALIASES[normTeam(v)]||normTeam(v);
  let shareLogosPromise=null;
  let shareContextPromise=null;
  const loadShareLogos=()=>shareLogosPromise||(shareLogosPromise=(async()=>{
    const logos=await fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    try{
      const svg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
      const embedded=(svg.match(/href=["'](data:image\/(?:png|webp);base64,[^"']+)["']/i)||[])[1]||'';
      if(embedded)logos.RICH=embedded;
    }catch{}
    return logos;
  })());
  const shareLogoFor=(team,logos)=>logos[normTeam(team)]||window.RUSSchoolAssets?.logoUrl?.(team)||'';

  function recordText(row){
    if(!row)return'';
    const wins=Number(row.wins),losses=Number(row.losses),ties=Number(row.ties||0);
    if(!Number.isFinite(wins)||!Number.isFinite(losses))return'';
    return `${wins}-${losses}${Number.isFinite(ties)&&ties?`-${ties}`:''}`;
  }

  function metaParts(meta){
    const parts=String(meta||'').split('•').map(x=>x.trim()).filter(Boolean);
    return{classification:parts.shift()||'',region:parts.join(' • ')};
  }

  function formatRegion(region){
    const value=String(region||'').trim();
    return /^\d+$/.test(value)?`Region ${value}`:value;
  }

  function enrichTeam(team,context){
    const key=canonTeam(team.name),standing=context.records.get(key),classRank=context.classRanks.get(key),stateRank=context.stateRanks.get(key),base=metaParts(team.meta),classification=classRank?.classification||base.classification,record=recordText(standing),meta=[];
    if(record)meta.push(record);
    if(classRank)meta.push(`${classRank.classification} #${classRank.rank}`);
    else if(classification)meta.push(classification);
    if(base.region)meta.push(formatRegion(base.region));
    return{...team,displayName:stateRank?`#${stateRank.rank} ${team.name}`:team.name,meta:meta.join(' • ')||team.meta,record,classRank:classRank?.rank||null,stateRank:stateRank?.rank||null};
  }

  function loadShareContext(){
    if(shareContextPromise)return shareContextPromise;
    shareContextPromise=(async()=>{
      const stamp=Date.now(),get=file=>fetch(`${file}?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),[standings,classData,stateData]=await Promise.all([get('standings-2026.json'),get('rankings-current-2026.json'),get('state-top25-history-2026.json')]),records=new Map(),classRanks=new Map(),stateRanks=new Map();
      for(const rows of Object.values(standings?.byClassification||{}))for(const row of rows||[])if(row?.team)records.set(canonTeam(row.team),row);
      for(const[classification,teams]of Object.entries(classData?.classifications||{}))(teams||[]).forEach((team,index)=>{const name=typeof team==='string'?team:team?.team;if(name)classRanks.set(canonTeam(name),{rank:index+1,classification:classification==='8-PLAYER'?'8P':classification})});
      const snapshots=stateData?.snapshots||[],latest=snapshots[snapshots.length-1]||stateData;
      (latest?.teams||latest?.rankings||[]).forEach((team,index)=>{const name=typeof team==='string'?team:team?.team;if(name)stateRanks.set(canonTeam(name),{rank:Number(team?.rank)||index+1})});
      return{records,classRanks,stateRanks};
    })();
    return shareContextPromise;
  }

  function classFromMeta(meta){
    let value=String(meta||'').split('•')[0].trim().toUpperCase();
    if(value==='8-PLAYER')value='8P';
    return value;
  }

  async function visibleGames(){
    const context=await loadShareContext();
    return [...document.querySelectorAll('#board .game')].map((el,index)=>{
      const rows=[...el.querySelectorAll('.team-row')];
      const rawTeamData=rows.slice(0,2).map(row=>{const nameEl=row.querySelector('.team-name'),img=row.querySelector('.team-logo'),actual=row.querySelector('.actual b')?.textContent?.trim()||'—';return{name:nameEl?.textContent?.trim()||'',meta:row.querySelector('.team-meta')?.textContent?.trim()||'',score:actual,hasActualScore:actual!=='—',color:nameEl?.style.getPropertyValue('--team-bg')||row.style.getPropertyValue('--team-wash')||'#252525',logo:img?.currentSrc||img?.src||'',winner:row.classList.contains('rus-winner')||row.classList.contains('winner')}});
      const classes=rows.map(row=>classFromMeta(row.querySelector('.team-meta')?.textContent||''));
      const teamData=rawTeamData.map(team=>enrichTeam(team,context));
      const date=el.closest('.date-section')?.querySelector('.date-head h2')?.textContent?.trim()||'';
      const status=el.querySelector('.status')?.textContent?.trim()||'';
      const pickParts=[...el.querySelectorAll('.pick-result>span')].map(x=>x.textContent?.trim()).filter(Boolean),pick=pickParts.length?pickParts.join(' • '):el.querySelector('.pick-result')?.textContent?.replace(/\s+/g,' ').trim()||'';
      return {el,index,date,away:teamData[0]?.name||'Away',home:teamData[1]?.name||'Home',awayClass:classes[0]||'',homeClass:classes[1]||'',status,pick,teams:teamData};
    });
  }

  function addStyles(){
    document.getElementById('rus-scoreboard-share-css')?.remove();
    const style=document.createElement('style');style.id='rus-scoreboard-share-css';style.textContent=`
      .rus-share-sheet{max-height:calc(100vh - 24px);overflow-y:auto;overscroll-behavior:contain}.rus-sb-filter-label{display:block;margin:0 0 6px;color:#aaa;font-size:10px;font-weight:900;text-transform:uppercase}.rus-sb-class-filter{width:100%;height:44px;margin:0 0 12px;background:#1d1d1d;color:#fff;border:1px solid #444;border-radius:8px;padding:0 10px;font-weight:900}.rus-sb-all-label{margin:2px 0 7px;color:${ORANGE};font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.35px}.rus-sb-all-grid{margin-bottom:12px}.rus-sb-custom-options{margin:12px 0 0;border:1px solid #3a3a3a;border-radius:9px;background:#090909;overflow:hidden}.rus-sb-custom-options>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none;cursor:pointer;padding:13px 14px;color:#fff;font-size:12px;font-weight:1000;text-transform:uppercase}.rus-sb-custom-options>summary::-webkit-details-marker{display:none}.rus-sb-custom-options>summary:after{content:'+';color:${ORANGE};font-size:20px;line-height:1}.rus-sb-custom-options[open]>summary:after{content:'−'}.rus-sb-custom-body{padding:12px;border-top:1px solid #333}.rus-sb-picker-actions{display:flex;gap:8px;margin:0 0 10px}.rus-sb-picker-actions button{flex:1;border:1px solid #444;background:#1d1d1d;color:#fff;border-radius:7px;padding:9px 8px;font-weight:900;font-size:11px}.rus-sb-count{font-size:11px;color:#aaa;font-weight:900;margin:0 0 8px}.rus-sb-list{max-height:320px;overflow:auto;border:1px solid #333;border-radius:8px;background:#090909;margin-bottom:12px}.rus-sb-choice{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px;border-bottom:1px solid #242424;cursor:pointer}.rus-sb-choice:last-child{border-bottom:0}.rus-sb-choice input{width:18px;height:18px}.rus-sb-matchup{font-size:12px;font-weight:1000}.rus-sb-choice small{display:block;color:#777;font-size:9px;margin-top:3px}.rus-sb-class-chip{display:inline-block;margin-left:5px;color:#bbb;font-size:8px;font-weight:900}.rus-sb-choice-status{font-size:9px;font-weight:1000;color:#F14D07;text-transform:uppercase}.rus-sb-no-games{display:none;padding:20px;text-align:center;color:#777;font-size:11px;font-weight:800}.rus-share-option-wide{grid-column:1/-1}.rus-share-option-primary{background:${ORANGE}!important;color:#050505!important;border-color:${ORANGE}!important}.rus-share-option-primary strong{color:#050505!important}@media(max-width:700px){.rus-sb-list{max-height:220px}.rus-share-sheet{padding-bottom:calc(18px + env(safe-area-inset-bottom))}}
      .rus-sb-board{position:fixed;left:-12000px;top:0;box-sizing:border-box;background:#111;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;overflow:hidden}.rus-sb-topbar{height:12px;background:${ORANGE};flex:0 0 12px}.rus-sb-head{padding:18px 30px 10px;flex:0 0 auto}.rus-sb-title{font-size:38px;line-height:1;font-weight:1000}.rus-sb-brand{color:${ORANGE};font-size:19px;font-weight:1000;margin-top:9px}.rus-sb-grid{display:grid;gap:12px;padding:8px 30px 10px;flex:1;min-height:0;align-content:start;overflow:hidden}.rus-sb-footer{padding:5px 30px 17px;color:#888;font-size:14px;font-weight:900;flex:0 0 auto}
      .rus-sb-card{position:relative;min-height:0;background:#000;border:1px solid #333;border-radius:9px;overflow:hidden;display:flex;flex-direction:column}.rus-sb-card .game-top{padding:7px 10px;min-height:34px}.rus-sb-card .team-row{padding:8px 10px;gap:8px;min-height:0;flex:1}.rus-sb-card .team-row.rus-no-score{grid-template-columns:minmax(0,1fr)}.rus-sb-card .team-row.rus-no-score:before{background:var(--team-wash,rgba(255,255,255,.04))}.rus-sb-card .team-main{gap:10px}.rus-sb-card .team-logo{display:block!important;width:38px;height:38px;flex:0 0 38px;object-fit:contain;object-position:center}.rus-sb-card .team-name{font-size:12px;padding:4px 6px}.rus-sb-card .team-meta{font-size:8px}.rus-sb-card .scores{gap:8px}.rus-sb-card .pred{font-size:8px}.rus-sb-card .pred b{font-size:12px}.rus-sb-card .actual{font-size:8px}.rus-sb-card .actual b{font-size:23px}.rus-sb-card .game-foot{padding:6px 9px;font-size:8px;min-height:27px}.rus-sb-card .deseret-link,.rus-sb-card .game-details{display:none!important}.rus-sb-date{position:absolute;right:9px;top:39px;z-index:4;color:#999;font-size:7px;font-weight:900;text-transform:uppercase;pointer-events:none}
      .rus-sb-board.dense .rus-sb-card .game-top{padding:5px 8px;min-height:29px}.rus-sb-board.dense .rus-sb-card .team-row{padding:5px 8px}.rus-sb-board.dense .rus-sb-card .team-logo{width:31px;height:31px;flex-basis:31px}.rus-sb-board.dense .rus-sb-card .team-name{font-size:10px;padding:3px 5px}.rus-sb-board.dense .rus-sb-card .team-meta{font-size:7px}.rus-sb-board.dense .rus-sb-card .actual b{font-size:19px}.rus-sb-board.dense .rus-sb-card .pred b{font-size:10px}.rus-sb-board.dense .rus-sb-card .game-foot{padding:4px 7px;font-size:7px;min-height:22px}.rus-sb-board.dense .rus-sb-date{top:33px;font-size:6px}
      .rus-sb-board.x .rus-sb-title{font-size:34px}.rus-sb-board.x .rus-sb-head{padding-top:14px}.rus-sb-board.x .rus-sb-card .team-row{padding:5px 8px}.rus-sb-board.x .rus-sb-card .game-foot{padding:4px 7px}
    `;document.head.appendChild(style);
  }

  function cloneGame(item,logos){
    const clone=item.el.cloneNode(true);clone.classList.add('rus-sb-card');clone.querySelectorAll('.game-details,.deseret-link,.game-page-link,.game-description,.rus-inline-box').forEach(x=>x.remove());
    const teamRows=[...clone.querySelectorAll('.team-row')];
    [item.away,item.home].forEach((team,i)=>{
      const row=teamRows[i];if(!row)return;
      const main=row.querySelector('.team-main');if(!main)return;
      const teamData=item.teams[i]||{};
      let img=main.querySelector('.team-logo');
      if(!img){img=document.createElement('img');img.className='team-logo';img.alt=`${team} logo`;main.prepend(img)}
      const name=main.querySelector('.team-name');if(name)name.textContent=teamData.displayName||team;
      const meta=main.querySelector('.team-meta');if(meta)meta.textContent=teamData.meta||'';
      if(!teamData.hasActualScore){row.querySelector('.scores')?.remove();row.classList.add('rus-no-score')}
      const src=shareLogoFor(team,logos);
      if(src){img.src=src;img.style.display='block';img.style.objectFit='contain';img.style.objectPosition='center'}
      else img.style.display='none';
    });
    const foot=clone.querySelector('.game-foot');if(foot&&!foot.textContent.trim())foot.remove();
    clone.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.removeAttribute('target');a.style.pointerEvents='none'});
    const date=document.createElement('div');date.className='rus-sb-date';date.textContent=item.date;clone.appendChild(date);
    return clone;
  }

  function titleFor(items,classValue='ALL'){
    const dates=[...new Set(items.map(x=>x.date).filter(Boolean))];
    const classLabel=classValue==='8P'?'8-Player':classValue;
    if(dates.length===1)return `${classValue!=='ALL'?classLabel+' • ':''}${dates[0]} • Scoreboard`;
    return `${classValue!=='ALL'?classLabel+' • ':''}Weekly Scoreboard • ${items.length} Games`;
  }

  function canvasRoundRect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function fitCanvasText(c,value,maxWidth,start,min=9,weight=900){let size=start;for(;size>min;size--){c.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;if(c.measureText(String(value||'')).width<=maxWidth)break}return size}
  function safeCanvasColor(value,fallback='#252525'){return /^#[0-9A-F]{3}(?:[0-9A-F]{3})?$/i.test(String(value||'').trim())?String(value).trim():fallback}
  function loadCanvasImage(src){if(!src)return Promise.resolve(null);return new Promise(resolve=>{const img=new Image();let done=false,timer=null;const finish=value=>{if(done)return;done=true;if(timer)clearTimeout(timer);resolve(value)};try{const url=new URL(src,location.href);if(url.origin!==location.origin)img.crossOrigin='anonymous';img.onload=()=>finish(img);img.onerror=()=>finish(null);timer=setTimeout(()=>finish(null),3500);img.decoding='async';img.src=url.href}catch{finish(null)}})}
  function drawCanvasContain(c,img,x,y,w,h){if(!img?.naturalWidth||!img?.naturalHeight)return;const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}

  async function buildScoreboardCanvas(items,classValue='ALL',options={}){
    const columns=Math.max(1,Number(options.columns)||GRID_COLUMNS),rows=Math.max(1,Number(options.rows)||Math.ceil(items.length/columns)),capacity=columns*rows,width=Number(options.width)||2160,height=Number(options.height)||2700,page=Math.max(1,Number(options.page)||1),totalPages=Math.max(1,Number(options.totalPages)||1),compactCanvas=width<=1200,margin=compactCanvas?28:42,gap=compactCanvas?10:14,gridTop=compactCanvas?142:190,footerH=compactCanvas?42:54,gridBottom=height-footerH-(compactCanvas?14:20),cardW=(width-margin*2-gap*(columns-1))/columns,cardH=(gridBottom-gridTop-gap*(rows-1))/rows;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,width,height);c.fillStyle=ORANGE;c.fillRect(0,0,width,14);
    const title=titleFor(items,classValue),titleY=compactCanvas?58:78,metaY=compactCanvas?92:116,descriptorY=compactCanvas?120:151,pageLabel=totalPages>1?`${options.pageWord||'PAGE'} ${page} OF ${totalPages}`:'';c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';fitCanvasText(c,title,width-margin*2,compactCanvas?44:58,compactCanvas?25:34,1000);c.fillText(title,margin,titleY);c.fillStyle=ORANGE;c.font=`1000 ${compactCanvas?20:25}px Arial,Helvetica,sans-serif`;c.fillText('RURAL UTAH SPORTS',margin,metaY);if(pageLabel){c.textAlign='right';c.fillStyle='#aaa';c.font=`1000 ${compactCanvas?16:20}px Arial,Helvetica,sans-serif`;c.fillText(pageLabel,width-margin,metaY)}c.textAlign='left';c.fillStyle='#888';c.font=`900 ${compactCanvas?15:18}px Arial,Helvetica,sans-serif`;c.fillText(options.descriptor||`${columns} COLUMNS • ${rows} ROWS • ${Math.min(items.length,capacity)} GAMES`,margin,descriptorY);
    const logos=await loadShareLogos(),limited=items.slice(0,capacity),images=await Promise.all(limited.flatMap(item=>item.teams.slice(0,2).map(team=>loadCanvasImage(shareLogoFor(team.name,logos)||team.logo))));
    limited.forEach((item,index)=>{const col=index%columns,row=Math.floor(index/columns),x=margin+col*(cardW+gap),y=gridTop+row*(cardH+gap),topH=compactCanvas?38:46,footH=compactCanvas?30:36,teamH=(cardH-topH-footH)/2;
      c.fillStyle='#050505';canvasRoundRect(c,x,y,cardW,cardH,9);c.fill();c.strokeStyle='#353535';c.lineWidth=2;c.stroke();c.save();canvasRoundRect(c,x,y,cardW,cardH,9);c.clip();c.fillStyle='#171717';c.fillRect(x,y,cardW,topH);
      const status=String(item.status||'UPCOMING').toUpperCase(),statusFill=/FINAL/.test(status)?ORANGE:/LIVE|Q[1-4]|HALF|OT/.test(status)?'#FFD54A':'#252525',badgeH=compactCanvas?22:25,badgeY=y+(topH-badgeH)/2,badgeW=Math.min(compactCanvas?108:116,Math.max(64,status.length*(compactCanvas?7:8)+22));c.fillStyle=statusFill;canvasRoundRect(c,x+11,badgeY,badgeW,badgeH,badgeH/2);c.fill();c.fillStyle=statusFill==='#252525'?'#bbb':'#080808';c.font=`1000 ${compactCanvas?10:12}px Arial,Helvetica,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(status,x+11+badgeW/2,badgeY+badgeH/2);c.textAlign='right';c.fillStyle='#888';fitCanvasText(c,item.date,cardW-badgeW-42,compactCanvas?10:12,7,900);c.fillText(item.date,x+cardW-11,y+topH*.58);
      item.teams.slice(0,2).forEach((team,teamIndex)=>{const ty=y+topH+teamIndex*teamH,color=safeCanvasColor(team.color),logoSize=Math.min(compactCanvas?50:60,teamH-18),logoX=x+(compactCanvas?12:14),logoY=ty+(teamH-logoSize)/2,nameX=x+(compactCanvas?70:84),showScore=team.hasActualScore===true,scorePanelW=showScore?(compactCanvas?82:90):0,contentW=cardW-scorePanelW,scoreX=x+contentW+scorePanelW/2,textWidth=Math.max(80,x+contentW-(compactCanvas?12:14)-nameX),displayName=team.displayName||team.name;c.fillStyle=teamIndex?'#080808':'#0c0c0c';c.fillRect(x,ty,cardW,teamH);c.save();c.globalAlpha=.22;c.fillStyle=color;c.fillRect(x,ty,contentW,teamH);c.restore();if(showScore){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x+contentW,ty,scorePanelW,teamH)}c.fillStyle=color;c.fillRect(x,ty,7,teamH);const img=images[index*2+teamIndex];if(img)drawCanvasContain(c,img,logoX,logoY,logoSize,logoSize);c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';fitCanvasText(c,displayName,textWidth,compactCanvas?22:23,12,1000);c.fillText(displayName,nameX,ty+teamH*.48);c.fillStyle='#8b8b8b';fitCanvasText(c,team.meta,textWidth,compactCanvas?11:12,8,900);c.fillText(team.meta,nameX,ty+teamH*.73);if(showScore){c.textAlign='center';c.fillStyle='#777';c.font=`900 ${compactCanvas?8:9}px Arial,Helvetica,sans-serif`;c.fillText('SCORE',scoreX,ty+teamH*.34);c.fillStyle=team.winner?'#73D977':ORANGE;c.font=`1000 ${compactCanvas?32:34}px Arial,Helvetica,sans-serif`;c.fillText(team.score||'—',scoreX,ty+teamH*.69)}});
      const fy=y+cardH-footH;c.fillStyle='#111';c.fillRect(x,fy,cardW,footH);c.textAlign='center';c.textBaseline='middle';c.fillStyle=/RUS PICK:\s*W/i.test(item.pick)?'#73D977':/RUS PICK:\s*L/i.test(item.pick)?'#FF7B7B':'#aaa';fitCanvasText(c,item.pick||'RUS SCOREBOARD',cardW-24,13,8,900);c.fillText(item.pick||'RUS SCOREBOARD',x+cardW/2,fy+footH/2);c.restore()});
    c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#777';c.font=`900 ${compactCanvas?14:18}px Arial,Helvetica,sans-serif`;c.fillText('ruralutahsports.github.io',margin,height-(compactCanvas?14:20));c.textAlign='right';c.fillText(`${pageLabel?pageLabel+' • ':''}${limited.length} GAME${limited.length===1?'':'S'}`,width-margin,height-(compactCanvas?14:20));return canvas;
  }

  async function canvasFile(canvas,name){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));if(!blob)throw new Error('Could not encode scoreboard graphic.');return new File([blob],name,{type:'image/png'});
  }

  async function deliverFiles(files,title='Rural Utah Sports Scoreboard'){
    let canShareFiles=false;try{canShareFiles=!!(navigator.share&&navigator.canShare?.({files}))}catch{}if(canShareFiles){try{await navigator.share({files,title});return}catch(e){if(e?.name==='AbortError')return}}
    const urls=[];for(const file of files){const url=URL.createObjectURL(file),a=document.createElement('a');urls.push(url);a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();await sleep(140)}setTimeout(()=>urls.forEach(url=>URL.revokeObjectURL(url)),2500);
  }

  async function deliverCanvas(canvas,title='Rural Utah Sports Scoreboard',name=`rural-utah-sports-scoreboard-${Date.now()}.png`){
    await deliverFiles([await canvasFile(canvas,name)],title);
  }

  function chunks(items,size){const pages=[];for(let i=0;i<items.length;i+=size)pages.push(items.slice(i,i+size));return pages}

  async function createPagedGraphics(format,items,classValue='ALL',onProgress=()=>{}){
    const carousel=format==='carousel10',pageSize=carousel?CAROUSEL_GAMES:MAX_GAMES,pages=chunks(items,pageSize),stamp=Date.now(),files=[];
    for(let i=0;i<pages.length;i++){const pageItems=pages[i],columns=carousel?CAROUSEL_COLUMNS:GRID_COLUMNS,rows=carousel?CAROUSEL_ROWS:Math.ceil(pageItems.length/GRID_COLUMNS);onProgress(i+1,pages.length);const canvas=await buildScoreboardCanvas(pageItems,classValue,{columns,rows,width:carousel?1080:2160,height:carousel?1350:2700,page:i+1,totalPages:pages.length,pageWord:carousel?'SLIDE':'PAGE',descriptor:carousel?`SOCIAL CAROUSEL • 2 COLUMNS • 5 ROWS • ${pageItems.length} GAMES`:`FULL SCOREBOARD • 4 COLUMNS • ${rows} ROWS • ${pageItems.length} GAMES`}),kind=carousel?'social-carousel-slide':'full-scoreboard-page';files.push(await canvasFile(canvas,`rural-utah-sports-${kind}-${i+1}-of-${pages.length}-${stamp}.png`));canvas.width=1;canvas.height=1}
    await deliverFiles(files,carousel?'Rural Utah Sports Social Scoreboard Carousel':'Rural Utah Sports Full Weekly Scoreboard');
  }

  async function buildBoard(format,items,classValue='ALL'){
    const [w,h]=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const logos=await loadShareLogos();
    const board=document.createElement('div');board.className=`rus-sb-board ${format}`;board.style.width=`${w}px`;board.style.height=`${h}px`;
    const cols=format==='x'?Math.min(3,items.length):(format==='story'&&items.length<=3?1:Math.min(2,items.length));
    const rows=Math.ceil(items.length/Math.max(1,cols));
    if((format==='square'&&rows>=3)||(format==='x'&&rows>=3)||(format==='story'&&rows>=5))board.classList.add('dense');
    const grid=document.createElement('div');grid.className='rus-sb-grid';grid.style.gridTemplateColumns=`repeat(${Math.max(1,cols)},minmax(0,1fr))`;
    const available=format==='story'?1740:format==='x'?720:900;const rowH=Math.floor((available-Math.max(0,rows-1)*12)/Math.max(1,rows));grid.style.gridAutoRows=`${rowH}px`;
    items.forEach(item=>grid.appendChild(cloneGame(item,logos)));
    board.innerHTML=`<div class="rus-sb-topbar"></div><div class="rus-sb-head"><div class="rus-sb-title">${esc(titleFor(items,classValue))}</div><div class="rus-sb-brand">RURAL UTAH SPORTS</div></div>`;board.appendChild(grid);board.insertAdjacentHTML('beforeend','<div class="rus-sb-footer">ruralutahsports.github.io</div>');document.body.appendChild(board);return{board,w,h};
  }

  async function createGraphic(format,items,classValue='ALL',onProgress=()=>{}){
    if(format==='all-pages'||format==='carousel10'){await createPagedGraphics(format,items,classValue,onProgress);return}
    if(format==='grid32'){const canvas=await buildScoreboardCanvas(items.slice(0,MAX_GAMES),classValue,{columns:GRID_COLUMNS,rows:GRID_ROWS,descriptor:'4 COLUMNS • 8 ROWS • UP TO 32 GAMES'});await deliverCanvas(canvas,'Rural Utah Sports 32-Game Scoreboard',`rural-utah-sports-scoreboard-${Date.now()}.png`);return}
    await loadCanvas();const {board,w,h}=await buildBoard(format,items,classValue);
    try{
      await Promise.all([...board.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r})));
      await sleep(80);
      const canvas=await html2canvas(board,{backgroundColor:'#111111',scale:1,useCORS:true,allowTaint:false,logging:false,width:w,height:h,windowWidth:w,windowHeight:h});
      await deliverCanvas(canvas);
    }finally{board.remove()}
  }

  async function openModal(){
    addStyles();const games=await visibleGames();if(!games.length){alert('No visible games to share.');return}
    document.querySelectorAll('.rus-share-modal').forEach(x=>x.remove());
    const pageClass=document.getElementById('classFilter')?.value||'ALL';
    const modal=document.createElement('div');modal.className='rus-share-modal';modal.innerHTML=`
      <div class="rus-share-sheet">
        <h3>Share Scoreboard</h3>
        <p>Export every game currently shown. Current records, class rankings and State Top 25 numbers are included automatically.</p>
        <label class="rus-sb-filter-label">Classification</label>
        <select class="rus-sb-class-filter"><option value="ALL">All Classifications</option><option value="6A">6A</option><option value="5A">5A</option><option value="4A">4A</option><option value="3A">3A</option><option value="2A">2A</option><option value="1A">1A</option><option value="8P">8-Player</option></select>
        <div class="rus-sb-all-label">Export all games shown</div>
        <div class="rus-share-grid rus-sb-all-grid">
          <button class="rus-share-option rus-share-option-wide rus-share-option-primary" data-f="all-pages"><strong>All Games • Full Boards</strong>Up to 32 per page • 2160 × 2700 each</button>
          <button class="rus-share-option rus-share-option-wide" data-f="carousel10"><strong>All Games • Social Carousel</strong>10 games per slide • 2 × 5 • 1080 × 1350</button>
        </div>
        <details class="rus-sb-custom-options">
          <summary>Custom / Selected Games</summary>
          <div class="rus-sb-custom-body">
            <div class="rus-sb-picker-actions"><button type="button" class="rus-sb-select-eight">First 8</button><button type="button" class="rus-sb-select">First 32</button><button type="button" class="rus-sb-clear">Clear</button></div>
            <div class="rus-sb-count">0 of 32 selected</div>
            <div class="rus-sb-list">${games.map((g,i)=>`<label class="rus-sb-choice" data-away-class="${esc(g.awayClass)}" data-home-class="${esc(g.homeClass)}"><input type="checkbox" value="${i}"><span><span class="rus-sb-matchup">${esc(g.away)} at ${esc(g.home)}</span><small>${esc(g.date)} <span class="rus-sb-class-chip">${esc(g.awayClass||'?')} vs ${esc(g.homeClass||'?')}</span></small></span><span class="rus-sb-choice-status">${esc(g.status)}</span></label>`).join('')}<div class="rus-sb-no-games">No games involving that classification are currently shown on the scoreboard.</div></div>
            <div class="rus-share-grid"><button class="rus-share-option rus-share-option-wide" data-f="grid32"><strong>Selected 32-Game Scoreboard</strong>4 columns × 8 rows • 2160 × 2700</button><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div>
          </div>
        </details>
        <button class="rus-share-close">Cancel</button>
      </div>`;document.body.appendChild(modal);
    const boxes=[...modal.querySelectorAll('.rus-sb-choice input')],choices=[...modal.querySelectorAll('.rus-sb-choice')],count=modal.querySelector('.rus-sb-count'),classFilter=modal.querySelector('.rus-sb-class-filter'),empty=modal.querySelector('.rus-sb-no-games');
    if([...classFilter.options].some(o=>o.value===pageClass))classFilter.value=pageClass;
    const shownBoxes=()=>choices.filter(c=>c.style.display!=='none').map(c=>c.querySelector('input'));
    const sync=()=>{let checked=boxes.filter(b=>b.checked);if(checked.length>MAX_GAMES){checked.at(-1).checked=false;checked=boxes.filter(b=>b.checked)}const shown=shownBoxes().length;count.textContent=`${checked.length} of ${MAX_GAMES} selected • ${shown} game${shown===1?'':'s'} shown`};
    const applyClass=()=>{const value=classFilter.value;let shown=0;choices.forEach(choice=>{const match=value==='ALL'||choice.dataset.awayClass===value||choice.dataset.homeClass===value;choice.style.display=match?'':'none';const box=choice.querySelector('input');if(!match)box.checked=false;if(match)shown++});empty.style.display=shown?'none':'block';sync()};
    boxes.forEach(b=>b.addEventListener('change',sync));classFilter.addEventListener('change',applyClass);
    const selectFirst=limit=>{const visible=shownBoxes();boxes.forEach(b=>b.checked=false);visible.slice(0,limit).forEach(b=>b.checked=true);sync()};modal.querySelector('.rus-sb-select-eight').onclick=()=>selectFirst(COMPACT_FORMAT_LIMIT);modal.querySelector('.rus-sb-select').onclick=()=>selectFirst(MAX_GAMES);modal.querySelector('.rus-sb-clear').onclick=()=>{boxes.forEach(b=>b.checked=false);sync()};
    applyClass();shownBoxes().slice(0,MAX_GAMES).forEach(b=>b.checked=true);sync();
    modal.querySelector('.rus-share-close').onclick=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    modal.querySelectorAll('[data-f]').forEach(btn=>btn.onclick=async()=>{const format=btn.dataset.f,paged=format==='all-pages'||format==='carousel10',source=(paged?shownBoxes():boxes.filter(b=>b.checked)).map(b=>games[Number(b.value)]).filter(Boolean);if(!source.length){alert(paged?'No games are shown for this classification.':'Select at least one game.');return}if(!paged&&format!=='grid32'&&source.length>COMPACT_FORMAT_LIMIT){alert('Instagram and X single-image formats support up to 8 games. Select 8 or fewer, or use an All Games option.');return}const old=btn.innerHTML;btn.disabled=true;btn.textContent='Creating…';try{await createGraphic(format,source,classFilter.value,(current,total)=>{btn.textContent=`Creating ${current} of ${total}…`});modal.remove()}catch(e){console.error(e);btn.disabled=false;btn.innerHTML=old;alert('Could not create the scoreboard graphic. Please try again.')}});
  }

  window.RUSScoreboardShare={openModal};
  function init(){addStyles();const replace=()=>{document.querySelectorAll('.rus-share-float').forEach(b=>b.remove());const button=document.getElementById('shareScoreboardGrid');if(!button)return false;button.onclick=openModal;return true};if(!replace()){let n=0;const t=setInterval(()=>{if(replace()||++n>40)clearInterval(t)},100)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
