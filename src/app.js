// Msetter: the sidebar and dock, the page for each section, the camera panel, and the start.
// The other files in src/ hang their parts on App, in index.html's order; this one is last and starts the page.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, D = Design;
  var $ = App.$, esc = App.esc, keepFocus = App.keepFocus, notice = App.notice, menu = App.menu, MODELS = App.MODELS,
    st = App.st, primary = App.primary, rule = App.rule, options = App.options, profiles = App.profiles,
    pname = App.pname, remember = App.remember, undo = App.undo, redo = App.redo, canUndo = App.canUndo,
    canRedo = App.canRedo, save = App.save, load = App.load, markOrigin = App.markOrigin, begin = App.begin,
    changesSince = App.changesSince, rowVal = App.rowVal, sameAcross = App.sameAcross, visible = App.visible,
    setRow = App.setRow, layoutSummaryOf = App.layoutSummaryOf, scopeOf = App.scopeOf, optionItems = App.optionItems,
    gridHTML = App.gridHTML, allRows = App.allRows, favoritesSheet = App.favoritesSheet,
    layoutsSheet = App.layoutsSheet, menusHTML = App.menusHTML, menusHeads = App.menusHeads, wireMenus = App.wireMenus,
    prepare = App.prepare, fileFor = App.fileFor, saveSheet = App.saveSheet, nativeBridge = App.nativeBridge,
    nativeReply = App.nativeReply, openText = App.openText, wire = App.wire;
  var W = Words, short = W.short;
  // Leaving a text field fires its change on the press of the next click. Redrawing then would remove the
  // thing being clicked, so while a pointer is down the redraw waits until the click has landed.
  var pointerDown = false, renderPending = false;
  document.addEventListener('pointerdown', function () { pointerDown = true; }, true);
  var pointerEnd = function () {  // a touch that turns into a scroll ends with pointercancel, not pointerup
    pointerDown = false;
    if (renderPending) setTimeout(function () { if (renderPending) render(); }, 0);
  };
  document.addEventListener('pointerup', pointerEnd, true);
  document.addEventListener('pointercancel', pointerEnd, true);
  function changed() { E.syncLive(st.doc); save(); if (pointerDown) { renderPending = true; return; } render(); }
  function changedSoon() { E.syncLive(st.doc); save(); renderPending = true; setTimeout(function () { if (renderPending && !pointerDown) render(); }, 0); }

  // ---------- starting sets ----------
  var SET_HEAD = { D00C: 'Shutter speed limit', D00B: 'Maximum ISO', '5005': 'White balance', D13E: 'Film style', '5013': 'Drive', D010: 'ISO', D0D5: 'Shutter', D1FC: 'Phone', D01A: 'Review' };
  // What every starting set with more than one profile also sets (User Profile on the top button, say): said on no card,
  // so each card lists only what is its own. Lever jobs only matter with the M-EV1 picked.
  function alsoOf(s, doc, ps, vary, factory) {
    var out = {};
    Object.keys(s.base || {}).forEach(function (c) {
      if (!W.rowName(c) || vary.indexOf(c) >= 0 || !doc.S[c] || !rule(c) || ((c === 'D1D6' || c === 'D1D7') && st.targets.indexOf('M-EV1') < 0)) return;
      if (JSON.stringify(doc.S[c][ps[0]]) !== JSON.stringify(E.get(factory, c, 1))) out[c] = W.rowName(c) + ' to ' + short(c, doc.S[c][ps[0]]);
    });
    return out;
  }
  function setsHTML() {
    var mac = !!nativeBridge();
    var h = '<div class="intro"><p class="dim">Set what each button does, your Favorites and screen layouts, every menu setting and your user profiles. Msetter saves a file your Leica loads from its card. Nothing leaves ' + (mac ? 'this Mac' : 'your browser') + '.</p>' +
      '<div class="row"><span class="dim">Your cameras</span><span class="chips" data-cams>' + chipsHTML() + '</span></div></div><div class="sets">';
    h += '<button class="set file lead" data-open><span>Start from your camera</span><ol class="steps small dim"><li>On the camera, User Profile › Manage Profiles › Export Profiles.</li>' +
      '<li>Open <code>settings.lcse</code> from the card here<span class="hover-only">, or drop it on this page</span>.</li></ol><span class="small faint">What you don’t change stays as your camera has it.</span></button>';
    var factory = E.blank(st.doc.model), common = null;
    SETS.forEach(function (s) {  // what every set with more than one profile also sets
      var d = D.fromSet(s, st.doc.model), ps = E.profiles(d); if (ps.length < 2) return;
      var a = alsoOf(s, d, ps, [], factory);
      common = common ? Object.keys(common).reduce(function (o, c) { if (a[c] === common[c]) o[c] = common[c]; return o; }, {}) : a;
    });
    common = common || {};
    SETS.filter(function (s) { return s.id === 'factory'; }).concat(SETS.filter(function (s) { return s.id !== 'factory'; })).forEach(function (s) {
      var doc = D.fromSet(s, st.doc.model), ps = E.profiles(doc);
      var vary = ['D00C', 'D00B', '5005', 'D13E', '5013', 'D010', 'D0D5', 'D1FC', 'D01A'].filter(function (c) {
        return ps.some(function (p) { return doc.S[c][p] !== doc.S[c][ps[0]]; });
      }).slice(0, 2);
      if (!vary.length) vary = ['D00C', 'D00B'];
      // what else the set changes from the factory settings, so nothing comes as a surprise; what every set does is left out
      var own = alsoOf(s, doc, ps, vary, factory), also = Object.keys(own).filter(function (c) { return common[c] !== own[c]; }).map(function (c) { return own[c]; });
      if (s.base && s.base.layout) also.push('Screen layouts to ' + layoutSummaryOf(doc, ps[0]).toLowerCase());
      h += '<button class="set' + (s.id === st.setId ? ' current' : '') + '" data-set="' + s.id + '"><span>' + esc(s.name) + '</span><span class="small dim">' + esc(s.help) + '</span><table>' +
        '<tr class="th"><td></td>' + vary.map(function (c) { return '<td>' + esc(SET_HEAD[c] || W.rowName(c)) + '</td>'; }).join('') + '</tr>' +
        ps.map(function (p) { return '<tr><td>' + esc(E.profileName(doc, p)) + '</td>' + vary.map(function (c) { return '<td>' + esc(short(c, doc.S[c][p])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
        (also.length ? '<span class="small dim">Also sets ' + esc(also.slice(0, 5).join(', ')) + (also.length > 5 ? ' and ' + (also.length - 5) + ' more' : '') + '.</span>' : '') + '</button>';
    });
    return h + '</div>';
  }

  // ---------- part sets ----------
  // Small cards for the part sets of one kind, at the top of the page that sets that part. The card for the set every
  // profile holds now is marked.
  function partSetsHTML(kind) {
    return '<div class="partsets" role="group" aria-label="' + esc(W.PART_KINDS[kind].name) + ' sets">' + PART_SETS.filter(function (x) { return x.kind === kind; }).map(function (x) {
      var on = D.partMatches(st.doc, x);
      return '<button class="set part' + (on ? ' current' : '') + '" data-part="' + x.id + '" aria-pressed="' + on + '"><span>' + esc(x.name) + '</span><span class="small dim">' + esc(x.help) + '</span></button>';
    }).join('') + '</div>';
  }
  // After a change made in place (an editor), the marks follow.
  function paintParts() {
    document.querySelectorAll('#main [data-part]').forEach(function (b) {
      var on = D.partMatches(st.doc, App.partSet(b.dataset.part));
      b.classList.toggle('current', on); b.setAttribute('aria-pressed', on);
    });
  }
  var PAGE_PARTS = { buttons: 'buttons', screen: 'layouts' };  // the Favorites and layouts page puts its sets by each editor

  // ---------- render ----------
  var THEMES = [{ id: 'sets', title: 'Starting sets' }].concat(C.themes).concat([{ id: 'all', title: 'All settings',
    note: 'Every setting you can change. Settings the camera keeps for itself stay in the file as they are. Point at a name to see its internal name and code.' }]);
  function differs(theme) {
    if (!theme.rows || profiles().length < 2) return 0;
    return theme.rows.filter(function (r) { return visible(r) && !sameAcross(r); }).length;
  }
  // The camera chips; the Q3 chips follow, except in the Save sheet, which has a Q3 row of its own (noQ).
  function chipsHTML(noQ) {
    return MODELS.map(function (m) { return '<button class="chip" data-cam="' + m + '" aria-pressed="' + (st.targets.indexOf(m) >= 0) + '">' + m + '</button>'; }).join('') + (noQ ? '' : App.q3ChipsHTML());
  }
  // Open, save, which cameras, and the way back: one small panel, in the sidebar (a bar at the bottom on phones).
  function fileboxHTML() {
    return '<div class="fblabel dim">Your cameras</div><div class="chips" aria-label="Your cameras">' + chipsHTML() + '</div>' +
      '<div class="fb-row"><button class="btn" data-open>Open file</button><button class="btn primary" data-save>Save</button></div>' +
      '<div class="fb-row quietrow">' + historyHTML() + '<button class="quiet" data-restart>Start over</button></div>' +
      '<div class="small dim" data-count></div>';
  }
  function changeCount() {
    var n = changesSince().length, since = (st.origin && st.origin.from) || 'you started';
    return (n ? W.count(n, 'change') : 'No changes') + ' since ' + since + '.';
  }
  function historyHTML() {
    return '<button class="quiet" data-undo-btn' + (canUndo() ? '' : ' disabled') + ' title="Undo (⌘Z)">Undo</button>' +
      '<button class="quiet" data-redo-btn' + (canRedo() ? '' : ' disabled') + ' title="Redo (⇧⌘Z)">Redo</button>';
  }
  function dockHTML() {
    return historyHTML() + '<span class="spacer"></span><button class="btn" data-open>Open</button><button class="btn primary" data-save>Save</button>';
  }
  // render() draws the page from the state. The sidebar, the dock and the list of sections are built once and then
  // updated in place, so a button there keeps the keyboard focus. The main page is drawn again with its focus and
  // typing cursor put back; on All settings the search box stays and only the rows under it are drawn again.
  function render() {
    renderPending = false;
    paintSide(); paintCamera(); paintMain();  // the camera first: the layouts editor's previews draw from it
  }
  // After a change made in place (an editor, a drag along a value, the Save sheet): all but the main page catches up.
  function refresh() {
    paintSide(); paintCamera();
    if (st.theme === 'menus') menusHeads();
    paintParts();
  }
  function paintSide() {
    var fb = $('#filebox'), th = $('#themes');
    if (!fb.firstChild) {
      fb.innerHTML = fileboxHTML(); $('#dock').innerHTML = dockHTML();
      th.innerHTML = THEMES.map(function (t, i) { return (i === 1 || t.id === 'all' ? '<div class="gap"></div>' : '') + '<button data-theme="' + t.id + '"><span>' + t.title + '</span></button>'; }).join('');
    }
    fb.querySelectorAll('[data-cam]').forEach(function (b) { b.setAttribute('aria-pressed', st.targets.indexOf(b.dataset.cam) >= 0); });
    App.q3PaintChips();
    document.querySelectorAll('[data-undo-btn]').forEach(function (b) { b.disabled = !canUndo(); });
    document.querySelectorAll('[data-redo-btn]').forEach(function (b) { b.disabled = !canRedo(); });
    fb.querySelector('[data-count]').textContent = changeCount();
    var q = App.qMarks();  // a Q file is open: sections it takes nothing from are gray
    th.querySelectorAll('[data-theme]').forEach(function (b) {
      var t = THEMES.filter(function (x) { return x.id === b.dataset.theme; })[0], d = differs(t);
      b.setAttribute('aria-current', t.id === st.theme);
      if (d) b.title = d + (d === 1 ? ' setting differs' : ' settings differ') + ' between profiles'; else b.removeAttribute('title');
      b.classList.toggle('noq', !!q && !!t.rows && !t.custom && !t.rows.some(function (r) { return visible(r) && q.crosses(r, App.rowCode(r, profiles()[0])); }));
    });
  }
  function paintMain() {
    var theme = THEMES.filter(function (t) { return t.id === st.theme; })[0] || THEMES[0], main = $('#main'), results = $('#main [data-results]');
    if (theme.id === 'all' && main.dataset.page === 'all' && results) { keepFocus(results, function () { results.innerHTML = gridHTML(allRows()); }); return; }
    var q = App.qMarks();
    var h = '<h1>' + esc(theme.title) + (q && (theme.rows || theme.id === 'all') ? App.info('Gray settings stay as they are on your ' + q.names + '.') : '') + '</h1>' + (theme.note ? '<p class="note dim">' + esc(theme.note) + '</p>' : '');
    if (theme.id === 'sets') h += setsHTML();
    else if (theme.id === 'all') h += '<input class="txt" id="q" type="search" placeholder="Search" aria-label="Search settings" value="' + esc(st.query) + '" style="max-width:320px;margin:0 0 16px"><div data-results>' + gridHTML(allRows()) + '</div>';
    else if (theme.id === 'menus') h += menusHTML();
    else h += (PAGE_PARTS[theme.id] ? partSetsHTML(PAGE_PARTS[theme.id]) : '') + gridHTML(theme.rows.filter(visible));
    // the rows of part sets scroll sideways on a phone: they stay where they were when the page is drawn again
    var xs = main.dataset.page === theme.id ? [].map.call(main.querySelectorAll('.partsets'), function (r) { return r.scrollLeft; }) : [];
    keepFocus(main, function () { main.innerHTML = h; main.dataset.page = theme.id; if (theme.id === 'menus') wireMenus(); });
    main.querySelectorAll('.partsets').forEach(function (r, i) { if (xs[i]) r.scrollLeft = xs[i]; });
  }
  function paintCamera() { Camera.render($('#cam'), cameraCtx()); }

  // The camera drawn: the one picked above it, else the design's own, so the drawing and the table agree.
  function viewModel() { return st.targets.indexOf(st.view) >= 0 ? st.view : st.targets.indexOf(st.doc.model) >= 0 ? st.doc.model : st.targets[0]; }
  // The camera panel draws the camera picked above it. Another camera than the design's shows what Save writes for
  // it; a change made on it goes to the design, like any other.
  function cameraCtx() {
    var m = viewModel();
    return {
      model: m, models: st.targets.slice(), doc: m === st.doc.model ? st.doc : fileFor(m), slot: st.sel, profiles: profiles(), name: pname,
      view: function (to) { st.view = to; save(); paintCamera(); },
      options: options,
      set: function (code, v) { remember(); setRow({ code: code }, scopeOf(code), v); changed(); },
      select: function (p) { st.sel = p; save(); render(); },
      toggleFavorite: function (item) {  // in every profile when Favorites are shared, as in the Favorites editor
        var scope = scopeOf('D1A9'), had = st.doc.S.D1A9[st.sel].items.indexOf(item) >= 0;
        remember();
        (scope === 'all' ? profiles() : [scope]).forEach(function (q) {
          var f = st.doc.S.D1A9[q].items, i = f.indexOf(item);
          if (had && i >= 0) f.splice(i, 1); else if (!had && i < 0 && f.length < E.FAVORITES_MAX) f.push(item);
        });
        changed();
      },
      // A menu of jobs for one control. codes: [{ code, label }]. tryIt: run it on the pretend screen (or null).
      jobMenu: function (anchor, codes, name, tryIt) {
        var items = [], shared = function (code) { return scopeOf(code) === 'all'; };
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
        var code = what === 'favorites' ? 'D1A9' : 'D15E', scope = scopeOf(code);
        if (what === 'favorites') favoritesSheet(scope); else layoutsSheet(scope);
      },
      rename: function (p) {
        if (!$('#main [data-name="' + p + '"]')) { st.theme = 'exposure'; save(); render(); }
        var inp = $('#main [data-name="' + p + '"]'); if (inp) { inp.focus(); inp.select(); }
      }
    };
  }

  // Back to the factory settings, for the cameras picked.
  function startOver() {
    remember();
    st.query = '';
    begin(D.fromSet(FIRST, primary()), { from: 'you started over', setId: FIRST.id, theme: 'sets' });
    save(); render(); $('#main').scrollTop = 0; notice('Started over');
  }

  Object.assign(App, { refresh: refresh, paintCamera: paintCamera, changed: changed, changedSoon: changedSoon, partSetsHTML: partSetsHTML,
    chipsHTML: chipsHTML, dockHTML: dockHTML, fileboxHTML: fileboxHTML, render: render, startOver: startOver });

  // ---------- start ----------
  var FIRST = SETS.filter(function (x) { return x.id === 'factory'; })[0] || SETS[0];  // a first visit starts from the camera as it comes
  if (!load()) begin(D.fromSet(FIRST, primary()), { from: 'you opened Msetter', setId: FIRST.id });
  if (!st.origin) markOrigin('you opened Msetter');
  wire();
  render();
  window.ProfileMaker = {
    state: st, render: render, prepare: prepare, openText: openText, saveSheet: saveSheet, undo: undo, redo: redo,
    nativeReply: nativeReply,
    setCards: function (list) { st.cards = list || []; App.redrawSave(); }
  };
  if (nativeBridge()) nativeBridge().postMessage({ type: 'ready' });
})(window.App = window.App || {});
