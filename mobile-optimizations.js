(()=>{
'use strict';
function addStyles(){if(document.getElementById('rus-mobile-optimizations'))return;const s=document.createElement('style');s.id='rus-mobile-optimizations';s.textContent=`
html{scroll-behavior:auto}img{max-width:100%}body{overflow-x:hidden}.table-scroll,.table-wrap{overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
@media(max-width:700px){
  *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  body{font-size:15px;text-rendering:optimizeSpeed}.container{width:100%;max-width:100%;overflow:hidden}.summary,.card,.story,.game,.team-card,.record-card,.section,.date-section{content-visibility:auto;contain-intrinsic-size:300px}.game,.card,.story,.summary,.team-card,.record-card{box-shadow:none!important}.logo{height:auto}.table-wrap,.table-scroll{max-width:100vw}.rus-nav .drop{will-change:auto!important}.leaflet-marker-icon{will-change:auto!important}
}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;document.head.appendChild(s)}
function optimizeImages(root=document){root.querySelectorAll('img').forEach(img=>{if(!img.classList.contains('logo')&&!img.closest('header')){if(!img.hasAttribute('loading'))img.loading='lazy';if(!img.hasAttribute('decoding'))img.decoding='async'}})}
function install(){addStyles();optimizeImages();new MutationObserver(m=>{for(const x of m)for(const n of x.addedNodes)if(n.nodeType===1){if(n.matches?.('img'))optimizeImages(n.parentElement||document);else optimizeImages(n)}}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();