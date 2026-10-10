/* RUS power ratings: one displayed rating point = one neutral-field spread point. */
(function (root) {
  "use strict";

  const HOME_FIELD = 2.5;
  const MAX_SCORE_MARGIN = 55;
  const ONE_DAY = 86400000;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const number = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));
  const isEight = (c) => String(c || "").toUpperCase() === "8P";
  const validDate = (value) => {
    const m = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(20\d\d)$/);
    return m ? Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : NaN;
  };

  function build(weeklyData, teamData, eloData) {
    const teams = Array.isArray(teamData) ? teamData.filter((t) => t && t.team && t.classification) : [];
    const known = new Map(teams.map((t) => [t.team, t]));
    const seen = new Set();
    const games = [];
    for (const g of Array.isArray(weeklyData && weeklyData.games) ? weeklyData.games : []) {
      if (!known.has(g.awayTeam) || !known.has(g.homeTeam)) continue;
      if (isEight(known.get(g.awayTeam).classification) !== isEight(known.get(g.homeTeam).classification)) continue;
      const away = number(g.actualAway), home = number(g.actualHome);
      if (!Number.isFinite(away) || !Number.isFinite(home) || away < 0 || home < 0 || away + home === 0) continue;
      const date = validDate(g.date);
      if (!Number.isFinite(date)) continue;
      const actualWinner = String(g.actualWinner || "").toUpperCase().trim();
      if (actualWinner && actualWinner !== "TIE") {
        const winner = away > home ? g.awayTeam : home > away ? g.homeTeam : "TIE";
        if (winner !== actualWinner) continue; // avoid contradictory/mis-entered finals
      }
      const key = g.date + "|" + [g.awayTeam, g.homeTeam].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      games.push({ away: g.awayTeam, home: g.homeTeam, date, margin: away - home, eight: isEight(known.get(g.awayTeam).classification) });
    }

    const latest = games.length ? Math.max(...games.map((g) => g.date)) : NaN;
    const output = {};
    for (const league of ["11P", "8P"]) {
      const group = teams.filter((t) => isEight(t.classification) === (league === "8P"));
      const names = group.map((t) => t.team);
      const index = new Map(names.map((n, i) => [n, i]));
      const selected = games.filter((g) => g.eight === (league === "8P"));
      const weighted = selected.map((g) => {
        const daysOld = (latest - g.date) / ONE_DAY;
        return {
          a: index.get(g.away),
          h: index.get(g.home),
          y: clamp(g.margin, -MAX_SCORE_MARGIN, MAX_SCORE_MARGIN) + HOME_FIELD,
          w: 0.58 + 0.62 * clamp(1 - daysOld / 65, 0, 1)
        };
      });
      // Fit an Elo-to-point starting scale using actual 2026 game margins.
      // The Elo input is a weak prior, not the final rating.
      let numerator = 0, denominator = 0;
      for (const g of selected) {
        const x = (number(eloData && eloData[g.away] && eloData[g.away].currentElo) || 1500) -
                  (number(eloData && eloData[g.home] && eloData[g.home].currentElo) || 1500);
        const d = weighted[selected.indexOf(g)];
        numerator += d.w * x * d.y;
        denominator += d.w * x * x;
      }
      const slope = clamp(denominator ? numerator / denominator : 0.05, 0.025, 0.085);
      const prior = names.map((n) => ((number(eloData && eloData[n] && eloData[n].currentElo) || 1500) - 1500) * slope);
      let strength = prior.slice();
      const regularization = 2; // two Elo-prior-equivalent games per team
      for (let iteration = 0; iteration < 180; iteration++) {
        const sums = prior.map((v) => regularization * v);
        const totals = names.map(() => regularization);
        for (const g of weighted) {
          sums[g.a] += g.w * (strength[g.h] + g.y);
          sums[g.h] += g.w * (strength[g.a] - g.y);
          totals[g.a] += g.w;
          totals[g.h] += g.w;
        }
        let maxChange = 0;
        const updated = strength.map((v, i) => {
          const next = sums[i] / totals[i];
          maxChange = Math.max(maxChange, Math.abs(next - v));
          return next;
        });
        strength = updated;
        if (maxChange < 0.00001) break;
      }

      const top = Math.max(...strength);
      const bottom = Math.min(...strength);
      // Retain the power-rating display 0–99 scale. If statewide strength exceeds
      // 99 points, compress ALL teams uniformly instead of clipping bad teams
      // (clipping would break the 1-rating-point = 1-spread-point rule).
      const scale = top - bottom > 99 ? 99 / (top - bottom) : 1;
      const played = Object.fromEntries(names.map((n) => [n, 0]));
      for (const g of selected) { played[g.away] += 1; played[g.home] += 1; }
      const records = group.map((t, i) => ({
        name: t.team,
        classification: t.classification,
        region: t.region || "",
        rating: clamp(Math.round(99 - (top - strength[i]) * scale), 0, 99),
        played: played[t.team],
        backgroundColor: t.backgroundColor || "#1d1d1d",
        textColor: t.textColor || "#fff"
      }));
      records.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
      output[league] = {
        teams: records,
        games: selected.length,
        updatedThrough: Number.isFinite(latest) ? new Date(latest).toISOString().slice(0, 10) : null,
        scale: Number(scale.toFixed(4)),
        homeFieldPoints: HOME_FIELD,
        method: "2026 completed in-state games, opponent-adjusted scoring margins, recency weights and regularized ELO"
      };
    }
    return output;
  }

  function matchup(a, b, venue) {
    if (!a || !b) return null;
    const difference = a.rating - b.rating + (venue === "a" ? HOME_FIELD : venue === "b" ? -HOME_FIELD : 0);
    const favorite = difference > 0 ? a.name : difference < 0 ? b.name : null;
    return {
      favorite,
      spread: Math.abs(difference),
      label: favorite ? favorite + " -" + Math.abs(difference) : "Pick'em",
      differential: difference
    };
  }
  root.RUSPowerRatings = { build, matchup, HOME_FIELD };
})(typeof window !== "undefined" ? window : globalThis);
