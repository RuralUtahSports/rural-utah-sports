(() => {
  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const norm = (v) => clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const teamSlug = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

  const sourceCode = {h:'historical-workbook',d:'2026-directory',n:'deseret-news'};
  function unpackData(index, parts){
    const teams={};
    for(const row of parts.flatMap(p=>p.rows||[])){
      const [team,active,currentCoach,school,classification,region,rawTenures,notes]=row;
      const seasons={};
      const tenures=(rawTenures||[]).map(([coach,start,end,codes])=>{
        const sources=[...String(codes||'')].map(c=>sourceCode[c]).filter(Boolean);
        for(let y=Number(start);y<=Number(end);y++) seasons[String(y)]={coach,sources};
        return {coach,start:Number(start),end:Number(end),sources};
      });
      teams[team]={team,active2026:!!active,currentCoach,school,classification,region,tenures,notes:notes||[],seasons};
    }
    return {...index,teams};
  }

  const aliases = {
    AMERICANLEADERSHIPACADEMY:'ALA', AMERLEAD:'ALA', GUNNISON:'GUNNISON VALLEY',
    GRANDCOUNTY:'GRAND', JUDGE:'JUDGE MEMORIAL', MONUMENTVALLEY:'MONUMENT VAL',
    SUMMITACAD:'SUMMIT ACADEMY', UTAHSCHDEAF:'USDB', UTAHMILITARYACADEMYHILLFIELD:'UMA-HILLFIELD',
    UTAHMILITARYACADEMYCAMPWILLIAMS:'UMA-LEHI'
  };
  function currentTeamName(){
    const q = new URLSearchParams(location.search).get('team') || '';
    const n = norm(q);
    return aliases[n] || clean(q).toUpperCase();
  }
  function findTeam(data, wanted){
    if (data.teams?.[wanted]) return data.teams[wanted];
    const n = norm(wanted);
    return Object.values(data.teams || {}).find(t => norm(t.team) === n) || null;
  }
  function tenureLabel(t){ return t.start === t.end ? String(t.start) : `${t.start}–${t.end}`; }
  function coachHref(name){ return `coaches.html?coach=${encodeURIComponent(clean(name))}`; }
  function record(w,l,t){ return `${Number(w||0)}-${Number(l||0)}-${Number(t||0)}`; }
  function pct(w,l,t){ const g=Number(w||0)+Number(l||0)+Number(t||0); return g?(((Number(w||0)+Number(t||0)*.5)/g)*100).toFixed(1)+'%':'—'; }
  function inTenure(year,t){ const y=Number(year); return Number.isFinite(y)&&y>=t.start&&y<=t.end; }

  function coachStats(t,pageData){
    let wins=0,losses=0,ties=0,pw=0,pl=0,pt=0;
    const schedules=pageData?.schedules||{};
    const seasonHistory=Array.isArray(pageData?.seasonHistory)?pageData.seasonHistory:[];
    for(let year=t.start;year<=t.end;year++){
      const games=Array.isArray(schedules[String(year)])?schedules[String(year)]:[];
      if(games.length){
        for(const g of games){
          const r=clean(g.result).toUpperCase();
          if(r==='W')wins++; else if(r==='L')losses++; else if(r==='T')ties++;
          if(g.playoff===true){
            if(r==='W')pw++; else if(r==='L')pl++; else if(r==='T')pt++;
          }
        }
      }else{
        const s=seasonHistory.find(x=>Number(x.year)===year);
        if(s){wins+=Number(s.wins||0);losses+=Number(s.losses||0);ties+=Number(s.ties||0)}
      }
    }
    let appearances=0,titles=0;
    for(const c of Array.isArray(pageData?.championshipHistory)?pageData.championshipHistory:[]){
      if(!inTenure(c.year,t)) continue;
      appearances++;
      const role=clean(c.role).toLowerCase();
      if(role==='champion'||role==='co-champion') titles++;
    }
    return {wins,losses,ties,pw,pl,pt,appearances,titles};
  }

  function buildSection(team, data, pageData){
    const tenures = [...(team.tenures || [])].sort((a,b)=>b.end-a.end || b.start-a.start);
    const knownYears = Object.keys(team.seasons || {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    const first = knownYears[0], last = knownYears.at(-1);
    const current = clean(team.currentCoach || team.seasons?.['2026']?.coach);
    const rows = tenures.map(t => {
      const s=coachStats(t,pageData);
      return `<tr><td>${esc(tenureLabel(t))}</td><td class="rus-coach-name"><a class="rus-coach-link" href="${coachHref(t.coach)}">${esc(t.coach)}</a></td><td>${record(s.wins,s.losses,s.ties)}</td><td>${pct(s.wins,s.losses,s.ties)}</td><td>${record(s.pw,s.pl,s.pt)}</td><td>${s.appearances}</td><td class="rus-coach-title-total">${s.titles}</td></tr>`;
    }).join('');
    const notes = (team.notes || []).map(n=>`<p class="rus-coach-note">${esc(n)}</p>`).join('');
    const coverage = first ? `${first}–${last || first}` : 'No historical seasons verified yet';
    const section = document.createElement('section');
    section.className = 'rus-coach-history';
    section.innerHTML = `
      <style>
        .rus-coach-history{margin-top:34px}.rus-coach-current{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:12px;margin-bottom:12px}.rus-coach-card{background:#1c1c1c;border:1px solid #333;border-radius:7px;padding:18px}.rus-coach-kicker{font-size:10px;color:#888;text-transform:uppercase;font-weight:900}.rus-coach-value{font-size:22px;font-weight:900;color:#F14D07;margin-top:5px}.rus-coach-sub{font-size:12px;color:#999;margin-top:5px}.rus-coach-wrap{overflow:auto;background:#000;border:1px solid #333;border-radius:7px}.rus-coach-wrap table{min-width:900px}.rus-coach-wrap th{background:#F14D07;color:#000}.rus-coach-wrap td:nth-child(1){font-weight:900}.rus-coach-name{text-align:left;font-weight:900}.rus-coach-title-total{color:#F14D07;font-weight:900}.rus-coach-note{color:#ffbf86;font-size:12px;line-height:1.45;margin-top:9px}.rus-coach-coverage{color:#888;font-size:12px;line-height:1.5;margin-top:10px}.rus-coach-link{color:#F14D07;font-weight:900;text-decoration:none}.rus-coach-link:hover{text-decoration:underline}@media(max-width:650px){.rus-coach-current{grid-template-columns:1fr}}
      </style>
      <h2 class="section-title">Coaching History</h2>
      <div class="rus-coach-current">
        <div class="rus-coach-card"><div class="rus-coach-kicker">2026 Head Coach</div><div class="rus-coach-value">${current ? `<a class="rus-coach-link" href="${coachHref(current)}">${esc(current)}</a>` : 'Unresolved'}</div><div class="rus-coach-sub">Current active-program directory</div></div>
        <div class="rus-coach-card"><div class="rus-coach-kicker">Known Coach Coverage</div><div class="rus-coach-value">${esc(coverage)}</div><div class="rus-coach-sub">Records use the same historical game data as the team page</div></div>
      </div>
      <div class="rus-coach-wrap"><table><thead><tr><th>Season(s)</th><th>Head Coach</th><th>W-L-T</th><th>Win %</th><th>Playoffs</th><th>Title Games</th><th>Titles</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No verified coaching history is available yet.</td></tr>'}</tbody></table></div>
      ${notes}
      <p class="rus-coach-coverage">Coach records are calculated from RUS game schedules for the seasons assigned to each coach, with season summaries used only when individual schedule data is unavailable. Playoff record uses verified playoff-marked games, and title totals use the Championship Log. Seasons with an unresolved coach are not credited to anyone. <a class="rus-coach-link" href="coaches.html?team=${encodeURIComponent(team.team)}">Open statewide coaching history →</a></p>`;
    return section;
  }

  function pruneCoachSections(page){
    const sections = [...page.querySelectorAll('.rus-coach-history')];
    for(let i=1;i<sections.length;i++) sections[i].remove();
  }

  async function mount(){
    const page = document.getElementById('page');
    if (!page) return;
    pruneCoachSections(page);
    if (page.dataset.rusCoachMounted === '1' || page.dataset.rusCoachMounting === '1') return;
    const title = page.querySelector('.team-title');
    if (!title) return;
    page.dataset.rusCoachMounting='1';
    try{
      const index = await fetch(`coach-history-index.json?v=20260827-coaches10`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()});
      const parts = await Promise.all((index.shards||[]).map(name=>fetch(`${name}?v=20260827-coaches10`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})));
      const data = unpackData(index,parts);
      const wanted = currentTeamName() || clean(title.textContent).toUpperCase();
      const team = findTeam(data,wanted) || findTeam(data,title.textContent);
      if (!team) return;
      let pageData={};
      try{
        const r=await fetch(`team-page-data/${teamSlug(clean(title.textContent))}.json?v=20260827-coaches10`,{cache:'no-store'});
        if(r.ok) pageData=await r.json();
      }catch(e){console.warn('Coach record data:',e)}
      for(const oldSection of [...page.querySelectorAll('.rus-coach-history')]) oldSection.remove();
      const section = buildSection(team,data,pageData);
      const headings = [...page.querySelectorAll('h2.section-title')];
      const greatest = headings.find(h => /greatest seasons/i.test(h.textContent));
      if (greatest) greatest.parentNode.insertBefore(section,greatest);
      else page.appendChild(section);
      page.dataset.rusCoachMounted='1';
    }catch(e){console.warn('Coaching history:',e)}
    finally{
      delete page.dataset.rusCoachMounting;
      pruneCoachSections(page);
    }
  }
  let started=false;
  function startForCoaches(event){
    const requested=event?.detail?.key||new URLSearchParams(location.search).get('tab');
    if(requested!=='coaches'||started)return;
    started=true;
    mount();
  }
  document.addEventListener('rus-team-tab-shown',startForCoaches);
  startForCoaches();
})();
