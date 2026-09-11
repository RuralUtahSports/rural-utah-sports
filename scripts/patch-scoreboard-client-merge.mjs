import fs from 'node:fs';

const refreshPath = 'scoreboard-refresh.js';
const htmlPath = 'scoreboard.html';

const badMerge = `      if (typeof detailMap !== 'undefined' && detailMap?.clear) {
        detailMap.clear();
        for (const [key, value] of Object.entries(payload.games)) detailMap.set(key, value);
        for (const [key, value] of loadedFullDetails) detailMap.set(key, value);
      }`;

const fixedMerge = `      if (typeof detailMap !== 'undefined' && detailMap?.clear) {
        detailMap.clear();
        // Full-game details are a fallback/base only. The compact live feed is
        // newer and authoritative for current score/status, so it must win.
        for (const [key, value] of loadedFullDetails) detailMap.set(key, value);
        for (const [key, value] of Object.entries(payload.games)) detailMap.set(key, value);
      }`;

let changed = false;

if (fs.existsSync(refreshPath)) {
  let source = fs.readFileSync(refreshPath, 'utf8');
  if (source.includes(badMerge)) {
    source = source.replace(badMerge, fixedMerge);
    fs.writeFileSync(refreshPath, source);
    changed = true;
    console.log('Fixed scoreboard live/full-details merge priority.');
  } else if (source.includes(fixedMerge)) {
    console.log('Scoreboard merge priority is already fixed.');
  } else {
    console.warn('Expected scoreboard merge block was not found; no refresh-script edit made.');
  }
}

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const next = html.replace(
    /scoreboard-refresh\.js\?v=20260910-live-refresh-fix\d+/g,
    'scoreboard-refresh.js?v=20260910-live-refresh-fix3'
  );
  if (next !== html) {
    fs.writeFileSync(htmlPath, next);
    changed = true;
    console.log('Bumped scoreboard-refresh.js browser cache version to fix3.');
  }
}

console.log(changed ? 'Scoreboard client patch applied.' : 'Scoreboard client patch already current.');
