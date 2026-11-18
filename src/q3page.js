// The Q3 and Q3 43 on the page, as an experiment. The design stays an M design. A Q3 file is the owner's own export
// with the settings both cameras share written into it (src/q3.js). Here: the Q3 chips and the sheet behind them, the
// owner's file kept in the browser, the Q3 rows of the Save sheet, and the comparison after a new export, with a
// report to send. Hidden in the Mac app and on claude.ai, which save only .lcse files.
(function (App) {
  'use strict';
  var E = Engine, W = Words;
  var esc = App.esc, notice = App.notice, sheet = App.sheet, closeSheets = App.closeSheets, closeMenu = App.closeMenu,
    st = App.st, profiles = App.profiles, pname = App.pname, remember = App.remember, save = App.save, begin = App.begin,
    changesSince = App.changesSince;
  var short = W.short, settingName = W.settingName, count = W.count;
  var STORE = 'msetter-q3-v1';
  // Per Q model: { text, name, at, saved: { text, changes: [{ code, slot, p, to }], at } }. Kept outside the design and
  // its Undo: the owner's file is not part of the design.
  var held = {};
  try { held = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { held = {}; }
  function store() { try { localStorage.setItem(STORE, JSON.stringify(held)); } catch (e) { /* storage may be off */ } }

  function offered() { return !App.nativeBridge() && !(window.claude && window.claude.use); }
  function chipsHTML() {
    if (!offered()) return '';
    return Q3.MODELS.map(function (m) { return '<button class="chip" data-qcam="' + m + '" aria-pressed="' + !!held[m] + '" title="Experimental">' + m + '</button>'; }).join('');
  }
  function paintChips() { document.querySelectorAll('[data-qcam]').forEach(function (b) { b.setAttribute('aria-pressed', !!held[b.dataset.qcam]); }); }

  // ---------- the sheet behind a Q3 chip ----------
  function introHTML(m) {
    return '<h2>' + m + ' (experimental)</h2>' +
      '<p class="dim">Change some of your ' + m + '’s settings here, then save them as a file the camera can import. You can change the names of your user profiles, the slowest shutter speed and highest ISO that Auto ISO may use, white balance, the file format (DNG, JPG or both), copyright, and what the screen shows: grid, histogram, level gauge, clipping and focus peaking. Autofocus, buttons, Looks and video stay as they are.</p>' +
      '<p class="dim">This is a test. Leica doesn’t publish how the Q3 stores its settings, so Msetter knows them from other owners’ files and from Leica’s manual. No file saved by Msetter has been imported on a Q3 yet. The camera may skip some of your changes or refuse the file.</p>' +
      '<ol class="dim steps">' +
        '<li>On the ' + m + ', choose Menu › User Profile › Manage Profiles › Export Profiles. The camera saves a file called settings.lcs on the card.</li>' +
        '<li>Copy settings.lcs to your computer and keep this copy. Importing it again puts all your settings back.</li>' +
        '<li>Open settings.lcs here, make your changes and press Save.</li>' +
        '<li>Copy the new settings.lcs to the card and choose Import Profiles on the camera.</li>' +
        '<li>Export again and open that file here. Msetter lists which of your changes the camera kept. Send opens the list as a GitHub issue for you to post, so other Q3 owners can see what works.</li>' +
      '</ol>' +
      '<p class="dim">You can also help without saving anything: export, change one setting in the camera’s menu, export again, and open both files here. Msetter shows which part of the file changed. That shows how the Q3 stores the setting, and Send shares it.</p>' +
      '<div class="row end"><button class="btn" data-close>Cancel</button><button class="btn primary" data-qopen>Open settings.lcs</button></div>';
  }
  function fromHere(m) { return !!(st.origin && st.origin.q3 === m); }
  function heldHTML(m, lead) {
    var h = held[m], f = Q3.read(h.text), why = Q3.writable(h.text);
    var mode = fromHere(m) ? 'The profiles here now come from this file. Change what you want and press Save. Msetter writes only your changes into a copy of this file.'
      : 'Your profiles here stay as they are. Save writes the settings you changed from factory into a copy of this file, in the same profile numbers. The rest of the file stays as the camera wrote it.';
    return '<h2>' + m + ' (experimental)</h2>' +
      '<p class="dim">' + esc((lead || 'Your file: ' + h.name + ', opened ' + new Date(h.at).toLocaleDateString()) + ', ' + f.codes.length + ' settings.') + '</p>' +
      (why ? '<p class="dim">' + esc(why) + '</p>' : '<p class="dim">' + mode + '</p>') +
      (why || fromHere(m) ? '' : '<p class="small dim">Use this file’s settings replaces the profiles here with the ones in the file. Undo brings yours back.</p>') +
      '<p class="small dim">Open another export from this ' + m + ' to see every setting that differs between the two files.</p>' +
      '<div class="row end"><button class="btn" data-qremove>Remove</button>' + (why || fromHere(m) ? '' : '<button class="btn" data-quse>Use this file’s settings</button>') +
      '<button class="btn" data-qopen>Open another export</button><button class="btn primary" data-close>Done</button></div>';
  }
  function q3Sheet(m, lead) {
    closeMenu(); closeSheets();
    sheet(held[m] ? heldHTML(m, lead) : introHTML(m), function (el, close) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-qopen]')) { close(true); document.getElementById('file').click(); }
        else if (e.target.closest('[data-quse]')) { close(true); useFile(m); }
        else if (e.target.closest('[data-qremove]')) { delete held[m]; store(); close(); notice('The ' + m + ' file is removed', 'none'); }
      });
    });
  }
  // The design from the Q3 file: an Undo step, like opening a file from an M.
  function useFile(m, quiet) {
    remember();
    var r = Q3.designFrom(held[m].text, st.doc.model);
    begin(r.doc, { from: 'you opened your ' + m + ' file', theme: 'exposure' });
    st.origin.q3 = m;
    save(); App.render();
    if (!quiet) notice('The design shows your ' + m + '’s profiles');
  }
  // A design nobody has worked on yet takes the Q3 file's settings when it opens.
  function untouched() { return st.setId === 'factory' && !changesSince().length && !Object.keys(st.bases || {}).length && !(st.origin && st.origin.q3); }

  // ---------- opening a Q3 file ----------
  function open(text, name) {
    closeMenu(); closeSheets();
    var f;
    try { f = Q3.read(text); } catch (e) {
      sheet('<h2>That file did not open</h2><p class="dim">' + esc(e && e.plain ? e.message : E.NOT_SETTINGS) + '</p><div class="row end"><button class="btn primary" data-close>OK</button></div>');
      return;
    }
    var m = f.model, prev = held[m];
    var base = !prev ? null : prev.saved && prev.saved.at > prev.at ? { saved: prev.saved } : { text: prev.text, name: prev.name };
    held[m] = { text: text, name: name, at: Date.now(), saved: prev && prev.saved };
    store();
    if (!base) {
      if (untouched() && !Q3.writable(text)) useFile(m, true);
      App.render(); q3Sheet(m, 'Opened ' + name);
      return;
    }
    App.render(); compareSheet(m, base, text);
  }

  // ---------- what changed between two files ----------
  function where(slot) { return slot === null ? 'List' : slot === 'all' ? 'Camera' : slot === 0 ? 'Live settings' : 'Profile ' + slot; }
  // A value in words where Msetter knows the setting, with the file's own number after it.
  function val(v, code) {
    if (v === undefined) return 'nothing';
    if (typeof v === 'string') return '“' + v + '”';
    if (Array.isArray(v)) return v.join(' ');
    var e = Q3.ENTRIES.filter(function (x) { return x.q === code && !x.name; })[0], w = e && qWords(e, v);
    return w && w !== String(v) ? w + ' (' + v + ')' : String(v);
  }
  function compareSheet(m, base, text) {
    var f = Q3.read(text), res, intro, rows = [];
    if (base.saved) {
      res = { check: Q3.check(base.saved, text) };
      var n = res.check.rows.length, kept = res.check.rows.filter(function (r) { return r.kept; }).length;
      intro = n ? 'Msetter wrote ' + count(n, 'setting') + ' into the file it saved. This export has ' + kept + ' of them as sent.' : 'The file Msetter saved changed nothing.';
      if (n && !kept) intro += ' The camera may have refused the file, or this export was made before the import.';
      rows = res.check.rows.slice().sort(function (a, b) { return a.kept - b.kept; }).map(function (r) {
        return where(r.slot) + ' · ' + Q3.nameOf(r.code) + ' (' + r.code + '): sent ' + val(r.sent, r.code) + ', back ' + val(r.back, r.code) + '. ' + (r.kept ? 'Kept.' : 'Not kept.');
      });
      if (res.check.other.length) rows.push('Other differences: ' + res.check.other.length);
      rows = rows.concat(res.check.other.map(line));
    } else {
      res = { diffs: Q3.compare(base.text, text) };
      intro = res.diffs.length ? count(res.diffs.length, 'difference') + ' between ' + base.name + ' you opened before and this one.' : 'The two files are the same.';
      rows = res.diffs.map(line);
    }
    function line(d) { return where(d.slot) + ' · ' + Q3.nameOf(d.code) + ' (' + d.code + '): ' + val(d.a, d.code) + ' to ' + val(d.b, d.code); }
    var fw = ['', '4.1.1', '4.1.0', '4.0', 'Before 4'];
    sheet('<h2>What changed</h2><p class="dim">' + esc(intro) + '</p>' +
      (rows.length ? '<div class="list">' + rows.slice(0, 40).map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>' +
        (rows.length > 40 ? '<p class="small dim">And ' + (rows.length - 40) + ' more, all in the report.</p>' : '') : '') +
      '<div class="row"><span class="dim">What you changed</span><input class="qfield" data-qdid placeholder="Such as Thumbwheel in S set to ISO"></div>' +
      '<div class="row"><span class="dim">Firmware</span><select class="qfield" data-qfw>' + fw.map(function (v) { return '<option value="' + v + '">' + (v || 'Not sure') + '</option>'; }).join('') + '</select></div>' +
      '<p class="small dim">Send opens a new GitHub issue in another tab with this report filled in: setting codes and numbers, without profile names or copyright text. You see it before posting, and issues are public. Copy report gives the same text for anyone without a GitHub account.</p>' +
      '<div class="row end"><button class="btn" data-close>Done</button><button class="btn" data-qcopy>Copy report</button><button class="btn primary" data-qsend>Send on GitHub</button></div>',
    function (el) {
      var text0 = function () {
        return Q3.report({ camera: f.camera, codes: f.codes.length, firmware: el.querySelector('[data-qfw]').value, did: el.querySelector('[data-qdid]').value.trim(), check: res.check, diffs: res.diffs });
      };
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-qcopy], [data-qsend]'); if (!b) return;
        var body = text0();
        if (b.hasAttribute('data-qcopy')) { copy(body).then(function (ok) { b.textContent = ok ? 'Copied' : 'Could not copy'; }); return; }
        var did = el.querySelector('[data-qdid]').value.trim();
        var title = m + (res.check ? ' import check' : ' two exports') + (did ? ': ' + did.slice(0, 80) : '');
        var url = Q3.issueUrl(title, body);
        if (url) { window.open(url, '_blank', 'noopener'); return; }
        copy(body).then(function () { window.open(Q3.blankIssueUrl(title), '_blank', 'noopener'); notice('The report is too long for a link, so it is copied: paste it into the issue', 'none'); });
      });
    });
  }
  function copy(text) {
    var fallback = function () {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.remove(); return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
  }

  // ---------- saving ----------
  // The design's values are compared with the design as it came from this file, or else with the M's factory settings.
  function mergeFor(m) {
    var base = st.origin && st.origin.q3 ? st.origin.S : E.blank(st.doc.model).S;
    return Q3.merge(held[m].text, st.doc, base);
  }
  function qWords(e, v) {
    if (e.qWords && e.qWords[v] !== undefined) return e.qWords[v];
    if (e.text) return v;
    if (e.qValue) return short(e.m, v);
    var k = e.fromQ(v);
    if (k === undefined) return String(v);
    return e.grid ? (k ? short(e.q, k) : 'Off') : short(e.m, k);
  }
  function whatOf(e) { return e.name ? 'Profile name' : e.grid ? settingName(e.on) : settingName(e.m); }
  function noteLines(r) {
    var many = profiles().length > 1;
    var out = r.changes.map(function (c) { return (many && !c.entry.name ? pname(c.p) + ': ' : '') + whatOf(c.entry) + ' ' + qWords(c.entry, c.from) + ' to ' + qWords(c.entry, c.to); });
    r.skipped.forEach(function (s) {
      var e = s.entry, t = s.why === 'none' ? whatOf(e) + ' ' + (e.grid ? (s.k ? short(e.q, s.k) : 'Off') : e.text ? s.k : short(e.m, s.k)) + ' isn’t on the Q3'
        : s.why === 'unset' ? 'the ' + pname(s.p) + ' profile on the Q3 doesn’t keep ' + whatOf(e).toLowerCase() : 'this file has no ' + whatOf(e).toLowerCase();
      out.push((many && s.why === 'none' && !e.name ? pname(s.p) + ': ' : '') + t.charAt(0).toUpperCase() + t.slice(1));
    });
    return out;
  }
  // The Q3 rows of the Save sheet, one for each Q3 file opened.
  function saveRows() {
    if (!offered()) return '';
    return Q3.MODELS.filter(function (m) { return held[m]; }).map(function (m) {
      var why = Q3.writable(held[m].text), text;
      if (why) text = why;
      else {
        var r = mergeFor(m), lines = noteLines(r);
        text = (r.changes.length ? count(r.changes.length, 'change') + ' to your file. ' : 'No changes to your file. ') +
          (lines.length ? lines.slice(0, 5).join('. ') + '.' + (lines.length > 5 ? ' And ' + (lines.length - 5) + ' more.' : '') : '') +
          ' Copy settings.lcs to the top level of the card and import it. Keep your own export. Then export again and open the new file here to see what the camera kept.';
      }
      return '<div><div class="grow1"><div>' + m + ' (experimental)</div><div class="small dim">' + esc(text) + '</div></div>' +
        (why ? '' : '<button class="btn" data-qsave="' + m + '">Save file</button>') + '</div>';
    }).join('');
  }
  function saveFile(m, b) {
    var r = mergeFor(m);
    App.download('settings.lcs', r.text).then(function (res) {
      if (res !== 'saved') { b.textContent = 'Save file'; return; }
      held[m].saved = { text: r.text, at: Date.now(), changes: r.changes.map(function (c) { return { code: c.code, slot: c.slot, p: c.p, to: c.to }; }) };
      store(); b.textContent = 'Saved';
    });
  }
  // For Save all: a folder for each Q3 file that can be written.
  function zipFiles() {
    if (!offered()) return [];
    return Q3.MODELS.filter(function (m) { return held[m] && !Q3.writable(held[m].text); }).map(function (m) {
      var r = mergeFor(m);
      held[m].saved = { text: r.text, at: Date.now(), changes: r.changes.map(function (c) { return { code: c.code, slot: c.slot, p: c.p, to: c.to }; }) };
      store();
      return { name: m + '/settings.lcs', text: r.text };
    });
  }

  // A Q3 chip anywhere on the page (file panel, starting page, Save sheet) opens its sheet.
  document.addEventListener('click', function (e) { var q = e.target.closest('[data-qcam]'); if (q) q3Sheet(q.dataset.qcam); });

  Object.assign(App, { q3ChipsHTML: chipsHTML, q3PaintChips: paintChips, q3Open: open, q3Rows: saveRows, q3Save: saveFile, q3Zip: zipFiles });
})(window.App = window.App || {});
