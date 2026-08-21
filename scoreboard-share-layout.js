(()=>{
  if(!location.pathname.toLowerCase().includes('scoreboard'))return;

  // Safari/iOS can leave an image request pending without firing load/error.
  // The scoreboard share generator waits for those events, so one hung logo can
  // otherwise leave the UI on "Creating…" forever. Force a recoverable error
  // after a short grace period; html2canvas will simply render without that logo.
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

  const core=document.createElement('script');
  core.src=`scoreboard-share-layout-core.js?v=20260820-share-timeout2`;
  core.defer=true;
  document.head.appendChild(core);
})();
