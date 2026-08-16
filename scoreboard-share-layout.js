(()=>{
  if(!location.pathname.toLowerCase().includes('scoreboard'))return;
  const ORANGE='#F14D07';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const loadCanvas=()=>window.html2canvas?Promise.resolve():new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});

  function visibleGames(){
    return [...document.querySelectorAll('#board .game')].map((el,index)=>{
      const teams=[...el.querySelectorAll('.team-name')].map(x=>x.textContent.trim()).filter(Boolean);
      const date=el.closest('.date-section')?.querySelector('.date-head h2')?.textContent?.trim()||'';
      const status=el.querySelector('.status')?.textContent?.trim()||'';
      return {el,index,date,away:teams[0]||'Away',home:teams[1]||'Home',status};
    });
  }

  function addStyles(){
    document.getElementById('rus-scoreboard-share-css')?.remove();
    const style=document.createElement('style');style.id='rus-scoreboard-share-css';style.textContent=`
      .rus-sb-picker-actions{display:flex;gap:8px;margin:0 0 10px}.rus-sb-picker-actions button{flex:1;border:1px solid #444;background:#1d1d1d;color:#fff;border-radius:7px;padding:9px 8px;font-weight:900;font-size:11px}.rus-sb-count{font-size:11px;color:#aaa;font-weight:900;margin:0 0 8px}.rus-sb-list{max-height:320px;overflow:auto;border:1px solid #333;border-radius:8px;background:#090909;margin-bottom:12px}.rus-sb-choice{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px;border-bottom:1px solid #242424;cursor:pointer}.rus-sb-choice:last-child{border-bottom:0}.rus-sb-choice input{width:18px;height:18px}.rus-sb-matchup{font-size:12px;font-weight:1000}.rus-sb-choice small{display:block;color:#777;font-size:9px;margin-top:3px}.rus-sb-choice-status{font-size:9px;font-weight:1000;color:#F14D07;text-transform:uppercase}
      .rus-sb-board{position:fixed;left:-12000px;top:0;box-sizing:border-box;background:#111;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;overflow:hidden}.rus-sb-topbar{height:12px;background:${ORANGE};flex:0 0 12px}.rus-sb-head{padding:18px 30px 10px;flex:0 0 auto}.rus-sb-title{font-size:38px;line-height:1;font-weight:1000}.rus-sb-brand{color:${ORANGE};font-size:19px;font-weight:1000;margin-top:9px}.rus-sb-grid{display:grid;gap:12px;padding:8px 30px 10px;flex:1;min-height:0;align-content:start;overflow:hidden}.rus-sb-footer{padding:5px 30px 17px;color:#888;font-size:14px;font-weight:900;flex:0 0 auto}
      .rus-sb-card{position:relative;min-height:0;background:#000;border:1px solid #333;border-radius:9px;overflow:hidden;display:flex;flex-direction:column}.rus-sb-card .game-top{padding:7px 10px;min-height:34px}.rus-sb-card .team-row{padding:8px 10px;gap:8px;min-height:0;flex:1}.rus-sb-card .team-logo{width:34px;height:34px;flex-basis:34px}.rus-sb-card .team-name{font-size:12px;padding:4px 6px}.rus-sb-card .team-meta{font-size:8px}.rus-sb-card .scores{gap:8px}.rus-sb-card .pred{font-size:8px}.rus-sb-card .pred b{font-size:12px}.rus-sb-card .actual{font-size:8px}.rus-sb-card .actual b{font-size:23px}.rus-sb-card .game-foot{padding:6px 9px;font-size:8px;min-height:27px}.rus-sb-card .deseret-link,.rus-sb-card .game-details{display:none!important}.rus-sb-date{position:absolute;right:9px;top:39px;z-index:4;color:#999;font-size:7px;font-weight:900;text-transform:uppercase;pointer-events:none}
      .rus-sb-board.dense .rus-sb-card .game-top{padding:5px 8px;min-height:29px}.rus-sb-board.dense .rus-sb-card .team-row{padding:5px 8px}.rus-sb-board.dense .rus-sb-card .team-logo{width:28px;height:28px;flex-basis:28px}.rus-sb-board.dense .rus-sb-card .team-name{font-size:10px;padding:3px 5px}.rus-sb-board.dense .rus-sb-card .team-meta{font-size:7px}.rus-sb-board.dense .rus-sb-card .actual b{font-size:19px}.rus-sb-board.dense .rus-sb-card .pred b{font-size:10px}.rus-sb-board.dense .rus-sb-card .game-foot{padding:4px 7px;font-size:7px;min-height:22px}.rus-sb-board.dense .rus-sb-date{top:33px;font-size:6px}
      .rus-sb-board.x .rus-sb-title{font-size:34px}.rus-sb-board.x .rus-sb-head{padding-top:14px}.rus-sb-board.x .rus-sb-card .team-row{padding:5px 8px}.rus-sb-board.x .rus-sb-card .game-foot{padding:4px 7px}
    `;document.head.appendChild(style);
  }

  function cloneGame(item){
    const clone=item.el.cloneNode(true);clone.classList.add('rus-sb-card');clone.querySelectorAll('.game-details,.deseret-link').forEach(x=>x.remove());
    const foot=clone.querySelector('.game-foot');if(foot&&!foot.textContent.trim())foot.remove();
    clone.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.removeAttribute('target');a.style.pointerEvents='none'});
    const date=document.createElement('div');date.className='rus-sb-date';date.textContent=item.date;clone.appendChild(date);
    return clone;
  }

  function titleFor(items){
    const dates=[...new Set(items.map(x=>x.date).filter(Boolean))];
    return dates.length===1?`${dates[0]} • Scoreboard`:`Weekly Scoreboard • ${items.length} Games`;
  }

  async function buildBoard(format,items){
    const [w,h]=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const board=document.createElement('div');board.className=`rus-sb-board ${format}`;board.style.width=`${w}px`;board.style.height=`${h}px`;
    const cols=format==='x'?Math.min(3,items.length):(format==='story'&&items.length<=3?1:Math.min(2,items.length));
    const rows=Math.ceil(items.length/Math.max(1,cols));
    if((format==='square'&&rows>=3)||(format==='x'&&rows>=3)||(format==='story'&&rows>=5))board.classList.add('dense');
    const grid=document.createElement('div');grid.className='rus-sb-grid';grid.style.gridTemplateColumns=`repeat(${Math.max(1,cols)},minmax(0,1fr))`;
    const available=format==='story'?1740:format==='x'?720:900;const rowH=Math.floor((available-Math.max(0,rows-1)*12)/Math.max(1,rows));grid.style.gridAutoRows=`${rowH}px`;
    items.forEach(item=>grid.appendChild(cloneGame(item)));
    board.innerHTML=`<div class="rus-sb-topbar"></div><div class="rus-sb-head"><div class="rus-sb-title">${esc(titleFor(items))}</div><div class="rus-sb-brand">RURAL UTAH SPORTS</div></div>`;board.appendChild(grid);board.insertAdjacentHTML('beforeend','<div class="rus-sb-footer">ruralutahsports.github.io</div>');document.body.appendChild(board);return{board,w,h};
  }

  async function createGraphic(format,items){
    await loadCanvas();const {board,w,h}=await buildBoard(format,items);
    try{
      await Promise.all([...board.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r})));
      await sleep(60);
      const canvas=await html2canvas(board,{backgroundColor:'#111111',scale:1,useCORS:true,allowTaint:false,logging:false,width:w,height:h,windowWidth:w,windowHeight:h});
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png',1));const file=new File([blob],`rural-utah-sports-scoreboard-${Date.now()}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Rural Utah Sports Scoreboard'});return}catch(e){if(e?.name==='AbortError')return}}
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    }finally{board.remove()}
  }

  async function openModal(){
    addStyles();const games=visibleGames();if(!games.length){alert('No visible games to share.');return}
    document.querySelectorAll('.rus-share-modal').forEach(x=>x.remove());
    const modal=document.createElement('div');modal.className='rus-share-modal';modal.innerHTML=`<div class="rus-share-sheet"><h3>Share Scoreboard</h3><p>Select 1–8 games from the scoreboard currently on screen. Your classification, status and team-search filters are respected.</p><div class="rus-sb-picker-actions"><button type="button" class="rus-sb-select">Select first 8 visible</button><button type="button" class="rus-sb-clear">Clear</button></div><div class="rus-sb-count">0 of 8 selected</div><div class="rus-sb-list">${games.map((g,i)=>`<label class="rus-sb-choice"><input type="checkbox" value="${i}"><span><span class="rus-sb-matchup">${esc(g.away)} at ${esc(g.home)}</span><small>${esc(g.date)}</small></span><span class="rus-sb-choice-status">${esc(g.status)}</span></label>`).join('')}</div><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;document.body.appendChild(modal);
    const boxes=[...modal.querySelectorAll('.rus-sb-choice input')],count=modal.querySelector('.rus-sb-count');
    const sync=()=>{let checked=boxes.filter(b=>b.checked);if(checked.length>8){checked.at(-1).checked=false;checked=boxes.filter(b=>b.checked)}count.textContent=`${checked.length} of 8 selected`};boxes.forEach(b=>b.addEventListener('change',sync));
    modal.querySelector('.rus-sb-select').onclick=()=>{boxes.forEach((b,i)=>b.checked=i<8);sync()};modal.querySelector('.rus-sb-clear').onclick=()=>{boxes.forEach(b=>b.checked=false);sync()};
    const nearest=games.map((g,i)=>({i,d:Math.abs(g.el.getBoundingClientRect().top-innerHeight*.45)})).sort((a,b)=>a.d-b.d)[0]?.i??0;boxes[nearest].checked=true;sync();
    modal.querySelector('.rus-share-close').onclick=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    modal.querySelectorAll('[data-f]').forEach(btn=>btn.onclick=async()=>{const selected=boxes.filter(b=>b.checked).map(b=>games[Number(b.value)]).filter(Boolean);if(!selected.length){alert('Select at least one game.');return}const old=btn.innerHTML;btn.disabled=true;btn.textContent='Creating…';try{await createGraphic(btn.dataset.f,selected);modal.remove()}catch(e){console.error(e);btn.disabled=false;btn.innerHTML=old;alert('Could not create the scoreboard graphic. Please try again.')}});
  }

  window.RUSScoreboardShare={openModal};
  function init(){addStyles();const replace=()=>{const b=document.querySelector('.rus-share-float');if(!b)return false;b.onclick=openModal;return true};if(!replace()){let n=0;const t=setInterval(()=>{if(replace()||++n>40)clearInterval(t)},100)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();