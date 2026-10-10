/* Run with: node --test tests/power-ratings.test.cjs */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");

function loadModel() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "power-ratings-core.js"), "utf8"), { window });
  return window.RUSPowerRatings;
}

test("one displayed rating point means exactly one neutral-field spread point", () => {
  const model = loadModel();
  const m = { name: "MORGAN", rating: 88 };
  const c = { name: "CARBON", rating: 51 };
  assert.equal(model.matchup(m, c, "neutral").label, "MORGAN -37");
  assert.equal(model.matchup(m, c, "a").spread, 39.5);
  assert.equal(model.matchup(m, c, "b").spread, 34.5);
  assert.equal(model.matchup(c, m, "neutral").label, "MORGAN -37");
  assert.equal(model.matchup(m, { name: "OTHER", rating: 88 }, "neutral").label, "Pick'em");
});

test("current 2026 data creates separate 0–99 ratings for all Utah teams", () => {
  const model = loadModel();
  const weekly = JSON.parse(fs.readFileSync(path.join(root, "weekly-simulation.json"), "utf8"));
  const teams = JSON.parse(fs.readFileSync(path.join(root, "teams-data.json"), "utf8"));
  const elo = JSON.parse(fs.readFileSync(path.join(root, "elo-summary.json"), "utf8"));
  const result = model.build(weekly, teams, elo);
  assert.equal(result["11P"].teams.length + result["8P"].teams.length, teams.length);
  assert.ok(result["11P"].games > 0);
  assert.ok(result["8P"].games > 0);
  for (const league of ["11P", "8P"]) {
    for (const t of result[league].teams) {
      assert.equal(Number.isInteger(t.rating), true, t.name);
      assert.ok(t.rating >= 0 && t.rating <= 99, t.name);
      assert.equal(t.classification === "8P", league === "8P", t.name);
    }
    for (let i = 1; i < result[league].teams.length; i++) {
      assert.ok(result[league].teams[i - 1].rating >= result[league].teams[i].rating);
    }
  }
});

test("does not learn from contradictory finals or cross-format games", () => {
  const model = loadModel();
  const teams = [
    { team: "A", classification: "1A" },
    { team: "B", classification: "1A" },
    { team: "EIGHT", classification: "8P" }
  ];
  const weekly = { games: [
    { date: "10/09/2026", awayTeam: "A", homeTeam: "B", actualAway: 30, actualHome: 0, actualWinner: "B" },
    { date: "10/09/2026", awayTeam: "A", homeTeam: "EIGHT", actualAway: 21, actualHome: 7, actualWinner: "A" },
    { date: "10/09/2026", awayTeam: "A", homeTeam: "B", actualAway: 0, actualHome: 0, actualWinner: "TIE" }
  ] };
  const result = model.build(weekly, teams, {});
  assert.equal(result["11P"].games, 0);
  assert.equal(result["8P"].games, 0);
});
