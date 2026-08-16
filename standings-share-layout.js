(()=>{
  if(!location.pathname.toLowerCase().includes('standings'))return;

  const ORANGE='#F14D07';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  let logosPromise=null;
  async function loadLogos(){
    if(logosPromise)return logosPromise;
    logosPromise=(async()=>{
      const logos=await fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
      try{
        const current=logos.RICH||window.RUSSchoolAssets?.logoUrl?.('RICH')||'';
        if(/rich-user\.svg/i.test(current)||!current){
          const svg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
          const embedded=svg.match(/href=["'](data:image[^"']+)["']/i)?.[1]||'';
          if(embedded)logos.RICH=embedded;
        }
      }catch{}
      return logos;
    })();
    return logosPromise;
  }

  let directoryPromise=null;
  function loadDirectory(){
    if(directoryPromise)return directoryPromise;
    directoryPromise=fetch(`school-directory.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    return directoryPromise;
  }

  function displayTeamName(team,directory){
    const key=norm(team);
    const aliases={
      'MONUMENT VAL':'Monument Valley',
      'ALA':'American Leadership Academy',
      'UMA-LEHI':'Utah Military Academy - Camp Williams',
      'UMA-HILLFIELD':'Utah Military Academy - Hill Field'
    };
    return directory?.[key]?.name||aliases[key]||team;
  }

  function niceGroupTitle(title){
    const t=String(title||'').trim();
    return t.replace(/^(\dA)\s*•\s*(\d+)$/i,'$1 • Region $2').replace(/^8P\s*•\s*8P$/i,'8-Player');
  }

  function teamFromRow(row){
    const link=row.querySelector('.team-link');
    if(link){
      try{
        const team=new URL(link.href,location.href).searchParams.get('team');
        if(team)return team.trim();
      }catch{}
    }
    return (link?.textContent||row.querySelector('.team-cell')?.textContent||'').trim();
  }

  function readGroups(){
    return [...document.querySelectorAll('#content .group')].map(group=>{
      const title=niceGroupTitle(group.querySelector('.group-title')?.textContent||'Region');
      const rows=[...group.querySelectorAll('tbody tr')].map(tr=>{
        const td=[...tr.querySelectorAll('td')];
        const swatch=tr.querySelector('.swatch');
        return {
          rank:(td[0]?.textContent||'').trim(),
          team:teamFromRow(tr),
          region:(td[2]?.textContent||'').trim(),
          pct:(td[3]?.textContent||'').trim(),
          overall:(td[4]?.textContent||'').trim(),
          pf:(td[5]?.textContent||'').trim(),
          pa:(td[6]?.textContent||'').trim(),
          diff:(td[7]?.textContent||'').trim(),
          streak:(td[8]?.textContent||'').trim(),
          color:swatch?getComputedStyle(swatch).backgroundColor:'#555'
        };
      });
      return {title,rows};
    }).filter(g=>g.rows.length);
  }

  function logoFor(team,logos){
    return logos[norm(team)]||window.RUSSchoolAssets?.logoUrl?.(team)||'';
  }

  async function ensureRegionView(filterValue='all'){
    const regionBtn=document.getElementById('regionBtn');
    if(regionBtn&&!regionBtn.classList.contains('active')){
      regionBtn.click();
      await sleep(90);
    }
    const filter=document.getElementById('filter');
    if(filter&&filter.value!==filterValue){
      filter.value=filterValue;
      filter.dispatchEvent(new Event('change',{bubbles:true}));
      await sleep(110);
    }
  }

  function loadCanvas(){
    if(window.html2canvas)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload=resolve;
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  function addStyles(){
    document.getElementById('rus-standings-share-v3-css')?.remove();
    const style=document.createElement('style');
    style.id='rus-standings-share-v3-css';
    style.textContent=`
      .rus-standings-share-board{position:fixed;left:-12000px;top:0;box-sizing:border-box;background:#111;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;overflow:hidden}
      .rus-ss-topbar{height:12px;background:${ORANGE};flex:0 0 12px}
      .rus-ss-head{padding:16px 28px 10px;flex:0 0 auto}
      .rus-ss-title{font-size:38px;line-height:1;font-weight:1000}
      .rus-ss-brand{color:${ORANGE};font-size:19px;font-weight:1000;margin-top:9px}
      .rus-ss-grid{display:grid;gap:12px;padding:8px 28px 8px;flex:1;min-height:0;align-content:start;grid-auto-rows:max-content;overflow:hidden}
      .rus-ss-card{background:#080808;border:1px solid #333;border-radius:10px;overflow:hidden;align-self:start}
      .rus-ss-region{border-left:6px solid ${ORANGE};padding:8px 11px;background:#171717;font-size:17px;font-weight:1000;text-transform:uppercase}
      .rus-ss-table{width:100%;border-collapse:collapse;table-layout:fixed}
      .rus-ss-table th{background:${ORANGE};color:#000;padding:6px 2px;font-size:8px;font-weight:1000;text-transform:uppercase;white-space:nowrap}
      .rus-ss-table td{border-bottom:1px solid #252525;padding:3px 2px;height:var(--rus-row-h,48px);font-size:9px;font-weight:800;text-align:center;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#080808}
      .rus-ss-table tr:last-child td{border-bottom:0}
      .rus-ss-table .c-rank{width:5%}
      .rus-ss-table .c-team{width:40%;text-align:left;white-space:normal;padding-left:5px}
      .rus-ss-table .c-reg{width:9%}
      .rus-ss-table .c-pct{width:8%}
      .rus-ss-table .c-overall{width:9%}
      .rus-ss-table .c-pf,.rus-ss-table .c-pa{width:6%}
      .rus-ss-table .c-diff{width:7%}
      .rus-ss-table .c-streak{width:7%}
      .rus-ss-team{display:flex;align-items:center;gap:7px;min-width:0;width:100%}
      .rus-ss-logo{width:32px;height:32px;flex:0 0 32px;display:flex;align-items:center;justify-content:center}
      .rus-ss-logo img{display:block;max-width:32px;max-height:32px;width:auto;height:auto;object-fit:contain;object-position:center}
      .rus-ss-name{display:block;flex:1;min-width:0;font-size:10px;font-weight:1000;line-height:1.1;color:#fff;white-space:normal;overflow:visible;text-overflow:clip;text-align:left;padding:2px 0;border-bottom:3px solid var(--team-color,#555)}
      .rus-ss-pos{color:#67df91}.rus-ss-neg{color:#ff7777}.rus-ss-win{color:#67df91}.rus-ss-loss{color:#ff7777}
      .rus-ss-footer{padding:5px 28px 17px;color:#888;font-size:14px;font-weight:900;flex:0 0 auto}
      .rus-standings-share-board.story .rus-ss-grid{grid-template-columns:1fr!important}
      .rus-standings-share-board.story .rus-ss-region{font-size:19px}
      .rus-standings-share-board.story .rus-ss-table td{font-size:10px;padding:5px 3px}
      .rus-standings-share-board.story .rus-ss-table th{font-size:8px;padding:6px 3px}
      .rus-standings-share-board.story .rus-ss-name{font-size:12px}
      .rus-standings-share-board.story .rus-ss-logo,.rus-standings-share-board.story .rus-ss-logo img{width:36px;height:36px;max-width:36px;max-height:36px}
      .rus-standings-share-board.x .rus-ss-region{font-size:15px;padding:6px 9px}
      .rus-standings-share-board.x .rus-ss-table td{font-size:7px;padding:2px 1px}
      .rus-standings-share-board.x .rus-ss-table th{font-size:6px;padding:4px 1px}
      .rus-standings-share-board.x .rus-ss-name{font-size:8px}
      .rus-standings-share-board.x .rus-ss-logo,.rus-standings-share-board.x .rus-ss-logo img{width:24px;height:24px;max-width:24px;max-height:24px}
    `;
    document.head.appendChild(style);
  }

  function regionCard(group,logos,directory){
    const card=document.createElement('section');
    card.className='rus-ss-card';
    const body=group.rows.map(r=>{
      const logo=logoFor(r.team,logos);
      const fullName=displayTeamName(r.team,directory);
      const diffNum=parseInt(String(r.diff).replace(/[^-\d]/g,''),10)||0;
      const streak=String(r.streak||'');
      const color=r.color||'#555';
      return `<tr>
        <td class="c-rank">${esc(r.rank)}</td>
        <td class="c-team" style="border-left:6px solid ${esc(color)}"><div class="rus-ss-team"><span class="rus-ss-logo">${logo?`<img src="${esc(logo)}" alt="">`:''}</span><span class="rus-ss-name" style="--team-color:${esc(color)}">${esc(fullName)}</span></div></td>
        <td class="c-reg">${esc(r.region)}</td>
        <td class="c-pct">${esc(r.pct)}</td>
        <td class="c-overall">${esc(r.overall)}</td>
        <td class="c-pf">${esc(r.pf)}</td>
        <td class="c-pa">${esc(r.pa)}</td>
        <td class="c-diff ${diffNum>0?'rus-ss-pos':diffNum<0?'rus-ss-neg':''}">${esc(r.diff)}</td>
        <td class="c-streak ${streak.startsWith('W')?'rus-ss-win':streak.startsWith('L')?'rus-ss-loss':''}">${esc(r.streak)}</td>
      </tr>`;
    }).join('');
    card.innerHTML=`<div class="rus-ss-region">${esc(group.title)}</div><table class="rus-ss-table"><thead><tr><th>#</th><th>Team</th><th>Reg</th><th>Win%</th><th>Overall</th><th>PF</th><th>PA</th><th>Diff</th><th>Streak</th></tr></thead><tbody>${body}</tbody></table>`;
    return card;
  }

  async function buildBoard(format,label,groups){
    const [w,h]=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const [logos,directory]=await Promise.all([loadLogos(),loadDirectory()]);
    const board=document.createElement('div');
    board.className=`rus-standings-share-board ${format}`;
    board.style.width=`${w}px`;
    board.style.height=`${h}px`;

    const cols=format==='story'?1:format==='x'?Math.min(3,groups.length):Math.min(2,groups.length);
    const gridRows=Math.ceil(groups.length/Math.max(1,cols));
    const maxRows=Math.max(1,...groups.map(g=>g.rows.length));
    const rowBudget=format==='square'
      ?Math.floor((850-Math.max(0,gridRows-1)*12)/Math.max(1,gridRows))
      :format==='x'
        ?Math.floor((680-Math.max(0,gridRows-1)*12)/Math.max(1,gridRows))
        :Math.floor((1540-Math.max(0,gridRows-1)*12)/Math.max(1,gridRows));
    const rowH=format==='square'
      ?Math.max(38,Math.min(gridRows>1?52:96,Math.floor((rowBudget-62)/maxRows)))
      :format==='x'
        ?Math.max(30,Math.min(58,Math.floor((rowBudget-54)/maxRows)))
        :Math.max(42,Math.min(86,Math.floor((rowBudget-62)/maxRows)));
    board.style.setProperty('--rus-row-h',`${rowH}px`);

    board.innerHTML=`<div class="rus-ss-topbar"></div><div class="rus-ss-head"><div class="rus-ss-title">${esc(label)}</div><div class="rus-ss-brand">RURAL UTAH SPORTS</div></div>`;
    const grid=document.createElement('div');
    grid.className='rus-ss-grid';
    grid.style.gridTemplateColumns=`repeat(${Math.max(1,cols)},minmax(0,1fr))`;
    groups.forEach((g,i)=>{
      const card=regionCard(g,logos,directory);
      if(cols===2&&groups.length%2===1&&i===groups.length-1)card.style.gridColumn='1 / -1';
      grid.appendChild(card);
    });
    board.appendChild(grid);
    board.insertAdjacentHTML('beforeend','<div class="rus-ss-footer">ruralutahsports.github.io</div>');
    document.body.appendChild(board);
    return {board,w,h};
  }

  async function createGraphic(format,label,groups){
    await loadCanvas();
    const {board,w,h}=await buildBoard(format,label,groups);
    try{
      await Promise.all([...board.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r})));
      const canvas=await html2canvas(board,{backgroundColor:'#111111',scale:1,useCORS:true,allowTaint:false,logging:false,width:w,height:h,windowWidth:w,windowHeight:h});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
      const file=new File([blob],`rural-utah-sports-standings-${Date.now()}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        try{await navigator.share({files:[file],title:label});return}catch(e){if(e?.name==='AbortError')return}
      }
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    }finally{
      board.remove();
    }
  }

  async function openModal(){
    await ensureRegionView('all');
    const filter=document.getElementById('filter');
    const classes=filter?[...filter.options].filter(o=>o.value&&o.value!=='all').map(o=>({value:o.value,label:o.textContent.trim()})):[];
    const allGroups=readGroups();

    const modal=document.createElement('div');
    modal.className='rus-share-modal';
    modal.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>Choose one region or a whole classification. Whole-classification graphics use a compact region-by-region layout with full school names, logos, school-color accents and standings stats.</p><label class="rus-share-region-label">Share View</label><select class="rus-share-region rus-ss-scope"><option value="region">Single Region</option><option value="classification">Whole Classification — Region by Region</option></select><div class="rus-ss-region-picker"><label class="rus-share-region-label">Region</label><select class="rus-share-region rus-ss-region-select">${allGroups.map((g,i)=>`<option value="${i}">${esc(g.title)}</option>`).join('')}</select></div><div class="rus-ss-class-picker" style="display:none"><label class="rus-share-region-label">Classification</label><select class="rus-share-region rus-ss-class-select">${classes.map(c=>`<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select></div><div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(modal);

    const scope=modal.querySelector('.rus-ss-scope');
    const sync=()=>{
      const whole=scope.value==='classification';
      modal.querySelector('.rus-ss-region-picker').style.display=whole?'none':'';
      modal.querySelector('.rus-ss-class-picker').style.display=whole?'':'none';
    };
    scope.addEventListener('change',sync);
    sync();

    modal.querySelector('.rus-share-close').onclick=()=>modal.remove();
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});

    modal.querySelectorAll('[data-f]').forEach(button=>button.onclick=async()=>{
      const old=button.innerHTML;
      button.disabled=true;
      button.textContent='Creating…';
      try{
        let groups,label;
        if(scope.value==='classification'){
          const select=modal.querySelector('.rus-ss-class-select');
          const value=select.value;
          const text=select.selectedOptions?.[0]?.textContent?.trim()||value;
          await ensureRegionView(value);
          groups=readGroups().filter(g=>!/INDEPEND/i.test(g.title));
          label=`${text} Standings • Region by Region`;
        }else{
          await ensureRegionView('all');
          const groupsNow=readGroups();
          const idx=Number(modal.querySelector('.rus-ss-region-select').value||0);
          groups=[groupsNow[idx]].filter(Boolean);
          label=groups[0]?.title||'Region Standings';
        }
        if(!groups?.length)throw new Error('No standings groups found');
        await createGraphic(button.dataset.f,label,groups);
        modal.remove();
      }catch(err){
        console.error(err);
        button.disabled=false;
        button.innerHTML=old;
        alert('Could not create the standings graphic. Please try again.');
      }
    });
  }

  window.RUSStandingsShare={openModal};

  function init(){
    addStyles();
    const wire=()=>{
      const button=document.querySelector('.rus-share-float');
      if(!button)return false;
      button.onclick=openModal;
      button.textContent='Share Graphic';
      return true;
    };
    if(!wire()){
      let tries=0;
      const timer=setInterval(()=>{if(wire()||++tries>50)clearInterval(timer)},100);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();