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
  const classCell = row.locator('td').nth(1);
  await classCell.scrollIntoViewIfNeeded();
  const cellLayout = await classCell.evaluate(td => {
    const range = document.createRange();
    range.selectNodeContents(td);
    const bounds = range.getBoundingClientRect();
    return {width: bounds.width, height: bounds.height, visibility: getComputedStyle(td).visibility};
  });
  assert(cellLayout.width > 0 && cellLayout.height > 0 && cellLayout.visibility === 'visible', JSON.stringify(cellLayout));
  assert.equal(await classCell.textContent(), '3A', markup);
  assert.equal(await row.locator('td').nth(2).textContent(), 'Region 2', markup);
  const originalUrl = page.url();
  await row.getByRole('button', {name: 'View 1971 season'}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('cell', {name: 'EAST', exact: true}).waitFor();
  assert.equal(await dialog.locator('tbody tr').count(), 11);
  assert.deepEqual(await dialog.locator('.selected-school td').allTextContents(), ['EAST','7-3-0','7-3-0']);
  assert.match(await dialog.innerText(), /3A · Region 2/);
  assert.equal(page.url(), originalUrl);
  assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  await dialog.getByRole('button', {name:'Close'}).click();
  const layout = await row.evaluate(tr => {
    const wrap = tr.closest('.history-wrap');
    wrap.scrollLeft = wrap.scrollWidth;
    return {scrolled: wrap.scrollLeft, width: wrap.clientWidth, viewport: window.innerWidth};
  });
  assert(layout.scrolled > 0 && layout.width <= 390 && layout.viewport === 390, JSON.stringify(layout));
  assert(await page.locator('.rus-alignment-subtitle').count() > 0);
  await page.locator('#historyYearFilter').selectOption('1972');
  assert.deepEqual(await row.locator('td').allTextContents().then(cells => cells.slice(1, 3)), ['4A', 'Region 3']);

  await page.goto(origin + '/teams.html');
  await page.locator('#historicalTeams summary').click();
  await page.getByRole('link', {name: 'Granite', exact: true}).click();
  await page.getByRole('heading', {name: 'Seasons', exact: true}).waitFor();
  await page.getByRole('button', {name: 'View 1945 season'}).click();
  await dialog.getByRole('cell', {name: 'Granite', exact:true}).waitFor();
  assert.match(await dialog.innerText(), /Class A/);
  assert.match(await dialog.innerText(), /Region unverified/);
  assert.equal(await dialog.locator('a').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
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
