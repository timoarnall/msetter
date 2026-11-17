// The profile table: a control for each setting in each profile, the menus they open, Make every profile
// the same, and the profile menu.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, D = Design, W = Words;
  var short = W.short, listOf = W.listOf;
  var $ = App.$, esc = App.esc, notice = App.notice, menu = App.menu, st = App.st, rule = App.rule,
    options = App.options, profiles = App.profiles, pname = App.pname, remember = App.remember, fixSel = App.fixSel,
    rowCode = App.rowCode, rowKey = App.rowKey, rowVal = App.rowVal, layoutCodes = App.layoutCodes,
    sameAcross = App.sameAcross, setRow = App.setRow, edited = App.edited, wasText = App.wasText,
    layoutSummaryOf = App.layoutSummaryOf, rowOf = App.rowOf;

  function controlHTML(row, p, merged) {
    var v = merged ? rowVal(row, profiles()[0]) : rowVal(row, p);
    var code = rowCode(row, merged ? profiles()[0] : p);
    var data = ' data-row="' + esc(rowKey(row)) + '" data-p="' + (merged ? 'all' : p) + '"', aria = ' aria-label="' + esc(row.name + (merged ? '' : ', ' + pname(p))) + '"';
    var mark = edited(row, merged ? 'all' : p) ? '<span class="mark" title="' + esc(wasText(row, merged ? profiles()[0] : p)) + '"></span>' : '';
    if (row.ctl === 'favorites') {
      var n = v && v.items ? v.items.length : 0;
      return '<button class="pick"' + data + aria + ' data-kind="favorites"><span class="v">' + W.count(n, 'item') + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
    }
    if (row.ctl === 'layouts') return '<button class="pick"' + data + aria + ' data-kind="layouts"><span class="v">' + layoutSummaryOf(st.doc, merged ? profiles()[0] : p) + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
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
    return '<button class="pick' + (row.ladder ? ' ladder' : '') + (unused ? ' unused' : '') + '"' + data + aria + ' data-kind="pick" aria-haspopup="listbox"' +
      ' title="' + esc(short(code, v)) + (row.ladder ? '. Click to choose, or drag sideways to step through.' : '') + '">' +
      '<span class="v">' + esc(short(code, v)) + '</span>' + mark + '<span class="chev" aria-hidden="true"></span></button>';
  }
  // A menu's choices. The current value is always there, even when one of the chosen cameras does not have it.
  function optionItems(code, opts, cur) {
    var BTN = {};  // the other buttons that can do a job, named as inside a sentence
    W.BUTTONS.forEach(function (b) { if (b.also) BTN[b.code] = b.also; });
    var also = function (v) {  // the other buttons that already have this job
      if (!BTN[code]) return '';
      var on = Object.keys(BTN).filter(function (c) { return c !== code && E.get(st.doc, c, st.sel) === v; });
      return on.length ? 'Also on the ' + on.map(function (c) { return BTN[c]; }).join(' and the ') + '.' : '';
    };
    var item = function (o) { return { t: short(code, o.v), d: [C.optionHelp(code, o.v), also(o.v)].filter(Boolean).join(' '), v: o.v, cur: o.v === cur }; };  // what it does, then where else it is
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
      var gets = lack.map(function (m) { return m + ' (gets ' + short(code, E.get(App.prepare(m).doc, code, st.sel)) + ')'; });
      items.unshift({ t: short(code, cur), d: 'Not on the ' + (gets.join(' or the ') || 'other camera') + '.', v: cur, cur: true });
    }
    return items;
  }

  // For anyone who wants them: the camera's own name for a setting and its code in the file.
  function geekTip(code, ourName) {
    if (!code) return '';
    var n = E.RULES.names[code];
    return (n && n !== ourName ? n + ' · ' : '') + code;
  }

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
      '<button class="ptool" data-add' + (n >= 6 ? ' disabled' : '') + ' title="' + (n >= 6 ? 'A camera holds six user profiles at most' : 'Duplicate ' + sel) + '" aria-label="Add a profile">' + ICON.plus + '</button>' +
      '<button class="ptool" data-more="sel" title="Options for ' + sel + '" aria-label="Options for ' + sel + '">' + ICON.chev + '</button></span></div>';
    ps.forEach(function (p) {
      // the profile's name is a field you type in
      h += '<div class="ghead' + (p === st.sel ? ' sel' : '') + '"><span class="pfield"><input value="' + esc(pname(p)) + '" data-name="' + p + '" maxlength="10" spellcheck="false" aria-label="Profile name" title="Click and type a new name"></span></div>';
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

  // Settings the camera keeps for itself: nothing a person can set from them, so All settings leaves them out.
  // They stay in the file as they are. Gray card gains (the camera measures them), white balance fine-tune
  // amounts (which way each axis goes is not known), which screen layout is showing now, the autofocus mode
  // (an M focuses by hand), FN2 and FN3 in review (one choice only), the phone app's transfer mode, a reset flag.
  var KEPT_BY_CAMERA = { D130: 1, D131: 1, D132: 1, D3BC: 1, D3BD: 1, D07A: 1, D07B: 1, '500A': 1, D192: 1, D194: 1, '0342': 1, D140: 1 };
  // Every setting a person can change, for the All settings page.
  function allRows() {
    var m = E.model(st.doc.model), skip = { D6B2: 1, D124: 1, D037: 1, D038: 1, D039: 1, D03A: 1, D0AD: 1, D0AE: 1 };
    var q = st.query.toLowerCase();
    return m.order.filter(function (c) { return !skip[c] && !KEPT_BY_CAMERA[c] && !m.rules[c].dyn; }).map(function (code) {
      var n = E.RULES.names[code] || 'Unnamed setting';
      var own = W.rowName(code);
      return { code: code, name: own || n, help: own && own !== n ? 'On the camera: ' + n : '' };
    }).filter(function (r) { return !q || (r.name + ' ' + r.help + ' ' + r.code).toLowerCase().indexOf(q) >= 0; });
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
      if (row.ctl === 'layouts') return layoutSummaryOf(st.doc, p);
      if (row.ctl === 'favorites') return W.count(rowVal(row, p).items.length, 'item');
      return short(rowCode(row, p), rowVal(row, p));
    };
    menu(btn, groups.map(function (g) { return { t: label(g.ps[0]), d: 'As in ' + g.ps.map(pname).join(', '), src: g.ps[0] }; }), function (it) {
      remember(); var src = it.src;
      if (row.ctl === 'layouts') layoutCodes().forEach(function (c) { profiles().forEach(function (p) { st.doc.S[c][p] = st.doc.S[c][src]; }); });
      var got = profiles();
      if (row.ctl !== 'layouts') {
        var val = rowVal(row, src);
        got = profiles().filter(function (p) { var c = rowCode(row, p); return c && (rule(c).dyn || E.legal(rule(c), val)); });
        got.forEach(function (p) { setRow(row, p, E.clone(val)); });
      }
      var same = sameAcross(row);
      if (same) delete st.split[rowKey(row)];
      App.changed();
      // Contrast, Sharpness and Saturation belong to each profile's film style, so they stay apart while the styles differ
      notice(row.name + ' is ' + it.t + (same ? ' in every profile' : got.length === profiles().length ? ' in every profile, for each profile’s own film style'
        : ' in ' + listOf(got.map(pname)) + '. The film style of the others has no ' + row.name));
    }, 'Which value should every profile use?');
  }

  // The profile menu's Duplicate and the + beside the names: a copy of profile p, selected, with a notice.
  function duplicate(p) {
    remember(); var q = D.addProfile(st.doc, p);
    if (!q) return;
    st.sel = q; App.changed(); notice('Duplicated ' + pname(p));
  }
  function profileMenu(btn, p) {
    var items = [{ t: 'Rename', act: 'rename' }];
    if (profiles().length < 6) items.push({ t: 'Duplicate', act: 'dup' });
    if (profiles().length > 1) items.push({ t: 'Remove', act: 'remove' });
    items.push({ sep: true }, { t: 'Camera starts in this profile', act: 'start', cur: st.doc.S.D124[0] === p }, { head: 'Replace with a profile from a starting set' });
    SETS.forEach(function (s) { s.profiles.forEach(function (sp, i) { items.push({ t: s.name + ': ' + sp.name, act: 'use', set: s, i: i }); }); });
    menu(btn, items, function (it) {
      if (it.act === 'rename') { var inp = $('#main [data-name="' + p + '"]'); if (inp) { inp.focus(); inp.select(); } return; }
      if (it.act === 'dup') { duplicate(p); return; }
      remember();
      var was = pname(p), msg = null;
      if (it.act === 'start') { st.doc.S.D124 = [p]; msg = 'Camera starts in ' + was; }
      if (it.act === 'remove') { D.removeProfile(st.doc, p); fixSel(); msg = 'Removed ' + was; }
      if (it.act === 'use') {
        D.useSetProfile(st.doc, p, it.set, it.i);
        msg = was + ' replaced by ' + pname(p) + ' from ' + it.set.name;
      }
      App.changed();
      if (msg) notice(msg);
    }, pname(p));
  }

  function rowByKey(key) {
    if (st.theme === 'all') return allRows().filter(function (r) { return r.code === key; })[0];
    if (st.theme === 'menus') return rowOf(key);
    var t = C.themes.filter(function (t) { return t.id === st.theme; })[0];
    return t.rows.filter(function (r) { return rowKey(r) === key; })[0];
  }
  function pOf(el) { return el.dataset.p === 'all' ? 'all' : +el.dataset.p; }
  function pickOptions(row, p) {
    var q = p === 'all' ? profiles()[0] : p, code = rowCode(row, q);
    return { code: code, opts: options(code), cur: rowVal(row, q) };
  }

  function markSel() {
    document.querySelectorAll('.ghead').forEach(function (h) { var i = h.querySelector('[data-name]'); if (i) h.classList.toggle('sel', +i.dataset.name === st.sel); });
    var nm = pname(st.sel);  // the toolbar acts on the selected profile, so its labels follow the selection
    document.querySelectorAll('[data-rename-sel]').forEach(function (b) { b.title = 'Rename ' + nm; b.setAttribute('aria-label', b.title); });
    document.querySelectorAll('.ptool[data-more]').forEach(function (b) { b.title = 'Options for ' + nm; b.setAttribute('aria-label', b.title); });
    document.querySelectorAll('.ptool[data-add]:not([disabled])').forEach(function (b) { b.title = 'Add a profile, copied from ' + nm; });
    document.querySelectorAll('.gcell').forEach(function (c) { var x = c.querySelector('[data-p]'); if (x && x.dataset.p !== 'all') c.classList.toggle('sel', +x.dataset.p === st.sel); });
  }

  Object.assign(App, { optionItems: optionItems, gridHTML: gridHTML, allRows: allRows, sameMenu: sameMenu,
    duplicate: duplicate, profileMenu: profileMenu, rowByKey: rowByKey, pOf: pOf, pickOptions: pickOptions,
    markSel: markSel });
})(window.App = window.App || {});
