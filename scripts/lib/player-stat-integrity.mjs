import fs from 'node:fs';

export const clean = value => String(value ?? '').trim();
export const compact = value => clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
export function numeric(value) {
  const text = clean(value).replace(/,/g, '').replace(/%$/, '');
  const number = Number(text);
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) && Number.isFinite(number) ? number : null;
}
export function isoDate(value) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}` : text.slice(0, 10);
}
const schoolAliases = {
  CEDAR:'CEDARCITY', GRANDCOUNTY:'GRAND', GUNNISON:'GUNNISONVALLEY',
  MONUMENTVAL:'MONUMENTVALLEY', MAPLEMTN:'MAPLEMOUNTAIN', STJOSEPH:'SAINTJOSEPH',
  JUANDIEGOCATHOLIC:'JUANDIEGO', JUDGEMEMORIALCATHOLIC:'JUDGEMEMORIAL',
  AMERICANLEADERSHIPACADEMY:'ALA', AMERICANLEADERSHIP:'ALA',
  LAYTONCHRISTIANACADEMY:'LAYTONCHRISTIAN',
  UTAHMILITARYACADEMYCAMPWILLIAMS:'UMALEHI', UTAHMILITARYCAMPWILLIAMS:'UMALEHI',
  UTAHMILITARYACADEMYHILLFIELD:'UMAHILLFIELD', UTAHMILITARYHILLFIELD:'UMAHILLFIELD',
  MATERACADEMYNV:'MATERACADEMYEASTLASVEGAS'
};
export const canonTeam = value => {
  const key = compact(clean(value).replace(/\s*,\s*[A-Z]{2}$/i, ''));
  return schoolAliases[key] || key;
};
export function categoryKey(value) {
  const key = compact(value);
  if (['DEFENSE','DEFENSESPECIALTEAMS','DEFENSIVESTATISTICS','TACKLES','SACKS','TOUCHDOWNS'].includes(key)) return 'DEFENSESPECIALTEAMS';
  if (['PATSANDFIELDGOALS','FIELDGOALS'].includes(key)) return 'KICKING';
  return key;
}
export function fieldKey(category, value) {
  const key = compact(value);
  if (categoryKey(category) === 'DEFENSESPECIALTEAMS') {
    if (['PASSINT','INTERCEPTIONS','INTS'].includes(key)) return 'PASSINT';
    if (['DEFENSETD','DEFENSIVETD','TD'].includes(key)) return 'DEFENSETD';
    if (['RETURNTD','RETURNTDS'].includes(key)) return 'RETURNTD';
  }
  return key === 'POINTS' ? 'PTS' : key;
}
const playerAliases = JSON.parse(fs.readFileSync(new URL('../../player-stat-aliases-2026.json', import.meta.url), 'utf8'));
const nameKey = value => compact(clean(value).replace(/\s*\((?:Fr|So|Jr|Sr)\.?\)$/i, ''));
// Unique full name or explicit, school-scoped alias; never jersey number alone.
export function matchPlayer(players, incoming, team = '') {
  const unique = [...new Map(players.map(p => [p.playerId || `${nameKey(p.name)}|${clean(p.number)}`, p])).values()];
  if (incoming.playerId) {
    const ids = unique.filter(p => p.playerId === incoming.playerId);
    if (ids.length === 1) return ids[0];
  }
  const names = new Set([nameKey(incoming.name)]);
  for (const alias of playerAliases) {
    if (canonTeam(alias.team) === canonTeam(team) && alias.names.some(n => names.has(nameKey(n))))
      alias.names.forEach(n => names.add(nameKey(n)));
  }
  const exact = unique.filter(p => names.has(nameKey(p.name)));
  if (exact.length === 1) return exact[0];
  // Initial-only source names require both surname and jersey, and no ambiguity.
  const bits = clean(incoming.name).split(/\s+/);
  if (bits.length > 1 && /^[A-Z]\.?$/i.test(bits[0]) && clean(incoming.number)) {
    const hits = unique.filter(p => clean(p.number) === clean(incoming.number) &&
      nameKey(p.name.split(/\s+/).at(-1)) === nameKey(bits.at(-1)) &&
      nameKey(p.name)[0] === nameKey(bits[0]));
    if (hits.length === 1) return hits[0];
  }
  return null;
}
// A failed or empty parse must never erase an independently fetched component.
export function preserveTeamComponents(previous = {}, incoming = {}) {
  const result = {...previous, ...incoming};
  const preserved = [];
  for (const component of ['roster','stats']) {
    const hasRows = value => component === 'stats' ? value?.some(s => s.rows?.length) : value?.length;
    if ((!incoming[`${component}Fetched`] || !hasRows(incoming[component])) && hasRows(previous[component])) {
      result[component] = structuredClone(previous[component]);
      preserved.push(component);
    }
  }
  if (!preserved.includes('stats') && incoming.stats?.length) {
    result.stats = structuredClone(incoming.stats);
    for (const oldSection of previous.stats || []) {
      let section = result.stats.find(s => categoryKey(s.category) === categoryKey(oldSection.category));
      if (!section) { result.stats.push(structuredClone(oldSection)); continue; }
      for (const oldRow of oldSection.rows || []) {
        const row = matchPlayer(section.rows || [], oldRow, incoming.team || previous.team);
        if (!row) { (section.rows ||= []).push(structuredClone(oldRow)); continue; }
        for (const [header, value] of Object.entries(oldRow.values || {})) {
          const key = Object.keys(row.values || {}).find(k => fieldKey(section.category, k) === fieldKey(section.category, header)) || header;
          if (clean(row.values?.[key]) === '' && clean(value) !== '') {
            (row.values ||= {})[key] = value;
            if (oldRow.statSources?.[header]) (row.statSources ||= {})[key] = oldRow.statSources[header];
          }
        }
      }
    }
  }
  result.sourceStatus = {preservedComponents:preserved, statsObservedAt:preserved.includes('stats') ? previous.sourceStatus?.statsObservedAt || null : incoming.statsFetched && incoming.stats?.length ? new Date().toISOString() : null};
  return result;
}
export function atomicJSON(file, data) {
  const temporary = `${file}.tmp-${process.pid}`;
  try { fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

export function mergeSourceGameRows(previous, incoming) {
  const result = structuredClone(previous || []);
  for (const game of incoming || []) {
    const index = result.findIndex(old => old.playerId === game.playerId && isoDate(old.date) === isoDate(game.date) && canonTeam(old.opponent) === canonTeam(game.opponent));
    if (index < 0) { result.push(structuredClone(game)); continue; }
    const old = result[index], next = structuredClone(game);
    for (const oldLine of old.statLines || []) {
      let line = (next.statLines || []).find(l => categoryKey(l.category) === categoryKey(oldLine.category));
      if (!line) { (next.statLines ||= []).push(structuredClone(oldLine)); continue; }
      for (const [header, value] of Object.entries(oldLine.values || {})) {
        const key = Object.keys(line.values || {}).find(h => fieldKey(line.category, h) === fieldKey(oldLine.category, header)) || header;
        if (clean(line.values?.[key]) === '' && clean(value) !== '') (line.values ||= {})[key] = value;
      }
    }
    result[index] = next;
  }
  return result;
}

// Collapse duplicate category/field cells before any page, award or record
// consumer can sum them. Keep contradictory source values as explicit unknowns.
export function normalizePlayerStatLines(player) {
  const categories = new Map();
  for (const incoming of player.statLines || []) {
    const category = categoryKey(incoming.category);
    let line = categories.get(category);
    if (!line) { line = {category:category === 'DEFENSESPECIALTEAMS' ? 'Defense/Special Teams' : category === 'KICKING' ? 'Kicking' : incoming.category,values:{},statSources:{}}; categories.set(category,line); }
    for (const [header,value] of Object.entries(incoming.values || {})) {
      const field = fieldKey(category,header), target = Object.keys(line.values).find(k => fieldKey(category,k) === field) || header;
      const current = line.values[target], source = incoming.statSources?.[header] || '', oldSource = line.statSources[target] || '';
      if (clean(value) === '') continue;
      const trusted = /manual|verified/i.test(source), oldTrusted = /manual|verified/i.test(oldSource);
      if (line.statConflicts?.[target] && !trusted) continue;
      if (clean(current) !== '' && clean(current) !== clean(value) && !(numeric(current) !== null && numeric(current) === numeric(value))) {
        if (trusted && !oldTrusted) { line.values[target] = value; line.statSources[target] = source; continue; }
        if (oldTrusted && !trusted) continue;
        (line.statConflicts ||= {})[target] = [current,value];line.values[target] = '';continue;
      }
      line.values[target] = value;
      if (source) line.statSources[target] = source;
    }
    for (const [header,values] of Object.entries(incoming.statConflicts || {})) {
      if (/manual|verified/i.test(line.statSources[header] || '')) continue;
      (line.statConflicts ||= {})[header] = values;line.values[header] = '';
    }
  }
  player.statLines = [...categories.values()];
  return player;
}

export function gameIdentity(game) {
  for (const value of [game.maxprepsUrl,game.url]) {
    try {
      const url = new URL(value);
      if (url.hostname === 'www.maxpreps.com' && url.searchParams.get('c')) return 'maxpreps:' + url.searchParams.get('c');
      if (url.hostname === 'sports.deseret.com' && /\/football\/game\//.test(url.pathname)) {
        const id = url.pathname.match(/\/(\d+)\/?$/)?.[1];if(id)return 'deseret:' + id;
      }
    } catch {}
  }
  return isoDate(game.date) + '|' + canonTeam(game.opponent);
}
