// Browser flows: the things a person does that the Node tests can't reach. Runs in Chrome and WebKit (Safari's engine)
// against the page served locally, with localStorage cleared before each flow.
//
//   python3 -m http.server 8094            (in the project folder, in another terminal)
//   NODE_PATH="<a folder whose node_modules holds playwright>" \
//     /opt/homebrew/opt/node@24/bin/node test/flows.js [url]
//
// Prints one PASS, FAIL or KNOWN FAILURE line per check and exits non-zero when any check fails or no browser starts.
// A KNOWN FAILURE is a check the app fails today for a reason named next to it; it does not change the exit code
// (set FLOWS_STRICT=1 to count them). When one starts passing, it prints "PASS (was a known failure)".
// FLOWS_ONLY=<part of a flow's name> runs just the matching flows.
const { webkit, chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'engine.js'));

const URL = process.argv[2] || process.env.FLOWS_URL || 'http://127.0.0.1:8094/index.html';
const STORE = 'profile-maker-v1';
const OFFERED = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msetter-flows-'));
const results = [];

function report(browser, flow, name, ok, detail, known) {
  const status = ok ? (known ? 'PASS (was a known failure)' : 'PASS') : known ? 'KNOWN FAILURE' : 'FAIL';
  results.push({ status, ok, known: !!known });
  console.log(`${status}  ${browser}  ${flow}: ${name}` + (!ok && detail ? `  -- ${detail}` : '') + (!ok && known ? `  [${known}]` : ''));
}

async function launch(name) {
  try { return name === 'chrome' ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch(); }
  catch (e) { console.log(`FAIL  ${name}  launch: ${e.message.split('\n')[0]}`); return null; }
}

// A fresh page with empty storage. Python's http.server can drop a script under load ("Engine is not defined"),
// so a page whose scripts did not all arrive is loaded once more; app errors are never retried away.
async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', acceptDownloads: true }, opts || {}));
  ctx.setDefaultTimeout(8000);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // A browser asks for /favicon.ico by itself; the page names none, so a local server answers 404. Not the app's error.
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const where = (m.location() && m.location().url) || '';
    if (/favicon\.ico$/.test(where)) return;
    errors.push('console: ' + m.text() + (where ? ' (' + where + ')' : ''));
  });
  page.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
  for (let attempt = 0; attempt < 2; attempt++) {
    errors.length = 0;
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    if (await page.evaluate(() => !!window.ProfileMaker)) break;
  }
  return { ctx, page, errors };
}
const ready = page => page.waitForFunction(() => !!window.ProfileMaker);
const pause = (page, ms) => page.waitForTimeout(ms || 120);
const state = (page, fn) => page.evaluate(fn);
const names = page => page.evaluate(() => Engine.profiles(ProfileMaker.state.doc).map(p => Engine.profileName(ProfileMaker.state.doc, p)));
// The design and every file Save would write, as text: two equal snapshots mean the same files.
const snapshot = page => page.evaluate(() => {
  const P = ProfileMaker, st = P.state;
  return JSON.stringify({ doc: Engine.serialize(st.doc), targets: st.targets, files: st.targets.map(t => Engine.serialize(P.prepare(t).doc)) });
});
async function theme(page, id) { await page.click(`#themes [data-theme="${id}"]`); await pause(page, 60); }
async function pickSet(page, id) { await page.click(`#main [data-set="${id}"]`); await pause(page); }
async function noErrors(t, errors) { t('no page errors', !errors.length, errors.slice(0, 3).join(' | ')); }

