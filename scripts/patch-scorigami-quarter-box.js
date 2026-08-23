const fs = require('fs');

const path = 'home-scorigami-carousel.js';
let src = fs.readFileSync(path, 'utf8');

if (src.includes('function drawQuarterBox(')) {
  console.log('Scorigami quarter box scores already installed.');
} else {
  const replaceLine = (re, value, label) => {
    if (!re.test(src)) throw new Error(`Could not find ${label}`);
    src = src.replace(re, value);
  };

  replaceLine(
    /^async function loadShareData\(\).*$/m,
    "async function loadShareData(){if(shareDataPromise)return shareDataPromise;const stamp=Date.now();shareDataPromise=Promise.all([fetch(`teams-data.json?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():[]),fetch(`scorigami.json?v=${stamp}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('scorigami-history');return r.json()}),fetch(`school-logo-cache.json?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():{}),fetch(`deseret-game-details.json?v=${stamp}`,{cache:'no-store'}).then(r=>r.ok?r.json():{games:{}}).catch(()=>({games:{}}))]).then(([teams,history,logoCache,details])=>{const teamMap=new Map();for(const t of Array.isArray(teams)?teams:[])if(t?.team){teamMap.set(teamKey(t.team),t);teamMap.set(norm(t.team),t)}return{teamMap,history,logoCache:logoCache||{},details:details||{games:{}}}}).catch(e=>{shareDataPromise=null;throw e});return shareDataPromise}",
    'loadShareData'
  );

  const helpers = String.raw`function detailCompact(v){return norm(v).replace(/[^A-Z0-9]/g,'')}
function detailDate(v){const text=String(v||'').trim(),m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return \`${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}\`;const t=parseDate(text);if(!t)return'';const d=new Date(t);return \`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}\`}
function detailForAlert(details,a){const games=details?.games||{},date=detailDate(a?.date),away=detailCompact(a?.awayTeam||a?.winner),home=detailCompact(a?.homeTeam||a?.loser),key=\`${date}|${away}|${home}\`;if(games[key])return games[key];for(const[k,v]of Object.entries(games)){const parts=k.split('|');if(parts.length===3&&parts[0]===date&&parts[1]===away&&parts[2]===home)return v}return null}
function quarterRows(p){const b=p?.boxScore,periods=Array.isArray(b?.periods)&&b.periods.length?b.periods.map(String):['Q1','Q2','Q3','Q4'],rows=Array.isArray(b?.rows)?b.rows.slice(0,2):[];if(rows.length<2)return null;const has=rows.some(r=>Array.isArray(r?.quarters)&&r.quarters.some(v=>v!==null&&v!==undefined&&v!==''));if(!has)return null;let ordered=rows;const t0=Number(rows[0]?.total),t1=Number(rows[1]?.total);if(Number.isFinite(t0)&&Number.isFinite(t1)&&t0===Number(p.home)&&t1===Number(p.away))ordered=[rows[1],rows[0]];return{periods,rows:ordered}}
function hasQuarterData(p){return!!quarterRows(p)}
function drawQuarterBox(ctx,p,x,y,w,h){const box=quarterRows(p);if(!box)return false;const periods=box.periods.slice(0,8),rows=box.rows,teamW=Math.max(w<600?104:170,Math.min(w*.29,w<600?132:230)),cols=periods.length+1,colW=(w-teamW-20)/cols,headH=Math.max(24,Math.round(h*.25)),rowH=(h-headH-12)/2;rounded(ctx,x,y,w,h,14,'#090909','rgba(255,255,255,.18)',2);ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle='#888';ctx.font=\`900 ${w<600?10:13}px Arial,Helvetica,sans-serif\`;periods.forEach((label,i)=>ctx.fillText(String(label).toUpperCase(),x+teamW+10+colW*(i+.5),y+headH/2+4));ctx.fillStyle=GOLD;ctx.fillText('F',x+teamW+10+colW*(periods.length+.5),y+headH/2+4);const names=[p.awayName,p.homeName],finals=[p.away,p.home];rows.forEach((row,ri)=>{const cy=y+headH+rowH*(ri+.5)+4;ctx.textAlign='left';ctx.fillStyle='#ddd';const label=String(names[ri]||row?.team||'TEAM').toUpperCase(),sz=fitText(ctx,label,teamW-24,w<600?14:17,w<600?9:11,900);ctx.font=\`900 ${sz}px Arial,Helvetica,sans-serif\`;ctx.fillText(label,x+12,cy);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font=\`900 ${w<600?13:18}px Arial,Helvetica,sans-serif\`;periods.forEach((_,i)=>{const v=row?.quarters?.[i];ctx.fillText(v===null||v===undefined||v===''?'—':String(v),x+teamW+10+colW*(i+.5),cy)});ctx.fillStyle=GOLD;ctx.font=\`1000 ${w<600?15:21}px Arial,Helvetica,sans-serif\`;ctx.fillText(String(finals[ri]),x+teamW+10+colW*(periods.length+.5),cy)});ctx.textBaseline='alphabetic';ctx.textAlign='left';return true}`;

  replaceLine(/^function alertScores.*$/m, helpers + '\n$&', 'alertScores insertion point');

  replaceLine(
    /^function prepareAlert.*$/m,
    "function prepareAlert(a,data){const{teamMap,history,logoCache,details}=data,{away,home}=alertScores(a),awayName=String(a.awayTeam||a.winner||'Away').trim(),homeName=String(a.homeTeam||a.loser||'Home').trim(),awayMeta=metaFor(teamMap,awayName),homeMeta=metaFor(teamMap,homeName),year=yearOf(a.date)||new Date().getFullYear(),detail=detailForAlert(details,a);return{a,away,home,awayName,homeName,awayMeta,homeMeta,awayColor:safeHex(awayMeta?.backgroundColor,'#353535'),homeColor:safeHex(homeMeta?.backgroundColor,'#353535'),awayText:safeHex(awayMeta?.textColor,contrastText(awayMeta?.backgroundColor)),homeText:safeHex(homeMeta?.textColor,contrastText(homeMeta?.backgroundColor)),awayRecord:seasonRecord(history,awayName,year),homeRecord:seasonRecord(history,homeName,year),ordinal:scoreOrdinal(history,a),awayLogoSrc:localLogoFor(logoCache,awayName,awayMeta),homeLogoSrc:localLogoFor(logoCache,homeName,homeMeta),boxScore:detail?.boxScore||null}}",
    'prepareAlert'
  );

  replaceLine(
    /^async function buildSingleGraphic.*$/m,
    "async function buildSingleGraphic(a,weekIndex,weekCount){const{prepared,rusLogo}=await prepareAlerts([a]),p=prepared[0],canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');drawHeader(ctx,rusLogo,'SCORIGAMI','A FINAL SCORE NEVER BEFORE SEEN IN THE RUS DATABASE',p.ordinal.number?`SCORIGAMI #${p.ordinal.number}`:'SCORIGAMI');ctx.fillStyle='#888';ctx.font='800 20px Arial,Helvetica,sans-serif';ctx.fillText(displayDate(a.date).toUpperCase(),66,323);drawSingleTeam(ctx,p,'away',378);drawSingleTeam(ctx,p,'home',650);const withBox=drawQuarterBox(ctx,p,82,914,916,126);ctx.textAlign='center';ctx.fillStyle=ORANGE;ctx.font='1000 31px Arial,Helvetica,sans-serif';ctx.fillText(weekCount===1?'1 SCORIGAMI THIS WEEK':`${weekCount} SCORIGAMIS THIS WEEK`,540,withBox?1082:968);ctx.fillStyle='#fff';ctx.font='900 24px Arial,Helvetica,sans-serif';if(p.ordinal.number)ctx.fillText(`UNIQUE FINAL SCORE #${p.ordinal.number} OF ${p.ordinal.total.toLocaleString()}`,540,withBox?1119:1012);ctx.fillStyle='#aaa';ctx.font='800 21px Arial,Helvetica,sans-serif';ctx.fillText(`Alert ${weekIndex+1} of ${weekCount} this week`,540,withBox?1153:1050);const infoY=withBox?1190:1110,infoH=withBox?116:132;rounded(ctx,82,infoY,916,infoH,18,'rgba(0,0,0,.52)','rgba(241,77,7,.65)',2);ctx.fillStyle='#ddd';ctx.font='800 22px Arial,Helvetica,sans-serif';ctx.fillText('First time this final-score combination has appeared',540,infoY+50);ctx.fillText('in the Rural Utah Sports football database.',540,infoY+86);if(!withBox){ctx.fillStyle='#888';ctx.font='800 18px Arial,Helvetica,sans-serif';ctx.fillText('Records shown are current-season records from RUS results.',540,infoY+118)}ctx.textAlign='left';return canvas}",
    'buildSingleGraphic'
  );

  replaceLine(
    /^function drawMultiCard.*$/m,
    "function drawMultiCard(ctx,p,x,y,w,h){rounded(ctx,x,y,w,h,20,'#151515','rgba(255,255,255,.18)',2);const pill=p.ordinal.number?`SCORIGAMI #${p.ordinal.number}`:'SCORIGAMI';ctx.font='1000 16px Arial,Helvetica,sans-serif';const pillW=Math.min(w-32,Math.max(190,ctx.measureText(pill).width+44));rounded(ctx,x+16,y+16,pillW,42,21,ORANGE);ctx.fillStyle='#000';ctx.textAlign='center';ctx.fillText(pill,x+16+pillW/2,y+44);ctx.textAlign='right';ctx.fillStyle='#888';ctx.font='800 12px Arial,Helvetica,sans-serif';ctx.fillText(displayDate(p.a.date).toUpperCase(),x+w-16,y+42);const withBox=hasQuarterData(p),rowGap=8,boxGap=withBox?10:0,boxH=withBox?(w<600?82:92):0,rowH=(h-104-rowGap-boxGap-boxH)/2,rowY=y+74;drawCompactTeam(ctx,p,'away',x+14,rowY,w-28,rowH);drawCompactTeam(ctx,p,'home',x+14,rowY+rowH+rowGap,w-28,rowH);if(withBox)drawQuarterBox(ctx,p,x+14,rowY+rowH*2+rowGap+boxGap,w-28,boxH);ctx.textAlign='left'}",
    'drawMultiCard'
  );

  replaceLine(
    /^async function buildMultiGraphic.*$/m,
    "async function buildMultiGraphic(alerts){if(alerts.length===1)return buildSingleGraphic(alerts[0],0,1);const{prepared,rusLogo}=await prepareAlerts(alerts),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');drawHeader(ctx,rusLogo,'SCORIGAMI ALERTS','FINAL SCORES NEVER BEFORE SEEN IN THE RUS DATABASE',`${alerts.length} SELECTED`);ctx.fillStyle='#888';ctx.font='800 19px Arial,Helvetica,sans-serif';ctx.fillText('SELECTED FROM THIS WEEK\\'S RUS SCORIGAMI ALERTS',66,323);if(alerts.length===2){const x=64,w=952,h=440,gap=20,startY=365;prepared.forEach((p,i)=>drawMultiCard(ctx,p,x,startY+i*(h+gap),w,h))}else{const gap=22,w=(952-gap)/2,h=435,startX=64,startY=365;prepared.forEach((p,i)=>drawMultiCard(ctx,p,startX+(i%2)*(w+gap),startY+Math.floor(i/2)*(h+gap),w,h))}ctx.textAlign='center';ctx.fillStyle='#aaa';ctx.font='800 18px Arial,Helvetica,sans-serif';ctx.fillText('Records • classification • region • team colors • logos • quarter scores',540,1300);ctx.textAlign='left';return canvas}",
    'buildMultiGraphic'
  );

  fs.writeFileSync(path, src);
  console.log('Installed Scorigami quarter-by-quarter box score rendering.');
}

const indexPath = 'index.html';
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/home-scorigami-carousel\.js\?v=[^\"']+/, 'home-scorigami-carousel.js?v=20260822-share4-quarterbox');
fs.writeFileSync(indexPath, html);
