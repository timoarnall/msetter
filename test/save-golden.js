// The save proof: records what Save writes (and the notes it shows) for a large, fixed set of cases, driven through
// the page's own buttons, so a change to the code can be proved not to change a single saved byte.
//
//   node test/save-golden.js --write            record test/fixtures/save-golden.json
//   node test/save-golden.js --check            compare; prints "0 differences in N files" or lists them
//   node test/save-golden.js --check --app <url or path to index.html>
//
// Needs Playwright (NODE_PATH) and Chrome. Runs from file:// by default, so no server is needed.
// Cases: every starting set with every choice of cameras; every set through a fixed walk of camera changes; every part
// set picked in turn on every choice of cameras; every part set through the walk; the sample export and the
// camera-test files opened, then the walk; the sample export with part sets, then the walk; 60 seeded edit runs;
// three "Save all" zips; three saved sessions reloaded.
const { chromium } = require('playwright');
const crypto = require('crypto'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const GOLDEN = path.join(ROOT, 'test/fixtures/save-golden.json');
const args = process.argv.slice(2), mode = args.includes('--write') ? 'write' : 'check';
const appArg = args[args.indexOf('--app') + 1];
const APP = args.includes('--app') ? (/^(https?|file):/.test(appArg) ? appArg : 'file://' + path.resolve(appArg)) : 'file://' + path.join(ROOT, 'index.html');
const MODELS = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];
const WALK = ['M11', 'M11-P', 'M11 Monochrom', 'M-EV1', 'M11-P', 'M11'];  // each step toggles that camera
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());  // Google Chrome, else Playwright's own Chromium
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const out = {};

  const fresh = async () => {
    await page.goto(APP); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForFunction(() => window.ProfileMaker && document.querySelector('#filebox'));
    // capture "Save all" zips instead of downloading them
    await page.evaluate(() => {
      window.__zips = [];
      const make = URL.createObjectURL.bind(URL);
      URL.createObjectURL = b => { if (b && b.type === 'application/zip') window.__zips.push(b); return make(b); };
      HTMLAnchorElement.prototype.click = function () {};
    });
  };
  const targets = () => page.evaluate(() => window.ProfileMaker.state.targets.slice());
  // The walks add and remove one camera at a time, as on a page where cameras have been picked: the first camera tapped
  // on a fresh page replaces the two it starts with (st.camsPicked), which would turn every walk into a different one.
  const picked = () => page.evaluate(() => { window.ProfileMaker.state.camsPicked = true; });
  // A camera is picked or left out from the camera button's menu at the top, which stays open to pick more.
  const chip = async m => {
    await picked();
    try {
      await page.click('#topbar [data-cams]', { timeout: 5000 });
      await page.locator('.pop button[role="option"]').filter({ has: page.locator('.n', { hasText: new RegExp('^' + m.replace(/[-\s]/g, '[-\\s]') + '$') }) }).first().click({ timeout: 5000 });
      await page.waitForSelector('.pop', { timeout: 2000 }).catch(() => null);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.pop', { state: 'detached', timeout: 2000 }).catch(() => null);
    }
    catch (e) { await page.screenshot({ path: path.join(require('os').tmpdir(), 'save-golden-stuck.png') }); throw new Error('Could not press the ' + m + ' camera button (cameras ' + (await targets()).join(', ') + '): ' + e.message.split('\n').slice(0, 4).join(' | ')); }
  };
  const chooseCameras = async want => {
    await picked();
    for (const m of MODELS) if (want.includes(m) && !(await targets()).includes(m)) await chip(m);
    for (const m of MODELS) if (!want.includes(m) && (await targets()).includes(m)) await chip(m);
  };
  const closeSheets = async () => { for (let i = 0; i < 3 && await page.locator('.veil').count(); i++) await page.keyboard.press('Escape'); };
  const showSets = () => page.click('#themes [data-theme="sets"]');
  // A starting set, as the page offers it: Start over (in the … menu), then Add all on its group in the library, which on
  // the untouched first profile starts from the whole set. The Factory set is Start over alone.
  const pickSet = async id => {
    await page.click('#topbar [data-tmore]'); await page.locator('.pop button[role="option"]').filter({ has: page.locator('.n', { hasText: /^Start over$/ }) }).first().click();
    if (id === 'factory') return;
    await showSets(); await page.click('#main [data-addall="' + id + '"]');
  };
  const pickPart = async x => { await page.click('#themes [data-theme="' + ({ buttons: 'buttons', layouts: 'screen' }[x.kind] || 'menus') + '"]'); await page.click('#main [data-part="' + x.id + '"]'); };
  const record = async key => {
    const r = await page.evaluate(models => { try { return models.map(m => {
      const p = window.ProfileMaker.prepare(m);
      return { m, file: Engine.serialize(p.doc), notes: p.notes };
    }); } catch (e) { return { error: e.stack }; } }, MODELS);
    if (r.error) throw new Error('Save failed for ' + key + ': ' + r.error);
    r.forEach(x => { out[key + ' > ' + x.m] = process.env.SAVE_DUMP ? { sha: sha(x.file), notes: x.notes, file: x.file } : { sha: sha(x.file), notes: x.notes }; });
  };
  const sets = await (async () => { await fresh(); return page.evaluate(() => SETS.map(s => s.id)); })();
  const parts = await page.evaluate(() => PART_SETS.map(x => ({ id: x.id, kind: x.kind })));
  const subsets = [];
  for (let mask = 1; mask < 16; mask++) subsets.push(MODELS.filter((m, i) => mask & (1 << i)));

  // 1. every starting set with every choice of cameras
  for (const sub of subsets) {
    await fresh(); await chooseCameras(sub);
    for (const id of sets) { await pickSet(id); await record('set ' + id + ' on ' + sub.join('+')); }
  }
  // 2. every set, then a fixed walk of camera changes
  for (const id of sets) {
    await fresh(); await chooseCameras(['M11-P']); await pickSet(id);
    for (let i = 0; i < WALK.length; i++) { await chip(WALK[i]); await record('walk ' + id + ' step ' + i + ' ' + WALK[i]); }
  }
  // 2b. every part set picked in turn, after Night, on every choice of cameras: each kind follows the last
  for (const sub of subsets) {
    await fresh(); await chooseCameras(sub); await pickSet('night');
    for (const x of parts) { await pickPart(x); await record('part ' + x.id + ' on ' + sub.join('+')); }
  }
  // 2c. every part set, then the walk
  for (const x of parts) {
    await fresh(); await chooseCameras(['M11-P']); await pickSet('night'); await pickPart(x);
    for (let i = 0; i < WALK.length; i++) { await chip(WALK[i]); await record('part walk ' + x.id + ' step ' + i + ' ' + WALK[i]); }
  }
  // 3. files opened, then the walk
  const files = { 'sample export': 'test/fixtures/mev1-export.lcse' };
  for (const cam of ['M11-P', 'M-EV1']) for (const t of ['A', 'B', 'C']) files['kit ' + cam + ' ' + t] = 'camera-test/' + cam + '/Test ' + t + '/settings.lcse';
  for (const [name, f] of Object.entries(files)) {
    await fresh();
    await page.evaluate(t => window.ProfileMaker.openText(t, 'settings.lcse'), read(f));
    await closeSheets();  // a file with values the camera skips shows a sheet listing them
    await record('open ' + name);
    for (let i = 0; i < WALK.length; i++) { await chip(WALK[i]); await record('open ' + name + ' walk ' + i + ' ' + WALK[i]); }
  }
  // 3b. the sample export with a part set of each kind, then the walk: part sets without a starting set
  await fresh();
  await page.evaluate(t => window.ProfileMaker.openText(t, 'settings.lcse'), read('test/fixtures/mev1-export.lcse'));
  await closeSheets();
  for (const id of ['rangefinder', 'jpg', 'check']) await pickPart(parts.find(x => x.id === id));
  await record('open sample export parts');
  for (let i = 0; i < WALK.length; i++) { await chip(WALK[i]); await record('open sample export parts walk ' + i + ' ' + WALK[i]); }
  // 4. seeded edit runs: legal values per profile and in every profile, Favorites, added and removed profiles. The runs keep
  // the sets they were recorded with, so a set added later (Architecture, 2026-11-18) doesn't change which set each run
  // starts from; sections 1 and 2 cover new sets.
  const editSets = sets.filter(id => id !== 'architecture');
  for (let run = 0; run < 60; run++) {
    await fresh();
    await chooseCameras(subsets[(run * 7) % subsets.length]);
    await pickSet(editSets[(run * 5) % editSets.length]);
    await page.evaluate(seed => {
      let s = seed * 2654435761 % 4294967296;
      const rnd = n => { s = (s * 1103515245 + 12345) % 2147483648; return s % n; };
      const P = window.ProfileMaker, st = P.state, m = Engine.model(st.doc.model);
      const codes = m.order.filter(c => m.rules[c].k === 'l' && !m.rules[c].dyn && m.rules[c].v.length > 1 && !/^D6B2$|^D124$/.test(c));
      for (let i = 0; i < 12; i++) {
        const c = codes[rnd(codes.length)], r = m.rules[c], v = r.v[rnd(r.v.length)];
        const list = Engine.profiles(st.doc);
        if (!r.p) st.doc.S[c][0] = v;
        else if (rnd(2)) list.forEach(p => { st.doc.S[c][p] = v; });
        else st.doc.S[c][list[rnd(list.length)]] = v;
      }
      const fav = Engine.rule(st.doc.model, 'D1A9');
      if (fav) Engine.profiles(st.doc).forEach(p => { const it = st.doc.S.D1A9[p].items; if (it.length < 11) it.push(fav.v[rnd(fav.v.length)]); if (rnd(2) && it.length) it.splice(rnd(it.length), 1); st.doc.S.D1A9[p].items = it.filter((x, i, a) => a.indexOf(x) === i); });
      if (rnd(2)) Design.addProfile(st.doc, rnd(2) ? Engine.profiles(st.doc)[0] : null);
      if (rnd(3) === 0 && Engine.profiles(st.doc).length > 1) Design.removeProfile(st.doc, Engine.profiles(st.doc)[rnd(Engine.profiles(st.doc).length)]);
      Engine.syncLive(st.doc); P.render();
    }, run + 1);
    await record('edits ' + run);
    await chip(WALK[run % WALK.length]); await record('edits ' + run + ' then ' + WALK[run % WALK.length]);
  }
  // 5. "Save all" zips
  for (const [id, cams] of [['night', ['M11-P', 'M-EV1']], ['night', MODELS], ['factory', ['M11', 'M11 Monochrom']]]) {
    await fresh(); await chooseCameras(cams); await pickSet(id);
    await page.click('#filebox [data-save]');
    await page.locator('.veil button', { hasText: /^Save all/ }).first().click();
    const bytes = await page.evaluate(async () => { const b = window.__zips.pop(); return b ? Array.from(new Uint8Array(await b.arrayBuffer())) : null; });
    out['zip ' + id + ' on ' + cams.join('+')] = { sha: bytes ? sha(Buffer.from(bytes)) : 'no zip', notes: [] };
  }
  // 6. saved sessions reloaded. A session's text is recorded once and kept when the golden is written again, so saves
  // made by older versions of the page go on being loaded and must keep giving the same files.
  const sessionsFile = path.join(ROOT, 'test/fixtures/save-golden-sessions.json');
  let sessions = fs.existsSync(sessionsFile) ? JSON.parse(fs.readFileSync(sessionsFile, 'utf8')) : {};
  if (mode === 'write') {
    for (const [name, step] of [['edited ladder', async () => { await chooseCameras(['M11-P', 'M-EV1']); await pickSet('night'); await page.evaluate(() => { const st = window.ProfileMaker.state; st.doc.S.D00B[2] = 1600; Engine.syncLive(st.doc); window.ProfileMaker.render(); }); }],
      ['opened export', async () => { await page.evaluate(t => window.ProfileMaker.openText(t, 'settings.lcse'), read('test/fixtures/mev1-export.lcse')); await closeSheets(); }],
      ['moved to the M11', async () => { await chooseCameras(['M11-P']); await pickSet('street'); await chip('M11'); await chip('M11-P'); }]]) {
      if (sessions[name]) continue;
      await fresh(); await step();
      await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
      sessions[name] = await page.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/profile-maker|msetter/.test(k)) return { key: k, value: localStorage.getItem(k) }; } return null; });
    }
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 1));
  }
  for (const [name, s] of Object.entries(sessions)) {
    if (!s) { out['session ' + name] = { sha: 'not saved', notes: [] }; continue; }
    await page.goto(APP); await page.evaluate(x => { localStorage.clear(); localStorage.setItem(x.key, x.value); }, s); await page.reload();
    await page.waitForFunction(() => window.ProfileMaker);
    await record('session ' + name);
  }
  await browser.close();

  const n = Object.keys(out).length;
  if (process.env.SAVE_DUMP) fs.writeFileSync(process.env.SAVE_DUMP, JSON.stringify(out));  // every file's text, to compare two versions
  if (errors.length) { console.log('page errors:', [...new Set(errors)].slice(0, 5)); process.exitCode = 1; }
  if (mode === 'write') { fs.writeFileSync(GOLDEN, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"')); console.log('recorded', n, 'files'); return; }
  const gold = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  const keys = new Set([...Object.keys(gold), ...Object.keys(out)]); let diff = 0;
  for (const k of keys) {
    const a = gold[k], b = out[k];
    if (!a || !b) { diff++; console.log((a ? 'missing now: ' : 'new: ') + k); continue; }
    if (a.sha !== b.sha) { diff++; if (diff <= 20) console.log('file differs: ' + k); }
    else if (JSON.stringify(a.notes) !== JSON.stringify(b.notes)) { diff++; if (diff <= 20) console.log('notes differ: ' + k + '\n  was ' + JSON.stringify(a.notes) + '\n  now ' + JSON.stringify(b.notes)); }
  }
  console.log(diff + ' differences in ' + keys.size + ' files');
  if (diff) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
