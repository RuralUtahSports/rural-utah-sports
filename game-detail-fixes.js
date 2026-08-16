(() => {
  const style = document.createElement('style');
  style.textContent = `
    .game-team-score{margin:10px auto 0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:88px}
    .game-team-score .score-label{font-size:9px;line-height:1;text-transform:uppercase;letter-spacing:.8px;color:#777;font-weight:1000;margin-bottom:4px}
    .game-team-score .score-value{font-size:50px;line-height:.95;font-weight:1000;color:#fff;text-shadow:0 3px 12px rgba(0,0,0,.45)}
    .game-team-score.winner .score-value{color:#F14D07}
    .matchup.score-attached .score-center .score{display:none}
    .matchup.score-attached .score-center{min-width:90px}
    .matchup.score-attached .score-center:after{content:'VS';display:block;color:#555;font-size:12px;font-weight:1000;letter-spacing:1px;margin-top:3px}
    .stat-label .stat-team-name{color:#F14D07}
    .stat-block[data-team]{border-left:4px solid #F14D07;padding-left:10px}
    @media(max-width:760px){
      .matchup.score-attached .score-center{order:0;margin:2px 0 4px}
      .matchup.score-attached .score-center:after{display:none}
      .game-team-score .score-value{font-size:46px}
      .game-team-score{margin-top:8px}
    }
  `;
  document.head.appendChild(style);

  const norm = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  const compact = value => norm(value).replace(/[^A-Z0-9]/g, '');
  const cleanPlayer = value => String(value || '')
    .replace(/^\s*\d+\s+/, '')
    .replace(/^\s*[A-Z]\s*\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  function teamFromPlay(play, teams) {
    const text = String(play || '');
    const prefix = text.split(/—| - /)[0] || text;
    const c = compact(prefix);
    return teams.find(team => c.includes(compact(team))) || '';
  }

  function attachScores() {
    const matchup = document.querySelector('#page .matchup');
    if (!matchup || matchup.dataset.scoreFixed === '1') return;
    const teams = [...matchup.querySelectorAll(':scope > .team')];
    const centerScore = matchup.querySelector('.score-center .score');
    if (teams.length !== 2 || !centerScore) return;
    const raw = centerScore.textContent.trim();
    const parts = raw.split(/\s*[–—-]\s*/);
    if (parts.length !== 2 || !parts.every(v => /^\d+$/.test(v))) return;

    const scores = parts.map(Number);
    teams.forEach((team, i) => {
      let box = team.querySelector('.game-team-score');
      if (!box) {
        box = document.createElement('div');
        box.className = 'game-team-score';
        const meta = team.querySelector('.team-meta');
        if (meta) team.insertBefore(box, meta);
        else team.appendChild(box);
      }
      const winner = scores[i] > scores[1 - i];
      box.classList.toggle('winner', winner);
      box.innerHTML = `<span class="score-label">Final score</span><span class="score-value">${scores[i]}</span>`;
    });
    matchup.classList.add('score-attached');
    matchup.dataset.scoreFixed = '1';
  }

  function inferStatLabels() {
    const heroTeams = [...document.querySelectorAll('#page .matchup > .team .team-name')]
      .map(el => el.textContent.trim())
      .filter(Boolean);
    if (heroTeams.length !== 2) return;

    const plays = [...document.querySelectorAll('#page .scoring-play')].map(el => el.textContent.trim());
    const blocks = [...document.querySelectorAll('#page .stat-block')];
    if (!blocks.length) return;

    const knownByCategory = new Map();

    for (const block of blocks) {
      const label = block.querySelector('.stat-label');
      if (!label) continue;
      const labelText = label.textContent.trim();
      const category = labelText.includes('•') ? labelText.split('•').pop().trim() : labelText;
      let team = heroTeams.find(t => compact(labelText).includes(compact(t))) || '';

      if (!team) {
        const playerCells = [...block.querySelectorAll('tbody tr')]
          .map(row => row.children?.[1]?.textContent || '')
          .map(cleanPlayer)
          .filter(name => name.split(/\s+/).length >= 2);
        const votes = new Map();
        for (const player of playerCells) {
          for (const play of plays) {
            if (!compact(play).includes(compact(player))) continue;
            const hit = teamFromPlay(play, heroTeams);
            if (hit) votes.set(hit, (votes.get(hit) || 0) + 1);
          }
        }
        team = [...votes.entries()].sort((a,b) => b[1] - a[1])[0]?.[0] || '';
      }

      block.dataset.statCategory = category;
      if (team) {
        block.dataset.team = team;
        label.innerHTML = `<span class="stat-team-name">${team}</span> • ${category}`;
        if (!knownByCategory.has(category)) knownByCategory.set(category, new Set());
        knownByCategory.get(category).add(team);
      }
    }

    const categories = [...new Set(blocks.map(b => b.dataset.statCategory).filter(Boolean))];
    for (const category of categories) {
      const group = blocks.filter(b => b.dataset.statCategory === category);
      if (group.length !== 2) continue;
      const known = group.find(b => b.dataset.team);
      const unknown = group.find(b => !b.dataset.team);
      if (!known || !unknown) continue;
      const other = heroTeams.find(t => norm(t) !== norm(known.dataset.team));
      const label = unknown.querySelector('.stat-label');
      if (other && label) {
        unknown.dataset.team = other;
        label.innerHTML = `<span class="stat-team-name">${other}</span> • ${category}`;
      }
    }
  }

  function apply() {
    attachScores();
    inferStatLabels();
  }

  apply();
  const page = document.getElementById('page');
  if (page) new MutationObserver(apply).observe(page, { childList: true, subtree: true });
})();
