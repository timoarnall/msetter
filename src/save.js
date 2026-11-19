// Saving and opening: the file for each camera and its notes, the Save sheet, downloads, the Mac app's
// save panel and cards, opening a file, and moving the design to another camera.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, D = Design, W = Words;
  var short = W.short, settingName = W.settingName, listOf = W.listOf;
  var $ = App.$, esc = App.esc, keepFocus = App.keepFocus, notice = App.notice, closeMenu = App.closeMenu, sheet = App.sheet,
    closeSheets = App.closeSheets, MODELS = App.MODELS, st = App.st, primary = App.primary, rule = App.rule,
    profiles = App.profiles, pname = App.pname, remember = App.remember, save = App.save, begin = App.begin,
    changesSince = App.changesSince, partsPicked = App.partsPicked;

  function currentSet() { return st.setId ? SETS.filter(function (s) { return s.id === st.setId; })[0] : null; }
  // The file Save writes for one camera, and what it changes on the way, in words.
  // The starting point counts when the design follows a starting set or part sets, so a value changed since is kept.
  function forCamera(target) {
    var set = currentSet(), parts = partsPicked();
    var res = D.forCamera(st.doc, target, { base: st.bases[target], set: set, parts: parts, origin: (set || parts.length) ? st.origin : undefined, start: st.origin });
    var d = defaultProfile();
    if (res.doc.S.D124[0] !== d) { res.doc.S.D124 = [d]; E.syncLive(res.doc); }
    return res;
  }
  // The profile the camera starts in, as the file will hold it. A camera's own export names none (0), so after it
  // imports, the settings in use stay the old ones until a profile is picked on the camera; once something has changed,
  // the file starts the camera in the first profile. Worked out when the file is made: opening Save writes nothing.
  function defaultProfile() {
    var ps = profiles(), d = st.doc.S.D124[0];
    return ps.indexOf(d) >= 0 || !changesSince().length ? d : ps[0];
  }
  function prepare(target) { var res = forCamera(target); return { doc: res.doc, notes: noteLines(res.notes, target) }; }
  function fileFor(target) { return forCamera(target).doc; }
  function listNames(code, items) { return listOf(items.map(function (v) { return E.label(code, v); })); }
  function noteText(n) {
    var why = n.follow ? ', as in ' + n.follow + ' on this camera' : '';
    if (n.kind === 'items') {
      var name = n.code === 'D1A9' ? 'Favorites' : settingName(n.code);
      return name + (n.lost.length ? ' loses ' + listNames(n.code, n.lost) : '') + (n.lost.length && n.gained.length ? ' and' : '') +
        (n.gained.length ? ' gains ' + listNames(n.code, n.gained) : '') + why;
    }
    return settingName(n.code) + ' changes from ' + short(n.code, n.from) + ' to ' + short(n.code, n.to) + why;
  }
  // One line per change in a saved profile or a camera-wide setting; a change made in every profile is one line.
  // Values that take this camera's own version of the starting set or a part set are expected: the table shows them
  // under the value, so Save leaves them out.
  function noteLines(notes, target) {
    var ps = profiles(), groups = [], byText = {};
    notes.forEach(function (n) {
      var wide = !E.rule(target, n.code).p;
      if (n.follow || (wide ? n.slot !== 0 : ps.indexOf(n.slot) < 0)) return;
      var t = noteText(n);
      if (!byText[t]) { byText[t] = { text: t, wide: wide, slots: [] }; groups.push(byText[t]); }
      byText[t].slots.push(n.slot);
    });
    var out = [];
    groups.forEach(function (g) {
      if (g.wide || ps.length < 2) out.push(g.text);
      else if (g.slots.length === ps.length) out.push('Every profile: ' + g.text);
      else g.slots.forEach(function (q) { out.push(pname(q) + ': ' + g.text); });
    });
    return out;
  }
  // Where the file goes. In the Mac app, a native save panel or straight onto a mounted camera card.
  // Inside claude.ai the page cannot download by itself and only some file endings are allowed, so it asks the
  // viewer to save settings.lcse.json there. In a browser it downloads settings.lcse.
  // The camera reads and writes a file called settings.lcse at the top of its card.
  var CARD_FILE = 'settings.lcse';
  function inClaude() { return !!(window.claude && window.claude.use); }
  function nativeBridge() { return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native; }
  var calls = {}, callId = 0;
  function callNative(msg) {
    return new Promise(function (resolve) { msg.id = ++callId; calls[msg.id] = resolve; nativeBridge().postMessage(msg); });
  }
  // The Mac app answers a call with nativeReply(id, result).
  function nativeReply(id, r) { var f = calls[id]; delete calls[id]; if (f) f(r); }
  function downloadBlob(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  var zipSave = function () { return st.targets.length > 1 && !nativeBridge() && !inClaude(); };
  function download(name, text) {
    if (nativeBridge()) return callNative({ type: 'save', name: name, text: text });
    if (inClaude()) {
      return window.claude.use('downloads').then(function (d) {
        if (!d) return 'unavailable';
        return d.save({ filename: name + '.json', data: text }).then(function () { return 'saved'; }, function (e) { return e && e.code === 'declined' ? 'declined' : 'unavailable'; });
      });
    }
    downloadBlob(name, new Blob([text], { type: 'application/octet-stream' }));
    return Promise.resolve('saved');
  }
  function cardsFor(target) {  // mounted cards this camera's file can go on: its own, or a card no camera has exported to
    return (st.cards || []).filter(function (c) { return !c.camera || E.modelForCamera(c.camera) === target; });
  }
  // The Save sheet. Choosing cameras or the default profile in it draws it again in place. Opening it changes nothing.
  function saveSheet() {
    if (document.querySelector('.veil')) return;  // one sheet at a time
    var showM = false;  // a design from a Q file: the M cameras' rows show once asked for
    sheet(saveSheetHTML(showM), function (el) {
      var again = function () { keepFocus(el, function () { el.innerHTML = saveSheetHTML(showM); }); };
      redrawSave = function () { if (el.isConnected) again(); };  // cards mounted while it is open (Mac app)
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-mshow]')) { showM = true; again(); var s = el.querySelector('[data-save], [data-card]'); if (s) s.focus({ preventScroll: true }); return; }
        var qs = e.target.closest('[data-qsave]'); if (qs) { App.q3Save(qs.dataset.qsave, qs); return; }
        var b = e.target.closest('[data-save]');
        if (b) {
          var t = b.dataset.save;
          if (t === 'all' || zipSave()) {  // a folder for each camera, in one zip
            var ts = t === 'all' ? st.targets : [t];
            var files = ts.map(function (m) { return { name: m + '/' + CARD_FILE, text: E.serialize(prepare(m).doc) }; });
            downloadBlob(t === 'all' ? 'Msetter settings.zip' : t + '.zip', new Blob([Zip.bytes(files)], { type: 'application/zip' }));
            b.textContent = 'Saved'; b.classList.remove('primary');  // done, so no longer the button to press
            ts.forEach(function (m) { savedChecks(t === 'all' ? $('.sheet [data-save="' + m + '"]') || b : b, m, null); });
            var last = t === 'all' ? b : $('.sheet [data-save="' + t + '"]');
            if (last) savedChecks(last, null, 'Sent ' + (t === 'all' ? 'Msetter settings.zip' : t + '.zip') + ' to your browser’s downloads');
            return;
          }
          download(CARD_FILE, E.serialize(prepare(t).doc)).then(function (r) {
            b.textContent = saveWords(r); if (r === 'saved') b.classList.remove('primary');
            if (r === 'saved') savedChecks(b, t, nativeBridge() ? 'Saved ' + CARD_FILE : inClaude() ? 'Saved ' + CARD_FILE + '.json' : 'Sent ' + CARD_FILE + ' to your browser’s downloads');
          });
        }
        var c = e.target.closest('[data-card]');
        if (c) {
          callNative({ type: 'writeCard', card: c.dataset.card, text: E.serialize(prepare(c.dataset.target).doc) }).then(function (r) {
            c.textContent = r === 'saved' ? 'Written' : r === 'other camera' ? 'Another camera’s card' : 'Not written';
            if (r === 'saved') savedChecks(c, c.dataset.target, 'Written to ' + c.textContent.replace(/^Written$/, 'the card'));
          });
        }
        var og = e.target.closest('[data-original]');
        if (og && st.bases[og.dataset.original]) { download(CARD_FILE, E.serialize(st.bases[og.dataset.original])).then(function (r) { if (r === 'saved') og.textContent = 'Saved'; }); return; }
        var s = e.target.closest('[data-start]');
        if (s) { remember(); st.doc.S.D124 = [+s.dataset.start]; E.syncLive(st.doc); save(); App.render(); again(); }
        var tg = e.target.closest('[data-cam]');
        if (tg) { toggleTarget(tg.dataset.cam); again(); }
      });
    });
  }
  // After a file is saved: what was checked, ticking in under the camera's row. Every line is true of the file just made:
  // made for the camera, every value one it takes (or a gray note for each change made to suit it), the profiles and
  // the start profile, then where it went (done). t is null for a zip's closing line.
  function savedChecks(btn, t, done) {
    var row = btn && btn.closest('.frow'), cell = row && row.querySelector('.fc'); if (!cell) return;
    var box = cell.querySelector('.checks'); if (!box) { box = document.createElement('div'); box.className = 'checks savechecks'; cell.appendChild(box); }
    var lines = [];
    if (t) {
      var r = prepare(t), ps = E.profiles(r.doc), start = r.doc.S.D124 && r.doc.S.D124[0];
      lines.push({ t: 'Made ' + CARD_FILE });  // the row already names its camera and says whether every setting fits
      if (E.check(r.doc).length) lines.push({ note: true, t: 'Some values the ' + t + ' can’t use stay as they were' });
      if (r.notes.length) lines.push({ note: true, t: W.count(r.notes.length, 'setting') + ' changed to suit the ' + t + ', listed above' });
      lines.push({ t: W.count(ps.length, 'profile') + (ps.length > 1 && ps.indexOf(start) >= 0 ? '; ' + String(E.profileName(r.doc, start)).toUpperCase() + ' is the default' : '') });
    }
    if (done) lines.push({ t: done });
    if (!t && box.childElementCount) { lines = [].map.call(box.querySelectorAll('.check'), function (c) { return { t: c.textContent, note: c.classList.contains('note') }; }).concat(lines); }
    Motion.checklist(box, lines);
  }
  // What a Save file button says after a save: every result the browser, claude.ai or the Mac app gives.
  function saveWords(r) {
    return r === 'saved' ? 'Saved' : r === 'declined' || r === 'cancelled' ? 'Save file' : r === 'unavailable' ? 'This page can’t save files here'
      : r === 'other camera' ? 'Another camera’s card' : 'Not saved';
  }
  var redrawSave = function () {};
  // A list of lines: the first three, then a Show N more tool that shows the rest in place and goes away (src/ui.js).
  function listHTML(lines, cls) { return App.linesHTML(lines, cls); }
  // A sheet is a form: rows of label, content and actions on one grid, so labels share one left edge, content another,
  // and every button the right edge (design-rules.md, rule 10). One red button per sheet: a camera's own button is red
  // only when it is the one way to save.
  function frow(label, content, actions) {
    return '<div class="frow"><div class="fl">' + label + '</div><div class="fc' + (actions ? '' : ' wide') + '">' + content + '</div>' + (actions ? '<div class="fa">' + actions + '</div>' : '') + '</div>';
  }
  function camRow(t, nat, q3, only) {
    var r = prepare(t), cards = nat ? cardsFor(t) : [];
    return frow(t + (nat && !cards.length ? App.info('Put this camera’s card in this Mac to write straight onto it.') : ''),
      r.notes.length ? listHTML(r.notes) : '<span class="faint">Every setting fits this camera</span>',
      cards.map(function (c, i) { return '<button class="btn' + (only && !i ? ' primary' : '') + '" data-card="' + esc(c.path) + '" data-target="' + esc(t) + '">Write to ' + esc(c.name) + '</button>'; }).join('') +
      '<button class="btn' + (only && !cards.length && !q3 ? ' primary' : '') + '" data-save="' + esc(t) + '">' + (zipSave() ? 'Save' : 'Save file') + '</button>');
  }
  // The words for each step, the same in every sheet, M and Q: keep a copy of the camera's own file, copy the new file
  // to the card, import it. cam: 'the camera' or 'the Q3'; file: settings.lcse or settings.lcs; menu: the last word of
  // the camera's menu items (Profiles, or Profile on the Q2).
  var KEPT = 'Original file saved in this browser';
  function stepWords(cam, file, menu) {
    var f = '<code>' + file + '</code>', path = 'User Profile › Manage Profiles › ';
    return {
      keep: 'Keep a copy of ' + cam + '’s own file. Importing it restores your settings.',
      export: 'On ' + cam + ', ' + path + 'Export ' + (menu || 'Profiles') + ', then copy that ' + f + ' to your computer.',
      copy: 'Copy ' + f + ' to the top of the card.',
      import: 'On ' + cam + ', ' + path + 'Import ' + (menu || 'Profiles') + '.',
      kept: KEPT
    };
  }
  // Before saving: a copy of each camera's own file, which restores its settings. A camera whose own file was opened here
  // has it already; the Mac app keeps one when it writes to a card.
  function firstRow(nat) {
    if (nat) return frow('First', '<span class="dim">Msetter keeps a copy of the card’s own file in Documents › Msetter › Backups.</span>');
    var need = st.targets.filter(function (t) { return !st.bases[t]; }), kept = st.targets.filter(function (t) { return st.bases[t]; });
    // a camera's own file opened here is kept in this browser; its button saves it back out, unchanged
    var originals = kept.map(function (t) { return '<button class="tool" data-original="' + esc(t) + '">' + App.TOOL.save + 'Save the original' + (kept.length > 1 ? ' for the ' + esc(t) : '') + '</button>'; }).join('');
    if (!need.length) return frow('First', '<span class="dim">' + KEPT + '</span>', originals);
    var w = stepWords('the camera', CARD_FILE);
    var keep = need.length < st.targets.length ? stepWords(listOf(need.map(function (t) { return 'the ' + t; })), CARD_FILE).keep : w.keep;
    return frow('First', '<div>' + esc(keep) + '</div><div class="dim">' + w.export + '</div>' +
      (kept.length ? '<div class="dim">' + esc(kept.join(' and ')) + ': ' + KEPT.charAt(0).toLowerCase() + KEPT.slice(1) + '</div>' : ''));
  }
  // After saving, in order: copy, import, check.
  function stepsHTML(nat) {
    var w = stepWords('the camera', CARD_FILE), file = '<code>' + CARD_FILE + '</code>', named = App.info('The camera reads only a file called ' + CARD_FILE + '. If your browser added a number to the name, rename it.');
    var steps = [
      inClaude() ? 'Rename ' + file + '.json to ' + file + ' and copy it to the top of the card.'
        : nat ? 'Write to the card, or save and copy ' + file + ' to the top of the card.'
        : zipSave() ? 'Unzip, and copy each camera’s ' + file + ' to the top of its card.' : w.copy + named,
      w.import,
      'Check a few settings.' + App.info('The camera skips a setting it can’t use and doesn’t say so.')
    ];
    return '<ol class="steps dim">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
  }
  function helpTool() { return '<a class="tool" href="' + W.HELP_URL + '" target="_blank" rel="noopener">If something goes wrong</a>';
  }
  // The sheet reads in the order things happen (design rule 10): what the file is for (cameras, the default profile),
  // what changes, the copy of the camera's own file, Save, then the steps on the card. Everything that changes the
  // file sits above the first Save. A design from a Q file leads with the Q, and its M rows show when asked for.
  function saveSheetHTML(showM) {
    var nat = !!nativeBridge(), q3 = App.q3First();  // q3: the design came from a Q3 file, so the Q3 leads
    var ps = profiles(), start = defaultProfile(), set = currentSet(), all = zipSave() && !q3 && st.targets.length > 0, none = !st.targets.length;
    var rows = st.targets.map(function (t) { return camRow(t, nat, q3, st.targets.length === 1); }).join('');
    // What the file does to the camera, in its terms: a starting set replaces what is on it; a camera's own file changes
    // only what you changed.
    var ch = changesSince(), ownFile = Object.keys(st.bases).length > 0, head = '', tip = '';
    if (set) {
      head = 'Your camera gets ' + set.name + (ch.length ? ', with these changes' : '');
      tip = App.info(ownFile ? 'Its user profiles become ' + set.name + '’s. Your camera’s other settings stay.'
        : 'This replaces every setting and user profile on your camera. To change only some, start from your camera’s own file.');
    }
    var changes = (head ? '<div class="fhead">' + esc(head) + tip + '</div>' : '') + (ch.length ? listHTML(ch) : '<span class="faint">None</span>');
    // no camera chosen yet: the sheet asks for one first, and the steps follow once there is one
    var mPart = none ? '' : firstRow(nat) + rows + (all ? frow('', '', '<button class="btn primary" data-save="all">Save all</button>') : '') + frow('Then', stepsHTML(nat), helpTool());
    var h = '<h2>Save</h2><div class="form">';
    var camsRow = frow('Cameras', '<span class="chips" role="group" aria-label="Cameras">' + App.chipsHTML(true) + '</span>' + (none ? '<div class="dim">Choose the cameras this file is for</div>' : ''));
    if (q3) h += App.q3Rows(true) + (showM ? (none ? camsRow : '') + mPart : frow('', '', '<button class="tool" data-mshow>Also save for an M</button>'));
    else {
      h += camsRow;
      if (ps.length > 1) h += frow('Default profile', '<span class="seg" role="group" aria-label="Default profile">' + ps.map(function (p) { return '<button data-start="' + p + '" aria-pressed="' + (p === start) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span>');
      h += frow('Changes', changes) + mPart + App.q3Rows(false);
    }
    return h + '</div><div class="row end"><button class="btn" data-close>Done</button></div>';
  }


  // What the camera would skip in an opened file (it imports such a file without a word): [profile, setting, value].
  function skipped(doc) {
    var ps = E.profiles(doc);
    return E.check(doc).filter(function (i) { return i.slot === 0 || ps.indexOf(i.slot) >= 0 || !E.rule(doc.model, i.code).p; }).map(function (i) {
      var who = E.rule(doc.model, i.code) && E.rule(doc.model, i.code).p ? (i.slot === 0 ? 'In use now' : String(E.profileName(doc, i.slot)).toUpperCase()) : 'Camera';
      var v = doc.S[i.code] && doc.S[i.code][i.slot];
      return [who, settingName(i.code), v !== undefined && typeof v !== 'object' ? short(i.code, v) : ''];
    });
  }
  function openText(text, name) {
    closeMenu(); closeSheets();
    if (Q3.cameraOf(text)) { App.q3Open(text, name); return; }  // a Q file: the Q3 experiment (src/q3page.js)
    var doc;
    try { doc = E.parse(text); } catch (e) {
      sheet('<h2>That file did not open</h2><p class="dim">' + esc(e && e.plain ? e.message : E.NOT_SETTINGS) + '</p><div class="row end"><button class="btn" data-close>OK</button></div>');
      return;
    }
    var from = null;
    if (MODELS.indexOf(doc.model) < 0) { from = doc.model; doc = E.translate(doc, 'M11').doc; }  // an M11-D file opens as an M11 file
    remember();
    var bad = skipped(doc), bases = Object.assign({}, st.bases);
    bases[doc.model] = E.clone(doc);
    var unmarked = '';
    if (!E.profiles(doc).length) {  // a file that marks no profile as saved: keep the ones it fills
      var filled = E.filledProfiles(doc);
      if (filled.length) { E.setProfiles(doc, filled); unmarked = ' The file marks no profile as saved, so Msetter keeps the ' + filled.length + ' it fills.'; }
      else D.addProfile(doc);
    }
    // A file comes from one camera, so the design is the file itself. Cameras you picked stay picked; on a page where
    // nobody has picked a camera yet, the file's camera is the one.
    var targets = st.camsPicked ? st.targets.filter(function (m) { return m !== doc.model; }).concat([doc.model]) : [doc.model];
    targets.sort(function (x, y) { return MODELS.indexOf(x) - MODELS.indexOf(y); });
    st.camsPicked = true;
    begin(doc, { from: 'you opened ' + name, bases: bases, targets: targets, theme: 'exposure' });
    save(); App.render();
    // The table fills in profile by profile; then what was checked ticks in, line by line.
    Motion.fill($('#main'));
    var ps = profiles(), start = doc.S.D124 && doc.S.D124[0];
    var lines = [{ t: 'Read ' + name + ' from the ' + (from || doc.model) }];
    if (from) lines.push({ note: true, t: 'Opened as an M11 file: the ' + from + ' can’t import settings files' });
    lines.push({ t: W.count(ps.length, 'profile') + (ps.indexOf(start) >= 0 && ps.length > 1 ? '; ' + pname(start) + ' is the default' : '') });
    if (unmarked) lines.push({ note: true, t: unmarked.trim() });
    lines.push(bad.length ? { note: true, t: W.count(bad.length, 'value') + ' the ' + doc.model + ' can’t use, listed' } : { t: 'Every value read, nothing skipped' });
    lines.push({ t: 'Original file saved in this browser' });
    App.receipt(lines);
    if (bad.length) {
      sheet('<h2>Values the ' + esc(doc.model) + ' can’t use</h2><p class="dim">Save changes each to the closest one it can.</p>' +
        '<table class="plain"><tr><th>Profile</th><th>Setting</th><th>In the file</th></tr>' + bad.slice(0, 40).map(function (r) { return '<tr><td>' + r.map(esc).join('</td><td>') + '</td></tr>'; }).join('') + '</table>' +
        (bad.length > 40 ? '<p class="dim">' + (bad.length - 40) + ' more</p>' : '') +
        '<div class="row end"><button class="btn" data-close>OK</button></div>');
    }
  }
  function readFile(f) { var r = new FileReader(); r.onload = function () { openText(String(r.result), f.name); }; r.readAsText(f); }

  // Which cameras the file is made for; menus offer what every one allows. The design stays on its camera while that
  // camera is picked, so adding another never changes it. The first camera tapped on a page nobody has picked cameras
  // on yet replaces the two it starts with. Before any change, moving says nothing.
  function toggleTarget(m) {
    var i = st.targets.indexOf(m);
    var quiet = !changesSince().length;
    remember();
    if (i >= 0) st.targets.splice(i, 1); else st.targets.push(m);  // a tap adds or removes that camera, whatever was picked before
    st.camsPicked = true;
    st.targets.sort(function (x, y) { return MODELS.indexOf(x) - MODELS.indexOf(y); });
    var prim = st.targets.indexOf(st.doc.model) >= 0 ? st.doc.model : primary(), swaps = [], lacks = '';
    if (prim !== st.doc.model) {
      var from = st.doc.model, set = currentSet();
      var opts = { base: st.bases[prim], set: set, parts: partsPicked(), origin: st.origin };
      // Profiles added since the start keep their values as they arrived (src/changes.js); those move the same way,
      // so a value nobody touched since stays unmarked on the new camera.
      var added = Object.keys(st.recs).filter(function (q) { return st.recs[q].at; }), arrived = null;
      if (added.length) {
        var then = E.clone(st.doc);
        added.forEach(function (q) { var at = st.recs[q].at; Object.keys(at).forEach(function (c) { if (then.S[c]) then.S[c][q] = E.clone(at[c]); }); });
        arrived = D.moveTo(then, prim, opts).doc;
      }
      var mv = D.moveTo(st.doc, prim, opts);
      st.doc = mv.doc; if (mv.origin) st.origin = mv.origin;
      if (arrived) {
        var recs = Object.assign({}, st.recs);
        added.forEach(function (q) { recs[q] = Object.assign({}, recs[q], { at: Changes.valuesOf(arrived, +q) }); });
        st.recs = recs; App.forget();
      }
      var ps = profiles();
      mv.notes.forEach(function (n) {
        if (rule(n.code).p ? ps.indexOf(n.slot) < 0 : n.slot !== 0) return;
        var row = n.kind === 'items' ? [n.code === 'D1A9' ? 'Favorites' : settingName(n.code), (n.lost.length ? 'loses ' + listNames(n.code, n.lost) : '') +
          (n.lost.length && n.gained.length ? ', ' : '') + (n.gained.length ? 'gains ' + listNames(n.code, n.gained) : '')] : [settingName(n.code), short(n.code, n.to)];
        if (!swaps.some(function (s) { return s[0] === row[0] && s[1] === row[1]; })) swaps.push(row);
      });
      mv.kept.forEach(function (code) { swaps.push([settingName(code), 'Kept for the ' + from]); });
    }
    save(); App.render();
    if (quiet || !swaps.length) return;
    // What the move changed, as a receipt that ticks in like opening a file: each setting by name, the first few, then
    // where the rest are. A notice offers Undo and nothing else (rule 4 of docs/state.md).
    var lines = [{ t: 'Made for the ' + prim }].concat(swaps.slice(0, 4).map(function (s) { return { note: true, t: s[0] + ': ' + s[1] }; }));
    if (swaps.length > 4) lines.push({ note: true, t: (swaps.length - 4) + ' more, listed in Save' });
    if (st.targets.length) App.receipt(lines, 'undo');  // no camera chosen: the file is for none yet, so nothing to tell
  }

  Object.assign(App, { prepare: prepare, fileFor: fileFor, saveSheet: saveSheet, stepWords: stepWords, nativeBridge: nativeBridge, download: download, redrawSave: function () { redrawSave(); },
    nativeReply: nativeReply, openText: openText, readFile: readFile, toggleTarget: toggleTarget });
})(window.App = window.App || {});
