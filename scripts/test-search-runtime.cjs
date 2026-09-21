// Dependency-free data and asynchronous search regressions. Browser layout needs separate QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  const index = JSON.parse(fs.readFileSync('site-search-index.json', 'utf8'));
  for (const year of [2026, 2025]) {
    const source = JSON.parse(fs.readFileSync(`deseret-rosters-stats-${year}.json`, 'utf8'));
    const expected = new Map();
    for (const [key, team] of Object.entries(source.teams)) for (const p of team.roster || []) {
      const id = String(p.playerId || '').trim();
      if (id && String(p.name || '').trim() && !expected.has(id)) expected.set(id, [id,String(p.name).trim(),String(team.team||key).trim(),String(p.number??'').trim(),String(p.position??'').trim(),String(p.class??'').trim(),year]);
    }
    const actual = new Map(index.p.filter(p => p[6] === year).map(p => [p[0],p]));
    assert.equal(actual.size, expected.size);
    for (const [id, row] of expected) assert.deepEqual(actual.get(id), row);
  }
  const standings = JSON.parse(fs.readFileSync('standings-2026.json','utf8'));
  assert.deepEqual(index.t, Object.values(standings.byClassification).flat().map(t=>[t.team,t.classification,t.region]));
  const weekly = JSON.parse(fs.readFileSync('weekly-simulation.json','utf8'));
  assert.deepEqual(index.g, weekly.games.map(g=>[g.awayTeam,g.homeTeam,g.date]));
  class Element {
    constructor(){this.events={};this.style={};this.value='';this.innerHTML='';this.classes=new Set();this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),contains:v=>this.classes.has(v)};}
    addEventListener(name,fn){this.events[name]=fn}
    setAttribute(){}
    appendChild(){}
    querySelector(selector){return elements[selector]||null}
    focus(){}
    insertAdjacentHTML(_,html){this.innerHTML+=html}
  }
  const elements={};
  for(const name of ['header .header-content','.rus-search-input','.rus-search-results','.rus-search-close'])elements[name]=new Element();
  const created=[];
  const document={readyState:'complete',head:new Element(),body:new Element(),activeElement:null,getElementById:()=>null,querySelector:s=>elements[s]||null,createElement:()=>{const el=new Element();created.push(el);return el},addEventListener(){}};
  const window={};let release,fail=false,requests=0;
  const fetch=async url=>{
    assert.equal(url,'site-search-index.json');requests++;
    if(requests===1)await new Promise(resolve=>release=resolve);
    return {ok:!fail,json:async()=>index};
  };
  vm.runInNewContext(fs.readFileSync('site-search.js','utf8'),{window,document,fetch,URLSearchParams,requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout,console});
  const input=elements['.rus-search-input'],results=elements['.rus-search-results'];
  const pause=()=>new Promise(resolve=>setTimeout(resolve,130));
  const type=async value=>{input.value=value;input.events.input();await pause()};
  const trigger=created.find(el=>el.className==='rus-search-trigger');
  trigger.events.click({type:'click'});
  assert.equal(input.value,'');assert.equal(requests,0);
  await type('j');assert.equal(requests,0);
  await type('ju');assert.equal(requests,1);
  input.value='';input.events.input();release();await pause();
  assert.match(results.innerHTML,/Quick Link/);
  const archive=index.p.find(p=>p[6]===2025);
  await type(archive[1]);
  assert.ok(results.innerHTML.includes(`player.html?id=${encodeURIComponent(archive[0])}&amp;season=2025`));
  await type('juab');assert.match(results.innerHTML,/team.html\?team=JUAB/);
  assert.equal(requests,1);
  elements['.rus-search-close'].events.click();assert.equal(document.body.style.overflow,'');
  // A fresh session reports transient failure, then retries instead of caching an empty index.
  delete window.__RUS_SITE_SEARCH__;fail=true;
  vm.runInNewContext(fs.readFileSync('site-search.js','utf8'),{window,document,fetch,URLSearchParams,requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout,console});
  window.RUSOpenSearch('juab');await pause();assert.match(results.innerHTML,/temporarily unavailable/);
  fail=false;await type('manti');assert.match(results.innerHTML,/team.html\?team=MANTI/);
  console.log(`Search regression checks passed: ${index.p.length} players, ${index.t.length} teams, ${index.g.length} games; lazy fetch, stale-result guard, archive links and retry.`);
})().catch(error=>{console.error(error);process.exitCode=1});
