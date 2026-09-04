(() => {
  const LEGACY_HELPER = 'scoreboard-week-helper.js?v=20260824-wednesday1';
  const LIVE_DETAILS = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-live-details-2026.json';
  const FULL_DETAILS = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';
  const WEEKLY_FEED = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/weekly-simulation.json';
  const OUT_OF_STATE_FEED = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/out-of-state-live.json';
  const REFRESH_MS = 15000;
  const WEEKLY_REFRESH_MS = 60000;
  const STALE_GAME_KEYS = new Set(['2026-08-21|DOLORESCO|GRAND']);
  const VERIFIED_FINALS = new Map([
    ['2026-08-21|GRAND|DOLORESCO', { away: 12, home: 6 }],
    ['2026-08-21|BEAVERDAMAZ|WATERCANYON', { away: 34, home: 50 }],
    ['2026-08-22|OREM|SKYRIDGE', { away: 14, home: 21 }],
    ['2026-08-31|UMALEHI|SAINTJOSEPH', { away: 28, home: 47 }],
    ['2026-09-03|BOUNTIFUL|MORGAN', { away: 14, home: 37 }]
  ]);

  const clean = value => String(value ?? '').trim();
  const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

  function keyFor(game) {
    return `${isoDate(game?.date)}|${compact(game?.awayTeam)}|${compact(game?.homeTeam)}`;
  }

  function isFutureGame(game) {
    const day = isoDate(game?.date);
    return !!day && day > localToday();
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

  function installAuthoritativeScoreState() {
    if (typeof scoreState !== 'function') return;
    const priorScoreState = scoreState;
    scoreState = function authoritativeScoreState(game) {
      if (isFutureGame(game)) {
        return { done: false, away: null, home: null, status: 'Upcoming', live: false, sheetDone: false, hasDes: false };
      }

      const verified = VERIFIED_FINALS.get(keyFor(game));
      if (verified) {
        return { done: true, away: Number(verified.away), home: Number(verified.home), status: 'Final', live: false, sheetDone: false, hasDes: false };
      }

      // The weekly feed only receives actualAway/actualHome after a result is
      // complete. A stale game-detail badge must never turn that verified
      // final back into a live game.
      if (hasReportedActual(game)) {
        return {
          done: true,
          away: Number(game.actualAway),
          home: Number(game.actualHome),
          status: 'Final',
          live: false,
          sheetDone: true,
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
        const live = isLiveDetail(detail) || (detail.final !== true && score.hasDes && (score.away > 0 || score.home > 0));
        if (live) {
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

        if (detail.final !== true && /^scheduled$/i.test(status)) {
          if (hasReportedActual(game)) {
            const reported = priorScoreState(game);
            if (reported && (reported.done || reported.sheetDone || (reported.away != null && reported.home != null))) return reported;
          }
          return { done: false, away: null, home: null, status: 'Upcoming', live: false, sheetDone: false, hasDes: false };
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

  async function ensureFullWeeklyFeed() {
    for (let i = 0; i < 30; i++) {
      try {
        if (Array.isArray(allGames) && allGames.length) {
          games = allGames.slice();
          return;
        }
      } catch {}
      await sleep(100);
    }

    try {
      const response = await fetch(`${WEEKLY_FEED}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const fresh = (payload?.games || []).filter(g => g?.awayTeam && g?.homeTeam);
      if (!fresh.length) return;
      if (typeof games !== 'undefined' && Array.isArray(games)) {
        games = fresh;
      }
    } catch (error) {
      console.warn('Could not recover full weekly scoreboard feed', error);
    }
  }

  function applyOutOfStateResults(feedGames, rows) {
    if (!Array.isArray(feedGames) || !Array.isArray(rows)) return;
    const finals = rows.filter(row => Number(row.year) === 2026 &&
      Number.isFinite(Number(row.pf)) && Number.isFinite(Number(row.pa)) &&
      clean(row.team) && clean(row.opponent) && clean(row.date));

    for (const game of feedGames) {
      if (yearOf(game.date) !== 2026) continue;
      if (game.actualAway !== null && game.actualAway !== undefined &&
          game.actualHome !== null && game.actualHome !== undefined) continue;

      const date = isoDate(game.date);
      const away = compact(game.awayTeam);
      const home = compact(game.homeTeam);
      const row = finals.find(candidate => {
        if (isoDate(candidate.date) !== date) return false;
        const team = compact(candidate.team);
        const opponent = compact(candidate.opponent);
        const opponentWithState = compact(`${candidate.opponent}, ${candidate.state || ''}`);
        const awayOpponent = opponent === home || opponentWithState === home;
        const homeOpponent = opponent === away || opponentWithState === away;
        return (team === away && awayOpponent) || (team === home && homeOpponent);
      });
      if (!row) continue;

      const rowTeam = compact(row.team);
      const teamScore = Number(row.pf);
      const opponentScore = Number(row.pa);
      if (rowTeam === away) {
        game.actualAway = teamScore;
        game.actualHome = opponentScore;
      } else {
        game.actualAway = opponentScore;
        game.actualHome = teamScore;
      }
      game.actualWinner = game.actualAway === game.actualHome
        ? 'TIE'
        : game.actualAway > game.actualHome ? game.awayTeam : game.homeTeam;
      game.wl = game.actualAway === game.actualHome
        ? 'T'
        : game.actualWinner === game.awayTeam ? 'W' : 'L';
      game.outOfStateSource = 'out-of-state.json';
    }
  }

  let lastWeeklyRefresh = 0;
  async function refreshWeeklyFeed(force = false) {
    const now = Date.now();
    if (!force && now - lastWeeklyRefresh < WEEKLY_REFRESH_MS) return false;

    try {
      const response = await fetch(`${WEEKLY_FEED}?v=${now}`, { cache: 'no-store' });
      if (!response.ok) return false;
      const payload = await response.json();
      const fresh = (payload?.games || []).filter(g =>
        g?.awayTeam && g?.homeTeam && yearOf(g.date) === 2026
      );
      if (!fresh.length) return false;

      let outOfStateRows = [];
      try {
        const outResponse = await fetch(`${OUT_OF_STATE_FEED}?v=${now}`, { cache: 'no-store' });
        if (outResponse.ok) {
          const outPayload = await outResponse.json();
          outOfStateRows = outPayload?.games || [];
        }
      } catch (error) {
        console.warn('Could not refresh out-of-state scoreboard feed', error);
      }

      applyOutOfStateResults(fresh, outOfStateRows);
      allGames = fresh.sort((a, b) =>
        dateVal(a.date) - dateVal(b.date) ||
        String(a.awayTeam).localeCompare(String(b.awayTeam))
      );

      const selected = Number(document.getElementById('scoreboardWeekSelect')?.value);
      games = Number.isInteger(selected)
        ? allGames.filter(g => gameWeekNumber(g) === selected)
        : allGames.slice();
      lastWeeklyRefresh = now;
      return true;
    } catch (error) {
      console.warn('Could not refresh weekly scoreboard feed', error);
      return false;
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
      select.addEventListener('change', () => { if (typeof render === 'function') render(); });

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

  const loadedFullDetails = new Map();

  let fullDetailsPromise = null;
  async function loadFullDetails() {
    if (!fullDetailsPromise) {
      fullDetailsPromise = fetch(`${FULL_DETAILS}?v=${Date.now()}`, { cache: 'no-store' })
        .then(response => response.ok ? response.json() : { games: {} })
        .catch(() => ({ games: {} }));
    }
    return fullDetailsPromise;
  }

  function installFullDetailLoading() {
    document.querySelectorAll('details.game-details').forEach(element => {
      if (element.dataset.fullDetailsBound) return;
      element.dataset.fullDetailsBound = '1';
      element.addEventListener('toggle', async () => {
        if (!element.open) return;
        const key = element.dataset.detailKey || '';
        if (!key || detailMap.has(key)) return;
        const payload = await loadFullDetails();
        const detail = payload?.games?.[key];
        if (!detail) return;
        loadedFullDetails.set(key, detail);
        detailMap.set(key, detail);
        const body = element.querySelector('.detail-body');
        if (body && typeof boxHtml === 'function') {
          const content = (boxHtml(detail) || '') + (scoringHtml(detail) || '') + (statsHtml(detail) || '');
          body.innerHTML = content || '<div class="detail-empty">No additional game details were reported.</div>';
        }
      });
    });
  }

  let regionRenderInstalled = false;
  function installRegionAwareRender() {
    if (regionRenderInstalled || typeof render !== 'function') return;
    const baseRender = render;
    render = function regionAwareRender(...args) {
      removeKnownStaleGames();
      const result = baseRender.apply(this, args);
      applyRegionFilter();
      installFullDetailLoading();
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
      await refreshWeeklyFeed();
      const response = await fetch(`${LIVE_DETAILS}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`live details ${response.status}`);
      const payload = await response.json();
      if (!payload?.games) throw new Error('live details payload missing games');

      if (typeof detailMap !== 'undefined' && detailMap?.clear) {
        detailMap.clear();
        for (const [key, value] of Object.entries(payload.games)) detailMap.set(key, value);
        for (const [key, value] of loadedFullDetails) detailMap.set(key, value);
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
    await ensureFullWeeklyFeed();
    await refreshWeeklyFeed(true);
    await loadLegacyHelper();
    installAuthoritativeScoreState();
    installRegionAwareRender();
    removeKnownStaleGames();
    ensureRegionFilter();
    if (typeof render === 'function') render();
    await syncLatest();
    setInterval(syncLatest, REFRESH_MS);
  })();
})();
