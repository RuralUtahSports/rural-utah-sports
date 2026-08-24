(() => {
  const STYLE_ID = "rus-weekly-promo-style",
    BANNER_ID = "rus-weekly-promo";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );
  const validDate = (v) => {
    const t = Date.parse(String(v || ""));
    return Number.isFinite(t) ? t : null;
  };
  const activeSponsor = (s) => {
    if (!s || s.mode !== "sponsor") return false;
    const now = Date.now(),
      start = validDate(s.startDate),
      end = validDate(s.endDate);
    return (!start || now >= start) && (!end || now <= end + 86399999);
  };
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${BANNER_ID}{display:block;background:#F14D07;color:#000;border-bottom:1px solid #ff7a42;overflow:hidden;position:relative;z-index:20;width:100%}
#${BANNER_ID} .rus-promo-track{display:flex;align-items:center;width:max-content;min-width:200%;white-space:nowrap;animation:rusPromoMarquee 28s linear infinite;will-change:transform}
#${BANNER_ID}:hover .rus-promo-track,#${BANNER_ID}:focus-within .rus-promo-track{animation-play-state:paused}
#${BANNER_ID} .rus-promo-set{display:inline-flex;align-items:center;flex:0 0 auto}
#${BANNER_ID} .rus-promo-item{display:inline-flex;align-items:center;gap:9px;padding:9px 18px;color:#000;text-decoration:none;font-weight:900;text-transform:uppercase;letter-spacing:.35px}
#${BANNER_ID} .rus-promo-item+.rus-promo-item{border-left:1px solid rgba(0,0,0,.24)}
#${BANNER_ID} .rus-promo-cta{background:#000;color:#fff;border-radius:999px;padding:4px 9px;font-size:10px;letter-spacing:.5px}
@keyframes rusPromoMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(max-width:700px){#${BANNER_ID}{display:block!important;width:100%!important;max-width:100vw!important;min-height:38px!important;overflow:hidden!important;visibility:visible!important}#${BANNER_ID} .rus-promo-track{display:flex!important;font-size:12px;animation:rusPromoMarquee 22s linear infinite!important;min-width:200%!important;width:max-content!important}#${BANNER_ID} .rus-promo-set{display:inline-flex!important;flex:0 0 auto!important}#${BANNER_ID} .rus-promo-item{display:inline-flex!important;padding:9px 14px;white-space:nowrap!important}#${BANNER_ID} .rus-promo-cta{font-size:9px;padding:4px 8px}}
@media(prefers-reduced-motion:reduce){#${BANNER_ID} .rus-promo-track{animation:none!important;width:100%!important;min-width:0!important;justify-content:center;white-space:normal;text-align:center;flex-wrap:wrap}#${BANNER_ID} .rus-promo-set[aria-hidden="true"]{display:none!important}#${BANNER_ID} .rus-promo-item{white-space:normal!important}}
`;
    document.head.appendChild(style);
  }
  function weeklyItem() {
    return `<a class="rus-promo-item" href="simulators.html#weekly" aria-label="Go to Weekly Simulation picks">🏈 Weekly Simulation <span>Make your picks • Compare with Rural Utah Sports • Weekly leaderboard</span> <span class="rus-promo-cta">Play Now →</span></a>`;
  }
  function sponsorItem(s) {
    const start = validDate(s.startDate),
      isNew = start && Date.now() - start < 14 * 24 * 60 * 60 * 1000;
    return `<a class="rus-promo-item" href="sponsors.html" aria-label="View Rural Utah Sports sponsors">🤝 ${isNew ? "New Sponsor" : "RUS Sponsor"} <span>${esc(s.business || "Sponsor")} • ${esc(s.label || "Supporting Rural Utah Sports")}</span> <span class="rus-promo-cta">See Sponsor →</span></a>`;
  }
  function renderBanner(sponsors = []) {
    const banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    const sponsorItems = sponsors.filter(activeSponsor).map(sponsorItem),
      items = [...sponsorItems, weeklyItem()].join("");
    banner.innerHTML = `<div class="rus-promo-track"><div class="rus-promo-set">${items}</div><div class="rus-promo-set" aria-hidden="true">${items}</div></div>`;
  }
  if (!document.getElementById(BANNER_ID)) {
    const nav = document.querySelector("nav");
    if (nav) {
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      nav.insertAdjacentElement("afterend", banner);
      renderBanner([]);
    }
  }
  async function loadSponsors() {
    try {
      const r = await fetch(`school-sponsors.json?v=${Date.now()}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const data = await r.json();
      renderBanner(Object.values(data || {}));
    } catch (e) {
      console.warn("Sponsor promo unavailable", e);
    }
  }
  const page = () => location.pathname.split("/").pop() || "",
    onSim = () => /simulators\.html$/i.test(page()),
    openWeekly = () => {
      if (!onSim() || location.hash.toLowerCase() !== "#weekly") return;
      const button = document.querySelector('.tab[data-tab="weekly"]');
      if (button) button.click();
    },
    addPair = (panelSrc, actionSrc, key) => {
      if (!onSim() || document.querySelector(`script[data-rus-${key}-loader]`))
        return;
      const panel = document.createElement("script"),
        actions = document.createElement("script");
      panel.src = panelSrc;
      panel.async = false;
      panel.setAttribute(`data-rus-${key}-loader`, "panel");
      actions.src = actionSrc;
      actions.async = false;
      actions.setAttribute(`data-rus-${key}-loader`, "actions");
      document.body.append(panel, actions);
    },
    loadFullSeason = () =>
      addPair(
        "full-season-panel.js?v=20260824b",
        "full-season-actions.js?v=20260824-boxscroll1",
        "full-season",
      ),
    loadDynasty = () =>
      addPair(
        "dynasty-sim-panel.js?v=20260813b",
        "dynasty-sim-actions.js?v=20260813d",
        "dynasty",
      ),
    loadSeasonRecords = () => {
      if (
        !/season\.html$/i.test(page()) ||
        document.querySelector("script[data-rus-season-records]")
      )
        return;
      const s = document.createElement("script");
      s.src = "season-records-fix.js?v=20260814a";
      s.defer = true;
      s.dataset.rusSeasonRecords = "1";
      document.body.appendChild(s);
    },
    loadHomeGotw = () => {
      if (
        !/^(?:|index\.html)$/i.test(page()) ||
        document.querySelector("script[data-rus-home-gotw]")
      )
        return;
      const s = document.createElement("script");
      s.src = "home-game-of-week.js?v=20260819-preview2";
      s.defer = true;
      s.dataset.rusHomeGotw = "preview2";
      document.body.appendChild(s);
    },
    loadState25Direct = () => {
      if (
        !/rankings\.html$/i.test(page()) ||
        window.__rusState25DirectShareBuild === "ios8-class-share-safety" ||
        document.querySelector(
          'script[src*="rankings-share-direct.js?v=20260819-ios8-class-share-safety"]',
        )
      )
        return;
      const s = document.createElement("script");
      s.src = "rankings-share-direct.js?v=20260819-ios8-class-share-safety";
      s.defer = true;
      s.dataset.rusState25DirectShare = "ios8-class-share-safety";
      document.body.appendChild(s);
    },
    loadClassDirect = () => {
      if (
        !/rankings\.html$/i.test(page()) ||
        window.__rusClassDirectShareBuild === "ios3-class-polish-elo" ||
        document.querySelector(
          'script[src*="rankings-class-share-direct-v3.js?v=20260819-ios3-class-polish-elo"]',
        )
      )
        return;
      const s = document.createElement("script");
      s.src =
        "rankings-class-share-direct-v3.js?v=20260819-ios3-class-polish-elo";
      s.defer = true;
      s.dataset.rusClassDirectShare = "ios3-class-polish-elo";
      document.body.appendChild(s);
    },
    start = () => {
      loadSponsors();
      openWeekly();
      loadFullSeason();
      loadDynasty();
      loadSeasonRecords();
      loadHomeGotw();
      loadState25Direct();
      loadClassDirect();
    };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0));
  else setTimeout(start, 0);
  window.addEventListener("hashchange", openWeekly);
})();