// ---------- flows ----------
const FLOWS = {
  // Leaving a field fires its change on the press of the next click; the redraw must not lose either value.
  async 'text fields'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'exposure');
    await page.click('#main input[data-name="1"]');
    await page.keyboard.type('Alpha');
    await page.click('#main input[data-name="2"]');
    await page.keyboard.type('Bravo');
    await page.click('#main input[data-name="3"]');
    await pause(page);
    const n = await names(page);
    t('two names typed one after the other are both kept', n[0] === 'Alpha' && n[1] === 'Bravo', JSON.stringify(n));
    const dom = await page.evaluate(() => [1, 2].map(p => document.querySelector(`#main input[data-name="${p}"]`).value));
    t('both name fields still show what was typed', dom[0] === 'Alpha' && dom[1] === 'Bravo', JSON.stringify(dom));
    t('the clicked field keeps the focus', await page.evaluate(() => document.activeElement && document.activeElement.dataset.name === '3'), await page.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 80)));

    // the text settings on the Files page: artist, copyright, file names
    await theme(page, 'files');
    const field = code => `#main input[data-row="${code}"]`;
    await page.click(field('501E')); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('Ann Smith');
    await page.click(field('501F')); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('2026 Ann');
    await page.click(field('D002')); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('ABC');
    await page.click('#main input[data-name="4"]');
    await page.keyboard.type('Dusk');
    await page.click(field('501E'));
    await pause(page);
    const v = await page.evaluate(() => { const S = ProfileMaker.state.doc.S; return { artist: S['501E'][1], copy: S['501F'][1], prefix: S.D002[1], name4: S.D03A[0] }; });
    t('artist, copyright, file names and a name typed in turn are all kept', v.artist === 'Ann Smith' && v.copy === '2026 Ann' && v.prefix === 'ABC' && v.name4 === 'Dusk', JSON.stringify(v));
    const dv = await page.evaluate(() => ['501E', '501F', 'D002'].map(c => document.querySelector(`#main input[data-row="${c}"]`).value));
    t('the text fields still show what was typed', dv.join('|') === 'Ann Smith|2026 Ann|ABC', JSON.stringify(dv));

    // spaces at the ends of a name
    await theme(page, 'exposure');
    await page.click('#main input[data-name="2"]');
    await page.keyboard.type(' Wide ');
    await page.click('#main input[data-name="1"]');
    await pause(page);
    const sp = (await names(page))[1];
    t('a name typed with spaces at the ends is stored without them', sp === 'Wide', JSON.stringify(sp));
    // a name that is already taken
    await page.click('#main input[data-name="3"]');
    await page.keyboard.type('Alpha');
    await page.click('#main input[data-name="1"]');
    await pause(page);
    const dup = await names(page);
    t('renaming to a name another profile has keeps names unique', new Set(dup).size === dup.length, JSON.stringify(dup));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Tab after a rename moves on, and the redraw that the rename causes keeps the focus where Tab put it.
  async 'tab after rename'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'exposure');
    await page.click('#main input[data-name="1"]');
    await page.keyboard.type('Quick');
    await page.keyboard.press('Tab');
    await pause(page, 200);
    const f1 = await page.evaluate(() => ({ name: document.activeElement.dataset.name || null, tag: document.activeElement.tagName }));
    t('the name is kept', (await names(page))[0] === 'Quick', JSON.stringify(await names(page)));
    t('Tab from the first name moves to the second name', f1.name === '2', JSON.stringify(f1));
    // typing goes on in the next field without a click
    await page.keyboard.type('Steady');
    await page.keyboard.press('Tab');
    await pause(page, 200);
    t('typing after Tab renames the next profile', (await names(page))[1] === 'Steady', JSON.stringify(await names(page)));

    // From the last name, Tab leaves the names. Where it goes depends on the browser (Safari skips buttons by default),
    // so the target is where Tab goes from the same field without a rename, when nothing is redrawn.
    const focused = () => page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return 'the page itself';
      const d = a.dataset || {};
      return [a.tagName.toLowerCase(), d.name && 'name=' + d.name, d.row && 'row=' + d.row, d.p && 'p=' + d.p, d.same && 'same=' + d.same, d.ctl && 'ctl=' + d.ctl,
        a.closest('#main') ? 'in main' : a.closest('#cam') ? 'in camera' : 'elsewhere'].filter(Boolean).join(' ');
    });
    const tabFrom = async (p, typed) => {
      await page.click(`#main input[data-name="${p}"]`);
      if (typed) await page.keyboard.type(typed);
      await page.keyboard.press('Tab');
      await pause(page, 200);
      return focused();
    };
    const plain4 = await tabFrom(4, null);
    const after4 = await tabFrom(4, 'Dark');
    t('the last name is kept', (await names(page))[3] === 'Dark', JSON.stringify(await names(page)));
    t('Tab from the last name goes where it goes without a rename', after4 === plain4, `went to ${after4}, without a rename ${plain4}`);

    // one profile: Tab from its name
    await theme(page, 'sets');
    await pickSet(page, 'factory');
    await theme(page, 'exposure');
    const plain1 = await tabFrom(1, null);
    const after1 = await tabFrom(1, 'Solo');
    t('with one profile, the name is kept and Tab goes where it goes without a rename', (await names(page))[0] === 'Solo' && after1 === plain1 && after1 !== 'the page itself',
      `went to ${after1}, without a rename ${plain1}`);
    await noErrors(t, errors);
    await ctx.close();
  },

  // A run of different edits, undone one by one and redone one by one, gives exactly the same files at every step.
  async 'undo and redo'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    const states = [await snapshot(page)], did = [];
    const step = async (what, fn) => {
      await fn(); await pause(page, 150);
      const s = await snapshot(page);
      if (s === states[states.length - 1]) { t('edit changes the file: ' + what, false, 'no change'); return; }
      states.push(s); did.push(what);
    };
    await theme(page, 'exposure');
    await step('shutter speed limit in profile 2', async () => {
      await page.click('#main .pick[data-row="D00C"][data-p="2"]');
      await page.locator('.pop [role="option"][aria-selected="false"]').nth(2).click();
    });
    await step('a name', async () => {
      await page.click('#main input[data-name="3"]'); await page.keyboard.type('Third');
      await page.click('#main h1');
    });
    await step('add a profile', () => page.click('#main [data-add]'));
    await step('max ISO with the arrow key', async () => {
      await page.focus('#main .pick[data-row="D00B"][data-p="1"]'); await page.keyboard.press('ArrowRight');
    });
    await theme(page, 'shooting');
    await step('a switch', () => page.locator('#main button.toggle[data-kind="toggle"]').first().click());
    await theme(page, 'menus');
    await step('remove a Favorites item', () => page.locator('#main [data-editor="D1A9"] [data-remove]').first().click());
    await step('a screen layout switch', () => page.locator('#main [data-editor="D15E"] button.toggle').nth(1).click());
    await theme(page, 'files');
    await step('artist', async () => {
      await page.click('#main input[data-row="501E"]'); await page.keyboard.type('Kim');
      await page.click('#main h1');
    });
    await step('add the M11', () => page.click('#filebox [data-cam="M11"]'));
    await theme(page, 'exposure');
    await step('remove a profile', async () => {
      await page.click('#main [data-more="sel"]');
      await page.locator('.pop [role="option"]').filter({ hasText: /^Remove$/ }).click();
    });
    await step('drop the M11-P', () => page.click('#filebox [data-cam="M11-P"]'));
    t('every edit was made (' + did.length + ' edits)', did.length === 11, did.join(', '));

    const n = states.length - 1;
    let back = true, at = '';
    for (let i = n - 1; i >= 0; i--) {
      await page.click('#filebox [data-undo-btn]'); await pause(page, 80);
      if (await snapshot(page) !== states[i]) { back = false; at = 'undo to before "' + did[i] + '"'; break; }
    }
    t('undo steps back through every edit, file for file', back, at);
    let fwd = back, at2 = '';
    if (back) for (let i = 1; i <= n; i++) {
      await page.click('#filebox [data-redo-btn]'); await pause(page, 80);
      if (await snapshot(page) !== states[i]) { fwd = false; at2 = 'redo of "' + did[i - 1] + '"'; break; }
    }
    t('redo steps forward through every edit, file for file', fwd, at2);
    t('redo ends with nothing left to redo', await page.evaluate(() => document.querySelector('#filebox [data-redo-btn]').disabled));
    // and undo after a reload is not offered, but the design is still there
    await page.reload(); await ready(page);
    t('a reload keeps the last state', await snapshot(page) === states[n], 'design after reload differs');
    await noErrors(t, errors);
    await ctx.close();
  },

  // Save all: one zip, a folder per chosen camera, each holding a settings.lcse that opens and checks clean.
  async 'save all'(browser, t, bname) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    const zips = [];
    const saveAll = async (label) => {
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.sheet [data-save="all"]')]);
      const file = path.join(tmp, `${label}-${dl.suggestedFilename()}`);
      await dl.saveAs(file);
      return file;
    };
    await page.click('#filebox [data-save]');
    await page.waitForSelector('.sheet');
    zips.push({ file: await saveAll(bname + '-two'), targets: await state(page, () => ProfileMaker.state.targets.slice()) });
    // two more cameras, chosen in the Save sheet itself
    await page.click('.sheet [data-cam="M11"]'); await pause(page);
    await page.click('.sheet [data-cam="M11 Monochrom"]'); await pause(page);
    zips.push({ file: await saveAll(bname + '-four'), targets: await state(page, () => ProfileMaker.state.targets.slice()) });
    const expected = await page.evaluate(() => Object.fromEntries(ProfileMaker.state.targets.map(m => [m, Engine.serialize(ProfileMaker.prepare(m).doc)])));
    const wantNames = await names(page);

    for (const z of zips) {
      const tag = z.targets.length + ' cameras';
      const listing = execFileSync('unzip', ['-l', z.file], { encoding: 'utf8' });
      const entries = listing.split('\n').map(l => l.match(/^\s*(\d+)\s+\S+\s+\S+\s+(.+?)\s*$/)).filter(Boolean).map(m => m[2]).filter(n => n !== 'Name');
      const want = z.targets.map(m => m + '/settings.lcse');
      t(`${tag}: the zip holds one folder per camera, each with settings.lcse`, JSON.stringify(entries) === JSON.stringify(want), 'listed ' + JSON.stringify(entries) + ' wanted ' + JSON.stringify(want));
      let tested = '';
      try { tested = execFileSync('unzip', ['-t', z.file], { encoding: 'utf8' }); } catch (e) { tested = String(e.stdout || e.message); }
      t(`${tag}: unzip -t finds no errors`, /No errors detected/.test(tested), tested.split('\n').slice(-3).join(' '));
      for (const m of z.targets) {
        let text = '', doc = null, err = '';
        try {
          text = execFileSync('unzip', ['-p', z.file, m + '/settings.lcse'], { encoding: 'utf8' });
          doc = E.parse(text);
        } catch (e) { err = e.message.split('\n')[0]; }
        t(`${tag}: ${m}/settings.lcse opens as an ${m} file`, doc && doc.model === m, err || (doc && doc.model));
        if (!doc) continue;
        t(`${tag}: ${m}/settings.lcse checks clean`, E.check(doc).length === 0, JSON.stringify(E.check(doc).slice(0, 3)));
        t(`${tag}: ${m}/settings.lcse keeps the profiles and names`, JSON.stringify(E.profiles(doc).map(p => E.profileName(doc, p))) === JSON.stringify(wantNames), JSON.stringify(E.profiles(doc).map(p => E.profileName(doc, p))));
        t(`${tag}: ${m}/settings.lcse reads back byte for byte`, E.serialize(doc) === text);
        if (z.targets.length === 4) t(`${tag}: ${m}/settings.lcse is the file the page prepares`, text === expected[m]);
      }
    }
    await noErrors(t, errors);
    await ctx.close();
  },

  // A file from the M11-D, which the app does not offer, opens as an M11 design.
  async 'open M11-D file'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    const files = await page.evaluate(() => {
      const plain = Engine.blank('M11-D');
      const two = Engine.blank('M11-D');
      Engine.setProfiles(two, [1, 2]); two.S.D124 = [2]; two.S.D037 = ['Day']; two.S.D038 = ['Night'];
      two.S.D00C[2] = 1536; Engine.syncLive(two);
      return { plain: Engine.serialize(plain), two: Engine.serialize(two) };
    });
    for (const [label, text, wantNames, wantStart] of [['factory M11-D file', files.plain, null, null], ['M11-D file with two profiles', files.two, ['Day', 'Night'], 2]]) {
      await page.setInputFiles('#file', { name: 'settings.lcse', mimeType: 'application/octet-stream', buffer: Buffer.from(text) });
      let opened = true;
      try { await page.waitForFunction(() => ProfileMaker.state.doc.model === 'M11' && ProfileMaker.state.theme === 'exposure', null, { timeout: 4000 }); } catch (e) { opened = false; }
      const s = await page.evaluate(() => {
        const st = ProfileMaker.state, d = st.doc;
        return { model: d.model, targets: st.targets, profiles: Engine.profiles(d), names: Engine.profiles(d).map(p => Engine.profileName(d, p)), start: d.S.D124[0],
          notice: (document.querySelector('#notice span') || {}).textContent || '', sheet: !!document.querySelector('.veil'),
          problems: st.targets.map(m => Engine.check(ProfileMaker.prepare(m).doc).length), rows: document.querySelectorAll('#main .grow').length };
      });
      t(`${label}: opens as an M11 design`, opened && s.model === 'M11' && JSON.stringify(s.targets) === '["M11"]', JSON.stringify({ model: s.model, targets: s.targets }));
      t(`${label}: says so`, /M11 design/.test(s.notice), JSON.stringify(s.notice));
      t(`${label}: has a profile and shows the table`, s.profiles.length >= 1 && s.rows > 0, JSON.stringify(s));
      if (wantNames) t(`${label}: keeps names and the start profile`, JSON.stringify(s.names) === JSON.stringify(wantNames) && s.start === wantStart, JSON.stringify(s));
      t(`${label}: no "would skip" sheet`, !s.sheet);
      t(`${label}: the M11 file it saves checks clean`, s.problems.every(n => n === 0), JSON.stringify(s.problems));
      if (s.sheet) await page.keyboard.press('Escape');
    }
    await noErrors(t, errors);
    await ctx.close();
  },

  // A saved design from before the M11-D was dropped still loads.
  async 'saved M11-D state'(browser, t) {
    for (const [label, targets, wantTargets, wantModel] of [
      ['saved for the M11-D alone', ['M11-D'], ['M11-P', 'M-EV1'], 'M11-P'],
      ['saved for the M11-D and the M11', ['M11-D', 'M11'], ['M11'], 'M11']
    ]) {
      const { ctx, page, errors } = await open(browser);
      await page.evaluate(([key, targets]) => {
        const doc = Engine.blank('M11-D');
        Engine.setProfiles(doc, [1, 2]); doc.S.D124 = [1]; doc.S.D037 = ['Alpha']; doc.S.D038 = ['Beta']; Engine.syncLive(doc);
        localStorage.setItem(key, JSON.stringify({ doc, targets, bases: { 'M11-D': doc }, fileNames: { 'M11-D': 'settings.lcse' }, theme: 'exposure', sel: 2,
          split: {}, setId: null, view: 'M11-D', origin: { model: 'M11-D', S: doc.S, from: 'you opened settings.lcse' } }));
      }, [STORE, targets]);
      await page.reload();
      let loaded = true;
      try { await ready(page); } catch (e) { loaded = false; }
      const s = loaded ? await page.evaluate(() => {
        const st = ProfileMaker.state, d = st.doc;
        return { model: d.model, targets: st.targets, view: st.view, names: Engine.profiles(d).map(p => Engine.profileName(d, p)),
          rows: document.querySelectorAll('#main .grow').length, problems: st.targets.map(m => Engine.check(ProfileMaker.prepare(m).doc).length),
          count: (document.querySelector('#filebox .small') || {}).textContent || '' };
      }) : {};
      t(`${label}: the page loads`, loaded);
      t(`${label}: the design moves to an offered camera`, s.model === wantModel && JSON.stringify(s.targets) === JSON.stringify(wantTargets) && OFFERED.includes(s.view), JSON.stringify(s));
      t(`${label}: names and profiles are kept`, JSON.stringify(s.names) === '["Alpha","Beta"]', JSON.stringify(s.names));
      t(`${label}: the table shows`, s.rows > 0, 'rows ' + s.rows);
      t(`${label}: every file it saves checks clean`, (s.problems || [1]).every(n => n === 0), JSON.stringify(s.problems));
      if (loaded) {  // every page and the Save sheet still draw
        for (const id of await page.evaluate(() => [...document.querySelectorAll('#themes [data-theme]')].map(b => b.dataset.theme))) await theme(page, id);
        await page.click('#filebox [data-save]'); await pause(page);
        t(`${label}: the Save sheet opens`, await page.locator('.sheet').count() === 1);
      }
      await noErrors(t, errors);
      await ctx.close();
    }
  },

  // At phone width the page never scrolls sideways, on any page, with four or six profiles, or with a sheet open.
  async 'phone width'(browser, t) {
    const { ctx, page, errors } = await open(browser, { viewport: { width: 390, height: 844 }, hasTouch: true });
    const sideways = () => page.evaluate(() => {
      const w = innerWidth, de = document.documentElement;
      scrollTo(10000, scrollY); const x = scrollX; scrollTo(0, scrollY);
      return { scrolls: x > 0, width: Math.max(de.scrollWidth, document.body.scrollWidth), view: w };
    });
    const ids = await page.evaluate(() => [...document.querySelectorAll('#themes [data-theme]')].map(b => b.dataset.theme));
    await pickSet(page, 'ladder');
    for (const [label, setup] of [['4 profiles', null], ['6 profiles', async () => {
      await theme(page, 'exposure');
      while (await page.locator('#main [data-add]:not([disabled])').count()) { await page.click('#main [data-add]'); await pause(page, 60); }
    }]]) {
      if (setup) await setup();
      const bad = [];
      for (const id of ids) {
        await theme(page, id);
        const s = await sideways();
        if (s.scrolls || s.width > s.view) bad.push(`${id} ${s.width}px${s.scrolls ? ' scrolls' : ''}`);
      }
      t(`${label}: no page scrolls sideways at 390 px (${ids.length} pages)`, !bad.length, bad.join(', '));
    }
    await theme(page, 'exposure');
    await page.click('#dock [data-save]'); await pause(page);
    const sv = await sideways();
    t('the Save sheet does not scroll sideways', !sv.scrolls && sv.width <= sv.view, JSON.stringify(sv));
    await page.keyboard.press('Escape'); await pause(page);
    await page.locator('#main .pick[data-kind="pick"]').first().click(); await pause(page);
    const mv = await sideways();
    t('a menu does not scroll sideways', await page.locator('.pop').count() === 1 && !mv.scrolls && mv.width <= mv.view, JSON.stringify(mv));
    await noErrors(t, errors);
    await ctx.close();
  }
};

(async () => {
  let ran = 0;
  for (const name of ['chrome', 'webkit']) {
    const browser = await launch(name);
    if (!browser) { results.push({ status: 'FAIL', ok: false }); continue; }
    ran++;
    for (const [flow, fn] of Object.entries(FLOWS)) {
      if (process.env.FLOWS_ONLY && !flow.includes(process.env.FLOWS_ONLY)) continue;
      const t = (check, ok, detail, known) => report(name, flow, check, !!ok, detail, known);
      try { await fn(browser, t, name); } catch (e) { report(name, flow, 'runs to the end', false, e.message.split('\n')[0]); }
    }
    await browser.close();
  }
  const fail = results.filter(r => r.status === 'FAIL').length, known = results.filter(r => r.status === 'KNOWN FAILURE').length;
  const pass = results.filter(r => r.ok).length;
  if (fail) console.log(`\nDownloaded zips kept in ${tmp}`);
  else fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed, ${known} known failures, in ${ran} browsers.`);
  if (!ran) console.log('FAIL: no browser could start');
  process.exit(!ran || fail || (process.env.FLOWS_STRICT && known) ? 1 : 0);
})();
