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
  function graphicTeamInfo(info,name){
    return /^MOUNTAINVIEW(?:WY|WYOMING)$/.test(compact(name))
      ? {...info,backgroundColor:'#7A2F89',textColor:'#FFFFFF'}
      : info;
  }
  function teamMeta(info){return[info?.classification,info?.region?`Region ${info.region}`:''].filter(Boolean).join(' • ')}
  function safeFilename(value){return String(value||'game').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}


  function finalBox(detail,away,home,totals){
    const box=detail?.boxScore;
    if(!Array.isArray(box?.rows)||box.rows.length!==2)return null;
    let periods=(box.periods?.length?box.periods:['Q1','Q2','Q3','Q4']).map(p=>String(p).toUpperCase());
    const rows=[away,home].map(name=>box.rows.find(r=>canon(r.team)===canon(name)));
    if(rows.some(r=>!r))return null;
    const values=rows.map(r=>(r.quarters||[]).map(asNumber));
    if(values.some((v,i)=>v.length<4||v.some(n=>n===null||n<0)||v.reduce((a,b)=>a+b,0)!==totals[i]))return null;
    const count=Math.max(...values.map(v=>v.length));
    if(values.some(v=>v.length!==count))return null;
    while(periods.length<count)periods.push(periods.length<4?'Q'+(periods.length+1):periods.length===4?'OT':(periods.length-3)+' OT');
    if(periods.length!==count)return null;
    return{periods,rows:values};
  }
  function drawFinalBox(ctx,data,x,y,w,s){
    const box=data.quarterScores;
    rounded(ctx,x,y,w,130*s,16*s,'#050505','#444');
    ctx.textAlign='left';ctx.fillStyle=ORANGE;ctx.font=`900 ${16*s}px Arial`;ctx.fillText('QUARTER-BY-QUARTER',x+24*s,y+26*s);
    if(!box){ctx.fillStyle='#aaa';ctx.font=`900 ${17*s}px Arial`;ctx.fillText('Quarter scores not reported',x+24*s,y+78*s);return}
    const nameW=w*.36,cellW=(w-nameW-24*s)/(box.periods.length+1);
    [...box.periods,'FINAL'].forEach((label,i)=>{ctx.textAlign='center';ctx.fillStyle='#aaa';ctx.font=`900 ${14*s}px Arial`;ctx.fillText(label,x+nameW+cellW*(i+.5),y+49*s)});
    [data.away,data.home].forEach((name,i)=>{
      const ry=y+(80+i*30)*s;
      ctx.textAlign='left';ctx.fillStyle='#fff';fitText(ctx,name,nameW-32*s,18*s,12*s);ctx.fillText(name,x+24*s,ry);
      [...box.rows[i],i?data.actualHome:data.actualAway].forEach((n,j)=>{ctx.textAlign='center';ctx.fillStyle=j===box.periods.length?ORANGE:'#fff';ctx.font=`900 ${19*s}px Arial`;ctx.fillText(String(n),x+nameW+cellW*(j+.5),ry)});
    });
  }

  let dataPromise=null;
  async function loadGameData(){
    if(dataPromise)return dataPromise;
    dataPromise=(async()=>{
      const stamp=Date.now();
      const files=['weekly-simulation.json','teams-data.json','standings-2026.json','elo-summary.json','school-logo-cache.json','deseret-game-details.json','deseret-rosters-stats-2026.json'];
      const values=await Promise.all(files.map(file=>fetch(`${file}?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)));
      const [weekly,teams,standings,elo,logosRaw,details,seasonStats]=values;
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
      const awayInfo=graphicTeamInfo(teamInfo(teamMap,away)||standingMap.get(norm(away))||{},away);
      const homeInfo=graphicTeamInfo(teamInfo(teamMap,home)||standingMap.get(norm(home))||{},home);
      const awayStanding=useStandings?standingMap.get(norm(away)):null;
      const homeStanding=useStandings?standingMap.get(norm(home)):null;

      const awayElo=asNumber(elo?.[norm(away)]?.currentElo),homeElo=asNumber(elo?.[norm(home)]?.currentElo);
      const hasElo=awayElo!==null&&homeElo!==null;
      const homeChance=hasElo?Math.round(100/(1+Math.pow(10,(awayElo-homeElo)/400))):null;
      const awayChance=hasElo?100-homeChance:null;

      return{
        away,home,date,year:gameYear,final,live,
        quarterScores:final?finalBox(detail,away,home,[actualAway,actualHome]):null,
        status:final?'FINAL':live?String(detail?.status||'LIVE').toUpperCase():'UPCOMING',
        actualAway,actualHome,predictedAway,predictedHome,projectedTotal,projectedMargin,line,
        awayChance,homeChance,
        awayInfo,homeInfo,
        awayRecord:recordText(awayStanding),homeRecord:recordText(homeStanding),
        awayLogo:logoFor(away,logos),homeLogo:logoFor(home,logos),
        awayLeaders:teamStatLeaders(seasonStats,away),
        homeLeaders:teamStatLeaders(seasonStats,home)
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


  function statNumber(value){
    const match=String(value??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }
  function teamStatLeaders(stats,team){
    const teams=stats?.teams||{};
    const entry=teams[team]||teams[norm(team)]||Object.entries(teams).find(([name])=>canon(name)===canon(team))?.[1];
    const wants=[
      {label:'PASSING',category:'passing',metrics:['Yards'],suffix:'pass yds'},
      {label:'RUSHING',category:'rushing',metrics:['Yards'],suffix:'rush yds'},
      {label:'RECEIVING',category:'receiv',metrics:['Yards'],suffix:'rec yds'},
      {label:'DEFENSE',category:'defense',metrics:['Tackles','Sacks','Pass Int','Interceptions'],suffix:''}
    ];
    return wants.map(want=>{
      const section=(entry?.stats||[]).find(s=>String(s?.category||'').toLowerCase().startsWith(want.category));
      if(!section)return{label:want.label,name:'No reported leader',stat:''};
      let metricName='';
      for(const preferred of want.metrics){
        metricName=(section.headers||[]).find(h=>compact(h)===compact(preferred)||compact(h).includes(compact(preferred)))||'';
        if(metricName)break;
      }
      let best=null;
      for(const row of section.rows||[]){
        const value=statNumber(row?.values?.[metricName]);
        if(value!==null&&(!best||value>best.value))best={name:row.name||'Unknown',value,display:row.values?.[metricName]};
      }
      const suffix=want.suffix||String(metricName||'stat').toLowerCase();
      return best?{label:want.label,name:best.name,stat:`${best.display} ${suffix}`.trim()}:{label:want.label,name:'No reported leader',stat:''};
    });
  }

  function rounded(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  }
  function fitText(ctx,text,maxWidth,startSize,minSize=18){
    let size=startSize;ctx.font=`900 ${size}px Arial`;
    while(size>minSize&&ctx.measureText(String(text)).width>maxWidth){size-=2;ctx.font=`900 ${size}px Arial`}
    return size;
  }
  function loadDrawImage(src){
    if(!src)return Promise.resolve(null);
    return new Promise(resolve=>{
      const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;
      setTimeout(()=>resolve(null),6000);
    });
  }
  function drawContain(ctx,img,x,y,w,h){
    if(!img)return;
    const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  function drawLeaderColumn(ctx,x,y,w,title,color,leaders,scale){
    rounded(ctx,x,y,w,310*scale,18*scale,'#080808','#383838');
    ctx.fillStyle=color;ctx.fillRect(x,y,8*scale,310*scale);
    ctx.fillStyle='#fff';fitText(ctx,title,w-42*scale,27*scale,17*scale);ctx.textAlign='left';ctx.fillText(title,x+24*scale,y+37*scale);
    (leaders||[]).forEach((leader,index)=>{
      const rowY=y+(72+58*index)*scale;
      ctx.fillStyle='#777';ctx.font=`900 ${12*scale}px Arial`;ctx.fillText(leader.label,x+24*scale,rowY);
      ctx.fillStyle='#fff';fitText(ctx,leader.name,w-190*scale,18*scale,12*scale);ctx.fillText(leader.name,x+24*scale,rowY+23*scale);
      ctx.fillStyle=color;ctx.font=`900 ${15*scale}px Arial`;ctx.textAlign='right';ctx.fillText(leader.stat||'—',x+w-20*scale,rowY+23*scale);ctx.textAlign='left';
      if(index<3){ctx.fillStyle='#242424';ctx.fillRect(x+20*scale,rowY+35*scale,w-40*scale,1)}
    });
  }
  async function renderDirectCanvas(format,data){
    const dims=format==='story'?[1080,1920]:format==='x'?[1600,900]:[1080,1080];
    const [width,height]=dims,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is not available on this browser.');
    const s=format==='x'?1:width/1080;
    const [brand,awayLogo,homeLogo]=await Promise.all([loadDrawImage(absoluteAsset('RUSlogoNew.png')),loadDrawImage(data.awayLogo),loadDrawImage(data.homeLogo)]);
    ctx.fillStyle='#101010';ctx.fillRect(0,0,width,height);ctx.fillStyle=ORANGE;ctx.fillRect(0,0,width,14*s);
    ctx.fillStyle='#050505';ctx.fillRect(0,14*s,width,112*s);
    drawContain(ctx,brand,42*s,28*s,78*s,78*s);
    ctx.fillStyle='#fff';ctx.font=`1000 ${31*s}px Arial`;ctx.textAlign='left';ctx.fillText('RURAL UTAH SPORTS',138*s,67*s);
    ctx.fillStyle=ORANGE;ctx.font=`900 ${15*s}px Arial`;ctx.fillText(data.final?'GAME RESULT':'GAME PREVIEW',138*s,92*s);
    ctx.fillStyle='#aaa';ctx.font=`900 ${15*s}px Arial`;ctx.textAlign='right';ctx.fillText(formatDate(data.date),width-42*s,68*s);ctx.fillText(`${data.year||''} SEASON`,width-42*s,92*s);

    const top=150*s,logoSize=(format==='story'?250:format==='x'?120:190)*s;
    const leftCenter=format==='x'?330*s:270*s,rightCenter=format==='x'?1270*s:810*s;
    const drawTeam=(name,info,logo,cx,side)=>{
      const color=safeHex(info?.backgroundColor,side==='away'?'#b00000':'#b22200');
      drawContain(ctx,logo,cx-logoSize/2,top,logoSize,logoSize);
      ctx.fillStyle=color;rounded(ctx,cx-205*s,top+logoSize+10*s,410*s,58*s,12*s,color);
      ctx.fillStyle=safeHex(info?.textColor,'#fff');ctx.textAlign='center';fitText(ctx,name,370*s,31*s,18*s);ctx.fillText(name,cx,top+logoSize+49*s);
      ctx.fillStyle='#aaa';ctx.font=`900 ${17*s}px Arial`;ctx.fillText(teamMeta(info)||'Utah High School Football',cx,top+logoSize+82*s);
    };
    drawTeam(data.away,data.awayInfo,awayLogo,leftCenter,'away');drawTeam(data.home,data.homeInfo,homeLogo,rightCenter,'home');
    ctx.textAlign='center';ctx.fillStyle='#777';ctx.font=`1000 ${38*s}px Arial`;ctx.fillText(data.final?`${data.actualAway} – ${data.actualHome}`:'AT',width/2,top+logoSize/2+20*s);
    ctx.fillStyle=data.final?ORANGE:'#aaa';ctx.font=`900 ${16*s}px Arial`;ctx.fillText(data.status,width/2,top+logoSize/2+50*s);

    const statsY=(format==='story'?610:format==='x'?365:505)*s;
    const gap=20*s,colW=(width-84*s-gap)/2;
    drawLeaderColumn(ctx,32*s,statsY,colW,data.away,safeHex(data.awayInfo?.backgroundColor,'#b00000'),data.awayLeaders,s);
    drawLeaderColumn(ctx,32*s+colW+gap,statsY,colW,data.home,safeHex(data.homeInfo?.backgroundColor,'#b22200'),data.homeLeaders,s);

    const lineY=statsY+332*s;
    if(data.final){drawFinalBox(ctx,data,32*s,lineY,width-64*s,s)}else{
    rounded(ctx,32*s,lineY,width-64*s,100*s,16*s,'#050505','#444');
    ctx.textAlign='left';ctx.fillStyle=ORANGE;ctx.font=`900 ${16*s}px Arial`;ctx.fillText('RUS PROJECTED LINE',58*s,lineY+34*s);
    ctx.fillStyle='#888';ctx.font=`800 ${14*s}px Arial`;ctx.fillText('Model projection • not a sportsbook line',58*s,lineY+67*s);
    ctx.textAlign='right';ctx.fillStyle='#fff';fitText(ctx,data.line,420*s,40*s,22*s);ctx.fillText(data.line,width-58*s,lineY+62*s);
    }
    ctx.fillStyle='#050505';ctx.fillRect(0,height-54*s,width,54*s);ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font=`900 ${14*s}px Arial`;ctx.fillText('ruralutahsports.com',42*s,height-22*s);
    ctx.textAlign='right';ctx.fillStyle='#777';ctx.fillText('Season leaders from reported Deseret statistics',width-42*s,height-22*s);
    return canvas;
  }
  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>{
      if(typeof canvas.toBlob==='function')canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The PNG could not be created.')),'image/png',1);
      else{try{fetch(canvas.toDataURL('image/png')).then(r=>r.blob()).then(resolve,reject)}catch(error){reject(error)}}
    });
  }
  function showGraphicPreview(blob,filename,data){
    document.querySelector('.rus-gs-preview')?.remove();
    const url=URL.createObjectURL(blob),overlay=document.createElement('div');overlay.className='rus-gs-modal rus-gs-preview';
    overlay.innerHTML=`<div class="rus-gs-sheet"><h2>Graphic Ready</h2><p>Press and hold the image to save it, or use one of the buttons below.</p><img src="${url}" alt="${esc(data.away)} at ${esc(data.home)} graphic" style="display:block;width:100%;max-height:58vh;object-fit:contain;background:#000;border:1px solid #333;border-radius:10px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button type="button" class="rus-gs-option rus-gs-share-now" style="min-height:58px"><strong>Share PNG</strong></button><a class="rus-gs-option" href="${url}" download="${esc(filename)}" target="_blank" style="min-height:58px;text-decoration:none"><strong>Save / Open PNG</strong></a></div><button type="button" class="rus-gs-close">Close</button></div>`;
    document.body.appendChild(overlay);
    const close=()=>{overlay.remove();document.body.style.overflow='';setTimeout(()=>URL.revokeObjectURL(url),1000)};
    overlay.querySelector('.rus-gs-close').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('.rus-gs-share-now').onclick=async()=>{
      try{
        const file=new File([blob],filename,{type:'image/png'});
        if(!navigator.share)throw new Error('Use Save / Open PNG on this browser.');
        await navigator.share({files:[file],title:`${data.away} at ${data.home} | Rural Utah Sports`});
      }catch(error){if(error?.name!=='AbortError')alert(error?.message||'Use Save / Open PNG instead.')}
    };
  }

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
    const canvas=await renderDirectCanvas(format,data);
    const blob=await canvasBlob(canvas);
    const filename=`rural-utah-sports-${safeFilename(data.away)}-at-${safeFilename(data.home)}-${isoDate(data.date)||'game'}.png`;
    showGraphicPreview(blob,filename,data);
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
