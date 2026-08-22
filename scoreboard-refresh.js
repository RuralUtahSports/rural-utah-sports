(() => {
  const LEGACY_HELPER = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/219ad376aa2874576e67e68c8fb1b4254d899f6c/scoreboard-refresh.js';
  const LIVE_DETAILS = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';
  const REFRESH_MS = 15000;
  const STALE_GAME_KEYS = new Set([
    '2026-08-21|DOLORESCO|GRAND'
  ]);

  const clean = value => String(value ?? '').trim();
  const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

  function isoDate(value) {
    const s = clean(value);
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isFutureGame(game) {
    const day = isoDate(game?.date);
    return !!day && day > localToday();
  }

  function keyFor(game) {
    return `${isoDate(game?.date)}|${compact(game?.awayTeam)}|${compact(game?.homeTeam)}`;
  }

  function hasReportedActual(game) {
    return clean(game?.actualAway) !== '' && clean(game?.actualHome) !== '';
  }

  function detailScore(detail) {
    const rows = detail?.boxScore?.rows;
    if (!Array.isArray(rows) || rows.length < 2) return { away: null, home: null, hasDes: false };
    const away = Number(rows[0]?.total);
    const home = Number(rows[1]?.total);
    if (!Number.isFinite(away) || !Number.isFinite(home)) return { away: null, home: null, hasDes: false };
    return { away, home, hasDes: true };
  }

  function isLiveDetail(detail) {
    if (!detail || detail.final === true) return false;
    const status = clean(detail.status);
    return /^(?:live|q[1-4]|halftime|half|ot)$/i.test(status) || !!clean(detail.clock);
  }

  function hasScoreOnlyLiveFallback(detail, score) {
    if (!detail || !score?.hasDes || detail.final === true) return false;
    // A non-zero box score belongs to this exact date/away/home key and is actual
    // Deseret game data. Some OOS cards omit their live status label entirely.
    return Number(score.away) > 0 || Number(score.home) > 0;
  }

  function installAuthoritativeScoreState() {
    if (typeof scoreState !== 'function') return;
    const priorScoreState = scoreState;

    scoreState = function authoritativeScoreState(game) {
      // Never allow a future-dated game to inherit a live quarter/clock/score.
      // This protects rescheduled games such as Orem-Skyridge when an older
      // Deseret record for the same matchup still exists in cached data.
      if (isFutureGame(game)) {
        return {
          done: false,
          away: null,
          home: null,
          status: 'Upcoming',
          live: false,
          sheetDone: false,
          hasDes: false
        };
      }

      let detail = null;
      try {
        if (typeof detailMap !== 'undefined' && detailMap?.get) detail = detailMap.get(keyFor(game)) || null;
      } catch {}

      if (detail) {
        const status = clean(detail.status) || 'Upcoming';
        const score = detailScore(detail);
        const scoreOnlyLive = hasScoreOnlyLiveFallback(detail, score);

        // Fresh per-game live data always beats stale sheet/final fields.
        // Deseret sometimes publishes an OOS box score while leaving status as
        // Scheduled. A real non-zero box score is enough to display the score.
        if (isLiveDetail(detail) || scoreOnlyLive) {
          return {
            done: false,
            away: score.hasDes ? score.away : null,
            home: score.hasDes ? score.home : null,
            status: isLiveDetail(detail) ? status : 'Live',
            live: true,
            sheetDone: false,
            hasDes: score.hasDes
          };
        }

        // A stale Scheduled detail must not erase an actual score already
        // reported for this exact date/away/home game in the weekly feed.
        if (detail.final !== true && /^scheduled$/i.test(status)) {
          if (hasReportedActual(game)) {
            const reported = priorScoreState(game);
            if (reported && (reported.done || reported.sheetDone || (reported.away != null && reported.home != null))) return reported;
          }
          return {
            done: false,
            away: null,
            home: null,
            status: 'Upcoming',
            live: false,
            sheetDone: false,
            hasDes: false
          };
        }
      }

      return priorScoreState(game);
    };
  }

  function removeKnownStaleGames() {
    try {
      if (typeof games === 'undefined' || !Array.isArray(games)) return;
      for (let i = games.length - 1; i >= 0; i--) {
        if (STALE_GAME_KEYS.has(keyFor(games[i]))) games.splice(i, 1);
      }
    } catch (error) {
      console.warn('Could not prune stale scoreboard games', error);
    }
  }

  function teamMeta(name) {
    try {
      if (typeof teamInfo === 'function') return teamInfo(name) || null;
    } catch {}
    try {
      if (typeof teamMap !== 'undefined' && teamMap?.get) return teamMap.get(clean(name).toUpperCase()) || null;
    } catch {}
    return null;
  }

  function regionLabel(name) {
    const team = teamMeta(name);
    const classification = clean(team?.classification).toUpperCase();
    const region = clean(team?.region);
    if (!region) return '';
    if (/^\d+$/.test(region)) return classification ? `${classification} • Region ${region}` : `Region ${region}`;
    if (classification && region.toUpperCase().startsWith(classification)) return region;
    return classification ? `${classification} • ${region}` : region;
  }

  function collectRegionLabels() {
    const labels = new Set();
    try {
      if (typeof teamMap !== 'undefined' && teamMap?.values) {
        for (const team of teamMap.values()) {
          const classification = clean(team?.classification).toUpperCase();
          const region = clean(team?.region);
          if (!region) continue;
          if (/^\d+$/.test(region)) labels.add(classification ? `${classification} • Region ${region}` : `Region ${region}`);
          else if (classification && region.toUpperCase().startsWith(classification)) labels.add(region);
          else labels.add(classification ? `${classification} • ${region}` : region);
        }
      }
    } catch {}
    return [...labels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function ensureRegionFilter() {
    const filters = document.querySelector('.filters');
    if (!filters) return null;

    let select = document.getElementById('regionFilter');
    if (!select) {
      select = document.createElement('select');
      select.id = 'regionFilter';
      select.setAttribute('aria-label', 'Filter scoreboard by region');
      select.innerHTML = '<option value="ALL">All Regions</option>';
      const classFilter = document.getElementById('classFilter');
      if (classFilter?.nextSibling) filters.insertBefore(select, classFilter.nextSibling);
      else if (classFilter) classFilter.insertAdjacentElement('afterend', select);
      else filters.prepend(select);
      select.addEventListener('change', () => {
        if (typeof render === 'function') render();
      });

      if (!document.getElementById('scoreboard-region-filter-style')) {
        const style = document.createElement('style');
        style.id = 'scoreboard-region-filter-style';
        style.textContent = '@media(max-width:700px){.filters #regionFilter{width:100%;font-size:14px}}';
        document.head.appendChild(style);
      }
    }

    const current = select.value || 'ALL';
    const labels = collectRegionLabels();
    const wanted = ['ALL', ...labels];
    const existing = [...select.options].map(option => option.value);
    if (existing.join('\u0000') !== wanted.join('\u0000')) {
      select.innerHTML = '<option value="ALL">All Regions</option>' + labels.map(label => `<option value="${label.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`).join('');
      select.value = wanted.includes(current) ? current : 'ALL';
    }
    return select;
  }

  function applyRegionFilter() {
    const select = ensureRegionFilter();
    if (!select) return;
    const selected = select.value || 'ALL';
    let visibleTotal = 0;

    document.querySelectorAll('#board .date-section').forEach(section => {
      let visibleInSection = 0;
      section.querySelectorAll('.games > .game').forEach(card => {
        const names = [...card.querySelectorAll('.team-name')].map(node => clean(node.textContent));
        const show = selected === 'ALL' || names.some(name => regionLabel(name) === selected);
        card.style.display = show ? '' : 'none';
        if (show) visibleInSection++;
      });
      section.style.display = visibleInSection ? '' : 'none';
      const count = section.querySelector('.date-head span');
      if (count && selected !== 'ALL') count.textContent = `${visibleInSection} game${visibleInSection === 1 ? '' : 's'}`;
      visibleTotal += visibleInSection;
    });

    let empty = document.querySelector('#board .region-filter-empty');
    if (selected !== 'ALL' && visibleTotal === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty region-filter-empty';
        document.getElementById('board')?.appendChild(empty);
      }
      empty.textContent = `No games match ${selected}.`;
      empty.style.display = '';
    } else if (empty) {
      empty.style.display = 'none';
    }
  }

  let regionRenderInstalled = false;
  function installRegionAwareRender() {
    if (regionRenderInstalled || typeof render !== 'function') return;
    const baseRender = render;
    render = function regionAwareRender(...args) {
      removeKnownStaleGames();
      const result = baseRender.apply(this, args);
      applyRegionFilter();
      return result;
    };
    regionRenderInstalled = true;
  }

  async function loadLegacyHelper() {
    try {
      const response = await fetch(`${LEGACY_HELPER}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`helper ${response.status}`);
      const code = await response.text();
      const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn('Scoreboard helper bootstrap failed; continuing with authoritative live sync.', error);
    }
  }

  let syncing = false;
  async function syncLatest() {
    if (syncing) return;
    syncing = true;
    try {
      const response = await fetch(`${LIVE_DETAILS}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`live details ${response.status}`);
      const payload = await response.json();
      if (!payload?.games) throw new Error('live details payload missing games');

      if (typeof detailMap !== 'undefined' && detailMap?.clear) {
        detailMap.clear();
        for (const [key, value] of Object.entries(payload.games)) detailMap.set(key, value);
      }

      if (typeof render === 'function') render();

      const note = document.querySelector('.scoreboard-refresh-note');
      if (note) {
        const when = new Date(payload.updatedAt || Date.now());
        note.textContent = Number.isFinite(when.getTime())
          ? `Live data ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • checks every 15 seconds`
          : 'Live scores check every 15 seconds';
      }
    } catch (error) {
      console.warn('Authoritative live scoreboard sync failed', error);
    } finally {
      syncing = false;
    }
  }

  (async () => {
    await loadLegacyHelper();
    installAuthoritativeScoreState();
    installRegionAwareRender();
    removeKnownStaleGames();
    ensureRegionFilter();
    await syncLatest();
    setInterval(syncLatest, REFRESH_MS);
  })();
})();
