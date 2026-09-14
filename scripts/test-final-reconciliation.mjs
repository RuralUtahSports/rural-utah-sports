import assert from 'node:assert/strict';
import {reconcileFinalGames} from './reconcile-final-games.mjs';
const games=[
 {date:'8/21/2026',awayTeam:'WEST FIELD',homeTeam:'WOODS CROSS',actualAway:21,actualHome:20},
 {date:'09/11/2026',awayTeam:'EASTWOOD TEXAS',homeTeam:'CORNER CANYON',actualAway:7,actualHome:52},
 {date:'09/11/2026',awayTeam:'EASTWOOD, TX',homeTeam:'CORNER CANYON',actualAway:7,actualHome:52}
];
const final={final:true,boxScore:{rows:[{total:21},{total:26}]}};
let result=reconcileFinalGames(games,{details:{'2026-08-21|WESTFIELD|WOODSCROSS':final}});
assert.equal(result.length,2);
assert.equal(result[0].actualHome,26);
assert.equal(result[1].awayTeam,'EASTWOOD, TX');
assert.equal(reconcileFinalGames(games,{details:{'2026-08-21|WESTFIELD|WOODSCROSS':{...final,final:false,status:'Scheduled'}}})[0].actualHome,20);
assert.equal(reconcileFinalGames(games,{details:{'2026-08-21|WESTFIELD|WOODSCROSS':final},corrections:[{...games[0],actualHome:30}]})[0].actualHome,30);
assert.equal(reconcileFinalGames([{...games[0],actualAway:'',actualHome:null}]).length,0);
assert.equal(reconcileFinalGames([games[0],{...games[0],date:'8/22/2026'}]).length,1);
assert.equal(reconcileFinalGames([games[0],{...games[0],date:'10/22/2026'}]).length,2);
console.log('PASS: corrected finals, aliases, moved games, missing scores, and scheduled response protection.');
