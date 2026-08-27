(() => {
  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const norm = (v) => clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const sourceLabel = (key, labels) => labels?.[key] || key || 'Source';

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
  function sourceBadges(keys, labels){
    return (keys || []).map(k => `<span class="rus-coach-source">${esc(sourceLabel(k, labels))}</span>`).join(' ');
  }
  function buildSection(team, data){
    const tenures = [...(team.tenures || [])].sort((a,b)=>b.end-a.end || b.start-a.start);
    const knownYears = Object.keys(team.seasons || {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    const first = knownYears[0], last = knownYears.at(-1);
    const current = clean(team.currentCoach || team.seasons?.['2026']?.coach);
    const rows = tenures.map(t => `<tr><td>${esc(tenureLabel(t))}</td><td class="rus-coach-name">${esc(t.coach)}</td><td>${sourceBadges(t.sources, data.sourceLabels)}</td></tr>`).join('');
    const notes = (team.notes || []).map(n=>`<p class="rus-coach-note">${esc(n)}</p>`).join('');
    const coverage = first ? `${first}–${last || first}` : 'No historical seasons verified yet';
    const section = document.createElement('section');
    section.className = 'rus-coach-history';
    section.innerHTML = `
      <style>
        .rus-coach-history{margin-top:34px}.rus-coach-current{display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:12px;margin-bottom:12px}.rus-coach-card{background:#1c1c1c;border:1px solid #333;border-radius:7px;padding:18px}.rus-coach-kicker{font-size:10px;color:#888;text-transform:uppercase;font-weight:900}.rus-coach-value{font-size:22px;font-weight:900;color:#F14D07;margin-top:5px}.rus-coach-sub{font-size:12px;color:#999;margin-top:5px}.rus-coach-wrap{overflow:auto;background:#000;border:1px solid #333;border-radius:7px}.rus-coach-wrap table{min-width:620px}.rus-coach-wrap th{background:#F14D07;color:#000}.rus-coach-wrap td:nth-child(1){font-weight:900}.rus-coach-name{text-align:left;font-weight:900}.rus-coach-source{display:inline-block;background:#202020;border:1px solid #3b3b3b;border-radius:999px;padding:4px 7px;font-size:10px;color:#bbb;margin:2px}.rus-coach-note{color:#ffbf86;font-size:12px;line-height:1.45;margin-top:9px}.rus-coach-coverage{color:#888;font-size:12px;line-height:1.5;margin-top:10px}.rus-coach-link{color:#F14D07;font-weight:900;text-decoration:none}.rus-coach-link:hover{text-decoration:underline}@media(max-width:650px){.rus-coach-current{grid-template-columns:1fr}}
      </style>
      <h2 class="section-title">Coaching History</h2>
      <div class="rus-coach-current">
        <div class="rus-coach-card"><div class="rus-coach-kicker">2026 Head Coach</div><div class="rus-coach-value">${esc(current || 'Unresolved')}</div><div class="rus-coach-sub">Current active-program directory</div></div>
        <div class="rus-coach-card"><div class="rus-coach-kicker">Known Coach Coverage</div><div class="rus-coach-value">${esc(coverage)}</div><div class="rus-coach-sub">Unknown seasons are intentionally left blank</div></div>
      </div>
      <div class="rus-coach-wrap"><table><thead><tr><th>Season(s)</th><th>Head Coach</th><th>Source</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No verified coaching history is available yet.</td></tr>'}</tbody></table></div>
      ${notes}
      <p class="rus-coach-coverage">The historical workbook is strongest through 2022 and is partial in 2023–24. 2025 gaps are being verified from Deseret News and other reliable sources. <a class="rus-coach-link" href="coaches.html?team=${encodeURIComponent(team.team)}">Open statewide coaching history →</a></p>`;
    return section;
  }
  async function mount(){
    const page = document.getElementById('page');
    if (!page || page.dataset.rusCoachMounted === '1') return;
    const title = page.querySelector('.team-title');
    if (!title) return;
    try{
      const index = await fetch(`coach-history-index.json?v=20260827-coaches3`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()});
      const parts = await Promise.all((index.shards||[]).map(name=>fetch(`${name}?v=20260827-coaches3`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})));
      const data = unpackData(index,parts);
      const wanted = currentTeamName() || clean(title.textContent).toUpperCase();
      const team = findTeam(data,wanted) || findTeam(data,title.textContent);
      if (!team) return;
      const section = buildSection(team,data);
      const headings = [...page.querySelectorAll('h2.section-title')];
      const greatest = headings.find(h => /greatest seasons/i.test(h.textContent));
      if (greatest) greatest.parentNode.insertBefore(section,greatest);
      else page.appendChild(section);
      page.dataset.rusCoachMounted='1';
    }catch(e){console.warn('Coaching history:',e)}
  }
  const obs = new MutationObserver(()=>mount());
  if (document.getElementById('page')) obs.observe(document.getElementById('page'),{childList:true,subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
  setTimeout(mount,600); setTimeout(mount,1800);
})();
