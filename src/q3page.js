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
      '<p class="dim">Change your profile names, shutter speed and ISO limits, white balance, file format, copyright and screen display, then save a file your ' + m + ' imports.</p>' +
      '<p class="dim">This is a test. No file from Msetter has been imported on a Q3 yet, so the camera may skip changes or refuse the file.</p>' +
      '<ol class="dim steps">' +
        '<li>Export from the ' + m + ' (User Profile › Manage Profiles › Export Profiles) and keep a copy, so you can restore your settings.</li>' +
        '<li>Open the file here, make changes and save.</li>' +
        '<li>Import the new file on the ' + m + '.</li>' +
        '<li>Export again and open it here to see what the camera kept. Then email the result.</li>' +
      '</ol>' +
      '<p class="small dim">Or export, change one menu setting, export again, and open both files here.</p>' +
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
  // On screen everything is in words: the setting's name, the profile's own name, values Msetter can name.
  // The codes and numbers go only into the report.
  function entryFor(code, p) { return Q3.ENTRIES.filter(function (x) { return x.q === code && (x.name ? x.name === p : true); })[0]; }
  // A setting's name in words, or null when Msetter doesn't know it well enough to name it.
  function plainName(code, p) {
    var e = entryFor(code, p); if (e) return whatOf(e);
    var n = Q3CODES[code]; if (!n || (n[1] !== 'known' && n[1] !== 'likely') || /\?/.test(n[0])) return null;
    var name = n[0].replace(/\s*\((photo|video)\)/, function (x, k) { return k === 'video' ? ' for video' : ''; }).replace(/\s*\([^)]*\)/g, '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  function profileWords(f, slot) {
    if (slot === 0) return 'current settings';
    if (typeof slot !== 'number') return '';
    var c = E.NAME_CODES[slot - 1]; return f.S[c] ? f.S[c][0] : 'profile ' + slot;
  }
  function valueWords(code, p, v) { var e = entryFor(code, p); return e && v !== undefined ? qWords(e, v) : null; }
  function andList(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function rowHTML(cls, what, where, detail, state) {
    return '<div class="qrow ' + cls + '"><div><span class="what">' + esc(what) + '</span>' + (where ? '<span class="where"> · ' + esc(where) + '</span>' : '') +
      (detail ? '<span class="detail">' + esc(detail) + '</span>' : '') + '</div>' + (state ? '<span class="state">' + esc(state) + '</span>' : '') + '</div>';
  }
  // Differences grouped by setting: one row for each, naming the profiles it changed in.
  function diffRows(f, diffs) {
    var groups = [], unknown = 0;
    diffs.forEach(function (d) {
      var name = plainName(d.code, d.slot);
      if (!name) { unknown++; return; }
      var g = groups.filter(function (x) { return x.code === d.code; })[0];
      if (!g) { g = { code: d.code, name: name, slots: [], ds: [] }; groups.push(g); }
      g.slots.push(d.slot); g.ds.push(d);
    });
    return { unknown: unknown, groups: groups.map(function (g) {
      var a = valueWords(g.code, g.slots[0], g.ds[0].a), b = valueWords(g.code, g.slots[0], g.ds[0].b);
      var same = g.ds.every(function (d) { return Q3.shown(d.a) === Q3.shown(g.ds[0].a) && Q3.shown(d.b) === Q3.shown(g.ds[0].b); });
      return { name: g.name, where: andList(g.slots.map(function (s) { return profileWords(f, s); }).filter(Boolean)), detail: same && a && b ? 'From ' + a + ' to ' + b : '' };
    }) };
  }
  function compareSheet(m, base, text) {
    var f = Q3.read(text), res, title, lead, rows = '', also = '';
    if (base.saved) {
      res = { check: Q3.check(base.saved, text) };
      var all = res.check.rows, kept = all.filter(function (r) { return r.kept; }).length;
      title = 'What your ' + m + ' kept';
      lead = !all.length ? 'The file you saved changed nothing.' : kept === all.length ? 'The camera kept all your changes.' :
        !kept ? 'The camera kept none of your changes. It may have refused the file, or this export was made before you imported it.' :
        'The camera kept ' + kept + ' of your ' + all.length + ' changes.';
      rows = all.slice().sort(function (a, b) { return a.kept - b.kept; }).map(function (r) {
        var sent = valueWords(r.code, r.p, r.sent), back = r.back === undefined ? 'nothing' : valueWords(r.code, r.p, r.back);
        return rowHTML(r.kept ? 'kept' : 'lost', plainName(r.code, r.p) || 'A setting', profileWords(f, r.p),
          r.kept ? '' : 'You saved ' + sent + '. The camera has ' + back + '.', r.kept ? 'Kept' : 'Not kept');
      }).join('');
      var other = diffRows(f, res.check.other), names = other.groups.map(function (g) { return g.name.charAt(0).toLowerCase() + g.name.slice(1); });
      if (other.unknown) names.push(count(other.unknown, 'setting') + ' Msetter can’t name yet');
      if (names.length) also = 'Also different on the camera: ' + andList(names) + '.';
    } else {
      res = { diffs: Q3.compare(base.text, text) };
      var d = diffRows(f, res.diffs);
      title = 'What changed';
      lead = !res.diffs.length ? 'The two files are the same.' : 'Between your two files, ' + (d.groups.length + d.unknown === 1 ? 'one setting changed.' : count(d.groups.length + d.unknown, 'setting') + ' changed.');
      rows = d.groups.map(function (g) { return rowHTML('', g.name, g.where, g.detail, ''); }).join('');
      if (d.unknown) rows += rowHTML('', d.unknown === 1 ? 'A setting Msetter can’t name yet' : d.unknown + ' settings Msetter can’t name yet', '', 'Sending this report helps name it.', '');
    }
    var fw = ['', '4.1.1', '4.1.0', '4.0', 'Older'];
    sheet('<h2>' + esc(title) + '</h2><p class="qlead">' + esc(lead) + '</p>' +
      (rows ? '<div class="qrows">' + rows + '</div>' : '') + (also ? '<p class="small dim">' + esc(also) + '</p>' : '') +
      '<label class="qask"><span>' + (res.check ? 'Anything to add?' : 'What did you change on the camera?') + '</span>' +
        '<input class="qfield" data-qdid placeholder="' + (res.check ? 'Optional' : 'For example: thumbwheel in S set to ISO') + '"></label>' +
      '<label class="qask"><span>Firmware (Menu › Camera Information)</span><select class="qfield" data-qfw>' + fw.map(function (v) { return '<option value="' + v + '">' + (v || 'I don’t know') + '</option>'; }).join('') + '</select></label>' +
      '<p class="small dim">Email opens a message to ' + Q3.REPORTS + ' with the report. GitHub posts it as a public issue instead. The report has no names or copyright text.</p>' +
      '<div class="row end"><button class="btn" data-close>Done</button><button class="btn" data-qsend>GitHub</button><button class="btn primary" data-qmail>Email</button></div>',
    function (el) {
      var text0 = function () {
        return Q3.report({ camera: f.camera, codes: f.codes.length, firmware: el.querySelector('[data-qfw]').value, did: el.querySelector('[data-qdid]').value.trim(), check: res.check, diffs: res.diffs });
      };
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-qmail], [data-qsend]'); if (!b) return;
        var body = text0();
        var did = el.querySelector('[data-qdid]').value.trim();
        var title = m + (res.check ? ' import check' : ' two exports') + (did ? ': ' + did.slice(0, 80) : '');
        if (b.hasAttribute('data-qmail')) {  // a long report may not fit in a mail link: then it is copied to paste
          var mail = Q3.mailUrl(title, body);
          if (mail) { openLink(mail); return; }
          copy(body).then(function () { openLink(Q3.mailUrl(title, 'Paste the report here.')); notice('The report is copied: paste it into the email', 'none'); });
          return;
        }
        var url = Q3.issueUrl(title, body);
        if (url) { window.open(url, '_blank', 'noopener'); return; }
        copy(body).then(function () { window.open(Q3.blankIssueUrl(title), '_blank', 'noopener'); notice('The report is too long for a link, so it is copied: paste it into the issue', 'none'); });
      });
    });
  }
  function openLink(url) { var a = document.createElement('a'); a.href = url; a.click(); }
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
