// Design rule 11, measured on the drawn page: a value is one line. After real changes to a tile, a bar, a switch, a typed
// field and a profile's name, the tick (while it shows) and the red dot never overlap the value's lettering, the linked
// dots or a switch; they sit on the value's line; no name or value is cut; and no tick is left once its time is up.
// The owner's screenshot of 2026-11-19 (a tick over "1/2000") is the first case. Chrome and WebKit, wide and phone,
// four and six profiles, dark and light.
// Run with the app served: node test/marks.js [url]. Prints PASS or FAIL per case; exits 1 on any FAIL.
const { chromium, webkit } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8094/index.html';
let failed = 0;
const out = (ok, what, detail) => { if (!ok) failed++; console.log((ok ? 'PASS  ' : 'FAIL  ') + what + (ok || !detail ? '' : '  -- ' + detail)); };

// Every mark on the page against its own value's lettering, the linked dots and a switch: overlap in px², and how far
// the mark's middle is from its line's middle.
const MEASURE = () => {
  const hits = [], area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  document.querySelectorAll('#main .mk').forEach(mk => {
    const m = [...mk.querySelectorAll('svg.tick, .mark')].find(x => x.getBoundingClientRect().width > 0); if (!m) return;  // the tick while it shows, else the dot
    const rm = m.getBoundingClientRect(), host = mk.closest('.pick, .toggle-wrap, .field, .pfield');
    const v = host.querySelector('.v'), inp = host.querySelector('input'), sw = host.querySelector('.toggle'), link = host.querySelector('svg.all');
    let text = null;
    if (v) { const r = document.createRange(); r.selectNodeContents(v); text = [...r.getClientRects()]; }
    else if (inp) text = [inp.getBoundingClientRect()];
    const what = (m.matches('svg') ? 'tick' : 'dot') + ' on ' + (host.querySelector('[aria-label]') || host).getAttribute('aria-label');
    let o = 0; (text || []).forEach(t => { o += area(t, rm); });
    if (link) o += area(link.getBoundingClientRect(), rm);
    if (sw) o += area(sw.getBoundingClientRect(), rm);
    const line = (text && text[text.length - 1]) || (sw && sw.getBoundingClientRect());
    const dy = line ? Math.abs((rm.top + rm.bottom) / 2 - (line.top + line.bottom) / 2) : 0;
    if (o > 0.5 || dy > 3) hits.push(what + ': overlap ' + Math.round(o) + ' px², ' + Math.round(dy) + ' px off its line');
  });
  return hits;
};
const CUT = () => [...document.querySelectorAll('#main .pfield input, #main .gcell .pick .v')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.value || el.textContent);
const TICKS = () => document.querySelectorAll('#main .mk svg.tick').length;

async function run(browserType, name) {
  let browser; try { browser = await (browserType === chromium ? chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch()) : browserType.launch()); }
  catch (e) { out(false, name + ': browser starts', e.message.split('\n')[0]); return; }
  const cases = [[1440, 900, 'dark', 4], [1440, 900, 'light', 6], [390, 844, 'dark', 6], [390, 844, 'light', 4]];
  for (const [w, h, scheme, n] of cases) {
    const label = `${name} ${w} ${scheme}, ${n} profiles`;
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 500 })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.App && App.st && App.st.doc);
    await page.evaluate(n => { ['looks-0', 'motion-0', 'mono-1', 'experimental-4', 'architecture-0', 'travel-1'].slice(0, n).forEach(id => App.addFromLibrary(id)); App.st.theme = 'exposure'; App.save(); App.render(); }, n);
    await page.waitForTimeout(400);
    const after = async (what) => {
      await page.waitForTimeout(300);  // the tick is drawing
      const t = await page.evaluate(MEASURE), ticking = await page.evaluate(TICKS);
      out(ticking > 0, label + ': ' + what + ' ticks', 'no tick drawn');
      out(!t.length, label + ': ' + what + ', tick on its line, over nothing', t.join('; '));
    };
    // 1. a tile (the screenshot): a value in one profile, from its menu
    const tile = page.locator('#main .gcell:not(.wide) .pick[data-kind="pick"]').first();
    if (await tile.count()) { await tile.click(); await page.locator('.pop button[role="option"]:not(.hi)').nth(2).click(); await after('a tile'); }
    // 2. a bar: a value every profile shares
    const bar = page.locator('#main .gcell.wide .pick[data-kind="pick"]').first();
    if (await bar.count()) { await bar.click(); await page.locator('.pop button[role="option"]:not(.hi)').nth(1).click(); await after('a bar'); }
    // 3. a switch
    const sw = page.locator('#main .toggle[data-kind="toggle"]').first();
    if (await sw.count()) { await sw.click(); await after('a switch'); }
    // 4. a profile's name
    const nm = page.locator('#main input[data-name]').nth(Math.min(1, n - 1));
    await nm.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.type('Sprint'); await page.keyboard.press('Enter'); await page.locator('#main h1').click();
    await after('a name');
    // 5. a typed field, on the Camera page
    await page.evaluate(() => { App.st.theme = 'camera'; App.save(); App.render(); }); await page.waitForTimeout(200);
    const tf = page.locator('#main .field input[data-kind="text"][aria-label^="Artist"]').first();
    if (await tf.count()) { await tf.click(); await page.keyboard.type('Jo Smith'); await page.locator('#main h1').click(); await after('a typed field'); }
    // after the ticks' time: none left, every dot on its line over nothing, nothing cut, on every section
    await page.waitForTimeout(2600);
    out(await page.evaluate(TICKS) === 0, label + ': no tick left', 'ticks still showing');
    for (const theme of ['exposure', 'buttons', 'screen', 'look', 'shooting', 'camera']) {
      await page.evaluate(t => { App.st.theme = t; App.save(); App.render(); }, theme); await page.waitForTimeout(80);
      const d = await page.evaluate(MEASURE), c = await page.evaluate(CUT);
      out(!d.length, label + ': ' + theme + ', every dot on its line over nothing', d.join('; '));
      out(!c.length, label + ': ' + theme + ', nothing cut', c.join(', '));
      const under = await page.evaluate(() => { const h = document.querySelector('#main h1'), n = h && h.nextElementSibling; return n && n.tagName === 'P' ? n.textContent : ''; });
      out(!under, label + ': ' + theme + ', the title stands alone', under);  // design rule 6b
    }
    out(!errors.length, label + ': no page errors', errors.join('; '));
    await page.context().close();
  }
  await browser.close();
}

(async () => {
  await run(chromium, 'chrome');
  await run(webkit, 'webkit');
  console.log(failed ? failed + ' failed' : 'every mark on its line, nothing cut');
  process.exit(failed ? 1 : 0);
})();
