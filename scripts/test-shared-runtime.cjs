const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');

(async()=>{
const swSource=fs.readFileSync('sw.js','utf8');
const listeners={};
const waits=[];
let skipped=0,claimed=0,unregistered=0;
const deleted=[];
const context={
  caches:{
    keys:async()=>['rus-site-old-a','other-cache','rus-site-old-b'],
    delete:async key=>{deleted.push(key);return true}
  },
  self:{
    addEventListener:(type,handler)=>{listeners[type]=handler},
    skipWaiting:async()=>{skipped++},
    clients:{claim:async()=>{claimed++}},
    registration:{unregister:async()=>{unregistered++;return true}}
  },
  setTimeout,
  Promise
};
vm.createContext(context);
vm.runInContext(swSource,context);

assert.equal(typeof listeners.install,'function','retirement worker must install');
assert.equal(typeof listeners.activate,'function','retirement worker must activate');
assert.equal(listeners.fetch,undefined,'retirement worker must not intercept fetches');

listeners.install({waitUntil:p=>waits.push(Promise.resolve(p))});
await Promise.all(waits.splice(0));
assert.equal(skipped,1,'retirement worker must skip waiting');

listeners.activate({waitUntil:p=>waits.push(Promise.resolve(p))});
await Promise.all(waits.splice(0));
assert.equal(claimed,1,'retirement worker must take control from the old worker');
assert.equal(unregistered,1,'retirement worker must unregister itself');
assert.deepEqual(deleted.sort(),['rus-site-old-a','rus-site-old-b']);

const pwa=fs.readFileSync('pwa.js','utf8');
for(const token of ['getRegistrations','registration.unregister()',"key.startsWith('rus-site-')",'rus-sw-retired-reload','location.reload()']){
  assert.ok(pwa.includes(token),`pwa.js missing retirement token: ${token}`);
}
assert.ok(!/serviceWorker\.register\s*\(/.test(pwa),'pwa.js must not register a new service worker');

const nav=fs.readFileSync('nav-menu.js','utf8'),fn=nav.slice(nav.indexOf('  function afterFirstPaint('),nav.indexOf('  const groups ='));
for(const state of ['loading','interactive','complete']){
  let ready,ran=0;
  const c={document:{readyState:state,addEventListener:(type,callback)=>{assert.equal(type,'DOMContentLoaded');ready=callback}},window:{addEventListener:()=>{throw Error('Must not wait for window.load')}},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn()};
  vm.createContext(c);vm.runInContext(fn,c);c.afterFirstPaint(()=>ran++);
  if(state==='loading'){assert.equal(ran,0);ready()}
  assert.equal(ran,1);
}

const desktop=fs.readFileSync('desktop-optimizations.js','utf8');
const observerCode=desktop.slice(desktop.indexOf('  const pending=new Set();'),desktop.indexOf("\n}\n\nif(document.readyState"));
let observerCallback;const frames=[],processed=[];
const dc={MutationObserver:class {constructor(callback){observerCallback=callback}observe(){}},document:{body:{}},requestAnimationFrame:fn=>frames.push(fn),optimizeImages:root=>processed.push(root),removeNestedVerticalScroll(){}};
vm.createContext(dc);vm.runInContext(observerCode,dc);
const root={nodeType:1,isConnected:true,parentElement:null},child={nodeType:1,isConnected:true,parentElement:root},detached={nodeType:1,isConnected:false,parentElement:null};
for(let i=0;i<20;i++)observerCallback([{addedNodes:[root,child,detached]}]);
assert.equal(frames.length,1);frames[0]();assert.deepEqual(processed,[root]);

console.log('Shared runtime checks passed: service worker retired, RUS caches cleared, no fetch interception, startup does not wait for window.load, and desktop scans remain batched.');

})().catch(error=>{console.error(error);process.exitCode=1});
