(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { basketballBrands = {}, brandAliases = {} } = window.RUSBasketballBracketBrands || {};
  const brands = new Map();
  const params = new URLSearchParams(location.search);
  let data = null;
  let selectedYear = Number(params.get('year')) || 2026;
  let classification = params.get('class') || '1A';
  let compact = matchMedia('(max-width:700px)').matches, roundIndex = 0;
  const winner = g => g.teams.length === 1 ? g.teams[0] : g.teams.reduce((a,b) => Number(a.score) > Number(b.score) ? a : b);

  function seedHTML(seed) {
    return seed === null || seed === undefined || seed === '' ? '' : `<span class="seed">${escape(seed)}</span>`;
  }
  function teamHTML(t, win) {
    const key = norm(t.team), alias = brandAliases[key] || key;
    const brand = basketballBrands[key] || basketballBrands[alias] || brands.get(alias) || brands.get(key);
    const color = /^#[0-9a-f]{6}$/i.test(brand?.backgroundColor || '') ? brand.backgroundColor : '#555555';
    return `<div class="bb-team ${win ? 'win' : ''}" style="--school-color:${color}">${seedHTML(t.seed)}<a href="boys-basketball-team.html?team=${encodeURIComponent(t.team)}">${escape(t.team)}</a><span class="bb-score">${t.score === null ? '—' : escape(t.score)}</span></div>`;
  }
  function gameHTML(g) {
    const w = winner(g);
    const date = g.date ? new Date(g.date + 'T12:00:00Z').toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'UTC'}) : '';
    return `<article class="bb-game"><div class="bb-meta">${g.bye ? 'BYE' : 'FINAL' + (date ? ' · ' + date : '')}</div>${g.teams.map(t => teamHTML(t, !g.bye && t.team === w.team)).join('')}${g.bye ? '<div class="bb-bye">Advances to next round</div>' : ''}</article>`;
  }
  function rebuildClasses() {
    const host = $('bbClasses');
    host.innerHTML = '';
    const classes = Object.keys(data.classifications || {}).sort((a,b) => Number(a.replace(/\D/g,'')) - Number(b.replace(/\D/g,'')));
    if (!data.classifications[classification]) classification = classes[0] || '1A';
    for (const cls of classes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = cls;
      button.dataset.class = cls;
      button.addEventListener('click', () => { classification = cls; roundIndex = 0; render(); });
      host.appendChild(button);
    }
  }
  function render() {
    const b = data?.classifications?.[classification];
    if (!b) return;
    const finalRound = b.rounds.at(-1);
    const final = finalRound?.games?.[0];
    if (!final) {
      $('bbChampion').textContent = 'No championship game is available for this classification.';
      return;
    }
    const champ = winner(final), runner = final.teams.find(t => t.team !== champ.team);
    $('bbChampion').innerHTML = `<small>${escape(data.season)} · ${escape(classification)} STATE CHAMPION</small>${escape(champ.team)} <span style="color:#F14D07">${escape(champ.score)}–${escape(runner?.score ?? '')}</span> ${escape(runner?.team ?? '')}`;
    $('bbSubtitle').textContent = `${data.season} state tournament · Completed results · ${Object.keys(data.classifications).join('–')}`;
    $('bbSeason').value = String(data.year);
    for (const button of $('bbClasses').children) button.setAttribute('aria-pressed', String(button.dataset.class === classification));
    $('bbFull').setAttribute('aria-pressed', String(!compact));
    $('bbCompact').setAttribute('aria-pressed', String(compact));
    $('bbRoundLabel').hidden = !compact;
    $('bbScroller').classList.toggle('by-round', compact);
    $('bbRound').innerHTML = b.rounds.map((r,i) => `<option value="${i}">${escape(r.name)}</option>`).join('');
    roundIndex = Math.min(roundIndex, b.rounds.length - 1);
    $('bbRound').value = String(roundIndex);
    $('bbGrid').innerHTML = b.rounds.map((r,i) => {
      const games = compact ? r.games : r.games.filter(g => !g.bye);
      return `<section class="bb-round" ${compact && i !== roundIndex ? 'hidden' : ''}><h3>${escape(r.name)}</h3><div class="bb-games">${games.map(gameHTML).join('')}</div></section>`;
    }).join('');
    $('bbPlacement').hidden = !b.placement?.length;
    $('bbPlacement').innerHTML = b.placement?.length ? `<h2>Consolation &amp; placement</h2><div class="bb-placement-grid">${[...b.placement].sort((a,b) => ['Consolation','5th & 6th Place','3rd & 4th Place'].indexOf(a.name) - ['Consolation','5th & 6th Place','3rd & 4th Place'].indexOf(b.name)).map(r => `<section><h3>${escape(r.name)}</h3>${r.games.map(gameHTML).join('')}</section>`).join('')}</div>` : '';
    const historyNote = b.officialBracket
      ? ' Historical path transcribed from the official UHSAA bracket.'
      : b.reconstructed
        ? ' Historical path reconstructed from completed RUS state-tournament results; seed numbers and bye placeholders are omitted where they were not preserved in the archive.'
        : ' Scores follow that bracket when other feeds disagree. Championship path and all played placement games are included; unplayed seventh-place placeholders are excluded.';
    $('bbSource').innerHTML = `Source: <a href="${escape(b.sourceUrl)}" target="_blank" rel="noopener">UHSAA/MaxPreps ${escape(data.year)} tournament bracket</a>.${historyNote}`;
    $('bbScroller').scrollLeft = 0;
    const url = new URL(location.href);
    url.searchParams.set('year', String(data.year));
    url.searchParams.set('class', classification);
    history.replaceState(null, '', url);
  }
  async function loadYear(year) {
    selectedYear = Number(year);
    $('bbChampion').textContent = 'Loading tournament results…';
    $('bbGrid').innerHTML = '';
    $('bbPlacement').innerHTML = '';
    $('bbSource').textContent = '';
    try {
      const response = await fetch(`boys-basketball-brackets-${selectedYear}.json?v=20260930-history1`);
      if (!response.ok) throw new Error('Bracket data unavailable');
      data = await response.json();
      selectedYear = Number(data.year);
      roundIndex = 0;
      rebuildClasses();
      render();
    } catch (error) {
      console.error(error);
      $('bbChampion').textContent = 'The brackets for this season could not be loaded.';
      $('bbSource').textContent = 'Please try another season or refresh the page.';
    }
  }
  async function boot() {
    try {
      const teamResponse = await fetch('teams-data.json').catch(() => null);
      if (teamResponse?.ok) for (const t of await teamResponse.json()) brands.set(norm(t.team), t);
    } catch (error) {
      console.warn('Basketball bracket team colors unavailable', error);
    }
    $('bbSeason').addEventListener('change', e => loadYear(e.target.value));
    $('bbFull').addEventListener('click', () => { compact = false; render(); });
    $('bbCompact').addEventListener('click', () => { compact = true; render(); });
    $('bbRound').addEventListener('change', e => { roundIndex = Number(e.target.value); render(); });
    await loadYear(selectedYear);
  }
  boot();
})();
