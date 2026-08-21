(() => {
  'use strict';

  const q = new URLSearchParams(location.search);
  const requestedAway = q.get('away') || '';
  const requestedHome = q.get('home') || '';
  const requestedDate = q.get('date') || '';

  if (!requestedAway || !requestedHome || !requestedDate || q.has('score1') || q.has('score2')) return;

  const norm = value => String(value ?? '').trim().toUpperCase();
  const compact = value => norm(value).replace(/[^A-Z0-9]/g, '');
  const isoDate = value => {
    const raw = String(value || '').trim();
    let m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return '';
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const key = (away, home) => `${isoDate(requestedDate)}|${compact(away)}|${compact(home)}`;
  const LIVE_URL = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';
  const REFRESH_MS = 60 * 1000;
  let inFlight = false;
  let lastStamp = '';

  function scoreForTeam(rows, team, fallbackIndex) {
    const target = compact(team);
    const hit = (rows || []).find(row => {
      const rowTeam = compact(row?.team || '');
      return rowTeam === target || rowTeam.startsWith(target) || rowTeam.includes(target);
    });
    const raw = hit?.total ?? rows?.[fallbackIndex]?.total;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function setSummaryValue(index, value) {
    const strong = document.querySelectorAll('#page .summary-grid .summary strong')[index];
    if (strong) strong.textContent = value;
  }

  function updateAttachedTeamScores(awayScore, homeScore, mode) {
    const matchup = document.querySelector('#page .matchup');
    if (!matchup) return;
    const teams = [...matchup.querySelectorAll(':scope > .team')];
    if (teams.length !== 2) return;
    const scores = [awayScore, homeScore];
    teams.forEach((team, i) => {
      const box = team.querySelector('.game-team-score');
      if (!box) return;
      const label = box.querySelector('.score-label');
      const value = box.querySelector('.score-value');
      if (label) label.textContent = mode === 'final' ? 'Final score' : mode === 'live' ? 'Live score' : 'Score';
      if (value && scores[i] != null) value.textContent = String(scores[i]);
      box.classList.toggle('winner', mode === 'final' && scores[i] != null && scores[1 - i] != null && scores[i] > scores[1 - i]);
    });
  }

  function applyDetail(detail, updatedAt) {
    const page = document.getElementById('page');
    if (!page || page.classList.contains('loading') || page.classList.contains('error') || !detail) return;

    const rows = detail?.boxScore?.rows || [];
    const awayScore = scoreForTeam(rows, requestedAway, 0);
    const homeScore = scoreForTeam(rows, requestedHome, 1);
    const rawStatus = String(detail?.status || '').trim();
    const final = detail?.final === true;
    const live = !final && (/\blive\b|q[1-4]|half|\bot\b/i.test(rawStatus) || !!detail?.clock || /q[1-4]|half|ot/i.test(String(detail?.period || '')));
    const statusText = final ? 'Final' : live ? [rawStatus || detail?.period || 'Live', detail?.clock].filter(Boolean).join(' • ') : (rawStatus || 'Upcoming');

    const statusEl = page.querySelector('.score-center .status');
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.classList.toggle('final', final);
      statusEl.classList.toggle('live', live);
    }

    const centerScore = page.querySelector('.score-center .score');
    if (centerScore) {
      centerScore.textContent = (final || live) && awayScore != null && homeScore != null ? `${awayScore}–${homeScore}` : 'VS';
      centerScore.classList.toggle('upcoming', !final && !live);
    }

    setSummaryValue(0, statusText);
    if (!final) {
      setSummaryValue(2, '—');
      setSummaryValue(3, '—');
    } else if (awayScore != null && homeScore != null) {
      setSummaryValue(3, String(Math.abs(awayScore - homeScore)));
    }

    const result = page.querySelector('.result-label');
    if (result) {
      if (final && awayScore != null && homeScore != null) {
        const winner = awayScore > homeScore ? requestedAway : homeScore > awayScore ? requestedHome : 'Tie';
        result.textContent = winner === 'Tie' ? 'Tie' : `${winner} wins`;
      } else if (live) {
        result.textContent = 'Game in progress';
      } else {
        result.textContent = 'Game matchup';
      }
    }

    updateAttachedTeamScores(awayScore, homeScore, final ? 'final' : live ? 'live' : 'upcoming');
    if (!final) document.title = `${requestedAway} vs ${requestedHome} | Rural Utah Sports`;

    const updated = document.querySelector('[data-rus-game-updated], .game-updated, .game-update-time');
    if (updated && updatedAt) {
      const d = new Date(updatedAt);
      if (Number.isFinite(d.getTime())) updated.textContent = `Updated: ${d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
    }
  }

  async function fetchPayload() {
    const urls = [LIVE_URL, `deseret-game-details.json?v=${Date.now()}`];
    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (payload?.games) return payload;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Live game data unavailable');
  }

  async function refresh() {
    if (inFlight) return;
    inFlight = true;
    try {
      const payload = await fetchPayload();
      const detail = payload.games[key(requestedAway, requestedHome)] || payload.games[key(requestedHome, requestedAway)] || null;
      if (!detail) return;
      const stamp = String(payload.updatedAt || detail.fetchedAt || '');
      if (stamp === lastStamp && lastStamp) return;
      lastStamp = stamp;
      applyDetail(detail, stamp);
    } catch (error) {
      console.warn('Could not refresh live game status', error);
    } finally {
      inFlight = false;
    }
  }

  function startWhenReady() {
    const page = document.getElementById('page');
    if (!page) return;
    if (!page.classList.contains('loading')) {
      refresh();
      setInterval(refresh, REFRESH_MS);
      return;
    }
    const observer = new MutationObserver(() => {
      if (page.classList.contains('loading')) return;
      observer.disconnect();
      refresh();
      setInterval(refresh, REFRESH_MS);
    });
    observer.observe(page, { attributes: true, attributeFilter: ['class'], childList: true });
  }

  startWhenReady();
})();