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
    .stat-player-link{color:#fff;text-decoration:none;font-weight:900;border-bottom:1px solid rgba(241,77,7,.55);transition:color .15s ease,border-color .15s ease}
    .stat-player-link:hover,.stat-player-link:focus{color:#F14D07;border-bottom-color:#F14D07}
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

  function statCategoryOrder(value) {
    const category = norm(value);
    if (category.includes('PASS')) return 0;
    if (category.includes('RUSH')) return 1;
    if (category.includes('RECEIV')) return 2;
    if (category.includes('DEF') || category.includes('TACK')) return 3;
    return 4;
  }

  function orderStatBlocks() {
    const blocks = [...document.querySelectorAll('#page .stat-block')];
    if (!blocks.length) return;
    const groups = new Map();
    for (const block of blocks) {
      const parent = block.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(block);
    }
    for (const [parent, group] of groups) {
      group
        .map((block, index) => ({ block, index, order: statCategoryOrder(block.dataset.statCategory || block.querySelector('.stat-label')?.textContent || '') }))
        .sort((a,b) => a.order - b.order || a.index - b.index)
        .forEach(({block}) => parent.appendChild(block));
    }
  }

  function gameSeason() {
    const q = new URLSearchParams(location.search);
    const raw = q.get('date') || '';
    const match = raw.match(/(?:^|\D)(20\d{2})(?:\D|$)/);
    return match ? Number(match[1]) : null;
  }

  async function linkStatPlayers() {
    const blocks = [...document.querySelectorAll('#page .stat-block')];
    if (!blocks.length) return;
    const season = gameSeason();
    if (![2025, 2026].includes(season)) return;

    try {
      const response = await fetch(`player-game-stats-${season}.json?v=${Date.now()}`, { cache:'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const byTeam = new Map();
      const global = new Map();

      const addPlayer = (team, player) => {
        if (!player?.playerId) return;
        const number = compact(player.number || '');
        const name = compact(cleanPlayer(player.name || ''));
        if (!name) return;
        const key = `${number}|${name}`;
        const teamKey = compact(team);
        if (!byTeam.has(teamKey)) byTeam.set(teamKey, new Map());
        byTeam.get(teamKey).set(key, player.playerId);
        if (!global.has(key)) global.set(key, new Set());
        global.get(key).add(player.playerId);
      };

      for (const [team, teamData] of Object.entries(data?.teams || {})) {
        for (const game of teamData?.games || []) {
          for (const player of game?.players || []) addPlayer(team, player);
        }
      }

      for (const block of blocks) {
        const headers = [...block.querySelectorAll('thead th')].map(th => compact(th.textContent));
        const numberIndex = headers.findIndex(h => h === 'NO' || h === 'NUMBER' || h === '#');
        const playerIndex = headers.findIndex(h => h === 'PLAYER' || h === 'NAME');
        if (playerIndex < 0) continue;
        const teamKey = compact(block.dataset.team || '');
        const teamPlayers = byTeam.get(teamKey);

        for (const row of block.querySelectorAll('tbody tr')) {
          const cells = [...row.children];
          const nameCell = cells[playerIndex];
          if (!nameCell || nameCell.querySelector('a.stat-player-link')) continue;
          const number = numberIndex >= 0 ? compact(cells[numberIndex]?.textContent || '') : '';
          const cleanName = cleanPlayer(nameCell.textContent || '');
          const name = compact(cleanName);
          if (!name) continue;
          const key = `${number}|${name}`;

          let playerId = teamPlayers?.get(key) || '';
          if (!playerId) {
            const candidates = [...(global.get(key) || [])];
            if (candidates.length === 1) playerId = candidates[0];
          }
          if (!playerId) continue;

          const link = document.createElement('a');
          link.className = 'stat-player-link';
          link.href = `player.html?id=${encodeURIComponent(playerId)}&season=${season}`;
          link.textContent = cleanName;
          link.setAttribute('aria-label', `View ${cleanName} player page`);
          nameCell.textContent = '';
          nameCell.appendChild(link);
        }
      }
    } catch (error) {
      console.warn('Could not link game stat players', error);
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

  function isoDate(value) {
    const s = String(value || '').trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    return '';
  }

  async function enforceVerifiedFinalStatus() {
    if (!/(^|\/)game\.html$/.test(location.pathname)) return;
    const q = new URLSearchParams(location.search);
    const requestedAway = q.get('away') || q.get('team1') || '';
    const requestedHome = q.get('home') || q.get('team2') || '';
    const requestedDate = q.get('date') || '';
    if (!requestedAway || !requestedHome || !requestedDate) return;

    try {
      const response = await fetch(`weekly-simulation.json?v=${Date.now()}`, { cache:'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const game = (payload?.games || []).find(g => {
        if (isoDate(g?.date) !== isoDate(requestedDate)) return false;
        const a = compact(g?.awayTeam), h = compact(g?.homeTeam);
        const ra = compact(requestedAway), rh = compact(requestedHome);
        return (a === ra && h === rh) || (a === rh && h === ra);
      });
      if (!game) return;

      const awayScore = Number(game.actualAway);
      const homeScore = Number(game.actualHome);
      if (game.actualAway === null || game.actualAway === undefined || game.actualHome === null || game.actualHome === undefined || !Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return;

      const heroNames = [...document.querySelectorAll('#page .matchup > .team .team-name')].map(el => el.textContent.trim());
      let heroScores = [awayScore, homeScore];
      if (heroNames.length === 2 && compact(heroNames[0]) === compact(game.homeTeam) && compact(heroNames[1]) === compact(game.awayTeam)) heroScores = [homeScore, awayScore];

      const status = document.querySelector('#page .score-center .status');
      if (status) {
        status.textContent = 'Final';
        status.classList.remove('live');
        status.classList.add('final');
      }

      const centerScore = document.querySelector('#page .score-center .score');
      if (centerScore) {
        centerScore.textContent = `${heroScores[0]}–${heroScores[1]}`;
        centerScore.classList.remove('upcoming');
      }

      const summaries = [...document.querySelectorAll('#page .summary')];
      for (const cell of summaries) {
        const label = cell.querySelector('span');
        const value = cell.querySelector('strong');
        if (!label || !value) continue;
        if (/^status$/i.test(label.textContent.trim())) value.textContent = 'Final';
        if (/final margin/i.test(label.textContent)) value.textContent = String(Math.abs(awayScore - homeScore));
      }

      const result = document.querySelector('#page .result-label');
      if (result) {
        const winner = awayScore === homeScore ? 'Tie' : awayScore > homeScore ? game.awayTeam : game.homeTeam;
        result.textContent = winner === 'Tie' ? 'Tie' : `${winner} wins`;
      }

      const matchup = document.querySelector('#page .matchup');
      if (matchup) {
        matchup.dataset.scoreFixed = '';
        matchup.classList.remove('score-attached');
        matchup.querySelectorAll('.game-team-score').forEach(node => node.remove());
      }
    } catch (error) {
      console.warn('Could not enforce verified final status', error);
    }
  }

  async function apply() {
    await enforceVerifiedFinalStatus();
    attachScores();
    inferStatLabels();
    orderStatBlocks();
    ensureStatStatus();
    linkStatPlayers();
  }

  const page = document.getElementById('page');
  let applied = false;

  function applyWhenReady() {
    if (applied || !page || page.classList.contains('loading') || page.classList.contains('error')) return;
    applied = true;
    apply();
  }

  applyWhenReady();

  if (page && !applied) {
    const observer = new MutationObserver(() => {
      if (page.classList.contains('loading')) return;
      observer.disconnect();
      requestAnimationFrame(applyWhenReady);
    });
    observer.observe(page, { childList: true, attributes: true, attributeFilter: ['class'] });
  }
})();