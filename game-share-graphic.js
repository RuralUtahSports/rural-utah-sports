(()=>{
  'use strict';
  if(!/\/game\.html$/i.test(location.pathname)||window.RUSGameShareGraphic)return;

  const ORANGE='#F14D07';
  const HOME_FIELD_POINTS=3;
  const q=new URLSearchParams(location.search);
  const requestedAway=q.get('away')||q.get('team1')||'';
  const requestedHome=q.get('home')||q.get('team2')||'';
  const requestedDate=q.get('date')||'';
  if(!requestedAway||!requestedHome)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
  const compact=v=>norm(v).replace(/[^A-Z0-9]/g,'');
  const aliases={'CEDAR':'CEDAR CITY','MONUMENT VAL':'MONUMENT VALLEY','GUNNISON':'GUNNISON VALLEY','GRAND COUNTY':'GRAND'};
  const canon=v=>aliases[norm(v)]||norm(v);
  const safeHex=(v,fallback='#222222')=>/^#[0-9a-f]{6}$/i.test(String(v||'').trim())?String(v).trim():fallback;
  const asNumber=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const withTimeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

  function dateParts(value){
    const text=String(value||'').trim();
    let m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m)return{year:Number(m[3]),month:Number(m[1]),day:Number(m[2])};
    m=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m)return{year:Number(m[1]),month:Number(m[2]),day:Number(m[3])};
    const d=new Date(text);
    return Number.isFinite(d.getTime())?{year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()}:null;
  }

  function isoDate(value){
    const p=dateParts(value);
    return p?`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`:'';
  }

  function formatDate(value){
    const p=dateParts(value);
    if(!p)return String(value||'DATE TBA').toUpperCase();
    return new Date(p.year,p.month-1,p.day).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  }

  function gameKey(date,away,home){return`${isoDate(date)}|${compact(away)}|${compact(home)}`}
  function pairMatches(game,away,home){
    const ga=norm(game?.awayTeam),gh=norm(game?.homeTeam),a=norm(away),h=norm(home);
    return(ga===a&&gh===h)||(ga===h&&gh===a);
  }
  function recordText(row){
    if(!row)return'';
    const wins=asNumber(row.wins)??0,losses=asNumber(row.losses)??0,ties=asNumber(row.ties)??0;
    return`${wins}-${losses}${ties?`-${ties}`:''}`;
  }
  function initials(name){return norm(name).split(' ').filter(Boolean).slice(0,3).map(x=>x[0]).join('')||'RUS'}
  function absoluteAsset(src){
    if(!src)return'';
    if(/^data:/i.test(src))return src;
    try{return new URL(src,location.href).href}catch{return src}
  }
  function logoFor(name,logos){return absoluteAsset(logos[norm(name)]||logos[canon(name)]||window.RUSSchoolAssets?.logoUrl?.(name)||'')}
  function teamInfo(map,name){return map.get(canon(name))||map.get(norm(name))||null}
  function teamMeta(info){return[info?.classification,info?.region?`Region ${info.region}`:''].filter(Boolean).join(' • ')}
  function safeFilename(value){return String(value||'game').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

  let dataPromise=null;
  async function loadGameData(){
    if(dataPromise)return dataPromise;
    dataPromise=(async()=>{
      const stamp=Date.now();
      const files=['weekly-simulation.json','teams-data.json','standings-2026.json','elo-summary.json','school-logo-cache.json','deseret-game-details.json'];
      const values=await Promise.all(files.map(file=>fetch(`${file}?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)));
      const [weekly,teams,standings,elo,logosRaw,details]=values;
      const logos=logosRaw||{};
      try{
        const svg=await fetch(`school-logos/rich-user.svg?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.text():'');
        const embedded=(svg.match(/href=["'](data:image\/(?:png|webp);base64,[^"']+)["']/i)||[])[1]||'';
        if(embedded)logos.RICH=embedded;
      }catch{}

      const current=(weekly?.games||[]).find(game=>isoDate(game.date)===isoDate(requestedDate)&&pairMatches(game,requestedAway,requestedHome));
      const away=current?.awayTeam||requestedAway;
      const home=current?.homeTeam||requestedHome;
      const date=current?.date||requestedDate;
      const detail=details?.games?.[gameKey(date,away,home)]||details?.games?.[gameKey(date,home,away)]||null;
      const detailRows=detail?.boxScore?.rows||[];
      const weeklyAway=asNumber(current?.actualAway),weeklyHome=asNumber(current?.actualHome);
      const detailAway=asNumber(detailRows[0]?.total),detailHome=asNumber(detailRows[1]?.total);
      const queryAway=q.has('score1')?asNumber(q.get('score1')):null;
      const queryHome=q.has('score2')?asNumber(q.get('score2')):null;
      const weeklyFinal=weeklyAway!==null&&weeklyHome!==null;
      const detailFinal=detailAway!==null&&detailHome!==null&&(detail?.final===true||/final/i.test(String(detail?.status||'')));
      const queryFinal=!current&&queryAway!==null&&queryHome!==null;
      const final=weeklyFinal||detailFinal||queryFinal;
      const actualAway=weeklyFinal?weeklyAway:detailFinal?detailAway:queryFinal?queryAway:null;
      const actualHome=weeklyFinal?weeklyHome:detailFinal?detailHome:queryFinal?queryHome:null;
      const live=!final&&/live|q[1-4]|half|ot/i.test(String(detail?.status||''));

      const rawAway=asNumber(current?.awayScore),rawHome=asNumber(current?.homeScore);
      const hasPrediction=rawAway!==null&&rawHome!==null;
      const predictedAway=hasPrediction?rawAway:null;
      const predictedHome=hasPrediction?rawHome+HOME_FIELD_POINTS:null;
      const projectedTotal=hasPrediction?predictedAway+predictedHome:null;
      const projectedMargin=hasPrediction?Math.abs(predictedAway-predictedHome):null;
      const line=hasPrediction?(predictedAway===predictedHome?"PICK'EM":`${predictedAway>predictedHome?away:home} -${projectedMargin}`):'LINE UNAVAILABLE';

      const teamMap=new Map();
      for(const item of teams||[])if(item?.team){teamMap.set(norm(item.team),item);teamMap.set(canon(item.team),item)}
      const standingRows=Object.values(standings?.byClassification||{}).flat().filter(Boolean);
      const standingMap=new Map(standingRows.map(row=>[norm(row.team),row]));
      const gameYear=dateParts(date)?.year||null;
      const standingsYear=asNumber(standings?.season);
      const useStandings=!standingsYear||!gameYear||standingsYear===gameYear;
      const awayInfo=teamInfo(teamMap,away)||standingMap.get(norm(away))||{};
      const homeInfo=teamInfo(teamMap,home)||standingMap.get(norm(home))||{};
      const awayStanding=useStandings?standingMap.get(norm(away)):null;
      const homeStanding=useStandings?standingMap.get(norm(home)):null;

      const awayElo=asNumber(elo?.[norm(away)]?.currentElo),homeElo=asNumber(elo?.[norm(home)]?.currentElo);
      const hasElo=awayElo!==null&&homeElo!==null;
      const homeChance=hasElo?Math.round(100/(1+Math.pow(10,(awayElo-homeElo)/400))):null;
      const awayChance=hasElo?100-homeChance:null;

      return{
        away,home,date,year:gameYear,final,live,
        status:final?'FINAL':live?String(detail?.status||'LIVE').toUpperCase():'UPCOMING',
        actualAway,actualHome,predictedAway,predictedHome,projectedTotal,projectedMargin,line,
        awayChance,homeChance,
        awayInfo,homeInfo,
        awayRecord:recordText(awayStanding),homeRecord:recordText(homeStanding),
        awayLogo:logoFor(away,logos),homeLogo:logoFor(home,logos)
      };
    })().catch(error=>{dataPromise=null;throw error});
    return dataPromise;
  }

  function addStyles(){
    if(document.getElementById('rus-game-share-css'))return;
    const style=document.createElement('style');
    style.id='rus-game-share-css';
    style.textContent=`
      .rus-game-share-actions{display:flex;gap:10px;align-items:center;margin:0 0 18px}.rus-game-share-trigger{appearance:none;border:1px solid ${ORANGE};border-radius:8px;background:${ORANGE};color:#000;padding:12px 17px;font:1000 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;box-shadow:0 7px 20px rgba(241,77,7,.2)}.rus-game-share-trigger:hover{filter:brightness(1.1)}.rus-game-share-trigger:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .rus-gs-modal{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.84);backdrop-filter:blur(5px)}.rus-gs-sheet{width:min(560px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#111;border:1px solid #3b3b3b;border-top:7px solid ${ORANGE};border-radius:16px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.75)}.rus-gs-sheet h2{font-size:24px;line-height:1.1;text-transform:uppercase}.rus-gs-sheet>p{margin:8px 0 18px;color:#aaa;font-size:13px;line-height:1.45}.rus-gs-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rus-gs-option{appearance:none;min-height:105px;border:1px solid #444;border-radius:10px;background:#1b1b1b;color:#fff;padding:13px 10px;cursor:pointer;text-align:left}.rus-gs-option:hover,.rus-gs-option:focus-visible{border-color:${ORANGE};background:#232323;outline:0}.rus-gs-option:disabled{opacity:.55;cursor:wait}.rus-gs-option strong,.rus-gs-option span{display:block}.rus-gs-option strong{font-size:14px;line-height:1.2}.rus-gs-option span{margin-top:8px;color:#999;font-size:11px}.rus-gs-close{width:100%;margin-top:12px;border:1px solid #444;border-radius:9px;background:#0a0a0a;color:#bbb;padding:12px;font-weight:900;text-transform:uppercase;cursor:pointer}
      .rus-gs-board,.rus-gs-board *{box-sizing:border-box}.rus-gs-board{position:fixed;left:-30000px;top:0;z-index:100001;display:flex;flex-direction:column;overflow:hidden;background:#101010;color:#fff;font-family:Arial,Helvetica,sans-serif}.rus-gs-topbar{height:14px;flex:0 0 14px;background:${ORANGE}}.rus-gs-brand{height:132px;flex:0 0 132px;display:flex;align-items:center;gap:22px;padding:20px 54px;border-bottom:1px solid #2d2d2d;background:#050505}.rus-gs-brand-logo{width:92px;height:92px;object-fit:contain}.rus-gs-brand-copy{min-width:0}.rus-gs-brand-name{font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:34px;font-weight:1000;letter-spacing:2px;line-height:1;text-transform:uppercase}.rus-gs-brand-tagline{margin-top:9px;color:${ORANGE};font-size:16px;font-weight:900}.rus-gs-brand-date{margin-left:auto;max-width:310px;color:#aaa;font-size:17px;font-weight:900;line-height:1.25;text-align:right;text-transform:uppercase}.rus-gs-content{display:flex;flex:1;min-height:0;flex-direction:column;gap:18px;padding:24px 54px 22px}.rus-gs-heading{display:flex;align-items:center;justify-content:space-between;gap:18px}.rus-gs-kicker{color:${ORANGE};font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:29px;font-weight:1000;letter-spacing:2px;text-transform:uppercase}.rus-gs-status{border:2px solid #555;border-radius:999px;background:#262626;color:#ddd;padding:9px 18px;font-size:16px;font-weight:1000;letter-spacing:1px}.rus-gs-status.final{border-color:${ORANGE};background:${ORANGE};color:#000}.rus-gs-matchup{display:grid;grid-template-columns:minmax(0,1fr) 116px minmax(0,1fr);gap:18px;align-items:stretch;flex:1;min-height:0}.rus-gs-team{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;padding:18px 18px 22px;border:1px solid #393939;border-top:12px solid var(--team-color);border-radius:14px;background:#050505;text-align:center}.rus-gs-logo-frame{position:relative;display:flex;width:190px;height:190px;align-items:center;justify-content:center;margin-bottom:18px}.rus-gs-team-logo{display:block;max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 9px 13px rgba(0,0,0,.6))}.rus-gs-monogram{display:none;width:150px;height:150px;align-items:center;justify-content:center;border:5px solid var(--team-color);border-radius:50%;color:var(--team-color);font-family:Arial Black,Arial,sans-serif;font-size:54px;font-weight:1000}.rus-gs-logo-frame.logo-missing .rus-gs-team-logo{display:none}.rus-gs-logo-frame.logo-missing .rus-gs-monogram{display:flex}.rus-gs-team-name{max-width:100%;border-radius:9px;background:var(--team-color);color:var(--team-text);padding:10px 15px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:34px;font-weight:1000;line-height:1.02;text-transform:uppercase;overflow-wrap:anywhere}.rus-gs-team-name.long{font-size:28px}.rus-gs-team-meta{margin-top:12px;color:#b3b3b3;font-size:19px;font-weight:900;line-height:1.2}.rus-gs-team-record{margin-top:7px;color:#777;font-size:17px;font-weight:700}.rus-gs-center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.rus-gs-vs{color:#777;font-family:Arial Black,Arial,sans-serif;font-size:36px;font-weight:1000}.rus-gs-final-score{color:#fff;font-family:Arial Black,Arial,sans-serif;font-size:40px;font-weight:1000;line-height:1}.rus-gs-location{margin-top:8px;color:#666;font-size:13px;font-weight:900;text-transform:uppercase}.rus-gs-projection{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 30px;align-items:center;flex:0 0 auto;border:1px solid #444;border-left:10px solid ${ORANGE};border-radius:13px;background:#050505;padding:18px 27px}.rus-gs-projection-label{color:${ORANGE};font-size:17px;font-weight:1000;letter-spacing:2px;text-transform:uppercase}.rus-gs-line{grid-row:1/3;grid-column:2;color:#fff;font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:46px;font-weight:1000;line-height:1;text-align:right;text-transform:uppercase}.rus-gs-projection-score{color:#aaa;font-size:20px;font-weight:900}.rus-gs-disclaimer{grid-column:1/-1;color:#666;font-size:12px;font-weight:900;letter-spacing:.4px;text-transform:uppercase}.rus-gs-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;flex:0 0 auto}.rus-gs-metric{border:1px solid #343434;border-radius:10px;background:#191919;padding:13px 8px;text-align:center}.rus-gs-metric strong{display:block;color:#fff;font-family:Arial Black,Arial,sans-serif;font-size:28px;line-height:1}.rus-gs-metric span{display:block;margin-top:7px;color:#888;font-size:11px;font-weight:1000;line-height:1.15;text-transform:uppercase}.rus-gs-footer{height:60px;flex:0 0 60px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 54px;border-top:1px solid #2d2d2d;background:#050505;color:#888;font-size:14px;font-weight:900}.rus-gs-footer strong{color:#fff;letter-spacing:.5px}
      .rus-gs-board.story .rus-gs-topbar{height:18px;flex-basis:18px}.rus-gs-board.story .rus-gs-brand{height:190px;flex-basis:190px;padding:28px 62px}.rus-gs-board.story .rus-gs-brand-logo{width:128px;height:128px}.rus-gs-board.story .rus-gs-brand-name{font-size:43px}.rus-gs-board.story .rus-gs-brand-tagline{font-size:21px}.rus-gs-board.story .rus-gs-brand-date{font-size:20px}.rus-gs-board.story .rus-gs-content{gap:30px;padding:42px 62px 38px}.rus-gs-board.story .rus-gs-kicker{font-size:42px}.rus-gs-board.story .rus-gs-status{font-size:20px;padding:12px 22px}.rus-gs-board.story .rus-gs-matchup{gap:22px;grid-template-columns:minmax(0,1fr) 120px minmax(0,1fr)}.rus-gs-board.story .rus-gs-team{border-top-width:16px;padding:28px 20px 34px}.rus-gs-board.story .rus-gs-logo-frame{width:270px;height:270px;margin-bottom:28px}.rus-gs-board.story .rus-gs-team-name{font-size:42px;padding:14px 18px}.rus-gs-board.story .rus-gs-team-name.long{font-size:34px}.rus-gs-board.story .rus-gs-team-meta{font-size:23px;margin-top:18px}.rus-gs-board.story .rus-gs-team-record{font-size:21px;margin-top:10px}.rus-gs-board.story .rus-gs-vs{font-size:47px}.rus-gs-board.story .rus-gs-final-score{font-size:48px}.rus-gs-board.story .rus-gs-projection{padding:30px 34px;border-left-width:13px}.rus-gs-board.story .rus-gs-projection-label{font-size:22px}.rus-gs-board.story .rus-gs-line{font-size:59px}.rus-gs-board.story .rus-gs-projection-score{font-size:26px}.rus-gs-board.story .rus-gs-disclaimer{font-size:15px}.rus-gs-board.story .rus-gs-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.rus-gs-board.story .rus-gs-metric{padding:24px 10px}.rus-gs-board.story .rus-gs-metric strong{font-size:40px}.rus-gs-board.story .rus-gs-metric span{font-size:15px}.rus-gs-board.story .rus-gs-footer{height:82px;flex-basis:82px;padding:0 62px;font-size:17px}
      .rus-gs-board.x .rus-gs-topbar{height:12px;flex-basis:12px}.rus-gs-board.x .rus-gs-brand{height:106px;flex-basis:106px;padding:14px 58px}.rus-gs-board.x .rus-gs-brand-logo{width:78px;height:78px}.rus-gs-board.x .rus-gs-brand-name{font-size:31px}.rus-gs-board.x .rus-gs-brand-tagline{font-size:14px;margin-top:6px}.rus-gs-board.x .rus-gs-brand-date{max-width:470px;font-size:16px}.rus-gs-board.x .rus-gs-content{gap:13px;padding:16px 58px 14px}.rus-gs-board.x .rus-gs-kicker{font-size:27px}.rus-gs-board.x .rus-gs-status{font-size:14px;padding:7px 15px}.rus-gs-board.x .rus-gs-matchup{grid-template-columns:minmax(0,1fr) 170px minmax(0,1fr);gap:22px}.rus-gs-board.x .rus-gs-team{display:grid;grid-template-columns:180px minmax(0,1fr);grid-template-rows:auto auto auto;column-gap:24px;padding:14px 26px;border-top-width:10px;text-align:left}.rus-gs-board.x .rus-gs-logo-frame{grid-row:1/4;width:180px;height:180px;margin:0}.rus-gs-board.x .rus-gs-team-name{justify-self:start;font-size:35px}.rus-gs-board.x .rus-gs-team-name.long{font-size:29px}.rus-gs-board.x .rus-gs-team-meta{font-size:18px}.rus-gs-board.x .rus-gs-team-record{font-size:16px}.rus-gs-board.x .rus-gs-vs{font-size:35px}.rus-gs-board.x .rus-gs-final-score{font-size:44px}.rus-gs-board.x .rus-gs-projection{padding:13px 25px;border-left-width:9px}.rus-gs-board.x .rus-gs-projection-label{font-size:15px}.rus-gs-board.x .rus-gs-line{font-size:40px}.rus-gs-board.x .rus-gs-projection-score{font-size:18px}.rus-gs-board.x .rus-gs-disclaimer{font-size:10px}.rus-gs-board.x .rus-gs-metric{padding:10px 8px}.rus-gs-board.x .rus-gs-metric strong{font-size:25px}.rus-gs-board.x .rus-gs-footer{height:44px;flex-basis:44px;padding:0 58px;font-size:12px}
      @media(max-width:600px){.rus-game-share-actions{margin-bottom:16px}.rus-game-share-trigger{width:100%;min-height:48px}.rus-gs-modal{align-items:flex-end;padding:10px}.rus-gs-sheet{border-radius:16px 16px 10px 10px;padding:18px}.rus-gs-options{grid-template-columns:1fr}.rus-gs-option{min-height:72px}.rus-gs-sheet h2{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function addButton(){
    if(document.getElementById('rus-game-share-actions'))return;
    const back=document.querySelector('.container .back');
    if(!back)return;
    const actions=document.createElement('div');
    actions.id='rus-game-share-actions';
    actions.className='rus-game-share-actions';
    actions.innerHTML='<button type="button" class="rus-game-share-trigger">Create Share Graphic</button>';
    back.insertAdjacentElement('afterend',actions);
    actions.querySelector('button').addEventListener('click',openModal);
  }

  function teamMarkup(name,info,logo,record,side){
    const color=safeHex(info?.backgroundColor,side==='away'?'#343434':'#4a4a4a');
    const text=safeHex(info?.textColor,'#FFFFFF');
    const long=String(name).length>14?' long':'';
    const logoHTML=logo?`<img class="rus-gs-team-logo" src="${esc(logo)}" alt="${esc(name)} logo">`:'';
    return`<section class="rus-gs-team" style="--team-color:${color};--team-text:${text}"><div class="rus-gs-logo-frame${logo?'':' logo-missing'}">${logoHTML}<div class="rus-gs-monogram">${esc(initials(name))}</div></div><div class="rus-gs-team-name${long}">${esc(name)}</div><div class="rus-gs-team-meta">${esc(teamMeta(info)||'Utah High School Football')}</div><div class="rus-gs-team-record">${record?`Season record: ${esc(record)}`:'Season record unavailable'}</div></section>`;
  }

  function metric(value,label){return`<div class="rus-gs-metric"><strong>${esc(value??'—')}</strong><span>${esc(label)}</span></div>`}

  function buildBoard(format,data){
    const [width,height]=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const board=document.createElement('div');
    board.className=`rus-gs-board ${format}`;
    board.style.width=`${width}px`;
    board.style.height=`${height}px`;
    const center=data.final?`<div class="rus-gs-final-score">${esc(data.actualAway)}<br>—<br>${esc(data.actualHome)}</div><div class="rus-gs-location">Final score</div>`:`<div class="rus-gs-vs">AT</div><div class="rus-gs-location">${esc(data.home)} home</div>`;
    const projectionScore=data.predictedAway!==null?`${data.away} ${data.predictedAway} • ${data.home} ${data.predictedHome}`:'Projection unavailable';
    const brandLogo=absoluteAsset('RUSlogoNew.png');
    board.innerHTML=`
      <div class="rus-gs-topbar"></div>
      <header class="rus-gs-brand"><img class="rus-gs-brand-logo" src="${esc(brandLogo)}" alt="Rural Utah Sports"><div class="rus-gs-brand-copy"><div class="rus-gs-brand-name">Rural Utah Sports</div><div class="rus-gs-brand-tagline">Utah High School Sports History &amp; Data</div></div><div class="rus-gs-brand-date">${esc(formatDate(data.date))}${data.year?`<br>${esc(data.year)} SEASON`:''}</div></header>
      <main class="rus-gs-content">
        <div class="rus-gs-heading"><div class="rus-gs-kicker">${data.final?'Game Result':'Game Preview'}</div><div class="rus-gs-status${data.final?' final':''}">${esc(data.status)}</div></div>
        <div class="rus-gs-matchup">${teamMarkup(data.away,data.awayInfo,data.awayLogo,data.awayRecord,'away')}<div class="rus-gs-center">${center}</div>${teamMarkup(data.home,data.homeInfo,data.homeLogo,data.homeRecord,'home')}</div>
        <section class="rus-gs-projection"><div class="rus-gs-projection-label">RUS Projected Line</div><div class="rus-gs-line">${esc(data.line)}</div><div class="rus-gs-projection-score">Projected score: ${esc(projectionScore)}</div><div class="rus-gs-disclaimer">Model-projected margin only — not a sportsbook or wagering line.</div></section>
        <div class="rus-gs-metrics">${metric(data.projectedTotal,'Projected total')}${metric(data.awayChance===null?'—':`${data.awayChance}%`,`${data.away} ELO chance`)}${metric(data.homeChance===null?'—':`${data.homeChance}%`,`${data.home} ELO chance`)}${metric(data.projectedMargin,'Projected margin')}</div>
      </main>
      <footer class="rus-gs-footer"><strong>ruralutahsports.github.io</strong><span>Includes a ${HOME_FIELD_POINTS}-point home-field adjustment</span></footer>`;
    board.querySelectorAll('.rus-gs-team-logo').forEach(img=>img.addEventListener('error',()=>img.closest('.rus-gs-logo-frame')?.classList.add('logo-missing'),{once:true}));
    document.body.appendChild(board);
    return{board,width,height};
  }

  let canvasPromise=null;
  function loadCanvas(){
    if(window.html2canvas)return Promise.resolve();
    if(canvasPromise)return canvasPromise;
    canvasPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='html2canvas.min.js?v=1.4.1';
      script.onload=()=>window.html2canvas?resolve():reject(new Error('The graphic renderer did not initialize.'));
      script.onerror=()=>reject(new Error('The graphic renderer could not be loaded.'));
      document.head.appendChild(script);
    });
    canvasPromise=withTimeout(canvasPromise,12000,'The graphic renderer took too long to load.').catch(error=>{canvasPromise=null;throw error});
    return canvasPromise;
  }

  async function waitForImages(board){
    const jobs=[...board.querySelectorAll('img')].map(img=>{
      if(img.complete)return img.decode?img.decode().catch(()=>{}):Promise.resolve();
      return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
    });
    await Promise.race([Promise.all(jobs),sleep(6000)]);
    await sleep(100);
  }

  async function createGraphic(format){
    const data=await loadGameData();
    await loadCanvas();
    const {board,width,height}=buildBoard(format,data);
    try{
      await waitForImages(board);
      const canvas=await withTimeout(window.html2canvas(board,{backgroundColor:'#101010',scale:1,useCORS:true,allowTaint:false,logging:false,imageTimeout:8000,width,height,windowWidth:width,windowHeight:height}),20000,'The game graphic took too long to render.');
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
      if(!blob)throw new Error('The PNG could not be created.');
      const filename=`rural-utah-sports-${safeFilename(data.away)}-at-${safeFilename(data.home)}-${isoDate(data.date)||'game'}.png`;
      if(typeof File==='function'&&navigator.share&&navigator.canShare){
        const file=new File([blob],filename,{type:'image/png'});
        if(navigator.canShare({files:[file]})){
          try{
            await withTimeout(
              navigator.share({files:[file],title:`${data.away} at ${data.home} | Rural Utah Sports`,text:`${data.away} at ${data.home} — ${formatDate(data.date)}`}),
              12000,
              'The share sheet did not open.'
            );
            return;
          }catch(error){
            if(error?.name==='AbortError')return;
            console.warn('Native sharing was unavailable; saving the PNG instead.',error);
          }
        }
      }
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download=filename;link.style.display='none';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }finally{board.remove()}
  }

  function openModal(){
    document.querySelector('.rus-gs-modal')?.remove();
    const previousOverflow=document.body.style.overflow;
    const modal=document.createElement('div');
    modal.className='rus-gs-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','rus-gs-title');
    modal.innerHTML=`<div class="rus-gs-sheet"><h2 id="rus-gs-title">Create Share Graphic</h2><p>Choose a size. The graphic uses the school logos, team colors, game details, adjusted RUS line and ELO chances shown for this matchup.</p><div class="rus-gs-options"><button type="button" class="rus-gs-option" data-format="square"><strong>Instagram Post</strong><span>1080 × 1080 PNG</span></button><button type="button" class="rus-gs-option" data-format="story"><strong>Instagram Story</strong><span>1080 × 1920 PNG</span></button><button type="button" class="rus-gs-option" data-format="x"><strong>X Post</strong><span>1600 × 900 PNG</span></button></div><button type="button" class="rus-gs-close">Cancel</button></div>`;
    document.body.appendChild(modal);
    document.body.style.overflow='hidden';
    const close=()=>{modal.remove();document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKey)};
    const onKey=event=>{if(event.key==='Escape')close()};
    modal.querySelector('.rus-gs-close').addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close()});
    document.addEventListener('keydown',onKey);
    modal.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',async()=>{
      const original=button.innerHTML;
      modal.querySelectorAll('button').forEach(item=>item.disabled=true);
      button.textContent='Creating…';
      try{await withTimeout(createGraphic(button.dataset.format),45000,'The game graphic took too long to create.');close()}
      catch(error){console.error(error);modal.querySelectorAll('button').forEach(item=>item.disabled=false);button.innerHTML=original;alert(error?.message||'Could not create the game graphic. Please check your connection and try again.')}
    }));
    modal.querySelector('[data-format]')?.focus();
  }

  window.RUSGameShareGraphic={openModal,createGraphic,loadGameData};
  function init(){addStyles();addButton()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
