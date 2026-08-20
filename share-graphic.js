(()=>{
  if(window.RUSShareGraphic)return;
  window.RUSShareGraphic={};
  const PAGE=(location.pathname.split('/').pop()||'').toLowerCase(),IS_HOME=PAGE==='index.html'||PAGE==='',IS_STAT_LEADERS=PAGE==='stat-leaders.html';
  if(!/award|standings|scoreboard|rankings/.test(PAGE)&&!IS_HOME&&!IS_STAT_LEADERS)return;

  const css=`
  .rus-share-btn{appearance:none;border:0;border-radius:999px;background:#F14D07;color:#000;font:900 12px Arial,sans-serif;text-transform:uppercase;padding:11px 15px;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.35)}
  .rus-share-float{position:fixed;right:18px;bottom:88px;z-index:9996}
  .rus-share-modal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:16px}
  .rus-share-sheet{width:min(520px,100%);background:#111;border:1px solid #444;border-top:5px solid #F14D07;border-radius:14px;padding:18px;color:#fff;font-family:Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .rus-share-sheet h3{margin:0 0 6px;font-size:22px}.rus-share-sheet p{margin:0 0 14px;color:#aaa;font-size:12px;line-height:1.45}
  .rus-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.rus-share-option{border:1px solid #444;border-radius:8px;background:#1d1d1d;color:#fff;padding:13px 10px;font-weight:900;cursor:pointer}.rus-share-option strong{display:block;color:#F14D07;font-size:12px}.rus-share-close{width:100%;margin-top:10px;border:0;background:#333;color:#fff;padding:12px;border-radius:8px;font-weight:900}
  .rus-share-region-label{display:block;margin:0 0 6px;color:#aaa;font-size:10px;font-weight:900;text-transform:uppercase}.rus-share-region{width:100%;height:44px;margin:0 0 13px;background:#1d1d1d;color:#fff;border:1px solid #444;border-radius:8px;padding:0 10px;font-weight:900}
  .rus-share-preview{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.92)}.rus-share-preview-card{width:min(560px,100%);max-height:94vh;overflow:auto;padding:14px;border:1px solid #444;border-top:5px solid #F14D07;border-radius:14px;background:#111;color:#fff;font-family:Arial,sans-serif}.rus-share-preview-card h3{margin:2px 0 5px;font-size:21px}.rus-share-preview-card p{margin:0 0 12px;color:#aaa;font-size:12px;line-height:1.45}.rus-share-preview-card img{display:block;width:100%;height:auto;max-height:65vh;object-fit:contain;border:1px solid #333;background:#080808}.rus-share-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.rus-share-preview-actions button,.rus-share-preview-actions a{display:flex;align-items:center;justify-content:center;min-height:46px;border:1px solid #555;border-radius:8px;background:#1d1d1d;color:#fff;font-weight:900;text-decoration:none}.rus-share-preview-actions .primary{border-color:#F14D07;background:#F14D07;color:#000}
  .rus-exporting .rus-share-btn,.rus-exporting .rus-share-float{visibility:hidden!important}
  .rus-export-board{position:fixed;left:-12000px;top:0;background:#0f0f0f;color:#fff;font-family:Arial,Helvetica,sans-serif;z-index:-1;box-sizing:border-box}
  .rus-export-rank-grid{display:grid;width:100%;height:100%;box-sizing:border-box}
  .rus-export-rank-item{position:relative;border:1px solid rgba(255,255,255,.14);border-left:8px solid var(--accent,#555);border-radius:10px;padding:9px 8px 7px;overflow:hidden;box-sizing:border-box;background:linear-gradient(135deg,var(--tint,rgba(255,255,255,.12)),#141414 72%);display:flex;flex-direction:column;align-items:center}
  .rus-export-rank-num{position:absolute;left:9px;top:12px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#252525;border:1px solid #555;color:#fff;font-size:16px;font-weight:1000}
  .rus-export-rank-num.top1{background:#d5ad35;color:#000;border-color:#f0d169}.rus-export-rank-num.top2{background:#b9bcc1;color:#000;border-color:#e0e2e5}.rus-export-rank-num.top3{background:#ad6b3d;color:#000;border-color:#d6976a}
  .rus-export-team-line{width:100%;min-width:0;display:block;text-align:center;padding-left:40px;padding-right:2px}.rus-export-team-wrap{width:100%;min-width:0;text-align:center}.rus-export-team{display:inline-block;max-width:100%;padding:5px 8px;border-radius:5px;background:var(--accent,#333);color:var(--team-text,#fff);font-size:16px;font-weight:1000;line-height:1.02;white-space:normal;overflow:visible;text-overflow:clip;text-align:center}.rus-export-record{font-size:12px;color:#fff;margin-top:4px;font-weight:1000;text-align:center}.rus-export-logo-wrap{margin-top:auto;height:94px;min-height:94px;max-height:94px;width:100%;display:flex;align-items:center;justify-content:center;padding:0 2px;overflow:visible;box-sizing:border-box}.rus-export-logo-large{display:block;width:auto;height:auto;max-width:100%;max-height:90px;object-fit:contain;object-position:center center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))}
  .rus-export-board.rus-export-landscape .rus-export-rank-item{padding-top:7px;padding-bottom:5px}.rus-export-board.rus-export-landscape .rus-export-team{font-size:15px;padding:4px 7px}.rus-export-board.rus-export-landscape .rus-export-record{font-size:11px;margin-top:3px}.rus-export-board.rus-export-landscape .rus-export-meta{font-size:9px;margin-top:3px;gap:3px 6px}.rus-export-board.rus-export-landscape .rus-export-logo-wrap{height:62px;min-height:62px;max-height:62px;padding:2px 4px;overflow:visible}.rus-export-board.rus-export-landscape .rus-export-logo-large{max-width:92%;max-height:56px;object-fit:contain;object-position:center center}.rus-export-meta{display:flex;justify-content:center;gap:5px 8px;flex-wrap:wrap;margin-top:4px;color:#d8d8d8;font-size:10px;font-weight:1000;text-transform:uppercase;text-align:center;line-height:1.1}.rus-export-move{font-size:18px;font-weight:1000;line-height:1}.rus-export-move.up{color:#62df8c}.rus-export-move.down{color:#ff7070}.rus-export-move.new{color:#F14D07}.rus-export-board.rus-export-landscape .rus-export-move{font-size:16px}
  .rus-export-logo-large.rus-export-logo-tall{max-width:84%;max-height:78px}.rus-export-board.rus-export-landscape .rus-export-logo-large.rus-export-logo-tall{display:block;width:auto;height:46px;max-width:72%;max-height:46px;object-fit:contain;object-position:center center}
  .rus-export-board.rus-export-state25 .rus-export-move{font-size:12px}
  .rus-export-overall-board{display:flex;flex-direction:column;gap:10px}
  .rus-export-overall-top3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%}
  .rus-export-overall-feature{position:relative;border:1px solid rgba(255,255,255,.16);border-top:7px solid var(--accent,#555);border-radius:12px;background:linear-gradient(145deg,var(--tint,rgba(255,255,255,.16)),#141414 74%);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:12px 10px 8px;overflow:hidden}
  .rus-export-overall-feature .rus-export-rank-num{left:10px;top:10px;width:36px;height:36px;font-size:16px}
  .rus-export-overall-feature .rus-export-team-line{padding:0 34px}.rus-export-overall-feature .rus-export-team{font-size:17px;padding:5px 8px}
  .rus-export-overall-feature .rus-export-record{font-size:11px;margin-top:3px}.rus-export-overall-feature .rus-export-meta{font-size:9px;margin-top:3px;gap:3px 6px}
  .rus-export-overall-feature .rus-export-logo-wrap{height:auto;min-height:0;max-height:none;flex:1;margin-top:4px;overflow:visible;padding:0 6px}.rus-export-overall-feature .rus-export-logo-large{max-height:88px;max-width:88%}
  .rus-export-overall-rest{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:column;gap:6px 9px;flex:1;min-height:0}
  .rus-export-overall-row{position:relative;display:grid;grid-template-columns:34px 44px minmax(0,1fr) auto;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);border-left:6px solid var(--accent,#555);border-radius:8px;background:linear-gradient(90deg,var(--tint,rgba(255,255,255,.12)),#141414 82%);padding:5px 7px;overflow:hidden;min-height:0}
  .rus-export-overall-row .rus-export-rank-num{position:static;width:29px;height:29px;font-size:13px}
  .rus-export-overall-row-logo{width:40px;height:40px;display:flex;align-items:center;justify-content:center;overflow:visible}.rus-export-overall-row-logo img{display:block;max-width:40px;max-height:40px;width:auto;height:auto;object-fit:contain;object-position:center}
  .rus-export-overall-row-main{min-width:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px}.rus-export-overall-row .rus-export-team{font-size:12px;padding:3px 5px;line-height:1;max-width:100%}
  .rus-export-overall-row-sub{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:#aaa;font-size:8px;font-weight:900;text-transform:uppercase;line-height:1}.rus-export-overall-row-record{color:#fff}
  .rus-export-overall-row .rus-export-move{font-size:12px;text-align:right;white-space:nowrap}
  .rus-export-board.rus-export-landscape .rus-export-overall-feature .rus-export-logo-large{max-height:62px}.rus-export-board.rus-export-landscape .rus-export-overall-feature .rus-export-team{font-size:15px}
  .rus-export-board.rus-export-landscape .rus-export-overall-row{grid-template-columns:28px 34px minmax(0,1fr) auto;gap:5px;padding:3px 5px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-rank-num{width:24px;height:24px;font-size:11px}.rus-export-board.rus-export-landscape .rus-export-overall-row-logo{width:31px;height:31px}.rus-export-board.rus-export-landscape .rus-export-overall-row-logo img{max-width:31px;max-height:31px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-team{font-size:10px}.rus-export-board.rus-export-landscape .rus-export-overall-row-sub{font-size:7px}.rus-export-board.rus-export-landscape .rus-export-overall-row .rus-export-move{font-size:10px}
  .rus-weekly-export-card,.rus-weekly-export-card *{box-sizing:border-box}.rus-weekly-export-card{position:fixed;left:-12000px;top:0;z-index:-1;width:860px;height:720px;display:grid;grid-template-columns:190px minmax(0,1fr) 175px;gap:30px;align-items:center;overflow:hidden;padding:46px;background:#050505;color:#fff;border:2px solid #383838;border-top:14px solid var(--award-team,#555);box-shadow:inset 10px 0 0 var(--award-team,#555);font-family:Arial,Helvetica,sans-serif}.rus-weekly-export-card:after{content:'RUS';position:absolute;right:-25px;bottom:-55px;color:rgba(255,255,255,.035);font:1000 210px/1 Arial,Helvetica,sans-serif;pointer-events:none}.rus-weekly-export-logo-wrap{position:relative;z-index:1;display:flex;width:190px;height:190px;align-items:center;justify-content:center}.rus-weekly-export-logo{display:block;max-width:100%;max-height:100%;object-fit:contain}.rus-weekly-export-copy{position:relative;z-index:1;min-width:0}.rus-weekly-export-week{color:#999;font-size:18px;font-weight:900;text-transform:uppercase}.rus-weekly-export-award{margin-top:8px;color:#F14D07;font-size:22px;font-weight:1000;letter-spacing:1.8px;line-height:1.15;text-transform:uppercase}.rus-weekly-export-name{margin-top:17px;color:#fff;font-size:52px;font-weight:1000;line-height:.98}.rus-weekly-export-meta{margin-top:13px;color:#b4b4b4;font-size:20px;font-weight:900}.rus-weekly-export-team{display:inline-block;margin-top:15px;padding:9px 14px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:var(--award-team,#555);color:var(--award-ink,#fff);font-size:21px;font-weight:1000;text-transform:uppercase}.rus-weekly-export-stats{margin-top:22px;color:#d1d1d1;font-size:20px;font-weight:700;line-height:1.45}.rus-weekly-export-result{margin-top:16px;color:#fff;font-size:20px;font-weight:1000;text-transform:uppercase}.rus-weekly-export-score{position:relative;z-index:1;border:2px solid #3b3b3b;border-radius:14px;background:#111;padding:24px 12px;text-align:center}.rus-weekly-export-score strong{display:block;color:#F14D07;font-size:52px;line-height:1}.rus-weekly-export-score span{display:block;margin-top:9px;color:#888;font-size:12px;font-weight:1000;line-height:1.25;text-transform:uppercase}.rus-weekly-export-card.story{height:1100px;grid-template-columns:1fr;grid-template-rows:250px auto 150px;gap:28px;padding:60px;text-align:center}.rus-weekly-export-card.story .rus-weekly-export-logo-wrap{width:250px;height:250px;margin:auto}.rus-weekly-export-card.story .rus-weekly-export-name{font-size:64px}.rus-weekly-export-card.story .rus-weekly-export-team{font-size:24px}.rus-weekly-export-card.story .rus-weekly-export-stats{font-size:23px}.rus-weekly-export-card.story .rus-weekly-export-score{width:340px;margin:auto}.rus-weekly-export-card.landscape{width:1160px;height:470px;grid-template-columns:185px minmax(0,1fr) 190px;padding:34px 48px}.rus-weekly-export-card.landscape .rus-weekly-export-logo-wrap{width:175px;height:175px}.rus-weekly-export-card.landscape .rus-weekly-export-name{font-size:49px}.rus-weekly-export-card.landscape .rus-weekly-export-stats{font-size:18px;margin-top:15px}.rus-weekly-export-card.landscape .rus-weekly-export-result{font-size:17px;margin-top:10px}
  .rus-weekly-export-card{padding:42px 42px 42px 48px;background:linear-gradient(145deg,#050505 0%,#101010 62%,#181818 100%);border:2px solid #383838;border-top:12px solid #F14D07;border-left:14px solid var(--award-team,#555);box-shadow:none}.rus-weekly-export-logo-wrap{width:200px;height:200px;padding:18px;border:2px solid var(--award-team,#555);border-radius:18px;background:#0b0b0b}.rus-weekly-export-logo{width:100%;height:100%}.rus-weekly-export-award{font-size:24px}.rus-weekly-export-name{font-size:56px}.rus-weekly-export-meta{font-size:19px}.rus-weekly-export-stats{padding:15px 17px;border:1px solid #303030;border-radius:10px;background:#0b0b0b;color:#dedede;font-size:21px}.rus-weekly-export-result{display:inline-block;padding:8px 11px;border-left:5px solid var(--award-team,#555);background:#151515}.rus-weekly-export-score{border-color:var(--award-team,#555);background:#090909}.rus-weekly-export-card.story{padding:56px;border-left-width:14px}.rus-weekly-export-card.story .rus-weekly-export-logo-wrap{width:270px;height:270px}.rus-weekly-export-card.story .rus-weekly-export-stats{font-size:24px}.rus-weekly-export-card.landscape{padding:30px 42px 30px 48px}.rus-weekly-export-card.landscape .rus-weekly-export-logo-wrap{width:185px;height:185px}.rus-weekly-export-card.landscape .rus-weekly-export-stats{font-size:19px;padding:12px 14px}
  @media(min-width:700px){.rus-share-modal{align-items:center}}
  `;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  function loadCanvas(){
    if(window.html2canvas)return Promise.resolve();
    return new Promise((res,rej)=>{const s=document.createElement('script');s.src='html2canvas.min.js?v=1.4.1';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  }
  let logoCachePromise=null;
  function loadLogoCache(){
    if(logoCachePromise)return logoCachePromise;
    logoCachePromise=fetch(`school-logo-cache.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    return logoCachePromise;
  }
  let schoolDirectoryPromise=null;
  function loadSchoolDirectory(){
    if(schoolDirectoryPromise)return schoolDirectoryPromise;
    schoolDirectoryPromise=fetch(`school-directory.json?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    return schoolDirectoryPromise;
  }
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  function candidates(){
    let sels=[];
    if(PAGE.includes('scoreboard')) sels=['.game','.date-section','#board'];
    else if(PAGE.includes('standings')) sels=['.group','.region-card','.standings-card','.standings-section','section'];
    else if(PAGE.includes('rankings')) sels=['.state25','.rank-card','#rankings','section'];
    else sels=['.award-card','.award-section','.awards-section','.team-section','section'];
    return [...new Set(sels.flatMap(s=>[...document.querySelectorAll(s)]))].filter(el=>el.offsetWidth>250&&el.offsetHeight>80);
  }
  function currentSection(){
    const list=candidates();if(!list.length)return document.querySelector('main')||document.body;
    const mid=innerHeight*.52;let best=list[0],score=Infinity;
    list.forEach(el=>{const r=el.getBoundingClientRect(),visible=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);if(visible<=0)return;const d=Math.abs((r.top+r.bottom)/2-mid)-visible*.15;if(d<score){score=d;best=el}});
    return best;
  }
  function titleFor(el){
    if(PAGE.includes('rankings')){
      const card=el.matches?.('.rank-card')?el:el.closest?.('.rank-card');
      if(card){
        const cls=card.querySelector('.rank-head h2')?.textContent?.trim();
        const label=card.querySelector('.rank-head span')?.textContent?.trim();
        if(cls&&label)return `${cls} ${label}`.slice(0,70);
      }
    }
    const h=el.querySelector?.('h1,h2,h3,.team-name,.region-title,.rank-head')?.textContent?.trim();
    if(h)return h.slice(0,70);
    if(PAGE.includes('scoreboard'))return 'Rural Utah Sports Scoreboard';
    if(PAGE.includes('standings'))return 'Rural Utah Sports Standings';
    if(PAGE.includes('rankings'))return 'Rural Utah Sports Rankings';
    return 'Rural Utah Sports Awards';
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
  function teamFromRow(row){
    const link=row.querySelector('a.team-link[href*="team.html"],a[href*="team.html?team="]');
    if(link){try{const t=new URL(link.href,location.href).searchParams.get('team');if(t)return t.trim()}catch{}}
    return (row.querySelector('.team-pill')?.childNodes?.[0]?.textContent||row.querySelector('.team-pill')?.textContent||row.querySelector('.team-link')?.textContent||'').trim().replace(/\s+\d+[-–]\d+(?:[-–]\d+)?$/,'');
  }
  function rgba(hex,a){
    const m=String(hex||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return `rgba(255,255,255,${a})`;
    const n=parseInt(m[1],16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  function contrast(hex){
    const m=String(hex||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return '#fff';
    const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#000':'#fff';
  }
  function readableAccent(hex){
    const m=String(hex||'').trim().match(/^#([0-9a-f]{6})$/i);if(!m)return '#aaa';const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;if((r*299+g*587+b*114)/1000>=118)return hex;const mix=value=>Math.round(value+(255-value)*.46).toString(16).padStart(2,'0');return`#${mix(r)}${mix(g)}${mix(b)}`;
  }
  async function overallRankingSource(root,rows,w,h){
    if(!rows?.length)return null;
    const [logos,directory]=await Promise.all([loadLogoCache(),loadSchoolDirectory()]);
    const top=108,bottom=54,pad=30,availableH=h-top-bottom;
    let richExportSrc='';
    if(rows.some(row=>norm(teamFromRow(row))==='RICH')){
      try{
        const richSvg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        richExportSrc=(richSvg.match(/href=[\"'](data:image\/(?:png|webp);base64,[^\"']+)[\"']/i)||[])[1]||'';
      }catch{}
    }
    const data=rows.map((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=teamFromRow(row);
      const cls=(row.querySelector('.small-school-class')?.textContent||'').trim();
      const elo=(row.querySelector('.small-school-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement'),move=(moveEl?.textContent||'').trim(),moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const record=(row.querySelector('.rus-ranking-record,.rus-live-record,.team-record,.record')?.textContent||'').trim();
      const existing=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const src=(norm(team)==='RICH'&&richExportSrc)||logos[norm(team)]||existing||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      const accent=getComputedStyle(row).getPropertyValue('--small-accent').trim()||getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555555';
      return {rank,team,cls,elo,move,moveClass,record,src,accent};
    });
    const board=document.createElement('div');board.className='rus-export-board rus-export-overall-board'+(w>h*1.25?' rus-export-landscape':'');board.style.width=`${w-pad*2}px`;board.style.height=`${availableH}px`;
    const featureH=w>h*1.25?145:(h>w*1.35?230:190);
    const top3=document.createElement('div');top3.className='rus-export-overall-top3';top3.style.height=`${featureH}px`;top3.style.flex=`0 0 ${featureH}px`;
    data.slice(0,3).forEach(d=>{
      const item=document.createElement('div');item.className='rus-export-overall-feature';item.style.setProperty('--accent',d.accent);item.style.setProperty('--tint',rgba(d.accent,.38));item.style.setProperty('--team-text',contrast(d.accent));
      const topClass=Number(d.rank)<=3?` top${Number(d.rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${topClass}">${esc(d.rank)}</div><div class="rus-export-team-line"><div class="rus-export-team-wrap"><div class="rus-export-team">${esc(d.team)}</div></div></div>${d.record?`<div class="rus-export-record">${esc(d.record)}</div>`:''}<div class="rus-export-meta">${d.cls?`<span>${esc(d.cls)}</span>`:''}${d.elo?`<span>ELO ${esc(d.elo)}</span>`:''}${d.move?`<span class="rus-export-move ${d.moveClass}">${esc(d.move)}</span>`:''}</div>${d.src?`<div class="rus-export-logo-wrap"><img class="rus-export-logo-large${norm(d.team)==='RICH'?' rus-export-logo-tall':''}" src="${esc(d.src)}" alt="${esc(d.team)} logo"></div>`:''}`;
      top3.appendChild(item);
    });
    const restData=data.slice(3),cols=3,rowsPerCol=Math.ceil(restData.length/cols);
    const rest=document.createElement('div');rest.className='rus-export-overall-rest';rest.style.gridTemplateRows=`repeat(${rowsPerCol},minmax(0,1fr))`;
    restData.forEach(d=>{
      const item=document.createElement('div');item.className='rus-export-overall-row';item.style.setProperty('--accent',d.accent);item.style.setProperty('--tint',rgba(d.accent,.24));item.style.setProperty('--team-text',contrast(d.accent));
      item.innerHTML=`<div class="rus-export-rank-num">${esc(d.rank)}</div>${d.src?`<div class="rus-export-overall-row-logo"><img src="${esc(d.src)}" alt="${esc(d.team)} logo"></div>`:'<div class="rus-export-overall-row-logo"></div>'}<div class="rus-export-overall-row-main"><div class="rus-export-team">${esc(d.team)}</div><div class="rus-export-overall-row-sub">${d.record?`<span class="rus-export-overall-row-record">${esc(d.record)}</span>`:''}${d.cls?`<span>${esc(d.cls)}</span>`:''}${d.elo?`<span>ELO ${esc(d.elo)}</span>`:''}</div></div>${d.move?`<div class="rus-export-move ${d.moveClass}">${esc(d.move)}</div>`:'<div></div>'}`;
      rest.appendChild(item);
    });
    board.append(top3,rest);document.body.appendChild(board);return {node:board,top,bottom,pad};
  }
  async function rankingSource(el,w,h){
    if(!PAGE.includes('rankings'))return null;
    const stateRoot=el.matches?.('.state25')?el:el.closest?.('.state25');
    const stateRows=stateRoot?[...stateRoot.querySelectorAll('.state25-row')]:[];
    const smallRoot=el.matches?.('.small-school-section')?el:el.closest?.('.small-school-section');
    const smallRows=smallRoot?[...smallRoot.querySelectorAll('.small-school-row')]:[];
    if(smallRows.length)return overallRankingSource(smallRoot,smallRows,w,h);
    const classRoot=el.matches?.('.rank-card')?el:el.closest?.('.rank-card');
    const classRows=classRoot?[...classRoot.querySelectorAll('.rank-row')]:[];
    const rows=(stateRows.length?stateRows:classRows).slice(0,25);if(!rows.length)return null;
    const [logos,directory]=await Promise.all([loadLogoCache(),loadSchoolDirectory()]);
    const top=108,bottom=54,pad=30,gap=10,availableH=h-top-bottom;
    const verticalClass=classRows.length>0&&!stateRows.length;
    const cols=verticalClass?2:rows.length>20?(h>w*1.35?3:5):rows.length>10?(h>w*1.35?2:4):2;
    const rowsPerCol=Math.ceil(rows.length/cols);
    const rowH=verticalClass?Math.max(100,Math.floor((availableH-gap*(rowsPerCol-1))/rowsPerCol)):Math.max(72,Math.floor((availableH-gap*(rowsPerCol-1))/rowsPerCol));
    const board=document.createElement('div');board.className='rus-export-board'+(w>h*1.25?' rus-export-landscape':'')+(stateRows.length?' rus-export-state25':'');board.style.width=`${w-pad*2}px`;board.style.height=`${availableH}px`;
    const grid=document.createElement('div');grid.className='rus-export-rank-grid';grid.style.gridTemplateColumns=`repeat(${cols},minmax(0,1fr))`;grid.style.gridTemplateRows=`repeat(${rowsPerCol},${rowH}px)`;grid.style.gridAutoFlow=verticalClass?'column':'row';grid.style.gap=`${gap}px`;
    let richExportSrc='';
    if(rows.some(row=>norm(teamFromRow(row))==='RICH')){
      try{
        const richSvg=await fetch(`school-logos/rich-user.svg?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        richExportSrc=(richSvg.match(/href=[\"'](data:image\/(?:png|webp);base64,[^\"']+)[\"']/i)||[])[1]||'';
      }catch{}
    }
    rows.forEach((row,i)=>{
      const rank=(row.querySelector('.rank-num')?.textContent||String(i+1)).trim();
      const team=teamFromRow(row);
      const cls=(row.querySelector('.state25-class')?.textContent||row.querySelector('.team-class')?.textContent||'').trim();
      const dirEntry=directory[norm(team)]||null;
      const region=dirEntry?.uhsaaRegion?`Region ${dirEntry.uhsaaRegion}`:'';
      const elo=(row.querySelector('.state25-elo')?.textContent||'').trim();
      const moveEl=row.querySelector('.movement'),move=(moveEl?.textContent||'').trim(),moveClass=moveEl?.classList.contains('up')?'up':moveEl?.classList.contains('down')?'down':moveEl?.classList.contains('new')?'new':'';
      const record=(row.querySelector('.rus-ranking-record,.rus-live-record,.team-record,.record')?.textContent||'').trim();
      const existing=row.querySelector('.rus-ranking-school-logo,img')?.getAttribute('src')||'';
      const src=(norm(team)==='RICH'&&richExportSrc)||logos[norm(team)]||existing||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      const accent=getComputedStyle(row).getPropertyValue('--team-accent').trim()||'#555555';
      const item=document.createElement('div');item.className='rus-export-rank-item';item.style.setProperty('--accent',accent);item.style.setProperty('--tint',rgba(accent,.34));item.style.setProperty('--team-text',contrast(accent));
      const topClass=Number(rank)<=3?` top${Number(rank)}`:'';
      item.innerHTML=`<div class="rus-export-rank-num${topClass}">${esc(rank)}</div><div class="rus-export-team-line"><div class="rus-export-team-wrap"><div class="rus-export-team">${esc(team)}</div></div></div>${record?`<div class="rus-export-record">${esc(record)}</div>`:''}<div class="rus-export-meta">${cls?`<span>${esc(cls)}</span>`:''}${region?`<span>${esc(region)}</span>`:''}${elo?`<span>ELO ${esc(elo)}</span>`:''}${move?`<span class="rus-export-move ${moveClass}">${esc(move)}</span>`:''}</div>${src?`<div class="rus-export-logo-wrap"><img class="rus-export-logo-large${norm(team)==='RICH'?' rus-export-logo-tall':''}" src="${esc(src)}" alt="${esc(team)} logo"></div>`:''}`;
      grid.appendChild(item);
    });
    board.appendChild(grid);document.body.appendChild(board);return {node:board,top,bottom,pad};
  }
  async function weeklyAwardSource(el,w,h,label){
    if(PAGE!=='weekly-awards.html'||!el?.matches?.('.award-card,.class-card'))return null;
    const text=selector=>(el.querySelector(selector)?.textContent||'').trim();
    const computed=getComputedStyle(el),teamColor=computed.getPropertyValue('--team').trim()||'#555555',teamInk=computed.getPropertyValue('--ink').trim()||contrast(teamColor);
    const award=text('.award-type,.class-label')||String(label||'Weekly Award').split('•')[0].trim();
    const name=text('.player-name,.class-name')||'Weekly Award Winner';
    const meta=text('.player-meta');
    const team=text('.team-link');
    const stats=text('.stat-line');
    let result=text('.result'),score=text('.award-score strong'),scoreLabel=text('.award-score span')||'RUS weekly score';
    if(!score){const match=result.match(/^(.*?)\s*•\s*([\d.]+)\s+score$/i);if(match){result=match[1].trim();score=match[2]}}
    const img=el.querySelector('.award-logo,.class-logo'),logos=await loadLogoCache(),cachedLogo=logos[norm(team)]||'',rawLogo=cachedLogo||img?.currentSrc||img?.getAttribute('src')||window.RUSSchoolAssets?.logoUrl?.(team)||'',logo=rawLogo?new URL(rawLogo,location.href).href:'';
    const weekLabel=(String(label||'').match(/2026\s+Week\s+\d+/i)||[])[0]||'2026 Weekly Honors';
    const board=document.createElement('article');board.className=`rus-weekly-export-card${h>w*1.3?' story':w>h*1.25?' landscape':''}`;board.style.setProperty('--award-team',teamColor);board.style.setProperty('--award-ink',teamInk);
    board.innerHTML=`<div class="rus-weekly-export-logo-wrap">${logo?`<img class="rus-weekly-export-logo" src="${esc(logo)}" alt="${esc(team)} logo">`:''}</div><div class="rus-weekly-export-copy"><div class="rus-weekly-export-week">${esc(weekLabel)}</div><div class="rus-weekly-export-award">${esc(award)}</div><div class="rus-weekly-export-name">${esc(name)}</div><div class="rus-weekly-export-meta">${esc(meta)}</div><div class="rus-weekly-export-team">${esc(team)}</div><div class="rus-weekly-export-stats">${esc(stats)}</div><div class="rus-weekly-export-result">${esc(result)}</div></div><div class="rus-weekly-export-score"><strong>${esc(score||'—')}</strong><span>${esc(scoreLabel)}</span></div>`;
    document.body.appendChild(board);return{node:board,top:112,bottom:62,pad:w>h*1.25?42:46};
  }
  function canvasRoundRect(c,x,y,w,h,r){
    const radius=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+radius,y);c.arcTo(x+w,y,x+w,y+h,radius);c.arcTo(x+w,y+h,x,y+h,radius);c.arcTo(x,y+h,x,y,radius);c.arcTo(x,y,x+w,y,radius);c.closePath();
  }
  function canvasFont(c,size,weight=800){c.font=`${weight} ${size}px Arial, Helvetica, sans-serif`}
  function fitCanvasFont(c,text,maxWidth,maxSize,minSize=18,weight=900){
    let size=maxSize;canvasFont(c,size,weight);while(size>minSize&&c.measureText(String(text||'')).width>maxWidth){size-=2;canvasFont(c,size,weight)}return size;
  }
  function canvasLines(c,text,maxWidth,maxLines=4){
    const words=String(text||'').trim().split(/\s+/).filter(Boolean),lines=[];let line='';
    words.forEach(word=>{const next=line?`${line} ${word}`:word;if(!line||c.measureText(next).width<=maxWidth)line=next;else{lines.push(line);line=word}});if(line)lines.push(line);
    if(lines.length>maxLines){const kept=lines.slice(0,maxLines),rest=lines.slice(maxLines-1).join(' ');let last=rest;while(last.length>1&&c.measureText(`${last}…`).width>maxWidth)last=last.slice(0,-1);kept[maxLines-1]=`${last.trim()}…`;return kept}return lines;
  }
  function drawCanvasLines(c,text,x,y,maxWidth,lineHeight,maxLines=4,align='left'){
    const lines=canvasLines(c,text,maxWidth,maxLines);c.textAlign=align;lines.forEach((line,i)=>c.fillText(line,x,y+i*lineHeight));return y+Math.max(0,lines.length-1)*lineHeight;
  }
  const canvasImagePromises=new Map();
  function loadCanvasImage(src){
    if(!src)return Promise.resolve(null);const url=new URL(src,location.href).href;if(canvasImagePromises.has(url))return canvasImagePromises.get(url);
    const job=new Promise(resolve=>{const img=new Image();let settled=false,timer=null;const done=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value)};img.decoding='async';img.onload=()=>done(img);img.onerror=()=>done(null);timer=setTimeout(()=>done(null),3500);img.src=url});canvasImagePromises.set(url,job);return job;
  }
  function drawContainedImage(c,img,x,y,w,h){
    if(!img?.naturalWidth||!img?.naturalHeight)return;const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  function drawCanvasPill(c,text,x,y,maxWidth,fill,ink,fontSize=24,center=false){
    const value=String(text||'').toUpperCase();fitCanvasFont(c,value,maxWidth-32,fontSize,15,900);const width=Math.min(maxWidth,c.measureText(value).width+34),left=center?x-width/2:x;c.fillStyle=fill;canvasRoundRect(c,left,y,width,fontSize+28,9);c.fill();c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';c.fillText(value,left+width/2,y+(fontSize+28)/2+1);c.textBaseline='alphabetic';return width;
  }
  async function renderWeeklyAward(el,w,h,label){
    const text=selector=>(el.querySelector(selector)?.textContent||'').trim();
    const computed=getComputedStyle(el),teamColor=computed.getPropertyValue('--team').trim()||'#555555',teamInk=computed.getPropertyValue('--ink').trim()||contrast(teamColor);
    const award=text('.award-type,.class-label')||String(label||'Weekly Award').split('•')[0].trim(),name=text('.player-name,.class-name')||'Weekly Award Winner',meta=text('.player-meta'),team=text('.team-link'),stats=text('.stat-line');
    let result=text('.result'),score=text('.award-score strong'),scoreLabel=text('.award-score span')||'RUS weekly score';
    if(!score){const match=result.match(/^(.*?)\s*•\s*([\d.]+)\s+score$/i);if(match){result=match[1].trim();score=match[2]}}
    const logos=await loadLogoCache(),domLogo=el.querySelector('.award-logo,.class-logo'),rawLogo=logos[norm(team)]||domLogo?.currentSrc||domLogo?.getAttribute('src')||window.RUSSchoolAssets?.logoUrl?.(team)||'',logo=await loadCanvasImage(rawLogo);
    const weekLabel=(String(label||'').match(/2026\s+Week\s+\d+/i)||[])[0]||'2026 Weekly Honors',story=h>w*1.3,landscape=w>h*1.25;
    const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#050505');bg.addColorStop(.68,'#111111');bg.addColorStop(1,'#080808');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
    c.textBaseline='alphabetic';c.textAlign='left';c.fillStyle='#fff';canvasFont(c,landscape?34:38,900);c.fillText('RURAL UTAH SPORTS',50,landscape?55:61);c.fillStyle='#F14D07';canvasFont(c,landscape?17:19,900);c.fillText(weekLabel.toUpperCase(),50,landscape?84:92);
    const card=landscape?{x:48,y:112,w:w-96,h:h-170}:story?{x:48,y:145,w:w-96,h:h-225}:{x:48,y:122,w:w-96,h:h-190};
    c.fillStyle='#080808';c.strokeStyle='#393939';c.lineWidth=3;canvasRoundRect(c,card.x,card.y,card.w,card.h,20);c.fill();c.stroke();c.fillStyle=teamColor;canvasRoundRect(c,card.x,card.y,14,card.h,7);c.fill();
    c.save();c.globalAlpha=.035;c.fillStyle='#fff';canvasFont(c,story?270:landscape?230:240,900);c.textAlign='right';c.fillText('RUS',card.x+card.w-30,card.y+card.h-22);c.restore();
    if(landscape){
      const logoBox={x:90,y:245,w:260,h:260};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=4;canvasRoundRect(c,logoBox.x,logoBox.y,logoBox.w,logoBox.h,18);c.fill();c.stroke();drawContainedImage(c,logo,logoBox.x+24,logoBox.y+24,logoBox.w-48,logoBox.h-48);
      const copyX=405,copyW=760;c.fillStyle='#F14D07';fitCanvasFont(c,award,copyW,30,19,900);c.textAlign='left';c.fillText(award.toUpperCase(),copyX,185);c.fillStyle='#fff';fitCanvasFont(c,name,copyW,70,39,900);c.fillText(name,copyX,265);c.fillStyle='#aaa';canvasFont(c,24,800);drawCanvasLines(c,meta,copyX,307,copyW,30,2);drawCanvasPill(c,team,copyX,335,copyW,teamColor,teamInk,24);
      c.fillStyle='#101010';c.strokeStyle='#323232';c.lineWidth=2;canvasRoundRect(c,copyX,420,copyW,160,13);c.fill();c.stroke();c.fillStyle='#d8d8d8';canvasFont(c,24,700);drawCanvasLines(c,stats,copyX+24,462,copyW-48,34,4);
      c.fillStyle='#fff';canvasFont(c,23,900);drawCanvasLines(c,result.toUpperCase(),copyX,635,copyW,30,2);
      const scoreBox={x:1210,y:240,w:290,h:210};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=4;canvasRoundRect(c,scoreBox.x,scoreBox.y,scoreBox.w,scoreBox.h,16);c.fill();c.stroke();c.fillStyle='#F14D07';fitCanvasFont(c,score||'—',scoreBox.w-40,78,45,900);c.textAlign='center';c.fillText(score||'—',scoreBox.x+scoreBox.w/2,scoreBox.y+103);c.fillStyle='#929292';canvasFont(c,16,900);drawCanvasLines(c,scoreLabel.toUpperCase(),scoreBox.x+scoreBox.w/2,scoreBox.y+145,scoreBox.w-38,21,3,'center');
    }else if(story){
      const cx=w/2,logoBox={x:cx-190,y:250,w:380,h:380};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=5;canvasRoundRect(c,logoBox.x,logoBox.y,logoBox.w,logoBox.h,24);c.fill();c.stroke();drawContainedImage(c,logo,logoBox.x+35,logoBox.y+35,logoBox.w-70,logoBox.h-70);
      c.fillStyle='#F14D07';fitCanvasFont(c,award,850,34,20,900);c.textAlign='center';c.fillText(award.toUpperCase(),cx,730);c.fillStyle='#fff';fitCanvasFont(c,name,850,78,46,900);const nameLines=canvasLines(c,name,850,2);nameLines.forEach((line,i)=>c.fillText(line,cx,825+i*82));const afterName=825+(nameLines.length-1)*82;
      c.fillStyle='#aaa';canvasFont(c,27,800);drawCanvasLines(c,meta,cx,afterName+60,850,34,2,'center');drawCanvasPill(c,team,cx,afterName+95,620,teamColor,teamInk,29,true);
      const scoreBox={x:270,y:afterName+205,w:540,h:215};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=4;canvasRoundRect(c,scoreBox.x,scoreBox.y,scoreBox.w,scoreBox.h,18);c.fill();c.stroke();c.fillStyle='#F14D07';fitCanvasFont(c,score||'—',scoreBox.w-50,86,52,900);c.textAlign='center';c.fillText(score||'—',cx,scoreBox.y+105);c.fillStyle='#929292';canvasFont(c,18,900);drawCanvasLines(c,scoreLabel.toUpperCase(),cx,scoreBox.y+155,scoreBox.w-50,24,2,'center');
      const statsY=Math.min(scoreBox.y+270,1450);c.fillStyle='#101010';c.strokeStyle='#323232';c.lineWidth=2;canvasRoundRect(c,90,statsY,900,245,15);c.fill();c.stroke();c.fillStyle='#d8d8d8';canvasFont(c,27,700);drawCanvasLines(c,stats,130,statsY+55,820,40,4);c.fillStyle='#fff';canvasFont(c,27,900);drawCanvasLines(c,result.toUpperCase(),cx,statsY+315,820,36,2,'center');
    }else{
      c.fillStyle='#F14D07';fitCanvasFont(c,award,860,31,19,900);c.textAlign='left';c.fillText(award.toUpperCase(),92,195);c.fillStyle='#fff';fitCanvasFont(c,name,860,72,40,900);c.fillText(name,92,275);c.fillStyle='#aaa';canvasFont(c,24,800);drawCanvasLines(c,meta,92,320,860,30,2);drawCanvasPill(c,team,92,346,600,teamColor,teamInk,23);
      const logoBox={x:92,y:445,w:290,h:290};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=4;canvasRoundRect(c,logoBox.x,logoBox.y,logoBox.w,logoBox.h,18);c.fill();c.stroke();drawContainedImage(c,logo,logoBox.x+28,logoBox.y+28,logoBox.w-56,logoBox.h-56);
      const scoreBox={x:92,y:770,w:290,h:135};c.fillStyle='#111';c.strokeStyle=teamColor;c.lineWidth=3;canvasRoundRect(c,scoreBox.x,scoreBox.y,scoreBox.w,scoreBox.h,14);c.fill();c.stroke();c.fillStyle='#F14D07';fitCanvasFont(c,score||'—',scoreBox.w-35,59,38,900);c.textAlign='center';c.fillText(score||'—',scoreBox.x+scoreBox.w/2,scoreBox.y+66);c.fillStyle='#929292';canvasFont(c,13,900);drawCanvasLines(c,scoreLabel.toUpperCase(),scoreBox.x+scoreBox.w/2,scoreBox.y+97,scoreBox.w-34,17,2,'center');
      c.fillStyle='#101010';c.strokeStyle='#323232';c.lineWidth=2;canvasRoundRect(c,425,445,560,285,15);c.fill();c.stroke();c.fillStyle='#d8d8d8';canvasFont(c,25,700);drawCanvasLines(c,stats,453,495,504,38,5);c.fillStyle='#fff';canvasFont(c,24,900);drawCanvasLines(c,result.toUpperCase(),453,790,504,32,3);
    }
    c.fillStyle='#777';canvasFont(c,15,800);c.textAlign='left';c.fillText('ruralutahsports.github.io',50,h-29);
    const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png',1));if(!blob)throw new Error('PNG export failed');return blob;
  }
  async function renderClassMvpCollection(el,w,h,label){
    const cards=[...el.querySelectorAll('.class-card')].slice(0,7),logos=await loadLogoCache();if(!cards.length)throw new Error('No classification MVP cards found');
    const items=await Promise.all(cards.map(async card=>{
      const text=selector=>(card.querySelector(selector)?.textContent||'').trim(),computed=getComputedStyle(card),teamColor=computed.getPropertyValue('--team').trim()||'#555555',teamInk=computed.getPropertyValue('--ink').trim()||contrast(teamColor),classLabel=text('.class-label')||'Classification MVP',name=text('.class-name')||'Awaiting reported stats',team=text('.team-link'),stats=text('.stat-line');
      let result=text('.result'),score='—';const match=result.match(/^(.*?)\s*•\s*([\d.]+)\s+score$/i);if(match){result=match[1].trim();score=match[2]}
      const domLogo=card.querySelector('.class-logo'),rawLogo=logos[norm(team)]||domLogo?.currentSrc||domLogo?.getAttribute('src')||window.RUSSchoolAssets?.logoUrl?.(team)||'';
      return{classLabel,name,team,stats,result,score,teamColor,teamInk,logo:await loadCanvasImage(rawLogo)};
    }));
    const weekLabel=(String(label||'').match(/2026\s+Week\s+\d+/i)||[])[0]||'2026 Weekly Honors',story=h>w*1.3,landscape=w>h*1.25,out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#050505');bg.addColorStop(.7,'#111');bg.addColorStop(1,'#070707');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#F14D07';c.fillRect(0,0,w,12);c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';fitCanvasFont(c,'MVP BY CLASSIFICATION',w-100,landscape?43:42,28,900);c.fillText('MVP BY CLASSIFICATION',50,landscape?58:62);c.fillStyle='#F14D07';canvasFont(c,landscape?18:19,900);c.fillText(`${weekLabel.toUpperCase()} • ALL 7 WINNERS`,50,landscape?89:94);
    const drawTile=(item,x,y,tileW,tileH)=>{
      c.fillStyle='#090909';c.strokeStyle='#353535';c.lineWidth=2;canvasRoundRect(c,x,y,tileW,tileH,15);c.fill();c.stroke();c.fillStyle=item.teamColor;canvasRoundRect(c,x,y,9,tileH,5);c.fill();
      const pad=18,logoSize=Math.max(60,Math.min(118,tileH-136,tileW*.25)),logoX=x+pad,logoY=y+52,scoreW=tileW<430?62:82,copyX=logoX+logoSize+17,copyW=x+tileW-pad-scoreW-copyX;
      c.fillStyle='#F14D07';canvasFont(c,tileW<430?16:19,900);c.textAlign='left';c.fillText(item.classLabel.toUpperCase(),x+pad,y+30);
      c.fillStyle='#111';c.strokeStyle=item.teamColor;c.lineWidth=2;canvasRoundRect(c,logoX,logoY,logoSize,logoSize,10);c.fill();c.stroke();drawContainedImage(c,item.logo,logoX+8,logoY+8,logoSize-16,logoSize-16);
      c.fillStyle='#fff';fitCanvasFont(c,item.name,Math.max(90,copyW),tileW<430?28:32,17,900);c.textAlign='left';c.fillText(item.name,copyX,y+73);
      c.fillStyle=item.teamColor;fitCanvasFont(c,item.team,Math.max(90,copyW),tileW<430?16:19,12,900);c.fillText(item.team.toUpperCase(),copyX,y+103);
      c.fillStyle='#F14D07';fitCanvasFont(c,item.score,scoreW,34,23,900);c.textAlign='right';c.fillText(item.score,x+tileW-pad,y+73);c.fillStyle='#777';canvasFont(c,10,900);c.fillText('SCORE',x+tileW-pad,y+92);
      const statTop=y+tileH-(tileH>280?72:60);c.fillStyle='#090909';c.fillRect(x+12,statTop-4,tileW-24,35);c.save();c.beginPath();c.rect(x+pad,statTop,tileW-pad*2,31);c.clip();c.fillStyle='#cfcfcf';canvasFont(c,tileW<430?11:13,700);c.textAlign='left';drawCanvasLines(c,item.stats||'No reported stat line',x+pad,statTop+13,tileW-pad*2,14,2);c.restore();
      c.fillStyle='#fff';c.textAlign='left';fitCanvasFont(c,item.result.toUpperCase(),tileW-pad*2,tileW<430?13:15,10,900);c.fillText(item.result.toUpperCase(),x+pad,y+tileH-15);
    };
    if(story){
      const x=55,startY=135,gap=13,tileW=w-110,tileH=(h-startY-58-gap*6)/7;items.forEach((item,i)=>drawTile(item,x,startY+i*(tileH+gap),tileW,tileH));
    }else if(landscape){
      const gap=14,tileW=(w-110-gap*3)/4,startY=120,tileH=(h-startY-52-gap)/2;items.forEach((item,i)=>{const row=i<4?0:1,count=row===0?4:3,index=row===0?i:i-4,total=count*tileW+(count-1)*gap,x=(w-total)/2+index*(tileW+gap);drawTile(item,x,startY+row*(tileH+gap),tileW,tileH)});
    }else{
      const gap=12,tileW=(w-112-gap)/2,startY=128,tileH=(h-startY-52-gap*3)/4;items.forEach((item,i)=>{const row=Math.floor(i/2),last=i===6,x=last?(w-tileW)/2:50+(i%2)*(tileW+gap);drawTile(item,x,startY+row*(tileH+gap),tileW,tileH)});
    }
    c.fillStyle='#777';canvasFont(c,15,800);c.textAlign='left';c.fillText('ruralutahsports.github.io',50,h-23);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png',1));if(!blob)throw new Error('PNG export failed');return blob;
  }
  function renderWeeklyTarget(el,w,h,label){return el?.matches?.('.class-grid')?renderClassMvpCollection(el,w,h,label):renderWeeklyAward(el,w,h,label)}
  async function reviewCardData(card,logos){
    const text=selector=>(card.querySelector(selector)?.textContent||'').trim(),teams=await Promise.all([...card.querySelectorAll('.review-team-row')].slice(0,2).map(async row=>{const name=(row.querySelector('.review-team-name')?.textContent||'').trim(),score=(row.querySelector('.review-team-score')?.textContent||'—').trim(),domLogo=row.querySelector('img'),rawLogo=logos[norm(name)]||domLogo?.currentSrc||domLogo?.getAttribute('src')||window.RUSSchoolAssets?.logoUrl?.(name)||'',color=getComputedStyle(row).getPropertyValue('--review-team-color').trim()||'#555555';return{name,score,color,winner:row.classList.contains('winner'),logo:await loadCanvasImage(rawLogo)}}));return{label:text('.review-label')||'Week in Review',final:text('.review-final')||'Final',blurb:text('p'),teams};
  }
  function drawReviewTeamRow(c,team,x,y,w,h,large=false){
    c.fillStyle='#101010';c.strokeStyle=team.color;c.lineWidth=large?4:2;canvasRoundRect(c,x,y,w,h,large?17:9);c.fill();c.stroke();c.fillStyle=rgba(team.color,team.winner?.26:.12);canvasRoundRect(c,x+4,y+4,w-8,h-8,large?14:7);c.fill();
    const pad=large?24:11,logoSize=Math.min(h-pad*2,large?150:38);drawContainedImage(c,team.logo,x+pad,y+(h-logoSize)/2,logoSize,logoSize);const scoreW=large?150:52,copyX=x+pad+logoSize+(large?26:10),copyW=x+w-pad-scoreW-copyX;
    c.fillStyle='#777';canvasFont(c,large?15:9,900);c.textAlign='left';c.fillText(team.winner?'WINNER':'FINAL',copyX,y+(large?42:17));c.fillStyle=team.winner?'#fff':'#d0d0d0';fitCanvasFont(c,team.name,Math.max(70,copyW),large?39:16,large?22:10,900);c.fillText(team.name.toUpperCase(),copyX,y+h/2+(large?25:6));c.fillStyle=team.winner?'#fff':'#bbb';fitCanvasFont(c,team.score,scoreW,large?86:30,large?50:20,900);c.textAlign='right';c.fillText(team.score,x+w-pad,y+h/2+(large?27:10));
  }
  async function renderWeekReviewCard(card,w,h,label){
    const logos=await loadLogoCache(),item=await reviewCardData(card,logos);if(item.teams.length<2)throw new Error('Review game is not ready');const story=h>w*1.3,landscape=w>h*1.25,out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d'),bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#050505');bg.addColorStop(.7,'#111');bg.addColorStop(1,'#080808');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#F14D07';c.fillRect(0,0,w,12);c.fillStyle='#fff';canvasFont(c,landscape?44:42,900);c.textAlign='left';c.fillText('WEEK IN REVIEW',50,landscape?59:63);c.fillStyle='#F14D07';canvasFont(c,landscape?18:19,900);c.fillText(`2026 FOOTBALL • ${item.label.toUpperCase()}`,50,landscape?91:96);
    const cardBox=landscape?{x:48,y:120,w:w-96,h:h-178}:story?{x:48,y:145,w:w-96,h:h-225}:{x:48,y:125,w:w-96,h:h-190};c.fillStyle='#080808';c.strokeStyle='#3b3b3b';c.lineWidth=3;canvasRoundRect(c,cardBox.x,cardBox.y,cardBox.w,cardBox.h,20);c.fill();c.stroke();c.fillStyle='#F14D07';canvasRoundRect(c,cardBox.x,cardBox.y,13,cardBox.h,7);c.fill();
    c.fillStyle='#F14D07';fitCanvasFont(c,item.label,cardBox.w-90,landscape?34:36,22,900);c.textAlign='left';c.fillText(item.label.toUpperCase(),cardBox.x+42,cardBox.y+66);
    if(landscape){drawReviewTeamRow(c,item.teams[0],cardBox.x+42,cardBox.y+115,(cardBox.w-112)/2,290,true);drawReviewTeamRow(c,item.teams[1],cardBox.x+70+(cardBox.w-112)/2,cardBox.y+115,(cardBox.w-112)/2,290,true);c.fillStyle='#888';canvasFont(c,18,900);c.textAlign='center';c.fillText(item.final.toUpperCase(),w/2,cardBox.y+455);c.fillStyle='#fff';canvasFont(c,27,800);drawCanvasLines(c,item.blurb,w/2,cardBox.y+520,cardBox.w-130,38,3,'center');
    }else{const panelX=cardBox.x+42,panelW=cardBox.w-84,panelH=story?330:178,firstY=cardBox.y+(story?145:115),gap=story?45:25;drawReviewTeamRow(c,item.teams[0],panelX,firstY,panelW,panelH,true);drawReviewTeamRow(c,item.teams[1],panelX,firstY+panelH+gap,panelW,panelH,true);const finalY=firstY+panelH*2+gap+(story?72:48);c.fillStyle='#888';canvasFont(c,story?23:18,900);c.textAlign='center';c.fillText(item.final.toUpperCase(),w/2,finalY);const blurbY=finalY+(story?95:65);c.fillStyle='#111';c.strokeStyle='#333';c.lineWidth=2;canvasRoundRect(c,cardBox.x+42,blurbY-42,cardBox.w-84,story?245:125,14);c.fill();c.stroke();c.fillStyle='#fff';canvasFont(c,story?31:25,800);drawCanvasLines(c,item.blurb,w/2,blurbY+15,cardBox.w-140,story?44:36,story?4:3,'center')}
    c.save();c.globalAlpha=.035;c.fillStyle='#fff';canvasFont(c,story?300:230,900);c.textAlign='right';c.fillText('RUS',cardBox.x+cardBox.w-28,cardBox.y+cardBox.h-22);c.restore();c.fillStyle='#777';canvasFont(c,15,800);c.textAlign='left';c.fillText('ruralutahsports.github.io',50,h-27);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png',1));if(!blob)throw new Error('PNG export failed');return blob;
  }
  async function renderWeekReviewCollection(grid,w,h){
    const cards=[...grid.querySelectorAll('[data-review-card]')].slice(0,8),logos=await loadLogoCache();if(!cards.length)throw new Error('Week in Review is still loading');const items=await Promise.all(cards.map(card=>reviewCardData(card,logos))),story=h>w*1.3,landscape=w>h*1.25,out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d'),bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#050505');bg.addColorStop(.72,'#111');bg.addColorStop(1,'#070707');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#F14D07';c.fillRect(0,0,w,12);c.fillStyle='#fff';fitCanvasFont(c,'WEEK IN REVIEW',w-100,landscape?44:42,28,900);c.textAlign='left';c.fillText('WEEK IN REVIEW',50,landscape?59:63);c.fillStyle='#F14D07';canvasFont(c,landscape?18:19,900);c.fillText('2026 FOOTBALL • FINAL-GAME HIGHLIGHTS',50,landscape?91:96);
    const drawTile=(item,x,y,tileW,tileH)=>{const compact=tileH<270,pad=compact?13:17,rowH=compact?48:73,gap=compact?6:9,start=y+(compact?40:49);c.fillStyle='#090909';c.strokeStyle='#363636';c.lineWidth=2;canvasRoundRect(c,x,y,tileW,tileH,13);c.fill();c.stroke();c.fillStyle='#F14D07';fitCanvasFont(c,item.label,tileW-pad*2,compact?16:20,11,900);c.textAlign='left';c.fillText(item.label.toUpperCase(),x+pad,y+(compact?27:32));item.teams.slice(0,2).forEach((team,i)=>drawReviewTeamRow(c,team,x+pad,start+i*(rowH+gap),tileW-pad*2,rowH,false));const finalY=start+rowH*2+gap+(compact?17:25);c.fillStyle='#777';canvasFont(c,compact?9:11,900);c.textAlign='center';c.fillText(item.final.toUpperCase(),x+tileW/2,finalY);c.fillStyle='#d0d0d0';canvasFont(c,compact?10:13,700);drawCanvasLines(c,item.blurb,x+tileW/2,finalY+(compact?20:27),tileW-pad*2,compact?13:17,compact?1:2,'center')};
    const cols=story?1:landscape?4:2,startY=story?125:120,bottom=story?52:48,gap=story?10:landscape?13:12,rows=Math.ceil(items.length/cols),tileW=story?w-100:(w-100-gap*(cols-1))/cols,tileH=(h-startY-bottom-gap*(rows-1))/rows;items.forEach((item,i)=>{const row=Math.floor(i/cols),index=i%cols,count=Math.min(cols,items.length-row*cols),total=count*tileW+(count-1)*gap,x=(w-total)/2+index*(tileW+gap);drawTile(item,x,startY+row*(tileH+gap),tileW,tileH)});c.fillStyle='#777';canvasFont(c,15,800);c.textAlign='left';c.fillText('ruralutahsports.github.io',50,h-22);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png',1));if(!blob)throw new Error('PNG export failed');return blob;
  }
  function renderWeekReviewTarget(el,w,h,label){return el?.matches?.('.week-review-grid')?renderWeekReviewCollection(el,w,h,label):renderWeekReviewCard(el,w,h,label)}
  function statLeaderHeadline(category,metric){
    const key=`${norm(category)}|${norm(metric)}`,headlines={
      'PASSING|YARDS':'PASSING YARDS LEADERS','PASSING|TD':'PASSING TDS LEADERS','PASSING|COMP-ATT':'PASS COMPLETION LEADERS','PASSING|COMP %':'COMPLETION PERCENTAGE LEADERS','PASSING|YARDS/COMP.':'YARDS PER COMPLETION LEADERS','PASSING|INT':'PASSING INTERCEPTION LEADERS',
      'RUSHING|YARDS':'RUSHING YARDS LEADERS','RUSHING|TD':'RUSHING TOUCHDOWN LEADERS','RUSHING|CARRIES':'RUSHING ATTEMPT LEADERS','RUSHING|YARDS/CARRY':'YARDS PER CARRY LEADERS',
      'RECEIVING|YARDS':'RECEIVING YARDS LEADERS','RECEIVING|TD':'RECEIVING TOUCHDOWN LEADERS','RECEIVING|RECEPTIONS':'RECEPTION LEADERS','RECEIVING|YARDS/RECEP.':'YARDS PER RECEPTION LEADERS',
      'KICKING|POINTS':'KICKING POINTS LEADERS','KICKING|FG':'FIELD GOAL LEADERS','KICKING|LONG FG':'LONGEST FIELD GOAL LEADERS','KICKING|PAT':'PAT LEADERS',
      'DEFENSE/SPECIAL TEAMS|TACKLES':'TACKLE LEADERS','DEFENSE/SPECIAL TEAMS|SACKS':'SACK LEADERS','DEFENSE/SPECIAL TEAMS|PASS INT.':'INTERCEPTION LEADERS','DEFENSE/SPECIAL TEAMS|DEFENSE TD':'DEFENSIVE TOUCHDOWN LEADERS','DEFENSE/SPECIAL TEAMS|RETURN TD':'RETURN TOUCHDOWN LEADERS'
    };return headlines[key]||`${String(category||'STAT').toUpperCase()} ${String(metric||'').toUpperCase()} LEADERS`.replace(/\s+/g,' ').trim();
  }
  async function renderStatLeaderCategory(w,h){
    const data=window.RUSStatLeadersShareData?.();
    if(!data?.players?.length||!data?.metrics?.length)throw new Error('Stat leaders are still loading');
    const logos=await loadLogoCache(),players=await Promise.all(data.players.slice(0,10).map(async player=>{
      const rawLogo=logos[norm(player.team)]||window.RUSSchoolAssets?.logoUrl?.(player.team)||'';
      return{...player,logo:await loadCanvasImage(rawLogo)};
    }));
    const story=h>w*1.3,landscape=w>h*1.25,out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d'),bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#050505');bg.addColorStop(.72,'#111');bg.addColorStop(1,'#080808');c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
    const margin=landscape?50:44,title=statLeaderHeadline(data.category,data.rankMetric),titleY=landscape?57:64;c.fillStyle='#fff';c.textAlign='left';c.textBaseline='alphabetic';fitCanvasFont(c,title,w-margin*2,landscape?43:42,25,900);c.fillText(title,margin,titleY);
    const scope=`${data.season} • ${String(data.scope).toUpperCase()} • ${String(data.classification).toUpperCase()}`;c.fillStyle='#F14D07';fitCanvasFont(c,scope,w-margin*2,landscape?18:19,12,900);c.fillText(scope,margin,landscape?88:97);
    const rankNote=`RANKED BY ${String(data.rankMetric).toUpperCase()} • TOP ${players.length} REPORTED PLAYER${players.length===1?'':'S'}`;c.fillStyle='#777';fitCanvasFont(c,rankNote,w-margin*2,landscape?14:15,10,900);c.fillText(rankNote,margin,landscape?115:126);
    const tableX=margin,tableW=w-margin*2,startY=landscape?137:story?160:153,footerH=landscape?53:64,headerH=landscape?40:44,rowH=(h-startY-footerH-headerH)/players.length,rankW=landscape?52:46,playerW=Math.max(300,Math.min(tableW*.38,landscape?560:410)),metricW=(tableW-rankW-playerW)/data.metrics.length,playerX=tableX+rankW;
    c.fillStyle='#F14D07';canvasRoundRect(c,tableX,startY,tableW,headerH,8);c.fill();c.fillStyle='#000';c.textBaseline='middle';canvasFont(c,landscape?12:11,900);c.textAlign='center';c.fillText('#',tableX+rankW/2,startY+headerH/2);c.textAlign='left';c.fillText('PLAYER / TEAM',playerX+12,startY+headerH/2);
    data.metrics.forEach((label,index)=>{const x=playerX+playerW+metricW*(index+.5);c.textAlign='center';fitCanvasFont(c,String(label).toUpperCase(),metricW-8,landscape?12:11,8,900);c.fillText(String(label).toUpperCase(),x,startY+headerH/2)});
    const rankId=String(data.rankMetric||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    players.forEach((player,index)=>{
      const y=startY+headerH+index*rowH,color=/^#[0-9a-f]{6}$/i.test(String(player.teamColor||''))?player.teamColor:'#555555',accentText=readableAccent(color),rank=index+1;c.fillStyle=index%2?'#0b0b0b':'#141414';c.fillRect(tableX,y,tableW,rowH);c.fillStyle=rgba(color,.16);c.fillRect(tableX,y,rankW+playerW,rowH);c.fillStyle=color;c.fillRect(tableX,y,6,rowH);c.strokeStyle='#2e2e2e';c.lineWidth=1;c.beginPath();c.moveTo(tableX,y+rowH);c.lineTo(tableX+tableW,y+rowH);c.stroke();
      c.fillStyle=rank<=3?'#F14D07':'#fff';canvasFont(c,landscape?20:22,900);c.textAlign='center';c.textBaseline='middle';c.fillText(String(rank),tableX+rankW/2,y+rowH/2);
      const logoSize=Math.min(rowH-12,story?82:landscape?48:58),logoX=playerX+10,logoY=y+(rowH-logoSize)/2;c.fillStyle='#090909';c.strokeStyle=color;c.lineWidth=2;canvasRoundRect(c,logoX,logoY,logoSize,logoSize,8);c.fill();c.stroke();if(player.logo)drawContainedImage(c,player.logo,logoX+5,logoY+5,logoSize-10,logoSize-10);else{const initials=String(player.team||'').split(/\s+/).map(word=>word[0]).join('').slice(0,3);c.fillStyle=accentText;fitCanvasFont(c,initials,logoSize-10,Math.min(23,logoSize*.42),10,900);c.textAlign='center';c.fillText(initials,logoX+logoSize/2,logoY+logoSize/2)}
      const copyX=logoX+logoSize+12,copyW=playerX+playerW-copyX-10,nameY=y+rowH/2-(story?15:10),metaY=y+rowH/2+(story?24:16);c.fillStyle='#fff';fitCanvasFont(c,player.name,copyW,story?28:landscape?19:22,12,900);c.textAlign='left';c.fillText(String(player.name),copyX,nameY);const playerMeta=`${player.number?`#${player.number} • `:''}${String(player.team).toUpperCase()} • ${String(player.classification).toUpperCase()}`;c.fillStyle=accentText;fitCanvasFont(c,playerMeta,copyW,story?16:landscape?10:12,8,900);c.fillText(playerMeta,copyX,metaY);
      data.metrics.forEach((label,metricIndex)=>{const id=String(label||'').toUpperCase().replace(/[^A-Z0-9]/g,''),x0=playerX+playerW+metricW*metricIndex,x=x0+metricW/2;if(id===rankId){c.fillStyle='rgba(241,77,7,.10)';c.fillRect(x0,y,metricW,rowH)}c.fillStyle=id===rankId?'#F14D07':'#f1f1f1';fitCanvasFont(c,String(player.values?.[label]??'—'),metricW-12,story?27:landscape?19:22,10,900);c.textAlign='center';c.fillText(String(player.values?.[label]??'—'),x,y+rowH/2)});
    });
    const footerY=h-footerH+18;c.textBaseline='alphabetic';c.fillStyle='#777';canvasFont(c,landscape?12:13,800);c.textAlign='left';c.fillText('Reported stats • missing fields shown as —',margin,footerY);c.fillStyle='#999';canvasFont(c,landscape?13:14,900);c.fillText('@ruralutahsports77',margin,h-17);c.textAlign='right';c.fillText('ruralutahsports.github.io',w-margin,h-17);
    const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png',1));if(!blob)throw new Error('PNG export failed');return blob;
  }
  async function waitForImages(root){
    const jobs=[...root.querySelectorAll('img')].map(img=>img.complete?(img.decode?img.decode().catch(()=>{}):Promise.resolve()):new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}));
    await Promise.race([Promise.all(jobs),new Promise(resolve=>setTimeout(resolve,5000))]);
  }
  async function render(el,w,h,label){
    await loadCanvas();document.documentElement.classList.add('rus-exporting');let special=null;
    try{
      special=await weeklyAwardSource(el,w,h,label)||await rankingSource(el,w,h);const target=special?.node||el;await waitForImages(target);
      const source=await html2canvas(target,{backgroundColor:'#111111',scale:2,useCORS:true,allowTaint:false,logging:false,windowWidth:Math.max(document.documentElement.clientWidth,target.scrollWidth)});
      const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d');c.fillStyle='#111';c.fillRect(0,0,w,h);
      let top=special?.top??120,bottom=special?.bottom??105,pad=special?.pad??42,maxW=w-pad*2,maxH=h-top-bottom;
      const scale=Math.min(maxW/source.width,maxH/source.height,2.1),dw=source.width*scale,dh=source.height*scale;
      const dx=(w-dw)/2,dy=special?top:top+(maxH-dh)/2;c.drawImage(source,dx,dy,dw,dh);
      c.fillStyle='#F14D07';c.fillRect(0,0,w,12);
      c.fillStyle='#fff';let titleSize=w>=1500?42:38;c.font=`900 ${titleSize}px Arial`;while(titleSize>24&&c.measureText(label).width>w-100){titleSize-=2;c.font=`900 ${titleSize}px Arial`}c.textAlign='left';c.fillText(label,50,58);
      c.fillStyle='#F14D07';c.font='900 21px Arial';c.fillText('RURAL UTAH SPORTS',50,91);
      c.fillStyle='#888';c.font='700 16px Arial';c.fillText('ruralutahsports.github.io',50,h-28);
      return await new Promise(r=>out.toBlob(r,'image/png',1));
    }finally{special?.node?.remove();document.documentElement.classList.remove('rus-exporting')}
  }
  function showSharePreview(blob,name,file){
    const url=URL.createObjectURL(blob),overlay=document.createElement('div');overlay.className='rus-share-preview';overlay.innerHTML=`<div class="rus-share-preview-card"><h3>Your graphic is ready</h3><p>Tap Share PNG. You can also press and hold the image to save it.</p><img src="${url}" alt="Generated Rural Utah Sports graphic"><div class="rus-share-preview-actions"><button type="button" class="primary rus-preview-share">Share PNG</button><a href="${url}" download="${esc(name)}">Save PNG</a><button type="button" class="rus-preview-close" style="grid-column:1/-1">Close</button></div></div>`;document.body.appendChild(overlay);
    const close=()=>{overlay.remove();setTimeout(()=>URL.revokeObjectURL(url),500)};overlay.querySelector('.rus-preview-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});const share=overlay.querySelector('.rus-preview-share');
    if(!(navigator.share&&navigator.canShare?.({files:[file]})))share.remove();else share.onclick=async()=>{try{await navigator.share({files:[file],title:'Rural Utah Sports'});close()}catch(e){if(e?.name!=='AbortError')console.error(e)}};
  }
  async function deliver(blob,name){
    const file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Rural Utah Sports'});return}catch(e){if(e?.name==='AbortError')return}}
    if(matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){showSharePreview(blob,name,file);return}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  function standingsRegions(){
    return [...document.querySelectorAll('.group')].map((el,i)=>({el,title:(el.querySelector('.group-title')?.textContent||`Region ${i+1}`).trim()})).filter(x=>x.title);
  }
  async function ensureRegionView(){
    if(!PAGE.includes('standings'))return;
    const btn=document.getElementById('regionBtn');
    if(btn&&!btn.classList.contains('active')){
      btn.click();
      await new Promise(r=>setTimeout(r,90));
    }
    const filter=document.getElementById('filter');
    if(filter&&filter.value!=='all'){
      filter.value='all';
      filter.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(r=>setTimeout(r,70));
    }
  }
  async function make(format,target=null,labelOverride='',preparedBlob=null){
    const el=target||currentSection(),label=labelOverride||titleFor(el),dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const weeklyTarget=PAGE==='weekly-awards.html'&&el?.matches?.('.award-card,.class-card,.class-grid');
    const reviewTarget=IS_HOME&&el?.matches?.('.review-card,.week-review-grid');
    const statTarget=IS_STAT_LEADERS&&el?.id==='results';
    const blob=preparedBlob||(weeklyTarget?await renderWeeklyTarget(el,dims[0],dims[1],label):reviewTarget?await renderWeekReviewTarget(el,dims[0],dims[1],label):statTarget?await renderStatLeaderCategory(dims[0],dims[1]):await render(el,dims[0],dims[1],label));await deliver(blob,`rural-utah-sports-${format}-${Date.now()}.png`);
  }
  async function modal(initialTarget=null,initialLabel=''){
    if(PAGE.includes('standings')&&window.RUSStandingsShare?.openModal)return window.RUSStandingsShare.openModal();
    let standingsControls='';
    if(PAGE.includes('standings')){
      await ensureRegionView();
      const regions=standingsRegions();
      const classSelect=document.getElementById('filter');
      const classes=classSelect?[...classSelect.options].filter(o=>o.value&&o.value!=='all').map(o=>({value:o.value,label:o.textContent.trim()})):[];
      standingsControls=`<label class="rus-share-region-label">Share View</label><select class="rus-share-region rus-share-standings-scope"><option value="region">Single Region</option><option value="classification">Whole Classification — Region by Region</option></select><div class="rus-share-region-picker"><label class="rus-share-region-label">Region</label><select class="rus-share-region rus-share-region-select">${regions.map((r,i)=>`<option value="${i}">${esc(r.title)}</option>`).join('')}</select></div><div class="rus-share-class-picker" style="display:none"><label class="rus-share-region-label">Classification</label><select class="rus-share-region rus-share-class-select">${classes.map(c=>`<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select></div>`;
    }
    const collectionTarget=initialTarget?.matches?.('.class-grid'),reviewCollection=initialTarget?.matches?.('.week-review-grid'),reviewCard=initialTarget?.matches?.('.review-card'),statTarget=IS_STAT_LEADERS&&initialTarget?.id==='results',el=document.createElement('div');el.className='rus-share-modal';el.innerHTML=`<div class="rus-share-sheet"><h3>Share Graphic</h3><p>${PAGE.includes('standings')?'Share one region, or choose a whole classification to put every region in that class on one graphic using the same region-by-region standings look.':collectionTarget?'Creates one branded graphic featuring all seven classification MVPs.':reviewCollection?'Creates one branded graphic with every available Week in Review highlight.':reviewCard?'Creates a branded graphic for this Week in Review highlight.':statTarget?'Creates one leaderboard graphic with the top reported players and every tracked metric for this category and filter.':initialTarget?'Creates a branded graphic for this weekly award using the player’s school colors, logo, stats and result.':'Creates a branded graphic from the section currently in view. Rankings use team colors, local logos and a layout that fills the canvas.'}</p>${standingsControls}<div class="rus-share-grid"><button class="rus-share-option" data-f="square"><strong>Instagram Post</strong>1080 × 1080</button><button class="rus-share-option" data-f="story"><strong>Instagram Story</strong>1080 × 1920</button><button class="rus-share-option" data-f="x"><strong>X Post</strong>1600 × 900</button><button class="rus-share-option" data-f="square"><strong>Square PNG</strong>Download / Share</button></div><button class="rus-share-close">Cancel</button></div>`;
    document.body.appendChild(el);
    const preparedDirect=new Map(),weeklyShare=PAGE==='weekly-awards.html'&&initialTarget?.matches?.('.award-card,.class-card,.class-grid'),reviewShare=IS_HOME&&initialTarget?.matches?.('.review-card,.week-review-grid'),statShare=IS_STAT_LEADERS&&initialTarget?.id==='results';
    if(weeklyShare||reviewShare||statShare){
      const buttons=[...el.querySelectorAll('[data-f]')],original=new Map(buttons.map(button=>[button,button.innerHTML]));buttons.forEach(button=>{button.disabled=true;button.innerHTML=button.innerHTML.replace(/(<strong>.*?<\/strong>)[\s\S]*/,'$1Preparing…')});
      [...new Set(buttons.map(button=>button.dataset.f))].forEach(async format=>{const dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];try{const blob=statShare?await renderStatLeaderCategory(dims[0],dims[1]):reviewShare?await renderWeekReviewTarget(initialTarget,dims[0],dims[1],initialLabel||titleFor(initialTarget)):await renderWeeklyTarget(initialTarget,dims[0],dims[1],initialLabel||titleFor(initialTarget));preparedDirect.set(format,blob);buttons.filter(button=>button.dataset.f===format).forEach(button=>{button.disabled=false;button.innerHTML=original.get(button)})}catch(error){console.error(error);buttons.filter(button=>button.dataset.f===format).forEach(button=>{button.disabled=false;button.innerHTML='<strong>Try Again</strong>Tap to retry'})}});
    }
    const scope=el.querySelector('.rus-share-standings-scope');
    if(scope){
      const sync=()=>{const whole=scope.value==='classification';el.querySelector('.rus-share-region-picker').style.display=whole?'none':'';el.querySelector('.rus-share-class-picker').style.display=whole?'':'none'};
      scope.addEventListener('change',sync);sync();
    }
    el.querySelector('.rus-share-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelectorAll('[data-f]').forEach(b=>b.onclick=async()=>{const f=b.dataset.f;b.disabled=true;b.textContent='Creating…';try{let target=initialTarget,label=initialLabel;if(PAGE.includes('standings')){const shareScope=el.querySelector('.rus-share-standings-scope')?.value||'region';if(shareScope==='classification'){
          const filter=document.getElementById('filter'),classValue=el.querySelector('.rus-share-class-select')?.value||'',classLabelText=el.querySelector('.rus-share-class-select')?.selectedOptions?.[0]?.textContent?.trim()||classValue;
          if(filter&&classValue){filter.value=classValue;filter.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,90));}
          target=document.getElementById('content');label=`${classLabelText} Standings • Region by Region`;
        }else{
          if(document.getElementById('filter')?.value!=='all'){const filter=document.getElementById('filter');filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,70));}
          const regions=standingsRegions(),idx=Number(el.querySelector('.rus-share-region-select')?.value||0);target=regions[idx]?.el||null;
        }}await make(f,target,label,preparedDirect.get(f)||null);el.remove()}catch(err){console.error(err);b.disabled=false;b.textContent='Try Again';alert('Could not create the graphic. Please try again.')}});
  }
  Object.assign(window.RUSShareGraphic,{openModal:modal,make});
  function init(){if(PAGE==='weekly-awards.html')return;if(IS_STAT_LEADERS){document.getElementById('shareStatCategory')?.addEventListener('click',()=>{const data=window.RUSStatLeadersShareData?.();if(!data?.players?.length)return alert('Stat leaders are still loading for this filter.');modal(document.getElementById('results'),`${data.category} Leaders • ${data.season} ${data.scope}`)});return}if(IS_HOME){document.getElementById('shareWeekReview')?.addEventListener('click',()=>{const target=document.getElementById('weekReviewGrid');if(!target?.querySelector('[data-review-card]'))return alert('Week in Review highlights are still loading.');modal(target,'2026 Football • Week in Review')});document.addEventListener('click',event=>{const button=event.target.closest?.('.review-share-button');if(!button)return;const target=button.closest('.review-card'),label=(target?.querySelector('.review-label')?.textContent||'Week in Review').trim();modal(target,`${label} • Week in Review`)});return}if(PAGE==='scoreboard.html'&&document.getElementById('shareScoreboardGrid'))return;const b=document.createElement('button');b.className='rus-share-btn rus-share-float';b.textContent='Share Graphic';b.onclick=()=>modal();document.body.appendChild(b)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
