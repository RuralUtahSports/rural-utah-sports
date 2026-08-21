(()=>{
  if(!location.pathname.toLowerCase().includes('scoreboard'))return;

  // Safari/iOS can leave an image request pending without firing load/error.
  // The scoreboard share generator waits for those events, so one hung logo can
  // otherwise leave the UI on "Creating…" forever. Force a recoverable error
  // after a short grace period; the export can continue without that logo.
  const timers=new WeakMap();
  const armImage=img=>{
    if(!img||img.complete||timers.has(img))return;
    const finish=()=>{const timer=timers.get(img);if(timer)clearTimeout(timer);timers.delete(img)};
    img.addEventListener('load',finish,{once:true});
    img.addEventListener('error',finish,{once:true});
    const timer=setTimeout(()=>{
      timers.delete(img);
      if(img.complete)return;
      try{img.dispatchEvent(new Event('error'))}catch{}
    },3500);
    timers.set(img,timer);
  };
  const scan=root=>{
    if(root?.matches?.('.rus-sb-board img'))armImage(root);
    root?.querySelectorAll?.('.rus-sb-board img').forEach(armImage);
  };
  const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node)})));
  const start=()=>observer.observe(document.body,{childList:true,subtree:true});
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});

  // The square/story/X exporter uses html2canvas. Preload it from either of two
  // CDNs before the share core starts so a stalled CDN request on iOS cannot be
  // the promise the export is waiting on forever.
  const loadHtml2Canvas=()=>new Promise(resolve=>{
    if(window.html2canvas){resolve(true);return}
    let settled=false,pending=2;
    const done=ok=>{
      if(ok&&window.html2canvas&&!settled){settled=true;resolve(true);return}
      pending--;
      if(pending<=0&&!settled){settled=true;resolve(false)}
    };
    const add=src=>{
      const s=document.createElement('script');
      let ended=false;
      const finish=ok=>{if(ended)return;ended=true;clearTimeout(timer);done(ok)};
      s.async=true;s.src=src;s.onload=()=>finish(true);s.onerror=()=>finish(false);
      const timer=setTimeout(()=>finish(false),6000);
      document.head.appendChild(s);
    };
    add('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    add('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js');
  });

  // Never leave a share button visually frozen forever. The image/CDN guards
  // above should normally finish first; this is a final UI recovery path.
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('.rus-share-option[data-f]');
    if(!btn)return;
    const original=btn.innerHTML;
    setTimeout(()=>{
      if(!btn.isConnected||!btn.disabled||!/^Creating/i.test(btn.textContent.trim()))return;
      btn.disabled=false;
      btn.innerHTML=original;
      try{alert('The graphic took too long to create. Please tap it again.')}catch{}
    },20000);
  },true);

  const loadCore=()=>{
    if(document.querySelector('script[data-rus-scoreboard-share-core="1"]'))return;
    const core=document.createElement('script');
    core.src='scoreboard-share-layout-core.js?v=20260820-share-timeout3';
    core.defer=true;
    core.dataset.rusScoreboardShareCore='1';
    document.head.appendChild(core);
  };

  // Usually resolves immediately; at worst wait six seconds for both mirrors.
  Promise.race([loadHtml2Canvas(),new Promise(resolve=>setTimeout(()=>resolve(false),6500))]).finally(loadCore);
})();
