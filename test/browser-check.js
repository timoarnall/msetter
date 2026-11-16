// Opens the app in WebKit (Safari's engine) and Chrome, clicks through it, and reports errors and sizes.
// Needs Playwright and Google Chrome: npm install playwright, then
//   node test/browser-check.js [screenshot folder]
// Fails when no browser could start, so a missing browser never reads as a pass.
const { webkit, chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'index.html');
const out = process.argv[2];

async function launch(name, type) {
  try { return await type.launch(); } catch (e) { /* fall through */ }
  if (name === 'chromium') { try { return await type.launch({ channel: 'chrome' }); } catch (e) { /* fall through */ } }
  return null;
}

(async () => {
  let failed = 0, ran = 0;
  for (const [name, type] of [['webkit', webkit], ['chromium', chromium]]) {
    for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
      const browser = await launch(name, type);
      if (!browser) { console.log(`${name} skipped: not installed`); break; }
      ran++;
      const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark', hasTouch: touch });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(url);
      await page.click('[data-set="ladder"]');
      for (const t of ['buttons', 'screen', 'look', 'files', 'shooting', 'flash', 'camera', 'all', 'exposure']) await page.click(`#themes [data-theme="${t}"]`);
      await page.click('.pick.ladder');                       // opens a menu
      const menuShown = await page.locator('.pop').count();
      await page.keyboard.press('Escape');
      const menuClosed = !(await page.locator('.pop').count());
      await page.click('.body [data-ctl="top"]');             // the top button on the drawing opens its jobs
      await page.click('.pop .act');                          // Try it: in this set the top button switches profiles
      const listShown = await page.locator('.screen .panel').count();
      await page.click('.job[data-code="D191"]');             // the list under the drawing opens the FN jobs
      const jobsShown = await page.locator('.pop [role="option"]').count();
      await page.keyboard.press('Escape');
      const result = await page.evaluate(() => ({
        sideways: document.documentElement.scrollWidth > innerWidth,
        rows: document.querySelectorAll('.glabel').length,
        files: ProfileMaker.state.targets.map(t => Engine.check(Engine.parse(Engine.serialize(ProfileMaker.prepare(t).doc))).length)
      }));
      const ok = !errors.length && !result.sideways && menuShown && menuClosed && listShown && jobsShown > 3 && result.files.every(n => n === 0);
      if (!ok) failed++;
      console.log(`${name} ${w}px`, ok ? 'ok' : 'FAILED', JSON.stringify({ ...result, menuShown, menuClosed, listShown, jobsShown, errors }));
      if (out) await page.screenshot({ path: path.join(out, `${name}-${w}.png`) });
      await browser.close();
    }
  }
  if (!ran) { console.log('FAILED: no browser could start'); process.exit(1); }
  process.exit(failed ? 1 : 0);
})();
