(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='rankings.html')return;
if(window.__RUS_STATE25_SPONSOR_REMOVAL__)return;window.__RUS_STATE25_SPONSOR_REMOVAL__=true;
const cleanText=t=>String(t??'').trim();
const norm=t=>cleanText(t).toUpperCase().replace(/\s+/g,' ');
const EXPORT_FIX_VERSION='20260823-ios-rankbadge-fix1';
function cacheBust(src){const s=cleanText(src);if(!s)return'';return s+(s.includes('?')?'&':'?')+'rusv='+EXPORT_FIX_VERSION}
function preferredLogo(team){
  const key=norm(team),A=window.RUSSchoolAssets;
  if(key==='GRANTSVILLE')return cacheBust('school-logos/grantsville.webp');
  try{const custom=A?.customLogo?.(team);if(custom)return cacheBust(custom)}catch{}
  return'';
}
function installRankingExportCardFix(){
  if(document.getElementById('rus-ranking-export-card-fix'))return;
  const style=document.createElement('style');
  style.id='rus-ranking-export-card-fix';
  style.textContent=`
    .rus-export-rank-item,
    .rus-export-overall-feature,
    .rus-export-overall-row{
      background:#151515!important;
      background-image:none!important;
      border-radius:0!important;
      clip-path:none!important;
    }
    .rus-export-rank-num{
      border-radius:0!important;
      clip-path:none!important;
      overflow:visible!important;
    }
    .rus-export-team,
    .rus-export-team-wrap,
    .rus-export-team-line{
      border-radius:0!important;
      clip-path:none!important;
      overflow:visible!important;
    }
  `;
  document.head.appendChild(style);
}
function flattenExportElement(el){
  if(!el)return;
  el.style.setProperty('border-radius','0','important');
  el.style.setProperty('clip-path','none','important');
  el.style.setProperty('overflow','visible','important');
}
function patchExportBoard(board){
  if(!board?.matches?.('.rus-export-board'))return;
  board.querySelectorAll('.rus-export-rank-item,.rus-export-overall-feature,.rus-export-overall-row').forEach(card=>{
    card.style.setProperty('background','#151515','important');
    card.style.setProperty('background-image','none','important');
    flattenExportElement(card);
  });
  board.querySelectorAll('.rus-export-rank-num,.rus-export-team,.rus-export-team-wrap,.rus-export-team-line').forEach(flattenExportElement);
  board.querySelectorAll('img[alt]').forEach(img=>{
    const alt=cleanText(img.getAttribute('alt'));
    const team=alt.replace(/\s+logo$/i,'').trim();
    const src=preferredLogo(team);
    if(src&&img.getAttribute('src')!==src)img.setAttribute('src',src);
  });
}
function installExportInterceptor(){
  if(window.__RUS_RANKING_EXPORT_CARD_INTERCEPTOR__)return;
  window.__RUS_RANKING_EXPORT_CARD_INTERCEPTOR__=true;
  const nativeAppendChild=Node.prototype.appendChild;
  Node.prototype.appendChild=function(node){
    if(node?.nodeType===1&&node.matches?.('.rus-export-board'))patchExportBoard(node);
    const out=nativeAppendChild.call(this,node);
    if(node?.nodeType===1&&node.matches?.('.rus-export-board'))Promise.resolve().then(()=>patchExportBoard(node));
    return out;
  };
  const nativeAppend=Element.prototype.append;
  if(nativeAppend)Element.prototype.append=function(...nodes){
    nodes.forEach(node=>{if(node?.nodeType===1&&node.matches?.('.rus-export-board'))patchExportBoard(node)});
    const out=nativeAppend.apply(this,nodes);
    nodes.forEach(node=>{if(node?.nodeType===1&&node.matches?.('.rus-export-board'))Promise.resolve().then(()=>patchExportBoard(node))});
    return out;
  };
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(node=>{
    if(node?.nodeType!==1)return;
    if(node.matches?.('.rus-export-board'))patchExportBoard(node);
    node.querySelectorAll?.('.rus-export-board').forEach(patchExportBoard);
  }))).observe(document.documentElement,{childList:true,subtree:true});
}
function removeSponsorNodes(){document.getElementById('rus-state25-sponsor')?.remove();document.querySelectorAll('.rus-export-state25-sponsor').forEach(n=>n.remove());document.querySelectorAll('.rus-direct-canvas-host').forEach(host=>{const p=host.parentElement?.querySelector('p');if(p&&/sponsor branding/i.test(p.textContent||''))p.textContent='School logos and movement are built into the graphic.'})}
function installCanvasMask(){if(window.__RUS_STATE25_CANVAS_SPONSOR_MASK__)return;window.__RUS_STATE25_CANVAS_SPONSOR_MASK__=true;const proto=window.CanvasRenderingContext2D?.prototype;if(!proto)return;const fillText=proto.fillText,drawImage=proto.drawImage;proto.fillText=function(value,...args){const t=cleanText(value);if(/^(PRESENTED BY|JH3D Printz|Official Sponsor of the RUS State Top 25)$/i.test(t))return;return fillText.call(this,value,...args)};proto.drawImage=function(image,...args){const src=String(image?.currentSrc||image?.src||'');if(/jh3d-printz-logo/i.test(src))return;return drawImage.call(this,image,...args)}}
async function start(){installRankingExportCardFix();installExportInterceptor();document.querySelectorAll('.rus-export-board').forEach(patchExportBoard);try{const r=await fetch(`feature-sponsors.json?v=${Date.now()}`,{cache:'no-store'}),cfg=r.ok?await r.json():{},s=cfg?.stateTop25;if(s?.mode==='sponsor')return;try{delete window.RUSState25FeatureSponsor}catch{window.RUSState25FeatureSponsor=null}installCanvasMask();removeSponsorNodes();const o=new MutationObserver(removeSponsorNodes);o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{removeSponsorNodes();o.disconnect()},30000)}catch(e){console.warn('State Top 25 sponsor removal unavailable',e)}}
installRankingExportCardFix();
installExportInterceptor();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
