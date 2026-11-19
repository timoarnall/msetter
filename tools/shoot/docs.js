// Every picture on the project page and in the README, made from the live app: GIFs of the app in use, in light and
// dark, recorded in slow motion and played at true speed (engine.js), and stills. Run after any change the pictures
// show; tools/publish_public.sh refuses when the pictures are older than the app (site/images/stamp.txt).
//   node tools/shoot/docs.js <app url> [scene ...]      default: every scene, into site/images/
const E = require('./engine.js');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const URL = process.argv[2] || 'http://127.0.0.1:8094/index.html', ONLY = process.argv.slice(3);
const OUT = process.env.SHOOT_OUT || path.join(ROOT, 'site', 'images');
const W = 1440, H = 900;

const fresh = async (scheme, o) => E.open(URL, Object.assign({ width: W, height: H, scheme }, o || {}));
const setup = async (r, ids, theme) => { await r.page.evaluate(([ids, theme]) => { ids.forEach(id => App.addFromLibrary(id)); App.st.theme = theme; App.save(); App.render(); scrollTo(0, 0); document.querySelector('#main').scrollTop = 0; }, [ids, theme]); await r.page.waitForTimeout(900); };  // the rows have risen in
const option = (r, text) => r.page.locator('.pop button[role="option"]', { hasText: text }).first();
const pickIn = async (r, ctl, text) => { await r.click(ctl, 520); await r.sleep(380); await r.click(option(r, text), 420); };
const area = async (r, sel, pad, maxH) => { const b = await r.box(sel); return { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(W - Math.max(0, b.x - pad), b.width + 2 * pad), height: Math.min(maxH || H, b.height + 2 * pad) }; };
const save = (name, shots, width) => { const f = path.join(OUT, name); const n = E.gif(shots, f, { width: width || 1200 }); console.log(name, Math.round(n / 1024) + ' KB'); };

