const test=require('node:test');
const assert=require('node:assert/strict');
const review=require('../reviewed-hunt-postseason-2026.js');
const e=review.fiefiaEvidence;
const player={playerId:e.id,name:e.name,number:e.number};
test('Fiefia reported season totals are championship-inclusive without changing locked season data',()=>{
 const school={roster:[player],stats:[{category:'Rushing',headers:['CARRIES','YARDS','TD'],rows:[{...player,values:{CARRIES:'260',YARDS:'2701',TD:'46'}}]}]};
 const data={season:2026,teams:{RIDGELINE:school}};
 review.apply(data);review.apply(data);
 assert.deepEqual(school.stats[0].rows[0].values,{CARRIES:'281',YARDS:'2805',TD:'48','YARDS/CARRY':'9.98'});
 assert.equal(review.apply({...data,season:2025}),0);
});
test('Fiefia championship recovery fills only reported fields and never duplicates a game',()=>{
 const games={team:'RIDGELINE',games:[{date:'2026-11-20',opponent:'Skyline',teamScore:14,opponentScore:41,players:[]}]};
 review.applyFiefiaGames(games);review.applyFiefiaGames(games);
 assert.equal(games.games.length,1);
 assert.equal(games.games[0].players.length,1);
 const l=games.games[0].players[0].statLines[0];
 assert.deepEqual(l.values,{CARRIES:'21',YARDS:'104',TD:'2'});
 l.values.TD='3';review.applyFiefiaGames(games);assert.equal(l.values.TD,'3');
 assert.equal(review.applyFiefiaGames({team:'WHITEHORSE',games:[]}),0);
});
