(() => {
  const F = (window.RUSFullSeason = window.RUSFullSeason || {}),
    order = {
      "6A": 0,
      "5A": 1,
      "4A": 2,
      "3A": 3,
      "2A": 4,
      "1A": 5,
      "8P": 6,
      OPEN: 7,
      ALLTEAM: 8,
    },
    h = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
  if (!document.getElementById("fullSeasonPlayoffStyle")) {
    const s = document.createElement("style");
    s.id = "fullSeasonPlayoffStyle";
    s.textContent =
      ".fsp{margin:26px 0;background:#000;border:1px solid #333;border-top:4px solid #F14D07;border-radius:8px;padding:18px}.fsp-head{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;margin-bottom:14px}.fsp-title{font-size:21px;font-weight:900;text-transform:uppercase}.fsp-sub,.fsp-note{color:#888;font-size:12px;line-height:1.45;margin-top:5px}.fsp-tabs{display:flex;gap:7px;flex-wrap:wrap}.fsp-tab{border:1px solid #444;background:#171717;color:#fff;border-radius:5px;padding:8px 11px;font-size:11px;font-weight:900;cursor:pointer}.fsp-tab.active{background:#F14D07;border-color:#F14D07;color:#000}.fsp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding:5px 2px 12px}.fsp-large .fsp-scroll{max-height:75vh;overflow:auto;border:1px solid #292929;border-radius:6px;padding:8px}.fsp-rounds{display:flex;gap:24px;align-items:stretch;min-width:max-content}.fsp-round{width:230px;display:flex;flex-direction:column}.fsp-round-title{text-align:center;color:#F14D07;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;margin-bottom:7px}.fsp-games{display:flex;flex-direction:column;justify-content:space-around;gap:8px;min-height:var(--bracket-height)}.fsp-game{background:#151515;border:1px solid #3a3a3a;border-radius:6px;overflow:hidden}.fsp-team{height:31px;display:grid;grid-template-columns:28px 1fr auto;gap:6px;align-items:center;padding:0 9px;border-bottom:1px solid #303030;font-size:11px;font-weight:800}.fsp-team:last-child{border-bottom:0}.fsp-team.win{background:#222}.fsp-team.bye{color:#666;font-style:italic}.fsp-seed{color:#777;font-size:9px;font-weight:900}.fsp-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fsp-score{font-size:13px;font-weight:900}.fsp-champ{margin-top:15px;border:2px solid #F14D07;background:#151515;border-radius:8px;padding:14px;text-align:center}.fsp-champ small{display:block;color:#F14D07;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px}.fsp-champ strong{display:block;font-size:20px;margin-top:5px}.fsp-champ span{display:block;color:#999;font-size:11px;margin-top:4px}@media(max-width:650px){.fsp{padding:14px 10px}.fsp-round{width:205px}.fsp-title{font-size:18px}}";
    document.head.append(s);
  }
  const row = (g, t, side) => {
    if (!t)
      return `<div class="fsp-team bye"><span class="fsp-seed">—</span><span class="fsp-name">BYE</span><span class="fsp-score">—</span></div>`;
    const win = g.winner?.team === t.team,
      score = g.bye ? "—" : side === "a" ? g.scoreA : g.scoreB;
    return `<div class="fsp-team ${win ? "win" : ""}"><span class="fsp-seed">#${t.seed}</span><span class="fsp-name">${h(t.team)}</span><span class="fsp-score">${h(score)}</span></div>`;
  };
  const game = (g) =>
    `<div class="fsp-game">${row(g, g.a, "a")}${row(g, g.b, "b")}</div>`;
  const className = (c) =>
    c === "8P"
      ? "8-Player"
      : c === "OPEN"
        ? "Open Class"
        : c === "ALLTEAM"
          ? "All-Team"
          : c;
  function draw(root, p) {
    const first = Math.max(1, p.rounds[0]?.games?.length || 1),
      height = Math.max(250, first * 76);
    root.style.setProperty("--bracket-height", height + "px");
    root.classList.toggle("fsp-large", p.bracketSize > 32);
    const exhibition = p.exhibition
      ? "Hypothetical exhibition • does not affect RPI, official titles, or season statistics. "
      : "";
    root.innerHTML = `<div class="fsp-scroll"><div class="fsp-rounds">${p.rounds.map((r) => `<div class="fsp-round"><div class="fsp-round-title">${h(r.label)}</div><div class="fsp-games">${r.games.map(game).join("")}</div></div>`).join("")}</div></div><div class="fsp-champ"><small>Simulated ${h(className(p.classification))} Champion</small><strong>${h(p.champion?.team || "—")}</strong><span>${p.finalGame && !p.finalGame.bye ? `Final: ${h(p.finalGame.a?.team)} ${h(p.finalGame.scoreA)}, ${h(p.finalGame.b?.team)} ${h(p.finalGame.scoreB)}` : "Championship complete"}</span></div><div class="fsp-note">${exhibition}${p.fieldSize}-team field • fixed seed bracket • no reseeding. BYE slots follow the simulated field size.</div>`;
  }
  F.renderPlayoffs = (R, host, filter = "ALL") => {
    if (!R?.playoffs?.size || !host) return;
    const entries = [...R.playoffs.entries()]
      .filter(([c]) => filter === "ALL" || c === filter)
      .sort((a, b) => (order[a[0]] ?? 99) - (order[b[0]] ?? 99));
    if (!entries.length) return;
    const box = document.createElement("section");
    box.className = "fsp";
    const head = document.createElement("div");
    head.className = "fsp-head";
    const intro = document.createElement("div");
    intro.innerHTML =
      '<div class="fsp-title">2026 Playoff Brackets</div><div class="fsp-sub">Seven classification playoffs, a 28-team Open Class field of semifinalists, and a just-for-fun all-eligible-team championship.</div>';
    const tabs = document.createElement("div");
    tabs.className = "fsp-tabs";
    const body = document.createElement("div");
    entries.forEach(([c, p], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fsp-tab" + (i === 0 ? " active" : "");
      b.textContent = `${className(c)} Bracket`;
      b.onclick = () => {
        tabs
          .querySelectorAll(".fsp-tab")
          .forEach((x) => x.classList.toggle("active", x === b));
        draw(body, p);
      };
      tabs.append(b);
    });
    head.append(intro, tabs);
    box.append(head, body);
    draw(body, entries[0][1]);
    const regionTitle = [...host.querySelectorAll(".section-title")].find((x) =>
      /Region Standings/i.test(x.textContent || ""),
    );
    if (regionTitle) host.insertBefore(box, regionTitle);
    else host.append(box);
  };
  const base = F.render;
  if (typeof base === "function" && !base.__rusPlayoffView) {
    const wrapped = async (R, host, filter = "ALL") => {
      await base(R, host, filter);
      F.renderPlayoffs(R, host, filter);
    };
    wrapped.__rusPlayoffView = true;
    F.render = wrapped;
  }
})();
