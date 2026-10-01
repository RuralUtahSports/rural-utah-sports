importScripts('rpi-picks-core.js?v=20261001-paths1','rpi-paths-core.js?v=20261001-paths1');
let prepared;
self.onmessage=event=>{
  try {
    const {teams,games,oos,request}=event.data;
    if(!prepared)prepared=RUSRpiPaths.model(teams,games,oos,RUSRpiPicks.calculate,(done,total)=>self.postMessage({type:'progress',done,total}));
    const result=RUSRpiPaths.search(prepared,request);
    if(result.paths.length){
      const example=result.paths[0];
      // Verify the winning witness with the full calculator rather than just its affine representation.
      const standings=RUSRpiPicks.calculate(teams,{games:RUSRpiPaths.project(games,prepared.remaining,example.bits)},oos);
      result.standings=standings[request.classification];
      const target=result.standings.find(row=>row.team===request.team);
      const verifiedSeed=1+result.standings.filter(row=>row.team!==request.team && row.rpi>=target.rpi-1e-10).length;
      if(verifiedSeed>request.target || !target.postseasonEligible)throw new Error('The example path did not pass verification. Please try again.');
      result.exampleGames=prepared.remaining.map((g,j)=>({date:g.date,awayTeam:g.awayTeam,homeTeam:g.homeTeam,winner:example.bits[j]?g.awayTeam:g.homeTeam,own:result.own.includes(j)}));
    }
    self.postMessage({type:'result',result});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
