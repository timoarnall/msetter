// Msetter: the page. State, the profile table, menus, sheets, opening and saving.
(function () {
  'use strict';
  var E = Engine, C = CATALOGUE, D = Design;
  var MODELS = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom', 'M11-D'];
  var STORE = 'profile-maker-v1';
  var st = { doc: null, targets: ['M11-P', 'M-EV1'], bases: {}, fileNames: {}, theme: 'sets', sel: 1, split: {}, setId: 'factory', query: '', view: 'M-EV1' };
  var past = [], future = [];
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- names and values ----------
  var ROW_SHORT = {}, ROW_NAME = {};
  C.themes.forEach(function (t) { t.rows.forEach(function (r) { if (r.code) { ROW_NAME[r.code] = r.name; if (r.short) ROW_SHORT[r.code] = r.short; } }); });
  function short(code, v) {
    if (ROW_SHORT[code] && ROW_SHORT[code][v] !== undefined) return ROW_SHORT[code][v];
    var t = E.label(code, v);
    return C.SHORT[code] ? C.SHORT[code](t) : t;
  }
  var LAYOUT_NAME = null;
  function layoutName(code) {
    if (!LAYOUT_NAME) {
      LAYOUT_NAME = {};
      var K = { bars: 'info bars', grid: 'grid', gridFmt: 'grid type', clip: 'clipping', clipLimit: 'clipping limit', peak: 'peaking', peakColor: 'peaking color', peakSens: 'peaking sensitivity', horizon: 'horizon', histo: 'histogram' };
      C.LAYOUTS.forEach(function (L, li) { for (var k in L) LAYOUT_NAME[L[k]] = 'Screen layout ' + (li + 1) + ' ' + (K[k] || k); });
    }
    return LAYOUT_NAME[code];
  }
  function settingName(code) { return ROW_NAME[code] || layoutName(code) || E.RULES.names[code] || code; }
  function primary() { for (var i = 0; i < MODELS.length; i++) if (st.targets.indexOf(MODELS[i]) >= 0) return MODELS[i]; return 'M11-P'; }
  function rule(code) { return E.rule(st.doc.model, code); }
  function options(code) {
    var ms = st.targets.filter(function (m) { return E.rule(m, code); });
    if (ms.indexOf(st.doc.model) < 0) ms.unshift(st.doc.model);
    var shared = E.sharedOptions(ms, code);
    return shared.length ? shared : E.options(st.doc.model, code);
  }
  function profiles() { return E.profiles(st.doc); }
  function pname(p) { return E.profileName(st.doc, p); }

  // ---------- history ----------
  function snapshot() { return JSON.stringify({ doc: st.doc, sel: st.sel, setId: st.setId, targets: st.targets, origin: st.origin }); }
  function remember() { past.push(snapshot()); if (past.length > 80) past.shift(); future = []; hideNotice(); }
  function restore(s) { var o = JSON.parse(s); st.doc = o.doc; st.sel = o.sel; st.setId = o.setId; if (o.targets) st.targets = o.targets; st.origin = o.origin || st.origin; }
  function undo() {
    if (!past.length) return;
    var cur = snapshot(), prev = past.pop(); future.push(cur); restore(prev); E.syncLive(st.doc); save(); render();
    notice('Undid: ' + whatChanged(JSON.parse(prev), JSON.parse(cur)), 'redo');
  }
  function redo() {
    if (!future.length) return;
    var cur = snapshot(), next = future.pop(); past.push(cur); restore(next); E.syncLive(st.doc); save(); render();
    notice('Redid: ' + whatChanged(JSON.parse(cur), JSON.parse(next)), 'undo');
  }
  // What differs between two states, in words, so Undo and Redo say what they did, wherever it was.
  function whatChanged(a, b) {
    if ((a.origin && a.origin.from) !== (b.origin && b.origin.from) && b.origin && b.origin.from) return b.origin.from;
    if (JSON.stringify(a.targets) !== JSON.stringify(b.targets)) return 'the cameras';
    var m = E.model(b.doc.model), diffs = [], name = function (q) { return E.profileName(b.doc, q) || E.profileName(a.doc, q); };
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

  // A short message at the bottom after a big change, with Undo next to it.
  var noticeTimer = 0, noticeAt = 0;
  function notice(text, button) {  // button: 'undo' (default), 'redo' or 'none'
    var el = $('#notice'); button = button || 'undo';
    if (!el) { el = document.createElement('div'); el.id = 'notice'; el.className = 'notice'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = '<span>' + esc(text) + '</span>' + (button === 'none' ? '' : '<button class="quiet" data-' + button + '>' + (button === 'redo' ? 'Redo' : 'Undo') + '</button>');
    el.classList.add('show'); clearTimeout(noticeTimer); noticeAt = Date.now();
    noticeTimer = setTimeout(function () { el.classList.remove('show'); }, 6000);
  }
  function hideNotice() { var el = $('#notice'); if (el) el.classList.remove('show'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#notice [data-undo]')) undo();
    else if (e.target.closest('#notice [data-redo]')) redo();
    else if (!e.target.closest('#notice') && Date.now() - noticeAt > 400) hideNotice();
  });
  // Clicking a profile's name selects it all, so typing replaces it.
  var justFocused = null;
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input[data-name]')) { justFocused = e.target; e.target.select(); } });
  document.addEventListener('mouseup', function (e) { if (e.target === justFocused) e.preventDefault(); justFocused = null; });
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ doc: st.doc, targets: st.targets, bases: st.bases, fileNames: st.fileNames, theme: st.theme, sel: st.sel, split: st.split, setId: st.setId, view: st.view, origin: st.origin })); } catch (e) { /* storage may be off */ } }
  function load() {
    try { var o = JSON.parse(localStorage.getItem(STORE)); if (o && o.doc && o.doc.S) { Object.assign(st, o); return true; } } catch (e) { /* ignore */ }
    return false;
  }

  // ---------- rows ----------
  function rowCode(row, p) { return row.code || row.codeFor(st.doc.S, p); }
  function rowKey(row) { return row.code || row.name; }
  function rowVal(row, p) {
    var code = rowCode(row, p); if (!code || !st.doc.S[code]) return undefined;
    return st.doc.S[code][rule(code).p ? p : 0];
  }
  function layoutCodes() { var out = []; C.LAYOUTS.forEach(function (L) { for (var k in L) out.push(L[k]); }); return out; }
  function sameAcross(row) {
    var ps = profiles();
    if (row.ctl === 'layouts') return layoutCodes().every(function (c) { return ps.every(function (p) { return st.doc.S[c][p] === st.doc.S[c][ps[0]]; }); });
    var first = JSON.stringify(rowVal(row, ps[0])), c0 = rowCode(row, ps[0]);
    return ps.every(function (p) { return rowCode(row, p) === c0 && JSON.stringify(rowVal(row, p)) === first; });
  }
  function visible(row) {
    if (row.only && !row.only.some(function (m) { return st.targets.indexOf(m) >= 0; })) return false;
    var code = row.code || 'D13E';
    return !!(st.doc.S[code] && rule(code));
  }
  function setRow(row, p, v) {
    var ps = p === 'all' ? profiles() : [p];
    ps.forEach(function (q) {
      var code = rowCode(row, q); if (!code) return;
      var r = rule(code);
      if (!r.p) st.doc.S[code][0] = v; else st.doc.S[code][q] = v;
    });
  }
  function changed() { E.syncLive(st.doc); save(); render(); }

  // ---------- what changed ----------
  // The starting point of this design (a starting set or an opened file). Changed values get a dot,
  // and the Save sheet lists them, so nothing changes without you seeing it.
  function markOrigin(from) { st.origin = { model: st.doc.model, S: E.clone(st.doc.S), from: from || '' }; }
  function editedAt(code, q) {
    var o = st.origin, r = rule(code); if (!o || !r || !o.S[code] || !st.doc.S[code]) return false;
    if (r.p && E.profiles({ S: o.S }).indexOf(q) < 0) return false;  // a new profile is listed as added, not as changes
    var i = r.p ? q : 0;
    return JSON.stringify(o.S[code][i]) !== JSON.stringify(st.doc.S[code][i]);
  }
  function edited(row, p) {
    var qs = p === 'all' ? profiles() : [p];
    if (row.ctl === 'layouts') return qs.some(function (q) { return layoutCodes().some(function (c) { return editedAt(c, q); }); });
    return qs.some(function (q) { var c = rowCode(row, q); return c && editedAt(c, q); });
  }
  function wasText(row, q) {  // what a changed value used to be, for the dot's tooltip
    var c = rowCode(row, q), o = st.origin, since = (o && o.from) || 'you started';
    if (!c || row.ctl === 'layouts' || row.ctl === 'favorites' || !o.S[c]) return 'Changed since ' + since;
    var v = o.S[c][rule(c).p ? q : 0];
    return 'Was ' + short(c, v) + ' when ' + since;
  }
  function changesSince() {
    var o = st.origin; if (!o) return [];
    var m = E.model(st.doc.model), out = [], ps = profiles(), was = E.profiles({ S: o.S });
    ps.forEach(function (q) {
      var c = E.NAME_CODES[q - 1];
      if (was.indexOf(q) < 0) out.push('Added ' + pname(q));
      else if (o.S[c] && o.S[c][0] !== st.doc.S[c][0]) out.push(o.S[c][0] + ' renamed ' + st.doc.S[c][0]);
    });
    was.forEach(function (q) { if (ps.indexOf(q) < 0) out.push('Removed ' + o.S[E.NAME_CODES[q - 1]][0]); });
    m.order.forEach(function (code) {
      var r = m.rules[code];
      if (code === 'D1A9' && o.S[code]) {
        var fl = ps.filter(function (q) { return was.indexOf(q) >= 0 && JSON.stringify(o.S[code][q].items) !== JSON.stringify(st.doc.S[code][q].items); });
        if (fl.length && fl.length === ps.length && ps.length > 1) out.push('Every profile: Favorites');
        else fl.forEach(function (q) { out.push(pname(q) + ': Favorites'); });
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
      else lines.forEach(function (l) { out.push((r.p ? pname(l.q) + ': ' : '') + l.text); });
    });
    return out;
  }

  // ---------- controls ----------
  function controlHTML(row, p, merged) {
    var v = merged ? rowVal(row, profiles()[0]) : rowVal(row, p);
    var code = rowCode(row, merged ? profiles()[0] : p);
    var data = ' data-row="' + esc(rowKey(row)) + '" data-p="' + (merged ? 'all' : p) + '"';
    var mark = edited(row, merged ? 'all' : p) ? '<span class="mark" title="' + esc(wasText(row, merged ? profiles()[0] : p)) + '"></span>' : '';
    if (row.ctl === 'favorites') {
      var n = v && v.items ? v.items.length : 0;
      return '<button class="pick"' + data + ' data-kind="favorites"><span class="v">' + n + (n === 1 ? ' item' : ' items') + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
    }
    if (row.ctl === 'layouts') return '<button class="pick"' + data + ' data-kind="layouts"><span class="v">' + layoutSummary(merged ? profiles()[0] : p) + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
    if (!code) return '<span class="faint" style="padding-left:10px">None</span>';
    var r = rule(code);
    if (row.ctl === 'text' || r.k === 't') {
      return '<input class="txt" type="text"' + data + ' data-kind="text" value="' + esc(v) + '" maxlength="' + r.max + '" spellcheck="false" aria-label="' + esc(row.name) + '">';
    }
    if (row.ctl === 'number' || r.k === 'r') {
      return '<input class="txt" type="number"' + data + ' data-kind="number" value="' + esc(v) + '" min="' + r.min + '" max="' + r.max + '" aria-label="' + esc(row.name) + '">';
    }
    var opts = options(code);
    var isToggle = opts.length === 2 && short(code, opts[0].v) === 'Off' && short(code, opts[1].v) === 'On';
    if (isToggle) return '<span class="toggle-wrap"><button class="toggle" role="switch"' + data + ' data-kind="toggle" aria-checked="' + (v === opts[1].v) + '" aria-label="' + esc(row.name) + '"></button>' + mark + '</span>';
    var unused = row.when && !row.when(st.doc.S, merged ? profiles()[0] : p);
    return '<button class="pick' + (row.ladder ? ' ladder' : '') + (unused ? ' unused' : '') + '"' + data + ' data-kind="pick" aria-haspopup="listbox"' +
      ' title="' + esc(short(code, v)) + (row.ladder ? '. Click to choose, or drag sideways to step through.' : '') + '">' +
      '<span class="v">' + esc(short(code, v)) + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
  }
  // A menu's choices. The current value is always there, even when one of the chosen cameras does not have it.
  function optionItems(code, opts, cur) {
    var item = function (o) { return { t: short(code, o.v), d: C.optionHelp(code, o.v), v: o.v, cur: o.v === cur }; };
    var items = opts.map(item), groups = C.jobGroups(code);
    if (groups && opts.length > 8) {  // long job lists: grouped by what they do, likely ones first
      var left = items.slice(); items = [];
      groups.forEach(function (g) {
        var inG = g.jobs.map(function (j) { return left.filter(function (it) { return it.v === j; })[0]; }).filter(Boolean);
        if (!inG.length) return;
        items.push({ head: g.name }); inG.forEach(function (it) { items.push(it); left.splice(left.indexOf(it), 1); });
      });
      if (left.length) { items.push({ head: 'Other' }); items = items.concat(left); }
    }
    if (cur !== undefined && !items.some(function (it) { return it.cur; })) {
      var lack = st.targets.filter(function (m) { var r = E.rule(m, code); return r && !E.legal(r, cur); });
      items.unshift({ t: short(code, cur), d: 'The ' + (lack.join(' and ') || 'other camera') + ' does not have this. Saving swaps it there.', v: cur, cur: true });
    }
    return items;
  }
  // For anyone who wants them: the camera's own name for a setting and its code in the file.
  function geekTip(code, ourName) {
    if (!code) return '';
    var n = E.RULES.names[code];
    return (n && n !== ourName ? n + ' · ' : '') + code;
  }
  function layoutSummary(p) { return layoutSummaryOf(st.doc, p); }
  function layoutSummaryOf(doc, p) {
    var names = { grid: 'Grid', histo: 'Histogram', horizon: 'Horizon', clip: 'Clipping', peak: 'Peaking' }, on = [];
    C.LAYOUTS.forEach(function (L) { Object.keys(names).forEach(function (k) { if (doc.S[L[k]][p] === 1 && on.indexOf(names[k]) < 0) on.push(names[k]); }); });
    return on.length ? on.join(', ') : 'Plain';
  }

  // ---------- the table ----------
  var ICON = {  // drawn alike: 16 px, round 2 px strokes, in the accent color
    pen: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13l.7-3L10.5 3.2a1.3 1.3 0 0 1 1.9 0l.4.4a1.3 1.3 0 0 1 0 1.9L6 12.3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    chev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function gridHTML(rows) {
    var ps = profiles(), n = ps.length;
    var sel = esc(pname(st.sel));
    // One toolbar for the selected profile: rename, add, options. Three matching buttons beside the names.
    var h = '<div class="grid' + (n >= 5 ? ' many' : '') + '" style="--n:' + n + '"><div class="ghead ghead0"><span class="ptools">' +
      '<button class="ptool" data-rename-sel title="Rename ' + sel + '" aria-label="Rename ' + sel + '">' + ICON.pen + '</button>' +
      '<button class="ptool" data-add' + (n >= 6 ? ' disabled' : '') + ' title="' + (n >= 6 ? 'Six profiles is the most a camera holds' : 'Add a profile, copied from ' + sel) + '" aria-label="Add a profile">' + ICON.plus + '</button>' +
      '<button class="ptool" data-more="sel" title="Options for ' + sel + '" aria-label="Options for ' + sel + '">' + ICON.chev + '</button></span></div>';
    ps.forEach(function (p) {
      // the profile's name is a field you type in
      h += '<div class="ghead' + (p === st.sel ? ' sel' : '') + '"><span class="pfield"><input value="' + esc(pname(p)) + '" data-name="' + p + '" maxlength="10" spellcheck="false" aria-label="Name of this profile" title="Click and type a new name"></span></div>';
    });
    h += '<div class="ghead gtail"></div>';
    rows.forEach(function (row) {
      var same = sameAcross(row), merged = same && !st.split[rowKey(row)];
      var off = row.when && ps.every(function (p) { return !row.when(st.doc.S, p); });
      var tip = geekTip(rowCode(row, ps[0]), row.name);
      h += '<div class="grow' + (off ? ' off' : '') + '" data-code="' + esc(row.code || '') + '"><div class="glabel"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="nm">' + esc(row.name) + '</span>' +
        (row.help ? '<span class="h">' + esc(row.help) + '</span>' : '') +
        (n > 1 && !merged ? '<button class="rowlink" data-same="' + esc(rowKey(row)) + '" title="Pick one value for every profile">Make every profile the same…</button>' : '') + '</div>';
      if (merged) h += '<div class="gcell wide">' + controlHTML(row, 'all', true) +
        (n > 1 ? '<button class="rowlink" data-vary="' + esc(rowKey(row)) + '" title="Give each profile its own value">Set per profile</button>' : '') + '</div>';
      else ps.forEach(function (p) { h += '<div class="gcell' + (p === st.sel ? ' sel' : '') + '">' + controlHTML(row, p, false) + '</div>'; });
      h += '<div class="gend"></div></div>';
    });
    return h + '</div>';
  }

  // Every setting, for the All settings page.
  function allRows() {
    var m = E.model(st.doc.model), skip = { D6B2: 1, D124: 1, D037: 1, D038: 1, D039: 1, D03A: 1, D0AD: 1, D0AE: 1 };
    var q = st.query.toLowerCase();
    return m.order.filter(function (c) { return !skip[c] && !m.rules[c].dyn; }).map(function (code) {
      var n = E.RULES.names[code] || 'Unnamed setting';
      return { code: code, name: ROW_NAME[code] || n, help: ROW_NAME[code] && ROW_NAME[code] !== n ? 'On the camera: ' + n : '' };
    }).filter(function (r) { return !q || (r.name + ' ' + r.help + ' ' + r.code).toLowerCase().indexOf(q) >= 0; });
  }

  // ---------- starting sets ----------
  var SET_HEAD = { D00C: 'Speed limit', D00B: 'Max ISO', '5005': 'White balance', D13E: 'Film style', '5013': 'Drive', D010: 'ISO', D0D5: 'Shutter', D1FC: 'Phone', D01A: 'Review' };
  function setsHTML() {
    var h = '<div class="intro"><p class="dim">Make the settings file your Leica imports: what each button does, your Favorites and screen layouts, every menu setting and your user profiles. Pick your cameras and a set, change anything, save. Nothing leaves your browser.</p>' +
      '<div class="row"><span class="dim">Your cameras</span><span class="chips" data-cams>' + chipsHTML() + '</span></div></div><div class="sets">';
    h += '<button class="set file" data-open><span>Open a file from your camera</span><span class="small faint">Or drop it anywhere on this page. Keeps every setting the camera exported.</span></button>';
    var factory = E.blank(st.doc.model);
    SETS.forEach(function (s) {
      var doc = D.fromSet(s, st.doc.model), ps = E.profiles(doc);
      var vary = ['D00C', 'D00B', '5005', 'D13E', '5013', 'D010', 'D0D5', 'D1FC', 'D01A'].filter(function (c) {
        return ps.some(function (p) { return doc.S[c][p] !== doc.S[c][ps[0]]; });
      }).slice(0, 2);
      if (!vary.length) vary = ['D00C', 'D00B'];
      // what else the set changes from the factory settings, so nothing comes as a surprise
      var also = Object.keys(s.base || {}).filter(function (c) {
        return ROW_NAME[c] && vary.indexOf(c) < 0 && doc.S[c] && rule(c) && JSON.stringify(doc.S[c][ps[0]]) !== JSON.stringify(factory.S[c][rule(c).p ? 1 : 0]);
      }).map(function (c) { return ROW_NAME[c] + ' ' + short(c, doc.S[c][ps[0]]); });
      if (s.base && s.base.layout) also.push('Screen layout with ' + layoutSummaryOf(doc, ps[0]).toLowerCase());
      h += '<button class="set' + (s.id === st.setId ? ' current' : '') + '" data-set="' + s.id + '"><span>' + esc(s.name) + '</span><span class="small dim">' + esc(s.help) + '</span><table>' +
        '<tr class="th"><td></td>' + vary.map(function (c) { return '<td>' + esc(SET_HEAD[c] || ROW_NAME[c]) + '</td>'; }).join('') + '</tr>' +
        ps.map(function (p) { return '<tr><td>' + esc(E.profileName(doc, p)) + '</td>' + vary.map(function (c) { return '<td>' + esc(short(c, doc.S[c][p])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
        (also.length ? '<span class="small faint">Also ' + esc(also.slice(0, 5).join(', ')) + (also.length > 5 ? ' and ' + (also.length - 5) + ' more' : '') + '.</span>' : '') + '</button>';
    });
    return h + '</div>';
  }

  // ---------- render ----------
  var THEMES = [{ id: 'sets', title: 'Starting sets' }].concat(C.themes).concat([{ id: 'all', title: 'All settings',
    note: 'Every setting in the file. Point at a name for the camera’s own name and code.' }]);
  function differs(theme) {
    if (!theme.rows || profiles().length < 2) return 0;
    return theme.rows.filter(function (r) { return visible(r) && !sameAcross(r); }).length;
  }
  function chipsHTML() {
    return MODELS.map(function (m) { return '<button class="chip" data-cam="' + m + '" aria-pressed="' + (st.targets.indexOf(m) >= 0) + '">' + m + '</button>'; }).join('');
  }
  // Open, save, which cameras, and the way back: one small panel, in the sidebar (a bar at the bottom on phones).
  function fileboxHTML() {
    return '<div class="chips" aria-label="Cameras to save for" title="The file is made for each camera picked here">' + chipsHTML() + '</div>' +
      '<div class="fb-row"><button class="btn" data-open>Open file</button><button class="btn primary" data-save>Save</button></div>' +
      '<div class="fb-row quietrow">' + historyHTML() + '<button class="quiet" data-restart>Start over</button></div>' +
      '<div class="small faint">' + changeCount() + '</div>';
  }
  function changeCount() {
    var n = changesSince().length, since = (st.origin && st.origin.from) || 'you started';
    return (n ? n + (n === 1 ? ' change' : ' changes') : 'No changes') + ' since ' + since + '.';
  }
  function historyHTML() {
    return '<button class="quiet" data-undo-btn' + (past.length ? '' : ' disabled') + ' title="Undo (⌘Z)">Undo</button>' +
      '<button class="quiet" data-redo-btn' + (future.length ? '' : ' disabled') + ' title="Redo (⇧⌘Z)">Redo</button>';
  }
  function dockHTML() {
    return historyHTML() + '<span class="spacer"></span><button class="btn" data-open>Open</button><button class="btn primary" data-save>Save</button>';
  }
  function render() {
    if (!profiles().length) { D.addProfile(st.doc); }
    if (profiles().indexOf(st.sel) < 0) st.sel = profiles()[0];
    $('#filebox').innerHTML = fileboxHTML();
    $('#dock').innerHTML = dockHTML();
    $('#themes').innerHTML = THEMES.map(function (t, i) {
      var d = differs(t);
      return (i === 1 || t.id === 'all' ? '<div class="gap"></div>' : '') + '<button data-theme="' + t.id + '" aria-current="' + (t.id === st.theme) + '"' + (d ? ' title="' + d + (d === 1 ? ' setting differs' : ' settings differ') + ' between profiles"' : '') + '><span>' + t.title + '</span></button>';
    }).join('');
    var theme = THEMES.filter(function (t) { return t.id === st.theme; })[0] || THEMES[0];
    var h = '<h1>' + esc(theme.title) + '</h1>' + (theme.note ? '<p class="note dim">' + esc(theme.note) + '</p>' : '');
    if (theme.id === 'sets') h += setsHTML();
    else if (theme.id === 'all') h += '<input class="txt" id="q" type="search" placeholder="Search" value="' + esc(st.query) + '" style="max-width:320px;margin:0 0 16px">' + gridHTML(allRows());
    else if (theme.id === 'menus') h += menusHTML();
    else h += gridHTML(theme.rows.filter(visible));
    Camera.render($('#cam'), cameraCtx());
    var main = $('#main'), y = main.scrollTop, focus = document.activeElement && document.activeElement.id;
    main.innerHTML = h; main.scrollTop = y;
    if (theme.id === 'menus') wireMenus();
    if (focus === 'q') { var q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function viewModel() { return st.targets.indexOf(st.view) >= 0 ? st.view : st.targets[0]; }
  function cameraCtx() {
    return {
      model: viewModel(), models: st.targets.slice(), doc: st.doc, slot: st.sel, profiles: profiles(), name: pname,
      view: function (m) { st.view = m; save(); Camera.render($('#cam'), cameraCtx()); },
      rules: rule, short: short, settingName: settingName, options: options,
      set: function (code, v) { remember(); if (rule(code).p) st.doc.S[code][st.sel] = v; else st.doc.S[code][0] = v; changed(); },
      select: function (p) { st.sel = p; save(); render(); },
      toggleFavorite: function (item) {
        remember(); var f = st.doc.S.D1A9[st.sel], i = f.items.indexOf(item);
        if (i >= 0) f.items.splice(i, 1); else if (f.items.length < E.FAVORITES_MAX) f.items.push(item);
        changed();
      },
      // A menu of jobs for one control. codes: [{ code, label }]. tryIt: run it on the pretend screen (or null).
      jobMenu: function (anchor, codes, name, tryIt) {
        var items = [], shared = function (code) { return profiles().length > 1 && sameAcross({ code: code }) && !st.split[code]; };
        if (tryIt) items.push({ t: 'Try it', act: 'try', pin: true }, { sep: true, pin: true });
        codes.forEach(function (c) {
          if (c.label) items.push({ head: c.label });
          optionItems(c.code, options(c.code), rowVal({ code: c.code }, st.sel)).forEach(function (it) {
            if (it.v === 26 && profiles().length < 2) it.d += ' Add a second profile first.';
            it.code = c.code; items.push(it);
          });
        });
        var all = codes.every(function (c) { return shared(c.code); });
        menu(anchor, items, function (it) {
          if (it.act === 'try') { tryIt(); return; }
          remember(); setRow({ code: it.code }, shared(it.code) ? 'all' : st.sel, it.v); changed();
        }, name + (profiles().length < 2 ? '' : all ? ', every profile' : ' in ' + pname(st.sel)));
      },
      menu: function (anchor, items, pick, note) { menu(anchor, items, pick, note); },
      edit: function (what) {  // Favorites or the screen layouts, for every profile when shared, else for this one
        var code = what === 'favorites' ? 'D1A9' : 'D15E', scope = menuScope(code);
        if (what === 'favorites') favoritesSheet(scope); else layoutsSheet(scope);
      },
      rename: function (p) {
        if (st.theme === 'sets') { st.theme = 'exposure'; save(); render(); }
        var inp = $('#main [data-name="' + p + '"]'); if (inp) { inp.focus(); inp.select(); }
      }
    };
  }

  // ---------- popover menu ----------
  var popEl = null, popVeil = null, popDone = null;
  function closeMenu() {
    if (popEl) { popEl.remove(); popEl = null; } if (popVeil) { popVeil.remove(); popVeil = null; }
    if (popDone) { var d = popDone; popDone = null; d(); }
  }
  // Items: { t, cur } to pick, { sep } for a line, { head } for a label over a group.
  // Next to the thing clicked on wide screens; a sheet from the bottom on phones.
  function menu(anchor, items, pick, note, done) {
    closeMenu();
    var rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    var bottom = innerWidth < 600;
    popEl = document.createElement('div'); popEl.className = 'pop' + (bottom ? ' bottom' : ''); popEl.setAttribute('role', 'listbox'); popDone = done || null;
    var hi = items.findIndex(function (it) { return it.cur; });
    if (hi < 0) hi = items.findIndex(function (it) { return it.t; });
    var lead = 0; while (items[lead] && items[lead].pin) lead++;  // pinned items stay in view above the list
    var row = function (it, i) {
      if (it.sep) return '<div class="sep"></div>';
      if (it.head) return '<div class="head">' + esc(it.head) + '</div>';
      return '<button role="option" data-i="' + i + '" class="' + (i === hi ? 'hi' : '') + (it.pin ? ' act' : '') + '" aria-selected="' + !!it.cur + '"><span class="tick">' + (it.cur ? '✓' : '') + '</span><span class="lab">' + esc(it.t) + (it.d ? '<span class="d">' + esc(it.d) + '</span>' : '') + '</span></button>';
    };
    var head = (note ? '<div class="note">' + esc(note) + '</div>' : '') + items.slice(0, lead).map(row).join('');
    popEl.innerHTML = (head ? '<div class="pophead">' + head + '</div>' : '') + items.slice(lead).map(function (it, i) { return row(it, i + lead); }).join('');
    if (bottom) { popVeil = document.createElement('div'); popVeil.className = 'popveil'; document.body.appendChild(popVeil); }
    document.body.appendChild(popEl);
    if (!bottom) {
      var w = popEl.offsetWidth, hgt = popEl.offsetHeight;
      var left = Math.min(innerWidth - w - 8, Math.max(8, rect.left));
      var below = innerHeight - rect.bottom - 12, above = rect.top - 12, top;
      if (hgt <= below || below >= 240) { top = rect.bottom + 4; popEl.style.maxHeight = Math.min(hgt, below) + 'px'; }
      else { var hh = Math.min(hgt, above); popEl.style.maxHeight = hh + 'px'; top = Math.max(8, rect.top - hh - 4); }
      popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
    }
    var cur = popEl.querySelector('.hi');
    if (cur && popEl.querySelector('.head')) { if (!bottom) cur.focus({ preventScroll: true }); }
    else if (cur) { var hd = popEl.querySelector('.pophead'); popEl.scrollTop = Math.max(0, cur.offsetTop - (hd ? hd.offsetHeight : 0) - popEl.clientHeight / 3); if (!bottom) cur.focus({ preventScroll: true }); }
    popEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var it = items[+b.dataset.i]; closeMenu(); pick(it); });
    popEl.addEventListener('keydown', function (e) {
      var bs = Array.prototype.slice.call(popEl.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    });
  }
  document.addEventListener('pointerdown', function (e) { if (popEl && !popEl.contains(e.target) && e.target !== popVeil) closeMenu(); }, true);
  document.addEventListener('click', function (e) { if (popVeil && e.target === popVeil) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (popEl && e.key === 'Escape') { e.preventDefault(); closeMenu(); } });

  // ---------- sheets ----------
  function sheet(html, wire) {
    var veil = document.createElement('div'); veil.className = 'veil';
    veil.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(veil);
    var close = function () { veil.remove(); document.removeEventListener('keydown', key); render(); };
    var key = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    veil.addEventListener('click', function (e) { if (e.target === veil || e.target.closest('[data-close]')) close(); });
    if (wire) wire(veil.querySelector('.sheet'), close);
    return veil;
  }

  function favoritesSheet(p) {
    var ps = p === 'all' ? profiles() : [p];
    sheet('<h2>Favorites</h2><p class="dim">Press Menu once for the status screen, twice for this page. ' + (p === 'all' ? 'Same in every profile.' : 'For ' + esc(pname(p)) + '.') + '</p>' +
      '<div class="fav-ed"></div><div class="row end"><button class="btn primary" data-close>Done</button></div>',
      function (el) { favoritesEditor(el.querySelector('.fav-ed'), ps); });
  }
  function layoutsSheet(p) {
    var ps = p === 'all' ? profiles() : [p];
    sheet('<h2>Screen layouts</h2><p class="dim">The centre button steps through these four while you shoot, in this order. Drag one by its number to move it. ' + (p === 'all' ? 'Same in every profile.' : 'For ' + esc(pname(p)) + '.') + '</p>' +
      '<div class="layouts"></div><div class="row end"><button class="btn primary" data-close>Done</button></div>',
      function (el) { layoutsEditor(el.querySelector('.layouts'), ps); });
  }

  // ---------- editors: Favorites and screen layouts, in a sheet or on the Menus page ----------
  // Drag an item by its handle, with a mouse or a finger; the others make room. done(from, to) records the move.
  function dragReorder(container, itemSel, handleSel, done) {
    container.addEventListener('pointerdown', function (e) {
      var h = e.target.closest(handleSel); if (!h || !container.contains(h)) return;
      var item = h.closest(itemSel), items = Array.prototype.slice.call(container.querySelectorAll(itemSel)), from = items.indexOf(item);
      if (from < 0) return;
      e.preventDefault(); h.setPointerCapture && h.setPointerCapture(e.pointerId);
      var rects = items.map(function (it) { return it.getBoundingClientRect(); }), r0 = rects[from], ox = e.clientX, oy = e.clientY, to = from;
      item.classList.add('dragging');
      var move = function (ev) {
        var dx = ev.clientX - ox, dy = ev.clientY - oy, cx = r0.left + r0.width / 2 + dx, cy = r0.top + r0.height / 2 + dy, best = from, bd = Infinity;
        item.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        rects.forEach(function (r, i) { var d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); if (d < bd) { bd = d; best = i; } });
        to = best;
        items.forEach(function (it, i) {
          if (it === item) return;
          var sh = from < to && i > from && i <= to ? -1 : from > to && i >= to && i < from ? 1 : 0;
          it.style.transform = sh ? 'translate(' + (rects[i + sh].left - rects[i].left) + 'px,' + (rects[i + sh].top - rects[i].top) + 'px)' : '';
        });
      };
      var up = function () {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
        items.forEach(function (it) { it.style.transform = ''; }); item.classList.remove('dragging');
        if (to !== from) done(from, to);
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    container.addEventListener('keydown', function (e) {  // with the keyboard: arrow keys on a handle move it
      var h = e.target.closest(handleSel); if (!h) return;
      var items = Array.prototype.slice.call(container.querySelectorAll(itemSel)), from = items.indexOf(h.closest(itemSel));
      var step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]; if (!step) return;
      var to = from + step; if (to < 0 || to >= items.length) return;
      e.preventDefault(); done(from, to);
      var again = container.querySelectorAll(handleSel)[to]; if (again) again.focus();
    });
  }
  function favName(v) { var o = E.options(st.doc.model, 'D1A9').filter(function (x) { return x.v === v; })[0]; return o ? o.t : short('D1A9', v); }
  function favoritesEditor(el, ps) {
    var opts = options('D1A9');
    var paint = function () {
      var items = st.doc.S.D1A9[ps[0]].items, full = items.length >= E.FAVORITES_MAX;
      el.innerHTML = '<div class="favlist">' + (items.length ? items.map(function (v, i) {
          return '<div class="favitem"><button class="grip" aria-label="Move ' + esc(favName(v)) + '" title="Drag to move">' + (i + 1) + '</button><span class="fn">' + esc(favName(v)) + '</span>' +
            '<button class="quiet" data-remove="' + v + '">Remove</button></div>';
        }).join('') : '<p class="faint">Empty. Add items from below.</p>') + '</div>' +
        '<div class="fav-foot"><button class="btn" data-add-menu' + (full ? ' disabled' : '') + '>Add an item</button>' +
        '<span class="small faint">' + items.length + ' of ' + E.FAVORITES_MAX + (full ? '. Full: remove one to add another.' : '. Drag a number to move an item.') + '</span></div>';
    };
    var addMenu = function (btn) {
      var items = st.doc.S.D1A9[ps[0]].items, left = opts.filter(function (o) { return items.indexOf(o.v) < 0; }), list = [];
      C.FAV_GROUPS.forEach(function (g) {
        var inG = g.items.map(function (v) { return left.filter(function (o) { return o.v === v; })[0]; }).filter(Boolean);
        if (!inG.length) return;
        list.push({ head: g.name }); inG.forEach(function (o) { list.push({ t: o.t, v: o.v }); left.splice(left.indexOf(o), 1); });
      });
      if (left.length) { list.push({ head: 'Other' }); left.forEach(function (o) { list.push({ t: o.t, v: o.v }); }); }
      menu(btn, list, function (it) { apply(function (xs) { if (xs.length < E.FAVORITES_MAX && xs.indexOf(it.v) < 0) xs.push(it.v); }); }, 'Add to Favorites');
    };
    var apply = function (fn) {
      remember(); ps.forEach(function (q) { fn(st.doc.S.D1A9[q].items); });
      E.syncLive(st.doc); save(); paint(); Camera.render($('#cam'), cameraCtx()); $('#filebox').innerHTML = fileboxHTML(); $('#dock').innerHTML = dockHTML();
    };
    el.addEventListener('click', function (e) {
      var r = e.target.closest('[data-remove]'), a = e.target.closest('[data-add-item]'), am = e.target.closest('[data-add-menu]');
      if (am) { addMenu(am); return; }
      if (r) apply(function (items) { var i = items.indexOf(+r.dataset.remove); if (i >= 0) items.splice(i, 1); });
      if (a) apply(function (items) { if (items.length < E.FAVORITES_MAX && items.indexOf(+a.dataset.addItem) < 0) items.push(+a.dataset.addItem); });
    });
    dragReorder(el, '.favitem', '.grip', function (from, to) { apply(function (items) { items.splice(to, 0, items.splice(from, 1)[0]); }); });
    paint();
  }
  function moveLayout(ps, from, to) {
    ps.forEach(function (q) {
      var vals = C.LAYOUTS.map(function (L) { var o = {}; for (var k in L) o[k] = st.doc.S[L[k]][q]; return o; });
      vals.splice(to, 0, vals.splice(from, 1)[0]);
      vals.forEach(function (o, li) { var L = C.LAYOUTS[li]; for (var k in L) st.doc.S[L[k]][q] = o[k]; });
    });
  }
  function layoutsEditor(el, ps) {
    var show = ps[0];
    var KEYS = [['bars', 'Info bars'], ['grid', 'Grid'], ['histo', 'Histogram'], ['horizon', 'Horizon'], ['clip', 'Clipping'], ['peak', 'Peaking']];
    var COLORS = ['#ff3b30', '#3c7dff', '#34c759', '#ffffff'];
    var refresh = function () { E.syncLive(st.doc); save(); Camera.render($('#cam'), cameraCtx()); paint(); $('#filebox').innerHTML = fileboxHTML(); $('#dock').innerHTML = dockHTML(); };
    var paint = function () {
      el.innerHTML = C.LAYOUTS.map(function (L, li) {
        var h = '<div class="layout"><button class="grip" aria-label="Move layout ' + (li + 1) + '" title="Drag to move. The centre button shows them in this order.">' + (li + 1) + '</button><div class="mini screen">' + Camera.layoutPreview(show, li) + '</div><div class="opts">';
        KEYS.forEach(function (k) {
          var on = st.doc.S[L[k[0]]][show] === 1;
          h += '<label><span>' + k[1] + '</span><button class="toggle" role="switch" data-li="' + li + '" data-k="' + k[0] + '" aria-checked="' + on + '" aria-label="' + k[1] + ' in layout ' + (li + 1) + '"></button></label>';
          if (k[0] === 'grid' && on) h += '<div class="sub"><span class="seg">' + [1, 2].map(function (g) { return '<button data-li="' + li + '" data-code="' + L.gridFmt + '" data-v="' + g + '" aria-pressed="' + (st.doc.S[L.gridFmt][show] === g) + '">' + short(L.gridFmt, g) + '</button>'; }).join('') + '</span></div>';
          if (k[0] === 'peak' && on) h += '<div class="sub">' + [0, 1, 2, 3].map(function (c) { return '<button class="swatch" style="background:' + COLORS[c] + '" data-li="' + li + '" data-code="' + L.peakColor + '" data-v="' + c + '" aria-pressed="' + (st.doc.S[L.peakColor][show] === c) + '" aria-label="' + short(L.peakColor, c) + '" title="' + short(L.peakColor, c) + '"></button>'; }).join('') + '</div>';
        });
        return h + '</div></div>';
      }).join('');
    };
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-li]'); if (!b) return;
      remember();
      var L = C.LAYOUTS[+b.dataset.li];
      var code = b.dataset.code || L[b.dataset.k];
      var v = b.dataset.code ? +b.dataset.v : (st.doc.S[code][show] === 1 ? 0 : 1);
      ps.forEach(function (q) { st.doc.S[code][q] = v; });
      refresh();
    });
    dragReorder(el, '.layout', '.grip', function (from, to) { remember(); moveLayout(ps, from, to); refresh(); });
    paint();
  }

  // The Menus page: Favorites and screen layouts, for every profile when they are shared, else for the selected one.
  function menuRow(code) { var r = null; C.themes.forEach(function (t) { t.rows.forEach(function (x) { if (x.code === code) r = x; }); }); return r; }
  function menuScope(code) { var row = menuRow(code); return profiles().length > 1 && sameAcross(row) && !st.split[code] ? 'all' : st.sel; }
  function menusHTML() {
    var ps = profiles(), h = '';
    [['D1A9', 'fav-ed'], ['D15E', 'layouts']].forEach(function (x) {
      var row = menuRow(x[0]), scope = menuScope(x[0]);
      h += '<div class="mrow"><div class="mlabel"><span class="nm">' + esc(row.name) + '</span><span class="h">' + esc(row.help) + '</span>';
      if (ps.length > 1) {
        h += scope === 'all' ? '<span class="h">Same in every profile.</span><button class="rowlink on" data-vary="' + x[0] + '">Set per profile</button>'
          : '<span class="seg mseg">' + ps.map(function (p) { return '<button data-pick-profile="' + p + '" aria-pressed="' + (p === st.sel) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span>' +
            '<button class="rowlink on" data-same="' + x[0] + '">Make every profile the same…</button>';
      }
      h += '</div><div class="' + x[1] + '" data-editor="' + x[0] + '"></div></div>';
    });
    return h;
  }
  function wireMenus() {
    var scopePs = function (code) { var s = menuScope(code); return s === 'all' ? profiles() : [s]; };
    favoritesEditor($('#main [data-editor="D1A9"]'), scopePs('D1A9'));
    layoutsEditor($('#main [data-editor="D15E"]'), scopePs('D15E'));
  }

  // Making a row the same in every profile: pick which value to keep.
  function sameMenu(btn, row) {
    var groups = [];
    profiles().forEach(function (p) {
      var key = row.ctl === 'layouts' ? JSON.stringify(layoutCodes().map(function (c) { return st.doc.S[c][p]; })) : JSON.stringify(rowVal(row, p)) + rowCode(row, p);
      var g = groups.filter(function (x) { return x.key === key; })[0];
      if (g) g.ps.push(p); else groups.push({ key: key, ps: [p] });
    });
    var label = function (p) {
      if (row.ctl === 'layouts') return layoutSummary(p);
      if (row.ctl === 'favorites') { var n = rowVal(row, p).items.length; return n + (n === 1 ? ' item' : ' items'); }
      return short(rowCode(row, p), rowVal(row, p));
    };
    menu(btn, groups.map(function (g) { return { t: label(g.ps[0]), d: 'As in ' + g.ps.map(pname).join(', '), src: g.ps[0] }; }), function (it) {
      remember(); var src = it.src;
      if (row.ctl === 'layouts') layoutCodes().forEach(function (c) { profiles().forEach(function (p) { st.doc.S[c][p] = st.doc.S[c][src]; }); });
      else { var val = rowVal(row, src); profiles().forEach(function (p) { var c = rowCode(row, p); if (c && E.legal(rule(c), val)) setRow(row, p, E.clone(val)); }); }
      delete st.split[rowKey(row)]; changed(); notice(row.name + ' is ' + it.t + ' in every profile');
    }, 'Which value should every profile use?');
  }

  function profileMenu(btn, p) {
    var items = [{ t: 'Rename', act: 'rename' }, { t: 'Duplicate', act: 'dup' }];
    if (profiles().length > 1) items.push({ t: 'Remove', act: 'remove' });
    items.push({ sep: true }, { t: 'Camera starts in this profile', act: 'start', cur: st.doc.S.D124[0] === p }, { head: 'Replace with a profile from a starting set' });
    SETS.forEach(function (s) { s.profiles.forEach(function (sp, i) { items.push({ t: s.name + ': ' + sp.name, act: 'use', set: s, i: i }); }); });
    menu(btn, items, function (it) {
      if (it.act === 'rename') { var inp = $('#main [data-name="' + p + '"]'); if (inp) { inp.focus(); inp.select(); } return; }
      remember();
      var was = pname(p), msg = null;
      if (it.act === 'start') { st.doc.S.D124 = [p]; msg = 'The camera starts in ' + was; }
      if (it.act === 'dup') { var q = D.addProfile(st.doc, p); if (q) { st.sel = q; msg = 'Copied ' + was; } }
      if (it.act === 'remove') { D.removeProfile(st.doc, p); msg = 'Removed ' + was; }
      if (it.act === 'use') {
        var src = D.fromSet(it.set, st.doc.model), keep = pname(p);
        var m = E.model(st.doc.model);
        m.order.forEach(function (code) { if (m.rules[code].p) st.doc.S[code][p] = E.clone(src.S[code][it.i + 1]); });
        st.doc.S[E.NAME_CODES[p - 1]] = [it.set.profiles[it.i].name || keep];
        msg = was + ' now uses ' + it.set.name + ': ' + it.set.profiles[it.i].name;
      }
      changed();
      if (msg) notice(msg);
    }, pname(p));
  }

  // ---------- save ----------
  function prepare(target) {
    var res = E.translate(st.doc, target, st.bases[target]);
    var doc = res.doc, ps = profiles();
    E.NAME_CODES.forEach(function (c) { doc.S[c] = st.doc.S[c].slice(); });
    doc.S.D6B2 = st.doc.S.D6B2.slice(); doc.S.D124 = st.doc.S.D124.slice();
    E.syncLive(doc);
    var notes = res.notes.filter(function (n) { return ps.indexOf(n.slot) >= 0; }).map(function (n) {
      if (n.kind === 'items') return pname(n.slot) + ': Favorites keeps ' + n.to + ' of ' + n.from + ' items';
      return pname(n.slot) + ': ' + settingName(n.code) + ' ' + short(n.code, n.from) + ' becomes ' + short(n.code, n.to);
    });
    return { doc: doc, notes: notes, problems: E.check(doc) };
  }
  // Where the file goes. In the Mac app, a native save panel or straight onto a mounted camera card.
  // Inside claude.ai the page cannot download by itself and only some file endings are allowed, so it asks the
  // viewer to save settings.lcse.json there. In a browser it downloads settings.lcse.
  // The camera reads and writes a file called settings.lcse on its card (export and import code in the firmware).
  var CARD_FILE = 'settings.lcse';
  function inClaude() { return !!(window.claude && window.claude.use); }
  function nativeBridge() { return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native; }
  var calls = {}, callId = 0;
  function callNative(msg) {
    return new Promise(function (resolve) { msg.id = ++callId; calls[msg.id] = resolve; nativeBridge().postMessage(msg); });
  }
  function download(name, text) {
    if (nativeBridge()) return callNative({ type: 'save', name: name, text: text });
    if (inClaude()) {
      return window.claude.use('downloads').then(function (d) {
        if (!d) return 'unavailable';
        return d.save({ filename: name + '.json', data: text }).then(function () { return 'saved'; }, function (e) { return e && e.code === 'declined' ? 'declined' : 'unavailable'; });
      });
    }
    var blob = new Blob([text], { type: 'application/octet-stream' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return Promise.resolve('saved');
  }
  function fileName() { return CARD_FILE; }
  function cardsFor(target) {  // mounted cards this camera's file can go on: its own, or a card no camera has exported to
    return (st.cards || []).filter(function (c) { return !c.camera || E.modelForCamera(c.camera) === target; });
  }
  function saveSheet() {
    var nat = !!nativeBridge();
    var rows = st.targets.map(function (t) {
      var r = prepare(t), notes = r.notes.slice(0, 5);
      var more = r.notes.length > 5 ? ' And ' + (r.notes.length - 5) + ' more.' : '';
      var cards = nat ? cardsFor(t) : [];
      return '<div><div class="grow1"><div>' + t + '</div><div class="small faint">' +
        (notes.length ? esc(notes.join('. ') + '.' + more) : 'Every setting fits this camera.') + '</div></div>' +
        cards.map(function (c) { return '<button class="btn primary" data-card="' + esc(c.path) + '" data-target="' + esc(t) + '">Write to ' + esc(c.name) + '</button>'; }).join('') +
        '<button class="btn' + (cards.length ? '' : ' primary') + '" data-save="' + esc(t) + '">Save file</button></div>';
    }).join('');
    var ps = profiles(), start = st.doc.S.D124[0];
    var how = 'One file per camera, called ' + CARD_FILE + '. Put it at the top level of that camera’s card, then choose User Profile, Manage Profiles, Import Profiles on the camera.';
    var pickCams = '<div class="row"><span class="dim">Cameras</span><span class="chips">' + chipsHTML() + '</span></div>';
    if (inClaude()) how += ' Here the file is saved as ' + CARD_FILE + '.json. Delete the .json before copying it to the card.';
    else if (nat) how += ' Writing to a card keeps a copy of the card’s own ' + CARD_FILE + ' in Documents, Msetter, Backups first.';
    else if (st.targets.length > 1) how += ' If your browser adds a number to the second file’s name, take it out.';
    var ch = changesSince(), since = st.origin && st.origin.from ? st.origin.from : 'you started';
    var chHTML = ch.length ? '<p class="small dim">Changed since ' + esc(since) + ': ' + esc(ch.slice(0, 10).join('. ')) + (ch.length > 10 ? '. And ' + (ch.length - 10) + ' more' : '') + '.</p>'
      : '<p class="small faint">Nothing changed since ' + esc(since) + '.</p>';
    sheet('<h2>Save</h2><p class="dim">' + esc(how) + '</p>' + pickCams + chHTML +
      '<div class="list">' + rows + '</div>' +
      '<div class="row"><span class="dim">After import the camera is in</span><span class="seg">' + ps.map(function (p) { return '<button data-start="' + p + '" aria-pressed="' + (p === start) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span>' +
        (ps.indexOf(start) < 0 ? '<span class="small faint">None picked in this file.</span>' : '') + '</div>' +
      '<p class="small faint">Import replaces every profile on the camera. Export your camera’s settings first so you can go back. The camera gives no message when it skips a setting, so check a few settings after importing.</p>' +
      '<div class="row end"><button class="btn" data-close>Done</button></div>',
      function (el, close) {
        el.addEventListener('click', function (e) {
          var b = e.target.closest('[data-save]');
          if (b) {
            var t = b.dataset.save;
            download(fileName(t), E.serialize(prepare(t).doc)).then(function (r) {
              b.textContent = r === 'saved' ? 'Saved' : r === 'declined' || r === 'cancelled' ? 'Save file' : 'Saving is off here';
            });
          }
          var c = e.target.closest('[data-card]');
          if (c) {
            var tg = c.dataset.target;
            callNative({ type: 'writeCard', card: c.dataset.card, text: E.serialize(prepare(tg).doc) }).then(function (r) {
              c.textContent = r === 'saved' ? 'Written' : 'Could not write';
            });
          }
          var s = e.target.closest('[data-start]');
          if (s) { remember(); st.doc.S.D124 = [+s.dataset.start]; E.syncLive(st.doc); save(); close(); saveSheet(); }
          var tg = e.target.closest('[data-cam]');
          if (tg) { toggleTarget(tg.dataset.cam); close(); saveSheet(); }
        });
      });
  }

  // ---------- opening ----------
  // Lists what the camera would skip in an opened file: it imports such a file without a word.
  function skipped(doc) {
    var ps = E.profiles(doc);
    return E.check(doc).filter(function (i) { return i.slot === 0 || ps.indexOf(i.slot) >= 0 || !E.rule(doc.model, i.code).p; }).map(function (i) {
      var who = E.rule(doc.model, i.code) && E.rule(doc.model, i.code).p ? (i.slot === 0 ? 'Live settings' : E.profileName(doc, i.slot)) : 'Camera';
      var v = doc.S[i.code] && doc.S[i.code][i.slot];
      return who + ': ' + settingName(i.code) + (v !== undefined && typeof v !== 'object' ? ' ' + short(i.code, v) : '');
    });
  }
  function openText(text, name) {
    var doc;
    try { doc = E.parse(text); } catch (e) {
      sheet('<h2>That file did not open</h2><p class="dim">' + esc(e.message) + '</p><div class="row end"><button class="btn primary" data-close>OK</button></div>');
      return;
    }
    remember();
    var bad = skipped(doc);
    st.bases[doc.model] = E.clone(doc); st.fileNames[doc.model] = name;
    st.targets = [doc.model];  // a file comes from one camera; add others in the file panel
    var prim = primary();
    st.doc = prim === doc.model ? doc : E.translate(doc, prim, st.bases[prim]).doc;
    if (prim !== doc.model) { E.NAME_CODES.forEach(function (c) { st.doc.S[c] = doc.S[c].slice(); }); st.doc.S.D6B2 = doc.S.D6B2.slice(); st.doc.S.D124 = doc.S.D124.slice(); }
    st.setId = null; st.theme = 'exposure'; st.sel = profiles()[0] || 1; st.split = {};
    if (!profiles().length) D.addProfile(st.doc);
    markOrigin('you opened ' + name); save(); render();
    notice('Opened ' + name + ' from the ' + doc.model + ', ' + profiles().length + (profiles().length === 1 ? ' profile' : ' profiles'));
    if (bad.length) {
      sheet('<h2>The ' + esc(doc.model) + ' would skip these</h2><p class="dim">The camera imports this file without a message and leaves these settings as they were. Profile Maker uses the closest allowed value when you save.</p>' +
        '<div class="list">' + bad.slice(0, 40).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>' +
        (bad.length > 40 ? '<p class="small faint">And ' + (bad.length - 40) + ' more.</p>' : '') +
        '<div class="row end"><button class="btn primary" data-close>OK</button></div>');
    }
  }
  function readFile(f) { var r = new FileReader(); r.onload = function () { openText(String(r.result), f.name); }; r.readAsText(f); }

  // ---------- events ----------
  function rowByKey(key) {
    if (st.theme === 'all') return allRows().filter(function (r) { return r.code === key; })[0];
    if (st.theme === 'menus') return menuRow(key);
    var t = C.themes.filter(function (t) { return t.id === st.theme; })[0];
    return t.rows.filter(function (r) { return rowKey(r) === key; })[0];
  }
  function pOf(el) { return el.dataset.p === 'all' ? 'all' : +el.dataset.p; }
  function pickOptions(row, p) {
    var q = p === 'all' ? profiles()[0] : p, code = rowCode(row, q);
    return { code: code, opts: options(code), cur: rowVal(row, q) };
  }

  function wire() {
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !(document.activeElement && /INPUT/.test(document.activeElement.tagName))) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveSheet(); }
    });
    $('#file').addEventListener('change', function (e) { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ''; });
    document.addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drop'); });
    document.addEventListener('dragleave', function (e) { if (!e.relatedTarget) document.body.classList.remove('drop'); });
    document.addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drop'); var f = e.dataTransfer.files[0]; if (f) readFile(f); });

    // the file panel (sidebar) and the dock (phones) share their buttons
    var panelClick = function (e) {
      var t = e.target;
      if (t.closest('[data-open]')) { $('#file').click(); return; }
      if (t.closest('[data-save]')) { saveSheet(); return; }
      if (t.closest('[data-undo-btn]')) { undo(); return; }
      if (t.closest('[data-redo-btn]')) { redo(); return; }
      if (t.closest('[data-restart]')) { startOver(); return; }
      var cam = t.closest('[data-cam]'); if (cam) toggleTarget(cam.dataset.cam);
    };
    $('#filebox').addEventListener('click', panelClick);
    $('#dock').addEventListener('click', panelClick);
    $('#themes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme]'); if (!b) return;
      st.theme = b.dataset.theme; save(); render(); $('#main').scrollTop = 0;
      if (innerWidth < 760) { b = $('#themes [data-theme="' + st.theme + '"]'); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' }); window.scrollTo(0, 0); }
    });

    var main = $('#main');
    // pointing at a button's row in the table lights that button on the drawing
    main.addEventListener('pointerover', function (e) { var g = e.target.closest('.grow'); Camera.light(g ? g.dataset.code : null); });
    main.addEventListener('pointerleave', function () { Camera.light(null); });
    main.addEventListener('click', function (e) {
      var t = e.target;
      var b = t.closest('[data-set]');
      if (b) {
        remember(); var s = SETS.filter(function (x) { return x.id === b.dataset.set; })[0];
        st.doc = D.fromSet(s, st.doc.model); st.setId = s.id; st.sel = 1; st.split = {}; st.bases = {}; st.fileNames = {};
        markOrigin('you picked ' + s.name); save(); render(); notice('Started from ' + s.name); return;
      }
      if (t.closest('[data-open]')) { $('#file').click(); return; }
      var cm = t.closest('[data-cam]'); if (cm) { toggleTarget(cm.dataset.cam); return; }
      var pk = t.closest('[data-pick-profile]'); if (pk) { st.sel = +pk.dataset.pickProfile; save(); render(); return; }
      if (t.closest('[data-rename-sel]')) { var ri = $('#main [data-name="' + st.sel + '"]'); if (ri) { ri.focus(); ri.select(); } return; }
      if (t.closest('[data-add]')) { remember(); var q = D.addProfile(st.doc, st.sel); if (q) st.sel = q; changed(); return; }
      var mo = t.closest('[data-more]'); if (mo) { profileMenu(mo, mo.dataset.more === 'sel' ? st.sel : +mo.dataset.more); return; }
      var vr = t.closest('[data-vary]'); if (vr) { st.split[vr.dataset.vary] = true; save(); render(); return; }
      var sm = t.closest('[data-same]'); if (sm) { sameMenu(sm, rowByKey(sm.dataset.same)); return; }
      var cell = t.closest('.gcell'); if (cell && cell.querySelector('[data-p]') && t.closest('.gcell') && !t.closest('[data-kind]')) { var pp = cell.querySelector('[data-p]').dataset.p; if (pp !== 'all') { st.sel = +pp; render(); } }
      var c = t.closest('[data-kind]'); if (!c) return;
      var rw = rowByKey(c.dataset.row), p = pOf(c);
      if (p !== 'all') { st.sel = p; markSel(); }
      if (c.dataset.kind === 'toggle') {
        remember(); var o = pickOptions(rw, p).opts; setRow(rw, p, c.getAttribute('aria-checked') === 'true' ? o[0].v : o[1].v); changed();
      } else if (c.dataset.kind === 'favorites') favoritesSheet(p);
      else if (c.dataset.kind === 'layouts') layoutsSheet(p);
      else if (c.dataset.kind === 'pick' && !justScrubbed) {
        var po = pickOptions(rw, p);
        menu(c, optionItems(po.code, po.opts, po.cur),
          function (it) { remember(); setRow(rw, p, it.v); changed(); }, rw.name + (profiles().length < 2 ? '' : p === 'all' ? ', every profile' : ' in ' + pname(p)));
      }
      if (p !== 'all' && c.dataset.kind !== 'toggle') Camera.render($('#cam'), cameraCtx());
    });

    // drag a ladder value left and right
    var drag = null, justScrubbed = false;
    main.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;  // on touch screens a sideways swipe scrolls the table instead
      var c = e.target.closest('.pick.ladder'); if (!c) return;
      var rw = rowByKey(c.dataset.row), p = pOf(c), po = pickOptions(rw, p);
      drag = { el: c, row: rw, p: p, x: e.clientX, i0: Math.max(0, po.opts.findIndex(function (o) { return o.v === po.cur; })), opts: po.opts, moved: false, last: -1 };
    });
    document.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      if (!drag.moved) { drag.moved = true; remember(); drag.el.setPointerCapture && drag.el.setPointerCapture(e.pointerId); }
      var i = Math.max(0, Math.min(drag.opts.length - 1, drag.i0 + Math.round(dx / 14)));
      if (i === drag.last) return;
      drag.last = i; setRow(drag.row, drag.p, drag.opts[i].v); E.syncLive(st.doc);
      var v = drag.el.querySelector('.v'); v.textContent = short(rowCode(drag.row, drag.p === 'all' ? profiles()[0] : drag.p), drag.opts[i].v);
      drag.el.classList.add('scrub');
      Camera.render($('#cam'), cameraCtx());
    });
    document.addEventListener('pointerup', function () {
      if (!drag) return;
      if (drag.moved) { justScrubbed = true; setTimeout(function () { justScrubbed = false; }, 0); save(); render(); }
      drag = null;
    });
    main.addEventListener('keydown', function (e) {
      var c = e.target.closest('.pick[data-kind="pick"]');
      if (!c || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      var rw = rowByKey(c.dataset.row), p = pOf(c), po = pickOptions(rw, p);
      var i = po.opts.findIndex(function (o) { return o.v === po.cur; }) + (e.key === 'ArrowRight' ? 1 : -1);
      if (i < 0 || i >= po.opts.length) return;
      remember(); setRow(rw, p, po.opts[i].v); changed();
      var again = $('#main [data-row="' + c.dataset.row + '"][data-p="' + c.dataset.p + '"]'); if (again) again.focus();
    });
    main.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.name) {
        var p = +t.dataset.name, clean = D.cleanName(t.value);
        if (clean.length < 3) { t.value = pname(p); return; }
        remember(); st.doc.S[E.NAME_CODES[p - 1]] = [clean]; changed(); return;
      }
      if (t.dataset.kind === 'text' || t.dataset.kind === 'number') {
        var rw = rowByKey(t.dataset.row), p2 = pOf(t), code = rowCode(rw, p2 === 'all' ? profiles()[0] : p2), r = rule(code);
        var v = t.dataset.kind === 'number' ? Math.round(+t.value) : (code === 'D002' || code === 'D019' ? t.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : t.value);
        if (!E.legal(r, v)) { t.classList.add('bad'); t.value = t.dataset.kind === 'number' ? E.nearest(r, v) : t.value; if (!E.legal(r, t.dataset.kind === 'number' ? +t.value : t.value)) return; v = t.dataset.kind === 'number' ? +t.value : t.value; }
        remember(); setRow(rw, p2, v); changed();
      }
    });
    main.addEventListener('focusin', function (e) { var t = e.target; if (t.dataset && t.dataset.name) { st.sel = +t.dataset.name; Camera.render($('#cam'), cameraCtx()); markSel(); } });
    main.addEventListener('input', function (e) { if (e.target.id === 'q') { st.query = e.target.value; render(); } });
  }
  function markSel() {
    document.querySelectorAll('.ghead').forEach(function (h) { var i = h.querySelector('[data-name]'); if (i) h.classList.toggle('sel', +i.dataset.name === st.sel); });
    var nm = pname(st.sel);  // the toolbar acts on the selected profile, so its labels follow the selection
    document.querySelectorAll('[data-rename-sel]').forEach(function (b) { b.title = 'Rename ' + nm; b.setAttribute('aria-label', b.title); });
    document.querySelectorAll('.ptool[data-more]').forEach(function (b) { b.title = 'Options for ' + nm; b.setAttribute('aria-label', b.title); });
    document.querySelectorAll('.ptool[data-add]:not([disabled])').forEach(function (b) { b.title = 'Add a profile, copied from ' + nm; });
    document.querySelectorAll('.gcell').forEach(function (c) { var x = c.querySelector('[data-p]'); if (x && x.dataset.p !== 'all') c.classList.toggle('sel', +x.dataset.p === st.sel); });
  }

  // Which cameras the file is made for. The design follows the first one; menus offer what every one allows.
  function toggleTarget(m) {
    var i = st.targets.indexOf(m);
    if (i >= 0 && st.targets.length === 1) { notice('Keep at least one camera'); return; }
    remember();
    if (i >= 0) st.targets.splice(i, 1); else st.targets.push(m);
    st.targets.sort(function (x, y) { return MODELS.indexOf(x) - MODELS.indexOf(y); });
    var prim = primary(), swaps = [];
    if (prim !== st.doc.model) {
      var names = E.NAME_CODES.map(function (c) { return st.doc.S[c].slice(); }), mask = st.doc.S.D6B2.slice(), start = st.doc.S.D124.slice();
      var from = st.doc.model, res = E.translate(st.doc, prim, st.bases[prim]);
      st.doc = res.doc;
      E.NAME_CODES.forEach(function (c, j) { st.doc.S[c] = names[j]; }); st.doc.S.D6B2 = mask; st.doc.S.D124 = start;
      var ps = profiles();
      res.notes.forEach(function (n) {
        if (n.kind !== 'value' || (rule(n.code).p && ps.indexOf(n.slot) < 0)) return;
        var t = settingName(n.code) + ' became ' + short(n.code, n.to);
        if (swaps.indexOf(t) < 0) swaps.push(t);
      });
      if (st.origin && st.origin.model !== prim) {  // compare like with like in the change list
        var ores = E.translate({ model: st.origin.model, S: st.origin.S }, prim);
        st.origin = { model: prim, S: ores.doc.S, from: st.origin.from };
      }
    }
    save(); render();
    if (swaps.length) notice(swaps[0] + (swaps.length > 1 ? ' and ' + (swaps.length - 1) + ' more' : '') + ', to suit the ' + prim);
  }
  // Back to how the page looks the first time: the factory settings, for the M11-P and M-EV1.
  function startOver() {
    remember();
    st.targets = ['M11-P', 'M-EV1']; st.bases = {}; st.fileNames = {}; st.split = {}; st.query = '';
    st.doc = D.fromSet(FIRST, primary()); st.setId = FIRST.id; st.sel = 1; st.theme = 'sets';
    markOrigin('you started over'); save(); render(); $('#main').scrollTop = 0; notice('Started over');
  }

  // ---------- start ----------
  var FIRST = SETS.filter(function (x) { return x.id === 'factory'; })[0] || SETS[0];  // a first visit starts from the camera as it comes
  if (!load()) { st.doc = D.fromSet(FIRST, primary()); st.setId = FIRST.id; markOrigin('you arrived'); }
  if (!st.origin) markOrigin('you arrived');
  wire();
  render();
  window.ProfileMaker = {
    state: st, render: render, prepare: prepare, openText: openText, saveSheet: saveSheet, undo: undo, redo: redo,
    nativeReply: function (id, r) { var f = calls[id]; delete calls[id]; if (f) f(r); },
    setCards: function (list) { st.cards = list || []; }
  };
  if (nativeBridge()) nativeBridge().postMessage({ type: 'ready' });
})();