const SCENES = {
  // Adding profiles from the library: each card flies into its slot, the library row ticks, the notice names it.
  async 'adding-profiles'(scheme) {
    const r = await fresh(scheme);
    await setup(r, [], 'sets');
    const clip = { x: 220, y: 0, width: W - 220, height: H };
    await r.start(clip); await r.sleep(500);
    for (const id of ['looks-0', 'looks-2', 'looks-1', 'looks-3']) {  // the first group sits in view with the cards, so each fly-in is seen
      await r.click('#main [data-libadd="' + id + '"]', 600); await r.sleep(900);
    }
    await r.glide(W - 200, 120, 600); await r.sleep(1600);
    save('adding-profiles-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // Reordering profiles: a card dragged by its number to another slot; the others make way.
  async 'reordering-profiles'(scheme) {
    const r = await fresh(scheme);
    await setup(r, ['looks-0', 'motion-0', 'mono-1', 'architecture-0'], 'sets');
    const clip = await area(r, '#main [data-pcards]', 16);
    await r.start(clip); await r.sleep(500);
    const a = await r.center('#main .pcard:not(.blank) >> nth=0'), b = await r.center('#main .pcard:not(.blank) >> nth=2');
    await r.drag({ x: a.x, y: a.y - 30 }, { x: b.x, y: b.y - 30 }, 1100, 260); await r.sleep(700);
    const c = await r.center('#main .pcard:not(.blank) >> nth=3'), d = await r.center('#main .pcard:not(.blank) >> nth=0');
    await r.drag({ x: c.x, y: c.y - 30 }, { x: d.x, y: d.y - 30 }, 1100, 260); await r.sleep(1400);
    save('reordering-profiles-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // Favorites: a part set picked for a fuller page, an item added from the menu, then dragged to the top; the pretend
  // camera screen beside it shows the page as the camera will.
  async 'favorites'(scheme) {
    const r = await fresh(scheme);
    await setup(r, [], 'menus');
    await r.page.click('#main [data-part="jpg"]'); await r.page.waitForTimeout(400); await r.page.evaluate(() => { const n = document.querySelector('#notice'); if (n) n.classList.remove('show'); });
    const clip = await area(r, '#main .favsplit', 16, 560);  // the pretend camera screen and the list beside it
    await r.start(clip); await r.sleep(500);
    for (const k of [1, 3]) {
      await r.click('#main [data-editor="D1A9"] [data-add-menu]', 600); await r.sleep(400);
      await r.click(r.page.locator('.pop button[role="option"]:not([disabled])').nth(k), 450); await r.sleep(700);
    }
    const items = r.page.locator('#main [data-editor="D1A9"] .favitem .grip'), n = await items.count();
    await r.drag(items.nth(n - 1), items.nth(0), 1500, 260); await r.sleep(1800);
    save('favorites-' + scheme + '.gif', await r.stop(), 1100); await r.close();
  },
  // Typing: the artist and the copyright typed in, each ticking after its field, framed on the two fields.
  async 'typing'(scheme) {
    const r = await fresh(scheme);
    await setup(r, ['looks-0', 'motion-0', 'mono-1'], 'camera');
    const artist = r.page.locator('#main .field input[aria-label^="Artist"]').first();
    await artist.evaluate(el => el.scrollIntoView({ block: 'center' })); await r.page.waitForTimeout(300);
    const a = await artist.boundingBox();
    const clip = { x: 220, y: Math.max(0, a.y - 150), width: W - 220, height: 300 };
    await r.start(clip); await r.sleep(500);
    await r.click(artist, 650); await r.type('JO SMITH', 95); await r.key('Enter'); await r.sleep(900);  // Enter keeps the page still
    await r.click('#main .field input[aria-label^="Copyright"]', 600); await r.type('(C) JO SMITH 2026', 75); await r.key('Enter'); await r.sleep(900);
    await r.click('#main .toggle[aria-label^="Copyright in files"]', 650); await r.sleep(2400);  // without it the copyright never reaches a picture
    save('typing-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // Renaming: a profile's name typed over in the table; the tick after the name, then its dot.
  async 'renaming'(scheme) {
    const r = await fresh(scheme);
    await setup(r, ['looks-0', 'motion-0', 'mono-1', 'architecture-0'], 'exposure');
    const clip = await area(r, '#main .grid', 8, 260);
    await r.start(clip); await r.sleep(500);
    await r.click('#main input[data-name] >> nth=1', 600); await r.key('Meta+A'); await r.type('SPRINT', 130); await r.key('Enter');
    await r.click('#main h1', 600); await r.sleep(2600);
    save('renaming-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // A value dragged sideways rolls through its steps; then a bar breaks into a tile for each profile.
  async 'values'(scheme) {
    const r = await fresh(scheme);
    await setup(r, ['looks-0', 'motion-0', 'mono-1'], 'exposure');
    const clip = await area(r, '#main .grid', 8, 520);
    await r.start(clip); await r.sleep(500);
    const ladder = r.page.locator('#main .pick.ladder[data-p]:not([data-p="all"])').first(), lb = await ladder.boundingBox();
    await r.glide(lb.x + 30, lb.y + lb.height / 2, 600); await r.sleep(200); await r.page.mouse.down(); await r.sleep(200);
    await r.glide(lb.x + 30 + 120, lb.y + lb.height / 2, 1400); await r.sleep(150); await r.glide(lb.x + 30 + 40, lb.y + lb.height / 2, 900); await r.page.mouse.up(); await r.sleep(1500);
    await pickIn(r, '#main .gcell.wide .pick[data-kind="pick"] >> nth=0', 'Set per profile'); await r.sleep(1600);
    save('values-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // Screen layouts: switches turned on, and the pretend camera screen showing each layout.
  async 'screen-layouts'(scheme) {
    const r = await fresh(scheme);
    await setup(r, [], 'screen');
    await r.page.locator('#main [data-editor="D15E"]').scrollIntoViewIfNeeded();
    const clip = { x: 220, y: 0, width: W - 220, height: H };
    await r.start(clip); await r.sleep(500);
    for (const [li, k] of [[1, 'grid'], [1, 'horizon'], [2, 'histo'], [2, 'clip'], [3, 'peak']]) {
      await r.click('#main [data-editor="D15E"] .layout >> nth=' + li + ' >> button[data-k="' + k + '"]', 480); await r.sleep(500);
    }
    await r.sleep(1200);
    save('screen-layouts-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  },
  // Save: the list of changes, each camera's file ticking in as it is made, then Saved with its tick.
  async 'save'(scheme) {
    const r = await fresh(scheme);
    await setup(r, ['looks-0', 'motion-0', 'mono-1'], 'exposure');
    await r.page.evaluate(() => { const p = App.profiles(); App.remember(); App.setRow(App.rowOf('D00C'), p[1], App.options('D00C')[3].v); App.changed(); });
    await r.page.waitForTimeout(300);
    const clip = { x: 0, y: 0, width: W, height: H };
    await r.start(clip); await r.sleep(500);
    await r.click('#topbar [data-count]', 700); await r.sleep(900);
    for (const m of ['M11-P', 'M-EV1']) { await r.click(r.page.locator('.sheet .chips button', { hasText: new RegExp('^' + m + '$') }).first(), 550); await r.sleep(500); }
    await r.sleep(600);
    const all = r.page.locator('.sheet [data-save="all"], .sheet .btn.primary').first();
    if (await all.count()) { await r.click(all, 700); await r.sleep(2600); }
    save('save-' + scheme + '.gif', await r.stop(), 1200); await r.close();
  }
};

const STILLS = {
  async stills(scheme) {
    for (const [name, theme, ids, w, h, sel] of [
      ['profiles', 'sets', ['looks-0', 'motion-0', 'mono-1', 'architecture-0'], W, H, null],
      ['table', 'exposure', ['looks-0', 'motion-0', 'mono-1', 'architecture-0'], W, H, null],
      ['buttons', 'buttons', ['looks-0', 'motion-0'], W, H, null],
      ['phone', 'exposure', ['looks-0', 'motion-0', 'mono-1', 'night-1', 'travel-1', 'architecture-0'], 390, 844, null]
    ]) {
      const r = await E.open(URL, { width: w, height: h, scheme, cursor: false, touch: w < 500 });
      await setup(r, ids, theme); await r.page.evaluate(() => { const n = document.querySelector('#notice'); if (n) n.classList.remove('show'); }); await r.page.waitForTimeout(700);  // a still shows the page, not a passing notice
      await r.page.screenshot({ path: path.join(OUT, 'still-' + name + '-' + scheme + '.png') });
      console.log('still-' + name + '-' + scheme + '.png');
      await r.close();
    }
  }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = Object.assign({}, SCENES, STILLS);
  for (const [name, fn] of Object.entries(all)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    for (const scheme of (process.env.SHOOT_SCHEMES || 'light,dark').split(',')) await fn(scheme);
  }
  // The pictures' stamp: the app's own files they were made from, so publishing can tell when they are older.
  const h = crypto.createHash('sha256');
  ['index.html'].concat(fs.readdirSync(path.join(ROOT, 'src')).sort().map(f => 'src/' + f)).forEach(f => h.update(fs.readFileSync(path.join(ROOT, f))));
  if (!ONLY.length) fs.writeFileSync(path.join(OUT, 'stamp.txt'), h.digest('hex').slice(0, 16) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
