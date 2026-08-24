(() => {
  "use strict";
  const F = (window.RUSFullSeason = window.RUSFullSeason || {}),
    CLASS_ORDER = ["ALL", "6A", "5A", "4A", "3A", "2A", "1A", "8P"],
    h = (v) => F.h?.(v) || String(v ?? "");
  const id = (x) => `${x.team}|${x.name}`;
  const num = (v) => Number(v) || 0;
  function pill(team) {
    const info = F.info?.(team) || {},
      bg = /^#[0-9a-f]{6}$/i.test(info.backgroundColor || "")
        ? info.backgroundColor
        : "#333333",
      fg = /^#[0-9a-f]{6}$/i.test(info.textColor || "")
        ? info.textColor
        : "#ffffff";
    return `<span style="display:inline-block;background:${bg};color:${fg};padding:4px 7px;border-radius:5px;font-weight:900">${h(team)}</span>`;
  }
  function candidates(R, classification = "ALL") {
    const out = [];
    for (const [team, data] of R.simulatedStats || []) {
      const cls = R.stats.get(team)?.classification || "";
      if (classification !== "ALL" && cls !== classification) continue;
      for (const p of data.players || []) {
        const offense =
            num(p.passY) / 25 +
            num(p.passTD) * 4 -
            num(p.passInt) * 2 +
            num(p.rushY) / 10 +
            num(p.rushTD) * 6 +
            num(p.recY) / 10 +
            num(p.recTD) * 6,
          defense = num(p.tackles) + num(p.sacks) * 8 + num(p.defInt) * 10,
          role = num(p.passA)
            ? "QB"
            : num(p.rushA) >= 35
              ? "RB"
              : num(p.rec) >= 10
                ? "REC"
                : defense
                  ? "DEF"
                  : "FLEX";
        out.push({ ...p, team, classification: cls, offense, defense, role });
      }
    }
    return out;
  }
  function chooseAwards(rows) {
    const used = new Set(),
      best = (score, eligible = () => true) =>
        [...rows]
          .filter((x) => !used.has(id(x)) && eligible(x))
          .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0] ||
        null;
    const mvp = best((x) => x.offense + x.defense * 1.15);
    if (mvp) used.add(id(mvp));
    const opoy = best((x) => x.offense, (x) => x.offense > 0);
    if (opoy) used.add(id(opoy));
    const dpoy = best((x) => x.defense, (x) => x.defense > 0);
    return { mvp, opoy, dpoy };
  }
  function buildTeam(rows, excluded, already = new Set()) {
    const selected = [],
      take = (role, count, score) => {
        const pool = rows
          .filter(
            (x) =>
              !excluded.has(id(x)) &&
              !already.has(id(x)) &&
              !selected.some((y) => id(y) === id(x)) &&
              (role === "FLEX" || x.role === role),
          )
          .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
        selected.push(...pool.slice(0, count).map((x) => ({ ...x, slot: role })));
      };
    take("QB", 1, (x) => x.offense);
    take("RB", 2, (x) => x.offense);
    take("REC", 3, (x) => x.offense);
    take("FLEX", 2, (x) => x.offense);
    take("DEF", 4, (x) => x.defense);
    selected.forEach((x) => already.add(id(x)));
    return selected;
  }
  function buildAwards(R) {
    const scopes = new Map(),
      excluded = new Set();
    for (const cls of CLASS_ORDER) {
      const rows = candidates(R, cls), awards = chooseAwards(rows);
      scopes.set(cls, { rows, awards });
      Object.values(awards).filter(Boolean).forEach((x) => excluded.add(id(x)));
    }
    for (const scope of scopes.values()) {
      const used = new Set();
      scope.first = buildTeam(scope.rows, excluded, used);
      scope.second = buildTeam(scope.rows, excluded, used);
    }
    R.simulatedAwards = scopes;
    return scopes;
  }
  function awardCard(title, p) {
    if (!p) return "";
    const line =
      title === "Defensive Player of the Year"
        ? `${p.tackles} tackles • ${p.sacks} sacks • ${p.defInt} INT`
        : `${p.passY} pass yds • ${p.rushY} rush yds • ${p.recY} rec yds • ${p.passTD + p.rushTD + p.recTD} total TD`;
    return `<article class="card" style="padding:14px"><small style="color:#F14D07;font-weight:900;text-transform:uppercase">${h(title)}</small><h3 style="margin:6px 0">${h(p.name)}</h3>${pill(p.team)}<p class="note" style="margin-top:8px">${h(line)}</p></article>`;
  }
  function teamTable(title, rows) {
    return `<h3 class="section-title">${h(title)}</h3><div class="table-wrap"><table><thead><tr><th>Role</th><th class="left">Player</th><th class="left">Team</th><th>Key Simulated Stats</th></tr></thead><tbody>${rows
      .map(
        (p) =>
          `<tr><td>${h(p.slot)}</td><td class="left stat-team">${h(p.name)}</td><td class="left">${pill(p.team)}</td><td>${p.slot === "DEF" ? `${p.tackles} TKL • ${p.sacks} SCK • ${p.defInt} INT` : `${p.passY} PY • ${p.rushY} RY • ${p.recY} REC YD • ${p.passTD + p.rushTD + p.recTD} TD`}</td></tr>`,
      )
      .join("")}</tbody></table></div>`;
  }
  function renderAwards(R, host) {
    if (!R.simulatedStats?.size || host.querySelector("#rusFullSeasonAwards")) return;
    const scopes = buildAwards(R),
      section = document.createElement("details");
    section.id = "rusFullSeasonAwards";
    section.className = "fs-collapse";
    section.innerHTML = `<summary>Simulated Awards & All-State Teams</summary><div class="fs-collapse-body"><p class="note">Simulation only. MVP, OPOY and DPOY winners are excluded from every first- and second-team lineup.</p><div class="weekly-controls"><div class="field"><label>Awards Scope</label><select id="rusAwardClass">${CLASS_ORDER.map((c) => `<option value="${c}">${c === "ALL" ? "All-Utah" : c === "8P" ? "8-Player" : c}</option>`).join("")}</select></div></div><div id="rusAwardOut"></div></div>`;
    host.append(section);
    const select = section.querySelector("#rusAwardClass"),
      out = section.querySelector("#rusAwardOut"),
      draw = () => {
        const cls = select.value,
          s = scopes.get(cls),
          label = cls === "ALL" ? "All-Utah" : cls === "8P" ? "8-Player" : cls;
        out.innerHTML = `<h2>${h(label)} Simulated Awards</h2><div class="grid three">${awardCard("Most Valuable Player", s.awards.mvp)}${awardCard("Offensive Player of the Year", s.awards.opoy)}${awardCard("Defensive Player of the Year", s.awards.dpoy)}</div>${teamTable(`${label} First Team`, s.first)}${teamTable(`${label} Second Team`, s.second)}`;
      };
    select.onchange = draw;
    draw();
  }
  const baseRender = F.render;
  F.render = async (R, host, filter = "ALL") => {
    await baseRender(R, host, filter);
    renderAwards(R, host);
  };
})();
