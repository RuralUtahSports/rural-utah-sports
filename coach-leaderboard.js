(() => {
  const clean = value => String(value ?? '').trim();
  const esc = value => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  let data = null;

  function record(w, l, t) { return `${w || 0}-${l || 0}${t ? `-${t}` : ''}`; }
  function link(name) { return `<a class="team-link" href="coaches.html?coach=${encodeURIComponent(name)}">${esc(name)}</a>`; }
  function sortRows(rows, mode) {
    const comparisons = {
      wins: (a, b) => b.wins - a.wins || b.games - a.games,
      games: (a, b) => b.games - a.games || b.wins - a.wins,
      playoffWins: (a, b) => b.playoffWins - a.playoffWins || b.championships - a.championships || b.wins - a.wins,
      championships: (a, b) => b.championships - a.championships || b.appearances - a.appearances || b.playoffWins - a.playoffWins,
      appearances: (a, b) => b.appearances - a.appearances || b.championships - a.championships || b.playoffWins - a.playoffWins,
    };
    return [...rows].sort(comparisons[mode] || comparisons.wins);
  }

  function render() {
    const root = document.getElementById('coachLeaderboard');
    if (!root || !data) return;
    const query = clean(document.getElementById('coachLeaderSearch')?.value).toLowerCase();
    const mode = document.getElementById('coachLeaderSort')?.value || 'wins';
    const rows = sortRows((data.coaches || []).filter(row => !query || row.name.toLowerCase().includes(query) || (row.schools || []).some(school => school.toLowerCase().includes(query))), mode);
    root.querySelector('tbody').innerHTML = rows.map((row, index) => `<tr><td>${index + 1}</td><td class="left">${link(row.name)}<span class="career-school">${esc((row.schools || []).join(' • '))}</span></td><td><strong>${row.wins}</strong></td><td>${row.games}</td><td>${record(row.wins, row.losses, row.ties)}</td><td><strong>${row.playoffWins}</strong></td><td>${record(row.playoffWins, row.playoffLosses, row.playoffTies)}</td><td class="title-total">${row.championships}</td><td>${row.appearances}</td><td>${row.seasons}</td></tr>`).join('') || '<tr><td colspan="10">No coaches match this search.</td></tr>';
    root.querySelector('.coach-leader-count').textContent = `${rows.length.toLocaleString()} coaches`;
  }

  async function mount() {
    if (new URLSearchParams(location.search).get('coach')) return;
    const app = document.getElementById('app');
    const summary = app?.querySelector('.summary');
    if (!summary || document.getElementById('coachLeaderboard')) return;
    const section = document.createElement('section');
    section.id = 'coachLeaderboard';
    section.className = 'detail-card';
    section.style.marginBottom = '22px';
    section.innerHTML = `<h2 style="border-left:5px solid #F14D07;padding-left:12px;text-transform:uppercase">All-Time Coaching Leaderboard</h2><div class="controls" style="grid-template-columns:minmax(220px,1fr) minmax(190px,.55fr);margin-top:14px"><div><label for="coachLeaderSearch">Search coach or school</label><input id="coachLeaderSearch" type="search" placeholder="Coach or school"></div><div><label for="coachLeaderSort">Rank by</label><select id="coachLeaderSort"><option value="wins">Career Wins</option><option value="games">Games Coached</option><option value="playoffWins">Playoff Wins</option><option value="championships">Championships</option><option value="appearances">Championship Appearances</option></select></div></div><p class="coach-leader-count note">Loading coaches…</p><div class="table-wrap"><table><thead><tr><th>#</th><th>Coach</th><th>Wins</th><th>Games</th><th>Career Record</th><th>Playoff Wins</th><th>Playoff Record</th><th>Titles</th><th>Title Apps</th><th>Seasons</th></tr></thead><tbody><tr><td colspan="10">Loading all-time rankings…</td></tr></tbody></table></div><p class="note">Click a coach to open his complete year-by-year career. Rankings include only seasons with a verified head-coach assignment.</p>`;
    summary.insertAdjacentElement('afterend', section);
    try {
      const response = await fetch('coach-career-leaderboard.json?v=20260828-coach-leaders1', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      document.getElementById('coachLeaderSearch').addEventListener('input', render);
      document.getElementById('coachLeaderSort').addEventListener('change', render);
      render();
    } catch (error) {
      console.error('Coach leaderboard:', error);
      section.querySelector('tbody').innerHTML = '<tr><td colspan="10">The coaching leaderboard could not be loaded.</td></tr>';
    }
  }

  const observer = new MutationObserver(mount);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
