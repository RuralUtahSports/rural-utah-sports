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
  function labelStyle(team) {
    const primary = team?.backgroundColor, ink = team?.textColor;
    if (![primary,ink].every(c=>/^#[0-9a-f]{6}$/i.test(c))) return '';
    const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const luminance = channels => channels.reduce((sum,n,i)=>{
      const v=n/255;
      return sum + [0.2126,0.7152,0.0722][i]*(v<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
    },0);
    const textLight=luminance(rgb(ink)), base=rgb(primary);
    let fill=base;
    // Preserve the school's lettering color and tint the fill only when contrast requires it.
    const target=textLight>0.179 ? 0 : 255;
    for(let step=1;step<=10;step++){
      const bg=luminance(fill);
      if((Math.max(bg,textLight)+0.05)/(Math.min(bg,textLight)+0.05)>=4.5) break;
      fill=base.map(n=>Math.round(n+(target-n)*step/10));
    }
    return ` class="rus-school-label" style="--school-fill:rgb(${fill.join(',')});--school-ink:${ink};--school-edge:${primary}"`;
  }
  window.RUSSeasonData = {read,ratio,recordsFor,labelStyle};
})();
