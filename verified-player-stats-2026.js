/* Verified 2026 player corrections. Narrowly scoped to an exact school/player identity.
 * Sources: Deseret athlete /alma-barlow/409288, MaxPreps 2026 8-Man total yardage leaderboard.
 * Regular season: 10 games through Oct 14, 2026. Avoid extrapolating unreported games.
 */
(() => {
  'use strict';
  const compact = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const verified = Object.freeze({
    team: 'WATER CANYON',
    name: 'Alma Barlow',
    playerId: 'water-canyon-35-alma-barlow',
    season: 2026,
    rushing: { Yards: '2424', TD: '27', Carries: '187' },
    receiving: { Yards: '118', TD: '1', Receptions: '16' },
    games: 10,
    source: 'https://sports.deseret.com/high-school/football/athlete/alma-barlow/409288'
  });
  function apply(payload) {
    if (!payload || !payload.teams || typeof payload.teams !== 'object') return 0;
    let changed = 0;
    for (const [team, data] of Object.entries(payload.teams)) {
      if (compact(team) !== 'WATERCANYON' || !Array.isArray(data?.stats)) continue;
      for (const section of data.stats) {
        const category = compact(section.category);
        const fields = category === 'RUSHING' ? verified.rushing :
                       category === 'RECEIVING' ? verified.receiving : null;
        if (!fields || !Array.isArray(section.rows)) continue;
        for (const row of section.rows) {
          const exactName = compact(row.name) === 'ALMABARLOW';
          const exactId = compact(row.playerId) === compact(verified.playerId);
          if (!exactName && !exactId) continue;
          if (!row.values || typeof row.values !== 'object') row.values = {};
          // Replace only fields confirmed in the cited source; retain unrelated stats.
          for (const [field, value] of Object.entries(fields)) {
            const existing = Object.keys(row.values).find(k => compact(k) === compact(field));
            const key = existing || field;
            if (String(row.values[key] ?? '') !== value) {row.values[key] = value; changed++;}
            if (Array.isArray(section.headers) && !section.headers.some(h => compact(h) === compact(field)))
              section.headers.push(field);
          }
        }
      }
    }
    return changed;
  }
  window.RUSVerifiedPlayerStats2026 = { verified, apply };
})();
