(() => {
  function ensureFetchCache() {
    if (window.__rusFetchCacheInstalled) return Promise.resolve();
    const existing = [...document.scripts].find((s) =>
      /rus-fetch-cache\.js(?:\?|$)/.test(s.getAttribute("src") || ""),
    );
    return new Promise((resolve) => {
      if (existing) {
        if (window.__rusFetchCacheInstalled) {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 1200);
        return;
      }
      const s = document.createElement("script");
      s.src = "rus-fetch-cache.js?v=20260818-perf5";
      s.dataset.rusFetchCache = "1";
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }
  const fetchCacheReady = ensureFetchCache();
  const GA_ID = "G-VB4Y6BRN9M";
  function setupAnalytics() {
    if (!document.querySelector(`script[data-rus-ga="${GA_ID}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
      s.dataset.rusGa = GA_ID;
      document.head.appendChild(s);
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    if (!window.__RUS_GA_CONFIGURED__) {
      window.__RUS_GA_CONFIGURED__ = true;
      window.gtag("js", new Date());
      window.gtag("config", GA_ID);
    }
  }
  function afterFirstPaint(fn, timeout = 1200) {
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if ("requestIdleCallback" in window)
            requestIdleCallback(() => fn(), { timeout });
          else setTimeout(fn, 120);
        }),
      );
    };
    if (document.readyState === "complete") queue();
    else window.addEventListener("load", queue, { once: true });
  }
  const groups = {
    history: [
      ["Championships", "championships.html"],
      ["Season Explorer", "season.html"],
      ["Past Season Rankings", "historical-rankings.html"],
      ["Program Leaderboard", "programs.html"],
      ["Coaches", "coaches.html"],
      ["Active Streaks", "streaks.html"],
      ["Milestone Watch", "milestones.html"],
      ["Rivalry Hub", "rivalry.html"],
      ["Dynasty Explorer", "dynasty.html"],
      ["History Lab", "history-lab.html"],
      ["Greatest Seasons", "greatest-seasons.html"],
      ["Records", "records.html"],
    ],
    analytics: [
      ["ELO", "elo.html"],
      ["Playoff Picture", "playoff-picture.html"],
      ["Upset Tracker", "upsets.html"],
      ["Scorigami", "scorigami.html"],
      ["Fantasy Football", "fantasy-football.html"],
      ["Out of State", "out-of-state.html"],
      ["Team Comparison", "compare.html"],
      ["Player Comparison", "player-compare.html"],
      ["Football Map", "map.html"],
    ],
    stats: [
      ["Stat Leaders", "stat-leaders.html"],
      ["Weekly Awards", "weekly-awards.html"],
      ["Team Stats", "team-stats.html"],
      ["MVP Race", "mvp-race.html"],
      ["All-Utah Team", "all-utah.html"],
      ["All-State & Region Watch", "all-state-watch.html"],
      ["Past Award Winners", "awards-2025.html"],
    ],
    simulators: [
      ["Weekly Pick'em", "simulators.html?tab=weekly"],
      ["Simulators Hub", "simulators.html"],
      ["Promotion / Relegation", "promotion-relegation.html"],
    ],
    about: [
      ["About RUS", "about.html"],
      ["Sponsors", "sponsors.html"],
    ],
  };
  const path = (
      location.pathname.split("/").pop() || "index.html"
    ).toLowerCase(),
    active = (href) => path === href.toLowerCase(),
    groupActive = (items) => items.some(([, href]) => active(href));
  function injectStyles() {
    if (document.getElementById("rus-nav-v2")) return;
    const style = document.createElement("style");
    style.id = "rus-nav-v2";
    style.textContent = `
    nav{position:relative;z-index:50}.nav-content.rus-nav{display:flex;align-items:stretch;flex-wrap:wrap;gap:0}.rus-nav>a,.rus-nav details>summary{color:#fff;text-decoration:none;padding:15px 14px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px;min-height:48px}.rus-nav details>summary::-webkit-details-marker{display:none}.rus-nav>a:hover,.rus-nav>a.active,.rus-nav details.active>summary,.rus-nav details[open]>summary{background:#F14D07;color:#000}.rus-nav .home-link{padding-inline:13px}.rus-nav details{position:relative}.rus-nav .drop{position:absolute;left:0;top:100%;min-width:235px;background:#0b0b0b;border:1px solid #333;border-top:3px solid #F14D07;box-shadow:0 10px 24px rgba(0,0,0,.35);display:none;max-height:70vh;overflow:auto}.rus-nav details[open]>.drop{display:block}.rus-nav .drop a{display:block;color:#fff;text-decoration:none;padding:12px 14px;font-size:12px;font-weight:800;text-transform:uppercase;border-bottom:1px solid #242424;white-space:nowrap}.rus-nav .drop a:last-child{border-bottom:0}.rus-nav .drop a:hover,.rus-nav .drop a.active{background:#F14D07;color:#000}.rus-nav .caret{font-size:10px;transform:translateY(-1px)}.header-home{cursor:pointer}@media(min-width:701px){.rus-nav details:hover>.drop{display:block}}@media(max-width:700px){.nav-content.rus-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.rus-nav>a,.rus-nav details>summary{justify-content:center;text-align:center;padding:12px 7px;font-size:12px}.rus-nav details{position:static}.rus-nav .drop{position:static;grid-column:1/-1;min-width:0;width:100%;box-shadow:none;border-left:0;border-right:0;max-height:none}.rus-nav .drop a{text-align:center;white-space:normal;padding:11px 8px}}
    @supports(content-visibility:auto){@media(max-width:700px){.week-review,.about,.thanks,#board .game:nth-child(n+5),#state25List .state25-row:nth-child(n+9),#rankings .rank-card:nth-child(n+3),#rusMtGrid .rus-mt-card:nth-child(n+3),#page .single-game-explorer,#page .record-grid,#page .history-wrap{content-visibility:auto;contain-intrinsic-size:auto 360px}#board .game:nth-child(n+5){contain-intrinsic-size:auto 280px}#state25List .state25-row:nth-child(n+9){contain-intrinsic-size:auto 80px}#rusMtGrid .rus-mt-card:nth-child(n+3){contain-intrinsic-size:auto 520px}#page .history-wrap{contain-intrinsic-size:auto 520px}}}
  `;
    document.head.appendChild(style);
  }
  function link(label, href, extra = "") {
    return `<a href="${href}" class="${active(href) ? "active " : ""}${extra}"${active(href) ? ' aria-current="page"' : ""}>${label}</a>`;
  }
  function dropdown(label, key) {
    const items = groups[key],
      cls = groupActive(items) ? "active" : "";
    return `<details class="${cls}"><summary>${label}<span class="caret">▼</span></summary><div class="drop">${items.map(([name, href]) => link(name, href)).join("")}</div></details>`;
  }
  function addScript(src, key, async = true) {
    const attr = `data-${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`;
    if (
      document.querySelector(`script[${attr}]`) ||
      (key === "rusSchoolAssets" && window.RUSSchoolAssets)
    )
      return;
    const s = document.createElement("script");
    s.src = src;
    s.async = async;
    s.dataset[key] = "1";
    document.body.appendChild(s);
  }
  function oneOf(...names) {
    return names.includes(path);
  }
  async function loadExtras() {
    await fetchCacheReady;
    addScript("pwa.js?v=20260827-mobile-nav-restore1", "rusPwa", true);
    addScript("site-search.js?v=20260817-player2", "rusSiteSearch", true);
    addScript(
      "optimization-polish.js?v=20260819-lcp1",
      "rusOptimizationPolish",
      true,
    );
    addScript("recently-viewed.js?v=20260817-app4", "rusRecentlyViewed", true);
    addScript("site-extras.js", "rusExtras", true);
    addScript("site-polish.js?v=20260818-nav1", "rusSitePolish", true);
    addScript("app-shell-polish.js?v=20260817-app3", "rusAppShellPolish", true);
    addScript("site-share.js", "rusShare", true);
    addScript("favorites.js?v=20260817-header3", "rusFavorites", true);
    addScript(
      "mobile-optimizations.js?v=20260817-mobile2",
      "rusMobileOptimizations",
      true,
    );
    addScript(
      "desktop-optimizations.js?v=20260818-tableheaderfix",
      "rusDesktopOptimizations",
      true,
    );
    const schoolAssetPages = [
      "teams.html",
      "team.html",
      "scoreboard.html",
      "standings.html",
      "rankings.html",
      "storylines.html",
      "records.html",
      "stat-leaders.html",
      "weekly-awards.html",
      "team-stats.html",
      "mvp-race.html",
      "all-utah.html",
      "all-state-watch.html",
      "awards-2025.html",
      "player.html",
      "map.html",
      "compare.html",
      "rivalry.html",
      "streaks.html",
      "milestones.html",
      "playoff-picture.html",
      "upsets.html",
      "game-week.html",
      "my-teams.html",
      "player-compare.html",
      "fantasy-football.html",
      "historical-rankings.html",
    ];
    if (oneOf(...schoolAssetPages)) {
      const assetScript =
        path === "scoreboard.html"
          ? "school-assets-bundle.js?v=20260818-perf2"
          : "school-assets-core.js?v=20260818-perf2";
      addScript(assetScript, "rusSchoolAssets", true);
      addScript(
        "school-logo-integration.js?v=20260817-ridgeline6",
        "rusSchoolLogoIntegration",
        true,
      );
      addScript("school-colors.js?v=20260813c", "rusSchoolColors", true);
    }
    if (oneOf("team.html", "player.html"))
      addScript("season-dropdown.js?v=20260814a", "rusSeasonDropdown", true);
    if (path === "team.html") {
      addScript("team-dashboard.js?v=20260817a", "rusTeamDashboard", true);
      addScript("team-stats.js?v=20260817c", "rusTeamStats", true);
      addScript(
        "team-overview-cleanup.js?v=20260817a",
        "rusTeamOverviewCleanup",
        true,
      );
      addScript("program-timeline.js?v=20260812a", "rusProgramTimeline", true);
      addScript(
        "team-greatest-paths.js?v=20260818-perf1",
        "rusTeamGreatestPaths",
        true,
      );
      addScript("team-tabs.js?v=20260818-games1", "rusTeamTabs", true);
      addScript(
        "player-profile-links.js?v=20260814a",
        "rusPlayerProfileLinks",
        true,
      );
      if (new URLSearchParams(location.search).get("season") === "2025")
        addScript(
          "team-season-archive.js?v=20260814a",
          "rusTeamSeasonArchive",
          false,
        );
    }
    if (path === "records.html") {
      addScript(
        "record-watch-filter.js?v=20260825-dedupe1",
        "rusRecordWatchFilter",
        true,
      );
      addScript("uhsaa-record-book.js?v=20260814c", "rusUhsaaRecordBook", true);
      addScript(
        "uhsaa-record-watch.js?v=20260814a",
        "rusUhsaaRecordWatch",
        true,
      );
      addScript(
        "records-layout-enhancements.js?v=20260814c",
        "rusRecordsLayoutEnhancements",
        true,
      );
    }
    if (path === "programs.html")
      addScript(
        "program-leaderboard-filter.js?v=20260812a",
        "rusProgramLeaderboardFilter",
        true,
      );
    if (
      oneOf(
        "history-lab.html",
        "season.html",
        "greatest-seasons.html",
        "dynasty.html",
      )
    )
      addScript(
        "history-tools-integration.js?v=20260812c",
        "rusHistoryTools",
        true,
      );
    if (path === "rivalry.html")
      addScript(
        "rivalry-interactive.js?v=20260812a",
        "rusRivalryInteractive",
        true,
      );
    if (path === "elo.html")
      addScript("elo-explainer.js?v=20260812b", "rusEloExplainer", true);
    if (path === "index.html") {
      addScript(
        "home-personalized.js?v=20260817-app4",
        "rusHomePersonalized",
        true,
      );
      addScript("did-you-know.js?v=20260812a", "rusDidYouKnow", true);
      addScript(
        "today-history-more.js?v=20260813a",
        "rusTodayHistoryMore",
        true,
      );
      addScript(
        "record-watch-filter.js?v=20260825-dedupe1",
        "rusRecordWatchFilter",
        true,
      );
    }
    if (path.includes("simulator"))
      [
        ["season-simulator-core.js?v=20260813a", "rusSeasonCore"],
        ["season-simulator-odds.js?v=20260813a", "rusSeasonOdds"],
        ["season-simulator-score.js?v=20260813e", "rusSeasonScore"],
        ["season-simulator-elo.js?v=20260813e", "rusSeasonElo"],
        ["season-simulator-run.js?v=20260813e", "rusSeasonRun"],
        ["season-simulator-stats.js?v=20260824b", "rusSeasonStats"],
        ["season-simulator-view.js?v=20260813h", "rusSeasonView"],
        ["season-simulator-ui.js?v=20260813f", "rusSeasonUi"],
      ].forEach(([src, key]) => addScript(src, key, false));
    if (path === "scoreboard.html") {
      addScript(
        "mobile-scoreboard-polish.js?v=20260817-final1",
        "rusScoreboardMobilePolish",
        true,
      );
      addScript(
        "rus-lines-dashboard.js?v=20260817-app4",
        "rusLinesDashboard",
        true,
      );
    }
    if (path === "game.html")
      addScript(
        "game-center-upgrade.js?v=20260817-app4",
        "rusGameCenterUpgrade",
        true,
      );
    if (path === "my-teams.html")
      addScript(
        "my-teams-dashboard.js?v=20260817-app4",
        "rusMyTeamsDashboard",
        true,
      );
    if (path === "rankings.html") {
      addScript(
        "rankings-live-records.js?v=20260814a",
        "rusRankingsLiveRecords",
        true,
      );
      addScript(
        "rankings-mobile-fix.js?v=20260815a",
        "rusRankingsMobileFix",
        true,
      );
      addScript(
        "computer-rankings.js?v=20260817-past-only",
        "rusComputerRankings",
        true,
      );
    }
    if (
      [
        "player.html",
        "mvp-race.html",
        "all-state-watch.html",
        "all-utah.html",
      ].includes(path)
    ) {
      addScript(
        "award-scoring-core.js?v=20260831-quality-wins1",
        "rusAwardScoringCore",
        false,
      );
      addScript(
        "player-awards-integration.js?v=20260831-quality-wins1",
        "rusPlayerAwards",
        false,
      );
    }
    if (
      [
        "mvp-race.html",
        "all-state-watch.html",
        "all-utah.html",
        "awards-2025.html",
      ].includes(path)
    )
      addScript(
        "award-school-branding.js?v=20260831-quality-wins1",
        "rusAwardSchoolBranding",
        true,
      );
    if (path === "awards-2025.html") {
      addScript(
        "past-awards-allstate-layout.js?v=20260817-rural-hm",
        "rusPastAwardsAllState",
        true,
      );
      addScript(
        "past-awards-shared-scoring.js?v=20260817a",
        "rusPastAwardsScoring",
        true,
      );
    }
    if (path === "stat-leaders.html")
      addScript(
        "stat-leaders-branding.js?v=20260818-rowfix2",
        "rusStatLeadersBranding",
        true,
      );
    if (path === "map.html")
      addScript(
        "map-distance-tools.js?v=20260814b",
        "rusMapDistanceTools",
        true,
      );
    if (path === "storylines.html")
      addScript(
        "storylines-live-fix.js?v=20260814a",
        "rusStorylinesLiveFix",
        true,
      );
    if (path === "all-state-watch.html") {
      addScript(
        "all-state-region-order.js?v=20260817-layout",
        "rusAllStateRegionOrder",
        false,
      );
    }
  }
  function setup() {
    injectStyles();
    const host = document.querySelector("nav .nav-content");
    if (host) {
      host.classList.add("rus-nav");
      host.innerHTML = [
        link("Home", "index.html", "home-link"),
        link("Game Week", "game-week.html"),
        link("Teams", "teams.html"),
        link("My Teams", "my-teams.html"),
        link("Games", "games.html"),
        link("Scoreboard", "scoreboard.html"),
        link("Rankings", "rankings.html"),
        link("Standings", "standings.html"),
        link("Pick'em", "simulators.html?tab=weekly"),
        dropdown("Stats", "stats"),
        link("Storylines", "storylines.html"),
        dropdown("History", "history"),
        dropdown("Analytics", "analytics"),
        dropdown("Simulators", "simulators"),
        dropdown("About", "about"),
      ].join("");
      document.querySelectorAll(".rus-nav details").forEach((d) =>
        d.addEventListener("toggle", () => {
          if (!d.open) return;
          document.querySelectorAll(".rus-nav details").forEach((other) => {
            if (other !== d) other.open = false;
          });
        }),
      );

      // Mobile navigation is part of the critical shell. Load it as soon as
      // the canonical nav exists instead of waiting for window.load and an
      // idle callback, either of which can be delayed by a slow page asset.
      addScript(
        "mobile-shell.js?v=20260827-mobile-nav-restore1",
        "rusMobileShell",
        true,
      );
    }
    const logo = document.querySelector("header .logo");
    if (logo && !logo.closest("a")) {
      logo.classList.add("header-home");
      logo.setAttribute("title", "Home");
      logo.setAttribute("role", "link");
      logo.setAttribute("tabindex", "0");
      const go = () => {
        location.href = "index.html";
      };
      logo.addEventListener("click", go);
      logo.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    }
    afterFirstPaint(loadExtras, 900);
    afterFirstPaint(setupAnalytics, 1800);
  }
  // Most pages include this script after their nav markup. Initialize at once
  // in that case so the mobile shell does not sit behind earlier defer scripts.
  if (document.querySelector("nav .nav-content")) setup();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
