// Favorites and the screen layouts: their editors, in a sheet or on the Favorites and layouts page.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, W = Words;
  var short = W.short;
  var $ = App.$, esc = App.esc, keepFocus = App.keepFocus, menu = App.menu, sheet = App.sheet,
    dragReorder = App.dragReorder, st = App.st, primary = App.primary, options = App.options, profiles = App.profiles,
    pname = App.pname, remember = App.remember, save = App.save, rowOf = App.rowOf, scopeOf = App.scopeOf;

  function favoritesSheet(p) {
    var ps = p === 'all' ? profiles() : [p];
    sheet('<h2>Favorites</h2><p class="dim">Press Menu once for the status screen, twice for this page. ' + (p === 'all' ? 'Same in every profile.' : 'For ' + esc(pname(p)) + '.') + '</p>' +
      '<div class="fav-ed"></div><div class="row end"><button class="btn primary" data-close>Done</button></div>',
      function (el) { favoritesEditor(el.querySelector('.fav-ed'), ps); });
  }
  function layoutsSheet(p) {
    var ps = p === 'all' ? profiles() : [p];
    sheet('<h2>Screen layouts</h2><p class="dim">The center button steps through these four while you shoot, in this order. Drag a number to reorder. ' + (p === 'all' ? 'Same in every profile.' : 'For ' + esc(pname(p)) + '.') + '</p>' +
      '<div class="layouts"></div><div class="row end"><button class="btn primary" data-close>Done</button></div>',
      function (el) { layoutsEditor(el.querySelector('.layouts'), ps); });
  }

  function favoritesEditor(el, ps) {
    var opts = options('D1A9');
    var paint = function () {
      var items = st.doc.S.D1A9[ps[0]].items, full = items.length >= E.FAVORITES_MAX;
      el.innerHTML = '<div class="favlist">' + (items.length ? items.map(function (v, i) {
          return '<div class="favitem"><button class="grip" aria-label="Move ' + esc(E.label('D1A9', v)) + '" title="Drag to move">' + (i + 1) + '</button><span class="fn">' + esc(E.label('D1A9', v)) + '</span>' +
            '<button class="quiet" data-remove="' + v + '">Remove</button></div>';
        }).join('') : '<p class="faint">Empty. Use Add an item below.</p>') + '</div>' +
        '<div class="fav-foot"><button class="btn" data-add-menu' + (full ? ' disabled' : '') + '>Add an item</button>' +
        '<span class="small dim">' + items.length + ' of ' + E.FAVORITES_MAX + (full ? '. Full: remove one to add another.' : '. Drag to reorder.') + '</span></div>';
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
      E.syncLive(st.doc); save(); App.refresh(); keepFocus(el, paint);
    };
    el.addEventListener('click', function (e) {
      var r = e.target.closest('[data-remove]'), am = e.target.closest('[data-add-menu]');
      if (am) { addMenu(am); return; }
      if (r) apply(function (items) { var i = items.indexOf(+r.dataset.remove); if (i >= 0) items.splice(i, 1); });
    });
    dragReorder(el, '.favitem', '.favitem', function (from, to) { apply(function (items) { items.splice(to, 0, items.splice(from, 1)[0]); }); }, { skip: '[data-remove]', touch: '.grip' });
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
    var refresh = function () { E.syncLive(st.doc); save(); App.refresh(); keepFocus(el, paint); };
    var paint = function () {
      el.innerHTML = C.LAYOUTS.map(function (L, li) {
        var h = '<div class="layout"><button class="grip" aria-label="Move layout ' + (li + 1) + '" title="Drag to reorder. The center button shows them in this order.">' + (li + 1) + '</button><div class="mini screen">' + Camera.layoutPreview(show, li) + '</div><div class="opts">';
        KEYS.forEach(function (k) {
          var on = st.doc.S[L[k[0]]][show] === 1;
          h += '<label><span>' + k[1] + '</span><button class="toggle" role="switch" data-li="' + li + '" data-k="' + k[0] + '" aria-checked="' + on + '" aria-label="' + k[1] + ' in layout ' + (li + 1) + '"></button></label>';
          if (k[0] === 'grid' && on) h += '<div class="sub"><span class="seg">' + [1, 2].map(function (g) { return '<button data-li="' + li + '" data-code="' + L.gridFmt + '" data-v="' + g + '" aria-pressed="' + (st.doc.S[L.gridFmt][show] === g) + '">' + short(L.gridFmt, g) + '</button>'; }).join('') + '</span></div>';
          if (k[0] === 'peak' && on) h += '<div class="sub">' + [0, 1, 2, 3].map(function (c) { return '<button class="swatch" style="background:' + Camera.PEAK_COLORS[c] + '" data-li="' + li + '" data-code="' + L.peakColor + '" data-v="' + c + '" aria-pressed="' + (st.doc.S[L.peakColor][show] === c) + '" aria-label="' + short(L.peakColor, c) + '" title="' + short(L.peakColor, c) + '"></button>'; }).join('') + '</div>';
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

  // The Favorites and layouts page: each editor works on every profile while they are the same, else on the selected one.
  var PAGE = [['D1A9', 'fav-ed', favoritesEditor], ['D15E', 'layouts', layoutsEditor]];
  function menuHead(code) {
    var row = rowOf(code), ps = profiles(), h = '<span class="nm">' + esc(row.name) + '</span><span class="h">' + esc(row.help) + '</span>';
    if (ps.length < 2) return h;
    return h + (scopeOf(code) === 'all' ? '<span class="h">Same in every profile.</span><button class="rowlink on" data-vary="' + code + '">Set per profile</button>'
      : '<span class="seg mseg">' + ps.map(function (p) { return '<button data-pick-profile="' + p + '" aria-pressed="' + (p === st.sel) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span>' +
        '<button class="rowlink on" data-same="' + code + '">Make every profile the same…</button>');
  }
  // Each editor has its part sets above it (App.partSetsHTML, from app.js, which loads later).
  function menusHTML() {
    return PAGE.map(function (x) {
      return '<div class="mrow"><div class="mlabel">' + menuHead(x[0]) + '</div>' + App.partSetsHTML(x[0] === 'D1A9' ? 'favorites' : 'layouts') +
        '<div class="' + x[1] + '" data-editor="' + x[0] + '"></div></div>';
    }).join('');
  }
  function startEditor(el, x) {
    var s = scopeOf(x[0]);
    el.dataset.scope = s;
    x[2](el, s === 'all' ? profiles() : [s]);
  }
  function wireMenus() { PAGE.forEach(function (x) { startEditor($('#main [data-editor="' + x[0] + '"]'), x); }); }
  // After a change in an editor the labels follow it: a change can make every profile the same, or no longer the
  // same. An editor whose profiles changed starts again, with the focus kept.
  function menusHeads() {
    PAGE.forEach(function (x) {
      var el = $('#main [data-editor="' + x[0] + '"]'); if (!el) return;
      var head = el.parentNode.querySelector('.mlabel'), h = menuHead(x[0]);
      if (head.dataset.was !== h) { keepFocus(head, function () { head.innerHTML = h; }); head.dataset.was = h; }
      if (el.dataset.scope !== String(scopeOf(x[0]))) keepFocus(el.parentNode, function () { var fresh = el.cloneNode(false); el.replaceWith(fresh); startEditor(fresh, x); });
    });
  }

  Object.assign(App, { favoritesSheet: favoritesSheet, layoutsSheet: layoutsSheet, menusHTML: menusHTML,
    menusHeads: menusHeads, wireMenus: wireMenus });
})(window.App = window.App || {});
