const fs=require('fs'),vm=require('vm'),assert=require('assert');
const eight=JSON.parse(fs.readFileSync('uhsaa-football-records-8-player.json','utf8'));
assert.equal(eight.categories.length,132);
assert.equal(eight.categories.reduce((n,c)=>n+c.entries.length,0),693);
assert.equal(new Set(eight.categories.map(c=>c.id)).size,132);
for(const c of eight.categories){assert.equal(c.format,'8-player');assert(c.sourcePage>=133&&c.sourcePage<=144);for(const e of c.entries)assert(Number.isFinite(e.value));}
const byId=new Map(eight.categories.map(c=>[c.id,c]));
assert.equal(byId.get('pass-yards-season').entries[0].value,2297);
assert.equal(byId.get('team-passing-yards-fewest-allowed-in-a-game').entries[0].value,-1);
assert.equal(byId.get('rushing-yards-game').entries[0].name,'Rodrick Richards III');
function loadModule(file,exports,pathname){const source=fs.readFileSync(file,'utf8').replace(/if\(document.readyState[\s\S]*$/,`globalThis.testAPI={${exports}};})();`);const ctx={location:{pathname},window:{},document:{},console};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.testAPI;}
const api=loadModule('record-watch-everywhere.js','collect','/index.html');
const section=value=>({stats:[{category:'Passing',headers:['Yards'],rows:[{name:'Test Player',values:{Yards:value}}]}]});
const stats={teams:{Rich:section(2000),Juab:section(2000),Unknown:section(2000)}};
const meta=new Map([['RICH',{classification:'8-Player'}],['JUAB',{classification:'3A'}]]);
const eleven=new Map([['pass-yards-season',{entries:[{value:5000,name:'11-player holder'}]}]]);
const rows=api.collect(stats,eleven,meta,byId);
assert.equal(rows.length,2);assert.equal(rows.find(r=>r.team==='Rich').recordValue,2297);assert.equal(rows.find(r=>r.team==='Juab').recordValue,5000);
assert.equal(api.collect(stats,eleven,meta,new Map()).length,1,'Missing 8-player data must never fall back to 11-player');
const elements={rusUhsaaBody:{innerHTML:''},rusUhsaaFormat:{},rusUhsaaGroups:{innerHTML:'',querySelectorAll:()=>[]},rusUhsaaCategory:{innerHTML:''}};
const src=fs.readFileSync('uhsaa-record-book.js','utf8').replace(/if\(document.readyState[\s\S]*$/,`globalThis.testAPI={set:(book,format,cat,search='')=>{data=book;footballFormat=format;category=cat;query=search},render};})();`);
const ctx={location:{pathname:'/records.html'},document:{getElementById:id=>elements[id]},window:{}};vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.testAPI.set(eight,'8-player','pass-yards-season','Madden');ctx.testAPI.render();assert(elements.rusUhsaaBody.innerHTML.includes('8-Player'));assert(elements.rusUhsaaBody.innerHTML.includes('rus-official-rank">2<'));assert(!elements.rusUhsaaBody.innerHTML.includes('Jackson Keyes'));
ctx.testAPI.set(eight,'8-player','safties-game');ctx.testAPI.render();assert(elements.rusUhsaaBody.innerHTML.includes('No matching'));
console.log('Football record formats: 132 categories / 693 entries; separate watch baselines, missing-data isolation, negative records and search rank preservation passed.');
