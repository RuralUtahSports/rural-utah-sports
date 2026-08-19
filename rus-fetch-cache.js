(()=>{
  'use strict';
  if(window.__rusFetchCacheInstalled)return;
  window.__rusFetchCacheInstalled=true;

  const nativeFetch=window.fetch.bind(window);
  const pending=new Map();
  const DEDUPE_MS=900;
  const CACHE_BUSTERS=new Set(['v','ver','version','t','ts','timestamp','_']);

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

  const cacheKey=input=>{
    try{
      const raw=typeof input==='string'||input instanceof URL?input:input?.url;
      const url=new URL(raw,location.href);
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

  window.fetch=function(input,init){
    const method=String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const headers=init?.headers||(input instanceof Request?input.headers:null);
    const bypass=init?.cache==='reload'||init?.cache==='no-cache'||headerValue(headers,'x-rus-fetch-bypass')==='1';
    const key=method==='GET'&&!bypass?cacheKey(input):'';
    if(!key)return nativeFetch(input,init);

    const existing=pending.get(key);
    if(existing)return existing.promise.then(response=>response.clone());

    const entry={promise:null,timer:null};
    entry.promise=nativeFetch(input,init).then(response=>{
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
    dedupeWindowMs:DEDUPE_MS
  };
})();
