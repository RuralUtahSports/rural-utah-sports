(() => {
  const style = document.createElement('style');
  style.textContent = `
    .scoreboard-refresh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-7px 0 18px}
    .scoreboard-refresh-btn{appearance:none;border:1px solid #F14D07;background:#F14D07;color:#000;border-radius:7px;padding:10px 14px;font:900 12px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.4px;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.28)}
    .scoreboard-refresh-btn:hover{filter:brightness(1.08)}
    .scoreboard-refresh-btn:disabled{opacity:.65;cursor:wait}
    .scoreboard-refresh-note{font-size:10px;color:#777;font-weight:700}
    .game-page-link{color:#000!important;text-decoration:none!important;font-weight:1000!important;background:#F14D07!important;border:1px solid #F14D07!important;border-radius:5px;padding:6px 9px;white-space:nowrap;text-transform:uppercase;letter-spacing:.15px}
    .game-page-link:hover{filter:brightness(1.1)}
    @media(max-width:700px){.scoreboard-refresh-row{margin-top:-5px}.scoreboard-refresh-btn{width:100%;padding:12px 14px;font-size:13px;text-align:center}.scoreboard-refresh-note{width:100%;text-align:center}.game-page-link{width:100%;text-align:center;padding:8px 10px}}
  `;
  document.head.appendChild(style);

  const subtitle = document.querySelector('.subtitle');
  if (subtitle && !document.getElementById('scoreboardRefreshButton')) {
    const row = document.createElement('div');
    row.className = 'scoreboard-refresh-row';
    const btn = document.createElement('button');
    btn.id = 'scoreboardRefreshButton';
    btn.className = 'scoreboard-refresh-btn';
    btn.type = 'button';
    btn.textContent = '↻ Refresh Scores';
    const note = document.createElement('span');
    note.className = 'scoreboard-refresh-note';
    note.textContent = 'Loads the newest published scoreboard and prediction data';
    row.append(btn, note);
    subtitle.insertAdjacentElement('afterend', row);

    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = '↻ Refreshing…';
      const url = new URL(window.location.href);
      url.searchParams.set('_refresh', Date.now().toString());
      window.location.replace(url.toString());
    });
  }

  const norm = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');

  // Keep the Weekly Scoreboard scoped to one football week instead of every
  // season game in weekly-simulation.json. Between game weeks, show the next
  // upcoming week; once no future games remain, show the latest loaded week.
  const originalRender = render;
  let weekScoped = false;
  render = function () {
    if (!weekScoped && Array.isArray(games) && games.length) {
      const valid = games.filter(g => dateVal(g.date));
      if (valid.length) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = valid.find(g => dateVal(g.date) >= today.getTime()) || valid[valid.length - 1];
        const anchor = new Date(dateVal(target.date));
        anchor.setHours(0, 0, 0, 0);
        const daysSinceThursday = (anchor.getDay() + 3) % 7;
        anchor.setDate(anchor.getDate() - daysSinceThursday);
        const start = anchor.getTime();
        const end = start + (7 * 24 * 60 * 60 * 1000);
        games = games.filter(g => {
          const t = dateVal(g.date);
          return t >= start && t < end;
        });
      }
      weekScoped = true;
    }
    return originalRender();
  };

  // Pull A:F directly from Weekly Simulation as a live prediction overlay.
  // Include the date in the key so a repeat matchup in another week/season
  // can never inherit the wrong manual prediction.
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

      let changed = false;
      for (const game of games) {
        const key = `${isoDate(game.date)}|||${norm(game.awayTeam)}|||${norm(game.homeTeam)}`;
        const hit = predictions.get(key);
        if (!hit) continue;
        if (game.awayScore !== hit.awayScore || game.homeScore !== hit.homeScore || String(game.winner || '') !== hit.winner) {
          game.awayScore = hit.awayScore;
          game.homeScore = hit.homeScore;
          game.winner = hit.winner;
          changed = true;
        }
      }
      if (changed) originalRender();
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
      // Avoid an observer reacting to DOM nodes that this same pass inserts.
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
        if (src && img.src !== src) {
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
    if (observer && board) observer.observe(board, { childList: true, subtree: true });
  }

  hydrateScoreboardLogos();
})();