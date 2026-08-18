(()=>{
'use strict';
if(document.getElementById('rus-optimization-polish'))return;const s=document.createElement('style');s.id='rus-optimization-polish';s.textContent=`
:focus-visible{outline:2px solid #F14D07!important;outline-offset:2px!important}html{scrollbar-color:#4a4a4a #0a0a0a}.loading{position:relative;overflow:hidden}.loading:after{content:'';position:absolute;inset:0;transform:translateX(-105%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent);animation:rusLoad 1.35s ease-in-out infinite;pointer-events:none}@keyframes rusLoad{to{transform:translateX(105%)}}
@media(min-width:901px){body>main.container,.container{width:min(calc(100% - 40px),1440px);margin-left:auto;margin-right:auto}header .header-content{max-width:1440px}.page-title{letter-spacing:.2px}.filters,.filter-panel,.controls,.toolbar{box-shadow:0 10px 26px rgba(0,0,0,.18)}table th{position:relative}.team-card,.card,.game,.summary,.summary-card{will-change:transform}}
@media(max-width:700px){button,a,select,input{min-touch-target-size:44px}.container{width:100%!important}}
@media(prefers-reduced-motion:reduce){.loading:after{animation:none}}
`;document.head.appendChild(s);const prep=root=>root.querySelectorAll?.('main img:not(.logo):not([loading])').forEach(img=>{img.loading='lazy';img.decoding='async'});prep(document);const o=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('main img:not(.logo):not([loading])')){n.loading='lazy';n.decoding='async'}prep(n)}})));o.observe(document.body,{childList:true,subtree:true});
const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
function load(src,key){if(document.querySelector(`script[data-${key}]`))return;const x=document.createElement('script');x.src=src;x.async=true;x.dataset[key]='1';document.body.appendChild(x)}
load('recently-viewed.js?v=20260817-app4','rus-recently-viewed');
if(path==='index.html')load('home-personalized.js?v=20260817-app4','rus-home-personalized');
if(path==='my-teams.html')load('my-teams-dashboard.js?v=20260817-app4','rus-my-teams-dashboard');
if(path==='scoreboard.html')load('rus-lines-dashboard.js?v=20260817-app4','rus-lines-dashboard');
if(path==='game.html')load('game-center-upgrade.js?v=20260817-app4','rus-game-center-upgrade');
})();
