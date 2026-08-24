(() => {
  "use strict";
  const S = (window.RUSSeasonSim = window.RUSSeasonSim || {});
  let rosterData = null,
    lastContext = null;
  const n = (v) =>
      String(v ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (v) => {
    let h = 2166136261;
    for (const c of String(v)) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const rng = (seed) => {
    let x = seed >>> 0 || 1;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  };
  const rosterPromise = fetch(
    "deseret-rosters-stats-2026.json?v=20260824-simstats1",
    { cache: "no-store" },
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      rosterData = d;
      rebuild();
      return d;
    })
    .catch(() => null);
  function teamEntry(team) {
    const teams = rosterData?.teams || {};
    return (
      teams[team] ||
      Object.entries(teams).find(([k]) => n(k) === n(team))?.[1] ||
      null
    );
  }
  function players(team) {
    return (teamEntry(team)?.roster || [])
      .filter((p) => p?.name)
      .map((p) => ({
        name: p.name,
        number: p.number || "",
        position: String(p.position || "").toUpperCase(),
      }));
  }
  function pick(list, re, fallback = []) {
    const rows = list.filter((p) => re.test(p.position)),
      seen = new Set(),
      out = [];
    for (const p of [...rows, ...fallback, ...list])
      if (!seen.has(p.name)) {
        seen.add(p.name);
        out.push(p);
      }
    return out;
  }
  function shares(total, weights) {
    let used = 0;
    return weights.map((w, i) => {
      const v =
        i === weights.length - 1
          ? total - used
          : Math.max(0, Math.round(total * w));
      used += v;
      return v;
    });
  }
  function add(map, name, vals) {
    if (!name) return;
    const row = map.get(name) || {
      name,
      passC: 0,
      passA: 0,
      passY: 0,
      passTD: 0,
      passInt: 0,
      rushA: 0,
      rushY: 0,
      rushTD: 0,
      rec: 0,
      recY: 0,
      recTD: 0,
      tackles: 0,
      sacks: 0,
      defInt: 0,
    };
    for (const [k, v] of Object.entries(vals)) {
      if (k === "name") continue;
      row[k] = (Number(row[k]) || 0) + (Number(v) || 0);
    }
    map.set(name, row);
  }
  function gameStats(team, sim, seed) {
    const list = players(team),
      r = rng(hash(`${team}|${sim.opponent}|${seed}`)),
      points = Math.max(0, Number(sim.a) || 0),
      allowed = Math.max(0, Number(sim.b) || 0),
      margin = points - allowed;
    const total = clamp(
        Math.round(175 + points * 6.25 + margin * 1.4 + (r() - 0.5) * 70),
        105,
        650,
      ),
      passShare = clamp(0.53 + (r() - 0.5) * 0.16, 0.38, 0.68),
      passY = Math.round(total * passShare),
      rushY = total - passY;
    const qbs = pick(list, /\bQB\b/),
      rushers = pick(list, /\b(RB|HB|FB)\b/, qbs),
      receivers = pick(list, /\b(WR|TE)\b/, rushers),
      defenders = pick(list, /\b(LB|DB|DL|DE|DT|S|CB)\b/);
    const qb = qbs[0],
      attempts = clamp(Math.round(18 + passY / 18 + (r() - 0.5) * 8), 8, 48),
      completions = clamp(
        Math.round(attempts * (0.56 + r() * 0.12)),
        1,
        attempts,
      ),
      offTD = Math.max(0, Math.min(8, Math.round(points / 7))),
      passTD = Math.min(
        offTD,
        Math.max(0, Math.round(offTD * (0.45 + r() * 0.25))),
      ),
      rushTD = Math.max(0, offTD - passTD),
      turnovers = clamp(Math.round(r() * 2.8 + (points < 14 ? 0.6 : 0)), 0, 4),
      passInt = Math.min(turnovers, clamp(Math.round(r() * 2), 0, 3));
    const rushA = clamp(Math.round(21 + rushY / 13 + (r() - 0.5) * 8), 12, 52),
      rushNames = rushers.slice(0, 4),
      rushAtt = shares(
        rushA,
        [0.56, 0.24, 0.13, 0.07].slice(0, rushNames.length),
      ),
      rushYds = shares(
        rushY,
        [0.58, 0.23, 0.12, 0.07].slice(0, rushNames.length),
      ),
      rushTds = shares(
        rushTD,
        [0.62, 0.23, 0.1, 0.05].slice(0, rushNames.length),
      );
    const recNames = receivers.slice(0, 5),
      recs = shares(
        completions,
        [0.34, 0.25, 0.18, 0.14, 0.09].slice(0, recNames.length),
      ),
      recYds = shares(
        passY,
        [0.36, 0.25, 0.18, 0.13, 0.08].slice(0, recNames.length),
      ),
      recTds = shares(
        passTD,
        [0.42, 0.27, 0.16, 0.1, 0.05].slice(0, recNames.length),
      );
    const tackleTotal = clamp(
        Math.round(54 + allowed * 0.55 + (r() - 0.5) * 12),
        42,
        92,
      ),
      defNames = defenders.slice(0, 8),
      tackles = shares(
        tackleTotal,
        [0.18, 0.16, 0.14, 0.13, 0.12, 0.1, 0.09, 0.08].slice(
          0,
          defNames.length,
        ),
      ),
      sackTotal = clamp(Math.round(r() * 4.5 + (allowed < 14 ? 1 : 0)), 0, 6),
      defInts = Math.max(0, turnovers - passInt),
      playerMap = new Map();
    if (qb)
      add(playerMap, qb.name, {
        passC: completions,
        passA: attempts,
        passY,
        passTD,
        passInt,
      });
    rushNames.forEach((p, i) =>
      add(playerMap, p.name, {
        rushA: rushAtt[i],
        rushY: rushYds[i],
        rushTD: rushTds[i],
      }),
    );
    recNames.forEach((p, i) =>
      add(playerMap, p.name, {
        rec: recs[i],
        recY: recYds[i],
        recTD: recTds[i],
      }),
    );
    defNames.forEach((p, i) =>
      add(playerMap, p.name, {
        tackles: tackles[i],
        sacks: i < sackTotal ? 1 : 0,
        defInt: i < defInts ? 1 : 0,
      }),
    );
    const firstDowns = clamp(Math.round(total / 24 + (r() - 0.5) * 3), 5, 32),
      thirdAtt = clamp(Math.round(10 + r() * 7), 7, 19),
      thirdMade = clamp(
        Math.round(thirdAtt * (0.3 + points / 180)),
        1,
        thirdAtt,
      ),
      fourthAtt = clamp(Math.round(r() * 4), 0, 4),
      fourthMade = fourthAtt
        ? clamp(Math.round(fourthAtt * (0.35 + r() * 0.3)), 0, fourthAtt)
        : 0,
      penalties = clamp(Math.round(4 + r() * 6), 2, 11),
      penaltyYards = Math.round(penalties * (6 + r() * 4)),
      poss = clamp(
        Math.round(1500 + (r() - 0.5) * 500 + margin * 4),
        1050,
        2550,
      );
    return {
      team,
      opponent: sim.opponent,
      score: points,
      allowed,
      teamStats: {
        firstDowns,
        totalYards: total,
        passingYards: passY,
        rushingYards: rushY,
        turnovers,
        third: `${thirdMade}/${thirdAtt}`,
        fourth: `${fourthMade}/${fourthAtt}`,
        penalties: `${penalties}-${penaltyYards}`,
        sacks: sackTotal,
        possession: `${Math.floor(poss / 60)}:${String(poss % 60).padStart(2, "0")}`,
      },
      players: [...playerMap.values()],
    };
  }
  function build(team, sims, seed) {
    const games = sims
        .filter(Boolean)
        .map((sim, i) => gameStats(team, sim, seed + i * 97)),
      season = new Map();
    for (const g of games) for (const p of g.players) add(season, p.name, p);
    return { team, games, players: [...season.values()] };
  }
  S.rosterReady = rosterPromise;
  S.buildSimulatedStats = build;
  function rebuild() {
    if (!rosterData || !lastContext) return;
    S.simulatedStats = build(
      lastContext.team,
      lastContext.sims,
      lastContext.seed,
    );
    render();
  }
  const oldRun = S.run;
  S.run = (team, games, map, seed) => {
    const result = oldRun(team, games, map, seed);
    lastContext = { team, sims: result.out.map((x) => x.sim), seed };
    if (rosterData) S.simulatedStats = build(team, lastContext.sims, seed);
    else rosterPromise.then(rebuild);
    return result;
  };
  const oldPlayoff = S.playoffPath;
  S.playoffPath = (team, info, reg, map, seed) => {
    const result = oldPlayoff(team, info, reg, map, seed);
    if (lastContext && n(lastContext.team) === n(team)) {
      lastContext.sims = [
        ...lastContext.sims,
        ...result.games.filter((x) => x.sim).map((x) => x.sim),
      ];
      if (rosterData)
        S.simulatedStats = build(team, lastContext.sims, lastContext.seed);
    }
    return result;
  };
  const table = (title, headers, rows) =>
    rows.length
      ? `<h4>${title}</h4><div class="table-wrap"><table><thead><tr>${headers.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
      : "";
  function render() {
    const root = document.getElementById("seasonOut"),
      d = S.simulatedStats;
    if (!root || !d || document.getElementById("rusSimStats")) return;
    const roster = players(d.team);
    let html =
      '<section id="rusSimStats" class="rus-sim-stats"><h3>Simulated Statistics Only</h3><p class="note">These totals include only games generated in this simulation. They do not include reported 2026 statistics.</p>';
    if (!roster.length)
      html +=
        '<div class="card prob-card"><strong>Player statistics unavailable</strong><p class="note">This team does not currently have a loaded 2026 roster. Simulated team box scores are still shown below.</p></div>';
    const p = d.players;
    html += table(
      "Passing",
      ["Player", "C/ATT", "Yards", "TD", "INT"],
      p
        .filter((x) => x.passA)
        .sort((a, b) => b.passY - a.passY)
        .map(
          (x) =>
            `<tr><td class="left stat-team">${S.h(x.name)}</td><td>${x.passC}/${x.passA}</td><td>${x.passY}</td><td>${x.passTD}</td><td>${x.passInt}</td></tr>`,
        ),
    );
    html += table(
      "Rushing",
      ["Player", "Carries", "Yards", "TD"],
      p
        .filter((x) => x.rushA)
        .sort((a, b) => b.rushY - a.rushY)
        .map(
          (x) =>
            `<tr><td class="left stat-team">${S.h(x.name)}</td><td>${x.rushA}</td><td>${x.rushY}</td><td>${x.rushTD}</td></tr>`,
        ),
    );
    html += table(
      "Receiving",
      ["Player", "Receptions", "Yards", "TD"],
      p
        .filter((x) => x.rec)
        .sort((a, b) => b.recY - a.recY)
        .map(
          (x) =>
            `<tr><td class="left stat-team">${S.h(x.name)}</td><td>${x.rec}</td><td>${x.recY}</td><td>${x.recTD}</td></tr>`,
        ),
    );
    html += table(
      "Defense",
      ["Player", "Tackles", "Sacks", "INT"],
      p
        .filter((x) => x.tackles || x.sacks || x.defInt)
        .sort((a, b) => b.tackles - a.tackles)
        .map(
          (x) =>
            `<tr><td class="left stat-team">${S.h(x.name)}</td><td>${x.tackles}</td><td>${x.sacks}</td><td>${x.defInt}</td></tr>`,
        ),
    );
    html +=
      "<h4>Simulated Game Box Scores</h4>" +
      d.games
        .map(
          (g, i) =>
            `<details class="card prob-card"><summary><strong>${S.h(g.team)} ${g.score}, ${S.h(g.opponent)} ${g.allowed}</strong></summary><div class="table-wrap"><table><thead><tr><th>Stat</th><th>${S.h(g.team)}</th></tr></thead><tbody>${Object.entries(
              g.teamStats,
            )
              .map(
                ([k, v]) =>
                  `<tr><td class="left">${S.h(k.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase()))}</td><td>${v}</td></tr>`,
              )
              .join("")}</tbody></table></div></details>`,
        )
        .join("") +
      "</section>";
    root.insertAdjacentHTML("beforeend", html);
  }
  const observer = new MutationObserver(() => setTimeout(render, 0));
  const watch = () => {
    const root = document.getElementById("seasonOut");
    if (root) observer.observe(root, { childList: true });
    else setTimeout(watch, 100);
  };
  watch();
})();
