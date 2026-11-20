// Run against a local static server rooted at the checkout.
const { webkit, devices } = require('playwright');
const assert = require('node:assert/strict');

async function check(page, origin) {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    return route.abort();
  });
  await page.goto(origin + '/team.html?team=East');
  await page.locator('.rus-team-tab[data-tab="seasons"]').click();
  await page.locator('#historyYearFilter').selectOption('1971');
  const row = page.locator('#historyBody tr');
  await row.scrollIntoViewIfNeeded();
  const markup = await row.evaluate(tr => tr.outerHTML);
  assert.equal(await row.locator('td').count(), 12, markup);
  assert.equal(await row.locator('td').nth(1).innerText(), '3A', markup);
  assert.equal(await row.locator('td').nth(2).innerText(), 'Region 2', markup);
  assert.equal(await row.locator('a').getAttribute('href'), 'https://utah-football.com/s/1971/3areg2.htm');
  const layout = await row.evaluate(tr => {
    const wrap = tr.closest('.history-wrap');
    wrap.scrollLeft = wrap.scrollWidth;
    return {scrolled: wrap.scrollLeft, width: wrap.clientWidth, viewport: window.innerWidth};
  });
  assert(layout.scrolled > 0 && layout.width <= 390 && layout.viewport === 390, JSON.stringify(layout));
  assert(await page.locator('.rus-alignment-subtitle').count() > 0);
  await page.locator('#historyYearFilter').selectOption('1972');
  assert.match(await row.innerText(), /4A\s+Region 3/);

  await page.goto(origin + '/teams.html');
  await page.locator('#historicalTeams summary').click();
  await page.getByRole('link', {name: 'Granite', exact: true}).click();
  await page.getByRole('heading', {name: 'Seasons', exact: true}).waitFor();
  const older = page.getByRole('link', {name: '1945 ↗', exact: true});
  assert.match(await older.locator('..').locator('..').innerText(), /Class A/);
  const bracketUrl = await older.getAttribute('href');
  await page.goto(new URL(bracketUrl, page.url()).href);
  await page.locator('#bracketGrid .bracket-round').first().waitFor();
  assert.equal(await page.locator('#bracketYear').inputValue(), '1945');
  assert.match(await page.locator('#bracketGrid').innerText(), /Granite/i);
}

(async () => {
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage(devices['iPhone 13']);
    await check(page, 'http://127.0.0.1:8852');
    console.log('iPhone 13 WebKit alignment checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
