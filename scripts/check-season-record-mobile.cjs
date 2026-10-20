#!/usr/bin/env node
// Regression: each season record must be a sibling card, not an unclosed
// <article> nesting recursively and shrinking to a few pixels on mobile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('home-season-record-alerts.js', 'utf8');
const testSource = source.replace(/\}\)\(\);\s*$/, 'globalThis.__seasonTest = {card, group, css};})();');
assert.notEqual(testSource,source,'Could not load the actual season card renderer');
const styles=[];
const document = {
  readyState:'loading',
  addEventListener(){},
  getElementById(){return null},
  head:{appendChild:style=>styles.push(style.textContent)},
  createElement(type){
    if(type==='style')return {id:'',textContent:''};
    return {dataset:{},innerHTML:'',addEventListener(){},querySelector(){return null}};
  }
};
const ctx={document,console};
vm.runInNewContext(testSource,ctx,{filename:'home-season-record-alerts.js'});
const {card,group,css}=ctx.__seasonTest;
assert.equal(typeof card,'function');
assert.equal(typeof group,'function');

function verify(html,expected){
  const stack=[];
  let articleCount=0,maxArticleDepth=0,articleDepth=0,scrollerDepth=null;
  for(const m of html.matchAll(/<\/?([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/g)){
    const tag=m[1].toLowerCase();
    if(['img','input','br','hr','meta','link'].includes(tag))continue;
    const isClosing=m[0].startsWith('</');
    if(!isClosing){
      if(tag==='article'){
        assert.equal(articleDepth,0,'Nested article: mobile cards shrink into a staircase');
        articleCount++;articleDepth++;maxArticleDepth=Math.max(maxArticleDepth,articleDepth);
        if(scrollerDepth!==null)assert.equal(stack.length,scrollerDepth+1,'Card is not a direct child of the horizontal scroller');
      }
      if(m[0].includes('class="rus-season-scroller"'))scrollerDepth=stack.length;
      stack.push(tag);
    }else{
      assert.equal(stack.pop(),tag,'Unbalanced record alert markup near '+m[0]);
      if(tag==='article')articleDepth--;
      if(scrollerDepth!==null&&stack.length<=scrollerDepth)scrollerDepth=null;
    }
  }
  assert.equal(stack.length,0,'Record alert markup left elements unclosed');
  assert.equal(articleDepth,0);
  assert.equal(articleCount,expected);
  assert.ok(maxArticleDepth<=1);
}
const mock=(i)=>({team:'Team '+i,player:i%3===0?'Player '+i:undefined,
 recordType:i%3===0?'seasonPlayer':'seasonTeam',
 status:i%5===0?'on-pace':'broken',categoryKey:'pointsFor',
 category:'Most Points Scored in a Season',value:302+i,unit:'points',
 previousValue:264,previousSeason:2024,date:'2026-10-16'});
for(const i of [0,1,2])verify(card(mock(i)),1);
const rows=Array.from({length:18},(_,i)=>mock(i));
verify(rows.map(card).join(''),18);
const box=group('2026 Single-Season Team Records','History',rows,'team');
verify(box.innerHTML,18);
assert.match(box.innerHTML,/class="rus-season-scroller"/);
assert.match(card(mock(1)),/View team →<\/a><\/article>$/);
css();
assert.equal(styles.length,1);
assert.ok(styles[0].includes('flex-wrap:nowrap'),'Missing nowrap for horizontal cards');
assert.ok(styles[0].includes('.rus-season-scroller > .rus-season-card'),'Cards need direct-child sizing');
assert.ok(styles[0].includes('overflow-x:auto'),'Mobile scroller must allow horizontal swipes');
console.log('PASS: 18 separate season record cards, balanced markup, direct horizontal siblings and mobile sizing');
