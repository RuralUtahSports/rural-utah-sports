(()=>{
'use strict';
if((location.pathname.split('/').pop()||'').toLowerCase()!=='rankings.html')return;
if(window.__RUS_STATE25_SPONSOR_REMOVAL__)return;window.__RUS_STATE25_SPONSOR_REMOVAL__=true;
const cleanText=t=>String(t??'').trim();
function installRankingExportCardFix(){
  if(document.getElementById('rus-ranking-export-card-fix'))return;
  const style=document.createElement('style');
  style.id='rus-ranking-export-card-fix';
  style.textContent=`
    .rus-export-rank-item,
    .rus-export-overall-feature{
      background:#151515!important;
      background-image:none!important;
    }
  `;
  document.head.appendChild(style);
}
function removeSponsorNodes(){document.getElementById('rus-state25-sponsor')?.remove();document.querySelectorAll('.rus-export-state25-sponsor').forEach(n=>n.remove());document.querySelectorAll('.rus-direct-canvas-host').forEach(host=>{const p=host.parentElement?.querySelector('p');if(p&&/sponsor branding/i.test(p.textContent||''))p.textContent='School logos and movement are built into the graphic.'})}
function installCanvasMask(){if(window.__RUS_STATE25_CANVAS_SPONSOR_MASK__)return;window.__RUS_STATE25_CANVAS_SPONSOR_MASK__=true;const proto=window.CanvasRenderingContext2D?.prototype;if(!proto)return;const fillText=proto.fillText,drawImage=proto.drawImage;proto.fillText=function(value,...args){const t=cleanText(value);if(/^(PRESENTED BY|JH3D Printz|Official Sponsor of the RUS State Top 25)$/i.test(t))return;return fillText.call(this,value,...args)};proto.drawImage=function(image,...args){const src=String(image?.currentSrc||image?.src||'');if(/jh3d-printz-logo/i.test(src))return;return drawImage.call(this,image,...args)}}
async function start(){installRankingExportCardFix();try{const r=await fetch(`feature-sponsors.json?v=${Date.now()}`,{cache:'no-store'}),cfg=r.ok?await r.json():{},s=cfg?.stateTop25;if(s?.mode==='sponsor')return;try{delete window.RUSState25FeatureSponsor}catch{window.RUSState25FeatureSponsor=null}installCanvasMask();removeSponsorNodes();const o=new MutationObserver(removeSponsorNodes);o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{removeSponsorNodes();o.disconnect()},30000)}catch(e){console.warn('State Top 25 sponsor removal unavailable',e)}}
installRankingExportCardFix();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
