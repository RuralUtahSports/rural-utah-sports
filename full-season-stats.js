(() => {
  "use strict";
  const F = (window.RUSFullSeason = window.RUSFullSeason || {}),
    S = window.RUSSeasonSim;
  if (!S?.buildSimulatedStats) return;
  const norm = (v) =>
      F.norm?.(v) ||
      String(v || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""),
    h = (v) => F.h?.(v) || String(v ?? "");
  const hash = (v) => {
    let x = 0;
    for (const c of String(v)) x = (Math.imul(x, 31) + c.charCodeAt(0)) | 0;
    return Math.abs(x);
  };
  function collect(R, team) {
    const key = norm(team),
      sims = [];
    for (const g of R.simGames || []) {
      if (norm(g.a) === key)
        sims.push({ opponent: g.b, a: g.scoreA, b: g.scoreB });
      else if (norm(g.b) === key)
        sims.push({ opponent: g.a, a: g.scoreB, b: g.scoreA });
    }
    for (const p of (R.playoffs || new Map()).values())
      for (const round of p.rounds || [])
        for (const g of round.games || []) {
          if (g.bye || !g.a || !g.b) continue;
          if (norm(g.a.team) === key)
            sims.push({ opponent: g.b.team, a: g.scoreA, b: g.scoreB });
          else if (norm(g.b.team) === key)
            sims.push({ opponent: g.a.team, a: g.scoreB, b: g.scoreA });
        }
    return sims;
  }
  const baseSim = F.simulate;
  F.simulate = async (seed) => {
    const R = await baseSim(seed);
    await (S.rosterReady || Promise.resolve());
    const all = new Map();
    for (const row of R.stats.values()) {
      const sims = collect(R, row.team);
      all.set(
        row.team,
        S.buildSimulatedStats(row.team, sims, Number(seed) + hash(row.team)),
      );
    }
    R.simulatedStats = all;
    return R;
  };
  const row = (p, team, metric) => ({
    team,
    name: p.name,
    value: Number(p[metric]) || 0,
    p,
  });
  function leaders(R, metric, classification = "ALL") {
    const out = [];
    for (const [team, d] of R.simulatedStats || []) {
      const teamClass = R.stats.get(team)?.classification || "";
      if (classification !== "ALL" && teamClass !== classification) continue;
      for (const p of d.players || []) {
        const x = row(p, team, metric);
        if (x.value) out.push(x);
      }
    }
    return out.sort(
      (a, b) => b.value - a.value || a.name.localeCompare(b.name),
    );
  }
  function table(title, headers, rows) {
    return rows.length
      ? `<h4>${h(title)}</h4><div class="table-wrap"><table><thead><tr>${headers.map((x) => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
      : `<p class="note">No ${h(title.toLowerCase())} were generated for this roster.</p>`;
  }
  function playerTables(d) {
    const p = d?.players || [];
    return (
      table(
        "Passing",
        ["Player", "C/ATT", "Yards", "TD", "INT"],
        p
          .filter((x) => x.passA)
          .sort((a, b) => b.passY - a.passY)
          .map(
            (x) =>
              `<tr><td class="left stat-team">${h(x.name)}</td><td>${x.passC}/${x.passA}</td><td>${x.passY}</td><td>${x.passTD}</td><td>${x.passInt}</td></tr>`,
          ),
      ) +
      table(
        "Rushing",
        ["Player", "Carries", "Yards", "TD"],
        p
          .filter((x) => x.rushA)
          .sort((a, b) => b.rushY - a.rushY)
          .map(
            (x) =>
              `<tr><td class="left stat-team">${h(x.name)}</td><td>${x.rushA}</td><td>${x.rushY}</td><td>${x.rushTD}</td></tr>`,
          ),
      ) +
      table(
        "Receiving",
        ["Player", "Receptions", "Yards", "TD"],
        p
          .filter((x) => x.rec)
          .sort((a, b) => b.recY - a.recY)
          .map(
            (x) =>
              `<tr><td class="left stat-team">${h(x.name)}</td><td>${x.rec}</td><td>${x.recY}</td><td>${x.recTD}</td></tr>`,
          ),
      ) +
      table(
        "Defense",
        ["Player", "Tackles", "Sacks", "INT"],
        p
          .filter((x) => x.tackles || x.sacks || x.defInt)
          .sort((a, b) => b.tackles - a.tackles)
          .map(
            (x) =>
              `<tr><td class="left stat-team">${h(x.name)}</td><td>${x.tackles}</td><td>${x.sacks}</td><td>${x.defInt}</td></tr>`,
          ),
      )
    );
  }
  function renderStats(R, host) {
    if (!R.simulatedStats?.size || host.querySelector("#rusFullSeasonStats"))
      return;
    const section = document.createElement("section");
    section.id = "rusFullSeasonStats";
    section.className = "fs-collapse";
    section.innerHTML =
      '<summary>All-Team Simulated Statistics</summary><div class="fs-collapse-body"></div>';
    const body = section.querySelector(".fs-collapse-body"),
      teams = [...R.simulatedStats.keys()].sort(),
      classes = ["ALL", "6A", "5A", "4A", "3A", "2A", "1A", "8P"],
      top = (title, metric, label, classification) =>
        table(
          title,
          ["#", "Player", "Team", label],
          leaders(R, metric, classification)
            .slice(0, 25)
            .map(
              (x, i) =>
                `<tr><td>${i + 1}</td><td class="left stat-team">${h(x.name)}</td><td class="left">${h(x.team)}</td><td><strong>${x.value}</strong></td></tr>`,
            ),
        );
    body.innerHTML = `<p class="note">Simulated totals only. Reported 2026 statistics are not included. Regular-season and simulated playoff games are included.</p><div class="weekly-controls"><div class="field"><label>Team Statistics</label><select id="rusFullStatTeam">${teams.map((t) => `<option>${h(t)}</option>`).join("")}</select></div></div><div id="rusFullStatTeamOut"></div><h3 class="section-title">Simulated Stat Leaders</h3><div class="weekly-controls"><div class="field"><label>Classification</label><select id="rusFullStatClass">${classes.map((c) => `<option value="${c}">${c === "ALL" ? "All Classifications" : c === "8P" ? "8-Player" : c}</option>`).join("")}</select></div></div><div id="rusFullStatLeaders"></div>`;
    host.append(section);
    const select = body.querySelector("#rusFullStatTeam"),
      out = body.querySelector("#rusFullStatTeamOut"),
      classSelect = body.querySelector("#rusFullStatClass"),
      leaderOut = body.querySelector("#rusFullStatLeaders"),
      draw = () => {
        const d = R.simulatedStats.get(select.value);
        out.innerHTML = `<h3>${h(select.value)} Simulated Season</h3>${d?.players?.length ? playerTables(d) : '<p class="note">No 2026 roster is loaded for this team, so only its simulated game results and team totals are available.</p>'}`;
      },
      drawLeaders = () => {
        const classification = classSelect.value,
          label =
            classification === "ALL"
              ? "Statewide"
              : classification === "8P"
                ? "8-Player"
                : classification;
        leaderOut.innerHTML = `<h3>${h(label)} Leaders</h3>${top("Passing Yards", "passY", "Yards", classification)}${top("Passing Touchdowns", "passTD", "TD", classification)}${top("Rushing Yards", "rushY", "Yards", classification)}${top("Rushing Touchdowns", "rushTD", "TD", classification)}${top("Receiving Yards", "recY", "Yards", classification)}${top("Receiving Touchdowns", "recTD", "TD", classification)}${top("Tackles", "tackles", "Tackles", classification)}${top("Sacks", "sacks", "Sacks", classification)}${top("Defensive Interceptions", "defInt", "INT", classification)}`;
      };
    select.onchange = draw;
    classSelect.onchange = drawLeaders;
    draw();
    drawLeaders();
  }
  const baseRender = F.render;
  F.render = async (R, host, filter = "ALL") => {
    await baseRender(R, host, filter);
    renderStats(R, host);
  };
})();
