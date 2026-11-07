/* Canonical 2026 postseason adapter for team pages.
 * Official bracket feed is the sole playoff source; regular-season feeds remain untouched.
 * One game per date/opponent; recurring opponents on different dates are distinct games.
 */
(() => {
  'use strict';
  if (window.RUSPlayoff2026) return;
  const LOCAL = 'official-brackets-2026.json';
  const REMOTE = 'https://raw.githubusercontent.com/RuralUtahSports/rural-utah-sports/main/official-brackets-2026.json';
  const aliases = {
    CEDAR:'CEDARCITY', CEDARCITY:'CEDARCITY',
    ALA:'AMERICANLEADERSHIPACADEMY',
    AMERICANLEADERSHIP:'AMERICANLEADERSHIPACADEMY',
    GRANDCOUNTY:'GRAND',
    GUNNISON:'GUNNISONVALLEY',
    MONUMENTVAL:'MONUMENTVALLEY',
    MAPLEMTN:'MAPLEMOUNTAIN',
    STJOSEPH:'SAINTJOSEPH'
  };
  const key = value => {
    const n = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return aliases[n] || n;
  };
  const valid = value => value !== null && value !== undefined &&
    String(value).trim() !== '' && Number.isFinite(Number(value));
  const placeholder = name => /^(?:bye|tbd|winner of |semifinal \d+ winner|quarterfinal \d+ winner)/i.test(String(name || '').trim());
  const months = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
  function isoDate(input) {
    const s = String(input || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
    m = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m && months[m[1].toUpperCase()]) return m[3]+'-'+String(months[m[1].toUpperCase()]).padStart(2,'0')+'-'+m[2].padStart(2,'0');
    return '';
  }
  function isFinal(g) {
    return valid(g?.a?.score) && valid(g?.b?.score) &&
      ((g.a.winner === true && g.b.winner === false) || (g.b.winner === true && g.a.winner === false));
  }
  let pending;
  async function load() {
    if (pending) return pending;
    pending = (async () => {
      const results = await Promise.allSettled([LOCAL, REMOTE].map(async base => {
        const r = await fetch(base+'?v='+Date.now(), {cache:'no-store'});
        if (!r.ok) throw new Error('HTTP '+r.status);
        const payload = await r.json();
        if (!payload || payload.season !== 2026 || !payload.classifications) throw new Error('Invalid playoff source');
        return payload;
      }));
      const available = results.filter(x => x.status === 'fulfilled').map(x => x.value);
      if (!available.length) throw new Error('2026 postseason brackets unavailable');
      available.sort((a,b) => (Date.parse(b.updatedAt)||0) - (Date.parse(a.updatedAt)||0));
      return available[0];
    })().catch(error => {pending = null; throw error;});
    return pending;
  }
  function gamesForTeam(payload, name, finalsOnly = false) {
    const mine = key(name), result = [], seen = new Set();
    if (!mine) return result;
    for (const [classification, cls] of Object.entries(payload?.classifications || {})) {
      for (const round of cls?.rounds || []) {
        for (const game of round?.games || []) {
          const a = game?.a, b = game?.b;
          const date = isoDate(game?.date);
          if (!a?.name || !b?.name || !a.seed || !b.seed || !date.startsWith('2026-') ||
              placeholder(a.name) || placeholder(b.name)) continue;
          const isA = key(a.name) === mine, isB = key(b.name) === mine;
          if (!isA && !isB) continue;
          const done = isFinal(game);
          if (finalsOnly && !done) continue;
          const opponent = isA ? b.name : a.name;
          const id = date+'|'+key(opponent);
          if (seen.has(id)) continue;
          seen.add(id);
          const teamSide = isA ? a : b, oppSide = isA ? b : a;
          const neutral = !/higher seed home field/i.test(String(game.venue || ''));
          const row = {
            date, opponent, awayTeam:b.name, homeTeam:a.name,
            site: neutral ? 'neutral' : isA ? 'home' : 'away',
            playoff:true, playoffClass:classification, playoffRound:round.name || '',
            venue:game.venue || '', kickoffTime:game.time || '',
            rusStatus:done ? 'Final' : 'Scheduled',
            rusCanonicalFinal:done, rusPlayoffSource:true
          };
          if (done) {
            row.teamScore = Number(teamSide.score);
            row.opponentScore = Number(oppSide.score);
            row.result = row.teamScore > row.opponentScore ? 'W' : row.teamScore < row.opponentScore ? 'L' : 'T';
          }
          result.push(row);
        }
      }
    }
    return result.sort((a,b) => a.date.localeCompare(b.date) || a.opponent.localeCompare(b.opponent));
  }
  function mergeRows(original, incoming) {
    const out = (Array.isArray(original) ? original : []).map(x => ({...x}));
    for (const row of incoming || []) {
      const matches = out.filter(old => isoDate(old.date) === row.date && key(old.opponent) === key(row.opponent));
      const prior = matches.find(x => x.gameUrl) || matches[0] || {};
      if (matches.length) {
        for (let i=out.length-1;i>=0;i--) if (matches.includes(out[i])) out.splice(i,1);
      }
      // A verified bracket result supersedes an outdated schedule row but preserves its source link.
      out.push({...prior, ...row, gameUrl:prior.gameUrl || row.gameUrl, gameId:prior.gameId || row.gameId});
    }
    return out.sort((a,b) => isoDate(a.date).localeCompare(isoDate(b.date)) || key(a.opponent).localeCompare(key(b.opponent)));
  }
  function mergeCurrent(team, data, payload) {
    const fresh = gamesForTeam(payload, team, false);
    return {...(data || {}), schedule:mergeRows(data?.schedule, fresh)};
  }
  function mergeHistory(pageData, team, payload) {
    if (!pageData || typeof pageData !== 'object') return pageData;
    const incoming = gamesForTeam(payload, team, true).map(g => ({
      date:Number(g.date.slice(5,7))+'/'+Number(g.date.slice(8,10))+'/2026',
      opponent:g.opponent.toUpperCase(), teamScore:g.teamScore, opponentScore:g.opponentScore,
      result:g.result, playoff:true,
      notes:(g.playoffClass+' '+g.playoffRound).trim()
    }));
    if (!incoming.length) return pageData;
    const schedules = {...(pageData.schedules || {})};
    schedules['2026'] = mergeRows(schedules['2026'], incoming);
    pageData.schedules = schedules;
    // Recalculate only the current-year row; historic seasons and career records remain intact.
    const games = schedules['2026'].filter(g => ['W','L','T'].includes(g.result) && valid(g.teamScore) && valid(g.opponentScore));
    const wins = games.filter(g => g.result === 'W').length;
    const losses = games.filter(g => g.result === 'L').length;
    const ties = games.filter(g => g.result === 'T').length;
    const pf = games.reduce((n,g) => n+Number(g.teamScore),0);
    const pa = games.reduce((n,g) => n+Number(g.opponentScore),0);
    const played = wins+losses+ties;
    if (played) {
      const history = Array.isArray(pageData.seasonHistory) ? [...pageData.seasonHistory] : [];
      const idx = history.findIndex(s => Number(s.year) === 2026);
      const old = idx < 0 ? {} : history[idx];
      const updated = {...old,year:2026,wins,losses,ties,games:played,
        winPct:(wins+ties*0.5)/played,pointsFor:pf,pointsAgainst:pa,
        ppg:pf/played,papg:pa/played,avgMargin:(pf-pa)/played};
      if (idx >= 0) history[idx] = updated; else history.push(updated);
      pageData.seasonHistory = history;
    }
    return pageData;
  }
  window.RUSPlayoff2026 = {load, gamesForTeam, mergeRows, mergeCurrent, mergeHistory, isoDate, key};
})();
