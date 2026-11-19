// Saving and opening: the file for each camera and its notes, the Save sheet, downloads, the Mac app's
// save panel and cards, opening a file, and moving the design to another camera.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, D = Design, W = Words;
  var short = W.short, settingName = W.settingName, listOf = W.listOf;
  var esc = App.esc, keepFocus = App.keepFocus, notice = App.notice, closeMenu = App.closeMenu, sheet = App.sheet,
    closeSheets = App.closeSheets, MODELS = App.MODELS, st = App.st, primary = App.primary, rule = App.rule,
    profiles = App.profiles, pname = App.pname, remember = App.remember, save = App.save, begin = App.begin,
    changesSince = App.changesSince, partsPicked = App.partsPicked;

  function currentSet() { return st.setId ? SETS.filter(function (s) { return s.id === st.setId; })[0] : null; }
  // The file Save writes for one camera, and what it changes on the way, in words.
  // The starting point counts when the design follows a starting set or part sets, so a value changed since is kept.
  function forCamera(target) {
    var set = currentSet(), parts = partsPicked();
    return D.forCamera(st.doc, target, { base: st.bases[target], set: set, parts: parts, origin: (set || parts.length) ? st.origin : undefined, start: st.origin });
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
  // The Save sheet. Picking cameras or the start profile in it draws it again in place.
  // A camera's own export names no start profile (0), so after it imports, the settings in use stay the old ones until
  // a profile is picked on the camera. Once something has changed, Save starts the camera in the first profile.
  function saveSheet() {
    if (document.querySelector('.veil')) return;  // one sheet at a time
    var ps = profiles();
    if (ps.indexOf(st.doc.S.D124[0]) < 0 && changesSince().length) { remember(); st.doc.S.D124 = [ps[0]]; E.syncLive(st.doc); save(); }
    sheet(saveSheetHTML(), function (el) {
      var again = function () { keepFocus(el, function () { el.innerHTML = saveSheetHTML(); }); };
      redrawSave = function () { if (el.isConnected) again(); };  // cards mounted while it is open (Mac app)
      el.addEventListener('click', function (e) {
        var qs = e.target.closest('[data-qsave]'); if (qs) { App.q3Save(qs.dataset.qsave, qs); return; }
        var b = e.target.closest('[data-save]');
        if (b) {
          var t = b.dataset.save;
          if (t === 'all' || zipSave()) {  // a folder for each camera, in one zip
            var ts = t === 'all' ? st.targets : [t];
            var files = ts.map(function (m) { return { name: m + '/' + CARD_FILE, text: E.serialize(prepare(m).doc) }; });
            downloadBlob(t === 'all' ? 'Msetter settings.zip' : t + '.zip', new Blob([Zip.bytes(files)], { type: 'application/zip' }));
            b.textContent = 'Saved'; return;
          }
          download(CARD_FILE, E.serialize(prepare(t).doc)).then(function (r) {
            b.textContent = saveWords(r);
          });
        }
        var c = e.target.closest('[data-card]');
        if (c) {
          callNative({ type: 'writeCard', card: c.dataset.card, text: E.serialize(prepare(c.dataset.target).doc) }).then(function (r) {
            c.textContent = r === 'saved' ? 'Written' : r === 'other camera' ? 'Another camera’s card' : 'Not written';
          });
        }
        var s = e.target.closest('[data-start]');
        if (s) { remember(); st.doc.S.D124 = [+s.dataset.start]; E.syncLive(st.doc); save(); App.render(); again(); }
        var tg = e.target.closest('[data-cam]');
        if (tg) { toggleTarget(tg.dataset.cam); again(); }
      });
    });
  }
  // What a Save file button says after a save: every result the browser, claude.ai or the Mac app gives.
  function saveWords(r) {
    return r === 'saved' ? 'Saved' : r === 'declined' || r === 'cancelled' ? 'Save file' : r === 'unavailable' ? 'This page can’t save files here'
      : r === 'other camera' ? 'Another camera’s card' : 'Not saved';
  }
  var redrawSave = function () {};
  // A short list, the rest behind "N more".
  function listHTML(lines, cls) {
    var li = function (x) { return '<li>' + esc(x) + '</li>'; };
    return '<ul class="notes ' + (cls || 'small dim') + '">' + lines.slice(0, 3).map(li).join('') +
      (lines.length > 3 ? '<li><details><summary>' + (lines.length - 3) + ' more</summary><ul class="notes">' + lines.slice(3).map(li).join('') + '</ul></details></li>' : '') + '</ul>';
  }
  function camRow(t, nat, q3) {
    var r = prepare(t), cards = nat ? cardsFor(t) : [];
    return '<div><div class="grow1"><div>' + t + (nat && !cards.length ? App.info('Put this camera’s card in this Mac to write straight onto it.') : '') + '</div>' +
      (r.notes.length ? listHTML(r.notes) : '<div class="small faint">Every setting fits this camera.</div>') + '</div>' +
      cards.map(function (c) { return '<button class="btn primary" data-card="' + esc(c.path) + '" data-target="' + esc(t) + '">Write to ' + esc(c.name) + '</button>'; }).join('') +
      '<button class="btn' + (cards.length || q3 ? '' : ' primary') + '" data-save="' + esc(t) + '">' + (zipSave() ? 'Save zip' : 'Save file') + '</button></div>';
  }
  // After saving, in order: keep the camera's own file, copy, import, check.
  function stepsHTML(nat) {
    var file = '<code>' + CARD_FILE + '</code>', named = App.info('The camera reads only a file called ' + CARD_FILE + '. If your browser added a number to the name, rename it.');
    var steps = [
      nat ? 'Msetter keeps a copy of the card’s own file in Documents › Msetter › Backups.' : 'On the camera, User Profile › Manage Profiles › Export Profiles. Copy that ' + file + ' to your computer.',
      inClaude() ? 'Rename ' + file + '.json to ' + file + ' and copy it to the top of the card.'
        : nat ? 'Write to the card, or save and copy ' + file + ' to the top of the card.'
        : zipSave() ? 'Unzip, and copy each camera’s ' + file + ' to the top of its card.' : 'Copy ' + file + ' to the top of the card.' + named,
      'On the camera, User Profile › Manage Profiles › Import Profiles.',
      'Check a few settings.' + App.info('The camera skips a setting it can’t use, without a message.')
    ];
    return '<ol class="steps small dim">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
  }
  function saveSheetHTML() {
    var nat = !!nativeBridge(), q3 = App.q3First();  // q3: the design came from a Q3 file, so the Q3 leads
    var rows = st.targets.map(function (t) { return camRow(t, nat, q3); }).join('');
    var ps = profiles(), start = st.doc.S.D124[0], set = currentSet();
    var pickCams = '<div class="row"><span class="dim">Cameras</span><span class="chips">' + App.chipsHTML(true) + '</span></div>';
    var ch = changesSince(), since = st.origin && st.origin.from ? st.origin.from : 'you started';
    var head = set ? 'from ' + set.name : 'since ' + since;
    var own = set && !Object.keys(st.bases).length && !q3 ? App.info('Settings you don’t change are ' + set.name + '’s, not your camera’s. To keep your camera’s own, open its file first.') : '';
    var chHTML = '<div class="small dim">' + (ch.length ? 'Changes ' + esc(head) + own + listHTML(ch) : 'No changes ' + esc(head) + own) + '</div>';
    var allBtn = zipSave() && !q3 ? '<div class="row end"><button class="btn primary" data-save="all">Save all</button></div>' : '';
    var qRows = App.q3Rows(q3), mPart = '<div class="list">' + rows + '</div>' + allBtn;
    return '<h2>Save</h2>' + pickCams + chHTML +
      (q3 ? '<div class="list">' + qRows + '</div><details class="small dim"><summary>Also save for an M</summary>' + mPart + '</details>'
        : mPart + stepsHTML(nat) + (qRows ? '<div class="list">' + qRows + '</div>' : '')) +
      (ps.length < 2 || q3 ? '' : '<div class="row"><span class="dim">Camera starts in</span><span class="seg">' + ps.map(function (p) { return '<button data-start="' + p + '" aria-pressed="' + (p === start) + '">' + esc(pname(p)) + '</button>'; }).join('') + '</span></div>') +
      '<div class="row end"><button class="btn" data-close>Done</button></div>';
  }

  // What the camera would skip in an opened file (it imports such a file without a word): [profile, setting, value].
  function skipped(doc) {
    var ps = E.profiles(doc);
    return E.check(doc).filter(function (i) { return i.slot === 0 || ps.indexOf(i.slot) >= 0 || !E.rule(doc.model, i.code).p; }).map(function (i) {
      var who = E.rule(doc.model, i.code) && E.rule(doc.model, i.code).p ? (i.slot === 0 ? 'In use now' : E.profileName(doc, i.slot)) : 'Camera';
      var v = doc.S[i.code] && doc.S[i.code][i.slot];
      return [who, settingName(i.code), v !== undefined && typeof v !== 'object' ? short(i.code, v) : ''];
    });
  }
  function openText(text, name) {
    closeMenu(); closeSheets();
    if (Q3.cameraOf(text)) { App.q3Open(text, name); return; }  // a Q file: the Q3 experiment (src/q3page.js)
    var doc;
    try { doc = E.parse(text); } catch (e) {
      sheet('<h2>That file did not open</h2><p class="dim">' + esc(e && e.plain ? e.message : E.NOT_SETTINGS) + '</p><div class="row end"><button class="btn primary" data-close>OK</button></div>');
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
    notice(from ? 'Opened ' + name + ' as an M11 file: the ' + from + ' can’t import settings files' : 'Opened ' + name + ' from the ' + doc.model + ', ' + W.count(profiles().length, 'profile') + '.' + unmarked);
    if (bad.length) {
      sheet('<h2>Values the ' + esc(doc.model) + ' can’t use</h2><p class="dim">Save changes each to the closest one it can.</p>' +
        '<table class="plain"><tr><th>Profile</th><th>Setting</th><th>In the file</th></tr>' + bad.slice(0, 40).map(function (r) { return '<tr><td>' + r.map(esc).join('</td><td>') + '</td></tr>'; }).join('') + '</table>' +
        (bad.length > 40 ? '<p class="small dim">' + (bad.length - 40) + ' more</p>' : '') +
        '<div class="row end"><button class="btn primary" data-close>OK</button></div>');
    }
  }
  function readFile(f) { var r = new FileReader(); r.onload = function () { openText(String(r.result), f.name); }; r.readAsText(f); }

  // Which cameras the file is made for; menus offer what every one allows. The design stays on its camera while that
  // camera is picked, so adding another never changes it. The first camera tapped on a page nobody has picked cameras
  // on yet replaces the two it starts with. Before any change, moving says nothing.
  function toggleTarget(m) {
    var i = st.targets.indexOf(m);
    if (i >= 0 && st.targets.length === 1) { notice('Pick at least one camera', 'none'); return; }
    var quiet = !changesSince().length;
    remember();
    if (!st.camsPicked) st.targets = [m];
    else if (i >= 0) st.targets.splice(i, 1); else st.targets.push(m);
    st.camsPicked = true;
    st.targets.sort(function (x, y) { return MODELS.indexOf(x) - MODELS.indexOf(y); });
    var prim = st.targets.indexOf(st.doc.model) >= 0 ? st.doc.model : primary(), swaps = [], lacks = '';
    if (prim !== st.doc.model) {
      var from = st.doc.model, set = currentSet();
      var mv = D.moveTo(st.doc, prim, { base: st.bases[prim], set: set, parts: partsPicked(), origin: st.origin });
      st.doc = mv.doc; if (mv.origin) st.origin = mv.origin;
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
    if (swaps.length === 1) { notice('To suit the ' + prim + ': ' + swaps[0][0] + ' ' + swaps[0][1]); return; }
    notice('To suit the ' + prim + ': ' + W.count(swaps.length, 'setting') + ' changed', { label: 'Show', act: function () {
      sheet('<h2>To suit the ' + esc(prim) + '</h2><table class="plain">' + swaps.map(function (s) { return '<tr><td>' + esc(s[0]) + '</td><td>' + esc(s[1]) + '</td></tr>'; }).join('') + '</table>' +
        '<div class="row end"><button class="btn" data-undo-cams>Undo</button><button class="btn primary" data-close>OK</button></div>', function (el, close) {
        el.addEventListener('click', function (e) { if (e.target.closest('[data-undo-cams]')) { close(true); App.undo(); } });
      });
    } });
  }

  Object.assign(App, { prepare: prepare, fileFor: fileFor, saveSheet: saveSheet, nativeBridge: nativeBridge, download: download, redrawSave: function () { redrawSave(); },
    nativeReply: nativeReply, openText: openText, readFile: readFile, toggleTarget: toggleTarget });
})(window.App = window.App || {});
