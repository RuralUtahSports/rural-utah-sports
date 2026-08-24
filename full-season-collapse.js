(() => {
  const F = (window.RUSFullSeason = window.RUSFullSeason || {});
  if (!document.getElementById("fsCollapseStyle")) {
    const s = document.createElement("style");
    s.id = "fsCollapseStyle";
    s.textContent =
      '#full-season .fs-collapse{margin:18px 0;background:#000;border:1px solid #333;border-radius:8px;overflow:hidden}#full-season .fs-collapse>summary{list-style:none;cursor:pointer;padding:16px 18px;font-weight:900;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;background:#151515;border-left:5px solid #F14D07}#full-season .fs-collapse>summary::-webkit-details-marker{display:none}#full-season .fs-collapse>summary::after{content:"+";font-size:22px;color:#F14D07}#full-season .fs-collapse[open]>summary::after{content:"−"}#full-season .fs-collapse-body{padding:0 14px 16px}';
    document.head.append(s);
  }
  const make = (title, nodes, kind) => {
    const d = document.createElement("details"),
      sum = document.createElement("summary"),
      body = document.createElement("div");
    d.className = "fs-collapse";
    d.dataset.kind = kind;
    sum.textContent = title;
    body.className = "fs-collapse-body";
    nodes.forEach((n) => body.append(n));
    d.append(sum, body);
    return d;
  };
  const base = F.render;
  if (typeof base === "function" && !base.__fsCollapse) {
    const wrapped = async (R, host, filter = "ALL") => {
      await base(R, host, filter);
      const rpi = [...host.querySelectorAll(".section-title")].find((x) =>
          /Simulated UHSAA RPI/i.test(x.textContent || ""),
        ),
        region = [...host.querySelectorAll(".section-title")].find((x) =>
          /Simulated Region Standings/i.test(x.textContent || ""),
        ),
        playoff = host.querySelector(".fsp");
      if (!rpi || !region || host.querySelector('[data-kind="rpi"]')) return;
      const a = [];
      let n = rpi;
      while (n && n !== playoff && n !== region) {
        const next = n.nextSibling;
        a.push(n);
        n = next;
      }
      const b = [],
        stats = host.querySelector("#rusFullSeasonStats");
      n = region;
      while (n && n !== stats) {
        const next = n.nextSibling;
        b.push(n);
        n = next;
      }
      host.append(
        make("RPI Rankings", a, "rpi"),
        make("Region Standings", b, "region"),
      );
    };
    wrapped.__fsCollapse = true;
    F.render = wrapped;
  }
})();
