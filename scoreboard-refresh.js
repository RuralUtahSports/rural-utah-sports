(() => {
  const LEGACY_HELPER = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/219ad376aa2874576e67e68c8fb1b4254d899f6c/scoreboard-refresh.js';
  const LIVE_DETAILS = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';
  const REFRESH_MS = 15000;

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

  function keyFor(game) {
    return `${isoDate(game?.date)}|${compact(game?.awayTeam)}|${compact(game?.homeTeam)}`;
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

  function isVerifiedUnlinkedScore(detail, score) {
    if (!detail || !score?.hasDes || detail.final === true) return false;
    const source = `${clean(detail.scoreSource)} ${clean(detail?.boxScore?.source)}`;
    if (!/deseret-day-scoreboard-unlinked/i.test(source)) return false;
    // Avoid turning a pregame 0-0 placeholder into a live game solely from a score shell.
    return Number(score.away) > 0 || Number(score.home) > 0;
  }

  function installAuthoritativeScoreState() {
    if (typeof scoreState !== 'function') return;
    const priorScoreState = scoreState;

    scoreState = function authoritativeScoreState(game) {
      let detail = null;
      try {
        if (typeof detailMap !== 'undefined' && detailMap?.get) detail = detailMap.get(keyFor(game)) || null;
      } catch {}

      if (detail) {
        const status = clean(detail.status) || 'Upcoming';
        const score = detailScore(detail);
        const verifiedUnlinkedScore = isVerifiedUnlinkedScore(detail, score);

        // Fresh per-game live data always beats stale sheet/final fields.
        // For unlinked/OOS games Deseret sometimes publishes the score but leaves the
        // status label as Scheduled. A verified day-scoreboard score is still live data.
        if (isLiveDetail(detail) || verifiedUnlinkedScore) {
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

        // A genuinely Scheduled record must never inherit another game's clock,
        // quarter, score, or stale Final state.
        if (detail.final !== true && /^scheduled$/i.test(status)) {
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
    await syncLatest();
    setInterval(syncLatest, REFRESH_MS);
  })();
})();
