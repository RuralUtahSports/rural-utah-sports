(()=>{
  'use strict';
  if(window.__rusFetchCacheInstalled)return;
  window.__rusFetchCacheInstalled=true;
  const nativeFetch=window.fetch.bind(window),pending=new Map();
  const cacheKey=input=>{
    try{
      const raw=typeof input==='string'||input instanceof URL?input:input?.url;
      const url=new URL(raw,location.href);
      if(url.origin!==location.origin||!url.pathname.toLowerCase().endsWith('.json'))return'';
      url.searchParams.delete('v');
      url.searchParams.delete('_');
      url.hash='';
      return url.href;
    }catch{return''}
  };
  window.fetch=function(input,init){
    const method=String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const bypass=init?.cache==='reload'||init?.cache==='no-cache'||init?.headers?.['x-rus-fetch-bypass'];
    const key=method==='GET'&&!bypass?cacheKey(input):'';
    if(!key)return nativeFetch(input,init);
    if(!pending.has(key)){
      const request=nativeFetch(input,init).then(response=>{
        if(!response.ok)pending.delete(key);
        return response;
      }).catch(error=>{pending.delete(key);throw error});
      pending.set(key,request);
    }
    return pending.get(key).then(response=>response.clone());
  };
  window.RUSFetchCache={clear:()=>pending.clear(),size:()=>pending.size};
})();
