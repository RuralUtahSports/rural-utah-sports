(() => {
  'use strict';
  const form=document.getElementById('rpiPathForm');if(!form)return;
  const question=document.getElementById('rpiPathQuestion'),status=document.getElementById('rpiPathStatus'),output=document.getElementById('rpiPathResult'),submit=form.querySelector('[type=submit]'),cancel=document.getElementById('rpiPathCancel');
  const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const compact=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const day=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:v;};
  const gameId=g=>`${day(g.date)}|${[compact(g.awayTeam),compact(g.homeTeam)].sort().join('|')}`;
  let data,worker,latest,rangeSearch,busy=false,generation=0;
  const get=async file=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(`${file}?v=${Date.now()}`,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('The schedule could not load. Please try again.');return await r.json();}finally{clearTimeout(timer);}};
  function setBusy(value){busy=value;submit.disabled=value;cancel.hidden=!value;form.setAttribute('aria-busy',String(value));}
  function show(result){
    if(result.highest){rangeSearch=result;show(result.highest);return;}
    latest=result;
    const {request,paths,evaluated,exhaustive}=result;
    const assumption=result.conditionLabel?`<p><strong>Condition:</strong> ${h(result.conditionLabel)}</p>`:'';
    const mode=request.mode||'target';
    const goal=mode==='highest'?'highest possible seed':mode==='lowest'?'lowest possible seed':`top ${request.target}`;
    const label=`${request.team}: ${goal} in ${request.classification==='8P'?'8-Player':request.classification}`;
    if(!paths.length){
      output.innerHTML=`<h3>${h(label)}</h3>${assumption}<p>${exhaustive?'No path to a clear seed inside this target exists in the evaluated schedule. A tie at the cutoff may still need an official tiebreaker.':'No path found in this search. This does not prove the team is eliminated.'}</p><p class="rpi-picks-note">${evaluated.toLocaleString()} scenarios checked. ${exhaustive?'All relevant remaining-game combinations were checked.':'The statewide schedule has too many combinations to exhaustively check in this search.'} Out-of-state opponent records stay at their latest available values.</p>`;
      return;
    }
    const path=paths[0],seedLabel=path.safeRank>path.rank?`tied at No. ${path.rank} (positions ${path.rank}–${path.safeRank})`:`No. ${path.rank}`,row=result.standings.find(r=>r.team===request.team),own=result.exampleGames.filter(g=>g.own);
    const rows=list=>list.map(g=>`<tr><td>${h(g.date)}</td><td>${h(g.awayTeam)} at ${h(g.homeTeam)}</td><td><strong>${h(g.winner)}</strong></td></tr>`).join('');
    const answer=mode==='highest'?`${result.proven?'Highest possible seed':'Highest seed found'}: ${seedLabel}`:mode==='lowest'?`${result.proven?'Lowest possible seed':'Lowest seed found'}: ${seedLabel}`:`One working path: projected ${seedLabel}`;
    const explanation=mode==='target'?(exhaustive?'This is the fewest wins in a clear qualifying path among all relevant combinations.':'This is the fewest wins among the paths found, not a proven minimum.'):result.proven?'This limit is proven within the model and its current opponent data.':'This is a verified example, but the search has not proven that a better or worse seed is impossible.';
    const range=rangeSearch?`<h3>${h(request.team)}’s seed range</h3><p>Highest ${rangeSearch.highest.proven?'possible':'found'}: No. ${rangeSearch.highest.paths[0].rank}. Lowest ${rangeSearch.lowest.proven?'possible':'found'}: No. ${rangeSearch.lowest.paths[0].rank}. This describes the endpoints; it does not establish that every seed between them is reachable. Tied RPI ranks may need official tiebreakers.</p><button type="button" data-seed-example="highest">View Highest Scenario</button> <button type="button" data-seed-example="lowest">View Lowest Scenario</button>`:'';
    output.innerHTML=`${range}<h3>${h(label)}</h3>${assumption}<p><strong>${h(answer)}, ${h(row.record)}, RPI ${Number(row.rpi).toFixed(6)}.</strong></p>${row.postseasonEligible?'':'<p>This team has fewer than six counted games and is not currently postseason eligible in this model.</p>'}<p>This example has ${h(request.team)} winning ${path.wins} of its ${own.length} remaining games. ${explanation}</p><h4>${h(request.team)}’s results in this path</h4><div class="table-wrap"><table><thead><tr><th>Date</th><th>Game</th><th>Winner</th></tr></thead><tbody>${rows(own)}</tbody></table></div><p class="rpi-picks-note">These team results work with the other game results below. They do not guarantee the seed by themselves.</p><details class="rpi-path-details"><summary>All other results used in this example (${result.exampleGames.length-own.length} games)</summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Game</th><th>Winner</th></tr></thead><tbody>${rows(result.exampleGames.filter(g=>!g.own))}</tbody></table></div></details><details class="rpi-path-details"><summary>Projected ${h(request.classification)} standings for this path</summary><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Record</th><th>RPI</th></tr></thead><tbody>${result.standings.map((r,i,list)=>{let rank=i+1;while(rank>1&&Math.abs(list[rank-2].rpi-r.rpi)<1e-10)rank--;return `<tr${r.team===request.team?' class="rpi-path-highlight"':''}><td>${rank}</td><td>${h(r.team)}</td><td>${h(r.record)}</td><td>${Number(r.rpi).toFixed(6)}</td></tr>`;}).join('')}</tbody></table></div></details><button type="button" id="rpiPathUse">Use This Scenario in the RPI Simulator</button><p class="rpi-picks-note">${evaluated.toLocaleString()} scenarios checked. ${exhaustive?'All relevant combinations were checked.':'Search results are example paths, not playoff odds, clinching rules or elimination guarantees.'} Completed scores stay fixed. Out-of-state opponent WP and OWP use current data, with .500 for missing values. Grand and Layton Christian follow the existing site exclusions. Official standings and tiebreakers may differ.</p>`;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const token=++generation;setBusy(true);output.innerHTML='';rangeSearch=null;status.textContent='Loading the schedule…';
    try {
      if(!data){
        const [teams,weekly,oos]=await Promise.all([get('teams-data.json'),get('weekly-simulation.json'),get('rpi-oos-2026.json')]);
        if(token!==generation)return;
        if(!Array.isArray(teams)||!Array.isArray(weekly.games)||!oos.teams)throw new Error('The schedule data is incomplete. Please try again.');
        const unique=new Map();weekly.games.filter(g=>g.awayTeam&&g.homeTeam&&new Date(g.date).getFullYear()===2026).forEach(g=>{const prior=unique.get(gameId(g));if(!prior||RUSRpiPaths.final(g))unique.set(gameId(g),g);});
        const games=[...unique.values()].sort((a,b)=>new Date(a.date)-new Date(b.date)||a.awayTeam.localeCompare(b.awayTeam));
        data={teams,games,oos};
      }
      const request=RUSRpiPaths.parseQuestion(question.value,data.teams);
      const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const part=type=>dateParts.find(p=>p.type===type).value;
      request.asOf=`${part('year')}-${part('month')}-${part('day')}`;
      status.textContent=request.mode?`Searching ${request.team}’s ${request.mode==='range'?'seed range':request.mode+' seed'}…`:`Searching ${request.team}’s path to the top ${request.target}…`;
      if(!worker){
        worker=new Worker(new URL('rpi-paths-worker.js?v=20261001-conditions4',document.baseURI));
        worker.onmessage=event=>{
          const message=event.data;
          if(message.type==='progress')status.textContent=`Preparing the RPI calculation: ${message.done} of ${message.total} remaining games…`;
          else if(message.type==='result'){setBusy(false);status.textContent='Search complete.';show(message.result);}
          else if(message.type==='error'){setBusy(false);status.textContent=message.message;}
        };
        worker.onerror=()=>{setBusy(false);status.textContent='The search could not finish. Please try again.';worker.terminate();worker=null;};
      }
      worker.postMessage({...data,request});
    }catch(error){if(token===generation){setBusy(false);status.textContent=error.message;}}
  });
  cancel.addEventListener('click',()=>{generation++;if(worker)worker.terminate();worker=null;setBusy(false);status.textContent='Search cancelled. You can try another question.';});
  output.addEventListener('click',event=>{
    const endpoint=event.target.closest('[data-seed-example]');
    if(endpoint && rangeSearch){show(rangeSearch[endpoint.dataset.seedExample]);return;}
    if(!event.target.closest('#rpiPathUse')||!latest?.exampleGames)return;
    const picks=Object.fromEntries(latest.exampleGames.map(g=>[gameId(g),g.winner]));
    try{localStorage.setItem('rus-rpi-picks-2026-v1',JSON.stringify(picks));}
    catch{status.textContent='The scenario could not be saved on this device.';return;}
    window.dispatchEvent(new CustomEvent('rus-rpi-scenario',{detail:picks}));
    const body=document.getElementById('rpiPicksBody');if(body.hidden)document.getElementById('rpiPicksOpen').click();
    document.getElementById('rpiPicks').scrollIntoView({behavior:'smooth',block:'start'});
    status.textContent='Scenario copied to the simulator. Press Calculate RPI to review or change the picks.';
  });
})();
