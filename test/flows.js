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
const Q3 = require(path.join(__dirname, '..', 'src', 'q3.js'));
const Q3CODES = require(path.join(__dirname, '..', 'docs', 'leica-q3-codes.json'));

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
async function open(browser, opts, init) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', acceptDownloads: true }, opts || {}));
  ctx.setDefaultTimeout(8000);
  if (init) await ctx.addInitScript(init);  // runs before the page's own scripts
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
  // Most flows add and remove cameras one at a time, as on a page where cameras have been picked. On a fresh page the
  // first camera tapped replaces the two it starts with: the flow 'first camera' covers that.
  await page.evaluate(() => { if (window.ProfileMaker) ProfileMaker.state.camsPicked = true; });
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
const noticeText = page => page.evaluate(() => { const n = document.querySelector('#notice.show span'); return n ? n.textContent : ''; });
// A value of the design: the profile's slot for a per-profile setting, slot 0 for a camera-wide one.
const value = (page, code, p) => page.evaluate(([code, p]) => { const d = ProfileMaker.state.doc; return d.S[code][Engine.rule(d.model, code).p ? p : 0]; }, [code, p]);

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

  // A file from the M11-D, which the app does not offer, opens as an M11 file.
  async 'open M11-D file'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => { ProfileMaker.state.camsPicked = false; });  // a fresh page: the file's camera is the one
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
      t(`${label}: opens as an M11 file`, opened && s.model === 'M11' && JSON.stringify(s.targets) === '["M11"]', JSON.stringify({ model: s.model, targets: s.targets }));
      t(`${label}: says so`, /as an M11 file/.test(s.notice), JSON.stringify(s.notice));
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
      t(`${label}: the design moves to an offered camera`, s.model === wantModel && JSON.stringify(s.targets) === JSON.stringify(wantTargets) && (s.view === '' || OFFERED.includes(s.view)), JSON.stringify(s));
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

  // A text the camera can't take is never saved: the old text comes back, with a notice. A taken one shows cleaned.
  async 'text the camera cannot take'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'files');
    const f = '#main input[data-row="D002"]', was = await value(page, 'D002', 1);
    for (const typed of ['ab!', 'a-b', 'ab']) {
      await page.click(f); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(typed); await page.keyboard.press('Tab'); await pause(page, 200);
      const v = await value(page, 'D002', 1), shown = await page.inputValue(f), n = await noticeText(page);
      t(`"${typed}" in File names start with keeps ${was}, shows it, and says why`, v === was && shown === was && /exactly 3/.test(n), JSON.stringify({ v, shown, n }));
    }
    await page.click(f); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('x1y'); await page.keyboard.press('Tab'); await pause(page, 200);
    t('"x1y" is saved as X1Y and shown so', await value(page, 'D002', 1) === 'X1Y' && await page.inputValue(f) === 'X1Y', JSON.stringify([await value(page, 'D002', 1), await page.inputValue(f)]));
    // a profile name too short to keep says so
    await theme(page, 'exposure');
    await page.click('#main input[data-name="1"]'); await page.keyboard.type('ab'); await page.click('#main h1'); await pause(page);
    t('a name of two letters keeps the old name and says why', (await names(page))[0] === 'Fast' && /3 to 10/.test(await noticeText(page)), JSON.stringify([await names(page), await noticeText(page)]));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Undo steps over clicks that changed nothing, and Cmd+Z closes an open menu before it undoes.
  async 'undo only what changed'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'menus');
    const pressed = page.locator('#main [data-editor="D15E"] .seg button[aria-pressed="true"]');
    if (await pressed.count()) await pressed.first().click();
    await theme(page, 'exposure');
    await page.click('#main input[data-name="1"]'); await page.keyboard.type('Fast'); await page.click('#main h1'); await pause(page);
    await page.click('#filebox [data-undo-btn]'); await pause(page);
    t('Undo after clicks that changed nothing undoes the set pick', /picked Speed ladder/.test(await noticeText(page)), await noticeText(page));
    await page.click('#filebox [data-redo-btn]'); await pause(page);
    await page.click('#main .pick[data-row="D00C"][data-p="2"]');
    const was = await value(page, 'D00C', 2);
    await page.locator('.pop [role="option"][aria-selected="false"]').nth(1).click(); await pause(page);
    await page.click('#main .pick[data-row="D00B"][data-p="1"]'); await pause(page);
    await page.keyboard.press('ControlOrMeta+Z'); await pause(page, 200);
    t('Cmd+Z with a menu open closes the menu and undoes the last change', await page.locator('.pop').count() === 0 && await value(page, 'D00C', 2) === was, JSON.stringify([await page.locator('.pop').count(), await value(page, 'D00C', 2), was]));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Cmd+S right after typing: the Save sheet lists what was just typed.
  async 'save right after typing'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'files');
    await page.click('#main input[data-row="501E"]'); await page.keyboard.type('Kim');
    await page.keyboard.press('ControlOrMeta+S'); await page.waitForSelector('.sheet');
    const txt = await page.locator('.sheet').innerText();
    t('the Save sheet lists the artist just typed', /Artist/.test(txt) && !/No changes/.test(txt), txt.slice(0, 200));
    await noErrors(t, errors);
    await ctx.close();
  },

  // A sheet never sits under a notice with a live Undo, opening a file closes sheets, and Escape closes the top one.
  async 'sheets and notices'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    t('the set pick shows Undo', await page.locator('#notice.show [data-undo]').count() === 1);
    await page.click('#filebox [data-save]'); await page.waitForSelector('.sheet');
    t('with a sheet open the notice has no Undo', await page.locator('#notice [data-undo]').count() === 0);
    const bad = await page.evaluate(() => { const d = Design.fromSet(SETS[0], 'M-EV1'); d.S.D00C[1] = 12345; return Engine.serialize(d); });
    await page.evaluate(text => ProfileMaker.openText(text, 'settings.lcse'), bad); await pause(page, 200);
    const h = await page.locator('.veil h2').allTextContents();
    t('opening a file closes the Save sheet and shows only what the camera would skip', JSON.stringify(h) === JSON.stringify(['Values the M-EV1 can’t use']), JSON.stringify(h));
    await page.keyboard.press('Escape'); await pause(page);
    t('Escape closes it', await page.locator('.veil').count() === 0);
    await page.evaluate(() => ProfileMaker.openText('hello', 'notes.txt')); await pause(page);
    t('a file that is not a settings file says so in plain words', /This is not a settings file/.test(await page.locator('.sheet').innerText()), await page.locator('.sheet').innerText());
    await page.keyboard.press('Escape');
    await noErrors(t, errors);
    await ctx.close();
  },

  // The pretend camera changes a shared value in every profile, as the table does.
  async 'shared values from the camera'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    const r = await page.evaluate(() => {
      const S = () => ProfileMaker.state.doc.S, ps = Engine.profiles(ProfileMaker.state.doc);
      Camera.press('menu'); Camera.press('menu'); Camera.press('menu');  // the main menu
      const it = Camera.sim.panel.items.find(x => !x.d); Camera.sim.panel.pick(it);
      const starred = ps.map(p => S().D1A9[p].items.includes(it.item));
      Camera.sim.panel = null; Camera.sim.menu = 0;
      Camera.press('menu'); Camera.press('menu');  // Favorites
      const fav = Camera.sim.panel.items.find(x => x.code === '5005');
      Camera.sim.panel.pick(fav);
      const cur = S()['5005'][ps[0]], pick = Camera.sim.panel.items.find(x => x.v !== cur); Camera.sim.panel.pick(pick);
      return { starred, wb: ps.map(p => S()['5005'][p]), want: pick.v };
    });
    t('starring an item on the camera adds it to every profile\'s shared Favorites', r.starred.every(Boolean), JSON.stringify(r.starred));
    t('a shared white balance picked on the camera changes in every profile', r.wb.every(v => v === r.want), JSON.stringify(r));
    await noErrors(t, errors);
    await ctx.close();
  },

  // A touch that scrolls the table ends with pointercancel; a change from the keyboard after it still redraws.
  async 'keyboard after a touch scroll'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await theme(page, 'exposure');
    await page.evaluate(() => { const m = document.querySelector('#main'); m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); m.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })); });
    const b = '#main .pick[data-row="D00B"][data-p="1"]', before = await page.locator(b + ' .v').innerText();
    await page.focus(b); await page.keyboard.press('ArrowRight'); await pause(page);
    const after = await page.locator(b + ' .v').innerText(), v = await value(page, 'D00B', 1);
    t('the table shows the new value at once', after !== before && after.replace(/\D/g, '') === String(v), JSON.stringify({ before, after, v }));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Make every profile the same on Contrast says what it did when the film styles differ.
  async 'same in every profile, film styles'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await page.evaluate(() => { const d = ProfileMaker.state.doc, r = Engine.rule(d.model, 'D13E'); d.S.D13E[2] = r.v.find(v => v !== d.S.D13E[1]); ProfileMaker.render(); });
    await theme(page, 'look');
    await page.click('#main [data-same="Contrast"]');
    await page.locator('.pop [role="option"]').first().click(); await pause(page);
    const n = await noticeText(page);
    t('the notice names the film styles instead of claiming the row is the same', /film style/.test(n), n);
    // + and Duplicate are one action with one notice
    await theme(page, 'exposure');
    await page.click('#main [data-add]'); await pause(page);
    t('+ duplicates the selected profile and says so', /^Duplicated Fast/.test(await noticeText(page)) && (await names(page)).length === 5, JSON.stringify([await noticeText(page), await names(page)]));
    await noErrors(t, errors);
    await ctx.close();
  },

  // A setting only the M11 Monochrom has survives adding the M11-P and removing it again.
  // The first camera tapped on a fresh page replaces the two it starts with; a second one adds; Start over keeps them;
  // a file opened on a fresh page picks its own camera.
  async 'first camera'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => { ProfileMaker.state.camsPicked = false; });
    const cams = () => page.evaluate(() => ProfileMaker.state.targets.join());
    await page.click('#main [data-cam="M11"]'); await pause(page);
    t('the first tap picks that camera alone', await cams() === 'M11', await cams());
    t('no notice before any change', !(await noticeText(page)), await noticeText(page));
    await page.click('#main [data-cam="M-EV1"]'); await pause(page);
    t('a second tap adds one', await cams() === 'M-EV1,M11', await cams());
    t('the design stays on the first camera', await page.evaluate(() => ProfileMaker.state.doc.model) === 'M11');
    await page.click('#filebox [data-restart]'); await pause(page);
    t('Start over keeps the cameras', await cams() === 'M-EV1,M11', await cams());
    await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await ready(page);
    await openFile(page, path.join(__dirname, 'fixtures/mev1-export.lcse')); await pause(page, 300);
    t('a file opened on a fresh page picks its camera', await cams() === 'M-EV1', await cams());
    await noErrors(t, errors);
    await ctx.close();
  },

  async 'a setting only one camera has'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    for (const m of ['M11 Monochrom', 'M11-P', 'M-EV1']) { await page.click(`#filebox [data-cam="${m}"]`); await pause(page); }
    await theme(page, 'all');
    await page.fill('#q', 'Toning'); await pause(page);
    await page.click('#main .pick[data-row="D177"]');
    await page.locator('.pop [role="option"][aria-selected="false"]').first().click(); await pause(page);
    const toning = await value(page, 'D177', 1);
    await page.click('#filebox [data-cam="M11-P"]'); await pause(page);
    const n = await noticeText(page), file = await page.evaluate(() => ProfileMaker.prepare('M11 Monochrom').doc.S.D177[1]);
    t('adding the M11-P leaves the design on the Monochrom, quietly', await page.evaluate(() => ProfileMaker.state.doc.model) === 'M11 Monochrom' && !/Toning/.test(n), n);
    t('the Monochrom file keeps Toning', file === toning, JSON.stringify([file, toning]));
    await page.click('#filebox [data-cam="M11-P"]'); await pause(page);
    t('removing the M11-P brings Toning back', await value(page, 'D177', 1) === toning);
    await noErrors(t, errors);
    await ctx.close();
  },

  // A file that marks no profile as saved (the camera kit's Test C) opens with the profiles it fills.
  async 'file that marks no profile as saved'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    const text = fs.readFileSync(path.join(__dirname, '..', 'camera-test', 'M-EV1', 'Test C', 'settings.lcse'), 'utf8');
    await page.setInputFiles('#file', { name: 'settings.lcse', mimeType: 'application/octet-stream', buffer: Buffer.from(text) }); await pause(page, 300);
    t('it keeps Alpha, Bravo and Charlie', JSON.stringify(await names(page)) === '["Alpha","Bravo","Charlie"]', JSON.stringify(await names(page)));
    t('and says so', /marks no profile as saved/.test(await noticeText(page)), await noticeText(page));
    await noErrors(t, errors);
    await ctx.close();
  },

  // The Mac app refuses a card that holds another camera's file; the Save sheet says so beside that camera.
  async 'card with another camera'(browser, t) {
    const { ctx, page, errors } = await open(browser, null, () => {
      window.webkit = { messageHandlers: { native: { postMessage: m => { if (m.type === 'writeCard') setTimeout(() => ProfileMaker.nativeReply(m.id, 'other camera'), 10); } } } };
    });
    await page.evaluate(() => ProfileMaker.setCards([{ path: '/media/CARD', name: 'CARD', camera: '' }]));
    await page.click('#filebox [data-save]'); await page.waitForSelector('.sheet [data-card]');
    const card = page.locator('.sheet [data-card]').first();
    await card.click(); await pause(page, 200);
    const row = await card.locator('xpath=..').innerText();
    t('the button says Not written and the row says why', /Another camera’s card/.test(row), row);
    await noErrors(t, errors);
    await ctx.close();
  },

  // A button pressed from the keyboard keeps the focus: Undo twice in a row from the sidebar, Cmd+Z over an open menu.
  async 'undo from the keyboard'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder'); await theme(page, 'exposure');
    const start = await snapshot(page);
    for (const p of [1, 2]) {  // two changes, two undo steps
      const b = `#main .pick[data-row="D00B"][data-p="${p}"]`, was = await page.locator(b + ' .v').innerText();
      await page.focus(b); await page.keyboard.press('ArrowRight'); await pause(page);
      if (await page.locator(b + ' .v').innerText() === was) { await page.keyboard.press('ArrowLeft'); await pause(page); }
    }
    t('two changes were made', await snapshot(page) !== start);
    await page.focus('#filebox [data-undo-btn]'); await page.keyboard.press('Enter'); await pause(page);
    t('after one Undo the focus is still on Undo', await page.evaluate(() => document.activeElement.matches('#filebox [data-undo-btn]')));
    await page.keyboard.press('Enter'); await pause(page);
    t('a second Enter undoes the other change', await snapshot(page) === start);
    // Cmd+Z with a menu open: the menu closes first, so its pick can't land in the restored design
    const b = '#main .pick[data-row="D00B"][data-p="1"]';
    await page.focus(b); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await pause(page);
    await page.focus(b); await page.keyboard.press('ArrowRight'); await pause(page);
    const changed = await snapshot(page);
    await page.click(b); await pause(page);
    t('a menu is open', await page.locator('.pop').count() === 1);
    await page.keyboard.press('Control+z'); await pause(page);
    t('Cmd+Z closes the menu', await page.locator('.pop').count() === 0);
    t('and undoes the last change', await snapshot(page) !== changed);
    await noErrors(t, errors);
    await ctx.close();
  },

  // Typing in the middle of a search keeps the cursor where it is: only the rows under the box are drawn again.
  async 'typing in a search'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await theme(page, 'all');
    await page.click('#q'); await page.keyboard.type('flsh'); await pause(page);
    await page.evaluate(() => { document.querySelector('#q').mark = 1; });
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('a'); await pause(page);
    const r = await page.evaluate(() => { const q = document.querySelector('#q'); return { v: q.value, at: q.selectionStart, same: q.mark === 1, focus: document.activeElement === q, rows: [...document.querySelectorAll('#main .glabel .nm')].map(n => n.textContent) }; });
    t('the letter goes where the cursor was and the cursor stays after it', r.v === 'flash' && r.at === 3, JSON.stringify(r));
    t('the search box is the same box, still focused', r.same && r.focus);
    t('the rows follow the search', r.rows.some(n => /flash/i.test(n)), r.rows.join(', '));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Remove twice from the keyboard: the focus moves to the next item's Remove, on the page and in the sheet.
  async 'remove from the keyboard'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    const count = () => page.evaluate(() => ProfileMaker.state.doc.S.D1A9[ProfileMaker.state.sel].items.length);
    const ensure = async () => {  // at least three items
      await page.evaluate(() => { const st = ProfileMaker.state, f = Engine.rule(st.doc.model, 'D1A9').v; Engine.profiles(st.doc).forEach(p => { const it = st.doc.S.D1A9[p].items; f.forEach(v => { if (it.length < 4 && !it.includes(v)) it.push(v); }); }); ProfileMaker.render(); });
    };
    await ensure(); await theme(page, 'menus');
    for (const [where, list] of [['the page', '#main [data-editor="D1A9"]'], ['the sheet', '.sheet .fav-ed']]) {
      if (where === 'the sheet') { await theme(page, 'buttons'); await page.click('#main .pick[data-kind="favorites"]'); await page.waitForSelector('.sheet .fav-ed'); }
      const n = await count();
      await page.focus(list + ' [data-remove]'); await page.keyboard.press('Enter'); await pause(page);
      const on = await page.evaluate(sel => { const a = document.activeElement; return a.matches(sel + ' [data-remove]') && [...document.querySelectorAll(sel + ' [data-remove]')].indexOf(a); }, list);
      await page.keyboard.press('Enter'); await pause(page);
      t(`on ${where} the focus stays on the first Remove`, on === 0, String(on));
      t(`on ${where} two presses remove two items`, await count() === n - 2, `${n} then ${await count()}`);
      if (where === 'the page') await ensure();
    }
    await page.keyboard.press('Escape');
    await noErrors(t, errors);
    await ctx.close();
  },

  // On the Favorites and layouts page the label follows an edit that makes every profile's Favorites the same.
  async 'favorites page label follows'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    const x = await page.evaluate(() => {  // every profile but the first gets one more item
      const st = ProfileMaker.state, ps = Engine.profiles(st.doc), have = st.doc.S.D1A9[ps[0]].items;
      const x = Engine.rule(st.doc.model, 'D1A9').v.find(v => !have.includes(v));
      ps.slice(1).forEach(p => { st.doc.S.D1A9[p].items = have.concat([x]); });
      st.sel = ps[0]; ProfileMaker.render(); return Engine.label('D1A9', x);
    });
    await theme(page, 'menus');
    const head = () => page.locator('#main .mrow').first().locator('.mlabel').innerText();
    t('per profile: the label offers the profiles', !/Same in every profile/.test(await head()), await head());
    await page.click('#main [data-editor="D1A9"] [data-add-menu]'); await pause(page);
    await page.locator('.pop [role="option"]', { hasText: x }).first().click(); await pause(page);
    t('the edit that makes them the same: the label says so', /Same in every profile/.test(await head()), await head());
    t('and the editor now works on every profile', await page.locator('#main [data-editor="D1A9"]').getAttribute('data-scope') === 'all');
    await noErrors(t, errors);
    await ctx.close();
  },

  // The drawing of a second camera shows what Save writes for it, and a change made on it goes to the design.
  async 'the second camera in the drawing'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    const ids = await page.evaluate(() => SETS.map(s => s.id));
    let wrong = [], differs = 0;
    for (const id of ids) {
      await theme(page, 'sets'); await pickSet(page, id);
      await page.click('#cam [data-view="M-EV1"]'); await pause(page, 60);
      const r = await page.evaluate(() => {
        const st = ProfileMaker.state, file = ProfileMaker.prepare('M-EV1').doc, out = { bad: [], differs: 0 };
        document.querySelectorAll('#cam .jobs .job:not([data-edit])').forEach(j => {
          const code = j.dataset.code, want = Words.short(code, Engine.get(file, code, st.sel)), shown = j.querySelector('.jv').textContent;
          if (shown !== want) out.bad.push(code + ' shows ' + shown + ', the file has ' + want);
          if (Engine.get(st.doc, code, st.sel) !== Engine.get(file, code, st.sel)) out.differs++;
        });
        return out;
      });
      wrong = wrong.concat(r.bad.map(b => id + ': ' + b)); differs += r.differs;
    }
    t('every job listed for the M-EV1 is the one its file gets', !wrong.length, wrong.slice(0, 3).join('; '));
    t('some sets give the M-EV1 its own jobs, so this was tested', differs > 0, String(differs));
    await page.click('#cam .job[data-code="D191"]'); await pause(page);
    const before = await page.evaluate(() => ProfileMaker.state.doc.S.D191[ProfileMaker.state.sel]);
    await page.locator('.pop [role="option"][aria-selected="false"]').first().click(); await pause(page);
    const after = await page.evaluate(() => ({ design: ProfileMaker.state.doc.S.D191[ProfileMaker.state.sel], file: Engine.get(ProfileMaker.prepare('M-EV1').doc, 'D191', ProfileMaker.state.sel) }));
    t('a job picked on the M-EV1 drawing goes to the design and its file', after.design !== before && after.file === after.design, JSON.stringify({ before, after }));
    await noErrors(t, errors);
    await ctx.close();
  },

  // The Save sheet stays open and in place while cameras and the start profile change; the pretend camera keeps
  // what was pressed until a value or the profile changes.
  async 'save sheet in place'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    await page.click('#filebox [data-save]'); await page.waitForSelector('.sheet');
    await page.evaluate(() => { document.querySelector('.sheet').mark = 1; });
    await page.focus('.sheet [data-start="2"]'); await page.keyboard.press('Enter'); await pause(page);
    let r = await page.evaluate(() => ({ same: document.querySelector('.sheet').mark === 1, start: ProfileMaker.state.doc.S.D124[0], focus: document.activeElement.matches('.sheet [data-start="2"]'), pressed: document.querySelector('.sheet [data-start="2"]').getAttribute('aria-pressed') }));
    t('a start profile picked in the Save sheet: same sheet, focus kept, shown as picked', r.same && r.start === 2 && r.focus && r.pressed === 'true', JSON.stringify(r));
    await page.click('.sheet [data-cam="M11"]'); await pause(page);
    r = await page.evaluate(() => ({ same: document.querySelector('.sheet').mark === 1, rows: document.querySelectorAll('.sheet [data-save]:not([data-save="all"])').length, targets: ProfileMaker.state.targets }));
    t('a camera added in the Save sheet: same sheet, a row for it', r.same && r.rows === 3 && r.targets.includes('M11'), JSON.stringify(r));
    await page.keyboard.press('Escape'); await pause(page);
    await page.evaluate(() => { Camera.sim.zoom = true; });
    await theme(page, 'look'); await theme(page, 'exposure');
    t('another section leaves the pretend camera as it was', await page.evaluate(() => Camera.sim.zoom));
    const b = '#main .pick[data-row="D00B"][data-p="1"]';
    await page.focus(b); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await pause(page);
    t('a changed value starts it fresh', !(await page.evaluate(() => Camera.sim.zoom)));
    await noErrors(t, errors);
    await ctx.close();
  },

  // Part sets: picked with the mouse and from the keyboard, each changes only its part in every profile, one Undo
  // step each, and every camera's file holds that camera's version of the set.
  async 'center button steps like the camera'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    // From the full picture (-1) through each layout with something on; an empty layout is skipped, as on the camera.
    const steps = n => page.evaluate(n => { const out = []; Camera.sim.panel = null; Camera.sim.menu = 0; Camera.sim.layout = -1;
      for (let i = 0; i < n; i++) { Camera.press('center'); out.push(Camera.sim.layout); } return out; }, n);
    await pickSet(page, 'factory');
    t('Factory has only layout 1 on: full picture, layout 1, full picture', JSON.stringify(await steps(3)) === '[0,-1,0]', JSON.stringify(await steps(3)));
    await theme(page, 'menus');
    await page.click('#main [data-part="check"]'); await pause(page);
    t('Focus and check has layouts 1 to 3 on: 1, 2, 3, then the full picture', JSON.stringify(await steps(4)) === '[0,1,2,-1]', JSON.stringify(await steps(4)));
    t('the full picture draws nothing over the photo', await page.evaluate(() => { const full = Camera.layoutPreview(1, -1), one = Camera.layoutPreview(1, 0); return full.length < one.length && !/<line|class="bars/.test(full); }));
    await noErrors(t, errors); await ctx.close();
  },
  async 'part sets'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    for (const m of ['M11', 'M11 Monochrom']) { await page.click(`#filebox [data-cam="${m}"]`); await pause(page, 60); }
    const design = () => page.evaluate(() => JSON.parse(JSON.stringify(ProfileMaker.state.doc.S)));
    const changedCodes = (a, b) => Object.keys(b).filter(c => JSON.stringify(a[c]) !== JSON.stringify(b[c]));
    const files = () => page.evaluate(() => ProfileMaker.state.targets.map(m => { const d = ProfileMaker.prepare(m).doc; return { m, S: d.S, bad: Engine.check(d).length }; }));
    const pressed = id => page.evaluate(id => document.querySelector(`#main [data-part="${id}"]`).getAttribute('aria-pressed'), id);
    const ps = await page.evaluate(() => Engine.profiles(ProfileMaker.state.doc));

    // buttons, with the mouse
    await theme(page, 'buttons');
    t('the Buttons page shows three button sets above the buttons', await page.locator('#main .partsets [data-part]').count() === 3 &&
      await page.evaluate(() => document.querySelector('#main .partsets').getBoundingClientRect().bottom <= document.querySelector('#main .grid').getBoundingClientRect().top));
    const before = await design(), pnames = await names(page);
    await page.click('#main [data-part="rangefinder"]'); await pause(page);
    const after = await design();
    t('Rangefinder changes only the buttons', changedCodes(before, after).sort().join() === 'D077,D193,D195,D1D6,D1D7', changedCodes(before, after).join());
    t('in every profile', ps.every(p => after.D193[p] === 3 && after.D195[p] === 11 && after.D077[p] === 0));
    t('names and profiles stay', JSON.stringify(await names(page)) === JSON.stringify(pnames));
    t('the notice says what changed', await noticeText(page) === 'Buttons: Rangefinder in every profile', await noticeText(page));
    t('the card shows as picked', await pressed('rangefinder') === 'true' && await pressed('wheel') === 'false');
    let fs = await files();
    t('every camera gets its own FN job', fs.every(f => ps.every(p => f.S.D191[p] === (f.m === 'M-EV1' ? 27 : 1))), fs.map(f => f.m + ' ' + f.S.D191[1]).join(', '));
    t('every file checks clean', fs.every(f => !f.bad));
    await page.click('#filebox [data-undo-btn]'); await pause(page);
    t('one Undo takes it back', JSON.stringify(await design()) === JSON.stringify(before) && await pressed('rangefinder') === 'false');
    t('Undo names the set', /Undid: Rangefinder buttons/.test(await noticeText(page)), await noticeText(page));

    // Favorites, from the keyboard
    await theme(page, 'menus');
    await page.focus('#main [data-part="jpg"]'); await page.keyboard.press('Enter'); await pause(page);
    const fav = await design();
    t('Enter picks JPG look: only Favorites change', changedCodes(before, fav).join() === 'D1A9', changedCodes(before, fav).join());
    t('the focus stays on the card', await page.evaluate(() => document.activeElement && document.activeElement.dataset.part) === 'jpg');
    fs = await files();
    const mono = fs.find(f => f.m === 'M11 Monochrom'), p11 = fs.find(f => f.m === 'M11-P');
    t('the Monochrom file has its own JPG look', ps.every(p => JSON.stringify(mono.S.D1A9[p].items) === '[6,40,53654,53252]'), JSON.stringify(mono.S.D1A9[1].items));
    t('the M11-P file has the color one', ps.every(p => JSON.stringify(p11.S.D1A9[p].items) === '[53566,6,53748,53654,53252]'));
    const rows = await page.locator('.cam .screen .panel [role="option"]').allInnerTexts();
    t('the drawn camera opens Favorites, with Main Menu as the last row', rows.length === 6 && /^Main Menu/.test(rows[5]) && /^Film Style/.test(rows[0]), rows.join(' | '));
    await page.focus('#main [data-part="clean"]'); await page.keyboard.press(' '); await pause(page);
    const lay = await design(), L = await page.evaluate(() => CATALOGUE.LAYOUTS);
    t('Space picks Clean: only the layouts change', changedCodes(fav, lay).every(c => L.some(x => Object.values(x).includes(c))) && changedCodes(fav, lay).length > 0, changedCodes(fav, lay).join());
    t('Clean turns off what it does not name', ps.every(p => lay[L[0].histo][p] === 0 && lay[L[0].peak][p] === 0 && lay[L[1].peak][p] === 1));
    await page.keyboard.press('Meta+z'); await pause(page);
    t('Undo from the keyboard takes back only the layouts', JSON.stringify(await design()) === JSON.stringify(fav));

    // a value changed after picking stays on every camera
    await page.click('#main [data-part="empty"]'); await pause(page);
    const empty = await design();
    t('Empty empties Favorites in every profile', ps.every(p => empty.D1A9[p].items.length === 0));
    await theme(page, 'buttons');
    await page.click('#main [data-part="rangefinder"]'); await pause(page);
    await page.evaluate(() => { const st = ProfileMaker.state; st.doc.S.D191[2] = 11; ProfileMaker.render(); });
    fs = await files();
    t('a job changed after picking is kept on the M-EV1', fs.find(f => f.m === 'M-EV1').S.D191[2] === 11 && fs.find(f => f.m === 'M-EV1').S.D191[1] === 27);
    t('the card no longer shows as picked', await pressed('rangefinder') === 'false');
    await noErrors(t, errors);
    await ctx.close();

    // a phone: one row that scrolls sideways, close to the controls, picked by a tap
    const ph = await open(browser, { viewport: { width: 390, height: 844 }, hasTouch: true });
    await pickSet(ph.page, 'ladder'); await theme(ph.page, 'buttons');
    const box = await ph.page.evaluate(() => { const r = document.querySelector('#main .partsets'), c = r.querySelectorAll('[data-part]'); return { h: r.getBoundingClientRect().height, rows: new Set([...c].map(x => Math.round(x.getBoundingClientRect().top))).size, scroll: r.scrollWidth > r.clientWidth, page: document.documentElement.scrollWidth <= innerWidth }; });
    t('phone: the button sets are one row of cards, under 170 px tall, that scrolls sideways', box.rows === 1 && box.h < 170 && box.scroll && box.page, JSON.stringify(box));
    await ph.page.evaluate(() => { document.querySelector('#main .partsets').scrollLeft = 1000; });
    await ph.page.tap('#main [data-part="fnprofiles"]'); await pause(ph.page);
    t('phone: a tap picks Profiles on FN', await ph.page.evaluate(() => ProfileMaker.state.doc.S.D191[1]) === 26);
    t('phone: the row stays scrolled to the card picked', await ph.page.evaluate(() => document.querySelector('#main .partsets').scrollLeft) > 0);
    await noErrors(t, ph.errors);
    await ph.ctx.close();
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
  },

  // Changing a setting far down a page leaves the page where it was. Safari used to jump to the top on All settings,
  // where only the rows are drawn again. On a computer the page panel scrolls; on a phone the window does.
  async 'a change keeps the page where it was'(browser, t) {
    for (const [label, opts] of [['computer', null], ['phone', { viewport: { width: 390, height: 844 } }]]) {
      const { ctx, page, errors } = await open(browser, opts);
      for (const id of ['all']) {  // the only page long enough to scroll on a computer
        await theme(page, id);
        const at = () => page.evaluate(() => Math.round(document.querySelector('#main').scrollTop + window.scrollY));
        await page.evaluate(() => { document.querySelector('#main').scrollTop = 1200; window.scrollTo(0, 1200); }); await pause(page);
        const before = await at(), h = await page.evaluate(() => window.innerHeight);
        let pick = null;
        for (const l of await page.locator('#main .pick[data-kind="pick"]').all()) {
          const bb = await l.boundingBox(); if (bb && bb.y > 150 && bb.y < h - 250) { pick = l; break; }
        }
        if (!pick) { t(`${label}, ${id}: a setting to change in view`, false, 'none found'); continue; }
        await pick.click(); await pause(page);
        await page.locator('.pop [role="option"][aria-selected="false"]').first().click(); await pause(page, 250);
        const after = await at();
        t(`${label}, ${id}: the page stays where it was after a change`, before > 300 && Math.abs(after - before) < 4, JSON.stringify({ before, after }));
      }
      await noErrors(t, errors);
      await ctx.close();
    }
  }
};

