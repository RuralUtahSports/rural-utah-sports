(()=>{
'use strict';
const scorePage=/(?:^|\/)scoreboard\.html$/i.test(location.pathname),gamePage=/(?:^|\/)game\.html$/i.test(location.pathname),rankingsPage=/(?:^|\/)rankings\.html$/i.test(location.pathname);

// Keep the existing scoreboard/game code intact, but transparently overlay the
// fast Supabase live cache on top of the full GitHub detail history. If the
// Supabase cache ever gets more than six minutes old, fall back to GitHub.
if((scorePage||gamePage)&&!window.__RUS_SUPABASE_LIVE_FETCH__){
  window.__RUS_SUPABASE_LIVE_FETCH__=true;
  const nativeFetch=window.fetch.bind(window);
  const supabaseUrl='https://pleggeciqvaoyxtuvczd.supabase.co/functions/v1/live-scoreboard';
  const isDetailRequest=input=>{
    const raw=typeof input==='string'?input:String(input?.url||'');
    return /(?:^|\/)deseret-game-details\.json(?:\?|$)/i.test(raw);
  };
  window.fetch=async(input,init)=>{
    if(!isDetailRequest(input))return nativeFetch(input,init);
    try{
      const [baseResponse,liveResponse]=await Promise.all([
        nativeFetch(input,init),
        nativeFetch(`${supabaseUrl}?v=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'}})
      ]);
      if(!liveResponse.ok)return baseResponse;
      if(!baseResponse.ok)return liveResponse;
      const [base,live]=await Promise.all([baseResponse.json(),liveResponse.json()]);
      const liveStamp=Date.parse(String(live?.updatedAt||''));
      const fresh=Number.isFinite(liveStamp)&&Date.now()-liveStamp<6*60*1000&&live?.games&&Object.keys(live.games).length>0;
      if(!fresh)return new Response(JSON.stringify(base),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      const liveGames={};
      for(const [key,value] of Object.entries(live.games||{})){
        const detail=value&&typeof value==='object'?{...value}:value;
        if(detail&&/half/i.test(String(detail.status||'')))detail.clock='';
        if(detail?.final){detail.clock='';detail.period='';}
        liveGames[key]=detail;
      }
      const baseStamp=Date.parse(String(base?.updatedAt||''));
      const updatedAt=Number.isFinite(baseStamp)&&baseStamp>liveStamp?base.updatedAt:live.updatedAt;
      const merged={...base,updatedAt,source:'supabase-live-merged',liveUpdatedAt:live.updatedAt,games:{...(base?.games||{}),...liveGames}};
      return new Response(JSON.stringify(merged),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }catch(error){
      console.warn('Supabase live overlay unavailable; using normal scoreboard source.',error);
      return nativeFetch(input,init);
    }
  };
}

// The base scoreboard historically treated the 44+ mercy-rule flag as a
// final-only result. Restore the intended live behavior: a 44+ margin counts
// during the fourth quarter as well as after the game becomes final.
const installLiveMercyRuleFix=()=>{
  if(!scorePage||window.__RUS_LIVE_MERCY_RULE_FIX__)return;
  if(typeof window.mercyGame!=='function'||typeof window.scoreState!=='function')return;
  window.__RUS_LIVE_MERCY_RULE_FIX__=true;
  window.mercyGame=game=>{
    let state;
    try{state=window.scoreState(game)}catch{return false}
    const away=Number(state?.away),home=Number(state?.home);
    if(state?.away==null||state?.home==null||!Number.isFinite(away)||!Number.isFinite(home)||Math.abs(away-home)<44)return false;
    if(state?.done)return true;
    if(!state?.live)return false;
    let detail=null;
    try{detail=typeof window.detailFor==='function'?window.detailFor(game):null}catch{}
    const marker=`${state?.status||''} ${detail?.status||''} ${detail?.period||''} ${detail?.clock||''}`;
    return /\bQ4\b|4TH|FOURTH|4(?:ST|ND|RD|TH)?\s+QUARTER/i.test(marker);
  };
  try{if(typeof window.render==='function')window.render()}catch(error){console.warn('Could not rerender mercy-rule scoreboard state',error)}
};

const loadScoreboard=()=>{
  if(!scorePage||document.querySelector('script[data-rus-scoreboard-school-assets]'))return;
  const s=document.createElement('script');s.src='school-assets-scoreboard.js?v=20260905-oos-ranks1';s.async=true;s.dataset.rusScoreboardSchoolAssets='1';document.body.appendChild(s);
};
const loadScoreboardLiveClock=()=>{
  if(!scorePage||document.querySelector('script[data-rus-scoreboard-live-clock]'))return;
  const s=document.createElement('script');s.src='scoreboard-live-clock.js?v=20260820-supabase-live1';s.async=true;s.dataset.rusScoreboardLiveClock='1';document.body.appendChild(s);
};
const loadGameVisuals=()=>{
  if(!gamePage||document.querySelector('script[data-rus-game-center-color-layout]'))return;
  const s=document.createElement('script');s.src='game-center-color-layout.js?v=20260820-midwidth1';s.async=true;s.dataset.rusGameCenterColorLayout='1';document.body.appendChild(s);
};
const loadGameLiveStatus=()=>{
  if(!gamePage||document.querySelector('script[data-rus-game-live-status-fix]'))return;
  const s=document.createElement('script');s.src='game-live-status-fix.js?v=20260820-supabase-live1';s.async=true;s.dataset.rusGameLiveStatusFix='1';document.body.appendChild(s);
};
const loadRankingsSponsorRemoval=()=>{
  if(!rankingsPage||document.querySelector('script[data-rus-rankings-sponsor-removal]'))return;
  const s=document.createElement('script');s.src='rankings-sponsor-removal.js?v=20260823-cardfix3';s.async=true;s.dataset.rusRankingsSponsorRemoval='1';document.body.appendChild(s);
};
const loadOverallRankingsShare=()=>{
  if(!rankingsPage||window.__rusOverallDirectShareBuild==='ios3-overall-featured-top3-logos'||document.querySelector('script[data-rus-rankings-overall-share]'))return;
  const s=document.createElement('script');s.src='rankings-overall-share-direct-v3.js?v=20260820-ios3-overall-featured-top3-logos';s.async=true;s.dataset.rusRankingsOverallShare='1';document.body.appendChild(s);
};
const loadExtras=()=>{installLiveMercyRuleFix();loadScoreboard();loadScoreboardLiveClock();loadGameVisuals();loadGameLiveStatus();loadRankingsSponsorRemoval();loadOverallRankingsShare()};
installLiveMercyRuleFix();
if(window.RUSSchoolAssets){loadExtras();return}
let core=[...document.scripts].find(s=>(s.getAttribute('src')||'').split('?')[0].endsWith('school-assets-core.js'));
if(!core){
  core=document.createElement('script');core.src='school-assets-core.js?v=20260821-emery-exact4';core.async=true;core.dataset.rusSchoolAssetsCore='1';document.body.appendChild(core);
}
core.addEventListener('load',loadExtras,{once:true});
window.addEventListener('rus:school-assets-ready',loadExtras,{once:true});
loadScoreboardLiveClock();loadGameVisuals();loadGameLiveStatus();loadRankingsSponsorRemoval();loadOverallRankingsShare();
})();
