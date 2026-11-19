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
      return '<input class="txt" type="text"' + data + ' data-kind="text" value="' + esc(v) + '" placeholder="None" maxlength="' + r.max + '" spellcheck="false" aria-label="' + esc(row.name) + '">';
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
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="12.5" cy="8" r="1.3" fill="currentColor"/></svg>',
    link: '<svg class="all" viewBox="0 0 22 10" aria-hidden="true"><path d="M3 5h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="3" cy="5" r="2.2" fill="currentColor"/><circle cx="11" cy="5" r="2.2" fill="currentColor"/><circle cx="19" cy="5" r="2.2" fill="currentColor"/></svg>',
    chev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // Where another picked camera's file holds a different value, it shows quietly under the control: "M-EV1: EVF <> LCD".
  function altHTML(row, p, others) {
    if (row.ctl === 'favorites' || row.ctl === 'layouts') return '';
    var code = rowCode(row, p), v = rowVal(row, p);
    if (!code || typeof v === 'object') return '';
    return others.filter(function (o) { var r = E.rule(o.m, code); return r && o.doc.S[code] && o.doc.S[code][p] !== v; })
      .map(function (o) { return '<span class="alt">' + esc(o.m + ': ' + short(code, o.doc.S[code][p])) + '</span>'; }).join('');
  }
  // The picked cameras that have a row, when not all of them do: shown beside its name.
  function onlyOn(row, code) {
    if (st.targets.length < 2) return '';
    var has = st.targets.filter(function (m) { return row.only ? row.only.indexOf(m) >= 0 : !!(code && E.rule(m, code)); });
    return has.length && has.length < st.targets.length ? ' <span class="faint nowrap">' + esc(has.join(', ')) + '</span>' : '';
  }
  // The table: a column per profile under its name. A value every profile shares is one bar across the columns, with
  // linked dots at its end; a value that differs is a tile per profile, the selected profile's brightest. A row is a bar
  // when its values match and nobody set it per profile (st.split). The (i) after a setting's name shows its help on
  // hover and opens its menu: help, the camera's own name and code, and the scope choices. The selected profile's name
  // holds its … menu; + goes to the library.
  function joined(row) { return profiles().length > 1 && sameAcross(row) && !st.split[rowKey(row)]; }
  function gridHTML(rows) {
    var ps = profiles(), n = ps.length;
    var others = st.targets.filter(function (m) { return m !== st.doc.model; }).map(function (m) { return { m: m, doc: App.fileFor(m) }; });
    var q = App.qMarks ? App.qMarks() : null;  // a Q file is open: settings it won't take are gray
    var h = '<div class="grid' + (n >= 5 ? ' many' : '') + '" style="--n:' + n + '"><div class="ghead ghead0"></div>';
    ps.forEach(function (p) {
      // the … comes before the name in keyboard order, so Tab goes from name to name
      h += '<div class="ghead' + (p === st.sel ? ' sel' : '') + '" data-p-head="' + p + '"><span class="pfield">' +
        '<button class="pmore" data-more="' + p + '" aria-label="Options for ' + esc(pname(p)) + '">' + ICON.more + '</button>' +  // shown on the selected profile only
        '<input value="' + esc(pname(p)) + '" data-name="' + p + '" maxlength="10" spellcheck="false" autocapitalize="characters" aria-label="Profile name" title="Click and type a new name"></span></div>';
    });
    h += '<div class="ghead gtail">' + (n < 6 ? '<button class="tool icon" data-golib title="Add a profile from the library" aria-label="Add a profile from the library">' + ICON.plus + '</button>' : '') +
      '<button class="tool icon" data-more="sel" aria-label="Options for ' + esc(pname(st.sel)) + '">' + ICON.more + '</button></div>';  // the … moves here when the names go above their rows
    rows.forEach(function (row) {
      var bar = n < 2 || joined(row), key = esc(rowKey(row));
      var off = row.when && ps.every(function (p) { return !row.when(st.doc.S, p); });
      var noq = q && !q.crosses(row, rowCode(row, ps[0]));
      var sp = row.name.lastIndexOf(' ') + 1;  // the (i) stays on the line of the name's last word
      h += '<div class="grow' + (off ? ' off' : '') + (noq ? ' noq' : '') + '" data-code="' + esc(row.code || '') + '" data-key="' + key + '"><div class="glabel">' +
        '<span class="nm">' + esc(row.name.slice(0, sp)) + '<span class="nowrap">' + esc(row.name.slice(sp)) +
        '<button class="info" data-rowmenu="' + key + '" aria-haspopup="menu" aria-label="About ' + esc(row.name) + '"' + (row.help ? ' data-tip="' + esc(row.help) + '"' : '') + '>' + App.INFO_SVG + '</button></span>' +
        onlyOn(row, rowCode(row, ps[0])) + '</span></div>';
      var cell = function (p, all) { var a = altHTML(row, p, others), c = controlHTML(row, all ? 'all' : p, all); return a ? '<div class="cellcol">' + c + a + '</div>' : c; };
      if (bar) h += '<div class="gcell wide' + (n > 1 ? ' shared' : '') + '">' + cell(ps[0], n > 1) + (n > 1 ? ICON.link : '') + '</div>';
      else ps.forEach(function (p) { h += '<div class="gcell' + (p === st.sel ? ' sel' : '') + '" data-p-col="' + p + '">' + cell(p, false) + '</div>'; });
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
    }).filter(function (r) {
      if (q && (r.name + ' ' + r.help + ' ' + r.code).toLowerCase().indexOf(q) < 0) return false;
      if (st.filter === 'diff') return profiles().length > 1 && !sameAcross(r);
      if (st.filter === 'changed') return edited(r, 'all');
      return true;
    });
  }

  // A row the same in every profile, with profile src's value; the row becomes one bar again. Contrast, Sharpness and
  // Saturation belong to each profile's film style, so they stay apart while the styles differ.
  function useEverywhere(row, src) {
    remember();
    if (row.ctl === 'layouts') layoutCodes().forEach(function (c) { profiles().forEach(function (p) { st.doc.S[c][p] = st.doc.S[c][src]; }); });
    var got = profiles(), label = valueLabel(row, src);
    if (row.ctl !== 'layouts') {
      var val = rowVal(row, src);
      got = profiles().filter(function (p) { var c = rowCode(row, p); return c && (rule(c).dyn || E.legal(rule(c), val)); });
      got.forEach(function (p) { if (p !== src) setRow(row, p, E.clone(val)); });
    }
    var same = sameAcross(row);
    if (same) delete st.split[rowKey(row)];
    App.changed();
    notice(row.name + ' ' + label + (same ? ' in every profile' : got.length === profiles().length ? ' in every profile, for each profile’s own film style'
      : ' in ' + listOf(got.map(pname)) + '. The film style of the others has no ' + row.name), 'undo', { done: true });
  }
  function valueLabel(row, p) {
    if (row.ctl === 'layouts') return layoutSummaryOf(st.doc, p);
    if (row.ctl === 'favorites') return W.count(rowVal(row, p).items.length, 'item');
    return short(rowCode(row, p), rowVal(row, p));
  }
  // Making a row the same in every profile: pick which value to keep, seeing which profiles have each.
  function sameMenu(btn, row) {
    var groups = [];
    profiles().forEach(function (p) {
      var key = row.ctl === 'layouts' ? JSON.stringify(layoutCodes().map(function (c) { return st.doc.S[c][p]; })) : JSON.stringify(rowVal(row, p)) + rowCode(row, p);
      var g = groups.filter(function (x) { return x.key === key; })[0];
      if (g) g.ps.push(p); else groups.push({ key: key, ps: [p] });
    });
    menu(btn, groups.map(function (g) { return { t: valueLabel(row, g.ps[0]), d: 'As in ' + listOf(g.ps.map(pname)), src: g.ps[0] }; }), function (it) { useEverywhere(row, it.src); }, 'Which value should every profile use?');
  }
  // Set per profile: the bar breaks into a tile per profile, values unchanged.
  function splitRow(row) {
    remember(); st.split[rowKey(row)] = true; App.changed();
    notice(row.name + ': set per profile', 'none');
  }
  // The scope choice at the top of a value's menu: a bar offers its own split, a tile offers its value everywhere.
  function scopeItem(row, p) {
    if (profiles().length < 2) return null;
    if (p === 'all') return { t: 'Set per profile', act: 'split', foot: true, icon: 'split' };
    return { t: 'Use ' + valueLabel(row, p) + ' in every profile', act: 'all', foot: true, icon: 'link', src: p };
  }
  function scopeAct(it, row) {
    if (it.act === 'split') { splitRow(row); return true; }
    if (it.act === 'all') { useEverywhere(row, it.src); return true; }
    if (it.act === 'same') { setTimeout(function () { sameMenu(it.anchor, row); }, 0); return true; }
    return false;
  }
  // The menu on a setting's name: what it does, the scope choice, and its camera name and code.
  function rowMenu(btn, row) {
    var items = [], n = profiles().length, code = rowCode(row, profiles()[0]), tip = geekTip(code, row.name);
    if (n > 1) items.push(joined(row) ? { t: 'Set per profile', act: 'split', icon: 'split' } : { t: 'Same in every profile…', act: 'same', icon: 'link', anchor: btn });
    if (tip) items.push({ head: 'On the camera: ' + tip });
    menu(btn, items, function (it) { scopeAct(it, row); }, row.name + (row.help ? '. ' + row.help : ''));
  }

  // The profile menu's Duplicate and the + beside the names: a copy of profile p, selected, with a notice.
  function duplicate(p) {
    remember(); var q = D.addProfile(st.doc, p);
    if (!q) return;
    st.sel = q; App.changed(); notice('Duplicated ' + pname(p), 'undo', { done: true });
  }
  // A profile's own menu, from the … in its name: rename, duplicate, remove, where the camera starts, keep it in Yours,
  // and the library for another.
  function profileMenu(btn, p) {
    var n = profiles().length, items = [{ t: 'Rename', act: 'rename' }];
    if (n < 6) items.push({ t: 'Duplicate', act: 'dup' });
    if (n > 1) items.push({ t: 'Remove', act: 'remove' });
    items.push({ sep: true });
    if (n > 1) items.push({ t: 'Camera starts in this profile', act: 'start', cur: st.doc.S.D124[0] === p });
    items.push({ t: 'Save to the library', act: 'keep' });
    if (n < 6 && st.theme !== 'sets') items.push({ t: 'Add a profile from the library', act: 'lib' });
    menu(btn, items, function (it) {
      if (it.act === 'rename') {
        if (!$('#main [data-name="' + p + '"]')) { st.theme = 'exposure'; App.render(); }  // the names are fields in the table
        var inp = $('#main [data-name="' + p + '"]'); if (inp) { inp.focus(); inp.select(); } return;
      }
      if (it.act === 'dup') { duplicate(p); return; }
      if (it.act === 'keep') { App.keepProfile(p); return; }
      if (it.act === 'lib') { App.goLibrary(); return; }
      remember();
      var was = pname(p), msg = null;
      if (it.act === 'start') { st.doc.S.D124 = [p]; msg = 'Camera starts in ' + was; }
      if (it.act === 'remove') { App.removeProfile(p); return; }
      App.changed();
      if (msg) notice(msg, 'undo', { done: true });
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

  Object.assign(App, { optionItems: optionItems, gridHTML: gridHTML, allRows: allRows, sameMenu: sameMenu, joined: joined,
    scopeItem: scopeItem, scopeAct: scopeAct, rowMenu: rowMenu, splitRow: splitRow, useEverywhere: useEverywhere,
    duplicate: duplicate, profileMenu: profileMenu, rowByKey: rowByKey, pOf: pOf, pickOptions: pickOptions,
    markSel: markSel });
})(window.App = window.App || {});
