(() => {
  if (!/simulators\.html$/i.test(location.pathname.split("/").pop() || ""))
    return;
  const go = () => {
    const tabs = document.querySelector(".tabs"),
      weekly = document.getElementById("weekly");
    if (!tabs || !weekly || document.getElementById("full-season")) return;
    if (!document.getElementById("fullSeasonScrollFix")) {
      const st = document.createElement("style");
      st.id = "fullSeasonScrollFix";
      st.textContent =
        "#full-season .table-wrap,#full-season .fsp-scroll{overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain!important;overscroll-behavior-y:auto!important;touch-action:pan-x pan-y!important}";
      document.head.append(st);
    }
    const b = document.createElement("button");
    b.className = "tab";
    b.dataset.tab = "full-season";
    b.textContent = "Simulate All 2026";
    tabs.append(b);
    const p = document.createElement("section");
    p.id = "full-season";
    p.className = "panel";
    const h = document.createElement("h2");
    h.textContent = "2026 Full Season Simulator";
    const note = document.createElement("p");
    note.className = "note";
    note.textContent =
      "Simulate every team’s real 2026 regular-season schedule, calculate UHSAA-style RPI, seed every classification, play through state champions, and generate simulated team and player statistics for the entire state.";
    const run = document.createElement("button");
    run.id = "fullSeasonRun";
    run.className = "action";
    run.textContent = "Simulate All 2026 Teams";
    const status = document.createElement("div");
    status.id = "fullSeasonStatus";
    status.className = "note";
    const out = document.createElement("div");
    out.id = "fullSeasonOutput";
    p.append(h, note, run, status, out);
    weekly.insertAdjacentElement("afterend", p);
    b.onclick = () => {
      if (typeof window.showTab === "function") window.showTab("full-season");
      else {
        document
          .querySelectorAll(".tab")
          .forEach((x) => x.classList.toggle("active", x === b));
        document
          .querySelectorAll(".panel")
          .forEach((x) => x.classList.toggle("active", x === p));
      }
    };
    if (new URLSearchParams(location.search).get("tab") === "full-season")
      b.click();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => setTimeout(go, 250));
  else setTimeout(go, 250);
})();