// A made-up Q3 export on firmware 4.1 from the public code list's factory values, with names of its own. No real file.
function madeUpQ3(camera, edit) {
  const S = {};
  Q3CODES._order.forEach(c => {
    const e = Q3CODES[c], f = e.factory === null ? 0 : e.factory;
    S[c] = e.kind === 'text camera-wide' ? [f] : e.kind === 'number list per profile' ? [].concat(...Array(7).fill(f)) : Array(7).fill(f);
  });
  ['Street', 'Night', 'Portrait', 'Landscape', 'Video', 'Travel'].forEach((n, i) => { S[E.NAME_CODES[i]] = [n]; });
  S.D00B[2] = 6400;
  if (edit) edit(S);
  return Q3.write({ camera: camera || 'LEICA Q3', codes: Q3CODES._order.filter(c => c in S), S });
}
function q3File(name, text) { const d = fs.mkdtempSync(path.join(tmp, 'q3-')), f = path.join(d, name); fs.writeFileSync(f, text); return f; }
async function openFile(page, file) { await page.setInputFiles('#file', file); await pause(page, 200); }
const sheetText = page => page.evaluate(() => { const s = document.querySelector('.sheet'); return s ? s.textContent.replace(/\s+/g, ' ') : ''; });
const closeSheet = page => page.evaluate(() => { const b = document.querySelector('.sheet [data-close]'); if (b) b.click(); });

