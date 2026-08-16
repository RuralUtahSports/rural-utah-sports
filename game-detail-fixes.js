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
    .game-stat-status{margin:0 0 13px;border:1px solid #3a3a3a;border-left:5px solid #777;background:#161616;border-radius:7px;padding:11px 13px;color:#aaa;font-size:11px;line-height:1.45;font-weight:700}
    .game-stat-status strong{display:block;color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.4px;margin-bottom:3px}
    .game-stat-status.partial{border-left-color:#F14D07;background:#1a130f}
    .game-stat-status.partial strong{color:#F14D07}
    .game-stat-status.complete{border-left-color:#54dc73;background:#0d170f}
    .game-stat-status.complete strong{color:#54dc73}
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

  function isCoreHeader(text) {
    const h = compact(text);
    if (!h || ['NO','NUMBER','PLAYER','NAME','TD','TDS','PAT','FG','RETURNTD'].includes(h)) return false;
    return /CARR|ATT|YARD|YDS|COMP|RECEP|REC$|TACK|SOLO|ASSIST|SACK|INTERCEPT|INT$|TFL|FUMBLE|FUM|AVG|LONG/.test(h);
  }

  function statCompleteness() {
    const blocks = [...document.querySelectorAll('#page .stat-block')];
    if (!blocks.length) return { status:'unavailable', blocks:0, coreCells:0, filled:0 };
    let coreCells = 0, filled = 0;
    let emptyCoreBlocks = 0;
    for (const block of blocks) {
      const headers = [...block.querySelectorAll('thead th')].map(th => th.textContent.trim());
      const indexes = headers.map((h,i) => isCoreHeader(h) ? i : -1).filter(i => i >= 0);
      let blockCore = 0, blockFilled = 0;
      for (const row of block.querySelectorAll('tbody tr')) {
        for (const i of indexes) {
          blockCore++;
          const value = row.children?.[i]?.textContent?.trim() || '';
          if (value && !/^[-–—]$/.test(value)) blockFilled++;
        }
      }
      coreCells += blockCore;
      filled += blockFilled;
      if (blockCore && blockFilled === 0) emptyCoreBlocks++;
    }
    if (!filled) return { status:'partial', blocks:blocks.length, coreCells, filled };
    if (emptyCoreBlocks > 0 || (coreCells && filled / coreCells < .25)) return { status:'partial', blocks:blocks.length, coreCells, filled };
    return { status:'complete', blocks:blocks.length, coreCells, filled };
  }

  function findSeriesHeading() {
    return [...document.querySelectorAll('#page .section-title')]
      .find(h => /series history/i.test(h.textContent || '')) || null;
  }

  function ensureStatStatus() {
    const page = document.getElementById('page');
    if (!page || page.classList.contains('loading') || page.classList.contains('error')) return;
    const state = statCompleteness();
    let notice = document.getElementById('gameStatStatus');

    if (state.status === 'complete') {
      if (notice) notice.remove();
      return;
    }

    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'gameStatStatus';
      notice.className = 'game-stat-status';
    }

    if (state.status === 'unavailable') {
      notice.className = 'game-stat-status';
      notice.innerHTML = '<strong>Player stats not posted yet</strong>Deseret has not published player stat details for this game yet. Rural Utah Sports will keep checking automatically for several days after the final.';

      if (!document.getElementById('gameStatsAvailabilityTitle')) {
        const title = document.createElement('h2');
        title.id = 'gameStatsAvailabilityTitle';
        title.className = 'section-title';
        title.textContent = 'Game Stats';
        const series = findSeriesHeading();
        if (series) {
          series.parentNode.insertBefore(title, series);
          series.parentNode.insertBefore(notice, series);
        } else {
          page.append(title, notice);
        }
      } else if (!notice.isConnected) {
        document.getElementById('gameStatsAvailabilityTitle').insertAdjacentElement('afterend', notice);
      }
      return;
    }

    notice.className = 'game-stat-status partial';
    notice.innerHTML = '<strong>Partial player stats</strong>Some game stat information is available, but Deseret has not posted full player lines yet. This page will keep checking and fill them in automatically if more stats are added.';
    const firstBlock = document.querySelector('#page .stat-block');
    if (firstBlock) {
      const panel = firstBlock.closest('.panel');
      if (panel && notice.parentNode !== panel) panel.insertBefore(notice, panel.firstChild);
    }
  }

  function apply() {
    attachScores();
    inferStatLabels();
    ensureStatStatus();
  }

  apply();
  const page = document.getElementById('page');
  if (page) new MutationObserver(apply).observe(page, { childList: true, subtree: true });
})();
