(()=>{'use strict';
const root=document.getElementById('featureRoot');if(!root)return;
const classes=['6A','5A','4A','3A','2A','1A','8P'];
const bracketFormats={
  '6A':{cutoff:16,opening:'sixteen'},
  '5A':{cutoff:16,opening:'sixteen'},
  '4A':{cutoff:16,opening:'sixteen'},
  '3A':{cutoff:13,opening:'thirteen'},
  '2A':{cutoff:9,opening:'nine'},
  '1A':{cutoff:9,opening:'nine'},
  '8P':{cutoff:11,opening:'eleven'}
};
const teamAliases={
  'JUAN DIEGO CATHOLIC':'JUAN DIEGO',
  'CEDAR':'CEDAR CITY',
  'AMERICAN LEADERSHIP ACADEMY':'ALA',
  'AMERICAN LEADERSHIP':'ALA',
  'GUNNISON VALLEY':'GUNNISON',
  'UM CAMP WILLIAMS':'UMA-LEHI',
  'UM HILL FIELD':'UMA-HILLFIELD',
  'JUDGE MEMORIAL CATHOLIC':'JUDGE MEMORIAL',
  'ST. JOSEPH':'SAINT JOSEPH',
  'UTAH MILITARY ACADEMY - CAMP WILLIAMS':'UMA-LEHI',
  'UTAH MILITARY ACADEMY - HILL FIELD':'UMA-HILLFIELD',
  'MONUMENT VALLEY':'MONUMENT VAL'
};
const h=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const norm=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
const teamKey=value=>teamAliases[norm(value)]||norm(value);
const value=value=>Number.isFinite(Number(value))?Number(value).toFixed(3):'—';
const movement=(row)=>{const diff=Number(row.rankChange);if(!Number.isFinite(diff)||diff===0)return '';const up=diff>0,label=up?`Up ${diff}`:`Down ${Math.abs(diff)}`;return `<span class="rpi-movement ${up?'up':'down'}" data-change="${diff}" title="${h(label+" vs. Oct. 14 official UHSAA RPI snapshot")}">${up?'▲':'▼'} ${Math.abs(diff)}</span>`};
const get=async(file,fallback)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(`${file}?v=${Date.now()}`,{cache:'no-store',signal:controller.signal});return response.ok?await response.json():fallback}catch{return fallback}finally{clearTimeout(timer)}};
async function run(){
  const [data,teams,officialBrackets]=await Promise.all([get('uhsaa-rpi-official-2026.json',null),get('team-colors-exact.json',[]),get('official-brackets-2026.json',null)]);
  if(!data?.classifications)throw new Error('RPI data unavailable');
  const meta=new Map(teams.map(team=>[norm(team.team),team]));
  const pill=team=>{const item=meta.get(teamKey(team))||{},canonical=item.team||team;return `<a class="team-pill" style="--bg:${h(item.backgroundColor||'#222')};--fg:${h(item.textColor||'#fff')}" href="team.html?team=${encodeURIComponent(canonical)}">${h(team)}</a>`};

  // The displayed bracket and its graphic come from published UHSAA pairings,
  // never from a locally assembled RPI-only projection.
  const bracketSlot=(slot)=>{
    const name=typeof slot==='string'?slot:String(slot?.name||slot?.team||'TBD');
    const seed=slot&&typeof slot==='object'&&Number.isInteger(Number(slot.seed))&&slot.seed!==null&&slot.seed!==undefined?Number(slot.seed):null;
    if(/^bye$/i.test(name))return '<span class="bracket-slot-seed"></span><span class="bracket-bye">BYE</span>';
    if(!name||/^(?:TBD|Winner of|Semifinal|Quarterfinal|Winner\b)/i.test(name))return `<span class="bracket-slot-seed"></span><span class="bracket-placeholder" title="${h(name||'TBD')}">${h(name||'TBD')}</span>`;
    return `<span class="bracket-slot-seed">${seed??''}</span>${pill(name)}`;
  };
  const gameCenter=(type,roundIndex,gameIndex,count)=>roundIndex===0&&type==='nine'?12.5:roundIndex===0&&type==='eleven'?[12.5,62.5,87.5][gameIndex]:(gameIndex+.5)*100/count;
  const bracket=(classification,published)=>{
    if(published?.status!=='official'||!Array.isArray(published.rounds)||published.rounds.length<4){
      return '<div class="rpi-final-bracket-link">The official bracket feed is unavailable. <a href="official-playoffs.html">View published brackets →</a></div>';
    }
    const format=bracketFormats[classification],type=format.opening;
    const rounds=published.rounds.filter(round=>Array.isArray(round.games)&&round.games.length);
    if(rounds.length<4)return '<div class="rpi-final-bracket-link"><a href="official-playoffs.html">View the official bracket →</a></div>';
    return `<section class="projected-bracket rpi-official-bracket" data-official="true" data-bracket-type="${type}">
      <div class="projected-bracket-head"><div><h3>Official UHSAA Playoff Bracket</h3><p>Final 2026 seeds, matchups and byes as published by UHSAA. Winners are not predicted.</p></div>
      <div class="projected-bracket-actions"><span>Top ${format.cutoff}</span><button class="rpi-bracket-share" type="button">Share Official Bracket</button></div></div>
      <div class="bracket-scroll"><div class="bracket-track">
        ${rounds.map((round,roundIndex)=>`<section class="bracket-stage"><h4>${h(round.name||'Playoff Round')}</h4><div class="bracket-games">
          ${round.games.map((game,gameIndex)=>`<div class="bracket-game${roundIndex===rounds.length-1?' bracket-final':''}" style="--game-center:${gameCenter(type,roundIndex,gameIndex,round.games.length)}%">
            <div class="bracket-slot">${bracketSlot(game.a)}</div><div class="bracket-slot">${bracketSlot(game.b)}</div></div>`).join('')}
        </div></section>`).join('')}
        <section class="bracket-stage bracket-champion"><h4>Champion</h4><div class="bracket-games"><div class="champion-box"><span>🏆</span><strong>TBD</strong></div></div></section>
      </div></div>
      <div class="rpi-final-bracket-link"><a href="official-playoffs.html">View dates, game locations and RUS lines on the full official bracket page →</a></div>
    </section>`;
  };
  const targetIndex=(type,roundIndex,gameIndex)=>roundIndex?Math.floor(gameIndex/2):type==='nine'?0:type==='eleven'?[0,2,3][gameIndex]:Math.floor(gameIndex/2);
  const drawConnections=bracket=>{const track=bracket.querySelector('.bracket-track');if(!track||!track.offsetWidth)return;track.querySelector('.bracket-connectors')?.remove();const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),trackRect=track.getBoundingClientRect(),stages=[...track.querySelectorAll('.bracket-stage')],type=bracket.dataset.bracketType;svg.classList.add('bracket-connectors');svg.setAttribute('viewBox',`0 0 ${track.offsetWidth} ${track.offsetHeight}`);stages.slice(0,-1).forEach((stage,roundIndex)=>{const games=[...stage.querySelectorAll('.bracket-game')],nextGames=[...stages[roundIndex+1].querySelectorAll('.bracket-game')],champion=stages[roundIndex+1].querySelector('.champion-box');games.forEach((game,gameIndex)=>{const target=champion||nextGames[targetIndex(type,roundIndex,gameIndex)];if(!target)return;const from=game.getBoundingClientRect(),to=target.getBoundingClientRect(),x1=from.right-trackRect.left,y1=from.top+from.height/2-trackRect.top,x2=to.left-trackRect.left,y2=to.top+to.height/2-trackRect.top,mid=x1+(x2-x1)/2,path=document.createElementNS(ns,'path');path.setAttribute('d',`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`);svg.appendChild(path)})});track.prepend(svg)};
  const drawVisibleBrackets=()=>root.querySelectorAll('.rpi-class:not([hidden]) .projected-bracket').forEach(drawConnections);
  const updated=data.fetchedAt?new Date(data.fetchedAt).toLocaleString():'';
  const movementBaseline=data.movement?.baselineWeekOf?new Date(`${data.movement.baselineWeekOf}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
  const staleClasses=Array.isArray(data.staleClassifications)?data.staleClassifications:[];
  const staleNotice=staleClasses.length?`<div class="feature-note"><strong>Official UHSAA sync delayed.</strong> UHSAA's classification pages did not return valid rows at the last refresh. Showing the last successfully verified snapshot (${h(updated||'date unavailable')}) for ${h(staleClasses.join(', '))}. These are not claimed as current live official rankings; check back as UHSAA resumes publication.</div>`:'';
  const tabs=classes.map((classification,index)=>`<button class="rpi-tab${index===0?' active':''}" type="button" data-rpi-class="${classification}">${classification==='8P'?'8-Player':classification}</button>`).join('');
  const sections=classes.map((classification,index)=>{const rows=data.classifications[classification]?.rows||[],cutoff=bracketFormats[classification].cutoff,label=classification==='8P'?'8-Player':classification;return `<section class="rpi-class" data-rpi-section="${classification}"${index?' hidden':''}><div class="rpi-section-heading"><h2 class="section-title">${label} RPI</h2><button class="rpi-standings-share" type="button">Share RPI Standings</button></div><div class="table-wrap"><table><thead><tr><th>RPI Rank</th><th class="left">Team</th><th>Record</th><th>RPI Value</th><th>MWP</th><th>OWP</th><th>OOWP</th></tr></thead><tbody>${rows.map(row=>`<tr class="${row.rank<=cutoff?'playoff-team':'outside-playoffs'}"><td class="rank"><span class="rank-wrap"><span class="rank-number">${row.rank}</span>${movement(row)}</span></td><td class="left">${pill(row.team)}</td><td><strong>${h(row.record)}</strong></td><td><strong>${value(row.rpi)}</strong></td><td>${value(row.mwp)}</td><td>${value(row.owp)}</td><td>${value(row.oowp)}</td></tr>${row.rank===cutoff&&rows.length>cutoff?`<tr class="playoff-cutoff-row"><td colspan="7"><span>PLAYOFF CUTOFF</span></td></tr>`:''}`).join('')}</tbody></table></div>${bracket(classification,officialBrackets?.classifications?.[label])}</section>`}).join('');
  root.innerHTML=`${staleNotice}<div class="feature-note"><strong>Final 2026 UHSAA football RPI · Oct. 17.</strong> Final ranks and records are UHSAA tournament seeds. RPI, WP, OWP and OOWP figures below are rounded to three decimals as reported by Deseret News, not computed by RUS. <a href="https://uhsaa.org/football-rpi/" target="_blank" rel="noopener">UHSAA final rankings</a> · <a href="https://www.deseret.com/sports/2026/10/17/high-school-football-final-rpi-rankings-6a-5a-4a-3a-2a-1a/" target="_blank" rel="noopener">Published values (3 decimals)</a>${updated?`<br><strong>Page updated:</strong> ${h(updated)}`:''}${data.movement?`<br><strong>Movement:</strong> ▲/▼ compares with the Oct. 14 official snapshot.`:''}</div><div class="rpi-tabs" role="tablist" aria-label="Football classification">${tabs}</div>${sections}`;
  root.querySelectorAll('[data-rpi-class]').forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.rpiClass;root.querySelectorAll('[data-rpi-class]').forEach(item=>item.classList.toggle('active',item===button));root.querySelectorAll('[data-rpi-section]').forEach(section=>{section.hidden=section.dataset.rpiSection!==selected});requestAnimationFrame(drawVisibleBrackets)}));
  requestAnimationFrame(drawVisibleBrackets);
  window.addEventListener('resize',drawVisibleBrackets,{passive:true});
}
run().catch(error=>{console.error(error);root.innerHTML='<div class="empty">The RPI standings could not load. Try refreshing in a moment.</div>'});
})();
