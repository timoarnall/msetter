// Favorites and the screen layouts: their editors, in a sheet or on the Favorites and layouts page.
(function (App) {
  'use strict';
  var TOOL = App.TOOL;
  var E = Engine, C = CATALOGUE, W = Words;
  var short = W.short;
  var $ = App.$, esc = App.esc, keepFocus = App.keepFocus, menu = App.menu, sheet = App.sheet,
    dragReorder = App.dragReorder, st = App.st, primary = App.primary, options = App.options, profiles = App.profiles,
    pname = App.pname, remember = App.remember, save = App.save, rowOf = App.rowOf, scopeOf = App.scopeOf;

  function favoritesEditor(el, ps) {
    var opts = options('D1A9');
    var paint = function () {
      var items = st.doc.S.D1A9[ps[0]].items, full = items.length >= E.FAVORITES_MAX;
      el.innerHTML = '<div class="favlist">' + (items.length ? items.map(function (v, i) {
          return '<div class="favitem"><button class="grip" aria-label="Move ' + esc(E.label('D1A9', v)) + '">' + (i + 1) + '</button><span class="fn">' + esc(E.label('D1A9', v)) + '</span>' +
            '<button class="tool icon" data-remove="' + esc(v) + '" title="Remove" aria-label="Remove ' + esc(E.label('D1A9', v)) + '">' + TOOL.minus + '</button></div>';
        }).join('') : '<p class="faint">No items</p>') + '</div>' +
        // the count at the left, Add at the right under the column of Remove tools
        '<div class="fav-foot"><span class="dim">' + items.length + ' of ' + E.FAVORITES_MAX + '</span>' +
        '<button class="tool" data-add-menu' + (full ? ' disabled title="Favorites hold ' + E.FAVORITES_MAX + ' items"' : '') + '>' + TOOL.plus + 'Add</button></div>';
    };
    var addMenu = function (btn) {
      var items = st.doc.S.D1A9[ps[0]].items, left = opts.filter(function (o) { return items.indexOf(o.v) < 0; }), list = [];
      C.FAV_GROUPS.forEach(function (g) {
        var inG = g.items.map(function (v) { return left.filter(function (o) { return o.v === v; })[0]; }).filter(Boolean);
        if (!inG.length) return;
        list.push({ head: g.name }); inG.forEach(function (o) { list.push({ t: o.t, v: o.v }); left.splice(left.indexOf(o), 1); });
      });
      if (left.length) { list.push({ head: 'Other' }); left.forEach(function (o) { list.push({ t: o.t, v: o.v }); }); }
      menu(btn, list, function (it) { apply(function (xs) { if (xs.length < E.FAVORITES_MAX && xs.indexOf(it.v) < 0) xs.push(it.v); }, 'Added ' + it.t + ' to Favorites'); }, 'Add to Favorites');
    };
    // every edit has its notice with a tick, like any other change, and Undo says it back
    var apply = function (fn, words) {
      remember(); ps.forEach(function (q) { fn(st.doc.S.D1A9[q].items); });
      if (ps.length === 1 && profiles().length > 1) st.split.D1A9 = true;  // one profile's list stays its own, as in the table
      E.syncLive(st.doc); save(); App.refresh(); keepFocus(el, paint);
      if (words) App.notice(words, 'undo', { done: true });
    };
    var nameOf = function (v) { return E.label('D1A9', v); };
    el.addEventListener('click', function (e) {
      var r = e.target.closest('[data-remove]'), am = e.target.closest('[data-add-menu]');
      if (am) { addMenu(am); return; }
      if (r) apply(function (items) { var i = items.indexOf(+r.dataset.remove); if (i >= 0) items.splice(i, 1); }, 'Removed ' + nameOf(+r.dataset.remove) + ' from Favorites');
    });
    dragReorder(el, '.favitem', '.favitem', function (from, to) { var v = st.doc.S.D1A9[ps[0]].items[from]; apply(function (items) { items.splice(to, 0, items.splice(from, 1)[0]); }, 'Moved ' + nameOf(v) + ' to ' + (to + 1)); }, { skip: '[data-remove]', touch: '.grip' });
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
    var show = ps.indexOf(st.sel) >= 0 ? st.sel : ps[0];  // the previews draw the selected profile
    var KEYS = [['bars', 'Info bars'], ['grid', 'Grid'], ['histo', 'Histogram'], ['horizon', 'Horizon'], ['clip', 'Clipping'], ['peak', 'Peaking']];
    var refresh = function () { E.syncLive(st.doc); save(); App.refresh(); keepFocus(el, paint); };
    var paint = function () {
      // a row under Grid or Peaking shows in every card while any card has it on, so the cards' switches stay level
      var any = function (k) { return C.LAYOUTS.some(function (L) { return st.doc.S[L[k]][show] === 1; }); };
      el.innerHTML = C.LAYOUTS.map(function (L, li) {
        var h = '<div class="layout"><button class="grip" aria-label="Move layout ' + (li + 1) + '">' + (li + 1) + '</button><div class="mini screen">' + Camera.layoutPreview(show, li) + '</div><div class="opts">';
        KEYS.forEach(function (k) {
          var on = st.doc.S[L[k[0]]][show] === 1;
          h += '<label><span>' + k[1] + '</span><button class="toggle" role="switch" data-li="' + li + '" data-k="' + k[0] + '" aria-checked="' + on + '" aria-label="' + k[1] + ' in layout ' + (li + 1) + '"></button></label>';
          if (k[0] === 'grid' && any('grid')) h += '<div class="sub' + (on ? '' : ' off') + '"><span class="seg">' + [1, 2].map(function (g) { return '<button data-li="' + li + '" data-code="' + L.gridFmt + '" data-v="' + g + '" aria-pressed="' + (st.doc.S[L.gridFmt][show] === g) + '">' + short(L.gridFmt, g) + '</button>'; }).join('') + '</span></div>';
          if (k[0] === 'peak' && any('peak')) h += '<div class="sub' + (on ? '' : ' off') + '">' + [0, 1, 2, 3].map(function (c) { return '<button class="swatch" style="background:' + Camera.PEAK_COLORS[c] + '" data-li="' + li + '" data-code="' + L.peakColor + '" data-v="' + c + '" aria-pressed="' + (st.doc.S[L.peakColor][show] === c) + '" aria-label="' + short(L.peakColor, c) + '" title="' + short(L.peakColor, c) + '"></button>'; }).join('') + '</div>';
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
      if (ps.length === 1 && profiles().length > 1) st.split.D15E = true;
      refresh();
      var label = (KEYS.filter(function (k) { return k[0] === b.dataset.k; })[0] || [0, W.settingName(code)])[1];
      App.notice(b.dataset.code ? 'Set ' + W.settingName(code).replace(/^Screen layout \d+ /, '') + ' in screen layout ' + (+b.dataset.li + 1) : 'Turned ' + label + (v ? ' on' : ' off') + ' in screen layout ' + (+b.dataset.li + 1), 'undo', { done: true });
    });
    dragReorder(el, '.layout', '.grip', function (from, to) { remember(); moveLayout(ps, from, to); if (ps.length === 1 && profiles().length > 1) st.split.D15E = true; refresh(); App.notice('Moved screen layout ' + (from + 1) + ' to ' + (to + 1), 'undo', { done: true }); });
    paint();
  }

  // The Favorites and layouts page: each editor works on every profile while they are the same, else on the selected one.
  var PAGE = [['D1A9', 'fav-ed', favoritesEditor], ['D15E', 'layouts', layoutsEditor]];
  var LINK = App.LINK_SVG;  // the linked dots, drawn once in table.js
  // Which profiles an editor changes: one bar when every profile shares the list, a tile per profile when they differ.
  function menuHead(code) {
    var ps = profiles();
    if (ps.length < 2) return '';
    if (scopeOf(code) === 'all') return '<span class="pbar">Every profile' + LINK + '</span><button class="tool" data-vary="' + code + '">' + TOOL.split + 'Set per profile</button>';
    return '<span class="ptiles">' + ps.map(function (p) { return '<button data-pick-profile="' + p + '" aria-pressed="' + (p === st.sel) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span>' +
      '<button class="tool" data-same="' + code + '">' + TOOL.link + 'Same in every profile…</button>';
  }
  // Each editor has its part sets above it (App.partSetsHTML, from app.js, which loads later).
  // which: 'D1A9' (the Favorites page: the pretend screen beside the list) or 'D15E' (the layouts, at the end of Screen)
  function menusHTML(which) {
    var x = PAGE.filter(function (p) { return p[0] === which; })[0], fav = which === 'D1A9';
    return '<div class="mblock" data-block="' + which + '">' +
      (fav ? '' : '<h2 class="sub">Screen layouts' + App.info(rowOf(which).help) + '</h2>') +
      App.partSetsHTML(fav ? 'favorites' : 'layouts') +
      '<div class="mlabel">' + menuHead(which) + '</div>' +
      (fav ? '<div class="favsplit"><div class="camslot" data-camslot></div><div class="' + x[1] + '" data-editor="' + x[0] + '"></div></div>'
        : '<div class="' + x[1] + '" data-editor="' + x[0] + '"></div>') + '</div>';
  }
  function startEditor(el, x) {
    var s = scopeOf(x[0]);
    el.dataset.scope = s;
    x[2](el, s === 'all' ? profiles() : [s]);
  }
  function wireMenus() { PAGE.forEach(function (x) { var el = $('#main [data-editor="' + x[0] + '"]'); if (el) startEditor(el, x); }); }
  // After a change in an editor the labels follow it: a change can make every profile's list match, or no longer the
  // same. An editor whose profiles changed starts again, with the focus kept.
  function menusHeads() {
    PAGE.forEach(function (x) {
      var el = $('#main [data-editor="' + x[0] + '"]'); if (!el) return;
      var head = el.closest('[data-block]').querySelector('.mlabel'), h = menuHead(x[0]);
      if (head.dataset.was !== h) { keepFocus(head, function () { head.innerHTML = h; }); head.dataset.was = h; }
      if (el.dataset.scope !== String(scopeOf(x[0]))) keepFocus(el.parentNode, function () { var fresh = el.cloneNode(false); el.replaceWith(fresh); startEditor(fresh, x); });
    });
  }

  Object.assign(App, { menusHTML: menusHTML,
    menusHeads: menusHeads, wireMenus: wireMenus });
})(window.App = window.App || {});
