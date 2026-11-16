// One step of a pretend user session, for naive-user passes run by agents: each agent gets a goal and only screenshots.
// Replays every earlier step from a fresh page, runs the new one, then saves a screenshot.
// Screenshot pixels are page pixels, so click(x, y) hits what you see.
//
//   node test/pretend-user.js <session-folder> "<action>"     run one more action and take a screenshot
//   node test/pretend-user.js <session-folder> --look          screenshot only, no new action
//   node test/pretend-user.js <session-folder> --drop          remove the last action
//
// Needs Playwright and Google Chrome (NODE_PATH as in browser-check.js). Serve the page with a local server first.
// Python's http.server drops requests when several agents load pages at once, which shows up as
// "Engine is not defined" or "Design is not defined"; that is the server, not the app.
//
// Settings come from <session-folder>/session.json: { "url": "...", "width": 1440, "height": 900, "touch": false, "file": "/path/for/file/pickers" }
// In an action you can use: page, tap(x, y), click(x, y), hold(x, y, ms), hover(x, y), type(text), key(name), scroll(dy, x, y), wait(ms)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = path.resolve(process.argv[2]);
  const arg = process.argv[3] || '--look';
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'session.json'), 'utf8'));
  const logFile = path.join(dir, 'actions.json');
  const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
  if (arg === '--drop') { log.pop(); fs.writeFileSync(logFile, JSON.stringify(log, null, 1)); console.log('dropped; ' + log.length + ' actions left'); return; }
  const fresh = arg !== '--look' ? arg : null;

  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: cfg.width, height: cfg.height }, hasTouch: !!cfg.touch, isMobile: false,
    colorScheme: cfg.scheme || 'dark', acceptDownloads: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], saved = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
  page.on('filechooser', fc => { if (cfg.file) fc.setFiles(cfg.file); });
  page.on('download', async d => { const p = path.join(dir, 'downloads', d.suggestedFilename()); fs.mkdirSync(path.dirname(p), { recursive: true }); await d.saveAs(p); saved.push(d.suggestedFilename()); });
  await page.goto(cfg.url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);

  const api = {
    page,
    tap: (x, y) => cfg.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y),
    click: (x, y) => page.mouse.click(x, y),
    hold: async (x, y, ms) => { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(ms || 800); await page.mouse.up(); },
    hover: (x, y) => page.mouse.move(x, y),
    type: t => page.keyboard.type(t),
    key: k => page.keyboard.press(k),
    scroll: async (dy, x, y) => { await page.mouse.move(x || cfg.width / 2, y || cfg.height / 2); await page.mouse.wheel(0, dy); },
    wait: ms => page.waitForTimeout(ms)
  };
  const run = async (code) => { const fn = new Function(...Object.keys(api), 'return (async () => {' + code + '\n})();'); await fn(...Object.values(api)); await page.waitForTimeout(250); };

  for (const a of log) { try { await run(a); } catch (e) { /* earlier steps may have failed silently */ } }
  if (fresh) {
    try { await run(fresh); log.push(fresh); fs.writeFileSync(logFile, JSON.stringify(log, null, 1)); }
    catch (e) { console.log('ACTION FAILED (not kept): ' + e.message.split('\n')[0]); }
  }
  await page.waitForTimeout(300);
  const n = String(log.length).padStart(2, '0');
  const shot = path.join(dir, 'step-' + n + '.png');
  await page.screenshot({ path: shot, fullPage: false });
  const scroll = await page.evaluate(() => ({ pageHeight: document.documentElement.scrollHeight, scrollY: scrollY }));
  console.log('screenshot: ' + shot);
  console.log('page height ' + scroll.pageHeight + ', scrolled ' + scroll.scrollY);
  if (saved.length) console.log('files saved this replay: ' + saved.join(', ') + ' (in ' + path.join(dir, 'downloads') + ')');
  if (errors.length) console.log('page errors: ' + errors.join(' | '));
  await browser.close();
})();
