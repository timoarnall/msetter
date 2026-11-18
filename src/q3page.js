// The Q3 and Q3 43 on the page, as an experiment. The design stays an M design. A Q3 file is the owner's own export
// with the settings both cameras share written into it (src/q3.js). Here: the Q3 chips and the sheet behind them, the
// owner's file kept in the browser, the Q3 rows of the Save sheet, and the comparison after a new export, with a
// report to send. Hidden in the Mac app and on claude.ai, which save only .lcse files. The state rules (what opening a
// file does, which values Save compares with) are in src/q3.js and docs/state.md.
(function (App) {
  'use strict';
  var E = Engine, W = Words;
  var esc = App.esc, notice = App.notice, sheet = App.sheet, closeSheets = App.closeSheets, closeMenu = App.closeMenu,
    st = App.st, profiles = App.profiles, pname = App.pname, remember = App.remember, save = App.save, begin = App.begin,
    changesSince = App.changesSince;
  var short = W.short, settingName = W.settingName, count = W.count;
  var STORE = 'msetter-q3-v1';
  // Per Q model: { text, name, at, saved: { text, changes: [{ code, slot, p, to }], at } }. Kept outside the design and
  // its Undo: the owner's file is not part of the design. A stored file that no longer reads is dropped.
  var held = {};
  try { held = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { held = {}; }
  Object.keys(held).forEach(function (m) { try { if (Q3.read(held[m].text).model !== m) throw 0; } catch (e) { delete held[m]; } });
  function store() { try { localStorage.setItem(STORE, JSON.stringify(held)); } catch (e) { /* storage may be off */ } }

  function offered() { return !App.nativeBridge() && !(window.claude && window.claude.use); }
  function chipsHTML() {
    if (!offered()) return '';
    return Q3.MODELS.map(function (m) { return '<button class="chip" data-qcam="' + m + '" aria-pressed="' + !!held[m] + '" title="Experimental">' + m + '</button>'; }).join('');
  }
  function paintChips() { document.querySelectorAll('[data-qcam]').forEach(function (b) { b.setAttribute('aria-pressed', !!held[b.dataset.qcam]); }); }
  function fromHere(m) { return Q3.designIsFrom(st.origin, m, held[m]); }
  // Whether the design came from a Q3 file: then the Save sheet leads with the Q3.
  function q3First() { return offered() && !!(st.origin && st.origin.q3 && held[st.origin.q3]); }

  // ---------- the sheet behind a Q3 chip ----------
  function introHTML(m) {
    return '<h2>' + m + ' (experimental)</h2>' +
      '<p class="dim">Change your <span class="hi">profile names, shutter speed and ISO limits, white balance, file format, copyright and screen layouts</span>, then save a file your ' + m + ' imports.</p>' +
      '<p class="dim">No file from Msetter has been imported on a Q3 yet, so the camera may skip changes or refuse the file.</p>' +
      '<ol class="dim steps">' +
        '<li>Export from the ' + m + ' (Menu › User Profile › Manage Profiles › Export Profiles) and keep a copy, so you can restore your settings.</li>' +
        '<li>Open the file here, make changes and save.</li>' +
        '<li>Import the new file on the ' + m + '.</li>' +
      '</ol>' +
      '<p class="dim"><span class="hi">Help add more Q3 settings to Msetter.</span> Each report you email shows which settings the Q3 keeps and how it stores them.</p>' +
      '<ul class="dim steps">' +
        '<li>After importing, export again and open the new file here to see what the camera kept.</li>' +
        '<li>Or, without importing, export before and after changing one menu setting, and open both files here.</li>' +
      '</ul>' +
      '<div class="row end"><button class="btn" data-close>Cancel</button><button class="btn primary" data-qopen>Open settings.lcs</button></div>';
  }
  function heldHTML(m, lead) {
    var h = held[m], why = Q3.writable(h.text), mine = fromHere(m), earlier = !mine && st.origin && st.origin.q3 === m;
    var mode = mine ? 'Your ' + m + '’s profiles are on the page. Change them and press Save. Buttons, autofocus, Looks and video stay as they are on the ' + m + '.'
      : earlier ? 'The profiles on the page come from an earlier file from this ' + m + '. Save writes what you changed since then into this file.'
      : 'Your profiles on the page stay. Save puts what you changed from factory into a copy of this file, profile 1 into profile 1 and so on.';
    var next = h.saved && h.saved.at > h.at ? 'Next: import the file you saved, export again and open it here to see what the camera kept.'
      : 'Open another export from this ' + m + ' to see which settings differ.';
    return '<h2>' + m + ' (experimental)</h2>' +
      '<p class="dim">' + esc(lead || 'Your file: ' + h.name + ', opened ' + new Date(h.at).toLocaleDateString() + '.') + '</p>' +
      '<p class="dim">' + esc(why || mode) + '</p>' +
      '<p class="small dim">' + esc(next) + '</p>' +
      '<div class="row end"><button class="btn" data-qremove>Close file</button>' + (why || mine ? '' : '<button class="btn" data-quse>Use this file’s settings</button>') +
      '<button class="btn" data-qopen>Open another export</button><button class="btn primary" data-close>Done</button></div>';
  }
  function q3Sheet(m, lead) {
    closeMenu(); closeSheets();
    sheet(held[m] ? heldHTML(m, lead) : introHTML(m), function (el, close) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-qopen]')) { close(true); document.getElementById('file').click(); }
        else if (e.target.closest('[data-quse]')) { close(true); useFile(m); }
        else if (e.target.closest('[data-qremove]')) { delete held[m]; store(); close(); notice('Closed your ' + m + ' file', 'none'); }
      });
    });
  }
  // The design from the Q3 file: an Undo step, like opening a file from an M.
  function useFile(m, quiet) {
    remember();
    var r = Q3.designFrom(held[m].text, st.doc.model);
    begin(r.doc, { from: 'you opened your ' + m + ' file', theme: 'exposure' });
    st.origin.q3 = m; st.origin.q3at = held[m].at;
    save(); App.render();
    if (!quiet) notice('Showing your ' + m + '’s profiles');
  }
  // A design nobody has changed since it started from the factory settings or a Q3 file takes a new Q3 file's settings.
  function untouched() {
    if (changesSince().length) return false;
    return !!(st.origin && st.origin.q3) || (st.setId === 'factory' && !Object.keys(st.bases || {}).length);
  }

  // ---------- opening a Q3 file ----------
  function open(text, name) {
    closeMenu(); closeSheets();
    var f, ok = '<div class="row end"><button class="btn primary" data-close>OK</button></div>';
    if (!offered()) { sheet('<h2>That file did not open</h2><p class="dim">Q3 files open in Msetter in a browser, at timoarnall.github.io/msetter/app.</p>' + ok); return; }
    try { f = Q3.read(text); } catch (e) { sheet('<h2>That file did not open</h2><p class="dim">' + esc(e && e.plain ? e.message : E.NOT_SETTINGS) + '</p>' + ok); return; }
    var m = f.model, prev = held[m], plan = Q3.openPlan(prev, text);
    if (plan.mode === 'again') {
      sheet('<h2>This is the file Msetter saved</h2><p class="dim">Copy it to the card and import it on the ' + m + '. Then export again and open that file here.</p>' + ok);
      return;
    }
    if (plan.keep) { held[m] = { text: text, name: name, at: Date.now(), saved: prev && prev.saved }; store(); }
    if (plan.mode === 'first') {
      if (untouched() && Q3.canWrite(text)) useFile(m, true);
      App.render(); q3Sheet(m, 'Opened ' + name + '.');
      return;
    }
    App.render(); compareSheet(m, plan.mode === 'check' ? { saved: prev.saved } : { text: prev.text, name: prev.name }, text);
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
    if (slot === 0) return 'in use now';
    if (typeof slot !== 'number') return '';
    var c = E.NAME_CODES[slot - 1]; return f.S[c] ? f.S[c][0] : 'profile ' + slot;
  }
  function valueWords(code, p, v) {
    if (typeof v === 'string' && E.NAME_CODES.indexOf(code) >= 0) return v;
    var e = entryFor(code, p); return e && v !== undefined ? qWords(e, v) : null;
  }
  function andList(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function rowHTML(cls, what, where, detail, state) {
    return '<div class="qrow ' + cls + '"><div><span class="what">' + esc(what) + '</span>' + (where ? '<span class="where"> · ' + esc(where) + '</span>' : '') +
      (detail ? '<span class="detail">' + esc(detail) + '</span>' : '') + '</div>' + (state ? '<span class="state">' + esc(state) + '</span>' : '') + '</div>';
  }
  // Differences grouped by setting: one row for each, naming the profiles it changed in. The settings in use now are
  // named only when no profile changed, since they follow the profile in use.
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
      var slots = g.slots.length > 1 ? g.slots.filter(function (s) { return s !== 0; }) : g.slots;
      return { name: g.name, where: andList(slots.map(function (s) { return profileWords(f, s); }).filter(Boolean)), detail: same && a && b ? 'From ' + a + ' to ' + b : '' };
    }) };
  }
  function compareSheet(m, base, text) {
    var f = Q3.read(text), res, title, lead, rows = '', also = '', none = false;
    if (base.saved) {
      res = { check: Q3.check(base.saved, text) };
      var all = res.check.rows, kept = all.filter(function (r) { return r.kept; }).length;
      title = 'What your ' + m + ' kept';
      lead = !all.length ? 'The file you saved had no changes.' : kept === all.length ? 'The camera kept all your changes.' :
        !kept ? 'The camera kept none of your changes. It may have refused the file, or this export was made before you imported it.' :
        'The camera kept ' + kept + ' of your ' + all.length + ' changes.';
      rows = all.slice().sort(function (a, b) { return a.kept - b.kept; }).map(function (r) {
        var sent = valueWords(r.code, r.p, r.sent), back = r.back === undefined ? 'no value for it' : valueWords(r.code, r.p, r.back);
        return rowHTML(r.kept ? 'kept' : 'lost', plainName(r.code, r.p) || 'A setting', profileWords(f, r.p),
          r.kept ? '' : 'You saved ' + sent + '. The camera has ' + back + '.', r.kept ? 'Kept' : 'Not kept');
      }).join('');
      var other = diffRows(f, res.check.other), names = other.groups.map(function (g) { return g.name.charAt(0).toLowerCase() + g.name.slice(1); });
      if (other.unknown) names.push(count(other.unknown, 'setting') + ' Msetter can’t name yet');
      if (names.length) also = 'Also changed since you saved: ' + andList(names) + '.';
    } else {
      res = { diffs: Q3.compare(base.text, text) };
      var d = diffRows(f, res.diffs), n = d.groups.length + d.unknown;
      none = !res.diffs.length;
      title = 'What changed';
      lead = none ? 'The two files are the same.' : 'Between your two files, ' + (n === 1 ? 'one setting changed.' : count(n, 'setting') + ' changed.');
      rows = d.groups.map(function (g) { return rowHTML('', g.name, g.where, g.detail, ''); }).join('');
      if (d.unknown) rows += rowHTML('', d.unknown === 1 ? 'A setting Msetter can’t name yet' : d.unknown + ' settings Msetter can’t name yet', '', 'Your report helps name it.', '');
    }
    var fw = ['', '4.1.1', '4.1.0', '4.0', 'Older'];
    var ask = none ? '' :
      '<label class="qask"><span>' + (res.check ? 'Anything to add?' : 'What did you change on the camera?') + '</span>' +
        '<input class="qfield" data-qdid placeholder="' + (res.check ? 'Optional' : 'For example: thumbwheel in S set to ISO') + '"></label>' +
      '<label class="qask"><span>Firmware (Menu › Camera Information)</span><select class="qfield" data-qfw>' + fw.map(function (v) { return '<option value="' + v + '">' + (v || 'Not sure') + '</option>'; }).join('') + '</select></label>' +
      '<p class="small dim">Your report helps Msetter add Q3 settings. It leaves out names and copyright. Email goes to ' + Q3.REPORTS + ', GitHub opens a public issue.</p>';
    sheet('<h2>' + esc(title) + '</h2><p class="qlead">' + esc(lead) + '</p>' +
      (rows ? '<div class="qrows">' + rows + '</div>' : '') + (also ? '<p class="small dim">' + esc(also) + '</p>' : '') + ask +
      '<div class="row end"><button class="btn' + (none ? ' primary' : '') + '" data-close>Done</button>' +
      (none ? '' : '<button class="btn" data-qsend>GitHub</button><button class="btn primary" data-qmail autofocus>Email</button>') + '</div>',
    function (el) {
      var text0 = function () {
        return Q3.report({ camera: f.camera, codes: f.codes.length, firmware: el.querySelector('[data-qfw]').value, did: el.querySelector('[data-qdid]').value.trim(), check: res.check, diffs: res.diffs });
      };
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-qmail], [data-qsend]'); if (!b) return;
        var body = text0();
        var title = m + (res.check ? ' import result' : ' setting change');  // the person's note is in the report
        if (b.hasAttribute('data-qmail')) {  // a long report may not fit in a mail link: then it is copied to paste
          var mail = Q3.mailUrl(title, body);
          if (mail) { openLink(mail); return; }
          copyThen(body, 'email', function () { openLink(Q3.mailUrl(title, 'Paste the report here.')); });
          return;
        }
        var url = Q3.issueUrl(title, body);
        if (url) { window.open(url, '_blank', 'noopener'); return; }
        copyThen(body, 'issue', function () { window.open(Q3.blankIssueUrl(title), '_blank', 'noopener'); });
      });
    });
  }
  function openLink(url) { var a = document.createElement('a'); a.href = url; a.click(); }
  // Copies the report, then opens the email or issue to paste it into. If the browser won't copy, the report is shown
  // selected so it can be copied by hand.
  function copyThen(text, where, then) {
    copy(text).then(function (ok) {
      if (ok) { then(); notice('The report is copied: paste it into the ' + where, 'none'); return; }
      sheet('<h2>Copy the report</h2><p class="dim">Copy this text, then paste it into the ' + where + '.</p><textarea class="qfield qtext" readonly></textarea>' +
        '<div class="row end"><button class="btn" data-close>Done</button><button class="btn primary" data-qgo>Open the ' + where + '</button></div>',
      function (el, close) {
        var t = el.querySelector('textarea'); t.value = text; t.focus(); t.select();
        el.addEventListener('click', function (e) { if (e.target.closest('[data-qgo]')) { close(true); then(); } });
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
  function mergeFor(m) { return Q3.merge(held[m].text, st.doc, Q3.baseFor(st.origin, m, E.blank(st.doc.model).S)); }
  function qWords(e, v) {
    if (e.qWords && e.qWords[v] !== undefined) return e.qWords[v];
    if (e.text) return v;
    if (e.qValue) return short(e.m, v);
    var k = e.fromQ(v);
    if (k === undefined) return String(v);
    return e.grid ? (k ? short(e.q, k) : 'Off') : short(e.m, k);
  }
  function mWords(e, k) { return e.grid ? (k ? short(e.q, k) : 'Off') : e.text ? k : short(e.m, k); }
  function whatOf(e) { return e.name ? 'Profile name' : e.grid ? settingName(e.on) : settingName(e.m); }
  function noteLines(r) {
    var many = profiles().length > 1, who = function (p, e) { return many && !(e && e.name) ? pname(p) + ': ' : ''; };
    var out = r.changes.map(function (c) { return who(c.p, c.entry) + whatOf(c.entry) + ' ' + qWords(c.entry, c.from) + ' to ' + qWords(c.entry, c.to); });
    r.notes.filter(function (n) { return !r.changes.some(function (c) { return c.entry === n.entry && c.p === n.p; }); }).forEach(function (n) { out.push(who(n.p, n.entry) + whatOf(n.entry) + ' ' + mWords(n.entry, n.k) + ' isn’t on the Q3, so it’s ' + qWords(n.entry, n.v)); });
    r.skipped.forEach(function (s) {
      var e = s.entry;
      if (s.why === 'video') out.push(pname(s.p) + ' is a video profile on the Q3, so its photo settings stay');
      else if (s.why === 'none') out.push(who(s.p, e) + whatOf(e) + ' ' + mWords(e, s.k) + ' isn’t on the Q3');
      else if (s.why === 'unset') out.push('The ' + pname(s.p) + ' profile on the Q3 doesn’t keep ' + whatOf(e).toLowerCase());
      else out.push('This file has no ' + whatOf(e).toLowerCase());
    });
    return out;
  }
  // The Q3 rows of the Save sheet, one for each Q3 file opened. primary: the Q3 leads the sheet.
  function saveRows(primary) {
    if (!offered()) return '';
    return Q3.MODELS.filter(function (m) { return held[m]; }).map(function (m) {
      var why = Q3.writable(held[m].text), body;
      if (why) body = esc(why);
      else {
        var r = mergeFor(m), lines = noteLines(r);
        body = esc(r.changes.length ? count(r.changes.length, 'change') + ' to your ' + m + '’s file' : 'No changes to your ' + m + '’s file') +
          (lines.length ? ': ' + esc(lines.slice(0, 4).join('. ')) + '.' : '.') +
          (lines.length > 4 ? '<details><summary>Show all ' + lines.length + '</summary>' + esc(lines.slice(4).join('. ')) + '.</details>' : ' ') +
          esc('Buttons, autofocus, Looks and video stay as they are. Copy settings.lcs to the card and import it, then export again and open that file here.');
      }
      return '<div><div class="grow1"><div>' + m + ' (experimental)</div><div class="small dim">' + body + '</div></div>' +
        (why ? '' : '<button class="btn' + (primary ? ' primary' : '') + '" data-qsave="' + m + '">Save file</button>') + '</div>';
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

  // A Q3 chip in the file panel or on the starting page opens its sheet.
  document.addEventListener('click', function (e) { var q = e.target.closest('[data-qcam]'); if (q) q3Sheet(q.dataset.qcam); });

  Object.assign(App, { q3ChipsHTML: chipsHTML, q3PaintChips: paintChips, q3Open: open, q3Rows: saveRows, q3Save: saveFile, q3First: q3First });
})(window.App = window.App || {});
