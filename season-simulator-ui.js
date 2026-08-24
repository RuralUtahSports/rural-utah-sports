(() => {
  if (!/simulators\.html$/i.test(location.pathname.split("/").pop() || ""))
    return;
  const load = (src, key) => {
    if (document.querySelector(`script[data-${key}]`)) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.setAttribute(`data-${key}`, "1");
    document.body.appendChild(s);
  };
  load("season-simulator-playoffs.js?v=20260813c", "rus-season-playoffs");
  load("season-simulator-ready.js?v=20260813d", "rus-season-ready");
  load("full-season-panel.js?v=20260824b", "rus-full-season-panel");
  load("full-season-actions.js?v=20260824-open1", "rus-full-season-actions");
  const tabs = document.querySelector(".tabs"),
    weekly = document.getElementById("weekly");
  if (!tabs || !weekly || document.getElementById("season")) return;
  const b = document.createElement("button");
  b.className = "tab";
  b.dataset.tab = "season";
  b.textContent = "Simulate a Season";
  tabs.insertBefore(b, tabs.querySelector('[data-tab="greatest"]') || null);
  const p = document.createElement("section");
  p.id = "season";
  p.className = "panel";
  p.innerHTML =
    '<div id="seasonContent" class="loading">Loading Season Simulator...</div>';
  weekly.insertAdjacentElement("afterend", p);
  b.onclick = () => {
    document
      .querySelectorAll(".tab")
      .forEach((x) => x.classList.toggle("active", x === b));
    document
      .querySelectorAll(".panel")
      .forEach((x) => x.classList.toggle("active", x === p));
    history.replaceState(null, "", "?tab=season");
  };
  const wait = (n) => {
    const S = window.RUSSeasonSim;
    if (S?.setup && S?.regularSchedule && S?.postseasonFieldReady)
      return S.setup();
    if (n < 100) setTimeout(() => wait(n + 1), 100);
  };
  wait(0);
  if (new URLSearchParams(location.search).get("tab") === "season") b.click();
})();
