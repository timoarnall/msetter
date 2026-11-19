// The design and everything about it the page keeps: the cameras, the selected profile, Undo and Redo,
// the browser's storage, and the starting point that changes are counted from.
(function (App) {
  'use strict';
  var E = Engine, D = Design, W = Words;
  var notice = App.notice, hideNotice = App.hideNotice, closeMenu = App.closeMenu, closeSheets = App.closeSheets;
  var short = W.short, settingName = W.settingName;

  // The M11-D has no user profiles and no way to import a settings file, so it is not offered (see docs/cameras.md).
  var MODELS = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];
  var STORE = 'profile-maker-v1';
  // targets: the cameras the file is for. A first visit has none (the owner's call, 2026-11-19: no default holds one
  // person's kit); until one is chosen the design sits on the M11-P, the button reads Choose camera and Save asks.
  // camsPicked: whether the person has picked a camera; until then a file opened takes its own camera alone. A tap in the
  // camera menu always adds or removes just that camera.
  // recs and drop: what each profile is compared with for the change marks (src/changes.js).
  var st = { doc: null, targets: [], bases: {}, theme: 'sets', sel: 1, split: {}, setId: 'factory', parts: {}, query: '', filter: 'all', view: '', camsPicked: false, recs: {}, drop: [] };
  var past = [], future = [];

  function primary() { for (var i = 0; i < MODELS.length; i++) if (st.targets.indexOf(MODELS[i]) >= 0) return MODELS[i]; return 'M11-P'; }
  function rule(code) { return E.rule(st.doc.model, code); }
  function options(code) {
    var ms = st.targets.filter(function (m) { return E.rule(m, code); });
    if (ms.indexOf(st.doc.model) < 0) ms.unshift(st.doc.model);
    var shared = E.sharedOptions(ms, code);
    return shared.length ? shared : E.options(st.doc.model, code);
  }
  function profiles() { return E.profiles(st.doc); }
  function partSet(id) { return PART_SETS.filter(function (x) { return x.id === id; })[0]; }
  // The part sets picked since the starting point, in the order of PART_SETS, for the save path.
  function partsPicked() { return PART_SETS.filter(function (x) { return st.parts[x.kind] === x.id; }); }
  // The camera shows every profile name in capitals, so the page does too; a name read from a file stays as the file has it.
  function pname(p) { return String(E.profileName(st.doc, p) || '').toUpperCase(); }

  // What Undo and Redo bring back: the design and everything that decides what Save writes or where a change goes.
  // Deliberately left out: the section shown (theme), the camera drawn (view), the All settings search (query), mounted
  // cards, the Q3 files (src/q3page.js), the pretend camera, sheets and the notice. docs/state.md has the full map.
  function snapshot() { return JSON.stringify({ doc: st.doc, sel: st.sel, setId: st.setId, parts: st.parts, targets: st.targets, origin: st.origin, bases: st.bases, split: st.split, recs: st.recs, drop: st.drop }); }
  // remember() before a change notes the state; the change becomes an undo step when it is saved, and only when
  // something did change, so Undo never steps through nothing.
  // made: whether the last remember() led to an Undo step, so a notice offers Undo only when there is one to take.
  // Each step keeps the words its notice said ("Removed GOLDEN"), so Undo and Redo say them back.
  var pending = null, made = false;
  function remember() { pending = snapshot(); made = false; hideNotice(); }
  function commit() {
    if (pending !== null && pending !== snapshot()) { past.push({ s: pending, w: '' }); if (past.length > 80) past.shift(); future = []; made = true; }
    pending = null;
  }
  function nameStep(words) { if (made && past.length && !past[past.length - 1].w && !/^(Undid|Redid): /.test(words)) past[past.length - 1].w = words; }
  // "Removed GOLDEN" said back: "removed GOLDEN". Only a step's verb is lowered, never a name (Rangefinder, ISO).
  function said(w) { return w.replace(/^(Added|Removed|Moved|Renamed|Duplicated|Started|Opened|Used|Set|Saved|Turned) /, function (v) { return v.toLowerCase(); }); }
  function madeStep() { return made; }
  function restore(s) { var o = JSON.parse(s); st.doc = o.doc; st.sel = o.sel; st.setId = o.setId; st.parts = o.parts || {}; if (o.targets) st.targets = o.targets; st.origin = o.origin || st.origin; if (o.bases) st.bases = o.bases; st.split = o.split || {}; st.recs = o.recs || {}; st.drop = o.drop || []; seen = null; fixSel(); }
  function fixSel() { if (profiles().indexOf(st.sel) < 0) st.sel = profiles()[0]; }
  function undo() {
    pending = null; closeMenu(); closeSheets();
    if (!past.length) return;
    var cur = snapshot(), prev = past.pop(); future.push({ s: cur, w: prev.w }); restore(prev.s); E.syncLive(st.doc); save(); Motion.hint('undo'); App.render();
    notice('Undid: ' + (prev.w ? said(prev.w) : whatChanged(JSON.parse(prev.s), JSON.parse(cur))), 'redo');
  }
  function redo() {
    pending = null; closeMenu(); closeSheets();
    if (!future.length) return;
    var cur = snapshot(), next = future.pop(); past.push({ s: cur, w: next.w }); restore(next.s); E.syncLive(st.doc); save(); Motion.hint('redo'); App.render();
    notice('Redid: ' + (next.w ? said(next.w) : whatChanged(JSON.parse(cur), JSON.parse(next.s))), 'undo');
  }

  // What differs between two states, in words, so Undo and Redo say what they did, wherever it was.
  function whatChanged(a, b) {
    if ((a.origin && a.origin.from) !== (b.origin && b.origin.from) && b.origin && b.origin.from) return b.origin.from;
    if (JSON.stringify(a.targets) !== JSON.stringify(b.targets)) return 'the cameras';
    var kind = Object.keys(b.parts || {}).filter(function (k) { return (a.parts || {})[k] !== b.parts[k]; })[0];
    if (kind) return partSet(b.parts[kind]).name + ' ' + W.PART_KINDS[kind].also;  // "Rangefinder buttons"
    var m = E.model(b.doc.model), diffs = [], name = function (q) { return String(E.profileName(b.doc, q) || E.profileName(a.doc, q) || '').toUpperCase(); };
    var pa = E.profiles(a.doc).length, pb = E.profiles(b.doc).length;
    if (pa !== pb) diffs.push(pa < pb ? 'a new profile' : 'a removed profile');
    m.order.forEach(function (code) {
      var x = a.doc.S[code], y = b.doc.S[code], r = m.rules[code];
      if (!x || !y || code === 'D6B2' || JSON.stringify(x) === JSON.stringify(y)) return;
      if (E.NAME_CODES.indexOf(code) >= 0) { diffs.push('a profile name'); return; }
      var slots = []; for (var i = r.p ? 1 : 0; i < y.length; i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) slots.push(i);
      if (!slots.length) return;
      var ps = E.profiles(b.doc).filter(function (q) { return slots.indexOf(q) >= 0; }); if (r.p && !ps.length) return;  // only unsaved slots differ
      diffs.push(settingName(code) + (r.p ? (ps.length === E.profiles(b.doc).length && ps.length > 1 ? ' in every profile' : ' in ' + W.listOf(ps.map(name))) : ''));
    });
    if (!diffs.length) return 'a change';
    return diffs[0] + (diffs.length > 1 ? ' and ' + (diffs.length - 1) + ' more' : '');
  }

  function save() {
    st.recs = Changes.settle(st.doc, st.recs); seen = null;
    if (App.keepApart) App.keepApart();
    commit();
    try { localStorage.setItem(STORE, JSON.stringify({ doc: st.doc, targets: st.targets, bases: st.bases, theme: st.theme, sel: st.sel, split: st.split, setId: st.setId, parts: st.parts, view: st.view, origin: st.origin, camsPicked: st.camsPicked, recs: st.recs, drop: st.drop })); }
    catch (e) { if (!unkept) { unkept = true; notice('This browser isn’t keeping your profiles: its storage is off or full', 'none'); } }  // said once
  }
  // What the browser kept, typed like an opened file before the page reads it. A stored design the page can't use is
  // kept aside under STORE + '-broken' (shelve) and the page starts fresh, so one bad copy never leaves a blank page.
  var shelved = false, unkept = false;
  function shelve() { shelved = true; try { localStorage.setItem(STORE + '-broken', localStorage.getItem(STORE)); localStorage.removeItem(STORE); } catch (e) { /* storage off */ } }
  function wasShelved() { return shelved; }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(STORE));
      if (o && o.doc && o.doc.S && typeof o.doc.S === 'object') {
        if (typeof o.doc.model !== 'string' || !E.RULES.models[o.doc.model]) o.doc.model = 'M11-P';
        E.sanitize(o.doc);
        if (o.origin && (!o.origin.S || typeof o.origin.S !== 'object' || !E.RULES.models[o.origin.model])) delete o.origin;
        if (o.origin) E.sanitize(o.origin);
        ['split', 'parts', 'bases'].forEach(function (k) { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
        if (!Array.isArray(o.targets)) o.targets = [];
        if (!Array.isArray(o.drop)) o.drop = [];
        if (!o.recs || typeof o.recs !== 'object' || Array.isArray(o.recs)) delete o.recs;  // saved before records: rebuilt below
        if (typeof o.sel !== 'number') delete o.sel;
        Object.assign(st, o);
        // older saves may name a camera that is no longer offered
        st.targets = (st.targets || []).filter(function (m) { return MODELS.indexOf(m) >= 0; });
        if (o.camsPicked === undefined) st.camsPicked = st.targets.length > 0;  // saved before this was kept
        if (MODELS.indexOf(st.doc.model) < 0) st.doc = E.translate(st.doc, primary()).doc;
        if (st.origin && st.origin.model !== st.doc.model) st.origin = Object.assign({}, st.origin, { model: st.doc.model, S: E.translate({ model: st.origin.model, S: st.origin.S }, st.doc.model).doc.S });  // the start moves with the design
        if (MODELS.indexOf(st.view) < 0) st.view = '';
        var fresh = E.blank(st.doc.model); Object.keys(fresh.S).forEach(function (c) { if (!st.doc.S[c]) st.doc.S[c] = fresh.S[c]; });
        if (!profiles().length) D.addProfile(st.doc);
        delete st.fileNames;  // older saves kept the opened files' names; nothing reads them
        st.parts = st.parts || {};  // older saves have no part sets
        if (!st.recs || !o.recs) st.recs = Changes.settle(st.doc, st.origin ? Changes.start({ S: st.origin.S }) : {});
        fixSel();
        return true;
      }
    } catch (e) { shelve(); }
    return false;
  }

  // The starting point of this design (a starting set or an opened file). Changed values get a dot,
  // and the Save sheet lists them, so nothing changes without you seeing it.
  function markOrigin(from) { st.origin = { model: st.doc.model, S: E.clone(st.doc.S), from: from || '' }; }
  // A new design: a starting set, an opened file, starting over or a first visit. What belonged to the old design
  // goes: its rows split per profile, the files it was based on, the part sets picked, the selected profile. Then save()
  // and render().
  // o: { from: words for the starting point, setId, bases: opened file per camera, targets, theme }
  function begin(doc, o) {
    if (o.targets) st.targets = o.targets;
    if (o.theme) st.theme = o.theme;
    st.doc = doc; st.setId = o.setId || null; st.parts = {}; st.bases = o.bases || {}; st.split = {};
    st.sel = profiles()[0] || 1;
    markOrigin(o.from);
    st.recs = Changes.start(st.doc); st.drop = []; seen = null;
  }

  // What changed, worked out once per redraw (src/changes.js): lines for the count, the list and the Save sheet, and
  // marks for the dots, keyed 'code slot'.
  var seen = null;
  function changes() {
    if (!seen) seen = Changes.compute(st.doc, st.origin, Changes.settle(st.doc, st.recs), st.drop, { name: settingName, value: short, order: pageOrder() });
    return seen;
  }
  // Every setting in the order the pages show it, so the list of changes reads like the pages.
  var ORDER = null;
  function pageOrder() {
    if (ORDER) return ORDER;
    ORDER = [];
    CATALOGUE.themes.forEach(function (t) { t.rows.forEach(function (r) {
      if (r.code) ORDER.push(r.code);
      if (r.ctl === 'layouts') CATALOGUE.LAYOUTS.forEach(function (L) { for (var k in L) ORDER.push(L[k]); });
      if (r.codeFor) Object.keys(CATALOGUE.STYLE).forEach(function (s) { CATALOGUE.STYLE[s].forEach(function (c) { if (c) ORDER.push(c); }); });
    }); });
    return ORDER;
  }
  function changesSince() { return changes().lines; }
  function forget() { seen = null; }
  // Was the value of code in profile q changed? Returns what it was, or undefined.
  function wasAt(code, q) { var r = rule(code); if (!r) return undefined; return changes().marks[code + ' ' + E.slot(r, q)]; }
  function markedAt(code, q) { var r = rule(code); return !!r && (code + ' ' + E.slot(r, q)) in changes().marks; }
  // Profile p is a new profile in its slot (the first library profile in place of the untouched USER1): it gets a
  // record of its own, and the start profile it replaced leaves without a line.
  function renew(p) {
    var x = st.recs[p], r = Object.assign({}, st.recs); delete r[p]; r = Changes.settle(st.doc, r);
    if (x && !x.at) { if (st.drop.indexOf(x.from) < 0) st.drop = st.drop.concat([x.from]); r[p].took = x.from; }
    st.recs = r; seen = null;
  }
  // Notes something about profile q's record, such as the library entry it came from: { lib: id }.
  function tag(q, props) { st.recs = Changes.settle(st.doc, st.recs); st.recs[q] = Object.assign({}, st.recs[q], props); seen = null; }
  // Whether a profile that came from library entry id is in your profiles, renamed or not.
  function fromLibrary(id) { return profiles().some(function (q) { return st.recs[q] && st.recs[q].lib === id; }); }
  // Profiles moved: their records move with them.
  function moveRecs(from, to) { st.recs = Changes.move(st.doc, Changes.settle(st.doc, st.recs), from, to); seen = null; }

  function canUndo() { return past.length > 0; }
  function canRedo() { return future.length > 0; }

  Object.assign(App, { MODELS: MODELS, st: st, primary: primary, rule: rule, options: options, profiles: profiles, partSet: partSet, partsPicked: partsPicked,
    pname: pname, remember: remember, madeStep: madeStep, nameStep: nameStep, fixSel: fixSel, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    save: save, load: load, shelve: shelve, wasShelved: wasShelved, STORE: STORE, markOrigin: markOrigin, begin: begin, changesSince: changesSince,
    changes: changes, forget: forget, wasAt: wasAt, markedAt: markedAt, renew: renew, moveRecs: moveRecs, tag: tag, fromLibrary: fromLibrary });
})(window.App = window.App || {});
