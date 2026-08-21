(() => {
  const style = document.createElement('style');
  style.textContent = `
    .scoreboard-refresh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-7px 0 12px}
    .scoreboard-refresh-btn,.scoreboard-week-btn{appearance:none;border:1px solid #F14D07;background:#F14D07;color:#000;border-radius:7px;padding:10px 14px;font:900 12px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.4px;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.28)}
    .scoreboard-refresh-btn:hover,.scoreboard-week-btn:hover{filter:brightness(1.08)}
    .scoreboard-refresh-btn:disabled,.scoreboard-week-btn:disabled{opacity:.42;cursor:not-allowed;filter:none}
    .scoreboard-refresh-note{font-size:10px;color:#777;font-weight:700}
    .scoreboard-week-nav{display:grid;grid-template-columns:auto minmax(250px,1fr) auto;gap:9px;align-items:center;background:#000;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:10px 12px;margin:0 0 18px;box-shadow:0 7px 18px rgba(0,0,0,.22)}
    .scoreboard-week-select{width:100%;min-width:0;background:#171717;color:#fff;border:1px solid #444;border-radius:6px;padding:10px 12px;font:900 13px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.2px}
    .scoreboard-week-btn{padding:10px 12px;white-space:nowrap}
    .game-page-link{color:#000!important;text-decoration:none!important;font-weight:1000!important;background:#F14D07!important;border:1px solid #F14D07!important;border-radius:5px;padding:6px 9px;white-space:nowrap;text-transform:uppercase;letter-spacing:.15px}
    .game-page-link:hover{filter:brightness(1.1)}
    @media(max-width:700px){.scoreboard-refresh-row{margin-top:-5px}.scoreboard-refresh-btn{width:100%;padding:12px 14px;font-size:13px;text-align:center}.scoreboard-refresh-note{width:100%;text-align:center}.scoreboard-week-nav{grid-template-columns:1fr 1fr;padding:9px}.scoreboard-week-select{grid-column:1/-1;grid-row:1}.scoreboard-week-btn{width:100%;font-size:11px}.game-page-link{width:100%;text-align:center;padding:8px 10px}}
  `;
  document.head.appendChild(style);

  const subtitle = document.querySelector('.subtitle');
  let refreshRow = null;
  let refreshNote = null;
  let refreshButton = null;
  if (subtitle && !document.getElementById('scoreboardRefreshButton')) {
    refreshRow = document.createElement('div');
    refreshRow.className = 'scoreboard-refresh-row';
    refreshButton = document.createElement('button');
    refreshButton.id = 'scoreboardRefreshButton';
    refreshButton.className = 'scoreboard-refresh-btn';
    refreshButton.type = 'button';
    refreshButton.textContent = '↻ Refresh Scores';
    refreshNote = document.createElement('span');
    refreshNote.className = 'scoreboard-refresh-note';
    refreshNote.textContent = 'Live scores auto-update every minute';
    refreshRow.append(refreshButton, refreshNote);
    subtitle.insertAdjacentElement('afterend', refreshRow);
  } else {
    refreshRow = document.querySelector('.scoreboard-refresh-row');
    refreshButton = document.getElementById('scoreboardRefreshButton');
    refreshNote = refreshRow?.querySelector('.scoreboard-refresh-note') || null;
  }

  const norm = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const LIVE_REFRESH_MS = 60 * 1000;
  const LIVE_DETAILS_URL = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/deseret-game-details.json';

  const originalRender = render;
  let seasonGames = null;
  let weekBuckets = [];
  let selectedWeekNumber = null;
  let weekNav = null;
  let weekSelect = null;
  let prevWeekBtn = null;
  let nextWeekBtn = null;
  let livePredictions = new Map();
  let liveRefreshInFlight = false;
  let lastLiveUpdatedAt = '';

  function formatLiveUpdatedAt(value) {
    const when = new Date(value);
    if (!Number.isFinite(when.getTime())) return '';
    return when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  async function fetchLatestLiveDetails() {
    const stamp = Date.now();
    const sources = [
      `${LIVE_DETAILS_URL}?v=${stamp}`,
      `deseret-game-details.json?v=${stamp}`
    ];
    const payloads = (await Promise.all(sources.map(async url => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload && payload.games ? payload : null;
      } catch {
        return null;
      }
    }))).filter(Boolean);
    if (!payloads.length) throw new Error('Live scoreboard data unavailable');
    payloads.sort((a, b) => {
      const bt = Date.parse(String(b.updatedAt || '')) || 0;
      const at = Date.parse(String(a.updatedAt || '')) || 0;
      return bt - at;
    });
    return payloads[0];
  }

  async function refreshLiveDetails({ announce = false } = {}) {
    if (liveRefreshInFlight) return false;
    liveRefreshInFlight = true;
    if (announce && refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = '↻ Refreshing…';
    }

    try {
      const payload = await fetchLatestLiveDetails();
      const updatedAt = String(payload.updatedAt || '');
      const changed = !lastLiveUpdatedAt || updatedAt !== lastLiveUpdatedAt || !detailMap.size;
      lastLiveUpdatedAt = updatedAt || lastLiveUpdatedAt;

      if (changed) {
        detailMap.clear();
        for (const [key, value] of Object.entries(payload.games || {})) detailMap.set(key, value);
        render();
      }

      const clock = formatLiveUpdatedAt(updatedAt);
      if (refreshNote) refreshNote.textContent = clock
        ? `Live data ${clock} • auto-checks every minute`
        : 'Live scores auto-update every minute';
      return changed;
    } catch (error) {
      console.warn('Live scoreboard refresh failed', error);
      if (refreshNote) refreshNote.textContent = 'Auto-refresh retrying • tap Refresh Scores anytime';
      return false;
    } finally {
      liveRefreshInFlight = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = '↻ Refresh Scores';
      }
    }
  }

  if (refreshButton) refreshButton.addEventListener('click', () => refreshLiveDetails({ announce: true }));

  function startOfLocalDay(value) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function thursdayStart(value) {
    const d = startOfLocalDay(value);
    const daysSinceThursday = (d.getDay() + 3) % 7;
    d.setDate(d.getDate() - daysSinceThursday);
    return d.getTime();
  }

  // Utah football Week 1 begins with the second Thursday in August.
  function seasonWeekOneStart(year) {
    const d = new Date(Number(year), 7, 8);
    d.setHours(0, 0, 0, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  function shortDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function buildWeekBuckets() {
    const dated = (seasonGames || []).filter(g => dateVal(g.date));
    if (!dated.length) {
      weekBuckets = [];
      return;
    }

    const firstGameTime = Math.min(...dated.map(g => dateVal(g.date)));
    const seasonYear = new Date(firstGameTime).getFullYear();
    const firstThursday = seasonWeekOneStart(seasonYear);
    const grouped = new Map();

    for (const game of dated) {
      const start = thursdayStart(dateVal(game.date));
      if (!grouped.has(start)) grouped.set(start, []);
      grouped.get(start).push(game);
    }

    weekBuckets = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([start, bucketGames]) => ({
        number: Math.floor((start - firstThursday) / WEEK) + 1,
        start,
        end: start + WEEK,
        games: bucketGames.sort((a, b) => dateVal(a.date) - dateVal(b.date) || String(a.awayTeam).localeCompare(String(b.awayTeam)))
      }));
  }

  function chooseInitialWeek() {
    if (!weekBuckets.length) return null;

    const requested = Number(new URLSearchParams(window.location.search).get('week'));
    if (Number.isInteger(requested) && weekBuckets.some(w => w.number === requested)) return requested;

    const today = startOfLocalDay(Date.now()).getTime();
    const current = weekBuckets.find(w => {
      const monday = w.start - (3 * DAY);
      const nextMonday = monday + WEEK;
      return today >= monday && today < nextMonday;
    });
    if (current) return current.number;

    const next = weekBuckets.find(w => (w.start - (3 * DAY)) > today);
    return (next || weekBuckets[weekBuckets.length - 1]).number;
  }

  function ensureWeekNav() {
    if (weekNav || !subtitle) return;

    weekNav = document.createElement('div');
    weekNav.className = 'scoreboard-week-nav';
    weekNav.setAttribute('aria-label', 'Scoreboard week selector');

    prevWeekBtn = document.createElement('button');
    prevWeekBtn.className = 'scoreboard-week-btn';
    prevWeekBtn.type = 'button';
    prevWeekBtn.textContent = '← Previous';

    weekSelect = document.createElement('select');
    weekSelect.id = 'scoreboardWeekSelect';
    weekSelect.className = 'scoreboard-week-select';
    weekSelect.setAttribute('aria-label', 'Choose football week');

    nextWeekBtn = document.createElement('button');
    nextWeekBtn.className = 'scoreboard-week-btn';
    nextWeekBtn.type = 'button';
    nextWeekBtn.textContent = 'Next →';

    weekNav.append(prevWeekBtn, weekSelect, nextWeekBtn);
    (refreshRow || subtitle).insertAdjacentElement('afterend', weekNav);

    weekSelect.addEventListener('change', () => selectWeek(Number(weekSelect.value)));
    prevWeekBtn.addEventListener('click', () => moveWeek(-1));
    nextWeekBtn.addEventListener('click', () => moveWeek(1));
  }

  function syncWeekNav() {
    ensureWeekNav();
    if (!weekNav || !weekSelect) return;

    const options = weekBuckets.map(w => {
      const endDay = w.end - DAY;
      return `<option value="${w.number}">Week ${w.number} • ${shortDate(w.start)}–${shortDate(endDay)} • ${w.games.length} game${w.games.length === 1 ? '' : 's'}</option>`;
    }).join('');

    if (weekSelect.innerHTML !== options) weekSelect.innerHTML = options;
    if (selectedWeekNumber != null) weekSelect.value = String(selectedWeekNumber);

    const index = weekBuckets.findIndex(w => w.number === selectedWeekNumber);
    prevWeekBtn.disabled = index <= 0;
    nextWeekBtn.disabled = index < 0 || index >= weekBuckets.length - 1;
  }

  function selectWeek(number) {
    if (!weekBuckets.some(w => w.number === number)) return;
    selectedWeekNumber = number;
    const url = new URL(window.location.href);
    url.searchParams.set('week', String(number));
    url.searchParams.delete('_refresh');
    window.history.replaceState({}, '', url);
    render();
    document.querySelector('.page-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function moveWeek(delta) {
    const index = weekBuckets.findIndex(w => w.number === selectedWeekNumber);
    const target = weekBuckets[index + delta];
    if (target) selectWeek(target.number);
  }

  function applyPredictions(list) {
    let changed = false;
    for (const game of list || []) {
      const key = `${isoDate(game.date)}|||${norm(game.awayTeam)}|||${norm(game.homeTeam)}`;
      const hit = livePredictions.get(key);
      if (!hit) continue;
      if (game.awayScore !== hit.awayScore || game.homeScore !== hit.homeScore || String(game.winner || '') !== hit.winner) {
        game.awayScore = hit.awayScore;
        game.homeScore = hit.homeScore;
        game.winner = hit.winner;
        changed = true;
      }
    }
    return changed;
  }

  // Keep every loaded season game available, but render one football week at a time.
  render = function () {
    if (!seasonGames && Array.isArray(games) && games.length) {
      seasonGames = games.slice();
      applyPredictions(seasonGames);
      buildWeekBuckets();
      selectedWeekNumber = chooseInitialWeek();
    }

    if (seasonGames && weekBuckets.length) {
      if (!weekBuckets.some(w => w.number === selectedWeekNumber)) selectedWeekNumber = chooseInitialWeek();
      const bucket = weekBuckets.find(w => w.number === selectedWeekNumber) || weekBuckets[0];
      games = bucket.games.slice();
      syncWeekNav();
    }

    return originalRender();
  };

  // Pull A:F directly from Weekly Simulation as a live prediction overlay.
  window.rusWeeklySheetCallback = payload => {
    try {
      const rows = payload?.table?.rows || [];
      const predictions = new Map();
      const rawCell = c => c == null ? '' : (c.v ?? c.f ?? '');
      const displayCell = c => c == null ? '' : (c.f ?? c.v ?? '');

      for (const row of rows) {
        const c = row?.c || [];
        const date = isoDate(displayCell(c[0]));
        const away = norm(rawCell(c[1]));
        const home = norm(rawCell(c[2]));
        const awayRaw = rawCell(c[3]);
        const homeRaw = rawCell(c[4]);
        if (!date || !away || !home || awayRaw === '' || homeRaw === '') continue;
        const awayScore = Number(awayRaw);
        const homeScore = Number(homeRaw);
        const winner = String(rawCell(c[5]) ?? '').trim();
        if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) continue;
        predictions.set(`${date}|||${away}|||${home}`, { awayScore, homeScore, winner });
      }

      livePredictions = predictions;
      const changed = applyPredictions(seasonGames || games);
      if (changed && seasonGames) buildWeekBuckets();
      if (changed) render();
    } catch (error) {
      console.warn('Weekly Simulation live prediction overlay failed', error);
    }
  };

  const predictionScript = document.createElement('script');
  predictionScript.async = true;
  predictionScript.src = `https://docs.google.com/spreadsheets/d/1IHr84tlMdZVAazLDh0HV7ZWoxNH4UpjpLt_UTV8KZwo/gviz/tq?gid=1211467999&range=A1:F1000&tqx=${encodeURIComponent('out:json;responseHandler:rusWeeklySheetCallback')}&_=${Date.now()}`;
  document.head.appendChild(predictionScript);

  function dateFromHeading(text) {
    const raw = String(text || '').trim();
    const match = games.find(g => fmtDate(g.date) === raw);
    return match ? isoDate(match.date) : '';
  }

  function addGamePageLinks() {
    document.querySelectorAll('#board .game').forEach(game => {
      if (game.querySelector('.game-page-link')) return;
      const teams = [...game.querySelectorAll('.team-name')].map(x => x.textContent.trim()).filter(Boolean);
      if (teams.length < 2) return;
      const heading = game.closest('.date-section')?.querySelector('.date-head h2')?.textContent || '';
      const date = dateFromHeading(heading);
      if (!date) return;
      const foot = game.querySelector('.game-foot');
      if (!foot) return;
      const link = document.createElement('a');
      link.className = 'game-page-link';
      link.href = `game.html?${new URLSearchParams({ date, away: teams[0], home: teams[1] })}`;
      link.textContent = 'View Game →';
      const source = foot.querySelector('.deseret-link');
      if (source) foot.insertBefore(link, source);
      else foot.appendChild(link);
    });
  }

  async function hydrateScoreboardLogos() {
    const logos = await fetch(`school-logo-cache.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));

    try {
      const svg = await fetch(`school-logos/rich-user.svg?v=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.ok ? r.text() : '');
      const embedded = (svg.match(/href=["'](data:image\/(?:png|webp);base64,[^"']+)["']/i) || [])[1] || '';
      if (embedded) logos.RICH = embedded;
    } catch {}

    const board = document.getElementById('board');
    let observer = null;
    const apply = () => {
      observer?.disconnect();
      document.querySelectorAll('#board .game .team-row').forEach(teamRow => {
        const team = teamRow.querySelector('.team-name')?.textContent?.trim();
        const main = teamRow.querySelector('.team-main');
        if (!team || !main) return;

        let img = main.querySelector('.team-logo');
        if (!img) {
          img = document.createElement('img');
          img.className = 'team-logo';
          img.alt = `${team} logo`;
          main.prepend(img);
        }

        const src = logos[norm(team)] || window.RUSSchoolAssets?.logoUrl?.(team) || '';
        if (src && img.getAttribute('src') !== src) {
          img.src = src;
          img.style.display = 'block';
          img.style.objectFit = 'contain';
          img.style.objectPosition = 'center';
        }
      });
      addGamePageLinks();
      if (observer && board) observer.observe(board, { childList: true, subtree: true });
    };

    if (board) observer = new MutationObserver(apply);
    apply();
  }

  hydrateScoreboardLogos();

  // The repository's live-score job updates main independently of GitHub Pages.
  // Read that source directly so an already-open scoreboard does not wait for a Pages deploy.
  window.addEventListener('load', () => {
    setTimeout(() => refreshLiveDetails(), 1200);
    setInterval(() => refreshLiveDetails(), LIVE_REFRESH_MS);
  }, { once: true });
})();