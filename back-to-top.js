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

  if(/(^|\/)championships\.html$/.test(location.pathname)||location.pathname.endsWith('/championships')){
    const summary=document.getElementById('summary');
    if(summary&&!document.getElementById('playoffBracketPreview')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='playoff-brackets-2025.css';
      document.head.appendChild(css);
      const section=document.createElement('section');
      section.className='playoff-preview';
      section.id='playoffBracketPreview';
      section.innerHTML=`
        <div class="playoff-preview-head">
          <div><div class="playoff-preview-title">2025 Playoff Brackets</div><div class="playoff-preview-sub">Bracket preview using the 2025 UHSAA All Time Playoffs sheet. Choose a classification to see the path to the title.</div></div>
          <div class="bracket-tabs" aria-label="2025 playoff classification">
            <button class="bracket-tab" data-cls="6A">6A</button><button class="bracket-tab" data-cls="5A">5A</button><button class="bracket-tab" data-cls="4A">4A</button><button class="bracket-tab" data-cls="3A">3A</button><button class="bracket-tab" data-cls="2A">2A</button><button class="bracket-tab" data-cls="1A">1A</button><button class="bracket-tab" data-cls="8-Player">8-Player</button>
          </div>
        </div>
        <div class="bracket-scroll" aria-live="polite"></div>
        <p class="bracket-source-note">2025 prototype • Source: UHSAA All Time Playoffs. On phones, swipe the bracket sideways if needed.</p>`;
      summary.parentNode.insertBefore(section,summary);
      const js=document.createElement('script');
      js.src='playoff-brackets-2025.js';
      document.body.appendChild(js);
    }
  }
})();
