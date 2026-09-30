(() => {
  const F = (window.RUSFullSeason = window.RUSFullSeason || {}),
    S = window.RUSSeasonSim;
  const fields = {
      "6A": 17,
      "5A": 24,
      "4A": 24,
      "3A": 13,
      "2A": 10,
      "1A": 9,
      "8P": 11,
    },
    clamp = (n) => Math.max(0.03, Math.min(0.97, n));
  const bsize = (n) => {
    let s = 2;
    while (s < n) s *= 2;
    return s;
  };
  const order = (size) => {
    let a = [1, 2];
    while (a.length < size) {
      const sum = a.length * 2 + 1;
      a = a.flatMap((s) => [s, sum - s]);
    }
    return a;
  };
  const labels = (size) => {
    const names = [];
    for (let teams = size; teams > 1; teams /= 2) {
      names.push(
        teams === 2
          ? "Championship"
          : teams === 4
            ? "Semifinals"
            : teams === 8
              ? "Quarterfinals"
              : `Round of ${teams}`,
      );
    }
    return names;
  };
  const eloChange = (ea, eb, won, sa, sb) => {
    const ex = 1 / (1 + Math.pow(10, (eb - ea) / 400)),
      margin = Math.max(1, Math.min(40, Math.abs(sa - sb))),
      r = Math.log(margin) / Math.log(40),
      mult = Math.min(1.35, 1 + 0.35 * Math.pow(r, 1.5)),
      raw = 32 * mult * ((won ? 1 : 0) - ex);
    return Math.sign(raw) * Math.round(Math.abs(raw));
  };
  F.simulatePlayoffs = (R, seed = 1) => {
    if (!R?.rpi || !S?.score) return R;
    const out = new Map();
    let serial = 0;
    const simulateBracket = (classification, source, exhibition = false) => {
      const field = source.map((r, i) => ({
        team: r.team,
        seed: i + 1,
        classification: r.classification || classification,
      }));
      if (field.length < 2) return null;
      const elos = new Map(
        field.map((t) => [
          t.team,
          Number(R.stats.get(t.team)?.elo) || F.initialElo(t.team),
        ]),
      );
      const play = (a, b) => {
        serial++;
        if (!a || !b)
          return {
            a: a || null,
            b: b || null,
            bye: true,
            winner: a || b || null,
          };
        const ea = Number(elos.get(a.team)) || F.initialElo(a.team),
          eb = Number(elos.get(b.team)) || F.initialElo(b.team),
          ia = F.info(a.team),
          ib = F.info(b.team);
        let chance = 1 / (1 + Math.pow(10, (eb - ea) / 400)),
          p1 = Number(ia?.avgPF) || 24,
          p2 = Number(ib?.avgPF) || 21;
        if (ia && ib && typeof window.calculate === "function") {
          const m = calculate(F.resolve(a.team), F.resolve(b.team)),
            base = clamp((Number(m?.prob1) || 50) / 100),
            oa = F.initialElo(a.team),
            ob = F.initialElo(b.team),
            siteMode = String(F.data?.playoffSettings?.[classification]?.siteMode || "higher"),
            higherA = Number(a.seed) < Number(b.seed),
            homeLogit = siteMode === "neutral" ? 0 : (higherA ? 35 : -35) / 400 * Math.LN10,
            logit =
              Math.log(base / (1 - base)) +
              ((ea - oa - (eb - ob)) / 400) * Math.LN10 +
              homeLogit;
          chance = clamp(1 / (1 + Math.exp(-logit)));
          p1 = Number(m?.p1) || p1;
          p2 = Number(m?.p2) || p2;
          if (siteMode !== "neutral") {
            if (higherA) p1 += 1.5;
            else p2 += 1.5;
          }
        }
        const sim = S.score(
            { prob: chance, p1, p2, oe: eb },
            Number(seed) + 100000 + serial * 29,
          ),
          chg = eloChange(ea, eb, sim.won, sim.a, sim.b);
        elos.set(a.team, ea + chg);
        elos.set(b.team, eb - chg);
        return {
          a,
          b,
          bye: false,
          scoreA: sim.a,
          scoreB: sim.b,
          probA: chance,
          winner: sim.won ? a : b,
          loser: sim.won ? b : a,
          eloAfterA: ea + chg,
          eloAfterB: eb - chg,
        };
      };
      const size = bsize(field.length),
        roundNames = labels(size),
        slots = order(size).map((s) =>
          s <= field.length ? field[s - 1] : null,
        ),
        rounds = [];
      let alive = slots;
      for (let ri = 0; alive.length > 1; ri++) {
        const games = [],
          next = [];
        for (let i = 0; i < alive.length; i += 2) {
          const g = play(alive[i], alive[i + 1]);
          games.push(g);
          next.push(g.winner);
        }
        rounds.push({ label: roundNames[ri] || `Round ${ri + 1}`, games });
        alive = next;
      }
      return {
        classification,
        fieldSize: field.length,
        bracketSize: size,
        field,
        rounds,
        champion: alive[0] || null,
        finalGame: rounds.at(-1)?.games?.[0] || null,
        exhibition,
        settings: F.data?.playoffSettings?.[classification] || null,
      };
    };
    for (const [classification, rows] of R.rpi.entries()) {
      const settings = F.data?.playoffSettings?.[classification] || {};
      const configured = Number(settings.fieldSize);
      const cap = Number.isFinite(configured) && configured >= 2
        ? Math.max(2, Math.min(64, Math.round(configured)))
        : Number(R.season) === 2025
          ? fields[classification] || rows.length
          : Number(R.season) >= 2026
            ? 16
            : 24;
      rows.forEach((r) => {
        r.playoff = false;
        r.playoffSeed = null;
      });
      const eligible = rows.filter((r) => r.eligible);
      const method = String(settings.seeding || "rpi").toLowerCase();
      const seedSort = (a, b) => {
        if (method === "elo")
          return (Number(R.stats.get(b.team)?.elo) || 0) - (Number(R.stats.get(a.team)?.elo) || 0) || a.team.localeCompare(b.team);
        if (method === "record") {
          const sa = R.stats.get(a.team), sb = R.stats.get(b.team),
            ag = (sa?.w || 0) + (sa?.l || 0), bg = (sb?.w || 0) + (sb?.l || 0),
            ap = ag ? (sa?.w || 0) / ag : 0, bp = bg ? (sb?.w || 0) / bg : 0;
          return bp - ap || (Number(sb?.elo) || 0) - (Number(sa?.elo) || 0) || a.team.localeCompare(b.team);
        }
        return (Number(a.rank) || 999) - (Number(b.rank) || 999) || a.team.localeCompare(b.team);
      };
      let pool = [...eligible].sort(seedSort);
      if (settings.regionChampions) {
        const champs = new Map();
        for (const r of eligible) {
          const s = R.stats.get(r.team), region = String(s?.region || r.region || "Independent");
          if (!region || /^independent$/i.test(region)) continue;
          const gp = (s?.rw || 0) + (s?.rl || 0), pct = gp ? (s?.rw || 0) / gp : -1;
          const cur = champs.get(region);
          if (!cur || pct > cur.pct || (Math.abs(pct - cur.pct) < 1e-12 && seedSort(r, cur.row) < 0))
            champs.set(region, { row: r, pct });
        }
        const auto = [...champs.values()].map((x) => x.row).sort(seedSort);
        const autoKeys = new Set(auto.map((x) => x.team));
        pool = [...auto, ...pool.filter((x) => !autoKeys.has(x.team))];
      }
      const field = pool.slice(0, cap).sort(seedSort).map((r, i) => {
        r.playoff = true;
        r.playoffSeed = i + 1;
        return r;
      });
      const bracket = simulateBracket(classification, field);
      if (bracket) out.set(classification, bracket);
    }
    const semifinalists = [];
    for (const p of out.values()) {
      const semifinal = p.rounds.find((r) => r.label === "Semifinals");
      for (const g of semifinal?.games || [])
        for (const t of [g.a, g.b])
          if (t && !semifinalists.some((x) => x.team === t.team))
            semifinalists.push(t);
    }
    const rank = (a, b) =>
      (Number(R.stats.get(b.team)?.elo) || 0) -
        (Number(R.stats.get(a.team)?.elo) || 0) || a.team.localeCompare(b.team);
    const open = simulateBracket("OPEN", semifinalists.sort(rank), true);
    if (open) out.set("OPEN", open);
    const everyEligible = [...R.rpi.values()]
      .flat()
      .filter((r) => r.eligible)
      .sort(rank);
    const allTeam = simulateBracket("ALLTEAM", everyEligible, true);
    if (allTeam) out.set("ALLTEAM", allTeam);
    R.playoffs = out;
    // Playoff games count toward each team's overall season record, scoring
    // totals and carried form, but do not change the already-calculated RPI
    // or region record.
    for (const bracket of out.values()) {
      if (bracket?.exhibition) continue;
      for (const round of bracket.rounds || []) {
        for (const g of round.games || []) {
          if (g?.bye || !g?.a?.team || !g?.b?.team) continue;
          const a = R.stats.get(g.a.team), b = R.stats.get(g.b.team);
          if (!a || !b) continue;
          const aWon = g.winner?.team === g.a.team;
          a[aWon ? "w" : "l"]++;
          b[aWon ? "l" : "w"]++;
          a.pf += Number(g.scoreA) || 0;
          a.pa += Number(g.scoreB) || 0;
          b.pf += Number(g.scoreB) || 0;
          b.pa += Number(g.scoreA) || 0;
          if (R.results?.get(g.a.team))
            R.results.get(g.a.team).push({
              date: `Playoffs • ${round.label}`,
              opponent: g.b.team,
              score: `${g.scoreA}-${g.scoreB}`,
              won: aWon,
              region: false,
              postseason: true,
              round: round.label,
              prob: Number(g.probA) || 0.5,
            });
          if (R.results?.get(g.b.team))
            R.results.get(g.b.team).push({
              date: `Playoffs • ${round.label}`,
              opponent: g.a.team,
              score: `${g.scoreB}-${g.scoreA}`,
              won: !aWon,
              region: false,
              postseason: true,
              round: round.label,
              prob: 1 - (Number(g.probA) || 0.5),
            });
        }
      }
    }
    return R;
  };
  const base = F.simulate;
  if (typeof base === "function" && !base.__rusPlayoffs) {
    const wrapped = async (seed) => F.simulatePlayoffs(await base(seed), seed);
    wrapped.__rusPlayoffs = true;
    F.simulate = wrapped;
  }
})();
