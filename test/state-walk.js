// A seeded random walk through the page's events, checking the page's rules after every step: App.checkState() (the
// rules the page always keeps) and what each kind of step promises (a profile step marks nothing and is never listed
// as a rename; an edit marks its value; a row joins into a bar only when asked; Undo then Redo returns the same state).
// Events: library add, Add all, Saved (keep, add, forget), Blank, Duplicate, remove, slot moves, Set per profile and
// Use … in every profile, part sets, filters, sections, Undo, Redo, Start over, opening the M-EV1 sample, cameras,
// the default profile. Value edits go through the page's own clicks: the control, then an item of its menu.
// Run with the app served: node test/state-walk.js [steps] [seeds...] [url]. A failure prints its seed and the steps.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const APP = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const URL = args.find(a => /^http/.test(a)) || 'http://127.0.0.1:8094/index.html';
const nums = args.filter(a => /^\d+$/.test(a)).map(Number);
const STEPS = nums[0] || 400, SEEDS = nums.length > 1 ? nums.slice(1) : [7, 11, 23];
const mev1 = fs.readFileSync(path.join(APP, 'test/fixtures/mev1-export.lcse'), 'utf8');

(async () => {
  let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch (e) { browser = await chromium.launch(); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const report = {}; let failed = false;
  for (const seed0 of SEEDS) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForFunction(() => window.App && App.st && App.st.doc);
    const res = await page.evaluate(([mev1, STEPS, seed0]) => {
      let seed = seed0; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >>> 8) % n; };  // the low bits of this generator repeat quickly
      const pickOf = a => a[rnd(a.length)];
      const st = App.st, E = Engine, D = Design, bad = [], seen = {}, counts = {};
      const snap = () => JSON.stringify({ doc: st.doc, sel: st.sel, setId: st.setId, parts: st.parts, targets: st.targets, origin: st.origin, bases: st.bases, split: st.split, recs: st.recs, drop: st.drop });
      const ps = () => App.profiles();
      const SKIP = { D6B2: 1, D124: 1 };
      // Every (profile name | code) with a change dot, and every camera-wide code with one.
      const markSet = () => {
        const m = E.model(st.doc.model), out = new Set();
        m.order.forEach(code => {
          const r = m.rules[code]; if (r.dyn || SKIP[code] || E.NAME_CODES.indexOf(code) >= 0) return;
          if (r.p) ps().forEach(p => { if (App.edited({ code }, p)) out.add(App.pname(p) + '|' + code); });
          else if (App.edited({ code }, 0)) out.add('camera|' + code);
        });
        return out;
      };
      // Which rows are one bar: every non-list code (its All settings row) and every catalogue row.
      const shapeOf = () => {
        const o = {}; if (ps().length < 2) return o;
        const m = E.model(st.doc.model);
        m.order.forEach(code => { if (!m.rules[code].dyn && !SKIP[code] && E.NAME_CODES.indexOf(code) < 0) o['code:' + code] = App.joined({ code }); });
        CATALOGUE.themes.forEach(t => t.rows.forEach(r => { if (App.visible(r)) o['row:' + App.rowKey(r)] = App.joined(r); }));
        return o;
      };
      const note = (what, x) => { const k = x.replace(/\d+/g, '#').slice(0, 90); counts[k] = (counts[k] || 0) + 1; if (!seen[k]) { seen[k] = 1; bad.push(what + ': ' + x); } };
      const check = (what, ctx) => {
        App.checkState().forEach(x => note(what, x));
        const names = ps().map(App.pname); if (new Set(names).size !== names.length) note(what, 'two profiles share a name ' + names);
        if (st.targets.some(m => App.MODELS.indexOf(m) < 0)) note(what, 'targets ' + st.targets);  // none is allowed: a first visit has none
        if (st.targets.slice().sort((a, b) => App.MODELS.indexOf(a) - App.MODELS.indexOf(b)).join() !== st.targets.join()) note(what, 'targets out of order ' + st.targets);
        if (st.setId && !SETS.some(s => s.id === st.setId)) note(what, 'setId ' + st.setId);
        Object.keys(st.parts).forEach(k => { if (!App.partSet(st.parts[k])) note(what, 'part ' + st.parts[k]); });
        const d = st.doc.S.D124[0]; if (d !== 0 && ps().indexOf(d) < 0) note(what, 'Default profile ' + d + ' is not saved');
        if (document.querySelector('#main [data-p]') && ps().length > 1) {
          // the table and scopeOf agree: a bar's change goes to every profile, a tile's to its own
          document.querySelectorAll('#main .gcell.wide [data-p="all"][data-kind="pick"]').forEach(el => {
            const row = App.rowByKey(el.dataset.row); if (row && row.code && App.scopeOf(row.code) !== 'all') note(what, 'bar ' + el.dataset.row + ' but a change goes to one profile');
          });
        }
        // joins: a row becomes one bar only when it starts equal or when asked
        if (ctx.shape0 && !ctx.joinAsked && ctx.n0 > 1) {
          const s1 = shapeOf();
          Object.keys(s1).forEach(k => { if (s1[k] && ctx.shape0[k] === false) note(what, 'row joined without being asked: ' + k + ' after ' + ctx.kind); });
        }
        // marks: a structural step never marks a value; an edit to one profile marks its value
        if (ctx.marks0 && ctx.structural) {
          const m1 = markSet(); const fresh = [...m1].filter(x => !ctx.marks0.has(x));
          if (fresh.length) note(what, ctx.kind + ' marked values nobody changed: ' + fresh.slice(0, 3).join(', ') + (fresh.length > 3 ? ' and ' + (fresh.length - 3) + ' more' : ''));
          const lines = App.changesSince().filter(l => /^Renamed /.test(l));
          if (lines.length && !ctx.renamesBefore) note(what, ctx.kind + ' listed as renames: ' + lines.slice(0, 2).join('; '));
        }
        if (ctx.edit && ctx.edit.p !== 'all' && ctx.edit.changed) {  // an edit is marked unless the value is back where its profile started
          const { code, p } = ctx.edit, rec = st.recs[p], v = st.doc.S[code][p];
          const was = !rec ? undefined : rec.at ? rec.at[code] : st.origin.S[code] && st.origin.S[code][rec.from];
          if (!App.edited({ code }, p) && JSON.stringify(was) !== JSON.stringify(v)) note(what, 'edit not marked (' + code + ')');
        }
        if (ctx.noStepButton) note(what, 'notice offers "' + ctx.noStepButton + '" after a pick that changed nothing');
      };

      const themes = ['exposure', 'buttons', 'screen', 'look', 'shooting', 'camera', 'all'];
      const show = t => { st.theme = t; App.save(); App.render(); };
      // A value edit through the page: a control on the page shown, then an item of its menu (values and the scope choice).
      const edit = ctx => {
        show(pickOf(themes));
        const ctls = [].filter.call(document.querySelectorAll('#main [data-kind="pick"], #main [data-kind="toggle"]'), el => !el.classList.contains('unused') || rnd(2));
        if (!ctls.length) return 'edit (none)';
        const c = pickOf(ctls), p = c.dataset.p === 'all' ? 'all' : +c.dataset.p, row = App.rowByKey(c.dataset.row);
        const code = row && App.rowCode(row, p === 'all' ? ps()[0] : p);
        const before = code ? JSON.stringify(st.doc.S[code][p === 'all' ? ps()[0] : p]) : '';
        const wasInOrigin = p !== 'all' && st.origin && E.profiles({ S: st.origin.S }).indexOf(p) >= 0;
        if (c.dataset.kind === 'toggle') { c.click(); ctx.kind = 'toggle'; }
        else {
          c.click();
          const opts = [].slice.call(document.querySelectorAll('.pop button[role=option]')); if (!opts.length) { App.closeMenu(); return 'edit (no menu)'; }
          const o = pickOf(opts), label = o.innerText.split('\n')[0];
          ctx.kind = /^Set per profile/.test(label) ? 'split' : /^Use .* in every profile/.test(label) ? 'useEverywhere' : 'edit';
          if (ctx.kind === 'useEverywhere') ctx.joinAsked = true;
          o.click();
        }
        if (ctx.kind === 'edit' || ctx.kind === 'toggle') {
          const after = code ? JSON.stringify(st.doc.S[code][p === 'all' ? ps()[0] : p]) : '';
          ctx.edit = { code, p, wasInOrigin, changed: before !== after };
          const btn = document.querySelector('#notice.show [data-act]');
          if (btn && !App.madeStep()) ctx.noStepButton = btn.textContent;
        }
        return ctx.kind + ' ' + (row ? App.rowKey(row) : '?') + ' in ' + (p === 'all' ? 'every profile' : App.pname(p));
      };
      const acts = [
        [3, ctx => { const m = App.MODELS[rnd(4)]; App.toggleTarget(m); ctx.kind = 'camera'; return 'camera ' + m; }],
        [2, ctx => { const g = pickOf(LIBRARY.groups); ctx.joinAsked = true; App.useSet(g.id); return 'whole set ' + g.id; }],
        [3, ctx => {
          const g = pickOf(LIBRARY.groups), ph = ps().length === 1 && st.setId === 'factory' && !App.changesSince().length && !Object.keys(st.bases).length;
          if (ph) ctx.joinAsked = true; else ctx.structural = true;
          ctx.kind = 'Add all'; App.addAll(g.id); return 'Add all ' + g.id + (ph ? ' (whole set)' : '');
        }],
        [6, ctx => { const g = pickOf(LIBRARY.groups), x = pickOf(g.items); ctx.structural = true; ctx.kind = ps().length === 1 ? 'library add on the first profile' : 'library add'; App.addFromLibrary(x.id); return 'library ' + x.id; }],
        [1, ctx => { const y = LIBRARY.yours(); if (!y.length) return 'saved add (none)'; const x = pickOf(y); ctx.structural = true; ctx.kind = 'saved add'; App.addFromLibrary('yours:' + x.name); return 'saved add ' + x.name; }],
        [1, ctx => { const p = pickOf(ps()); App.keepProfile(p); return 'keep ' + App.pname(p); }],
        [1, ctx => { const y = LIBRARY.yours(); if (!y.length) return 'forget (none)'; const x = pickOf(y); App.forgetYours(x.name); return 'forget ' + x.name; }],
        [2, ctx => { ctx.structural = true; ctx.kind = 'blank'; App.addBlank(); return 'blank'; }],
        [2, ctx => { if (ps().length >= 6) return 'duplicate (full)'; ctx.structural = true; ctx.kind = 'duplicate'; App.duplicate(st.sel); return 'duplicate'; }],
        [3, ctx => { if (ps().length < 2) return 'remove (one left)'; const p = pickOf(ps()); ctx.structural = true; ctx.kind = 'remove'; App.removeProfile(p); return 'remove ' + p; }],
        [3, ctx => {
          if (ps().length < 2) return 'move (one)';
          show('sets'); const grips = document.querySelectorAll('#main .pcard:not(.blank) .grip'); const i = rnd(grips.length), key = rnd(2) ? 'ArrowRight' : 'ArrowLeft';
          ctx.structural = true; ctx.kind = 'move';
          grips[i].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); return 'move ' + (i + 1) + ' ' + key;
        }],
        [12, edit],
        [2, ctx => { const t = pickOf(themes.concat(['sets'])); ctx.kind = 'section'; show(t); return 'section ' + t; }],
        [2, ctx => { show('all'); const f = pickOf(['all', 'diff', 'changed']); document.querySelector('[data-filter="' + f + '"]').click(); return 'filter ' + f; }],
        [2, ctx => {
          const kind = pickOf(['buttons', 'favorites', 'layouts']); show({ buttons: 'buttons', favorites: 'menus', layouts: 'screen' }[kind]);
          const cards = document.querySelectorAll('#main [data-part]'); if (!cards.length) return 'part (none)';
          const c = pickOf([].slice.call(cards)); ctx.joinAsked = true; ctx.kind = 'part set'; c.click(); App.closeSheets(); return 'part ' + c.dataset.part;
        }],
        [2, ctx => { if (ps().length < 2) return 'split (one)'; const t = pickOf(CATALOGUE.themes.filter(t => t.rows.length)), r = pickOf(t.rows.filter(App.visible)); if (!r) return 'split (none)'; ctx.kind = 'split'; App.splitRow(r); return 'split ' + App.rowKey(r); }],
        [2, ctx => { if (ps().length < 2) return 'same (one)'; const t = pickOf(CATALOGUE.themes.filter(t => t.rows.length)), r = pickOf(t.rows.filter(App.visible)); if (!r || r.ctl === 'favorites') return 'same (none)'; ctx.joinAsked = true; ctx.kind = 'useEverywhere'; App.useEverywhere(r, pickOf(ps())); return 'same ' + App.rowKey(r); }],
        [4, ctx => { ctx.joinAsked = true; ctx.kind = 'undo'; App.undo(); return 'undo'; }],
        [2, ctx => { ctx.joinAsked = true; ctx.kind = 'redo'; App.redo(); return 'redo'; }],
        [2, ctx => {
          ctx.joinAsked = true; ctx.kind = 'roundtrip';
          if (!App.canUndo()) return 'roundtrip (nothing)';
          const s0 = snap(); App.undo(); const mid = snap(); App.redo(); const s1 = snap();
          if (s0 !== s1) note('roundtrip', 'Undo then Redo did not return the same state');
          if (mid === s0) note('roundtrip', 'Undo changed nothing');
          return 'undo+redo';
        }],
        [1, ctx => { ctx.joinAsked = true; ctx.kind = 'start over'; App.startOver(); return 'start over'; }],
        [1, ctx => { ctx.joinAsked = true; ctx.kind = 'open'; App.openText(mev1, 'mev1.lcse'); App.closeSheets(); return 'open mev1'; }],
        [1, ctx => { const p = pickOf(ps()); App.remember(); st.doc.S.D124 = [p]; App.changed(); return 'default ' + p; }],
        [2, ctx => { show('sets'); const cards = document.querySelectorAll('#main [data-pcard]'); const c = pickOf([].slice.call(cards)); c.querySelector('.pc-name').click(); return 'select ' + c.dataset.pname; }]
      ];
      const bag = []; acts.forEach((a, i) => { for (let k = 0; k < a[0]; k++) bag.push(i); });
      const trail = [];
      for (let i = 0; i < STEPS; i++) {
        const ctx = { shape0: shapeOf(), n0: ps().length, marks0: markSet(), renamesBefore: App.changesSince().some(l => /^Renamed /.test(l)) };
        let a;
        try { a = acts[pickOf(bag)][1](ctx); } catch (e) { a = 'threw ' + String(e).slice(0, 120); note('step ' + i, 'an action threw: ' + String(e).slice(0, 120)); }
        App.closeMenu(); if (document.querySelector('.veil')) App.closeSheets();
        trail.push(a);
        try { check(i + ' after ' + trail.slice(-4).join(' > '), ctx); } catch (e) { note('check ' + i, 'check threw ' + String(e).slice(0, 120)); }
      }
      return { bad, counts };
    }, [mev1, STEPS, seed0]);
    res.pageErrors = errors.slice(0, 10);
    report['seed ' + seed0] = res;
    console.log('seed', seed0, ':', res.bad.length, 'kinds of break');
    res.bad.forEach(b => console.log('  ' + b)); if (res.bad.length || errors.length) failed = true;
    if (errors.length) console.log('  page errors:', errors.slice(0, 5));
    await page.close();
  }
  await browser.close();
  console.log(failed ? 'the walk broke a rule' : 'every rule held');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
