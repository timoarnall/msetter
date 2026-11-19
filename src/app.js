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
    gridHTML = App.gridHTML, allRows = App.allRows, menusHTML = App.menusHTML, menusHeads = App.menusHeads, wireMenus = App.wireMenus,
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
  // The count of changes in the top bar follows every change at once, even when the redraw waits for the pointer.
  function changed() { E.syncLive(st.doc); save(); if (pointerDown) { renderPending = true; paintTop(); return; } render(); }
  function changedSoon() { E.syncLive(st.doc); save(); paintTop(); renderPending = true; setTimeout(function () { if (renderPending && !pointerDown) render(); }, 0); }

  // ---------- starting sets ----------
  // An icon for each starting set: 24 px, round 1.6 px strokes, in the text's colour.
  var SVG24 = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var SET_ICON = {
    factory: SVG24('<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>'),
    everyday: SVG24('<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
    motion: SVG24('<circle cx="15" cy="12" r="5"/><path d="M2.5 9h5M4 12h4.5M2.5 15h5"/>'),
    looks: SVG24('<circle cx="9" cy="9.5" r="5"/><circle cx="15" cy="9.5" r="5"/><circle cx="12" cy="14.5" r="5"/>'),
    experimental: SVG24('<path d="M9.5 3h5M10.5 3v6L5 19a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 19l-5.5-10V3"/><path d="M7.5 15h9"/>'),
    architecture: SVG24('<path d="M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-5 9 5"/>'),  // a facade: columns under a pediment
    daynight: SVG24('<path d="M4 19h4v-4h4v-4h4V7h4"/>'),  // the Speed ladder: steps down the shutter speeds
    cinema: SVG24('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>'),
    street: SVG24('<path d="M3 21V9l5-3v15M8 21V4l7 3v14M15 21V11l6 2v8M2 21h20"/>'),
    fixed: SVG24('<circle cx="12" cy="12" r="8"/><path d="M12 12V6.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    portrait: SVG24('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    landscape: SVG24('<path d="M2.5 19l6-9 4 6 3-4 6 7z"/><circle cx="17" cy="6.5" r="1.8"/>'),
    night: SVG24('<path d="M14.5 3.5a7.5 7.5 0 1 0 6 11.5 6 6 0 0 1-6-11.5z"/><path d="M6 4v3.5M4.25 5.75h3.5"/>'),
    events: SVG24('<circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 19a4 4 0 0 1 6.5-3.1"/>'),
    mono: SVG24('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'),
    travel: SVG24('<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17"/>'),
    kids: SVG24('<circle cx="12" cy="15.5" r="3.5"/><circle cx="6.5" cy="10.5" r="1.8"/><circle cx="17.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/>')
  };

  // ---------- profiles and the library ----------
  // A few values that say what a profile is: the speed limit, the ISO (its maximum with Auto ISO, else the fixed ISO)
  // and the first of film style, white balance, drive and shutter that differs from the factory setting.
  function keyVals(get) {
    var f = E.blank(st.doc.model), ref = function (c) { return f.S[c] ? f.S[c][1] : undefined; };
    var sp = get('D00C'), mx = get('D00B'), iso = get('D010'), also = '';
    ['D13E', '5005', '5013', 'D0D5', 'D197'].some(function (c) {  // a switch that is on says its own name: Perspective control
      var v = get(c); if (v === undefined || v === ref(c) || !rule(c)) return false;
      also = short(c, v) === 'On' ? W.rowName(c) || W.settingName(c) : short(c, v); return true;
    });
    var look = get('D13E');
    return { look: look !== undefined && rule('D13E') ? short('D13E', look) : '', speed: sp !== undefined && rule('D00C') ? short('D00C', sp) : '',
      iso: iso !== undefined && iso !== 0 && rule('D010') ? short('D010', iso) : mx !== undefined && rule('D00B') ? 'up to ' + short('D00B', mx) : '',
      also: also };
  }
  // A library row: the name, one line, then the three values its card will show (speed limit, ISO, look), and its tools at
  // the right end: + to add, or a green tick while a profile that came from it is in your profiles; a saved profile also
  // has Remove.
  var justAdded = null;  // the row whose tick draws itself in after its +
  function libRow(x, saved) {
    var T = App.TOOL, v = LIBRARY.valuesFor(x, st.doc.model), first = st.doc.S, f0 = profiles()[0];
    var k = keyVals(function (c) { return c in v ? v[c] : first[c] ? first[c][f0] : undefined; }), full = profiles().length >= 6, id = saved ? 'yours:' + x.name : x.id;
    var have = App.fromLibrary(id);
    var add = have ? '<span class="lhave' + (justAdded === id ? ' fresh' : '') + '" title="In your profiles" role="img" aria-label="In your profiles">' + Motion.TICK + '</span>'
      : '<button class="tool icon" data-libadd="' + esc(id) + '"' + (full ? ' disabled title="A camera holds six profiles"' : ' title="Add ' + esc(x.name) + '"') + ' aria-label="Add ' + esc(x.name) + '">' + T.plus + '</button>';
    return '<div class="librow' + (have ? ' have' : '') + '"><span class="ln">' + esc(x.name) + '</span><span class="ll">' + esc(saved ? '' : x.line || '') + '</span>' +
      '<span class="lv">' + esc(k.speed) + '</span><span class="lv">' + esc(k.iso) + '</span><span class="lv">' + esc(k.look) + '</span>' +
      '<span class="lact tools">' + (saved ? '<button class="tool icon" data-libforget="' + esc(x.name) + '" title="Remove from the library" aria-label="Remove ' + esc(x.name) + ' from the library">' + T.minus + '</button>' : '') + add + '</span></div>';
  }
  // A group: its name with its description behind an (i), and Add all at the right, over the column of + tools.
  function libGroup(name, tip, rows, setId) {
    return '<section class="libcat"><div class="libtitle"><h3>' + (setId && SET_ICON[setId] ? SET_ICON[setId] : '') + '<span>' + esc(name) + '</span>' + (tip ? App.info(tip) : '') + '</h3>' +
      (setId ? '<button class="tool" data-addall="' + setId + '"' + (profiles().length >= 6 ? ' disabled title="A camera holds six profiles"' : '') + '>' + App.TOOL.plus + 'Add all</button>' : '') + '</div>' + rows + '</section>';
  }
  function profilesHTML() {
    var T = App.TOOL, ps = profiles(), n = ps.length, start = st.doc.S.D124[0];
    // Start from your camera: what it is, the camera's menu path, and Open in its corner
    var h = '<button class="startcard" data-open><span class="sc-title">Start from your camera</span>' +
      '<span class="sc-path"><span class="crumb">User Profile</span><i>›</i><span class="crumb">Manage Profiles</span><i>›</i><span class="crumb">Export Profiles</span></span>' +
      '<span class="tool sc-open">' + T.open + 'Open settings.lcse</span></button>';
    // Your profiles. Every card has the same rows, so they line up across the cards: the number to drag by and the name,
    // then Speed, ISO and Look. Its tools sit in the bottom right corner: … (rename, duplicate, default profile, save to
    // the library), then − to remove. An empty slot has + where − would be.
    var rowsOf = function (k) {
      return [['Speed', k.speed], ['ISO', k.iso], ['Look', k.look]].map(function (r) {
        return '<span class="pc-row"><span class="pc-l">' + r[0] + '</span><span class="pc-v">' + esc(r[1] || 'None') + '</span></span>';
      }).join('');
    };
    h += '<div class="pcards" data-pcards>' + ps.map(function (p, i) {
      var k = keyVals(function (c) { return st.doc.S[c] ? E.get(st.doc, c, p) : undefined; });
      return '<div class="pcard' + (p === st.sel ? ' sel' : '') + '" data-pcard="' + p + '" data-pname="' + esc(pname(p)) + '">' +
        '<span class="pc-top"><span class="pc-name">' + esc(pname(p)) + '</span><span class="pc-num grip" tabindex="0" role="button" aria-label="Move ' + esc(pname(p)) + '">' + (i + 1) + '</span></span>' +
        rowsOf(k) +
        '<span class="pc-foot"><span class="faint"' + (p === start && n > 1 ? ' title="The profile the camera starts in">Default' : '>') + '</span><span class="tools">' +
        '<button class="tool icon minor" data-more="' + p + '" title="More" aria-label="More for ' + esc(pname(p)) + '">' + T.more + '</button>' +
        '<button class="tool icon" data-premove="' + p + '"' + (n < 2 ? ' disabled title="A camera needs one profile"' : ' title="Remove"') + ' aria-label="Remove ' + esc(pname(p)) + '">' + T.minus + '</button></span></span></div>';
    }).join('');
    // every empty place of the six is a slot: recessed, only Blank and its +, so it never reads as a profile
    for (var e = n; e < 6; e++) h += '<button class="pcard blank" data-pblank aria-label="Add a blank profile"><span class="pc-top"><span class="pc-name">Blank</span><span class="pc-num">' + (e + 1) + '</span></span>' +
      '<span class="pc-foot"><span></span><span class="tools"><span class="tool icon">' + T.plus + '</span></span></span></button>';
    h += '</div>';
    h += '<h2 class="lib" id="library">Library' + (n >= 6 ? ' <span class="dim">Full</span>' : '') + '</h2><div class="libhead"><span></span><span></span><span class="lh">Speed</span><span class="lh">ISO</span><span class="lh">Look</span><span></span></div>';
    var mine = LIBRARY.yours();
    if (mine.length) h += libGroup('Saved', 'Profiles you saved, in this browser. The Mac app keeps its own.', mine.map(function (x) { return libRow(x, true); }).join(''), null);
    LIBRARY.groups.forEach(function (g) { h += libGroup(g.name, g.help, g.items.map(function (x) { return libRow(x, false); }).join(''), g.id); });
    return h;
  }
  // A library profile becomes your last one: a copy of your first, then its own values. Its card flies in from the +.
  // The design's only profile is the untouched one it started with (USER1 on factory settings, or Start over): nothing in
  // it to keep, so the first profile added takes its place.
  function placeholder() { return profiles().length === 1 && st.setId === 'factory' && !changesSince().length && !Object.keys(st.bases).length; }
  function addFromLibrary(id, from) {
    var x = LIBRARY.find(id); if (!x || profiles().length >= 6) return;
    remember(); var np, v = LIBRARY.valuesFor(x, st.doc.model);
    if (placeholder()) { np = profiles()[0]; D.replaceValues(st.doc, np, v, x.name); App.renew(np); }  // the set stays, so each camera keeps its own factory values
    else np = D.addValues(st.doc, v, x.name);
    if (!np) return;
    App.tag(np, { lib: id });
    st.sel = np; justAdded = id; if (from) Motion.flyFrom(from);
    changed(); justAdded = null;
    var row = $('#main .lhave.fresh svg'); if (row) Motion.tick(row);
    notice('Added ' + pname(np), 'undo', { done: true });
  }
  function addBlank() {
    remember(); var bp = D.addProfile(st.doc); if (!bp) return;
    st.sel = bp; changed(); notice('Added ' + pname(bp), 'undo', { done: true });
  }
  function removeProfile(p) {
    if (profiles().length < 2) return;
    var was = pname(p); remember(); D.removeProfile(st.doc, p); App.fixSel(); changed(); notice('Removed ' + was, 'undo', { done: true });
  }
  function keepProfile(p) {
    var v = {}; LIBRARY.ownCodes().forEach(function (c) { if (st.doc.S[c]) v[c] = E.clone(st.doc.S[c][p]); });
    LIBRARY.keep({ name: pname(p), values: v, line: '' });
    render(); notice('Saved ' + pname(p) + ' to the library', 'none', { done: true, always: true });
  }
  function forgetYours(name) { LIBRARY.forget(name); render(); notice('Removed ' + name + ' from the library', 'none'); }
  // Add all: every profile of a group you don't have yet, as many as fit; the notice names any left out. On the
  // untouched first profile it starts from the whole set (its buttons, Favorites and screen layouts too).
  function addAll(id) {
    var g = LIBRARY.groups.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    if (placeholder()) { useSet(id); return; }
    var want = g.items.filter(function (x) { return !App.fromLibrary(x.id); });
    if (!want.length) { notice('Every ' + g.name + ' profile is added', 'none'); return; }
    var room = 6 - profiles().length, fit = want.slice(0, room), left = want.slice(room);
    if (!fit.length) { notice('No room for ' + W.listOf(left.map(function (x) { return x.name; })), 'none'); return; }
    remember(); var added = [];
    fit.forEach(function (x) { var p = D.addValues(st.doc, LIBRARY.valuesFor(x, st.doc.model), x.name); if (p) { added.push(p); App.tag(p, { lib: x.id }); } });
    st.sel = added[0] || st.sel; changed();
    notice('Added ' + W.listOf(added.map(pname)) + (left.length ? '. No room for ' + W.listOf(left.map(function (x) { return x.name; })) : ''), 'undo', { done: true });
  }
  // A Favorites or Screen layouts value in a table goes to its page's editor, with its profile selected: one editor
  // for each, never a second copy in a sheet.
  function goEditor(kind, p) {
    if (p !== 'all') st.sel = p;
    st.theme = kind === 'favorites' ? 'menus' : 'screen'; save(); render();
    var ed = $('#main [data-editor="' + (kind === 'favorites' ? 'D1A9' : 'D15E') + '"]');
    if (ed) ed.scrollIntoView({ block: 'start', behavior: Motion.still() ? 'auto' : 'smooth' });
  }
  function goLibrary() {
    st.theme = 'sets'; save(); render();
    var lib = $('#library'); if (lib) lib.scrollIntoView({ block: 'start', behavior: Motion.still() ? 'auto' : 'smooth' });
  }
  // A whole set in place of your profiles, as a starting set (on your own file when one is open): Add all on the
  // untouched first profile.
  function useSet(id) {
    var s = SETS.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    remember(); var file = st.bases[st.doc.model];
    begin(file ? D.fromSetOn(s, file) : D.fromSet(s, st.doc.model), { from: 'you picked ' + s.name, setId: s.id, bases: st.bases });
    profiles().forEach(function (q, i) { App.tag(q, { lib: s.id + '-' + i }); });
    save(); render(); notice('Added ' + W.listOf(profiles().map(pname)), 'undo', { done: true });
  }

  // Your profiles' cards are dragged into order with a mouse, a finger on the number, or the arrow keys on it.
  function wireProfiles() {
    var el = $('#main [data-pcards]'); if (!el) return;
    App.dragReorder(el, '.pcard:not(.blank)', '.pcard:not(.blank)', function (from, to) {
      remember(); var ps = profiles(), name = pname(ps[from]), order = ps.slice(); order.splice(to, 0, order.splice(from, 1)[0]);
      App.moveRecs(from, to); D.moveProfile(st.doc, from, to);
      st.sel = ps[order.indexOf(st.sel)];  // the selection names a profile, not a place
      Motion.hint('reorder'); changed(); notice('Moved ' + name + ' to ' + (to + 1), 'undo', { done: true });
    }, { skip: 'button', touch: '.grip', root: '#main [data-pcards]' });
  }

  // ---------- part sets ----------
  // Small cards for the part sets of one kind, at the top of the page that sets that part. The card for the set every
  // profile holds now is marked.
  function partSetsHTML(kind) {
    return '<div class="partsets" role="group" aria-label="' + esc(W.PART_KINDS[kind].name) + ' sets">' + PART_SETS.filter(function (x) { return x.kind === kind; }).map(function (x) {
      var on = D.partMatches(st.doc, x);
      return '<button class="set part' + (on ? ' current' : '') + '" data-part="' + x.id + '" aria-pressed="' + on + '"><span>' + esc(x.name) + '</span><span class="dim">' + esc(x.help) + '</span>' +
        (on ? '' : '<span class="tools"><span class="tool icon" aria-hidden="true">' + App.TOOL.plus + '</span></span>') + '</button>';  // the + every add has, in the corner
    }).join('') + '</div>';
  }
  // After a change made in place (an editor), the marks follow.
  function paintParts() {
    document.querySelectorAll('#main [data-part]').forEach(function (b) {
      var on = D.partMatches(st.doc, App.partSet(b.dataset.part));
      b.classList.toggle('current', on); b.setAttribute('aria-pressed', on);
    });
  }
  var PAGE_PARTS = { buttons: 'buttons' };  // the Favorites and layouts page puts its sets by each editor

  // ---------- render ----------
  var THEMES = [{ id: 'sets', title: 'Profiles', note: 'The camera lists your profiles in this order. A profile from the library brings its own exposure, look and shooting settings and takes the rest from your first profile.' }].concat(C.themes).concat([{ id: 'all', title: 'All settings',
    note: 'Settings the camera keeps for itself stay as they are.' }]);
  var SVG = function (d) { return '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var THEME_ICON = {
    sets: SVG('<rect x="2.5" y="5" width="9" height="8.5" rx="1.5"/><path d="M5 2.5h7a1.5 1.5 0 0 1 1.5 1.5v7"/>'),
    exposure: SVG('<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11"/><path d="M10.5 6.5v3M9 8h3"/>'),
    buttons: SVG('<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2"/>'),
    menus: SVG('<path d="M8 2.3l1.7 3.6 3.9.5-2.9 2.7.8 3.9L8 11.1 4.5 13l.8-3.9-2.9-2.7 3.9-.5z"/>'),
    screen: SVG('<rect x="2" y="3.5" width="12" height="8.5" rx="1.5"/><path d="M6 14h4"/>'),
    look: SVG('<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5a5.5 5.5 0 0 0 0 11z" fill="currentColor"/>'),
    files: SVG('<path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3"/>'),
    shooting: SVG('<rect x="2" y="4" width="8" height="8" rx="1.2"/><path d="M12 5.5v5M14 6.5v3"/>'),
    flash: SVG('<path d="M9 1.8L3.8 9H8l-1 5.2L12.2 7H8z"/>'),
    camera: SVG('<path d="M12.54 6.78L14.22 7.01L14.22 8.99L12.54 9.22L12.07 10.35L13.10 11.70L11.70 13.10L10.35 12.07L9.22 12.54L8.99 14.22L7.01 14.22L6.78 12.54L5.65 12.07L4.30 13.10L2.90 11.70L3.93 10.35L3.46 9.22L1.78 8.99L1.78 7.01L3.46 6.78L3.93 5.65L2.90 4.30L4.30 2.90L5.65 3.93L6.78 3.46L7.01 1.78L8.99 1.78L9.22 3.46L10.35 3.93L11.70 2.90L13.10 4.30L12.07 5.65Z"/><circle cx="8" cy="8" r="2"/>'),  // a cog: camera-wide settings
    all: SVG('<path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.8" cy="4" r=".4"/><circle cx="2.8" cy="8" r=".4"/><circle cx="2.8" cy="12" r=".4"/>')
  };
  function differs(theme) {
    if (!theme.rows || profiles().length < 2) return 0;
    return theme.rows.filter(function (r) { return visible(r) && !sameAcross(r); }).length;
  }
  // The camera chips in the Save sheet (the Q cameras have a row of their own there).
  function chipsHTML() {
    return MODELS.map(function (m) { return '<button class="chip" data-cam="' + m + '" aria-pressed="' + (st.targets.indexOf(m) >= 0) + '">' + m + '</button>'; }).join('');
  }
  // Open, save, which cameras, and the way back: one small panel, in the sidebar (a bar at the bottom on phones).
  function fileboxHTML() {
    return '<button class="navbtn" data-open>' + SVG('<path d="M8 10.5V2.5M5 5.5l3-3 3 3"/><path d="M2.5 9.5v3a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/>') + '<span>Open</span></button>' +
      '<button class="navbtn save" data-save>' + SVG('<path d="M8 2.5v8M5 7.5l3 3 3-3"/><path d="M2.5 9.5v3a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/>') + '<span>Save</span></button>';
  }
  // ---------- top bar: cameras, starting point, changes, Undo and Redo, more ----------
  var ICON16 = function (d) { return '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var TICON = {
    undo: ICON16('<path d="M5.5 3.5L2.5 6.5l3 3"/><path d="M2.5 6.5h7a3.5 3.5 0 0 1 0 7H7"/>'),
    redo: ICON16('<path d="M10.5 3.5l3 3-3 3"/><path d="M13.5 6.5h-7a3.5 3.5 0 0 0 0 7H9"/>'),
    more: App.TOOL.more,
    chev: ICON16('<path d="M4.5 6.5L8 10l3.5-3.5"/>'),
    tick: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function camLabel(short) {
    var q = st.origin && st.origin.q3;  // a Q file's camera is named first
    if (q) return st.targets.length ? q + (short ? ' +' + st.targets.length : ' and ' + W.listOf(st.targets.slice())) : q;
    if (!st.targets.length) return short ? 'Camera' : 'Choose camera';  // the phone's dock has room for one word
    if (short) return st.targets[0] + (st.targets.length > 1 ? ' +' + (st.targets.length - 1) : '');
    return W.listOf(st.targets.slice());
  }
  function fromFile() { var f = (st.origin && st.origin.from) || ''; return /^you opened /.test(f) && f !== 'you opened Msetter'; }
  // Where the profiles started, by one name set when they started: Factory, a set's name, From your M-EV1 (From your Q3
  // for a Q file). Adding to it never renames it. A status, so no icon that could read as a button; a file read and
  // kept has its tick.
  function originName() {
    var o = st.origin || {}, s = SETS.filter(function (x) { return x.id === st.setId; })[0];
    return o.q3 ? 'From your ' + o.q3 : fromFile() ? 'From your ' + o.model : s ? s.name : 'Factory';
  }
  function originHTML() {
    return (fromFile() ? '<span class="tdone">' + TICON.tick + '</span>' : '') + '<span>' + esc(originName()) + '</span>';
  }
  function topbarHTML() {
    return '<button class="campick" data-cams aria-haspopup="listbox"><span data-camlabel></span>' + TICON.chev + '</button>' +
      '<span class="origin" data-origin></span>' +
      '<span class="tright"><button class="count" data-count aria-haspopup="true"></button>' +
      '<button class="ibtn" data-undo-btn title="Undo (⌘Z)" aria-label="Undo">' + TICON.undo + '</button>' +
      '<button class="ibtn" data-redo-btn title="Redo (⇧⌘Z)" aria-label="Redo">' + TICON.redo + '</button>' +
      '<button class="ibtn" data-tmore title="More" aria-label="More">' + TICON.more + '</button></span>';
  }
  function paintTop() {
    var tb = $('#topbar');
    if (!tb.firstChild) tb.innerHTML = topbarHTML();
    document.querySelectorAll('[data-camlabel]').forEach(function (s) { s.textContent = camLabel(s.dataset.camlabel === 'short'); });
    tb.querySelector('[data-origin]').innerHTML = originHTML();
    var ch = changesSince();
    var c = tb.querySelector('[data-count]'); c.textContent = ch.length ? W.count(ch.length, 'change') : 'No changes';
    c.title = ch.length ? 'Opens the list in Save' : '';
  }
  // Which cameras the file is for, the Q experiment, and (on phones) Start over: one menu from the camera button.
  // A tap adds or removes that camera; the menu stays open, its ticks redrawn in place.
  function camItems() {
    var phone = innerWidth < 760, items = [{ head: 'Cameras this file is for' }];
    MODELS.forEach(function (m) { items.push({ t: m, v: m, cur: st.targets.indexOf(m) >= 0 }); });
    if (App.q3Models().length) {
      items.push({ head: 'Experimental' });
      App.q3Models().forEach(function (m) { items.push({ t: m, q: m, close: true, cur: App.q3Held(m) }); });
    }
    if (phone) items.push({ sep: true }, { t: 'Start over', act: 'restart', close: true, d: 'Back to the factory settings' }, { t: 'About Msetter', act: 'about', close: true });  // the top bar's … isn't on a phone
    return items;
  }
  function camMenu(anchor) {
    menu(anchor, camItems(), function (it) {
      if (it.act === 'restart') { startOver(); return; }
      if (it.act === 'about') { about(); return; }
      if (it.q) { App.q3Sheet(it.q); return; }
      App.toggleTarget(it.v);
    }, null, camItems);
  }
  function moreMenu(anchor) {
    var links = [['Project page', 'https://timoarnall.github.io/msetter/'], ['Documentation', 'https://github.com/timoarnall/msetter/tree/main/docs'], ['GitHub', 'https://github.com/timoarnall/msetter']];
    menu(anchor, [{ t: 'Start over', act: 'restart', d: 'Back to the factory settings' }, { sep: true }, { t: 'About Msetter', act: 'about' }]
      .concat(links.map(function (l) { return { t: l[0], url: l[1] }; })), function (it) {
      if (it.act === 'restart') startOver(); else if (it.act === 'about') about(); else if (it.url) window.open(it.url, '_blank', 'noopener');
    });
  }
  // About: the same words as the project page's footer, the version, and where to go when something goes wrong.
  function about() {
    App.sheet('<h2>About Msetter</h2>' + W.ABOUT.map(function (l) { return '<p>' + W.aboutHTML(l) + '</p>'; }).join('') +
      '<p class="dim">Version ' + esc(typeof VERSION === 'string' ? VERSION : '') + '</p>' +
      '<div class="row end"><a class="btn" href="' + W.HELP_URL + '" target="_blank" rel="noopener">If something goes wrong</a><button class="btn" data-close>Done</button></div>');
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest || !t.closest('#topbar, #dock')) return;
    var c = t.closest('[data-cams]'); if (c) { camMenu(c); return; }
    var m = t.closest('[data-tmore]'); if (m) { moreMenu(m); return; }
    if (t.closest('#topbar [data-count]')) { App.saveSheet(); return; }  // the list of changes is the Save sheet's
    if (t.closest('#topbar [data-undo-btn]')) { undo(); return; }
    if (t.closest('#topbar [data-redo-btn]')) { redo(); return; }
  });
  function dockHTML() {
    return '<button class="ibtn" data-undo-btn aria-label="Undo">' + TICON.undo + '</button><button class="ibtn" data-redo-btn aria-label="Redo">' + TICON.redo + '</button>' +
      '<button class="campick" data-cams aria-haspopup="listbox"><span data-camlabel="short"></span>' + TICON.chev + '</button>' +
      '<span class="spacer"></span><button class="btn" data-open>Open</button><button class="btn primary" data-save>Save</button>';
  }
  // render() draws the page from the state. The sidebar, the dock and the list of sections are built once and then
  // updated in place, so a button there keeps the keyboard focus. The main page is drawn again with its focus and
  // typing cursor put back; on All settings the search box stays and only the rows under it are drawn again.
  function render() {
    renderPending = false; App.forget();
    var main = $('#main'), before = Motion.capture(main);
    paintSide(); paintCamera(); paintMain();  // the camera first: the layouts editor's previews draw from it
    App.fitGrid();
    Motion.play(before, main);
  }
  // After a change made in place (an editor, a drag along a value, the Save sheet): all but the main page catches up.
  function refresh() {
    paintSide(); paintCamera();
    if (st.theme === 'menus' || st.theme === 'screen') menusHeads();
    if (st.theme === 'menus') Camera.show('favorites');
    paintParts();
  }
  function paintSide() {
    var fb = $('#filebox'), th = $('#themes');
    if (!fb.firstChild) {
      fb.innerHTML = fileboxHTML(); $('#dock').innerHTML = dockHTML();
      th.innerHTML = THEMES.map(function (t, i) { return (i === 1 || t.id === 'all' ? '<div class="gap"></div>' : '') + '<button data-theme="' + t.id + '">' + (THEME_ICON[t.id] || '') + '<span>' + t.title + '</span></button>'; }).join('');
    }
    paintTop();
    document.querySelectorAll('[data-undo-btn]').forEach(function (b) { b.disabled = !canUndo(); });
    document.querySelectorAll('[data-redo-btn]').forEach(function (b) { b.disabled = !canRedo(); });
    
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
    if (theme.id === 'all' && main.dataset.page === 'all' && results) {
      keepFocus(results, function () { results.innerHTML = allResults(); });
      main.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filter === st.filter); });
      return;
    }
    var q = App.qMarks();
    document.body.dataset.page = theme.id;
    // a title stands alone (design rule 6): what the page needs to say is facts behind its (i)
    var h = '<h1>' + esc(theme.title) + (theme.note ? App.info(theme.note) : '') + (q && (theme.rows || theme.id === 'all') ? App.info('Gray settings stay as they are on your ' + q.names + '.') : '') + '</h1>';
    var slot = '<div class="camslot" data-camslot></div>';
    if (theme.id === 'sets') h += profilesHTML();
    else if (theme.id === 'all') h += '<div class="allbar"><input class="txt" id="q" type="search" placeholder="Search" aria-label="Search settings" value="' + esc(st.query) + '">' +
      '<span class="seg" role="group" aria-label="Show">' + [['all', 'All'], ['diff', 'Different'], ['changed', 'Changed']].map(function (f) {
        return '<button data-filter="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</span></div><div data-results>' + allResults() + '</div>';
    else if (theme.id === 'menus') h += menusHTML('D1A9');
    else if (theme.id === 'screen') h += slot + gridHTML(theme.rows.filter(visible)) + menusHTML('D15E');
    else if (theme.id === 'buttons') h += '<div class="btnhero">' + slot + partSetsHTML('buttons') + '</div>' + gridHTML(theme.rows.filter(visible));
    else h += (PAGE_PARTS[theme.id] ? partSetsHTML(PAGE_PARTS[theme.id]) : '') + gridHTML(theme.rows.filter(visible));
    // on entering Screen the pretend screen shows the picture with the first layout; on Favorites, the Favorites page
    var fresh = main.dataset.page !== theme.id;
    if (fresh) {
      if (theme.id === 'screen') { Camera.sim.panel = null; Camera.sim.menu = 0; Camera.sim.lv = true; Camera.sim.layout = 0; paintCamera(); }
    }
    // the rows of part sets scroll sideways on a phone: they stay where they were when the page is drawn again
    var xs = main.dataset.page === theme.id ? [].map.call(main.querySelectorAll('.partsets'), function (r) { return r.scrollLeft; }) : [];
    keepFocus(main, function () {
      var cam = $('#cam'); if (main.contains(cam)) $('#camhold').appendChild(cam);  // the camera leaves before the page is drawn again
      main.innerHTML = h; main.dataset.page = theme.id;
      var at = main.querySelector('[data-camslot]'); if (at) at.appendChild(cam);
      if (theme.id === 'menus' || theme.id === 'screen') wireMenus();
      if (theme.id === 'sets') wireProfiles();
    });
    if (theme.id === 'menus') Camera.show('favorites');
    main.querySelectorAll('.partsets').forEach(function (r, i) { if (xs[i]) r.scrollLeft = xs[i]; });
    if (fresh) Motion.rise(main, theme.id);
  }
  // All settings: every row, or only those where profiles differ, or only those changed since the start.
  function allResults() {
    var rows = allRows();
    if (rows.length) return gridHTML(rows);
    return '<p class="dim empty">' + (st.filter === 'diff' ? 'No setting' + (st.query ? ' that matches' : '') + ' differs between profiles.'
      : st.filter === 'changed' ? 'Nothing changed since ' + ((st.origin && st.origin.from) || 'you started') + (st.query ? ' that matches' : '') + '.' : 'No setting matches.') + '</p>';
  }
  function paintCamera() { Camera.render($('#cam'), cameraCtx()); }

  // The camera drawn: the one picked above it, else the design's own, so the drawing and the table agree.
  function viewModel() { return st.targets.indexOf(st.view) >= 0 ? st.view : st.targets.indexOf(st.doc.model) >= 0 ? st.doc.model : st.targets[0] || st.doc.model; }
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
        if (st.theme === 'buttons') tryIt = null;
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
      menu: function (anchor, items, pick, note) {  // on Buttons there is no screen to try things on
        if (st.theme === 'buttons') items = items.filter(function (it) { return it.id !== 'try' && !(it.sep && it.pin); });
        menu(anchor, items, pick, note);
      },
      edit: function (what) {  // Favorites or the screen layouts: their page
        st.theme = what === 'favorites' ? 'menus' : 'screen'; save(); render(); $('#main').scrollTop = 0;
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
    save(); render(); $('#main').scrollTop = 0; notice('Started over from the factory settings', 'undo', { done: true });
  }

  // The rules the page always keeps, as a list of what is broken (empty when all hold). The random walk
  // (test/state-walk.js) calls it after every step and every browser flow at its end. docs/state.md, "Checks".
  function checkState() {
    var bad = [], ps = profiles(), ch = App.changes();
    if (ps.indexOf(st.sel) < 0) bad.push('the selected profile is not saved');
    if (!ps.length || ps.length > 6) bad.push('profile count ' + ps.length);
    if (st.targets.length && st.targets.indexOf(st.doc.model) < 0) bad.push('the design is not on a picked camera');
    if (st.origin && st.origin.model !== st.doc.model) bad.push('the start is on another camera');
    var names = ps.map(pname); if (names.some(function (n, i) { return names.indexOf(n) !== i; })) bad.push('two profiles share a name');
    Object.keys(st.recs).forEach(function (q) { if (ps.indexOf(+q) < 0) bad.push('a record for a profile that is gone'); });
    var c = $('#topbar [data-count]');
    if (c && c.textContent !== (ch.lines.length ? W.count(ch.lines.length, 'change') : 'No changes')) bad.push('the count is not the number of lines');
    Object.keys(ch.marks).forEach(function (k) {  // every dot has a line that names its setting or its profile
      var code = k.split(' ')[0], q = +k.split(' ')[1], nm = q ? pname(q) : null;
      if (!ch.lines.some(function (l) { return l.indexOf(W.settingName(code)) >= 0 || (nm && l.indexOf(nm) >= 0); })) bad.push('a dot with no line: ' + code);
    });
    document.querySelectorAll('#main .gcell.wide [data-p="all"]').forEach(function (el) {  // a bar holds one value
      var row = App.rowByKey(el.dataset.row); if (row && ps.length > 1 && !App.sameAcross(row)) bad.push('a bar over values that differ: ' + el.dataset.row);
    });
    return bad;
  }

  Object.assign(App, { goEditor: goEditor, checkState: checkState, addFromLibrary: addFromLibrary, addBlank: addBlank, removeProfile: removeProfile, keepProfile: keepProfile,
    forgetYours: forgetYours, goLibrary: goLibrary, useSet: useSet, addAll: addAll, refresh: refresh, paintCamera: paintCamera, changed: changed, changedSoon: changedSoon, partSetsHTML: partSetsHTML,
    chipsHTML: chipsHTML, render: render, startOver: startOver });

  // ---------- start ----------
  var FIRST = SETS.filter(function (x) { return x.id === 'factory'; })[0] || SETS[0];  // a first visit starts from the camera as it comes
  var fresh = function () { begin(D.fromSet(FIRST, primary()), { from: 'you opened Msetter', setId: FIRST.id }); };
  var stored = load();
  if (!stored) fresh();
  if (!st.origin) markOrigin('you opened Msetter');
  wire();
  try { render(); } catch (e) {  // a stored design the page can't draw: keep it aside and start fresh
    if (!stored) throw e;
    App.shelve(); st.targets = []; st.theme = 'sets'; st.split = {}; st.parts = {}; st.bases = {}; st.view = ''; fresh(); render();
  }
  window.addEventListener('resize', function () { App.fitGrid(); });
  if (App.wasShelved()) notice('Your profiles in this browser couldn’t be read, so this is a fresh start. A copy is set aside.', 'none');
  // Another tab changed what this browser keeps: this tab's copy is out of date, and saving here would overwrite it.
  window.addEventListener('storage', function (e) {
    if ([App.STORE, 'msetter-q3-v1', 'msetter-yours-v1'].indexOf(e.key) < 0) return;
    notice('Changed in another tab', { label: 'Reload', act: function () { location.reload(); } });
  });
  window.ProfileMaker = {
    state: st, render: render, prepare: prepare, openText: openText, saveSheet: saveSheet, undo: undo, redo: redo,
    nativeReply: nativeReply,
    setCards: function (list) { st.cards = list || []; App.redrawSave(); }
  };
  if (nativeBridge()) nativeBridge().postMessage({ type: 'ready' });
})(window.App = window.App || {});
