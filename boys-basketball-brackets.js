(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { basketballBrands = {}, brandAliases = {} } = window.RUSBasketballBracketBrands || {};
  const brands = new Map();
  let data, classification = new URLSearchParams(location.search).get('class') || '1A';
  let compact = matchMedia('(max-width:700px)').matches, roundIndex = 0;
  const winner = g => g.teams.length === 1 ? g.teams[0] : g.teams.reduce((a,b) => a.score > b.score ? a : b);
  function teamHTML(t, win) {
    const key = norm(t.team), alias = brandAliases[key] || key;
    const brand = basketballBrands[key] || basketballBrands[alias] || brands.get(alias) || brands.get(key);
    const color = /^#[0-9a-f]{6}$/i.test(brand?.backgroundColor || '') ? brand.backgroundColor : '#555555';
    return `<div class="bb-team ${win ? 'win' : ''}" style="--school-color:${color}"><span class="seed">${t.seed}</span><a href="boys-basketball-team.html?team=${encodeURIComponent(t.team)}">${escape(t.team)}</a><span class="bb-score">${t.score === null ? '—' : t.score}</span></div>`;
  }
  function gameHTML(g) {
    const w = winner(g);
    const date = g.date ? new Date(g.date + 'T12:00:00Z').toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'UTC'}) : '';
    return `<article class="bb-game"><div class="bb-meta">${g.bye ? 'BYE' : 'FINAL · ' + date}</div>${g.teams.map(t => teamHTML(t, !g.bye && t.team === w.team)).join('')}${g.bye ? '<div class="bb-bye">Advances to second round</div>' : ''}</article>`;
  }
  function render() {
    const b = data.classifications[classification];
    const final = b.rounds.at(-1).games[0], champ = winner(final), runner = final.teams.find(t => t.team !== champ.team);
    $('bbChampion').innerHTML = `<small>2025–26 · ${escape(classification)} STATE CHAMPION</small>${escape(champ.team)} <span style="color:#F14D07">${champ.score}–${runner.score}</span> ${escape(runner.team)}`;
    for (const button of $('bbClasses').children) button.setAttribute('aria-pressed', String(button.dataset.class === classification));
    $('bbFull').setAttribute('aria-pressed', String(!compact));
    $('bbCompact').setAttribute('aria-pressed', String(compact));
    $('bbRoundLabel').hidden = !compact;
    $('bbScroller').classList.toggle('by-round', compact);
    $('bbRound').innerHTML = b.rounds.map((r,i) => `<option value="${i}">${escape(r.name)}</option>`).join('');
    roundIndex = Math.min(roundIndex, b.rounds.length - 1);
    $('bbRound').value = String(roundIndex);
    $('bbGrid').innerHTML = b.rounds.map((r,i) => `<section class="bb-round" ${compact && i !== roundIndex ? 'hidden' : ''}><h3>${escape(r.name)}</h3><div class="bb-games">${r.games.map(gameHTML).join('')}</div></section>`).join('');
    $('bbPlacement').hidden = !b.placement.length;
    $('bbPlacement').innerHTML = b.placement.length ? `<h2>Consolation &amp; placement</h2><div class="bb-placement-grid">${[...b.placement].sort((a,b) => ['Consolation','5th & 6th Place','3rd & 4th Place'].indexOf(a.name) - ['Consolation','5th & 6th Place','3rd & 4th Place'].indexOf(b.name)).map(r => `<section><h3>${escape(r.name)}</h3>${r.games.map(gameHTML).join('')}</section>`).join('')}</div>` : '';
    $('bbSource').innerHTML = `Source: <a href="${escape(b.sourceUrl)}" target="_blank" rel="noopener">UHSAA/MaxPreps ${escape(classification)} tournament bracket</a>. Scores follow that bracket when other feeds disagree. Championship path and all played placement games are included; unplayed seventh-place placeholders are excluded.`;
    $('bbScroller').scrollLeft = 0;
    const url = new URL(location.href); url.searchParams.set('class', classification); history.replaceState(null, '', url);
  }
  async function boot() {
    try {
      const [response, teamResponse] = await Promise.all([
        fetch('boys-basketball-brackets-2026.json?v=20260929-brackets1'),
        fetch('teams-data.json').catch(() => null)
      ]);
      if (!response.ok) throw new Error('Bracket data unavailable');
      data = await response.json();
      if (teamResponse?.ok) for (const t of await teamResponse.json()) brands.set(norm(t.team), t);
      if (!data.classifications[classification]) classification = '1A';
      for (const cls of Object.keys(data.classifications)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = cls; button.dataset.class = cls;
        button.addEventListener('click', () => { classification = cls; roundIndex = 0; render(); });
        $('bbClasses').appendChild(button);
      }
      $('bbFull').addEventListener('click', () => { compact = false; render(); });
      $('bbCompact').addEventListener('click', () => { compact = true; render(); });
      $('bbRound').addEventListener('change', e => { roundIndex = Number(e.target.value); render(); });
      render();
    } catch (error) {
      console.error(error);
      $('bbChampion').textContent = 'The brackets could not be loaded. Please refresh to try again.';
      $('bbSource').innerHTML = '<a href="https://www.maxpreps.com/tournament/list/0Xg8sfPQX0myvrnetU2yeA/basketball-25-26/2026-%E2%80%A2-uhsaa-boys-basketball-state-championships.htm">View the official tournament brackets</a>';
      $('bbFull').disabled = $('bbCompact').disabled = true;
    }
  }
  boot();
})();
