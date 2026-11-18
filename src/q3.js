// Leica Q3 and Q3 43 settings files (settings.lcs), as an experiment. Reads a Q3 export in its own layout, writes the
// settings the Q3 shares with the M into it from a design, compares two exports and writes a report of what changed.
// Runs in the browser (window.Q3) and in Node (module.exports) so the tests use the same code.
//
// What is known about a Q3 file (docs/leica-q.md):
//  - "Camera" is "LEICA Q3" or "LEICA Q3 43" and must match the body. There is no "Version".
//  - Firmware 4 writes 586 or 587 codes, in a fixed order the file keeps. Per-profile codes hold seven values:
//    0 is the live state, 1 to 6 the profiles. Profile names are one value each, D037 to D03A, D0AD and D0AE.
//  - Import replaces all six profiles. There is no saved-profiles mask and no start profile.
//  - 255 (or -1) in a profile's slot means the profile doesn't store that setting.
//  - Layout: two-space indent, no space after colons, one value per line except the button lists (seven groups of
//    36, a count, then that many jobs, one group per line), "/" not escaped, no final newline.
//  - What the Q3 does with a value it doesn't accept is unknown.
(function (root) {
  'use strict';
  var E = root.Engine || require('./engine.js');
  var NAMES = root.Q3CODES || require('./q3codes.js');
  var CAMERAS = { 'LEICA Q3': 'Q3', 'LEICA Q3 43': 'Q3 43' };
  var MODELS = ['Q3', 'Q3 43'];
  var FIRMWARE_4 = 586;  // firmware 4 writes 586 or 587 codes; older firmware 344 to 563
  var ISSUES = 'https://github.com/timoarnall/msetter/issues/new';

  function plain(text) { var e = new Error(text); e.plain = true; return e; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ---------- reading and writing ----------
  // The Camera line of a file that may be a Q file, or null.
  function cameraOf(text) {
    try { var raw = JSON.parse(text); return raw && typeof raw.Camera === 'string' && /^LEICA Q/.test(raw.Camera) ? raw.Camera : null; } catch (e) { return null; }
  }
  // { camera, model, codes: [in the file's order], S: { code: values }, firmware4 }
  // JSON.parse puts number-like codes ("5005") first, so the order is read from the text.
  function read(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { throw plain('This is not a settings file. Open the settings.lcs your Q3 exports.'); }
    if (!raw || typeof raw.Camera !== 'string' || !raw.Settings || typeof raw.Settings !== 'object') throw plain('This is not a settings file. Open the settings.lcs your Q3 exports.');
    var model = CAMERAS[raw.Camera];
    if (!model) throw plain('This file is from a ' + raw.Camera + '. Msetter tries the Q3 and Q3 43 only: other Q cameras number their settings differently.');
    var codes = [], re = /^ {4}"([^"]+)":/gm, m;
    while ((m = re.exec(text))) codes.push(m[1]);
    if (codes.length !== Object.keys(raw.Settings).length || codes.some(function (c) { return !Array.isArray(raw.Settings[c]); })) throw plain('This Q3 file is laid out in a way Msetter doesn’t know.');
    return { camera: raw.Camera, model: model, codes: codes, S: raw.Settings, firmware4: codes.length >= FIRMWARE_4 };
  }
  function scalar(v) {
    if (typeof v === 'number' && Number.isInteger(v)) return String(v);
    if (typeof v === 'string') return JSON.stringify(v);
    throw plain('This Q3 file holds a value Msetter doesn’t know how to write.');
  }
  // A button list: seven groups of 36, a count, then that many jobs, using up the list exactly.
  function groups(a) {
    if (a.length < 14) return null;
    var out = [], i = 0;
    while (i < a.length) {
      if (a[i] !== 36 || i + 1 >= a.length || !(a[i + 1] >= 0) || i + 2 + a[i + 1] > a.length) return null;
      out.push(a.slice(i, i + 2 + a[i + 1])); i += 2 + a[i + 1];
    }
    return out.length === 7 ? out : null;
  }
  function writeArray(a) {
    if (!a.length) return '[]';
    var g = groups(a);
    var lines = g ? g.map(function (x) { return '      ' + x.map(scalar).join(', '); }) : a.map(function (v) { return '      ' + scalar(v); });
    return '[\n' + lines.join(',\n') + '\n    ]';
  }
  function write(f) {
    return '{\n  "Camera":' + JSON.stringify(f.camera) + ',\n  "Settings":{\n' +
      f.codes.map(function (c) { return '    ' + JSON.stringify(c) + ':' + writeArray(f.S[c]); }).join(',\n') + '\n  }\n}';
  }
  // Msetter writes a Q3 file only when reading and writing it unchanged gives back the same bytes.
  function writable(text) {
    var f = read(text);
    if (!f.firmware4) return 'This file comes from firmware older than 4. Update the camera, export again and open the new file.';
    try { if (write(f) !== text) return 'This file is laid out in a way Msetter doesn’t know, so Msetter won’t write it.'; } catch (e) { return e.message; }
    return '';
  }

  // ---------- what goes from the M to the Q3 ----------
  // Each entry is one Q3 setting: how to read it from an M design (get, set), and how its values cross (toQ, fromQ).
  // Only settings that mean the same on both and are known on the Q3. Left out: autofocus, buttons, Looks, video,
  // ISO (D010 is the ISO dial's M position on the M11-P), self-timer and auto review (the Q3 keeps their off switches
  // in other codes), language, file name, noise reduction, film style and peaking sensitivity.
  function oneOf(list) { return function (v) { return list.indexOf(v) >= 0 ? v : undefined; }; }
  function entry(code, toQ, fromQ, more) {
    return Object.assign({ q: code, m: code,
      get: function (S, p) { return S[code] ? S[code][p] : undefined; },
      set: function (S, p, k) { if (S[code]) S[code][p] = k; },
      toQ: toQ || function (k) { return k; }, fromQ: fromQ || function (v) { return v; } }, more || {});
  }
  var ISO_STEPS = [200, 400, 800, 1600, 3200, 6400, 12500, 25000, 50000, 100000];  // the Q3's USB list: whole stops
  var FIXED_SPEEDS = function (v) { return v >= 256 && v <= 2816 && v % 256 === 0 ? v : undefined; };
  // The M's 1/f limits become the fixed speed for the Q3's lens, rounded to the next faster step:
  // 28 mm on the Q3, 43 mm on the Q3 43.
  var BY_FOCAL = { Q3: { 32768: 1280, 32769: 1536, 32770: 1792 }, 'Q3 43': { 32768: 1536, 32769: 1792, 32770: 2048 } };
  var ascii = function (min, max) { var re = new RegExp('^[ -~]{' + min + ',' + max + '}$'); return function (v) { return typeof v === 'string' && re.test(v) ? v : undefined; }; };
  var GRID = function (code, on) {  // the M keeps the grid's on/off apart from its type; the Q3 has one code, 0 for off
    return entry(code, oneOf([0, 1, 2]), oneOf([0, 1, 2]), {
      m: code, on: on, grid: true,
      get: function (S, p) { return S[code] && S[on] ? (S[on][p] ? S[code][p] : 0) : undefined; },
      set: function (S, p, k) { if (!S[code] || !S[on]) return; if (k) { S[on][p] = 1; S[code][p] = k; } else S[on][p] = 0; },
      ok: function (model, k) { return !k || E.legal(E.rule(model, code), k); }
    });
  };
  var ENTRIES = [
    entry('5010'), entry('500B'), entry('5013', oneOf([0, 2, 5, 7, 8]), oneOf([0, 2, 5, 7, 8])),
    entry('D006'), entry('D007'), entry('D000'), entry('D001'),
    entry('D00C', function (k, qm) { return FIXED_SPEEDS(k) || BY_FOCAL[qm][k]; }, FIXED_SPEEDS, { qValue: true, qWords: { 0: 'Auto' } }),
    entry('D00B', function (k) {
      if (typeof k !== 'number') return undefined;
      var out = ISO_STEPS[0]; ISO_STEPS.forEach(function (s) { if (s <= k) out = s; }); return out;
    }, oneOf(ISO_STEPS), { qValue: true }),
    entry('5005', oneOf([0, 1, 2, 3, 4, 8, 11]), oneOf([0, 1, 2, 3, 4, 8, 11]), { qWords: { 10: 'Gray Card' } }),
    entry('D014'), entry('D004'), entry('D00F'), entry('D196'), entry('D0D5'),
    entry('D02F'), entry('501E', ascii(1, 20), ascii(0, 20), { text: true }), entry('501F', ascii(1, 20), ascii(0, 20), { text: true }),
    entry('D01E'), entry('D051', oneOf([30, 60, 300]), oneOf([30, 60, 300])), entry('D108', oneOf([30, 60, 120, 300, 600]), oneOf([30, 60, 120, 300, 600]))
  ];
  // The four screen layouts: info bars, level gauge, clipping, focus peaking, histogram (on is 3 on the Q3) and grid.
  [['D15E', 'D0C4', 'D139', 'D165', 'D13A', 'D01F', 'D1A5'], ['D15F', 'D169', 'D170', 'D166', 'D16C', 'D162', 'D1A6'],
   ['D160', 'D16A', 'D171', 'D167', 'D16D', 'D163', 'D1A7'], ['D161', 'D16B', 'D172', 'D168', 'D16E', 'D164', 'D1A8']].forEach(function (l) {
    ENTRIES.push(entry(l[0], oneOf([0, 1]), oneOf([0, 1]), { qWords: { 3: 'Dark Background' } }), entry(l[1]), entry(l[2]), entry(l[3]),
      entry(l[4], function (k) { return k === 1 ? 3 : k === 0 ? 0 : undefined; }, function (v) { return v === 3 ? 1 : v === 0 ? 0 : undefined; }), GRID(l[5], l[6]));
  });
  // Profile names: one value each, camera-wide, the same codes on both. Only the design's own profiles are written.
  E.NAME_CODES.forEach(function (code, i) {
    ENTRIES.push(entry(code, ascii(3, 10), ascii(3, 10), { name: i + 1, text: true,
      get: function (S, p) { return S[code] ? S[code][0] : undefined; },
      set: function (S, p, k) { if (S[code]) S[code][0] = k; } }));
  });
  function slotOf(e, p) { return e.name ? 0 : p; }
  function okOnM(e, model, k) { return e.ok ? e.ok(model, k) : !!E.rule(model, e.m) && E.legal(E.rule(model, e.m), k); }
  function unset(v) { return v === 255 || v === -1; }

  // The design's settings written into the owner's Q3 file. A setting is written when the design's value differs from
  // `base` (the design as it was when it came from this file, or the M's factory settings): untouched settings keep
  // the Q3's own values. Only the design's profiles are written, never the live slot.
  // Returns { text, changes: [{ code, entry, p, slot, from, to, k }], skipped: [{ entry, p, k, why }] }.
  function merge(text, doc, base) {
    var f = read(text), changes = [], skipped = [];
    E.profiles(doc).forEach(function (p) {
      ENTRIES.forEach(function (e) {
        if (e.name && e.name !== p) return;
        var k = e.get(doc.S, p);
        if (k === undefined || same(k, e.get(base, p))) return;
        var a = f.S[e.q], slot = slotOf(e, p);
        if (!a || a.length <= slot) { skipped.push({ entry: e, p: p, k: k, why: 'missing' }); return; }
        var v = e.toQ(k, f.model);
        if (v === undefined) { skipped.push({ entry: e, p: p, k: k, why: 'none' }); return; }
        if (!e.text && unset(a[slot])) { skipped.push({ entry: e, p: p, k: k, why: 'unset' }); return; }
        if (v === a[slot]) return;
        changes.push({ code: e.q, entry: e, p: p, slot: slot, from: a[slot], to: v, k: k });
        a[slot] = v;
      });
    });
    return { text: write(f), model: f.model, changes: changes, skipped: skipped };
  }

  // A design made from a Q3 file: the M's factory settings, six profiles, and every shared setting the M can hold.
  function designFrom(text, modelName) {
    var f = read(text), doc = E.blank(modelName), n = 0;
    E.setProfiles(doc, [1, 2, 3, 4, 5, 6]); doc.S.D124 = [1];
    for (var p = 1; p <= 6; p++) {
      ENTRIES.forEach(function (e) {
        if (e.name && e.name !== p) return;
        var a = f.S[e.q]; if (!a) return;
        var k = e.fromQ(a[slotOf(e, p)]);
        if (k !== undefined && okOnM(e, modelName, k)) { e.set(doc.S, p, k); n++; }
      });
    }
    E.syncLive(doc);
    return { doc: doc, read: n };
  }

  // ---------- comparing two files ----------
  // Every value that differs, by code and slot (0 the live state, 1 to 6 the profiles, 'all' for a camera-wide
  // setting, null for a list or a code only one file has), in the second file's order.
  function compare(aText, bText) {
    var a = read(aText), b = read(bText), out = [];
    b.codes.forEach(function (code) {
      var x = a.S[code], y = b.S[code];
      if (same(x, y)) return;
      if (!x || x.length !== y.length || (y.length !== 7 && y.length !== 1)) { out.push({ code: code, slot: null, a: x, b: y }); return; }
      for (var i = 0; i < y.length; i++) if (!same(x[i], y[i])) out.push({ code: code, slot: y.length === 1 ? 'all' : i, a: x[i], b: y[i] });
    });
    a.codes.forEach(function (code) { if (!(code in b.S)) out.push({ code: code, slot: null, a: a.S[code], b: undefined }); });
    return out;
  }
  // After an import and a new export: what the camera did with each value Msetter wrote, and what else differs.
  function check(saved, newText) {
    var f = read(newText), all = compare(saved.text, newText);
    var rows = saved.changes.map(function (c) {
      var a = f.S[c.code], back = a ? a[c.slot] : undefined;
      return { code: c.code, slot: c.slot, p: c.p, sent: c.to, back: back, kept: back === c.to };
    });
    var other = all.filter(function (d) { return !saved.changes.some(function (c) { return c.code === d.code && (c.slot === d.slot || (d.slot === 'all' && c.slot === 0)); }); });
    return { rows: rows, other: other };
  }

  // ---------- the report ----------
  function nameOf(code) { var n = NAMES[code]; return n ? n[0] + (n[1] === 'known' ? '' : ' (' + n[1] + ')') : 'not in the code list'; }
  // Numbers and Looks records only: names, artist, copyright and the file name letter never go in a report.
  function shown(v) {
    if (v === undefined) return '(none)';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return /^[0-9A-F]{32}$/.test(v) ? v : '(text)';
    if (Array.isArray(v)) return v.length > 24 ? '(a list of ' + v.length + ')' : v.map(shown).join(' ');
    return '?';
  }
  function slotWords(s) { return s === null ? 'list' : s === 'all' ? 'all' : s === 0 ? 'live' : String(s); }
  function cell(s) { return String(s).replace(/\|/g, '/'); }
  // o: { camera, codes, firmware, did, check: { rows, other } or diffs: [...] }
  function report(o) {
    var L = ['Camera: ' + o.camera, 'Firmware: ' + (o.firmware || 'not said'), 'Codes in the file: ' + o.codes, 'What was done: ' + (o.did || 'not said'), ''];
    if (o.check) {
      L.push('Msetter wrote these values, and the camera returned:', '', '| Code | Profile | Setting | Sent | Returned | |', '|---|---|---|---|---|---|');
      o.check.rows.forEach(function (r) { L.push('| ' + [r.code, slotWords(r.slot), cell(nameOf(r.code)), shown(r.sent), shown(r.back), r.kept ? 'kept' : 'not kept'].join(' | ') + ' |'); });
      L.push('');
    }
    var diffs = o.check ? o.check.other : o.diffs;
    L.push(o.check ? 'Other differences:' : 'Differences between the two files:', '');
    if (!diffs.length) L.push('None.');
    else {
      L.push('| Code | Profile | Setting | Before | After |', '|---|---|---|---|---|');
      diffs.forEach(function (d) { L.push('| ' + [d.code, slotWords(d.slot), cell(nameOf(d.code)), shown(d.a), shown(d.b)].join(' | ') + ' |'); });
    }
    return L.join('\n');
  }
  // A new GitHub issue with the report filled in, or null when the address would be too long for a browser.
  function issueUrl(title, body) {
    var url = ISSUES + '?template=q3-report.md&labels=q3-report&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    return url.length > 7500 ? null : url;
  }
  function blankIssueUrl(title) { return ISSUES + '?template=q3-report.md&labels=q3-report&title=' + encodeURIComponent(title); }

  var Q3 = { MODELS: MODELS, CAMERAS: CAMERAS, ENTRIES: ENTRIES, cameraOf: cameraOf, read: read, write: write, writable: writable,
    merge: merge, designFrom: designFrom, compare: compare, check: check, report: report, nameOf: nameOf, shown: shown,
    slotWords: slotWords, issueUrl: issueUrl, blankIssueUrl: blankIssueUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = Q3;
  else root.Q3 = Q3;
})(typeof window !== 'undefined' ? window : globalThis);
