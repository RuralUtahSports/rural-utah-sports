(() => {
  const style = document.createElement('style');
  style.textContent = `
    .scoreboard-refresh-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-7px 0 18px}
    .scoreboard-refresh-btn{appearance:none;border:1px solid #F14D07;background:#F14D07;color:#000;border-radius:7px;padding:10px 14px;font:900 12px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.4px;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.28)}
    .scoreboard-refresh-btn:hover{filter:brightness(1.08)}
    .scoreboard-refresh-btn:disabled{opacity:.65;cursor:wait}
    .scoreboard-refresh-note{font-size:10px;color:#777;font-weight:700}
    @media(max-width:700px){.scoreboard-refresh-row{margin-top:-5px}.scoreboard-refresh-btn{width:100%;padding:12px 14px;font-size:13px;text-align:center}.scoreboard-refresh-note{width:100%;text-align:center}}
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
    note.textContent = 'Loads the newest published scoreboard data';
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

    const apply = () => {
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
        if (src) {
          img.src = src;
          img.style.display = 'block';
          img.style.objectFit = 'contain';
          img.style.objectPosition = 'center';
        }
      });
    };

    apply();
    const board = document.getElementById('board');
    if (board) new MutationObserver(apply).observe(board, { childList: true, subtree: true });
  }

  hydrateScoreboardLogos();
})();