Object.assign(FLOWS, {
  // The Q3 experiment from start to end: pick, open, save, the saved file again, the camera's new export, a Q3 43
  // after a Q3, closing the file, a stored file that no longer reads, and the Mac app, where the Q3 is not offered.
  async 'q3 experiment'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    const exp = q3File('settings.lcs', madeUpQ3());
    t('the starting page offers the Q3, Q3 43 and Q2', await page.locator('#main [data-qcam]').count() === 3);
    await page.click('#main [data-qcam="Q3"]'); await pause(page);
    t('the Q3 chip opens a sheet that offers to open settings.lcs', /Open settings\.lcs/.test(await sheetText(page)));
    await closeSheet(page); await pause(page);
    await openFile(page, exp);
    const after = await state(page, () => ({ q3: ProfileMaker.state.origin.q3, n: Engine.profiles(ProfileMaker.state.doc).length, name: Engine.profileName(ProfileMaker.state.doc, 2), pressed: document.querySelector('#filebox [data-qcam="Q3"]').getAttribute('aria-pressed') }));
    t('a first Q3 file fills an untouched design with its six profiles and names', after.q3 === 'Q3' && after.n === 6 && after.name === 'Night' && after.pressed === 'true', JSON.stringify(after));
    const opened = await sheetText(page);
    t('the sheet says the file opened', /Opened settings\.lcs/.test(opened));
    t('the sheet says Auto shutter speed limits show as 1/(4f) and stay Auto', /Auto shutter speed limits show as 1\/\(4f\) and stay Auto/.test(opened), opened.slice(0, 300));
    await closeSheet(page); await pause(page);

    await state(page, () => { ProfileMaker.state.doc.S.D00B[2] = 12500; ProfileMaker.render(); });
    await page.evaluate(() => ProfileMaker.saveSheet()); await pause(page);
    const sv = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.sheet .list > div')].map(r => r.textContent);
      return { first: rows[0] || '', primary: !!document.querySelector('.sheet [data-qsave].primary'), mPrimary: !!document.querySelector('.sheet [data-save].primary'),
        qChips: document.querySelectorAll('.sheet [data-qcam]').length, all: !!document.querySelector('.sheet [data-save="all"]'), start: !!document.querySelector('.sheet [data-start]') };
    });
    t('for a design from a Q3 file the Save sheet leads with the Q3, its button the main one', /^Q3/.test(sv.first) && !/^Q3 43/.test(sv.first) && sv.primary && !sv.mPrimary, JSON.stringify(sv));
    t('the Save sheet has no Q3 chips, no Save all and no start profile then', !sv.qChips && !sv.all && !sv.start, JSON.stringify(sv));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.sheet [data-qsave="Q3"]')]);
    const savedPath = path.join(tmp, 'q3-saved-' + Date.now() + '.lcs'); await dl.saveAs(savedPath);
    const saved = fs.readFileSync(savedPath, 'utf8'), diffs = Q3.compare(fs.readFileSync(exp, 'utf8'), saved);
    t('the saved Q3 file changes only the setting changed', diffs.length === 1 && diffs[0].code === 'D00B' && diffs[0].slot === 2 && diffs[0].b === 12500, JSON.stringify(diffs));
    await closeSheet(page); await pause(page);

    await openFile(page, q3File('settings.lcs', saved));
    t('opening the file Msetter saved says to import it first', /This is the file Msetter saved/.test(await sheetText(page)));
    await closeSheet(page); await pause(page);

    const back = Q3.read(saved); back.S.D00B[2] = 6400; back.S.D1EE[3] = 2;
    await openFile(page, q3File('settings.lcs', Q3.write(back)));
    const kept = await sheetText(page);
    t('the camera\'s new export shows what it kept', /Q3 import result/.test(kept) && /kept none of your changes/.test(kept) && /Not kept/.test(kept), kept.slice(0, 200));
    t('no setting codes on the screen', !/\bD[0-9A-F]{3}\b/.test(kept), kept.slice(0, 200));
    const focused = await page.evaluate(() => document.activeElement ? document.activeElement.outerHTML.slice(0, 80) : 'none');
    t('the comparison focuses a button, so a phone keyboard stays down', /data-qmail/.test(focused), focused);
    await page.evaluate(() => { HTMLAnchorElement.prototype.click = function () { window.__mail = this.href; }; });
    await page.click('.sheet [data-qmail]'); await pause(page);
    const mail = decodeURIComponent(await page.evaluate(() => window.__mail || ''));
    t('Email opens a message to the reports address, without names', mail.startsWith('mailto:' + Q3.REPORTS) && !/Street|Night/.test(mail), mail.slice(0, 120));
    await closeSheet(page); await pause(page);

    await openFile(page, q3File('settings.lcs', madeUpQ3('LEICA Q3 43')));
    await closeSheet(page); await pause(page);
    await page.evaluate(() => ProfileMaker.saveSheet()); await pause(page);
    const row43 = await page.evaluate(() => { const r = [...document.querySelectorAll('.sheet .list > div')].find(x => /^Q3 43/.test(x.textContent)); return r ? r.textContent : ''; });
    t('a Q3 43 file after a Q3 one gets the design\'s changes', /to 12500/.test(row43) && !/No changes/.test(row43), row43.slice(0, 160));
    await closeSheet(page); await pause(page);

    await page.click('#filebox [data-qcam="Q3"]'); await pause(page);
    await page.click('.sheet [data-qremove]'); await pause(page);
    t('closing the file switches the Q3 chip off', await page.evaluate(() => document.querySelector('#filebox [data-qcam="Q3"]').getAttribute('aria-pressed')) === 'false');
    await openFile(page, exp);
    t('the same file opened again offers its settings, since the design has changed since', /Use this file’s settings/.test(await sheetText(page)));
    await closeSheet(page); await pause(page);
    await noErrors(t, errors);

    // a stored file that no longer reads is dropped, and the Save sheet still opens
    await page.evaluate(() => localStorage.setItem('msetter-q3-v1', JSON.stringify({ Q3: { text: '{"Camera":"LEICA Q3","Settings":{"D054":[1]}}\n', name: 'x', at: 1 } })));
    await page.reload(); await ready(page);
    await page.evaluate(() => ProfileMaker.saveSheet()); await pause(page);
    t('a stored Q3 file that no longer reads doesn\'t stop the Save sheet', await page.locator('.sheet h2').count() === 1 && !(await page.locator('.sheet [data-qsave]').count()));
    await closeSheet(page);
    await noErrors(t, errors);
    await ctx.close();

    // the Mac app: no Q3 chips, and a Q3 file doesn't open there
    const mac = await open(browser, null, () => { window.webkit = { messageHandlers: { native: { postMessage() {} } } }; });
    t('the Mac app shows no Q3 chips', await mac.page.locator('[data-qcam]').count() === 0);
    const before = await snapshot(mac.page);
    await openFile(mac.page, exp);
    t('the Mac app refuses a Q3 file and keeps the design', /did not open/.test(await sheetText(mac.page)) && await snapshot(mac.page) === before);
    await noErrors(t, mac.errors);
    await mac.ctx.close();
  },

  // A notice offers Undo only when its action changed something: an Undo after a change-nothing action would undo
  // something else.
  async 'undo only when something changed'(browser, t) {
    const { ctx, page, errors } = await open(browser);
    await pickSet(page, 'ladder');
    t('picking a set offers Undo', await page.locator('#notice.show [data-undo]').count() === 1);
    await pickSet(page, 'ladder');
    t('picking the same set again offers no Undo', await page.locator('#notice.show [data-undo]').count() === 0, await noticeText(page));
    await pickSet(page, 'daynight');
    t('picking another set offers Undo again', await page.locator('#notice.show [data-undo]').count() === 1);
    await noErrors(t, errors);
    await ctx.close();
  }
});

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
