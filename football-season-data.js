(() => {
  const cache = new Map();
  function read(path) {
    if (!cache.has(path)) cache.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error(path);
      return response.json();
    }).catch(error => { cache.delete(path); throw error; }));
    return cache.get(path);
  }
  const ratio = record => {
    if (!record) return -1;
    const [w,l,t] = record.split('-').map(Number);
    return (w + t / 2) / (w + l + t || 1);
  };
  async function recordsFor(year) {
    if (year !== '2026') return (await read('team-season-record-display.json'))[year] || {};
    const standings = structuredClone(await read('standings-2026.json'));
    const playoffs = await window.RUSPlayoff2026?.load().catch(() => null);
    if (playoffs) window.RUSPlayoff2026.applyStandings(standings, playoffs);
    return Object.fromEntries(Object.values(standings.byClassification).flat().map(t => [
      t.team.toUpperCase().replace(/[^A-Z0-9]/g,''), [[t.wins,t.losses,t.ties].join('-'),[t.regionWins,t.regionLosses,t.regionTies].join('-')]
    ]));
  }
  window.RUSSeasonData = {read,ratio,recordsFor};
})();
