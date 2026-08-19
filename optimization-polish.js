(()=>{
'use strict';
if(document.getElementById('rus-optimization-polish'))return;
const s=document.createElement('style');
s.id='rus-optimization-polish';
s.textContent=`
:focus-visible{outline:2px solid #F14D07!important;outline-offset:2px!important}html{scrollbar-color:#4a4a4a #0a0a0a}.loading{position:relative;overflow:hidden}.loading:after{content:'';position:absolute;inset:0;transform:translateX(-105%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent);animation:rusLoad 1.35s ease-in-out infinite;pointer-events:none}@keyframes rusLoad{to{transform:translateX(105%)}}
@media(min-width:901px){body>main.container,.container{width:min(calc(100% - 40px),1440px);margin-left:auto;margin-right:auto}header .header-content{max-width:1440px}.page-title{letter-spacing:.2px}.filters,.filter-panel,.controls,.toolbar{box-shadow:0 10px 26px rgba(0,0,0,.18)}table th{position:relative}}
@media(max-width:700px){button,a,select,input{min-touch-target-size:44px}.container{width:100%!important}}
@media(prefers-reduced-motion:reduce){.loading:after{animation:none}}
`;
document.head.appendChild(s);

const markImage=img=>{
  if(!img||img.closest('header')||img.classList.contains('logo'))return;
  if(!img.hasAttribute('loading'))img.loading='lazy';
  if(!img.hasAttribute('decoding'))img.decoding='async';
};
const prep=root=>{
  if(!root||root.nodeType!==1)return;
  if(root.matches?.('img'))markImage(root);
  root.querySelectorAll?.('img').forEach(markImage);
};
const main=document.querySelector('main');
if(main){
  prep(main);
  const observer=new MutationObserver(mutations=>{
    const roots=[];
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(node.nodeType===1)roots.push(node);
      }
    }
    if(!roots.length)return;
    const run=()=>roots.forEach(prep);
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:250});
    else requestAnimationFrame(run);
  });
  observer.observe(main,{childList:true,subtree:true});
}
})();
