(()=>{
if(window.__RUSDynastySimLoaded)return;window.__RUSDynastySimLoaded=true;
const files=['dynasty-sim-core.js?v=20260813b','dynasty-sim-config.js?v=20260813a','dynasty-sim-view.js?v=20260813b'];
const load=i=>{if(i>=files.length)return ready(0);const s=document.createElement('script');s.src=files[i];s.async=false;s.onload=()=>load(i+1);document.body.append(s)};
const ready=n=>{const D=window.RUSDynastySim,root=document.getElementById('dynastySimRoot');if((!D?.start||!root)&&n<100)return setTimeout(()=>ready(n+1),100);if(D?.start&&root)D.start()};
load(0);
})();
