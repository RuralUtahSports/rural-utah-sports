(() => {
  const clean = value => String(value ?? '').trim();
  const esc = value => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const norm = value => clean(value).toUpperCase();
  const teamKey = value => norm(value).replace(/[^A-Z0-9]/g, '');
  const teamSlug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const coach = clean(new URLSearchParams(location.search).get('coach'));
  const sourceCode = { h: 'historical-workbook', d: '2026-directory', n: 'deseret-news' };

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = '.career-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.career-head h2{font-size:38px;text-transform:uppercase;margin:0}.career-head p{color:#999;margin:6px 0 0}.back-link{color:#F14D07;text-decoration:none;font-weight:900;text-transform:uppercase;font-size:11px;white-space:nowrap}.career-record{font-weight:900}.career-record.win{color:#82dd89}.career-record.loss{color:#ff8585}.career-school{display:block;color:#777;font-size:10px;margin-top:3px}@media(max-width:800px){.career-head{display:block}.back-link{display:inline-block;margin-top:14px}}@media(max-width:520px){.career-head h2{font-size:28px}}';
    document.head.appendChild(style);
  }

  function linkCurrentCoachCells() {
    if (coach) return;
    document.querySelectorAll('#app table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')].map(th => clean(th.textContent));
      const index = headers.findIndex(text => /coach/i.test(text));
      if (index < 0) return;
      table.querySelectorAll('tbody tr').forEach(row => {
        const cell = row.children[index];
        const name = clean(cell?.textContent);
        if (!cell || !name || name === '—' || cell.querySelector('a')) return;
        cell.innerHTML = `<a class="team-link" href="coaches.html?coach=${encodeURIComponent(name)}">${esc(name)}</a>`;
      });
    });
  }

  function unpack(index, parts) {
    const teams = {};
    for (const row of parts.flatMap(part => part.rows || [])) {
      const [team, active, currentCoach, school, classification, region, rawTenures] = row;
      const seasons = {};
      const tenures = (rawTenures || []).map(([name, start, end, codes]) => {
        const sources = [...String(codes || '')].map(code => sourceCode[code]).filter(Boolean);
        for (let year = Number(start); year <= Number(end); year++) seasons[year] = { coach: name, sources };
        return { coach: name, start: Number(start), end: Number(end), sources };
      });
      teams[team] = { team, active: !!active, currentCoach, school, classification, region, seasons, tenures };
    }
    return { ...index, teams };
  }

  const yearOf = date => {
    const match = String(date || '').match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2})(?:\D|$)/);
    return match ? Number(match[1]) : null;
  };

  function flattenGames(data) {
    const games = [], seen = new Set();
    for (const entry of data.scores || []) for (const game of Array.isArray(entry.games) ? entry.games : []) {
      const tie = !!game.tie;
      const team1 = clean(tie ? game.team1 : game.winner), team2 = clean(tie ? game.team2 : game.loser);
      const score1 = Number(tie ? game.score1 : game.winnerScore), score2 = Number(tie ? game.score2 : game.loserScore);
      const year = yearOf(game.date);
      if (!team1 || !team2 || !year || !Number.isFinite(score1) || !Number.isFinite(score2)) continue;
      const pair = [[teamKey(team1), score1], [teamKey(team2), score2]].sort((a, b) => a[0].localeCompare(b[0]));
      const key = `${game.date || year}|${pair[0][0]}:${pair[0][1]}|${pair[1][0]}:${pair[1][1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      games.push({ year, team1, team2, score1, score2, tie });
    }
    return games;
  }

  function assignmentsFor(data, name) {
    const rows = [];
    for (const team of Object.values(data.teams || {})) for (const [year, season] of Object.entries(team.seasons || {})) {
      if (norm(season.coach) === norm(name)) rows.push({ year: Number(year), team: team.team, school: team.school || team.team, sources: season.sources || [] });
    }
    return rows.sort((a, b) => b.year - a.year || a.team.localeCompare(b.team));
  }

  async function showCareer() {
    addStyles();
    const app = document.getElementById('app');
    app.className = 'loading';
    app.textContent = 'Calculating career record from the RUS game database...';
    try {
      const indexResponse = await fetch('coach-history-index.json?v=20260828-coach-careers1', { cache: 'no-store' });
      if (!indexResponse.ok) throw new Error(`Coach index HTTP ${indexResponse.status}`);
      const index = await indexResponse.json();
      const [parts, gameResponse] = await Promise.all([
        Promise.all((index.shards || []).map(async name => {
          const response = await fetch(`${name}?v=20260828-coach-careers1`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`${name} HTTP ${response.status}`);
          return response.json();
        })),
        fetch('scorigami.json?v=20260828-coach-careers1', { cache: 'no-store' })
      ]);
      if (!gameResponse.ok) throw new Error(`Games HTTP ${gameResponse.status}`);
      const data = unpack(index, parts), assignments = assignmentsFor(data, coach);
      if (!assignments.length) {
        app.className = '';
        app.innerHTML = `<a class="back-link" href="coaches.html">← All coaches</a><div class="empty">No verified coaching seasons were found for ${esc(coach)}.</div>`;
        return;
      }
      const games = flattenGames(await gameResponse.json());
      const teamPages = new Map();
      await Promise.all([...new Set(assignments.map(row => row.team))].map(async team => {
        try {
          const response = await fetch(`team-page-data/${teamSlug(team)}.json?v=20260828-coach-careers2`, { cache: 'no-store' });
          if (response.ok) teamPages.set(teamKey(team), await response.json());
        } catch (error) { console.warn('Coach playoff/title data:', team, error); }
      }));
      const records = assignments.map(assignment => {
        const record = { ...assignment, w: 0, l: 0, t: 0, games: 0, pf: 0, pa: 0, pw: 0, pl: 0, pt: 0, appearances: 0, championships: 0 };
        for (const game of games) {
          if (game.year !== assignment.year) continue;
          const key = teamKey(assignment.team), first = teamKey(game.team1) === key, second = teamKey(game.team2) === key;
          if (!first && !second) continue;
          record.games++;
          record.pf += first ? game.score1 : game.score2;
          record.pa += first ? game.score2 : game.score1;
          if (game.tie) record.t++;
          else if (first) record.w++;
          else record.l++;
        }
        const page = teamPages.get(teamKey(assignment.team)) || {};
        for (const game of page.schedules?.[String(assignment.year)] || []) {
          if (game.playoff !== true) continue;
          const result = clean(game.result).toUpperCase();
          if (result === 'W') record.pw++;
          else if (result === 'L') record.pl++;
          else if (result === 'T') record.pt++;
        }
        for (const title of Array.isArray(page.championshipHistory) ? page.championshipHistory : []) {
          if (Number(title.year) !== assignment.year) continue;
          record.appearances++;
          const role = clean(title.role).toLowerCase();
          if (role === 'champion' || role === 'co-champion') record.championships++;
        }
        return record;
      });
      const total = records.reduce((sum, row) => ({ w: sum.w + row.w, l: sum.l + row.l, t: sum.t + row.t, games: sum.games + row.games, pw: sum.pw + row.pw, pl: sum.pl + row.pl, pt: sum.pt + row.pt, appearances: sum.appearances + row.appearances, championships: sum.championships + row.championships }), { w: 0, l: 0, t: 0, games: 0, pw: 0, pl: 0, pt: 0, appearances: 0, championships: 0 });
      const displayName = Object.values(data.teams).flatMap(team => team.tenures || []).find(row => norm(row.coach) === norm(coach))?.coach || coach;
      document.title = `${displayName} Coaching Record | Rural Utah Sports`;
      app.className = '';
      app.innerHTML = `<div class="career-head"><div><h2>${esc(displayName)}</h2><p>Utah high school football head coaching career</p></div><a class="back-link" href="coaches.html">← All coaches</a></div><div class="summary"><div class="card"><div class="num">${total.w}-${total.l}${total.t ? `-${total.t}` : ''}</div><div class="lab">Career Record</div></div><div class="card"><div class="num">${total.pw}-${total.pl}${total.pt ? `-${total.pt}` : ''}</div><div class="lab">Playoff Record</div></div><div class="card"><div class="num">${total.championships}</div><div class="lab">State Championships</div></div><div class="card"><div class="num">${total.appearances}</div><div class="lab">Championship Appearances</div></div></div><div class="table-wrap"><table><thead><tr><th>Season</th><th>School</th><th>Record</th><th>Win %</th><th>Playoff Record</th><th>Championship Appearance</th><th>State Championship</th></tr></thead><tbody>${records.map(row => { const pct = row.games ? ((row.w + row.t * .5) / row.games * 100).toFixed(1) + '%' : '—'; return `<tr><td><a class="team-link" href="season.html?year=${row.year}">${row.year}</a></td><td class="left"><a class="team-link" href="team.html?team=${encodeURIComponent(row.team)}">${esc(row.team)}</a><span class="career-school">${esc(row.school)}</span></td><td class="career-record ${row.w > row.l ? 'win' : row.w < row.l ? 'loss' : ''}">${row.games ? `${row.w}-${row.l}${row.t ? `-${row.t}` : ''}` : '—'}</td><td>${pct}</td><td>${row.pw || row.pl || row.pt ? `${row.pw}-${row.pl}${row.pt ? `-${row.pt}` : ''}` : '—'}</td><td>${row.appearances ? 'Yes' : '—'}</td><td>${row.championships ? 'Champion' : '—'}</td></tr>`; }).join('')}</tbody></table></div><p class="note">Career totals include only seasons with a verified coach assignment and games currently recorded in the Rural Utah Sports database. Playoff records use verified playoff-marked games, and championship appearances and titles use the RUS Championship Log. Current-season records update as final scores are added.</p>`;
    } catch (error) {
      console.error('Coach career profile:', error);
      app.className = '';
      app.innerHTML = '<a class="back-link" href="coaches.html">← All coaches</a><div class="empty">The career record could not be calculated. Please refresh and try again.</div>';
    }
  }

  if (coach) showCareer();
  else {
    const observer = new MutationObserver(linkCurrentCoachCells);
    observer.observe(document.getElementById('app'), { childList: true, subtree: true });
    linkCurrentCoachCells();
  }
})();
