(() => {
  'use strict';
  const {read,recordsFor,ratio} = window.RUSSeasonData;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const compare = (a,b) => a.localeCompare(b,'en',{numeric:true});
  const order = ['6A','5A','4A','3AA','3A','2A','1A','1A 8-Man','8-Player','8-Man','Six-Player','Class AA','Class A','Class B','State'];
  const classRank = c => order.includes(c) ? order.indexOf(c) : order.length;
  const byClass = (a,b) => classRank(a.split(' / ')[0])-classRank(b.split(' / ')[0]) || compare(a,b);
  const years = Array.from({length:108},(_,i)=>String(2026-i));
  const input = new URLSearchParams(location.search).get('year');
  const year = years.includes(input) ? input : years[0];
  $('year').replaceChildren(...years.map(y=>new Option(y,y,false,y===year)));
  $('year').addEventListener('change',event => {
    const url = new URL(location.href);
    url.searchParams.set('year',event.target.value);
    location.assign(url);
  });
  $('recapTitle').textContent = year+' Season Recap';
  document.title = year+' Football Season Recap | Rural Utah Sports';

  async function standings() {
    const [book,teams,archive,records] = await Promise.all([
      read('team-season-alignments.json'),read('teams-data.json'),read('historical-football-programs.json'),recordsFor(year)
    ]);
    const schools = new Map(teams.map(t=>[t.team.toUpperCase().replace(/[^A-Z0-9]/g,''),t]));
    const groups = new Map();
    for (const [id,seasons] of Object.entries(book)) {
      const a = seasons[year];
      if (!a) continue;
      const key = a.standingsUrl || JSON.stringify([a.classification,a.region]);
      if (!groups.has(key)) groups.set(key,{region:a.region || 'Region unverified',classes:new Set(),rows:[],
        league:Boolean(a.standingsUrl && a.region && !['Independent','Freelance'].includes(a.region))});
      const g = groups.get(key);
      if (a.classification) g.classes.add(a.classification);
      const team = schools.get(id),name = team?.team || archive[id]?.name || id;
      const [overall,regional,source] = records[id] || [];
      g.rows.push({name,overall,regional,source,cls:a.classification,color:team?.backgroundColor});
    }
    if (!groups.size) return '<p class="note">RUS has no verified region standings for this season.</p>';
    const byHeading = new Map();
    let partial = false;
    for (const g of groups.values()) {
      const label = [...g.classes].sort(byClass).join(' / ') || 'Classification unverified';
      if (!byHeading.has(label)) byHeading.set(label,[]);
      byHeading.get(label).push(g);
      partial ||= g.rows.some(r=>r.source==='opponents');
    }
    const note = year==='2026' ? 'Region records cover regular-season league games.' : 'Vs. region counts recorded regular-season games against regional opponents. Official tiebreakers may differ.';
    const card = g => {
      g.rows.sort((a,b)=>(g.league ? ratio(b.regional)-ratio(a.regional) : 0) || ratio(b.overall)-ratio(a.overall) || compare(a.name,b.name));
      const rows = g.rows.map(r=>{
        const mark = r.source==='opponents' ? '*' : '';
        const num = v => v ? esc(v)+mark : '—';
        const color = /^#[a-f0-9]{6}$/i.test(r.color) ? r.color : '#777';
        return `<tr><td><span class="swatch" style="--school:${color}"></span><a href="team.html?team=${encodeURIComponent(r.name)}&amp;tab=seasons">${esc(r.name)}</a>${g.classes.size>1?' · '+esc(r.cls || '—'):''}</td>${g.league?'<td>'+num(r.regional)+'</td>':''}<td>${num(r.overall)}</td></tr>`;
      }).join('');
      return `<article class="region"><h4>${esc(g.region)}</h4><table><thead><tr><th>School</th>${g.league?'<th>'+(year==='2026'?'Region':'Vs. region')+'</th>':''}<th>Overall</th></tr></thead><tbody>${rows}</tbody></table></article>`;
    };
    return '<p class="note">'+note+' A dash marks an unknown record.'+(partial?' * From opponents’ schedules. Games may be missing.':'')+'</p>'+
      [...byHeading.keys()].sort(byClass).map(c=>'<h3 class="classification">'+esc(c)+'</h3><div class="grid">'+byHeading.get(c).sort((a,b)=>compare(a.region,b.region)).map(card).join('')+'</div>').join('');
  }

  function matchup(a,sa,b,sb,note='',wonA=false,wonB=false) {
    const side = (team,score,won) => `<div class="side${won?' winner':''}"><span>${esc(team || 'TBD')}</span><span>${esc(score)}</span></div>`;
    return '<div class="game">'+side(a,sa,wonA)+side(b,sb,wonB)+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
  }
  async function playoffs() {
    let classes;
    if (year==='2026') {
      const live = await window.RUSPlayoff2026.load();
      classes = Object.fromEntries(Object.entries(live.classifications).map(([c,v])=>[c,v.rounds.map(r=>[
        r.name,r.games.map(g=>{
          const {a,b}=g;
          const final = a?.score != null && b?.score != null && (a.winner===true || b.winner===true);
          return matchup(a?.name,final?a.score:'',b?.name,final?b.score:'',final?'Final':[g.date,g.time].filter(Boolean).join(' · '),final && a.winner,final && b.winner);
        })
      ])]));
    } else {
      const [raw,titles,extras] = await Promise.all([read('brackets-'+year+'.json'),read('championships.json'),read('season-recap-rounds.json')]);
      const brackets = window.restoreRecapBrackets(year,raw,titles);
      if (titles.some(t=>String(t.year)===year && t.status==='no-playoffs') && Object.keys(brackets).every(k=>brackets[k].every(([r])=>/no playoffs/i.test(r)))) return '<p class="note">No state playoffs were held this season.</p>';
      classes = {};
      for (const [cls,rounds] of Object.entries(brackets)) {
        const supplied = extras[year]?.[cls] || {};
        const extraRounds = ['Inter-Region','First Round','Quarterfinals','Semifinals'].filter(r=>supplied[r]).map(r=>[r,supplied[r]]);
        classes[cls] = [...extraRounds,...rounds].map(([round,games])=>[round,games.map(([a,sa,b,sb])=>{
          const numeric = [sa,sb].every(x=>/^\d+$/.test(String(x)));
          return matchup(a,sa,b,sb,'',numeric && +sa>+sb,numeric && +sb>+sa);
        })]);
      }
    }
    const sections = Object.keys(classes).sort(byClass).map((c,i)=>{
      const rounds = classes[c].slice().reverse().map(([r,games])=>'<section><h4>'+esc(r)+'</h4>'+games.join('')+'</section>').join('');
      return `<details${i===0?' open':''}><summary>${esc(c)} playoffs</summary><div class="rounds">${rounds}</div></details>`;
    });
    return '<p class="note">'+(year==='2026'?'Final scores and upcoming games from the current playoff brackets.':'Archived rounds are shown with the championship first. Earlier rounds are missing for some seasons.')+'</p>'+sections.join('');
  }
  for (const [id,fn] of [['recapStandings',standings],['recapPlayoffs',playoffs]]) {
    fn().then(html=>{$(id).innerHTML=html;}).catch(()=>{$(id).textContent='Unable to load this section. Refresh to try again.';});
  }
})();
