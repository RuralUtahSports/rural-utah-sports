#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const key = name => name.toUpperCase().replace(/[^A-Z0-9]/g, '');
const teams = read('teams-data.json').map(team => key(team.team));
const historical = read('historical-football-programs.json');
const book = read('team-season-alignments.json');
const counts = read('audits/team-season-archive-counts.json');
const known = [...teams, ...Object.keys(historical)];
assert.equal(new Set(known).size, known.length, 'Overlapping program IDs');
assert.deepEqual(Object.keys(book).sort(), known.sort(), 'Missing or unknown program');
for (const [id, program] of Object.entries(historical)) {
  assert.equal(key(program.name), id);
  assert.match(program.profileUrl, /^https:\/\/utah-football\.com\/f\/[a-z0-9]+\.htm$/);
}

const seasons = {};
const groupCounts = {};
for (const [team, years] of Object.entries(book)) {
  assert(Object.keys(years).length, 'Empty program: ' + team);
  for (const [year, row] of Object.entries(years)) {
    const context = team + ' ' + year;
    assert(/^\d{4}$/.test(year) && +year >= 1800 && +year <= new Date().getFullYear(), context);
    for (const field of ['classification', 'region']) assert.equal(typeof row[field], 'string', context);
    assert(row.classification || row.region, context + ' has no verified fact');
    if (row.classification) assert.match(row.classification, /^(?:[1-6]A|3AA|Class (?:A|AA|B)|1A 8-Man|8-Man|Six-Player)$/, context);
    assert(row.standingsUrl || row.sourceUrl, context + ' has no source');
    if (row.standingsUrl) {
      const archive = new URL(row.standingsUrl);
      assert.equal(archive.origin, 'https://utah-football.com', context);
      const file = archive.pathname.split('/').pop();
      assert.equal(row.standingsUrl, archive.origin + '/s/' + year + '/' + file, context);
      assert(file in counts[year], context + ' has an unverified standings link');
      const count = groupCounts[year] ??= {};
      count[file] = (count[file] || 0) + 1;
    }
    if (row.sourceUrl) {
      if (row.sourceUrl.startsWith('brackets-')) {
        assert.equal(row.sourceUrl, 'brackets-' + year + '.json', context);
        const playoffs = read(row.sourceUrl);
        const label = row.classification === '1A 8-Man' ? '8-Player' : row.classification;
        assert(label in playoffs, context + ' missing class in bracket');
      } else {
        const source = new URL(row.sourceUrl);
        assert.equal(source.protocol, 'https:', context);
      }
    }
    seasons[year] = (seasons[year] || 0) + 1;
  }
}
assert.deepEqual(groupCounts, counts, 'Standings membership counts differ from the reviewed pages');
assert.equal(seasons['2024'], 116);
assert.equal(seasons['2025'], 118);
assert.equal(seasons['2026'], 118);
assert.equal(book.EAST['1971'].classification, '3A');
assert.equal(book.EAST['1972'].classification, '4A');
assert.equal(book.PINEVIEW['2007'].classification, '4A');
assert.equal(book.PINEVIEW['2007'].region, 'Region 9');
assert.equal(book.GUNNISONVALLEY['2022'].postseasonClassification, '1A 8-Man');
console.log(Object.values(seasons).reduce((a, b) => a + b, 0) + ' school-seasons, ' + known.length + ' programs.');
console.table(seasons);
