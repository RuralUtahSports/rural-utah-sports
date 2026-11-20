#!/usr/bin/env node
// Validate team classification/region history before publishing.
// Run: node scripts/validate-team-season-alignments.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const teams = JSON.parse(fs.readFileSync(new URL('../teams-data.json', import.meta.url), 'utf8'));
const history = JSON.parse(fs.readFileSync(new URL('../team-season-alignments.json', import.meta.url), 'utf8'));
const canonical = value => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const validTeams = new Set(teams.map(team => canonical(team.team)));
assert.equal(validTeams.size, teams.length, 'Team names must normalize uniquely');
assert.equal(Object.keys(history).length, validTeams.size, 'Every team needs a history record, even if some years are missing');

let entries = 0;
const perYear = {};
for (const [teamKey, seasons] of Object.entries(history)) {
  assert(validTeams.has(teamKey), 'Unknown team: ' + teamKey);
  assert.equal(typeof seasons, 'object', teamKey + ' must have year records');
  for (const [year, row] of Object.entries(seasons)) {
    assert(/^19\d\d$|^20\d\d$/.test(year), teamKey + ': bad year ' + year);
    assert(Number(year) <= 2026, teamKey + ': unexpected future year ' + year);
    assert(row && typeof row === 'object', teamKey + ': invalid row for ' + year);
    assert(typeof row.classification === 'string' && row.classification.trim(), teamKey + ': no classification for ' + year);
    assert(typeof row.region === 'string' && row.region.trim(), teamKey + ': no region for ' + year);
    if (row.standingsUrl) {
      assert(
        new RegExp('^https://utah-football\\.com/s/' + year + '/[a-z0-9]+\\.htm$').test(row.standingsUrl),
        teamKey + ': bad or cross-year archive link for ' + year
      );
    }
    entries++;
    perYear[year] = (perYear[year] || 0) + 1;
  }
}
assert.equal(perYear['2025'], 117, 'Expected 117 source-confirmed teams in 2025');
assert.equal(perYear['2026'], 118, 'Expected current RUS coverage for all 118 teams');
assert.equal(history.EAST?.['1971']?.classification, '3A', "East's 1971 3A history changed");
assert.equal(history.EAST?.['1972']?.classification, '4A', "East's 1972 4A history changed");
console.log('OK: ' + entries + ' dated classification/region records across ' + validTeams.size + ' schools.');
console.table(perYear);
