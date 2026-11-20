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
  assert.equal(await dialog.getByRole('link',{name:'Full season recap'}).getAttribute('href'), 'season-recap.html?year=1945');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  await page.goto(origin+'/season-recap.html?year=1971');
  await page.getByRole('heading',{name:'1971 Season Recap'}).waitFor();
  const region = page.locator('.region').filter({has:page.getByRole('heading',{name:'Region 2',exact:true})}).filter({has:page.getByRole('link',{name:'EAST',exact:true})});
  await region.waitFor();
  assert.equal(await region.locator('tbody tr').count(),11);
  const playoff = page.locator('#recapPlayoffs details').filter({has:page.getByText('3A playoffs',{exact:true})});
  await playoff.waitFor();
  assert.match(await playoff.textContent(), /Viewmont12Layton10/i);
  assert.match(await playoff.textContent(), /Semifinals/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.locator('#year').selectOption('1942');
  await page.getByText('No state playoffs were held this season.').waitFor();
  await page.locator('#year').selectOption('2026');
  await page.locator('#recapPlayoffs details summary').first().waitFor();
  await page.locator('.region tbody tr').first().waitFor();
  assert(await page.locator('#recapPlayoffs details').count() >= 7);
  const nav = page.locator('nav .rus-nav');
  assert.equal(await nav.locator(':scope > a[href="season-recap.html"]').count(),0);
  const history = nav.locator('details').filter({has:page.locator('summary').filter({hasText:'History'})});
  assert.equal(await history.locator('a[href="season-recap.html"]').count(),1);
  const bracket = page.locator('#recapPlayoffs details').first();
  assert.match(await bracket.locator('summary').innerText(),/6A/);
  const headings = await bracket.locator('h4').allTextContents();
  assert.match(headings[0], /First Round/);
  assert.match(headings.at(-1), /Championship/);
  assert.equal(await bracket.locator('.recap-wire').count(),14);
  const championSlot = bracket.locator('.recap-round').last();
  const skyridge = championSlot.locator('.rus-school-label',{hasText:'Skyridge'});
  const canyon = championSlot.locator('.rus-school-label',{hasText:'Corner Canyon'});
  const ink = el=>getComputedStyle(el).color;
  assert.equal(await skyridge.evaluate(ink),'rgb(204, 204, 204)');
  assert.equal(await canyon.evaluate(ink),'rgb(176, 186, 202)');
  const listed = page.locator('.region a.rus-school-label',{hasText:'Skyridge'}).first();
  assert.equal(await listed.evaluate(ink),await skyridge.evaluate(ink));
  const weight = el=>Number(getComputedStyle(el).fontWeight);
  assert(await listed.evaluate(weight)>=800);
  assert(await skyridge.evaluate(weight)>=800);
  assert(await listed.locator('xpath=ancestor::tr/td[last()]').evaluate(weight)<800);
  for (const width of [390,1100]) {
    await page.setViewportSize({width,height:844});
    const metrics = await bracket.evaluate(el => {
      const scroll = el.querySelector('.bracket-scroll');
      const columns = [...el.querySelectorAll('.recap-lane')];
      const center = (col,index) => columns[col].children[index].getBoundingClientRect().top;
      return {centred:Math.abs(center(3,0)-(center(2,0)+center(2,1))/2)<2,
        pageFits:document.documentElement.scrollWidth<=window.innerWidth+1,
        scrolls:scroll.scrollWidth>scroll.clientWidth};
    });
    assert(metrics.centred && metrics.pageFits,JSON.stringify(metrics));
    if(width===390) assert(metrics.scrolls);
  }

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
