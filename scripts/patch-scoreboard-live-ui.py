from pathlib import Path

refresh = Path('scoreboard-refresh.js')
text = refresh.read_text()
anchor = "  const loadedFullDetails = new Map();"
helper = r'''  function normalizeStatusBadges() {
    document.querySelectorAll('#board .status').forEach(node => {
      const raw = clean(node.textContent).replace(/^[\s•]+|[\s•]+$/g, '');
      if (!raw) return;
      const parts = raw.split(/\s*•\s*/).map(clean).filter(Boolean);
      const unique = [];
      for (const part of parts) {
        if (!unique.some(value => value.toUpperCase() === part.toUpperCase())) unique.push(part);
      }
      const normalized = unique.join(' • ');
      if (normalized && normalized !== clean(node.textContent)) node.textContent = normalized;
    });
  }

'''

if 'function normalizeStatusBadges()' not in text:
    if anchor not in text:
        raise SystemExit('scoreboard-refresh anchor not found')
    text = text.replace(anchor, helper + anchor, 1)

old = "      const result = baseRender.apply(this, args);\n      applyRegionFilter();"
new = "      const result = baseRender.apply(this, args);\n      normalizeStatusBadges();\n      applyRegionFilter();"
if new not in text:
    if old not in text:
        raise SystemExit('render wrapper anchor not found')
    text = text.replace(old, new, 1)
refresh.write_text(text)

html = Path('scoreboard.html')
page = html.read_text()
old_tag = 'scoreboard-refresh.js?v=20260904-live-refresh-fix1'
new_tag = 'scoreboard-refresh.js?v=20260910-live-refresh-fix2'
if old_tag in page:
    page = page.replace(old_tag, new_tag)
elif new_tag not in page:
    raise SystemExit('scoreboard cache-bust tag not found')
html.write_text(page)

print('Scoreboard live UI patch verified.')
