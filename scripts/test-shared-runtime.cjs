const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('sw.js','utf8');
const req=new Request('https://ruralutahsports.com/nav-menu.js');
const timeout=p=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('Response blocked by storage')),250))]);
function runtime(fetch,cache,open=async()=>cache){
  const work=[],context={Request,Response,URL,AbortController,fetch,caches:{open},self:{addEventListener(){}},location:{origin:'https://ruralutahsports.com'},setTimeout:(fn,ms)=>setTimeout(fn,ms===10000?25:ms),clearTimeout};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,event:{waitUntil:p=>work.push(p)},work};
}
(async()=>{
  for(const method of ['networkFirst','cacheFirst','staleWhileRevalidate']){
    const {context,event,work}=runtime(async()=>new Response('fresh'),{match:async()=>null,put:()=>new Promise(()=>{})});
    const response=await timeout(method==='networkFirst'?context[method](req,{},event):context[method](req,event));
    assert.equal(await response.text(),'fresh');assert.ok(work.length);
  }
  for(const method of ['networkFirst','cacheFirst','staleWhileRevalidate']){
    const {context,event}=runtime(async()=>new Response('fresh'),{match:async()=>{throw Error('storage failed')},put:()=>{throw Error('quota')}});
    const response=await timeout(method==='networkFirst'?context[method](req,{},event):context[method](req,event));
    assert.equal(await response.text(),'fresh');
  }
  for(const method of ['networkFirst','cacheFirst','staleWhileRevalidate']){
    const {context,event}=runtime(async()=>new Response('fresh'),null,()=>new Promise(()=>{}));
    const response=await timeout(method==='networkFirst'?context[method](req,{},event):context[method](req,event));
    assert.equal(await response.text(),'fresh');
  }
  const stalledFetch=(_,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted'))));
  let r=runtime(stalledFetch,{match:async()=>new Response('cached'),put:async()=>{}});
  assert.equal(await (await timeout(r.context.networkFirst(req,{},r.event))).text(),'cached');
  r=runtime(stalledFetch,{match:async()=>null,put:async()=>{}});
  await assert.rejects(timeout(r.context.networkFirst(req,{},r.event)),/aborted/);
  let calls=0,release;
  r=runtime(async()=>{calls++;await new Promise(resolve=>release=resolve);return new Response('shared')},{match:async()=>null,put:async()=>{}});
  const a=r.context.networkFirst(req,{},r.event),b=r.context.networkFirst(req,{},r.event);
  await new Promise(resolve=>setTimeout(resolve,0));release();
  assert.deepEqual(await Promise.all([a,b].map(async p=>(await p).text())),['shared','shared']);assert.equal(calls,1);
  // A slow image never fires window.load. Extras still start once markup is parsed.
  const nav=fs.readFileSync('nav-menu.js','utf8'),fn=nav.slice(nav.indexOf('  function afterFirstPaint('),nav.indexOf('  const groups ='));
  for(const state of ['loading','interactive','complete']){
    let ready,ran=0;
    const c={document:{readyState:state,addEventListener:(type,callback)=>{assert.equal(type,'DOMContentLoaded');ready=callback}},window:{addEventListener:()=>{throw Error('Must not wait for window.load')}},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn()};
    vm.createContext(c);vm.runInContext(fn,c);c.afterFirstPaint(()=>ran++);
    if(state==='loading'){assert.equal(ran,0);ready()}
    assert.equal(ran,1);
  }
  // Repeated mutation deliveries share one frame and ignore nested/detached roots.
  const desktop=fs.readFileSync('desktop-optimizations.js','utf8');
  const observerCode=desktop.slice(desktop.indexOf('  const pending=new Set();'),desktop.indexOf("\n}\n\nif(document.readyState"));
  let observerCallback;const frames=[],processed=[];
  const dc={MutationObserver:class {constructor(callback){observerCallback=callback}observe(){}},document:{body:{}},requestAnimationFrame:fn=>frames.push(fn),optimizeImages:root=>processed.push(root),removeNestedVerticalScroll(){}};
  vm.createContext(dc);vm.runInContext(observerCode,dc);
  const root={nodeType:1,isConnected:true,parentElement:null},child={nodeType:1,isConnected:true,parentElement:root},detached={nodeType:1,isConnected:false,parentElement:null};
  for(let i=0;i<20;i++)observerCallback([{addedNodes:[root,child,detached]}]);
  assert.equal(frames.length,1);frames[0]();assert.deepEqual(processed,[root]);
  // PWA is injected after first paint and may execute after the load event.
  for(const state of ['interactive','complete']){
    let onLoad,registrations=0;
    const el={setAttribute(){}};
    const pc={document:{readyState:state,head:{appendChild(){}},body:{appendChild(){}},querySelector:()=>el,getElementById:()=>el},window:{addEventListener:(name,fn)=>{assert.equal(name,'load');onLoad=fn}},navigator:{serviceWorker:{register:async()=>{registrations++;return {}}}},console};
    vm.createContext(pc);vm.runInContext(fs.readFileSync('pwa.js','utf8'),pc);
    if(state==='interactive'){assert.equal(registrations,0);await onLoad()}
    assert.equal(registrations,1);
  }
  console.log('Shared runtime regressions passed: stalled cache writes, stalled cache open, storage failure, hung network fallback, request deduplication, startup without window.load, late PWA registration, and batched desktop scans.');
})().catch(error=>{console.error(error);process.exitCode=1});
