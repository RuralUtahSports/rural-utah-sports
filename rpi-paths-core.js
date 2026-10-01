(function(scope) {
  'use strict';
  const norm = value => String(value || '').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const teamKey = value => norm(value).replace(/ /g,'');
  const final = g => [g.actualAway,g.actualHome].every(v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v)));
  const aliases = {'CEDAR CITY':['cedar'], 'SAINT JOSEPH':['st joseph','st. joseph'], 'ALA':['american leadership academy'], 'UMA-LEHI':['uma camp williams'], 'MONUMENT VALLEY':['monument val']};
  function findTeams(text,teams){
    const candidates=[];
    for(const team of teams)for(const name of [team.team,...(aliases[team.team]||[])]){
      const pattern=new RegExp('(?:^| )'+norm(name)+'s?(?= |$)','g');let match;
      while((match=pattern.exec(text)))candidates.push({team,start:match.index,end:match.index+match[0].length});
    }
    candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start));const kept=[];
    for(const c of candidates)if(!kept.some(k=>c.start<k.end&&c.end>k.start))kept.push(c);
    kept.sort((a,b)=>a.start-b.start);return [...new Map(kept.map(c=>[c.team.team,c.team])).values()];
  }
  function parseCondition(clause,team,teams){
    const record=clause.match(/\b(?:go|goes|finish|finishes|finishing)\s+(\d+)\s+(\d+)\b/);
    if(/\b(?:win|wins|winning)\s+out\b/.test(clause))return {type:'winOut'};
    if(/\b(?:lose|loses|losing)\s+out\b/.test(clause))return {type:'loseOut'};
    if(record)return {type:'record',wins:Number(record[1]),losses:Number(record[2])};
    const game=clause.match(/\b(win|wins|beat|beats|lose|loses|losing)\s+(?:(?:their|its|the|on|to|against|this|they)\s+)*(.*?)\s*$/);
    if(!game)throw new Error('Use winning out, losing out, winning or losing a scheduled game, or a remaining record such as 2–1.');
    const suffix=game[2].replace(/^(?:their|its|the|this) /,''),won=/^(?:win|wins|beat|beats)$/.test(game[1]);
    if(/^(?:next game|next week|next)$/.test(suffix))return {type:'game',selector:'next',won};
    if(/^(?:today|tonight|tomorrow)$/.test(suffix))return {type:'game',selector:suffix,won};
    if(/^(?:next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(suffix))return {type:'game',selector:suffix.replace(/^next /,''),won};
    const opponent=teams.find(t=>[t.team,...(aliases[t.team]||[])].some(name=>norm(name)===suffix));
    if(opponent&&opponent.team!==team.team)return {type:'game',selector:'opponent',opponent:opponent.team,won};
    throw new Error('Name the next game, a day such as Friday, or a scheduled opponent for the win/loss condition.');
  }
  function parseQuestion(question, teams) {
    const q=norm(question),parts=q.split(/\b(?:if|assuming|when|after|provided)\b/),main=parts[0],race=/\b(?:ahead of|above|overtake|pass)\b/.test(main);
    if(/\b(?:unless|without)\b/.test(q))throw new Error('Use direct win/loss conditions instead of unless or without.');
    const mainTeams=findTeams(main,teams),fallback=mainTeams.length?mainTeams:findTeams(parts.slice(1).join(' '),teams).slice(0,1);
    if(!fallback.length)throw new Error('Please include a Utah team name, such as Uintah or North Sanpete.');
    if(!race&&fallback.length>1)throw new Error('Please name one main team before the conditions. For two teams, ask who can finish ahead of the other.');
    const team=fallback[0],classification=teamKey(team.team)==='enterprise'?'1A':team.classification,cap={'6A':16,'5A':16,'4A':16,'3A':13,'2A':9,'1A':9,'8P':11}[classification];
    if(['grand','grandcounty','laytonchristian'].includes(teamKey(team.team)))throw new Error('This team is excluded from the current RPI postseason calculation.');
    const labMode=/\b(?:root for|rooting)\b/.test(main)?'rooting':/\b(?:games that matter|games matter|most important games|games matter most)\b/.test(main)?'impact':/\b(?:win vs loss|win versus loss|win or lose|wins vs loses|win vs lose|winning vs losing|win loss comparison)\b/.test(main)?'comparison':/\b(?:minimum wins|fewest wins|wins needed|wins do|wins does)\b/.test(main)?'minimum':/\b(?:clinched|eliminated|clinching|elimination|secured|locked in)\b/.test(main)?'status':/\b(?:recap|helped|hurt|seed movement)\b/.test(main)?'recap':null;
    if(/\b(?:win vs loss|win versus loss|wins vs loses|win vs lose|winning vs losing)\b/.test(q))return {team:team.team,classification,target:cap,mode:'comparison'};
    const clause=parts.slice(1).join(' ').trim() || (/\b(?:win|wins|winning|lose|loses|losing) out\b/.test(q)||/\b(?:go|goes|finish|finishes) \d+ \d+\b/.test(q)?q:'');
    const conditions=clause?clause.split(/\b(?:and|but|then)\b/).map(s=>parseCondition(s.trim(),team,teams)):[];
    const extra=conditions.length===1?{condition:conditions[0]}:conditions.length?{conditions}:{};
    const m=main.match(/\btop\s*(\d+)\b/)||main.match(/\b(?:seed|rank)\s*(\d+)\b/)||main.match(/\b(\d+)(?:st|nd|rd|th)?\s+seed\b/)||main.match(/\bnumber\s*(\d+)\b/),target=m?Number(m[1]):cap;
    if(!Number.isInteger(target)||target<1||target>64)throw new Error('Please choose a target seed from 1 to 64.');
    if(labMode){if(conditions.length)throw new Error('Use highest, lowest, seed-range or playoff-path questions to apply conditions. The analysis guides explore the unrestricted schedule.');return {team:team.team,classification,target,mode:labMode};}
    if(race){const rival=mainTeams[1];if(!rival)throw new Error('Name the other team after “ahead of.”');if(rival.classification!==classification)throw new Error('A seed race compares teams in the same football classification.');return {team:team.team,classification,target:1,mode:'race',raceTeam:rival.team,...extra};}
    if(/\b(highest|best|ceiling|maximum)\b/.test(main))return {team:team.team,classification,target:1,mode:'highest',...extra};
    if(/\b(lowest|worst|floor|minimum)\b/.test(main))return {team:team.team,classification,target:64,mode:'lowest',...extra};
    if(/\b(range|seeds possible|possible seeds)\b/.test(main)||conditions.length&&(/\bwhere\b/.test(main)||main.trim()==='what'))return {team:team.team,classification,target:1,mode:'range',...extra};
    if(!m&&!/\b(playoff|playoffs|postseason)\b/.test(main))throw new Error('Ask for a seed, a playoff path, a rooting guide, a win/loss comparison, or a seed race.');
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
    const competitors=m.names.map((name,index)=>({name,index,row:m.rows.get(name)})).filter(t=>t.row.classification===request.classification && t.index!==targetIndex && (!options.eligibleSeeds || mode==='race' || t.row.postseasonEligible) && (mode!=='race'||t.name===request.raceTeam));
    const relevant=m.coefficients.map((c,j)=>({c,j})).filter(({c})=>Math.abs(c[targetIndex])>1e-12 || competitors.some(t=>Math.abs(c[t.index])>1e-12)).map(x=>x.j);
    const own=m.remaining.map((g,j)=>({g,j})).filter(({g})=>[teamKey(g.awayTeam),teamKey(g.homeTeam)].includes(teamKey(request.team))).map(x=>x.j);
    const ownWinBit=j=>teamKey(m.remaining[j].awayTeam)===teamKey(request.team)?1:0;
    const fixed=new Map(),condition=request.condition;
    const setFixed=(j,bit)=>{if(fixed.has(j)&&fixed.get(j)!==bit)throw new Error('The conditions assign both a win and a loss to the same game.');fixed.set(j,bit);};
    const labels=[];
    let requiredWins=null,conditionLabel='';
    const dateKey=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:String(value);};
    for(const condition of (request.conditions || (request.condition?[request.condition]:[]))){
      if(condition.type==='record'){
        if(condition.wins+condition.losses!==own.length)throw new Error(`${request.team} has ${own.length} remaining games. A ${condition.wins}–${condition.losses} remaining record requires ${condition.wins+condition.losses} games.`);
        if(requiredWins!==null&&requiredWins!==condition.wins)throw new Error('The remaining-record conditions conflict.');requiredWins=condition.wins;conditionLabel=`${request.team} goes ${condition.wins}–${condition.losses} over the ${own.length} remaining games.`;
      }else if(condition.type==='winOut'||condition.type==='loseOut'){
        if(!own.length)throw new Error(`${request.team} has no remaining games to apply this condition to.`);
        const won=condition.type==='winOut';own.forEach(j=>setFixed(j,won?ownWinBit(j):1-ownWinBit(j)));
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
        setFixed(j,condition.won?ownWinBit(j):1-ownWinBit(j));
        conditionLabel=`${request.team} ${condition.won?'beats':'loses to'} ${opponent} on ${g.date}.`;
      }else throw new Error('This condition is not supported.');
      labels.push(conditionLabel);
    }
    conditionLabel=labels.join(' ');
    const fixedWins=[...fixed].filter(([j,bit])=>bit===ownWinBit(j)).length;
    if(requiredWins!==null&&(fixedWins>requiredWins||fixedWins+own.length-fixed.size<requiredWins))throw new Error('The game conditions conflict with the remaining record.');
    // Own games must remain selectable even when an existing RPI exclusion removes their coefficient.
    if(condition || request.conditions?.length)own.forEach(j=>{if(!relevant.includes(j))relevant.push(j);});
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
      if((mode==='target'||mode==='race') && safeRank<=request.target && m.rows.get(request.team).postseasonEligible) {
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
        if(requiredWins!==null && ownVariable.length>8){const shuffled=[...ownVariable];for(let i=shuffled.length-1;i>0;i--){const p=Math.floor(random()*(i+1));[shuffled[i],shuffled[p]]=[shuffled[p],shuffled[i]];}shuffled.forEach((j,p)=>{bits[j]=p<requiredWins-fixedWins?ownWinBit(j):1-ownWinBit(j);});}
        if(!allowed(bits))continue;
        for(let trial=0;trial<(options.trials||80);trial++) {
          free.forEach(j=>{bits[j]=random()<.5?1:0;});
          let values=valuesFor(bits),current=assess(bits,values);
          if((mode==='target'||mode==='race') && trial>=8 && current.safeRank<=request.target) continue;
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
