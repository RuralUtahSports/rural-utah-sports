(()=>{
  'use strict';
  if(window.__rusFetchCacheInstalled)return;
  window.__rusFetchCacheInstalled=true;

  const nativeFetch=window.fetch.bind(window);
  const pending=new Map();
  const DEDUPE_MS=900;
  const CACHE_BUSTERS=new Set(['v','ver','version','t','ts','timestamp','_']);
  const LIGHT_STAT_PAGES=new Set(['index.html','game-week.html','my-teams.html']);
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const FULL_STATS='deseret-rosters-stats-2026.json';
  const LIGHT_STATS='deseret-stat-metrics-2026.json';

  const headerValue=(headers,name)=>{
    try{
      if(headers instanceof Headers)return headers.get(name)||'';
      if(Array.isArray(headers))return String(headers.find(([k])=>String(k).toLowerCase()===name)?.[1]||'');
      if(headers&&typeof headers==='object'){
        const key=Object.keys(headers).find(k=>k.toLowerCase()===name);
        return key?String(headers[key]||''):'';
      }
    }catch{}
    return'';
  };

  const rawUrl=input=>typeof input==='string'||input instanceof URL?String(input):input?.url||'';
  const compactStatRequest=(input,method)=>{
    if(method!=='GET'||!LIGHT_STAT_PAGES.has(page))return{input,replaced:false};
    try{
      const url=new URL(rawUrl(input),location.href);
      if(url.origin!==location.origin||!url.pathname.toLowerCase().endsWith('/'+FULL_STATS))return{input,replaced:false};
      url.pathname=url.pathname.slice(0,-FULL_STATS.length)+LIGHT_STATS;
      if(input instanceof Request)return{input:new Request(url.href,input),replaced:true};
      return{input:url.href,replaced:true};
    }catch{return{input,replaced:false}}
  };

  const cacheKey=input=>{
    try{
      const url=new URL(rawUrl(input),location.href);
      if(url.origin!==location.origin||!url.pathname.toLowerCase().endsWith('.json'))return'';
      for(const key of [...url.searchParams.keys()]){
        if(CACHE_BUSTERS.has(key.toLowerCase()))url.searchParams.delete(key);
      }
      url.hash='';
      return url.href;
    }catch{return''}
  };

  const removeLater=(key,entry)=>{
    clearTimeout(entry.timer);
    entry.timer=setTimeout(()=>{
      if(pending.get(key)===entry)pending.delete(key);
    },DEDUPE_MS);
  };

  const requestWithFallback=async(original,preferred,init,replaced)=>{
    if(!replaced)return nativeFetch(preferred,init);
    try{
      const response=await nativeFetch(preferred,init);
      if(response.ok)return response;
    }catch{}
    return nativeFetch(original,init);
  };

  window.fetch=function(input,init){
    const method=String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const headers=init?.headers||(input instanceof Request?input.headers:null);
    const bypass=init?.cache==='reload'||init?.cache==='no-cache'||headerValue(headers,'x-rus-fetch-bypass')==='1';
    const routed=compactStatRequest(input,method);
    const key=method==='GET'&&!bypass?cacheKey(routed.input):'';
    if(!key)return requestWithFallback(input,routed.input,init,routed.replaced);

    const existing=pending.get(key);
    if(existing)return existing.promise.then(response=>response.clone());

    const entry={promise:null,timer:null};
    entry.promise=requestWithFallback(input,routed.input,init,routed.replaced).then(response=>{
      if(response.ok)removeLater(key,entry);
      else pending.delete(key);
      return response;
    }).catch(error=>{
      pending.delete(key);
      throw error;
    });
    pending.set(key,entry);
    return entry.promise.then(response=>response.clone());
  };

  window.RUSFetchCache={
    clear:()=>{for(const entry of pending.values())clearTimeout(entry.timer);pending.clear()},
    size:()=>pending.size,
    dedupeWindowMs:DEDUPE_MS,
    lightweightStatsPages:[...LIGHT_STAT_PAGES]
  };
})();
