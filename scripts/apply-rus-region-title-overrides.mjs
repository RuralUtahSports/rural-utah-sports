// Reapply independently verified RUS football region titles after the Google
// Sheet rebuild overwrites team-records.json. See region-title-overrides-2026.json.
import fs from 'node:fs';

const RECORDS_FILE = 'team-records.json';
const POLICY_FILE = 'region-title-overrides-2026.json';

const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
const records = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));

if (policy.season !== 2026) throw new Error('Region-title override season must be 2026');
const winning2025 = new Set(policy.champions2025 || []);
const winning2026 = new Set();
const regions = new Set();

for (const item of policy.champions2026ByRegion || []) {
  if (!item.classification || !item.region || !Array.isArray(item.teams) || !item.teams.length)
    throw new Error('Malformed 2026 region championship record');
  if (item.classification === '8P' || /indep/i.test(item.region))
    throw new Error('An 8-player or independent team cannot win a 2026 RUS region title');
  const regionKey = item.classification + '|' + item.region;
  if (regions.has(regionKey)) throw new Error('Duplicate region ' + regionKey);
  regions.add(regionKey);
  for (const team of item.teams) {
    if (winning2026.has(team)) throw new Error('Duplicate 2026 region title for ' + team);
    winning2026.add(team);
  }
}
if (winning2025.has('RICH') || winning2026.has('RICH'))
  throw new Error('8-player first place is not a region title');
if (winning2025.size !== (policy.champions2025 || []).length)
  throw new Error('Duplicate 2025 title entries');

const historicalAdjustments = new Map();
for (const adjustment of policy.historicalRecordCorrections || []) {
  if (historicalAdjustments.has(adjustment.team))
    throw new Error('Duplicate historical correction ' + adjustment.team);
  if (!Number.isInteger(adjustment.add)) throw new Error('Invalid historical correction');
  historicalAdjustments.set(adjustment.team, adjustment.add);
}

const affected = new Set([...winning2025, ...winning2026, ...historicalAdjustments.keys()]);
if (affected.size !== Object.keys(policy.baselineBefore2025 || {}).length)
  throw new Error('Baseline and awarded team lists disagree');
let changes = 0;
const results = [];
for (const team of [...affected].sort()) {
  const base = policy.baselineBefore2025[team];
  if (!Number.isInteger(base) || base < 0) throw new Error('Invalid 2024 title baseline for ' + team);
  if (!records[team]) throw new Error('School missing from team-records.json: ' + team);

  const expected = base + Number(winning2025.has(team)) +
    Number(winning2026.has(team)) + (historicalAdjustments.get(team) || 0);
  if (!Number.isInteger(expected) || expected < 0) throw new Error('Invalid title total for ' + team);

  // Never reduce an independently updated Sheet count. The override provides a
  // durable verified minimum, not an extra increment on every hourly rebuild.
  const sheetValue = Number(records[team].regionTitles);
  const next = Math.max(Number.isFinite(sheetValue) ? sheetValue : 0, expected);
  if (records[team].regionTitles !== next) {
    records[team].regionTitles = next;
    changes++;
  }
  results.push({ team, titles: next, expected, fromSheet: sheetValue });
}
fs.writeFileSync(RECORDS_FILE, JSON.stringify(records));
console.log('RUS region titles: ' + winning2025.size +
  ' 2025 awards, ' + winning2026.size + ' 2026 awards, ' +
  affected.size + ' protected teams; ' + changes + ' values restored.');
console.log(JSON.stringify(results));
