(() => {
  'use strict';
  if ((location.pathname.split('/').pop() || '').toLowerCase() !== 'game.html') return;

  const RAW = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/';
  const WEEKLY_URL = RAW + 'weekly-simulation.json';
  const LIVE_URL = RAW + 'deseret-live-details-2026.json';
  const FULL_URL = RAW + 'deseret-game-details.json';
  const REFRESH_MS = 60000;

  const clean = v => String(v ?? '').trim();
  const norm = v => clean(v).toUpperCase();
  const compact = v => norm(v).replace(/[^A-Z0-9]/g, '');
  const num = v => {
    if (v === null || v === undefined || clean(v) === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

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

  function key(date, away, home) {
    return `${isoDate(date)}|${compact(away)}|${compact(home)}`;
  }

  async function getJson(url, fallback) {
    try {
      const r = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
      return r.ok ? await r.json() : fallback;
    } catch {
      return fallback;
    }
  }

  function matchWeekly(games, date, away, home) {
    const a = compact(away), h = compact(home), day = isoDate(date);
    return (games || []).find(g =>
      isoDate(g.date) === day && compact(g.awayTeam) === a && compact(g.homeTeam) === h
    ) || (games || []).find(g => compact(g.awayTeam) === a && compact(g.homeTeam) === h) || null;
  }

  function detailFor(payload, date, away, home) {
    const games = payload?.games || {};
    return games[key(date, away, home)] || games[key(date, home, away)] || null;
  }

  function scoreFromDetail(detail, requestedAway, requestedHome) {
    const rows = detail?.boxScore?.rows;
    if (!Array.isArray(rows) || rows.length < 2) return null;
    let away = num(rows[0]?.total), home = num(rows[1]?.total);
    if (away === null || home === null) return null;

    const row0 = compact(rows[0]?.team), row1 = compact(rows[1]?.team);
    const reqAway = compact(requestedAway), reqHome = compact(requestedHome);
    if (row0 === reqHome && row1 === reqAway) [away, home] = [home, away];
    return { away, home };
  }

  function updateHero({ status, awayScore, homeScore, away, home, final, live }) {
    const page = document.getElementById('page');
    if (!page || page.classList.contains('loading')) return false;
    const statusEl = page.querySelector('.game-hero .status');
    const scoreEl = page.querySelector('.game-hero .score');
    if (!statusEl || !scoreEl) return false;

    statusEl.textContent = status;
    statusEl.classList.toggle('final', final);
    statusEl.classList.toggle('live', live);
    scoreEl.classList.toggle('upcoming', !final && !live);
    scoreEl.textContent = (final || live) && awayScore !== null && homeScore !== null
      ? `${awayScore}–${homeScore}`
      : 'VS';

    const winner = awayScore === null || homeScore === null || awayScore === homeScore
      ? (awayScore === homeScore && awayScore !== null ? 'Tie' : '')
      : awayScore > homeScore ? away : home;
    const result = page.querySelector('.game-hero .result-label');
    if (result && final) result.textContent = winner === 'Tie' ? 'Tie' : `${winner} wins`;

    for (const cell of page.querySelectorAll('.summary')) {
      const label = clean(cell.querySelector('span')?.textContent);
      const strong = cell.querySelector('strong');
      if (!strong) continue;
      if (/^Status$/i.test(label)) strong.textContent = status;
      if (/^Final Margin$/i.test(label) && final && awayScore !== null && homeScore !== null) {
        strong.textContent = String(Math.abs(awayScore - homeScore));
      }
    }

    if (final && awayScore !== null && homeScore !== null) {
      document.title = `${away} ${awayScore}-${homeScore} ${home} | Rural Utah Sports`;
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    }
    return true;
  }

  let syncing = false;
  async function reconcile() {
    if (syncing) return;
    syncing = true;
    try {
      const q = new URLSearchParams(location.search);
      const requestedAway = q.get('away') || q.get('team1') || '';
      const requestedHome = q.get('home') || q.get('team2') || '';
      const requestedDate = q.get('date') || '';
      if (!requestedAway || !requestedHome) return;

      const [weekly, live, full] = await Promise.all([
        getJson(WEEKLY_URL, { games: [] }),
        getJson(LIVE_URL, { games: {} }),
        getJson(FULL_URL, { games: {} })
      ]);

      const current = matchWeekly(weekly?.games || [], requestedDate, requestedAway, requestedHome);
      const away = current?.awayTeam || requestedAway;
      const home = current?.homeTeam || requestedHome;
      const date = current?.date || requestedDate;
      const liveDetail = detailFor(live, date, away, home);
      const fullDetail = detailFor(full, date, away, home);
      const detail = liveDetail || fullDetail;

      const weeklyAway = num(current?.actualAway), weeklyHome = num(current?.actualHome);
      const weeklyFinal = weeklyAway !== null && weeklyHome !== null;
      const detailScore = scoreFromDetail(detail, away, home);
      const detailFinal = detail?.final === true && detailScore !== null;
      const rawStatus = clean(detail?.status);
      const detailLive = !weeklyFinal && !detailFinal && detail && detail.final !== true &&
        (/^(?:live|q[1-4]|halftime|half|ot)$/i.test(rawStatus) || !!clean(detail?.clock));

      if (weeklyFinal) {
        updateHero({ status: 'Final', awayScore: weeklyAway, homeScore: weeklyHome, away, home, final: true, live: false });
      } else if (detailFinal) {
        updateHero({ status: 'Final', awayScore: detailScore.away, homeScore: detailScore.home, away, home, final: true, live: false });
      } else if (detailLive) {
        updateHero({ status: rawStatus || 'Live', awayScore: detailScore?.away ?? null, homeScore: detailScore?.home ?? null, away, home, final: false, live: true });
      }
    } finally {
      syncing = false;
    }
  }

  function start() {
    reconcile();
    const page = document.getElementById('page');
    if (page?.classList.contains('loading')) {
      const observer = new MutationObserver(() => {
        if (!page.classList.contains('loading')) {
          observer.disconnect();
          reconcile();
        }
      });
      observer.observe(page, { attributes: true, childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 15000);
    }
    setInterval(reconcile, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
