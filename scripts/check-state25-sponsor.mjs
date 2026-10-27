import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(file,'utf8');
const config=JSON.parse(read('feature-sponsors.json'));
const rankings=read('rankings.html'),source=read('rankings-sponsor.js');
assert.ok(['none','sponsor'].includes(config.stateTop25?.mode),'Top 25 must explicitly configure its sponsorship mode');
if(config.stateTop25.mode==='sponsor'){
 for(const field of ['business','label','logo','email'])assert.ok(config.stateTop25[field],`Active sponsor is missing ${field}`);
 assert.ok(fs.existsSync(config.stateTop25.logo),'Active sponsor must use an existing authentic logo');
}
assert.match(rankings,/<script[^>]+src="rankings-sponsor\.js\?v=[^"]+"/);
assert.match(rankings,/rankings-share-bootstrap\.js/,'The current direct-sharing loader remains wired');
assert.match(rankings,/id="state-top-25"/);
assert.ok(!source.includes("querySelector('.rank-card')")&&!source.includes('small-school-section'),'Top 25 sponsorship must not target classification cards');
for(const token of ['feature-sponsors.json','featureCard','rankings.html#state-top-25'])assert.ok(read('sponsors.html').includes(token));

// Exercise both configured-off and active states without requiring a retired
// sponsorship to be enabled in live data, or reading a URL query as a filename.
const nodes=[];
function node(){return {children:[],dataset:{},appendChild(item){this.children.push(item);item.attached=true},insertAdjacentElement(position,item){assert.equal(position,'afterend');this.appendChild(item)}}}
const header=node();
const document={head:node(),getElementById:id=>nodes.find(n=>n.id===id&&n.attached)||null,querySelector:selector=>selector==='#state-top-25 .state25-head'?header:null,createElement(){const item=node();nodes.push(item);return item}};
const context={document,location:{pathname:'/rankings.html'},navigator:{userAgent:''},matchMedia:()=>({matches:false}),console};context.window=context;
const runtime=source.replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();",'window.testSponsor={active,render,enhanceExport,emailHref};');
vm.runInNewContext(runtime,context);
const api=context.testSponsor;
assert.equal(api.active({mode:'none'}),false);api.render({mode:'none'});assert.equal(header.children.length,0,'Disabled sponsor cannot add branding');
const fixture={mode:'sponsor',business:'Fixture Sponsor',email:'fixture@example.com',logo:'sponsors/jh3d-printz-logo.svg'};
assert.equal(api.active(fixture),true);api.render(fixture);api.render(fixture);
assert.equal(header.children.length,1,'Sponsor rendering must be idempotent');
assert.match(header.children[0].innerHTML,/Presented by Fixture Sponsor/);
assert.match(header.children[0].innerHTML,/Rankings remain independently selected/);
assert.match(api.emailHref(fixture),/^https:\/\/mail\.google\.com\//);
context.matchMedia=()=>({matches:true});assert.match(api.emailHref(fixture),/^mailto:fixture@example.com/);
const grid=node(),board=node();board.querySelector=()=>grid;api.enhanceExport(board,fixture);api.enhanceExport(board,fixture);
assert.equal(board.children.length,1);assert.equal(board.children[0].textContent,'Presented by Fixture Sponsor');
const disabled=node();disabled.querySelector=()=>grid;api.enhanceExport(disabled,{mode:'none'});assert.equal(disabled.children.length,0);
console.log('State Top 25 sponsor checks passed: explicit configured mode, independent rankings, active/off rendering, contacts, and idempotent export branding.');
