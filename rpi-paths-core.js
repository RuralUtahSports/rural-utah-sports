(function(scope) {
  'use strict';
  const norm = value => String(value || '').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const teamKey = value => norm(value).replace(/ /g,'');
  const final = g => [g.actualAway,g.actualHome].every(v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v)));
  const aliases = {'CEDAR CITY':['cedar'], 'SAINT JOSEPH':['st joseph','st. joseph'], 'ALA':['american leadership academy'], 'UMA-LEHI':['uma camp williams'], 'MONUMENT VALLEY':['monument val']};
  function parseQuestion(question, teams) {
    const q=norm(question), main=q.split(/\b(?:if|assuming|when|after|provided)\b/)[0];
    if(/\b(?:unless|without)\b/.test(q))throw new Error('Use a direct condition, such as “if they win out” or “if they lose Friday.”');
    const matches=teams.filter(t => [t.team,...(aliases[t.team]||[])].some(name => new RegExp('(?:^| )'+norm(name)+'s?(?= |$)').test(main)));
    if(matches.length!==1) throw new Error(matches.length ? 'Please name one team before the condition in your question.' : 'Please include a Utah team name, such as Uintah or North Sanpete.');
    const team=matches[0], classification=teamKey(team.team)==='enterprise'?'1A':team.classification;
    if(['grand','grandcounty','laytonchristian'].includes(teamKey(team.team))) throw new Error('This team is excluded from the current RPI postseason calculation.');
    const cap={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11}[classification];
    let condition;
    const clause=q.split(/\b(?:if|assuming|when|after|provided)\b/).slice(1).join(' ').trim() || q;
    const record=clause.match(/\b(?:go|goes|finish|finishes|finishing)\s+(\d+)\s+(\d+)\b/);
    if(/\b(?:win|wins|winning)\s+out\b/.test(clause))condition={type:'winOut'};
    else if(/\b(?:lose|loses|losing)\s+out\b/.test(clause))condition={type:'loseOut'};
    else if(record)condition={type:'record',wins:Number(record[1]),losses:Number(record[2])};
    else {
      const game=clause.match(/\b(win|wins|beat|beats|lose|loses|losing)\s+(?:(?:their|its|the|on|to|against|this|they)\s+)*(.*?)\s*[?!.]*$/);
      if(game){
        const suffix=game[2].replace(/^(?:their|its|the|this) /,''),won=/^(?:win|wins|beat|beats)$/.test(game[1]);
        if(/^(?:next game|next week|next)$/.test(suffix))condition={type:'game',selector:'next',won};
        else if(/^(?:today|tonight|tomorrow)$/.test(suffix))condition={type:'game',selector:suffix,won};
        else if(/^(?:next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(suffix))condition={type:'game',selector:suffix.replace(/^next /,''),won};
        else {
          const opponent=teams.find(t=>[t.team,...(aliases[t.team]||[])].some(name=>norm(name)===suffix));
          if(opponent && opponent.team!==team.team)condition={type:'game',selector:'opponent',opponent:opponent.team,won};
          else throw new Error('Name the next game, a day such as Friday, or an opponent for the win/loss condition.');
        }
      }
    }
    if(condition && /\b(?:and|or|unless|without)\b/.test(clause))throw new Error('Use one condition at a time: win out, lose one specified game, or finish the remaining games with a record such as 2–1.');
    if(!condition && /\b(?:if|assuming|when|provided|wins?|loses?|beats?|losing)\b/.test(q))throw new Error('Supported conditions are winning out, losing out, winning or losing a specified game, and going 2–1 over the remaining games.');
    const extra=condition?{condition}:{};
    if(/\b(highest|best|ceiling|maximum)\b/.test(q)) return {team:team.team,classification,target:1,mode:'highest',...extra};
    if(/\b(lowest|worst|floor|minimum)\b/.test(q)) return {team:team.team,classification,target:64,mode:'lowest',...extra};
    if(/\b(range|seeds possible|possible seeds)\b/.test(q) || condition && /\bwhere\b/.test(main)) return {team:team.team,classification,target:1,mode:'range',...extra};
    const m=main.match(/\btop\s*(\d+)\b/) || main.match(/\b(?:seed|rank)\s*(\d+)\b/) || main.match(/\b(\d+)(?:st|nd|rd|th)?\s+seed\b/) || main.match(/\bnumber\s*(\d+)\b/);
    const target=m?Number(m[1]):/\b(playoff|playoffs|postseason)\b/.test(main)?cap:null;
    if(target===null)throw new Error('Ask for a target seed, the highest or lowest possible seed, or a team’s seed range.');
    if(!Number.isInteger(target)||target<1||target>64) throw new Error('Please choose a target seed from 1 to 64.');
    return {team:team.team,classification,target,...extra};
  }
  function project(games, remaining, bits) {
    // Worker messages clone objects. Match schedule rows by value across messages.
    const gameKey=g=>JSON.stringify([g.date,teamKey(g.awayTeam),teamKey(g.homeTeam)]);
    const chosen=new Map(remaining.map((g,i)=>[gameKey(g),bits[i]]));
    return games.map(g=>{
      if(final(g))return g;
      const key=gameKey(g);
      if(!chosen.has(key))throw new Error('The scenario does not match the loaded schedule. Please try again.');
      return {...g,actualAway:chosen.get(key)?1:0,actualHome:chosen.get(key)?0:1};
    });
  }
  function model(teams,games,oos,calculate,progress=()=>{}) {
    const remaining=games.filter(g=>!final(g)),bits=new Uint8Array(remaining.length),base=calculate(teams,{games:project(games,remaining,bits)},oos);
    const names=Object.values(base).flat().map(r=>r.team), indices=new Map(names.map((n,i)=>[n,i]));
    const values=new Float64Array(names.length), coefficients=remaining.map(()=>new Float64Array(names.length));
    const rows=new Map(Object.values(base).flat().map(r=>[r.team,r]));
    for(const [name,i] of indices) values[i]=rows.get(name).rpi;
    for(let j=0;j<remaining.length;j++) {
      bits[j]=1;
      const sample=calculate(teams,{games:project(games,remaining,bits)},oos);
      for(const list of Object.values(sample)) for(const row of list) coefficients[j][indices.get(row.team)]=row.rpi-values[indices.get(row.team)];
      bits[j]=0;
      if(j%10===0) progress(j+1,remaining.length);
    }
    progress(remaining.length,remaining.length);
    return {teams,games,oos,remaining,names,indices,values,coefficients,rows};
  }
  function search(m, request, options={}) {
    const mode=request.mode||'target';
    const targetIndex=m.indices.get(request.team);
    if(targetIndex===undefined) throw new Error('This team is not available in the current RPI calculation.');
    const competitors=m.names.map((name,index)=>({name,index,row:m.rows.get(name)})).filter(t=>t.row.classification===request.classification && t.index!==targetIndex);
    const relevant=m.coefficients.map((c,j)=>({c,j})).filter(({c})=>Math.abs(c[targetIndex])>1e-12 || competitors.some(t=>Math.abs(c[t.index])>1e-12)).map(x=>x.j);
    const own=m.remaining.map((g,j)=>({g,j})).filter(({g})=>[teamKey(g.awayTeam),teamKey(g.homeTeam)].includes(teamKey(request.team))).map(x=>x.j);
    const ownWinBit=j=>teamKey(m.remaining[j].awayTeam)===teamKey(request.team)?1:0;
    const fixed=new Map(),condition=request.condition;
    let requiredWins=null,conditionLabel='';
    const dateKey=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:String(value);};
    if(condition){
      if(condition.type==='record'){
        if(condition.wins+condition.losses!==own.length)throw new Error(`${request.team} has ${own.length} remaining games. A ${condition.wins}–${condition.losses} remaining record requires ${condition.wins+condition.losses} games.`);
        requiredWins=condition.wins;conditionLabel=`${request.team} goes ${condition.wins}–${condition.losses} over the ${own.length} remaining games.`;
      }else if(condition.type==='winOut'||condition.type==='loseOut'){
        if(!own.length)throw new Error(`${request.team} has no remaining games to apply this condition to.`);
        const won=condition.type==='winOut';own.forEach(j=>fixed.set(j,won?ownWinBit(j):1-ownWinBit(j)));
        conditionLabel=`${request.team} ${won?'wins':'loses'} all ${own.length} remaining games.`;
      }else if(condition.type==='game'){
        const today=request.asOf || new Date().toISOString().slice(0,10);
        const upcoming=own.filter(j=>dateKey(m.remaining[j].date)>=today).sort((a,b)=>dateKey(m.remaining[a].date).localeCompare(dateKey(m.remaining[b].date)));
        let matches;
        if(condition.selector==='next')matches=upcoming.slice(0,1);
        else if(condition.selector==='opponent')matches=upcoming.filter(j=>[teamKey(m.remaining[j].awayTeam),teamKey(m.remaining[j].homeTeam)].includes(teamKey(condition.opponent)));
        else {
          const start=new Date(today+'T12:00:00Z'),weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          if(condition.selector==='tomorrow')start.setUTCDate(start.getUTCDate()+1);
          else if(weekdays.includes(condition.selector))start.setUTCDate(start.getUTCDate()+(weekdays.indexOf(condition.selector)-start.getUTCDay()+7)%7);
          const wanted=start.toISOString().slice(0,10);matches=upcoming.filter(j=>dateKey(m.remaining[j].date)===wanted);
        }
        if(matches.length!==1)throw new Error(matches.length?`More than one remaining game matches that condition. Use a day or the next game instead.`:`No remaining ${request.team} game matches “${condition.selector==='opponent'?condition.opponent:condition.selector}.” Try “next game” or name a scheduled opponent.`);
        const j=matches[0],g=m.remaining[j],opponent=teamKey(g.awayTeam)===teamKey(request.team)?g.homeTeam:g.awayTeam;
        fixed.set(j,condition.won?ownWinBit(j):1-ownWinBit(j));
        conditionLabel=`${request.team} ${condition.won?'beats':'loses to'} ${opponent} on ${g.date}.`;
      }else throw new Error('This condition is not supported.');
    }
    // Own games must remain selectable even when an existing RPI exclusion removes their coefficient.
    if(condition)own.forEach(j=>{if(!relevant.includes(j))relevant.push(j);});
    const variable=relevant.filter(j=>!fixed.has(j)),ownSet=new Set(own),free=variable.filter(j=>!ownSet.has(j)),ownVariable=own.filter(j=>!fixed.has(j));
    const allowed=bits=>requiredWins===null || own.filter(j=>bits[j]===ownWinBit(j)).length===requiredWins;
    let state=239019;
    const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const eps=1e-10, witnesses=new Map(); let evaluated=0,bestRank=Infinity,worstRank=0,worstSafeRank=0,best=null,worst=null;
    let optimisticBound=1,pessimisticBound=1;
    for(const t of competitors){
      let min=m.values[t.index]-m.values[targetIndex],max=min;
      m.coefficients.forEach((c,j)=>{const d=c[t.index]-c[targetIndex];if(fixed.has(j)){min+=d*fixed.get(j);max+=d*fixed.get(j);}else{min+=Math.min(0,d);max+=Math.max(0,d);}});
      if(min>eps)optimisticBound++;
      if(max>=-eps)pessimisticBound++;
    }
    const assess=(bits,values)=> {
      if(!allowed(bits))return null;
      evaluated++;
      const rank=1+competitors.filter(t=>values[t.index]>values[targetIndex]+eps).length;
      const safeRank=1+competitors.filter(t=>values[t.index]>=values[targetIndex]-eps).length;
      bestRank=Math.min(bestRank,rank);worstRank=Math.max(worstRank,rank);worstSafeRank=Math.max(worstSafeRank,safeRank);
      const other=competitors.map(t=>values[t.index]).sort((a,b)=>b-a);
      const threshold=mode==='lowest'?other[other.length-1]:other[request.target-1], margin=threshold===undefined?1:mode==='lowest'?threshold-values[targetIndex]:values[targetIndex]-threshold;
      const wins=own.filter(j=>bits[j]===ownWinBit(j)).length;
      const candidate={bits:Array.from(bits),rank,safeRank,margin,wins,rpi:values[targetIndex]};
      if(!best || safeRank<best.safeRank || (safeRank===best.safeRank && values[targetIndex]>best.rpi+eps))best=candidate;
      if(!worst || rank>worst.rank || (rank===worst.rank && values[targetIndex]<worst.rpi-eps))worst=candidate;
      if(mode==='target' && safeRank<=request.target && m.rows.get(request.team).postseasonEligible) {
        const signature=own.map(j=>bits[j]).join(''),prev=witnesses.get(signature);
        if(!prev || margin>prev.margin) witnesses.set(signature,{bits:Array.from(bits),rank,safeRank,margin,wins,rpi:values[targetIndex]});
      }
      // Smooth margin helps the search cross seed boundaries without claiming probabilities.
      return {rank,safeRank,margin,wins,fitness:(mode==='lowest'?rank:-safeRank)+Math.max(-.49,Math.min(.49,margin))};
    };
    const valuesFor=bits=>{const v=Float64Array.from(m.values);for(let j=0;j<bits.length;j++)if(bits[j])for(let i=0;i<v.length;i++)v[i]+=m.coefficients[j][i];return v;};
    let exhaustive=false;
    if(variable.length<=16) {
      exhaustive=true;
      const bits=new Uint8Array(m.remaining.length);
      own.filter(j=>!relevant.includes(j)).forEach(j=>{bits[j]=1-ownWinBit(j);});
      fixed.forEach((bit,j)=>{bits[j]=bit;});
      const values=valuesFor(bits);
      let previous=0;
      for(let n=0;n<2**variable.length;n++) {
        const gray=n^(n>>>1);
        if(n){const diff=gray^previous,p=31-Math.clz32(diff),j=variable[p],sign=(gray&diff)?1:-1;bits[j]=sign===1?1:0;for(let i=0;i<values.length;i++)values[i]+=sign*m.coefficients[j][i];}
        assess(bits,values);previous=gray;
      }
    } else {
      const patterns=ownVariable.length<=8?2**ownVariable.length:Math.min(256,options.patterns||256);
      for(let pattern=0;pattern<patterns;pattern++) {
        const bits=new Uint8Array(m.remaining.length);
        own.forEach(j=>{bits[j]=1-ownWinBit(j);});
        ownVariable.forEach((j,p)=>{const won=ownVariable.length<=8?Boolean(pattern&(1<<p)):random()<.5;bits[j]=won?ownWinBit(j):1-ownWinBit(j);});
        fixed.forEach((bit,j)=>{bits[j]=bit;});
        if(requiredWins!==null && ownVariable.length>8){const shuffled=[...ownVariable];for(let i=shuffled.length-1;i>0;i--){const p=Math.floor(random()*(i+1));[shuffled[i],shuffled[p]]=[shuffled[p],shuffled[i]];}shuffled.forEach((j,p)=>{bits[j]=p<requiredWins?ownWinBit(j):1-ownWinBit(j);});}
        if(!allowed(bits))continue;
        for(let trial=0;trial<(options.trials||80);trial++) {
          free.forEach(j=>{bits[j]=random()<.5?1:0;});
          let values=valuesFor(bits),current=assess(bits,values);
          if(mode==='target' && trial>=8 && current.safeRank<=request.target) continue;
          // Coordinate search preserves this team's outcome pattern and improves its seed margin.
          for(let pass=0;pass<3;pass++) {
            let improved=false;
            const start=Math.floor(random()*Math.max(1,free.length));
            for(let p=0;p<free.length;p++) {
              const j=free[(start+p)%free.length],sign=bits[j]?-1:1;bits[j]^=1;
              for(let i=0;i<values.length;i++)values[i]+=sign*m.coefficients[j][i];
              const next=assess(bits,values);
              if(next.fitness>current.fitness+1e-12){current=next;improved=true;}
              else {bits[j]^=1;for(let i=0;i<values.length;i++)values[i]-=sign*m.coefficients[j][i];}
            }
            if(!improved)break;
          }
        }
      }
    }
    if(!best || !worst)throw new Error('No remaining-game outcomes satisfy that condition.');
    const paths=mode==='highest'?[best]:mode==='lowest'?[worst]:[...witnesses.values()].sort((a,b)=>a.wins-b.wins||b.margin-a.margin);
    const proven=mode==='highest'?best.rank===best.safeRank && ((exhaustive && best.rank===bestRank) || best.rank===optimisticBound):mode==='lowest'?worst.rank===worst.safeRank && ((exhaustive && worst.rank===worstSafeRank) || worst.rank===pessimisticBound):exhaustive;
    return {request,conditionLabel,evaluated,exhaustive,proven,optimisticBound,pessimisticBound,relevantGames:relevant.length,bestRank,worstRank,own,paths};
  }
  const api={parseQuestion,model,search,project,final};
  if(typeof module==='object' && module.exports)module.exports=api;else scope.RUSRpiPaths=api;
})(typeof window==='object'?window:globalThis);
