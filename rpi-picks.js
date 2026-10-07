(() => {
  'use strict';
  const host = document.getElementById('rpiPicks'), body = document.getElementById('rpiPicksBody'), open = document.getElementById('rpiPicksOpen');
  if (!host || !body || !open) return;
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const score = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
  const final = g => score(g.actualAway) && score(g.actualHome);
  const day = value => { if(/^\d{4}-\d{2}-\d{2}/.test(String(value)))return String(value).slice(0,10);const d = new Date(value); return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : value; };
  const id = g => `${day(g.date)}|${[key(g.awayTeam),key(g.homeTeam)].sort().join('|')}`;
  const pair = g => [key(g.awayTeam),key(g.homeTeam)].sort().join('|');
  const near = (a,b) => Math.abs(Date.parse(day(a))-Date.parse(day(b))) <= 3*86400000;
  const verifiedScore = (game, correction) => {
    const sameOrder = key(game.awayTeam)===key(correction.awayTeam) && key(game.homeTeam)===key(correction.homeTeam);
    const reverseOrder = key(game.awayTeam)===key(correction.homeTeam) && key(game.homeTeam)===key(correction.awayTeam);
    if (!sameOrder && !reverseOrder) return null;
    return {
      actualAway: Number(sameOrder ? correction.actualAway : correction.actualHome),
      actualHome: Number(sameOrder ? correction.actualHome : correction.actualAway)
    };
  };
  const classes = ['6A','5A','4A','3A','2A','1A','8P'];
  let loaded = false, loading = false, games, remaining, teams, oos, official, picks = {}, result = null;
  const storageKey = 'rus-rpi-picks-2026-v1';
  const sharedToken=new URLSearchParams(location.hash.slice(1)).get('rpiScenario');
  let scenarioNote='';
  function loadScenario(imported,note='Scenario loaded.') {
    picks=Object.fromEntries(remaining.filter(g=>[g.awayTeam,g.homeTeam].includes(imported[id(g)])).map(g=>[id(g),imported[id(g)]]));
    result=null;scenarioNote=note;save();render();body.hidden=false;open.setAttribute('aria-expanded','true');
  }
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
    body.innerHTML = `${scenarioNote?`<p role="status">${h(scenarioNote)}</p>`:''}<p class="rpi-picks-note">Completed results are locked. Your picks are saved on this device. Pick every game below to calculate all classifications.</p><div class="rpi-picks-progress"><strong data-progress aria-live="polite"></strong><progress max="${remaining.length || 1}" value="0" aria-label="Games picked"></progress></div><div class="rpi-picks-games">${dates.map((date,index) => `<details data-date-group="${h(date)}"${index === 0 ? ' open' : ''}><summary>${h(new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))}<span data-date-progress></span></summary>${remaining.map((g,i) => day(g.date) === date ? `<div class="rpi-pick-game">${teamButton(g,'away',i)}<span>at</span>${teamButton(g,'home',i)}</div>` : '').join('')}</details>`).join('') || '<p>No remaining games. Calculate to view the standings from completed results.</p>'}</div><div class="rpi-picks-actions"><button type="button" data-calculate>Calculate RPI</button><button type="button" data-reset>Reset Picks</button></div><p class="rpi-picks-note">Projection using 45% MWP, 45% OWP and 10% OOWP. Utah opponent records are recalculated from your picks. Out-of-state opponent WP and OWP stay at their latest available values; missing values use .500. Games involving Grand or Layton Christian follow this site's existing RPI exclusions. Official standings and tiebreak decisions may differ.</p><div data-results></div>`;
    progress();
    window.RUSRpiScenarios.mount(body,{remaining,picks,games,teams,oos,onLoad:loadScenario});
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
    }).join('')}</tbody></table></div>${window.RUSRpiScenarios.bracket(selected,result[selected]||[],teams)}`;
  }
  open.addEventListener('click', async () => {
    if (loading) return;
    if (loaded) { body.hidden = !body.hidden; open.setAttribute('aria-expanded', String(!body.hidden)); return; }
    loading = true; body.hidden = false; open.setAttribute('aria-expanded','true'); body.innerHTML = '<p role="status">Loading remaining games…</p>';
    try {
      let weekly, verified;
      [weekly,verified,teams,oos,official] = await Promise.all([get('weekly-simulation.json'),get('verified-finals-2026.json'),get('teams-data.json'),get('rpi-oos-2026.json'),get('uhsaa-rpi-official-2026.json')]);
      if (!Array.isArray(weekly.games) || !Array.isArray(verified) || !Array.isArray(teams) || !oos.teams || !official.classifications) throw new Error('Incomplete data');
      const sourceGames = weekly.games.filter(g => g.awayTeam && g.homeTeam && new Date(g.date).getFullYear()===2026).map(g=>({...g}));
      for (const correction of verified) {
        if (!correction?.awayTeam || !correction?.homeTeam || !score(correction.actualAway) || !score(correction.actualHome)) continue;
        const matches = sourceGames.filter(g => pair(g)===pair(correction) && near(g.date, correction.date));
        const target = matches.length===1 ? matches[0] : matches.find(g => day(g.date)===day(correction.date));
        if (target) {
          const fixed = verifiedScore(target, correction);
          if (fixed) {
            target.actualAway=fixed.actualAway;
            target.actualHome=fixed.actualHome;
            target.date=day(correction.date);
            target.source='verified';
          }
        } else {
          sourceGames.push({
            date:day(correction.date),
            awayTeam:correction.awayTeam,
            homeTeam:correction.homeTeam,
            actualAway:Number(correction.actualAway),
            actualHome:Number(correction.actualHome),
            source:'verified'
          });
        }
      }
      const unique = new Map();
      sourceGames.forEach(g => {const prior=unique.get(id(g)); if (!prior || final(g)) unique.set(id(g),g);});
      games = [...unique.values()].sort((a,b) => new Date(a.date)-new Date(b.date) || a.awayTeam.localeCompare(b.awayTeam));
      remaining = games.filter(g => !final(g));
      try { const saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(saved && typeof saved==='object') picks=saved; } catch {}
      picks=Object.fromEntries(remaining.filter(g => [g.awayTeam,g.homeTeam].includes(picks[id(g)])).map(g => [id(g),picks[id(g)]]));
      if(sharedToken){try{const shared=window.RUSRpiScenarios.decode(sharedToken,remaining);picks=shared.picks;save();scenarioNote=`Shared scenario loaded. ${shared.skipped} picks refer to games already final or no longer on this schedule; completed scores stay fixed.`;}catch(error){scenarioNote=error.message;}}
      loaded = true; render();
    } catch { body.innerHTML = '<p role="alert">The schedule could not load. Press Pick Remaining Games to try again.</p>'; }
    finally { loading = false; }
  });
  window.addEventListener('rus-rpi-scenario', event => {
    if (!loaded) return;
    loadScenario(event.detail || {});
  });
  open.setAttribute('aria-expanded','false'); open.setAttribute('aria-controls','rpiPicksBody');
  if(sharedToken)open.click();
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
