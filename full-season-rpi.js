(() => {
  const F = (window.RUSFullSeason = window.RUSFullSeason || {}),
    avg = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0),
    key = (v) => F.norm(v),
    FIELD_2025 = {
      "6A": 17,
      "5A": 24,
      "4A": 24,
      "3A": 13,
      "2A": 10,
      "1A": 9,
      "8P": 11,
    },
    POSTSEASON_INELIGIBLE_2026 = new Set([
      "LAYTONCHRISTIAN",
      "GRAND",
    ]);
  F.playoffFieldSize = (season, c) =>
    Number(season) === 2025
      ? FIELD_2025[String(c || "").toUpperCase()] || 0
      : Number(season) >= 2026
        ? 16
        : 24;
  F.addRpi = (R) => {
    const games = R.simGames || [],
      byTeam = new Map(),
      meta = R.meta || new Map();
    for (const g of games) {
      if (g.aIn) {
        if (!byTeam.has(key(g.a))) byTeam.set(key(g.a), []);
        byTeam.get(key(g.a)).push({ opp: g.b, won: g.aWon, oppIn: g.bIn });
      }
      if (g.bIn) {
        if (!byTeam.has(key(g.b))) byTeam.set(key(g.b), []);
        byTeam.get(key(g.b)).push({ opp: g.a, won: !g.aWon, oppIn: g.aIn });
      }
    }
    const wp = (team, exclude = "") => {
        const rows = (byTeam.get(key(team)) || []).filter(
          (g) => !exclude || key(g.opp) !== key(exclude),
        );
        return rows.length ? rows.filter((g) => g.won).length / rows.length : 0;
      },
      owp = (team) => {
        const rows = byTeam.get(key(team)) || [];
        return avg(rows.map((g) => (g.oppIn ? wp(g.opp, team) : 0.5)));
      },
      oowp = (team) => {
        const rows = byTeam.get(key(team)) || [];
        return avg(rows.map((g) => (g.oppIn ? owp(g.opp) : 0.5)));
      },
      rows = [];
    for (const s of R.stats.values()) {
      const gp = s.w + s.l,
        m = meta.get(key(s.team));
      if (!m) continue;
      const M = wp(s.team),
        O = owp(s.team),
        OO = oowp(s.team);
      rows.push({
        team: s.team,
        classification: s.classification,
        region: s.region,
        gp,
        w: s.w,
        l: s.l,
        mwp: M,
        owp: O,
        oowp: OO,
        rpi: 0.45 * M + 0.45 * O + 0.1 * OO,
        eligible:
          gp >= 6 &&
          !(
            Number(R.season) === 2026 &&
            POSTSEASON_INELIGIBLE_2026.has(key(s.team))
          ),
        ineligibleReason:
          Number(R.season) === 2026 &&
          POSTSEASON_INELIGIBLE_2026.has(key(s.team))
            ? "Postseason ineligible"
            : gp < 6
              ? "Fewer than 6 games"
              : "",
        hasOos: (byTeam.get(key(s.team)) || []).some((g) => !g.oppIn),
      });
    }
    const classes = new Map(),
      caps = new Map();
    for (const r of rows) {
      if (!classes.has(r.classification)) classes.set(r.classification, []);
      classes.get(r.classification).push(r);
    }
    for (const [classification, list] of classes) {
      const cap = F.playoffFieldSize(R.season, classification) || 24;
      caps.set(classification, cap);
      list.sort(
        (a, b) =>
          b.rpi - a.rpi || b.mwp - a.mwp || a.team.localeCompare(b.team),
      );
      let prev = null,
        rank = 0,
        eligibleSeed = 0;
      list.forEach((r, i) => {
        if (prev == null || Math.abs(r.rpi - prev) > 1e-12) rank = i + 1;
        r.rank = rank;
        r.seed = i + 1;
        r.playoffSeed = r.eligible ? ++eligibleSeed : null;
        r.playoff = r.eligible && r.playoffSeed <= cap;
        prev = r.rpi;
      });
    }
    R.rpi = classes;
    R.playoffCaps = caps;
    R.playoffCap = Number(R.season) >= 2026 ? 16 : 24;
    R.rpiNote = `UHSAA football RPI: 45% MWP + 45% OWP + 10% OOWP. ${R.season} playoff field sizes follow that season's classification brackets. Utah opponents are recalculated from the simulated season with head-to-head removed. Out-of-state opponent records are not yet imported, so those RPI components currently use a neutral .500 placeholder.`;
    return R;
  };
})();
