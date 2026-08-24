(() => {
  if (window.__RUSFullSeasonActionsLoaded) return;
  window.__RUSFullSeasonActionsLoaded = true;
  let pendingSeed = null;
  const early = (e) => {
    const run = e.target?.closest?.("#fullSeasonRun");
    if (!run) return;
    const F = window.RUSFullSeason;
    if (typeof F?.runUi === "function") return;
    e.preventDefault();
    pendingSeed = Date.now() % 100000;
    run.disabled = true;
    run.textContent = "Loading & Running…";
    const status = document.getElementById("fullSeasonStatus");
    if (status) status.textContent = "Preparing simulator…";
  };
  document.addEventListener("click", early, true);
  const files = [
    "full-season-core.js?v=20260824b",
    "full-season-rpi.js?v=20260813h",
    "full-season-run.js?v=20260813b",
    "full-season-view.js?v=20260813a",
    "full-season-playoffs.js?v=20260813a",
    "full-season-playoff-view.js?v=20260824b",
    "full-season-stats.js?v=20260824b",
    "full-season-colors.js?v=20260813j",
    "full-season-collapse.js?v=20260813h",
    "full-season-scores.js?v=20260813i",
  ];
  const load = (i) => {
    if (i === files.length) return ready(0);
    const s = document.createElement("script");
    s.src = files[i];
    s.async = false;
    s.onload = () => load(i + 1);
    document.body.appendChild(s);
  };
  const ready = (n) => {
    const F = window.RUSFullSeason,
      run = document.getElementById("fullSeasonRun"),
      status = document.getElementById("fullSeasonStatus"),
      out = document.getElementById("fullSeasonOutput"),
      sim = typeof simulator !== "undefined" ? simulator : window.simulator,
      simReady = !!sim?.teams && Object.keys(sim.teams).length > 0;
    if (
      (!F?.simulate ||
        !F?.addRpi ||
        !F?.render ||
        !F?.simulatePlayoffs ||
        !F?.renderPlayoffs ||
        !run ||
        !status ||
        !out ||
        !simReady) &&
      n < 100
    )
      return setTimeout(() => ready(n + 1), 100);
    if (!run) return;
    F.runUi = async (seed) => {
      run.disabled = true;
      run.textContent = "Simulating All Teams…";
      status.textContent =
        "Simulating every 2026 game, RPI, playoffs, and statewide player statistics...";
      try {
        const R = await F.simulate(seed);
        const champs = [...(R.playoffs || new Map()).values()]
          .map(
            (p) =>
              `${p.classification === "8P" ? "8-Player" : p.classification}: ${p.champion?.team || "—"}`,
          )
          .join(" • ");
        status.textContent = `${R.games} regular-season games • ${R.stats.size} programs • ${R.simulatedStats?.size || 0} team stat sets${champs ? " • " + champs : ""}`;
        F.render(R, out);
      } catch (e) {
        console.error(e);
        status.textContent = "The 2026 full-season simulation could not run.";
      } finally {
        run.disabled = false;
        run.textContent = "Simulate Again";
      }
    };
    run.onclick = () => F.runUi(Date.now() % 100000);
    document.removeEventListener("click", early, true);
    if (pendingSeed != null) {
      const seed = pendingSeed;
      pendingSeed = null;
      F.runUi(seed);
    }
  };
  load(0);
})();
