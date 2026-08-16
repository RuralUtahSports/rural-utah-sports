(()=>{
  if(!location.pathname.toLowerCase().includes('standings'))return;
  const ORANGE='#F14D07';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  let logosPromise=null;
  const loadLogos=()=>logosPromise||(logosPromise=(async()=>{
    const logos=await fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    try{
      const current=logos.RICH||window.RUSSchoolAssets?.logoUrl?.('RICH')||'';
      if(/rich-user\.svg/i.test(current)||!current){
        const svg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        const embedded=svg.match(/href=[\"'](data:image[^\"']+)[\"']/i)?.[1]||'';
        if(embedded)logos.RICH=embedded;
      }
    }catch{}
    return logos;
  })());
  let directoryPromise=null;
  const loadDirectory=()=>directoryPromise||(directoryPromise=fetch(`school-directory.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({})));
  const displayTeamName=(team,directory)=>directory?.[norm(team)]?.name||({'MONUMENT VAL':'Monument Valley'}[norm(team)])||team;
  function contrastColor(value){
    const m=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m)return '#fff';
    const r=+m[1],g=+m[2],b=+m[3];
    return (r*299+g*587+b*114)/1000>155?'#000':'#fff';
  }
  const loadCanvas=()=>window.html2canvas?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function teamFromRow(row){
    const a=row.querySelector('.team-link');
    if(a){try{const t=new URL(a.href,location.href).searchParams.get('team');if(t)return t.trim()}catch{}}
    return (a?.textContent||row.querySelector('.team-cell')?.textContent||'').trim();
  }
  function logoFor(team,logos){return logos[norm(team)]||window.RUSSchoolAssets?.logoUrl?.(team)||''}
  function readGroups(){
    return [...document.querySelectorAll('#content .group')].map(group=>{
      const title=(group.querySelector('.group-title')?.textContent||'Region').trim();
      const rows=[...group.querySelectorAll('tbody tr')].map(tr=>{
        const td=[...tr.querySelectorAll('td')];
        const team=teamFromRow(tr);
        return {
          rank:(td[0]?.textContent||'').trim(),team,
          region:(td[2]?.textContent||'').trim(),pct:(td[3]?.textContent||'').trim(),overall:(td[4]?.textContent||'').trim(),
          pf:(td[5]?.textContent||'').trim(),pa:(td[6]?.textContent||'').trim(),diff:(td[7]?.textContent||'').trim(),streak:(td[8]?.textContent||'').trim(),
          swatch:getComputedStyle(tr.querySelector('.swatch')||tr).backgroundColor||'#555'
        };
      });
      return {title,rows};
    }).filter(g=>g.rows.length);
  }
  async function ensureRegionView(filterValue='all'){
    const regionBtn=document.getElementById('regionBtn');
    if(regionBtn&&!regionBtn.classList.contains('active')){regionBtn.click();await sleep(100)}
    const filter=document.getElementById('filter');
    if(filter&&filter.value!==filterValue){filter.value=filterValue;filter.dispatchEvent(new Event('change',{bubbles:true}));await sleep(110)}
  }

  function css(){
    if(document.getElementById('rus-standings-share-v2-css'))return;
    const s=document.createElement('style');s.id='rus-standings-share-v2-css';s.textContent=`
    .rus-standings-share-board{position:fixed;left:-12000px;top:0;background:#111;color:#fff;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}
    .rus-standings-share-topbar{height:12px;background:${ORANGE};flex:0 0 12px}.rus-standings-share-head{padding:16px 28px 10px;flex:0 0 auto}.rus-standings-share-title{font-size:38px;line-height:1;font-weight:1000}.rus-standings-share-brand{color:${ORANGE};font-size:19px;font-weight:1000;margin-top:9px}.rus-standings-share-grid{display:grid;gap:12px;padding:8px 28px 10px;flex:1;min-height:0;align-content:start;grid-auto-rows:max-content}.rus-standings-region-card{background:#080808;border:1px solid #333;border-radius:10px;overflow:hidden;align-self:start}.rus-standings-region-title{border-left:6px solid ${ORANGE};padding:8px 11px;background:#171717;font-size:17px;font-weight:1000;text-transform:uppercase;flex:0 0 auto}.rus-standings-share-table{width:100%;border-collapse:collapse;table-layout:fixed}.rus-standings-share-table th{background:${ORANGE};color:#000;padding:6px 3px;font-size:8px;font-weight:1000;text-transform:uppercase;white-space:nowrap}.rus-standings-share-table td{border-bottom:1px solid #252525;padding:4px 3px;font-size:10px;height:var(--rus-row-h,auto);font-weight:800;text-align:center;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rus-standings-share-table tr:last-child td{border-bottom:0}.rus-standings-share-table .c-rank{width:5%}.rus-standings-share-table .c-team{width:36%;text-align:left}.rus-standings-share-table .c-rec{width:10%}.rus-standings-share-table .c-pct{width:9%}.rus-standings-share-table .c-pf,.rus-standings-share-table .c-pa{width:7%}.rus-standings-share-table .c-diff{width:8%}.rus-standings-share-table .c-streak{width:8%}.rus-share-team-cell{display:flex;align-items:center;gap:6px;min-width:0}.rus-share-team-logo{width:34px;height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center}.rus-share-team-logo img{max-width:34px;max-height:34px;width:auto;height:auto;object-fit:contain}.rus-share-team-name{display:inline-block;max-width:100%;font-size:10px;font-weight:1000;line-height:1.05;white-space:normal;overflow:visible;text-overflow:clip;padding:4px 6px;border-radius:5px;text-align:left}.rus-share-diff-pos{color:#67df91}.rus-share-diff-neg{color:#ff7777}.rus-share-streak-w{color:#67df91}.rus-share-streak-l{color:#ff7777}.rus-standings-share-footer{padding:5px 28px 17px;color:#888;font-size:14px;font-weight:900;flex:0 0 auto}
    .rus-standings-share-board.story .rus-standings-share-grid{grid-template-columns:1fr!important}.rus-standings-share-board.story .rus-standings-region-title{font-size:19px}.rus-standings-share-board.story .rus-standings-share-table td{font-size:10px;padding:6px 4px}.rus-standings-share-board.story .rus-standings-share-table th{font-size:8px;padding:6px 4px}.rus-standings-share-board.story .rus-share-team-name{font-size:11px;padding:5px 7px}.rus-standings-share-board.story .rus-share-team-logo,.rus-standings-share-board.story .rus-share-team-logo img{width:34px;height:34px;max-width:34px;max-height:34px}
    .rus-standings-share-board.x .rus-standings-region-title{font-size:15px;padding:6px 9px}.rus-standings-share-board.x .rus-standings-share-table td{font-size:7px;padding:3px 2px}.rus-standings-share-board.x .rus-standings-share-table th{font-size:6px;padding:4px 2px}.rus-standings-share-board.x .rus-share-team-name{font-size:8px;padding:3px 5px}.rus-standings-share-board.x .rus-share-team-logo,.rus-standings-share-board.x .rus-share-team-logo img{width:24px;height:24px;max-width:24px;max-height:24px}
    `;document.head.appendChild(s);
  }

  function regionCard(group,logos,directory){
    const card=document.createElement('section');card.className='rus-standings-region-card';
    const rows=group.rows.map(r=>{
      const logo=logoFor(r.team,logos);
      const dnum=parseInt(String(r.diff).replace(/[^-\d]/g,''),10)||0;
      const streak=String(r.streak||'');
      const fullName=displayTeamName(r.team,directory);
      const teamColor=r.swatch||'#333';
      const teamText=contrastColor(teamColor);
      return `<tr style="box-shadow:inset 4px 0 0 ${esc(teamColor)}"><td class="c-rank">${esc(r.rank)}</td><td class="c-team"><div class="rus-share-team-cell"><span class="rus-share-team-logo">${logo?`<img src="${esc(logo)}" alt="">`:''}</span><span class="rus-share-team-name" style="background:${esc(teamColor)};color:${teamText}">${esc(fullName)}</span></div></td><td class="c-rec">${esc(r.region)}</td><td class="c-pct">${esc(r.pct)}</td><td class="c-rec">${esc(r.overall)}</td><td class="c-pf">${esc(r.pf)}</td><td class="c-pa">${esc(r.pa)}</td><td class="c-diff ${dnum>0?'rus-share-diff-pos':dnum<0?'rus-share-diff-neg':''}">${esc(r.diff)}</td><td class="c-streak ${streak.startsWith('W')?'rus-share-streak-w':streak.startsWith('L')?'rus-share-streak-l':''}">${esc(r.streak)}</td></tr>`;
    }).join('');
    card.innerHTML=`<div class="rus-standings-region-title">${esc(group.title)}</div><table class="rus-standings-share-table"><thead><tr><th>#</th><th>Team</th><th>Reg</th><th>Win%</th><th>Overall</th><th>PF</th><th>PA</th><th>Diff</th><th>Streak</th></tr></thead><tbody>${rows}</tbody></table>`;
    return card;
  }

  async function buildBoard(format,label,groups){
    const dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080], [w,h]=dims;
    const [logos,directory]=await Promise.all([loadLogos(),loadDirectory()]);
    const board=document.createElement('div');board.className=`rus-standings-share-board ${format}`;board.style.width=`${w}px`;board.style.height=`${h}px`;
    const grid=document.createElement('div');grid.className='rus-standings-share-grid';
    const cols=format==='story'?1:format==='x'?Math.min(3,groups.length):Math.min(2,groups.length);
    grid.style.gridTemplateColumns=`repeat(${Math.max(1,cols)},minmax(0,1fr))`;
    const maxRows=Math.max(1,...groups.map(g=>g.rows.length));
    const rowH=format==='square'?Math.max(48,Math.min(112,Math.floor(760/maxRows))):format==='x'?Math.max(34,Math.min(76,Math.floor(590/maxRows))):Math.max(46,Math.min(86,Math.floor(1450/maxRows)));
    board.style.setProperty('--rus-row-h',`${rowH}px`);
    groups.forEach((g,i)=>{const card=regionCard(g,logos,directory);if(cols===2&&groups.length%2===1&&i===groups.length-1)card.style.gridColumn='1 / -1';grid.appendChild(card)});
    board.innerHTML=`<div class="rus-standings-share-topbar"></div><div class="rus-standings-share-head"><div class="rus-standings-share-title">${esc(label)}</div><div class="rus-standings-share-brand">RURAL UTAH SPORTS</div></div>`;
    board.appendChild(grid);board.insertAdjacentHTML('beforeend','<div class="rus-standings-share-footer">ruralutahsports.github.io</div>');document.body.appendChild(board);
    return {board,w,h};
  }
  async function createGraphic(format,label,groups){
    await loadCanvas();const {board,w,h}=await buildBoard(format,label,groups);
    try{
      await Promise.all([...board.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r})));
      const canvas=await html2canvas(board,{backgroundColor:'#111111',scale:1,useCORS:true,allowTaint:false,logging:false,width:w,height:h,windowWidth:w,windowHeight:h});
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png',1));
      const file=new File([blob],`rural-utah-sports-standings-${Date.now()}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:label});return}catch(e){if(e?.name==='AbortError')return}}
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    }finally{board.remove()}
  }

  async function openModal(){
    await ensureRegionView('all');
    const filter=document.getElementById('filter');
    const classes=filter?[...filter.options].filter(o=>o.value&&o.value!=='all').map(o=>({value:o.value,label:o.textContent.trim()})):[];
    const allGroups=readGroups();
    const modal=document.createElement('div');modal.className='rus-share-modal';modal.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>Choose a single region or a whole classification. Whole-classification graphics use a compact region-by-region layout with school logos and all key standings columns.</p><label class="rus-share-region-label">Share View</label><select class="rus-share-region rus-share-v2-scope"><option value="region">Single Region</option><option value="classification">Whole Classification — Region by Region</option></select><div class="rus-share-v2-region"><label class="rus-share-region-label">Region</label><select class="rus-share-region rus-share-v2-region-select">${allGroups.map((g,i)=>`<option value="${i}">${esc(g.title)}</option>`).join('')}</select></div><div class="rus-share-v2-class" style="display:none"><label class="rus-share-region-label">Classification</label><select class="rus-share-region rus-share-v2-class-select">${classes.map(c=>`<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select></div><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(modal);
    const scope=modal.querySelector('.rus-share-v2-scope');
    const sync=()=>{const whole=scope.value==='classification';modal.querySelector('.rus-share-v2-region').style.display=whole?'none':'';modal.querySelector('.rus-share-v2-class').style.display=whole?'':'none'};scope.addEventListener('change',sync);sync();
    modal.querySelector('.rus-share-close').onclick=()=>modal.remove();modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    modal.querySelectorAll('[data-f]').forEach(btn=>btn.onclick=async()=>{const original=btn.innerHTML;btn.disabled=true;btn.textContent='Creating…';try{
      let groups,label;if(scope.value==='classification'){
        const sel=modal.querySelector('.rus-share-v2-class-select'),value=sel.value,text=sel.selectedOptions?.[0]?.textContent?.trim()||value;
        await ensureRegionView(value);groups=readGroups().filter(g=>!/INDEPEND/i.test(g.title));label=`${text} Standings • Region by Region`;
      }else{
        await ensureRegionView('all');const groupsNow=readGroups(),idx=Number(modal.querySelector('.rus-share-v2-region-select').value||0);groups=[groupsNow[idx]].filter(Boolean);label=groups[0]?.title||'Region Standings';
      }
      if(!groups?.length)throw new Error('No standings groups found');await createGraphic(btn.dataset.f,label,groups);modal.remove();
    }catch(e){console.error(e);btn.disabled=false;btn.innerHTML=original;alert('Could not create the standings graphic. Please try again.')}});
  }

  function init(){css();const replace=()=>{const b=document.querySelector('.rus-share-float');if(!b)return false;b.onclick=openModal;b.textContent='Share Graphic';return true};if(!replace()){let tries=0;const t=setInterval(()=>{if(replace()||++tries>40)clearInterval(t)},100)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
