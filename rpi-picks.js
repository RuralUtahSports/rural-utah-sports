(() => {
  'use strict';
  const host = document.getElementById('rpiPicks'), body = document.getElementById('rpiPicksBody'), open = document.getElementById('rpiPicksOpen');
  if (!host || !body || !open) return;
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const score = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
  const final = g => score(g.actualAway) && score(g.actualHome);
  const day = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : value; };
  const id = g => `${day(g.date)}|${[key(g.awayTeam),key(g.homeTeam)].sort().join('|')}`;
  const classes = ['6A','5A','4A','3A','2A','1A','8P'];
  let loaded = false, loading = false, games, remaining, teams, oos, official, picks = {}, result = null;
  const storageKey = 'rus-rpi-picks-2026-v1';
  const get = async path => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try { const r = await fetch(`${path}?v=${Date.now()}`, {cache:'no-store',signal:controller.signal}); if (!r.ok) throw new Error(path); return await r.json(); }
    finally { clearTimeout(timeout); }
  };
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(picks)); } catch {} };
  const teamButton = (g, side, index) => {
    const team = g[`${side}Team`], meta = teams.find(t => key(t.team) === key(team)) || {};
    return `<button type="button" class="rpi-pick-team" data-game="${index}" data-side="${side}" aria-pressed="${picks[id(g)] === team}" style="--team-bg:${h(meta.backgroundColor || '#222')};--team-fg:${h(meta.textColor || '#fff')}">${h(team)}</button>`;
  };
  function progress() {
    const done = remaining.filter(g => [g.awayTeam,g.homeTeam].includes(picks[id(g)])).length;
    body.querySelector('[data-progress]').textContent = `${done} of ${remaining.length} games picked`;
    body.querySelector('progress').value = done;
    body.querySelector('[data-calculate]').disabled = done !== remaining.length;
    body.querySelectorAll('[data-date-group]').forEach(group => {
      const rows = remaining.filter(g => day(g.date) === group.dataset.dateGroup);
      group.querySelector('[data-date-progress]').textContent = `${rows.filter(g => picks[id(g)]).length}/${rows.length} picked`;
    });
  }
  function render() {
    const dates = [...new Set(remaining.map(g => day(g.date)))];
    body.innerHTML = `<p class="rpi-picks-note">Completed results are locked. Your picks are saved on this device. Pick every game below to calculate all classifications.</p><div class="rpi-picks-progress"><strong data-progress aria-live="polite"></strong><progress max="${remaining.length || 1}" value="0" aria-label="Games picked"></progress></div><div class="rpi-picks-games">${dates.map((date,index) => `<details data-date-group="${h(date)}"${index === 0 ? ' open' : ''}><summary>${h(new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))}<span data-date-progress></span></summary>${remaining.map((g,i) => day(g.date) === date ? `<div class="rpi-pick-game">${teamButton(g,'away',i)}<span>at</span>${teamButton(g,'home',i)}</div>` : '').join('')}</details>`).join('') || '<p>No remaining games. Calculate to view the standings from completed results.</p>'}</div><div class="rpi-picks-actions"><button type="button" data-calculate>Calculate RPI</button><button type="button" data-reset>Reset Picks</button></div><p class="rpi-picks-note">Projection using 45% MWP, 45% OWP and 10% OOWP. Utah opponent records are recalculated from your picks. Out-of-state opponent WP and OWP stay at their latest available values; missing values use .500. Games involving Grand or Layton Christian follow this site's existing RPI exclusions. Official standings and tiebreak decisions may differ.</p><div data-results></div>`;
    progress();
  }
  function results(selected = '6A') {
    const target = body.querySelector('[data-results]');
    const officialRanks = new Map(classes.flatMap(c => (official.classifications[c]?.rows || []).map(r => [key(r.team),r.rank])));
    const alias = v => ({CEDAR:'CEDARCITY',MONUMENTVAL:'MONUMENTVALLEY',STJOSEPH:'SAINTJOSEPH',AMERICANLEADERSHIPACADEMY:'ALA',JUANDIEGOCATHOLIC:'JUANDIEGO',JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL'}[key(v)] || key(v));
    const ranks = new Map([...officialRanks].map(([k,v]) => [alias(k),v]));
    const fmt = n => Number(n).toFixed(6);
    target.innerHTML = `<h3 tabindex="-1">Projected Final RPI</h3><p class="rpi-picks-note">Based on your ${remaining.length} picks and ${games.filter(final).length} completed results. Movement compares projected rank with the current official standings. Equal RPI values remain tied; official tiebreakers are not predicted.</p><div class="rpi-picks-tabs" aria-label="Projected classification">${classes.map(c => `<button type="button" data-result-class="${c}" aria-pressed="${c === selected}">${c === '8P' ? '8-Player' : c}</button>`).join('')}</div><div class="table-wrap"><table><caption>${selected === '8P' ? '8-Player' : selected} projected final standings</caption><thead><tr><th>Rank</th><th>Team</th><th>Record</th><th>RPI</th><th>MWP</th><th>OWP</th><th>OOWP</th><th>Movement</th></tr></thead><tbody>${(result[selected] || []).map((r,i,rows) => {
      let rank = i+1; while(rank > 1 && Math.abs(rows[rank-2].rpi-r.rpi)<1e-12) rank--;
      const current = ranks.get(alias(r.team)), diff = current == null ? null : current-rank, meta = teams.find(t => t.team===r.team) || {};
      return `<tr><td>${rank}</td><td class="left"><span class="rpi-result-team" style="--team-bg:${h(meta.backgroundColor||'#222')};--team-fg:${h(meta.textColor||'#fff')}">${h(r.team)}</span>${r.postseasonEligible ? '' : '<small>Fewer than 6 games</small>'}</td><td>${h(r.record)}</td><td><strong>${fmt(r.rpi)}</strong></td><td>${fmt(r.mwp)}</td><td>${fmt(r.owp)}</td><td>${fmt(r.oowp)}</td><td>${diff == null ? '—' : diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  open.addEventListener('click', async () => {
    if (loading) return;
    if (loaded) { body.hidden = !body.hidden; open.setAttribute('aria-expanded', String(!body.hidden)); return; }
    loading = true; body.hidden = false; open.setAttribute('aria-expanded','true'); body.innerHTML = '<p role="status">Loading remaining games…</p>';
    try {
      let weekly;
      [weekly,teams,oos,official] = await Promise.all([get('weekly-simulation.json'),get('teams-data.json'),get('rpi-oos-2026.json'),get('uhsaa-rpi-official-2026.json')]);
      if (!Array.isArray(weekly.games) || !Array.isArray(teams) || !oos.teams || !official.classifications) throw new Error('Incomplete data');
      const unique = new Map();
      weekly.games.filter(g => g.awayTeam && g.homeTeam && new Date(g.date).getFullYear()===2026).forEach(g => {const prior=unique.get(id(g)); if (!prior || final(g)) unique.set(id(g),g);});
      games = [...unique.values()].sort((a,b) => new Date(a.date)-new Date(b.date) || a.awayTeam.localeCompare(b.awayTeam));
      remaining = games.filter(g => !final(g));
      try { const saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(saved && typeof saved==='object') picks=saved; } catch {}
      picks=Object.fromEntries(remaining.filter(g => [g.awayTeam,g.homeTeam].includes(picks[id(g)])).map(g => [id(g),picks[id(g)]]));
      loaded = true; render();
    } catch { body.innerHTML = '<p role="alert">The schedule could not load. Press Pick Remaining Games to try again.</p>'; }
    finally { loading = false; }
  });
  window.addEventListener('rus-rpi-scenario', event => {
    if (!loaded) return;
    const imported = event.detail || {};
    picks = Object.fromEntries(remaining.filter(g => [g.awayTeam,g.homeTeam].includes(imported[id(g)])).map(g => [id(g),imported[id(g)]]));
    result = null; save(); render(); body.hidden = false; open.setAttribute('aria-expanded','true');
  });
  open.setAttribute('aria-expanded','false'); open.setAttribute('aria-controls','rpiPicksBody');
  body.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.game !== undefined) {
      const g = remaining[Number(button.dataset.game)]; picks[id(g)] = g[`${button.dataset.side}Team`]; save();
      button.closest('.rpi-pick-game').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
      result=null; body.querySelector('[data-results]').innerHTML=''; progress();
    } else if (button.hasAttribute('data-reset')) { picks={}; result=null; save(); render(); }
    else if (button.hasAttribute('data-calculate')) {
      if (remaining.some(g => ![g.awayTeam,g.homeTeam].includes(picks[id(g)]))) return;
      const projected = games.map(g => final(g) ? g : {...g,actualAway:picks[id(g)]===g.awayTeam ? 1 : 0,actualHome:picks[id(g)]===g.homeTeam ? 1 : 0});
      result=window.RUSRpiPicks.calculate(teams,{games:projected},oos); results();
      body.querySelector('[data-results] h3').focus();
    } else if (button.dataset.resultClass && result) results(button.dataset.resultClass);
  });
})();
