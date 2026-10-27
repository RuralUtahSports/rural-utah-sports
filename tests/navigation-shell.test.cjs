const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');

function check(mutations={}){
 const messages=[],processState={cwd:()=>root};
 const filesystem={
  existsSync:file=>fs.existsSync(path.resolve(root,file)),
  readdirSync:directory=>fs.readdirSync(path.resolve(root,directory)),
  readFileSync(file,encoding){
   const absolute=path.resolve(root,file),name=path.relative(root,absolute);
   const value=fs.readFileSync(absolute,encoding);return mutations[name]?mutations[name](value):value;
  }
 };
 const source=fs.readFileSync(path.join(root,'scripts/check-app-shell.mjs'),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(source,{fs:filesystem,path,process:processState,console:{error:message=>messages.push(message),log(){}}});
 return {failed:processState.exitCode===1,messages:messages.join('\n')};
}
test('all shared pages use the canonical cache key and standalone navigation remains valid',()=>{
 const result=check();assert.equal(result.failed,false,result.messages);
});
for(const [name,mutate,expected] of [
 ['stale navigation version',html=>html.replace(/nav-menu\.js\?v=[\w-]+/g,'nav-menu.js?v=20261015-nav-sync1'),/about.html uses nav-menu version/],
 ['missing shared navigation',html=>html.replace(/<script\b[^>]*src="nav-menu\.js[^>]*><\/script>/g,''),/about.html is missing a versioned/],
 ['deferred critical navigation',html=>html.replace('<script src="nav-menu.js','<script defer src="nav-menu.js'),/about.html defers the critical/]
])test('shell check rejects '+name,()=>{
 const result=check({'about.html':mutate});assert.equal(result.failed,true);assert.match(result.messages,expected);
});
test('standalone markers cannot hide missing local destinations or a mixed shared shell',()=>{
 for(const mutate of [html=>html.replace('<a href="index.html">Home</a>','<a href="missing-navigation-page.html">Home</a>'),html=>html.replace('</body>','<script src="nav-menu.js?v=20261023-region-awards1"></script></body>')]){
  const result=check({'region-awards.html':mutate});assert.equal(result.failed,true);assert.match(result.messages,/broken standalone navigation link|mixes standalone and shared navigation/);
 }
});
test('rankings mobile runtime executes and labels the latest state and classification snapshots',async()=>{
 assert.doesNotMatch(fs.readFileSync(path.join(root,'rankings.html'),'utf8').split('</head>')[0],/>\\n</,'Metadata separators must be actual newlines, not visible text');
 const nodes={rankingSnapshot:{options:[{textContent:'Week 9 — latest class rankings'}]},state25Snapshot:{options:[{textContent:'Week 10 — latest statewide rankings'}]},rankingSubtitle:{},rankingMeta:{},classRankingsUpdateNote:{}};
 const help={},styles=[];
 const context={location:{pathname:'/rankings.html'},document:{createElement:()=>({}),head:{appendChild:n=>styles.push(n)},getElementById:id=>nodes[id],querySelector:()=>help},setTimeout:fn=>fn(),addEventListener(){},RUSRankingsInitialDataReady:Promise.resolve()};context.window=context;
 vm.runInNewContext(fs.readFileSync(path.join(root,'rankings-mobile-fix.js'),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(styles.length,1);assert.match(styles[0].textContent,/grid-template-areas/);
 assert.equal(nodes.rankingSubtitle.textContent,'Week 10 State Top 25 and Week 9 classification rankings are live.');
 assert.match(nodes.rankingMeta.innerHTML,/State Top 25: Week 10/);assert.match(nodes.classRankingsUpdateNote.innerHTML,/Week 9 class rankings/);
});

test('navigation requests the repaired rankings runtime with a fresh cache key',()=>{
 const source=fs.readFileSync(path.join(root,'nav-menu.js'),'utf8');
 assert.match(source,/rankings-mobile-fix\.js\?v=20261027-runtime-repair1/);
 assert.doesNotMatch(source,/rankings-mobile-fix\.js\?v=20260926-week8-dynamic1/);
});
