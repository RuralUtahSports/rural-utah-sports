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
            logit =
              Math.log(base / (1 - base)) +
              ((ea - oa - (eb - ob)) / 400) * Math.LN10;
          chance = clamp(1 / (1 + Math.exp(-logit)));
          p1 = Number(m?.p1) || p1;
          p2 = Number(m?.p2) || p2;
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
      };
    };
    for (const [classification, rows] of R.rpi.entries()) {
      const cap =
        Number(R.season) === 2025
          ? fields[classification] || rows.length
          : Number(R.season) >= 2026
            ? 16
            : 24;
      rows.forEach((r) => {
        r.playoff = false;
        r.playoffSeed = null;
      });
      const field = rows
        .filter((r) => r.eligible)
        .slice(0, cap)
        .map((r, i) => {
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
    return R;
  };
  const base = F.simulate;
  if (typeof base === "function" && !base.__rusPlayoffs) {
    const wrapped = async (seed) => F.simulatePlayoffs(await base(seed), seed);
    wrapped.__rusPlayoffs = true;
    F.simulate = wrapped;
  }
})();
