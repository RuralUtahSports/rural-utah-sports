const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const brackets=JSON.parse(fs.readFileSync(path.join(root,'official-brackets-2026.json'),'utf8'));

test('8-Player bracket schedules Water Canyon–Whitehorse Saturday Oct 31 at 2 PM',()=>{
 const eight=brackets.classifications['8-Player'];
 const quarterfinals=eight.rounds[1];
 const matches=quarterfinals.games.filter(g=>g.a?.name==='Water Canyon'&&g.b?.name==='Whitehorse');
 assert.equal(matches.length,1);
 assert.equal(matches[0].date,'Oct 31, 2026');
 assert.equal(matches[0].time,'2:00 PM');
 assert.match(quarterfinals.name,/Oct 30–31/);
 assert.equal(quarterfinals.games.filter(g=>g.date==='Oct 30, 2026').length,3);
 assert.equal(matches[0].a.seed,4);
 assert.equal(matches[0].b.seed,5);
 assert.equal(matches[0].a.score,undefined);
});

test('Week 12 scoreboard includes the rescheduled Saturday game on its own date',()=>{
 const html=fs.readFileSync(path.join(root,'scoreboard.html'),'utf8');
 const match=html.match(/function playoffWeek12FromBrackets\(payload\)\{[\s\S]*?\n\}\nfunction waitingOnOpponent/);
 assert.ok(match,'Week 12 bracket adapter is present');
 const script=match[0].replace(/\nfunction waitingOnOpponent$/,'');
 const context={
   isoDate(value){const t=Date.parse(value);return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):'';},
   playoffTeamName(name){return name;}
 };
 vm.runInNewContext(script,context);
 const rows=context.playoffWeek12FromBrackets(brackets);
 const matchups=rows.filter(g=>g.homeTeam==='Water Canyon'&&g.awayTeam==='Whitehorse');
 assert.equal(matchups.length,1);
 assert.equal(matchups[0].date,'10/31/2026');
 assert.equal(matchups[0].time,'2:00 PM');
 assert.equal(matchups[0].playoffWeek,12);
 assert.equal(matchups[0].actualAway,null);
 assert.equal(matchups[0].actualHome,null);
 assert.equal(rows.filter(g=>g.classification==='8-Player'&&g.date==='10/30/2026').length,3);
 assert.match(html,/Week 12 · October 30–31 \(Friday–Saturday\)/);
});
