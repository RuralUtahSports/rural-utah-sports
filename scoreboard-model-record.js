(() => {
  const FEED = 'weekly-simulation.json';
  const CARD_ID = 'rus-scoreboard-season-record';
  const STYLE_ID = 'rus-scoreboard-season-record-style';

  function actualWinner(game) {
    const named = String(game?.actualWinner ?? '').trim();
    if (named) return named;
    const away = Number(game?.actualAway), home = Number(game?.actualHome);
    if (!Number.isFinite(away) || !Number.isFinite(home) || away === home) return '';
    return away > home ? game.awayTeam : game.homeTeam;
  }

  function summarize(games) {
    const seen = new Set();
    let graded = 0, correct = 0, incorrect = 0;
    for (const game of games) {
      const key = `${game.date}|${game.awayTeam}|${game.homeTeam}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pick = String(game.winner ?? '').trim();
      const actual = actualWinner(game);
      if (!pick || !actual) continue;
      graded++;
      if (pick === actual) correct++;
      else incorrect++;
    }
    return {
      correct,
      incorrect,
      graded,
      pending: Math.max(0, seen.size - graded),
      accuracy: graded ? `${(correct / graded * 100).toFixed(1)}%` : '—',
    };
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${CARD_ID}{background:#000;border:1px solid #333;border-left:5px solid #F14D07;border-radius:8px;padding:14px 15px;margin:-5px 0 18px;box-shadow:0 8px 20px rgba(0,0,0,.2)}
#${CARD_ID} .scoreboard-season-record-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
#${CARD_ID} strong{display:block;color:#F14D07;font-size:16px;letter-spacing:.25px}
#${CARD_ID} .scoreboard-season-record-head span{display:block;color:#888;font-size:10px;font-weight:800;text-transform:uppercase;margin-top:4px}
#${CARD_ID} .scoreboard-season-record-caption{color:#777!important;margin-top:2px!important}
#${CARD_ID} .scoreboard-season-record-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
#${CARD_ID} .scoreboard-season-record-stats>div{background:#171717;border:1px solid #333;border-radius:6px;padding:10px;text-align:center}
#${CARD_ID} .scoreboard-season-record-stats>div strong{font-size:20px;color:#F14D07}
#${CARD_ID} .scoreboard-season-record-stats>div span{display:block;color:#888;font-size:9px;font-weight:900;text-transform:uppercase;margin-top:4px}
#${CARD_ID} .scoreboard-season-record-note{color:#777;font-size:10px;line-height:1.45;margin:10px 0 0}
@media(max-width:700px){#${CARD_ID}{padding:12px;margin:-5px 0 14px}#${CARD_ID} .scoreboard-season-record-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#${CARD_ID} .scoreboard-season-record-stats>div{padding:8px}#${CARD_ID} .scoreboard-season-record-stats>div strong{font-size:18px}}
`;
    document.head.appendChild(style);
  }

  function render(summary) {
    const anchor = document.getElementById('summary');
    if (!anchor) return;
    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement('section');
      card.id = CARD_ID;
      anchor.insertAdjacentElement('afterend', card);
    }
    card.innerHTML = `<div class='scoreboard-season-record-head'><div><strong>RUS MODEL SEASON RECORD</strong><span>Running total across every graded prediction this season</span></div><span class='scoreboard-season-record-caption'>All weeks</span></div><div class='scoreboard-season-record-stats'><div><strong>${summary.correct}-${summary.incorrect}</strong><span>Record</span></div><div><strong>${summary.accuracy}</strong><span>Accuracy</span></div><div><strong>${summary.graded}</strong><span>Graded</span></div><div><strong>${summary.pending}</strong><span>Pending</span></div></div><p class='scoreboard-season-record-note'>Only completed games with a final score are included. Pending games do not affect the record or accuracy.</p>`;
  }

  async function refresh() {
    try {
      const response = await fetch(`${FEED}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Model record feed failed (${response.status})`);
      const data = await response.json();
      render(summarize(Array.isArray(data?.games) ? data.games : []));
    } catch (error) {
      console.warn('Could not refresh RUS season model record', error);
    }
  }

  addStyles();
  const start = () => {
    if (!document.getElementById('summary')) {
      setTimeout(start, 100);
      return;
    }
    refresh();
    setInterval(refresh, 60000);
  };
  start();
})();
