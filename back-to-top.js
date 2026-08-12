(()=>{
  if(document.getElementById('rus-back-to-top')) return;

  const style=document.createElement('style');
  style.textContent=`
    #rus-back-to-top{
      position:fixed;
      right:max(16px,env(safe-area-inset-right));
      bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px));
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      min-width:52px;
      height:48px;
      padding:0 14px;
      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;
      background:#F14D07;
      color:#000;
      font:900 12px/1 Arial,Helvetica,sans-serif;
      text-transform:uppercase;
      letter-spacing:.4px;
      box-shadow:0 6px 22px rgba(0,0,0,.38);
      cursor:pointer;
      opacity:0;
      visibility:hidden;
      transform:translateY(10px);
      transition:opacity .18s ease,transform .18s ease,visibility .18s ease;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    #rus-back-to-top.show{opacity:1;visibility:visible;transform:translateY(0)}
    #rus-back-to-top:hover{filter:brightness(1.06)}
    #rus-back-to-top:focus-visible{outline:3px solid #fff;outline-offset:3px}
    #rus-back-to-top .rus-top-arrow{font-size:20px;line-height:1;transform:translateY(-1px)}
    @media(max-width:700px){
      #rus-back-to-top{right:max(12px,env(safe-area-inset-right));bottom:max(14px,calc(env(safe-area-inset-bottom) + 8px));height:46px;padding:0 13px;min-width:48px}
    }
    @media(prefers-reduced-motion:reduce){#rus-back-to-top{transition:none}}
  `;
  document.head.appendChild(style);

  const button=document.createElement('button');
  button.id='rus-back-to-top';
  button.type='button';
  button.setAttribute('aria-label','Back to top');
  button.innerHTML='<span class="rus-top-arrow" aria-hidden="true">↑</span><span>Top</span>';
  document.body.appendChild(button);

  let ticking=false;
  const update=()=>{
    button.classList.toggle('show',window.scrollY>500);
    ticking=false;
  };
  const onScroll=()=>{
    if(!ticking){requestAnimationFrame(update);ticking=true;}
  };

  window.addEventListener('scroll',onScroll,{passive:true});
  button.addEventListener('click',()=>{
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
  });
  update();
})();
