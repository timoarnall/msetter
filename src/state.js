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
  // camsPicked: whether the person has picked a camera; until then the first one tapped replaces the two the page starts with.
  var st = { doc: null, targets: ['M11-P', 'M-EV1'], bases: {}, theme: 'sets', sel: 1, split: {}, setId: 'factory', parts: {}, query: '', filter: 'all', view: '', camsPicked: false };
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
  function snapshot() { return JSON.stringify({ doc: st.doc, sel: st.sel, setId: st.setId, parts: st.parts, targets: st.targets, origin: st.origin, bases: st.bases, split: st.split }); }
  // remember() before a change notes the state; the change becomes an undo step when it is saved, and only when
  // something did change, so Undo never steps through nothing.
  // made: whether the last remember() led to an Undo step, so a notice offers Undo only when there is one to take.
  var pending = null, made = false;
  function remember() { pending = snapshot(); made = false; hideNotice(); Motion.cancel(); }  // a new action cancels ticks still waiting
  function commit() {
    if (pending !== null && pending !== snapshot()) { past.push(pending); if (past.length > 80) past.shift(); future = []; made = true; }
    pending = null;
  }
  function madeStep() { return made; }
  function restore(s) { var o = JSON.parse(s); st.doc = o.doc; st.sel = o.sel; st.setId = o.setId; st.parts = o.parts || {}; if (o.targets) st.targets = o.targets; st.origin = o.origin || st.origin; if (o.bases) st.bases = o.bases; st.split = o.split || {}; fixSel(); }
  function fixSel() { if (profiles().indexOf(st.sel) < 0) st.sel = profiles()[0]; }
  function undo() {
    pending = null; closeMenu(); closeSheets();
    if (!past.length) return;
    var cur = snapshot(), prev = past.pop(); future.push(cur); restore(prev); E.syncLive(st.doc); save(); Motion.hint('undo'); App.render();
    notice('Undid: ' + whatChanged(JSON.parse(prev), JSON.parse(cur)), 'redo');
  }
  function redo() {
    pending = null; closeMenu(); closeSheets();
    if (!future.length) return;
    var cur = snapshot(), next = future.pop(); past.push(cur); restore(next); E.syncLive(st.doc); save(); App.render();
    notice('Redid: ' + whatChanged(JSON.parse(cur), JSON.parse(next)), 'undo');
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
      diffs.push(settingName(code) + (r.p ? (slots.length > 1 ? ' in ' + slots.length + ' profiles' : ' in ' + name(slots[0])) : ''));
    });
    if (!diffs.length) return 'a change';
    return diffs[0] + (diffs.length > 1 ? ' and ' + (diffs.length - 1) + ' more' : '');
  }

  function save() { commit(); try { localStorage.setItem(STORE, JSON.stringify({ doc: st.doc, targets: st.targets, bases: st.bases, theme: st.theme, sel: st.sel, split: st.split, setId: st.setId, parts: st.parts, view: st.view, origin: st.origin, camsPicked: st.camsPicked })); } catch (e) { /* storage may be off */ } }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(STORE));
      if (o && o.doc && o.doc.S) {
        Object.assign(st, o);
        // older saves may name a camera that is no longer offered
        st.targets = (st.targets || []).filter(function (m) { return MODELS.indexOf(m) >= 0; });
        if (!st.targets.length) st.targets = ['M11-P', 'M-EV1'];
        if (o.camsPicked === undefined) st.camsPicked = st.targets.join() !== 'M11-P,M-EV1';  // saved before this was kept
        if (MODELS.indexOf(st.doc.model) < 0) st.doc = E.translate(st.doc, primary()).doc;
        if (MODELS.indexOf(st.view) < 0) st.view = '';
        var fresh = E.blank(st.doc.model); Object.keys(fresh.S).forEach(function (c) { if (!st.doc.S[c]) st.doc.S[c] = fresh.S[c]; });
        if (!profiles().length) D.addProfile(st.doc);
        delete st.fileNames;  // older saves kept the opened files' names; nothing reads them
        st.parts = st.parts || {};  // older saves have no part sets
        fixSel();
        return true;
      }
    } catch (e) { /* ignore */ }
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
  }

  function changesSince() {
    var o = st.origin; if (!o) return [];
    var m = E.model(st.doc.model), out = [], ps = profiles(), was = E.profiles({ S: o.S });
    ps.forEach(function (q) {
      var c = E.NAME_CODES[q - 1];
      if (was.indexOf(q) < 0) out.push('Added ' + pname(q));
      else if (o.S[c] && o.S[c][0] !== st.doc.S[c][0]) out.push(String(o.S[c][0]).toUpperCase() + ' renamed ' + String(st.doc.S[c][0]).toUpperCase());
    });
    was.forEach(function (q) { if (ps.indexOf(q) < 0) out.push('Removed ' + String(o.S[E.NAME_CODES[q - 1]][0]).toUpperCase()); });
    m.order.forEach(function (code) {
      var r = m.rules[code];
      if (code === 'D1A9' && o.S[code]) {
        var fl = ps.filter(function (q) { return was.indexOf(q) >= 0 && JSON.stringify(o.S[code][q].items) !== JSON.stringify(st.doc.S[code][q].items); });
        if (fl.length && fl.length === ps.length && ps.length > 1) out.push('Every profile: Favorites');
        else fl.forEach(function (q) { out.push(ps.length > 1 ? pname(q) + ': Favorites' : 'Favorites'); });
        return;
      }
      if (r.dyn || code === 'D6B2' || code === 'D124' || E.NAME_CODES.indexOf(code) >= 0 || !o.S[code]) return;
      var kept = r.p ? ps.filter(function (q) { return was.indexOf(q) >= 0; }) : [0];
      var lines = kept.map(function (q) {
        var a = o.S[code][q], b = st.doc.S[code][q];
        if (JSON.stringify(a) === JSON.stringify(b)) return null;
        return { q: q, text: settingName(code) + (typeof b === 'object' ? '' : ' ' + short(code, a) + ' to ' + short(code, b)) };
      }).filter(Boolean);
      if (r.p && kept.length > 1 && lines.length === kept.length && lines.every(function (l) { return l.text === lines[0].text; })) out.push('Every profile: ' + lines[0].text);
      else lines.forEach(function (l) { out.push((r.p && ps.length > 1 ? pname(l.q) + ': ' : '') + l.text); });
    });
    return out;
  }

  function canUndo() { return past.length > 0; }
  function canRedo() { return future.length > 0; }

  Object.assign(App, { MODELS: MODELS, st: st, primary: primary, rule: rule, options: options, profiles: profiles, partSet: partSet, partsPicked: partsPicked,
    pname: pname, remember: remember, madeStep: madeStep, fixSel: fixSel, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    save: save, load: load, markOrigin: markOrigin, begin: begin, changesSince: changesSince });
})(window.App = window.App || {});
