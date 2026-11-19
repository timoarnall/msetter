// Leica Q3, Q3 43 and Q2 settings files (settings.lcs), as an experiment. Reads a Q export in its own layout, writes the
// settings the Q shares with the M into it from a design, compares two exports and writes a report of what changed.
// The code and its names say Q3 because the Q3 came first; MODEL says how a Q2 differs.
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
// A Q2 file (three exports, and a Q2 on firmware 4.00 tested on 2026-11-18) has the same layout with 142 to 177 codes,
// writes FF4B twice, and names profiles 5 and 6 in FF16 and FF17. That Q2 imported Msetter's own file and kept every
// change, kept 60 of 61 values written into a profile from outside, and skipped a value it can't use without a message,
// keeping the rest. Only the profile names are camera-wide in a Q2 file.
(function (root) {
  'use strict';
  var E = root.Engine || require('./engine.js');
  var NAMES = root.Q3CODES || require('./q3codes.js');
  var CAMERAS = { 'LEICA Q3': 'Q3', 'LEICA Q3 43': 'Q3 43', 'LEICA Q2': 'Q2' };
  var MODELS = ['Q3', 'Q3 43', 'Q2'];
  var FIRMWARE_4 = ['D31B', 'D3DB'];  // codes only firmware 4 writes (the Control Center tiles, D3DB to D3E2)
  var ISSUES = 'https://github.com/timoarnall/msetter/issues/new';
  var REPORTS = 'devise-put.1y@icloud.com';  // where Q3 owners email reports (Timo, 2026-11-18)

  function plain(text) { var e = new Error(text); e.plain = true; return e; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ---------- reading and writing ----------
  // The Camera line of a file that may be a Q file, or null.
  function cameraOf(text) {
    try { var raw = JSON.parse(text); return raw && typeof raw.Camera === 'string' && /^LEICA Q/.test(raw.Camera) ? raw.Camera : null; } catch (e) { return null; }
  }
  // { camera, model, codes: [in the file's order], S: { code: values }, recent: from firmware Msetter writes into }
  // JSON.parse puts number-like codes ("5005") first, so the order is read from the text.
  function read(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { throw plain('This is not a settings file. Open the settings.lcs your camera exports.'); }
    if (!raw || typeof raw.Camera !== 'string' || !raw.Settings || typeof raw.Settings !== 'object') throw plain('This is not a settings file. Open the settings.lcs your camera exports.');
    var model = CAMERAS[raw.Camera];
    if (!model) throw plain('This file is from a ' + raw.Camera.replace(/^LEICA /, 'Leica ') + '. Msetter opens Q3, Q3 43 and Q2 files only.');
    var codes = [], re = /^ {4}"([^"]+)":/gm, m;
    while ((m = re.exec(text))) codes.push(m[1]);
    var once = codes.filter(function (c, i) { return codes.indexOf(c) === i; });  // a Q2 writes FF4B twice
    if (once.length !== Object.keys(raw.Settings).length || codes.some(function (c) { return !Array.isArray(raw.Settings[c]); })) throw plain('Msetter can’t read this file. Open the file exactly as the camera wrote it.');
    return { camera: raw.Camera, model: model, codes: codes, S: raw.Settings, recent: MODEL[model].need.every(function (c) { return c in raw.Settings; }) };
  }
  function scalar(v) {
    if (typeof v === 'number' && Number.isInteger(v)) return String(v);
    if (typeof v === 'string') return JSON.stringify(v);
    throw plain('This file holds a value Msetter doesn’t know how to write.');
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
    if (!f.recent) return 'This file comes from firmware older than 4. Update the camera, export again and open the new file.';
    try { if (write(f) !== text) return 'Msetter can compare this file but can’t save changes into it. Open the file exactly as the camera wrote it.'; } catch (e) { return e.message; }
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
    return entry(code, oneOf([0, 1]), oneOf([0, 1, 2]), {  // 6 x 4 (2) is unconfirmed on the Q3: only 0 and 1 are in its files
      m: code, on: on, grid: true,
      get: function (S, p) { return S[code] && S[on] ? (S[on][p] ? S[code][p] : 0) : undefined; },
      set: function (S, p, k) { if (!S[code] || !S[on]) return; if (k) { S[on][p] = 1; S[code][p] = k; } else S[on][p] = 0; },
      ok: function (model, k) { return !k || E.legal(E.rule(model, code), k); }
    });
  };
  var ENTRIES = [
    entry('5010'), entry('500B'), entry('5013', oneOf([0, 2, 8]), oneOf([0, 2, 5, 7, 8])),  // the Q3's continuous speeds are numbered by guess: they don't cross
    entry('D006'), entry('D007'), entry('D000'), entry('D001'),
    entry('D00C', function (k, qm) { return FIXED_SPEEDS(k) || BY_FOCAL[qm][k]; }, FIXED_SPEEDS, { qValue: true, qWords: { 0: 'Auto' } }),
    entry('D00B', function (k) {
      if (typeof k !== 'number') return undefined;
      var out = ISO_STEPS[0]; ISO_STEPS.forEach(function (s) { if (s <= k) out = s; }); return out;
    }, oneOf(ISO_STEPS), { qValue: true }),
    entry('5005', oneOf([0, 1, 2, 3, 4, 8, 11]), oneOf([0, 1, 2, 3, 4, 8, 11]), { qWords: { 10: 'Gray Card' } }),
    entry('D014'), entry('D004'), entry('D00F'), entry('D196'), entry('D0D5'),
    entry('D02F', null, null, { copyright: true }), entry('501E', ascii(0, 20), ascii(0, 20), { text: true }), entry('501F', ascii(0, 20), ascii(0, 20), { text: true }),
    entry('D01E'), entry('D051', oneOf([30, 60, 300]), oneOf([30, 60, 300])), entry('D108', oneOf([30, 60, 120, 300, 600]), oneOf([30, 60, 120, 300, 600]))
  ];
  // The four screen layouts: info bars, level gauge, clipping, focus peaking, histogram (on is 3 on the Q3) and grid.
  var LAYOUTS = [['D15E', 'D0C4', 'D139', 'D165', 'D13A', 'D01F', 'D1A5'], ['D15F', 'D169', 'D170', 'D166', 'D16C', 'D162', 'D1A6'],
   ['D160', 'D16A', 'D171', 'D167', 'D16D', 'D163', 'D1A7'], ['D161', 'D16B', 'D172', 'D168', 'D16E', 'D164', 'D1A8']];
  LAYOUTS.forEach(function (l) {
    ENTRIES.push(entry(l[0], oneOf([0, 1]), function (v) { return v === 3 ? 1 : oneOf([0, 1])(v); }, { qWords: { 3: 'Dark Background' } }), entry(l[1]), entry(l[2]), entry(l[3]),
      entry(l[4], function (k) { return k === 1 ? 3 : k === 0 ? 0 : undefined; }, function (v) { return v === 3 ? 1 : v === 0 ? 0 : undefined; }), GRID(l[5], l[6]));
  });
  // Profile names: one value each, camera-wide, the same codes on both. Only the design's own profiles are written.
  // A Q3 name comes into the page as the page's own name rule cleans it (letters, digits, spaces, hyphens; 3 to 10).
  function pageName(v) {
    if (typeof v !== 'string') return undefined;
    var n = v.replace(/[^A-Za-z0-9 \-]/g, '').trim().slice(0, 10).trim();
    return n.length >= 3 ? n : undefined;
  }
  E.NAME_CODES.forEach(function (code, i) {
    ENTRIES.push(entry(code, ascii(3, 10), pageName, { name: i + 1, text: true,
      get: function (S, p) { return S[code] ? S[code][0] : undefined; },
      set: function (S, p, k) { if (S[code]) S[code][0] = k; } }));
  });
  // How a model differs from the Q3: `need`, codes a file must hold before Msetter writes into it; `over`, entries
  // changed for the model (null leaves the setting out); `add`, entries only the model has.
  var LENS_LIMITS = function (v) { return FIXED_SPEEDS(v) || ([32768, 32769, 32770].indexOf(v) >= 0 ? v : undefined); };
  var ON_OFF = oneOf([0, 1]), AUTO_REVIEW = oneOf([0, 1, 3, 5, -1, -3]);
  // ---------- the Q2 ----------
  // From a Q2 on firmware 4.00 (2026-11-18): one change per profile, photos of its menus, and imports that kept every
  // value. Everything below follows from that; `untested` marks a setting no Q2 has imported from Msetter with the
  // meaning given here. A wrong guess costs nothing worse than a setting the camera skips.
  //  - One set of capture assistants per profile: grid (on or off), clipping, horizon, histogram, 1 for on, from the
  //    M's first screen layout. Focus peaking is FF03: 0 off (a guess), Red 1, Green 2, Blue 3, White 4.
  //  - Film styles FF04 1 to 5 in the M's order. Contrast, sharpness and saturation per style, FF05 to FF11, 1 to 5 for
  //    -2 to +2, in the M's order of styles (three for each color style, two for each black and white one): read from
  //    the owner's own B&W High Contrast tuning, which sat in FF10 and FF11.
  //  - Buttons: the FN Button and the Right Wheel Button each open a list of up to eight functions (FF32 to FF39,
  //    FF3A to FF41) and start on one (FF48, FF49). Each gets the M's button jobs, its own first. A function is a number:
  //    a setting's own code where it has one, else a small number shared with the M (Interval Shooting 1, Flash
  //    Settings 3, Format Card 8, User Profile 11, Auto ISO Settings 12, Exposure Bracketing 14).
  //  - Favorites: fourteen places, D054 to D05D, D070 to D072 and D07C, numbered the same way.
  var Q2_TESTED = { '5005': 1, D00B: 1, D00C: 1, '500B': 1, D01A: 1, FF26: 1, FF27: 1, FF28: 1, FF29: 1, D134: 1, D051: 1, '5013': 1, D004: 1, D014: 1,
    FF03: 1, D009: 1,  // round 3, 2026-11-18: the camera showed peaking Off for 0 and flash sync Start of Exp. for 0
    D037: 1, D038: 1, D039: 1, D03A: 1, FF16: 1, FF17: 1 };
  function mapOf(o) { return function (v) { return Object.prototype.hasOwnProperty.call(o, v) ? o[v] : undefined; }; }
  // optional: an older Q2 file without the code is left alone without a line about it
  function q2(mCode, qCode, toQ, fromQ, more) { return entry(mCode, toQ, fromQ, Object.assign({ q: qCode, untested: true, optional: true }, more || {})); }
  var STEP_5 = function (k) { return typeof k === 'number' && k >= -2 && k <= 2 ? k + 3 : undefined; };
  var STEP_5_BACK = function (v) { return typeof v === 'number' && v >= 1 && v <= 5 ? v - 3 : undefined; };
  // The M's button jobs (D191) and Favorites items (D1A9) as Q2 functions, and back.
  var Q2_JOB = { 3: 65373, 4: 20499, 5: 65356, 6: 1, 7: 14, 9: 20491, 10: 20496, 11: 20495, 12: 12, 13: 12, 14: 12, 15: 20485, 17: 53552, 18: 53252,
    20: 53263, 21: 53318, 22: 65284, 89: 65299, 23: 53414, 24: 3, 26: 11, 27: 65322, 28: 8, 29: 65363 };
  var Q2_JOB_BACK = { 65373: 3, 20499: 4, 65356: 5, 1: 6, 14: 7, 20491: 9, 20496: 10, 20495: 11, 12: 12, 20485: 15, 53552: 17, 53252: 18, 53263: 20,
    53318: 21, 65284: 22, 65299: 89, 53414: 23, 3: 24, 11: 26, 65322: 27, 8: 28, 65363: 29 };
  var Q2_FAV = { 20499: 20499, 53399: 65356, 1: 1, 14: 14, 20491: 20491, 20496: 20496, 53264: 20495, 12: 12, 5: 20485, 24: 53552, 53252: 53252,
    53566: 65284, 53748: 65299, 53461: 53414, 3: 3, 53328: 53318, 11: 11, 25: 65322, 53536: 65363, 8: 8, 53280: 65358 };
  var Q2_FAV_BACK = {}; Object.keys(Q2_FAV).forEach(function (k) { Q2_FAV_BACK[Q2_FAV[k]] = +k; });
  var EMPTY = 65535, FAV_CODES = ['D054', 'D055', 'D056', 'D057', 'D058', 'D059', 'D05A', 'D05B', 'D05C', 'D05D', 'D070', 'D071', 'D072', 'D07C'];
  function hexes(from, n) { var out = []; for (var i = 0; i < n; i++) out.push((from + i).toString(16).toUpperCase()); return out; }
  // A list written across several codes (qs), one value each. get gives the whole list as the Q2 holds it.
  function listEntry(qs, label, ms, get, fromQ, set, words) {
    return { qs: qs, q: qs[0], m: ms[0], ms: ms, label: label, untested: true, quiet: true, words: words,
      get: get, set: set || function () {}, toQ: function (k) { return k; }, fromQ: fromQ || function () { return undefined; }, ok: function () { return true; } };
  }
  // A button: the function it starts on (cur), then its list, its own job first and the M's other button jobs after,
  // without repeats; written together, since the camera keeps the function it starts on in the list. None when its
  // own job has no Q2 function. Reading a Q file, the function it starts on becomes the M button's job.
  function buttonList(cur, qs, own, label) {
    return listEntry([cur].concat(qs), label, [own, 'D191', 'D193', 'D195'], function (S, p) {
      if (!S[own] || Q2_JOB[S[own][p]] === undefined) return undefined;
      var l = [];
      [own, 'D191', 'D193', 'D195'].forEach(function (c) { var v = S[c] ? Q2_JOB[S[c][p]] : undefined; if (v !== undefined && l.indexOf(v) < 0) l.push(v); });
      while (l.length < qs.length) l.push(EMPTY);
      return [l[0]].concat(l);
    }, function (vals) { return Q2_JOB_BACK[vals[0]]; }, function (S, p, k) { if (S[own] && k !== undefined) S[own][p] = k; },
    { code: 'D191', back: Q2_JOB_BACK, empty: EMPTY, skip: 1 });
  }
  var Q2_FILM = [['D08A', 'FF05'], ['D08B', 'FF06'], ['D08C', 'FF07'], ['D08D', 'FF08'], ['D08E', 'FF09'], ['D08F', 'FF0A'], ['D090', 'FF0B'], ['D091', 'FF0C'],
    ['D092', 'FF0D'], ['D093', 'FF0E'], ['D094', 'FF0F'], ['D0B0', 'FF10'], ['D0B1', 'FF11']];
  var PEAK = { 0: 1, 2: 2, 1: 3, 3: 4 }, PEAK_BACK = { 1: 0, 2: 2, 3: 1, 4: 3 };  // the M's Red 0, Green 2, Blue 1, White 3
  var Q2_ADD = [
    entry('D01A', AUTO_REVIEW, AUTO_REVIEW),
    { q: 'FF03', m: 'D165', ms: ['D165', 'D11E'], label: 'Focus peaking', untested: false, synth: true, qWords: { 0: 'Off', 1: 'Red', 2: 'Green', 3: 'Blue', 4: 'White' },
      get: function (S, p) { return S.D165 && S.D11E ? (S.D165[p] ? PEAK[S.D11E[p]] : 0) : undefined; },
      set: function (S, p, k) { if (!S.D165 || !S.D11E) return; if (!k) S.D165[p] = 0; else { S.D165[p] = 1; S.D11E[p] = PEAK_BACK[k]; } },
      toQ: function (k) { return k; }, fromQ: oneOf([0, 1, 2, 3, 4]), ok: function () { return true; } },
    q2('D13E', 'FF04', oneOf([1, 2, 3, 4, 5]), oneOf([1, 2, 3, 4, 5]), { untested: false })  // 4 showed as BW Nat
  ].concat(Q2_FILM.map(function (x) { return q2(x[0], x[1], STEP_5, STEP_5_BACK); })).concat([
    q2('D134', 'D134', ON_OFF, ON_OFF, { untested: false }),
    q2('D009', 'D009', ON_OFF, ON_OFF, { untested: false }),
    q2('D108', 'D024', mapOf({ 0: 0, 30: 2, 60: 2, 120: 2, 300: 5, 600: 10, 1800: 10, 3600: 10 }), mapOf({ 0: 0, 2: 120, 5: 300, 10: 600 }),
      { qWords: { 0: 'Off', 2: '2 min', 5: '5 min', 10: '10 min' } }),
    q2('D0A2', 'FF2A', mapOf({ 0: 2, 1: 3, 2: 1, 3: 3 }), mapOf({ 2: 0, 1: 2, 3: 1 })),  // LCD 1 and Auto 2 seen; 0 refused; 3 most likely EVF
    q2('D0D5', 'D0A6', mapOf({ 0: 0, 1: 1, 2: 2 }), mapOf({ 0: 0, 1: 1, 2: 2 }), { qWords: { 0: 'Off', 2: 'Extended' }, untested: function (v) { return v === 1; } }),  // 0 showed as Off
    q2('D077', 'FF42', mapOf({ 0: 0, 1: 2 }), mapOf({ 0: 0, 2: 1 })),
    q2('D01E', 'FF2B', function (k) { return k >= 10 && k <= 20 ? k - 9 : undefined; }, function (v) { return v >= 1 && v <= 11 ? v + 9 : undefined; }, { quiet: true }),
    q2('D01E', 'FF2C', function (k) { return k === 5 ? 0 : k >= 10 && k <= 20 ? 1 : undefined; }, function (v) { return v === 0 ? 5 : undefined; }, { qWords: { 0: 'Auto', 1: 'Set by hand' } }),
    buttonList('FF48', hexes(0xFF32, 8), 'D191', 'FN Button'),
    buttonList('FF49', hexes(0xFF3A, 8), 'D195', 'Right Wheel Button'),
    listEntry(FAV_CODES, 'Favorites', ['D1A9'], function (S, p) {
      if (!S.D1A9 || !S.D1A9[p]) return undefined;
      var l = [];
      S.D1A9[p].items.forEach(function (it) { var v = Q2_FAV[it]; if (v !== undefined && l.indexOf(v) < 0) l.push(v); });
      l = l.slice(0, FAV_CODES.length); while (l.length < FAV_CODES.length) l.push(0);
      return l;
    }, function (vals) {
      return vals.filter(function (v) { return v && Q2_FAV_BACK[v] !== undefined; }).map(function (v) { return Q2_FAV_BACK[v]; }).slice(0, E.FAVORITES_MAX);
    }, function (S, p, k) { if (S.D1A9 && S.D1A9[p]) S.D1A9[p] = { value: S.D1A9[p].value, items: k }; }, { code: 'D1A9', back: Q2_FAV_BACK, empty: 0 })
  ]);
  var Q2_OVER = {
    D0AD: { q: 'FF16' }, D0AE: { q: 'FF17' },
    D00C: { toQ: LENS_LIMITS, fromQ: LENS_LIMITS },  // the Q2 keeps the M's 1/f limits
    '500B': { toQ: mapOf({ 0: 0, 1: 1, 2: 2, 32769: 2049 }), fromQ: mapOf({ 0: 0, 1: 1, 2: 2, 2049: 32769 }), untested: function (v) { return v === 2049; } },  // Highlight-weighted: a Q2 file holds 2049
    D02F: null, '501E': null, '501F': null,  // a Q2's copyright switch holds 2, which the M doesn't use
    D0C4: { q: 'FF28' }, D139: { q: 'FF27' }, D13A: { q: 'FF29', toQ: ON_OFF, fromQ: ON_OFF },
    D01F: { q: 'FF26', toQ: function (k) { return k ? 1 : 0; }, fromQ: ON_OFF, qWords: { 0: 'Off', 1: 'On' } },
    D15E: null, D165: null, D196: null, D0D5: null, D01E: null, D108: null  // other codes on a Q2 (Q2_ADD), or none
  };
  LAYOUTS.slice(1).forEach(function (l) { l.slice(0, 6).forEach(function (c) { Q2_OVER[c] = null; }); });
  // ---------- more for the Q3 ----------
  // The Q3 keeps many settings in the M's own codes with the M's values (the code book, docs/leica-q3-codes.json):
  // peaking colors, EVF-LCD and EVF brightness, eye sensor, flash sync, the self-timer and Auto Review (each with an
  // on/off switch of its own), the thumbwheel in A. Its buttons and Favorites use the M's button job numbers, where the
  // names match. No Q3 has imported a file from Msetter, so every Q3 setting is untested.
  var Q3_JOB = { 3: 46, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 17: 16, 18: 18, 19: 19, 21: 21, 86: 88, 89: 56,
    23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29 };
  var Q3_JOB_BACK = {}; Object.keys(Q3_JOB).forEach(function (k) { if (!(Q3_JOB[k] in Q3_JOB_BACK)) Q3_JOB_BACK[Q3_JOB[k]] = +k; });
  var Q3_FAV = { 20499: 4, 53399: 5, 1: 6, 14: 7, 9: 8, 20491: 9, 20496: 10, 53264: 11, 12: 12, 5: 15, 24: 16, 53252: 18, 53654: 19, 53328: 21, 53461: 23,
    3: 24, 53313: 25, 11: 26, 25: 27, 8: 28, 53536: 29, 53280: 46, 53748: 56, 53655: 88 };
  var Q3_FAV_BACK = {}; Object.keys(Q3_FAV).forEach(function (k) { Q3_FAV_BACK[Q3_FAV[k]] = +k; });
  var REVIEW_Q3 = oneOf([1, 3, 5, -1, -3]);
  var Q3_ADD = [
    entry('D01A', function (k) { return k === 0 ? undefined : REVIEW_Q3(k); }, REVIEW_Q3, { quiet: true }),
    entry('D01A', function (k) { return k === 0 ? 0 : AUTO_REVIEW(k) !== undefined ? 1 : undefined; }, function (v) { return v === 0 ? 0 : undefined; }, { q: 'D03F', qWords: { 0: 'Off', 1: 'On' } }),
    entry('D097', function (k) { return k === 3 || k === 1 ? k : undefined; }, oneOf([3, 1]), { quiet: true }),
    entry('D097', function (k) { return k === 0 ? 0 : k === 3 || k === 1 ? 1 : undefined; }, function (v) { return v === 0 ? 0 : undefined; }, { q: 'D32D', qWords: { 0: 'Off', 1: 'On' } }),
    entry('D11E', oneOf([0, 1, 2, 3]), oneOf([0, 1, 2, 3])), entry('D19E', oneOf([0, 1, 2, 3]), oneOf([0, 1, 2, 3])),
    entry('D19F', oneOf([0, 1, 2, 3]), oneOf([0, 1, 2, 3])), entry('D1A0', oneOf([0, 1, 2, 3]), oneOf([0, 1, 2, 3])),
    entry('D0A2', oneOf([0, 1, 2, 3]), oneOf([0, 1, 2, 3])), entry('D133'), entry('D134', ON_OFF, ON_OFF), entry('D009', ON_OFF, ON_OFF),
    entry('D077', mapOf({ 1: 1 }), mapOf({ 1: 1 }), { q: 'D1EF' }),  // the thumbwheel in A and in M: Exposure Compensation
    entry('D077', mapOf({ 1: 1 }), mapOf({ 1: 1 }), { q: 'D1F1' }),
    // the same code with the M's values on the Q3: interval countdown, flash exposure compensation, maximum ISO and
    // shutter speed limit with flash, JPG noise reduction, digital zoom, USB charging, connectivity, language, focus aid
    // (Auto Magnification on the Q3), and the contrast, sharpness and saturation of each film style
    entry('D06E'), entry('D041'), entry('D0D3'), entry('D003'), entry('D081'), entry('D050'), entry('D17A'), entry('D1FC'), entry('D036'),
    entry('D020', ON_OFF, ON_OFF)
  ].concat(['D08A', 'D08B', 'D08C', 'D08D', 'D08E', 'D08F', 'D090', 'D091', 'D092', 'D093', 'D094', 'D0B0', 'D0B1'].map(function (c) {
    return entry(c, oneOf([-2, -1, 0, 1, 2]), oneOf([-2, -1, 0, 1, 2]));
  })).concat([
    // film style: the Q3 counts from 0 (Standard) where the M counts from 1
    entry('D13E', function (k) { return k >= 1 && k <= 5 ? k - 1 : undefined; }, function (v) { return v >= 0 && v <= 4 ? v + 1 : undefined; }),
    // the M's ISO setting (the ISO dial's M position, the M-EV1's ISO) is the Q3's ISO: 0 Auto or a number
    entry('D010', function (k) { return k === 0 || (k >= 50 && k <= 100000) ? k : undefined; }, function (v) { return v === 0 || (v >= 50 && v <= 100000) ? v : undefined; }, { q: '500F' }),
    entry('D191', mapOf(Q3_JOB), mapOf(Q3_JOB_BACK)), entry('D193', mapOf(Q3_JOB), mapOf(Q3_JOB_BACK)),
    entry('D195', mapOf(Q3_JOB), mapOf(Q3_JOB_BACK), { q: 'D1D6' })  // the M's thumbwheel press is the Q3's thumbwheel button
  ]).concat([
    listEntry(FAV_CODES, 'Favorites', ['D1A9'], function (S, p) {
      if (!S.D1A9 || !S.D1A9[p]) return undefined;
      var l = [];
      S.D1A9[p].items.forEach(function (it) { var v = Q3_FAV[it]; if (v !== undefined && l.indexOf(v) < 0) l.push(v); });
      l = l.slice(0, FAV_CODES.length); while (l.length < FAV_CODES.length) l.push(0);
      return l;
    }, function (vals) {
      return vals.filter(function (v) { return v && Q3_FAV_BACK[v] !== undefined; }).map(function (v) { return Q3_FAV_BACK[v]; }).slice(0, E.FAVORITES_MAX);
    }, function (S, p, k) { if (S.D1A9 && S.D1A9[p]) S.D1A9[p] = { value: S.D1A9[p].value, items: k }; }, { code: 'D1A9', back: Q3_FAV_BACK, empty: 0 })
  ]);
  var MODEL = {
    Q3: { need: FIRMWARE_4, add: Q3_ADD, tested: {} }, 'Q3 43': { need: FIRMWARE_4, add: Q3_ADD, tested: {} },
    Q2: { need: [], over: Q2_OVER, add: Q2_ADD, tested: Q2_TESTED }
  };
  var BY_MODEL = {};
  function entriesFor(model) {
    var mm = MODEL[model] || {}, over = mm.over || {};
    if (!mm.over && !mm.add) return ENTRIES;
    return BY_MODEL[model] || (BY_MODEL[model] = ENTRIES.filter(function (e) { return over[e.q] !== null; })
      .map(function (e) { return Object.assign({}, e, over[e.q] || {}); }).concat(mm.add || []).map(function (e) {
        if (mm.tested && e.untested === undefined) e.untested = !mm.tested[e.q];
        return e;
      }));
  }
  // Whether a value Msetter writes into a model's file has been seen to work on a camera.
  function untested(e, v) { return typeof e.untested === 'function' ? e.untested(v) : !!e.untested; }
  // The codes of the six profile names in a model's file.
  function nameCodes(model) { return E.NAME_CODES.map(function (c) { var o = (MODEL[model] || {}).over; return o && o[c] ? o[c].q : c; }); }
  function slotOf(e, p) { return e.name ? 0 : p; }
  function okOnM(e, model, k) { return e.ok ? e.ok(model, k) : !!E.rule(model, e.m) && E.legal(E.rule(model, e.m), k); }
  function unset(v) { return v === 255 || v === -1; }

  // The design's settings written into the owner's Q3 file. A setting is written when the design's value differs from
  // `base` (the design as it came from this file, or the M's factory settings): untouched settings keep the Q3's own
  // values. Only the design's profiles are written, never the live slot. Left alone, and listed:
  //  - none: the Q3 has no such value (white balance HMI, a 6 x 4 grid);
  //  - unset: the Q3 profile holds 255 or -1 there, which means it doesn't keep that setting;
  //  - video: the Q3 profile was saved in video mode (D68A), so its photo settings stay;
  //  - missing: the file has no such code.
  // A placeholder profile name ("Profile 3", "User3") is never written over the owner's own name. When artist or
  // copyright text is written, the copyright on/off switch goes with it, so the Q3 doesn't stamp text the M had off.
  // notes: values that change on the way (an ISO the Q3 doesn't have, a 1/f limit that becomes the lens's speed).
  // Returns { text, model, changes: [{ code, entry, p, slot, from, to, k }], skipped: [{ entry, p, k, why }], notes }.
  var PLACEHOLDER = /^(Profile ?|User ?)\d$/;
  function merge(text, doc, base) {
    var f = read(text), entries = entriesFor(f.model), changes = [], skipped = [], notes = [], video = f.S.D68A || [];
    function put(e, p, k, force) {
      var a = f.S[e.q], slot = slotOf(e, p);
      if (e.qs) {  // a list across several codes: written whole
        if (e.qs.some(function (c) { return !f.S[c] || f.S[c].length <= slot; }) || video[p] === 1) return;
        var vs = e.toQ(k, f.model); if (!vs) return;
        e.qs.forEach(function (c, i) {
          var b = f.S[c]; if (b[slot] === vs[i]) return;
          changes.push({ code: c, entry: e, p: p, slot: slot, from: b[slot], to: vs[i], k: k, all: vs });
          b[slot] = vs[i];
        });
        return;
      }
      if (!a || a.length <= slot) { if (!e.quiet && !e.optional) skipped.push({ entry: e, p: p, k: k, why: 'missing' }); return; }
      if (!e.name && video[p] === 1) { skipped.push({ entry: e, p: p, k: k, why: 'video' }); return; }
      var v = e.toQ(k, f.model);
      if (v === undefined) { if (!e.quiet) skipped.push({ entry: e, p: p, k: k, why: 'none' }); return; }
      if (!e.text && unset(a[slot]) && !okOnM(e, doc.model, e.fromQ(a[slot]))) { skipped.push({ entry: e, p: p, k: k, why: 'unset' }); return; }  // -1 is Permanent in Auto Review
      if (e.qValue && e.fromQ(v) !== k && !force) notes.push({ entry: e, p: p, k: k, v: v, why: 'converted' });
      if (v === a[slot]) return;
      changes.push({ code: e.q, entry: e, p: p, slot: slot, from: a[slot], to: v, k: k });
      a[slot] = v;
    }
    E.profiles(doc).forEach(function (p) {
      entries.forEach(function (e) {
        if (e.name && e.name !== p) return;
        var k = e.get(doc.S, p);
        if (k === undefined || same(k, e.get(base, p))) return;
        if (e.name && PLACEHOLDER.test(k)) return;
        put(e, p, k);
      });
      // copyright text written: write the on/off switch too, even at its factory value
      if (changes.some(function (c) { return c.p === p && c.entry.text && !c.entry.name; }) && !changes.some(function (c) { return c.p === p && c.entry.copyright; })) {
        var cr = entries.filter(function (e) { return e.copyright; })[0], k = cr && cr.get(doc.S, p);
        if (k !== undefined) put(cr, p, k, true);
      }
    });
    return { text: write(f), model: f.model, changes: changes, skipped: skipped.filter(function (s, i) {
      return s.why !== 'video' || !skipped.slice(0, i).some(function (t) { return t.why === 'video' && t.p === s.p; });  // one video line per profile
    }), notes: notes };
  }

  // A design made from a Q3 file: start (the M's factory settings unless given), the Q's profiles that have names of
  // their own (User3 is a placeholder), and every shared setting the M can hold.
  function designFrom(text, modelName, start) {
    var f = read(text), entries = entriesFor(f.model), doc = start ? JSON.parse(JSON.stringify(start)) : E.blank(modelName), n = 0;
    var named = nameCodes(f.model).map(function (c, i) { return f.S[c] && typeof f.S[c][0] === 'string' && !PLACEHOLDER.test(f.S[c][0]) ? i + 1 : 0; }).filter(Boolean);
    E.setProfiles(doc, named.length ? named : [1]); doc.S.D124 = [named[0] || 1];
    for (var p = 1; p <= 6; p++) {
      entries.forEach(function (e) {
        if (e.name && e.name !== p) return;
        var a = f.S[e.q]; if (!a) return;
        var k = e.qs ? e.fromQ(e.qs.map(function (c) { return f.S[c] ? f.S[c][p] : undefined; })) : e.fromQ(a[slotOf(e, p)]);
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
    b.codes.forEach(function (code, i) {
      if (b.codes.indexOf(code) !== i) return;  // a code written twice is compared once
      var x = a.S[code], y = b.S[code];
      if (same(x, y)) return;
      if (!x || x.length !== y.length || (y.length !== 7 && y.length !== 1)) { out.push({ code: code, slot: null, a: x, b: y }); return; }
      for (var i = 0; i < y.length; i++) if (!same(x[i], y[i])) out.push({ code: code, slot: y.length === 1 ? 'all' : i, a: x[i], b: y[i] });
    });
    a.codes.forEach(function (code, i) { if (a.codes.indexOf(code) === i && !(code in b.S)) out.push({ code: code, slot: null, a: a.S[code], b: undefined }); });
    return out;
  }
  // After an import and a new export: what the camera did with each value Msetter wrote, and what else differs.
  // A Q2 keeps Favorites and button lists in its own order (2026-11-18: every item kept, the order changed), so a list
  // counts as kept when it holds the same items; a button's starting function is compared on its own.
  function check(saved, newText) {
    var f = read(newText), was = read(saved.text), all = compare(saved.text, newText), lists = {};
    entriesFor(f.model).forEach(function (e) { if (e.qs) e.qs.forEach(function (c, i) { if (!(e.words && e.words.skip && i < e.words.skip)) lists[c] = e; }); });
    var items = function (S, e, slot) {
      return e.qs.slice(e.words && e.words.skip || 0).map(function (c) { return S[c] ? S[c][slot] : undefined; }).filter(function (v) { return v !== e.words.empty; }).sort();
    };
    var rows = saved.changes.map(function (c) {
      var a = f.S[c.code], back = a ? a[c.slot] : undefined, e = lists[c.code];
      return { code: c.code, slot: c.slot, p: c.p, sent: c.to, back: back, kept: e ? same(items(was.S, e, c.slot), items(f.S, e, c.slot)) : back === c.to };
    });
    var other = all.filter(function (d) {
      if (lists[d.code] && typeof d.slot === 'number' && same(items(was.S, lists[d.code], d.slot), items(f.S, lists[d.code], d.slot))) return false;  // the same list, reordered
      return !saved.changes.some(function (c) { return c.code === d.code && (c.slot === d.slot || (d.slot === 'all' && c.slot === 0)); });
    });
    return { rows: rows, other: other };
  }

  // ---------- the experiment's state ----------
  // Per Q model the page keeps the owner's file: held = { text, name, at, saved: { text, changes, at } } (src/q3page.js),
  // outside the design and its Undo. The design records which file it came from in origin.q3 (the model) and origin.q3at
  // (that file's `at`). Every decision about them is made here, so it can be tested without a page. docs/state.md has the map.
  function canWrite(text) { try { return !writable(text); } catch (e) { return false; } }
  // What opening a Q3 file does, given what is held for its model:
  //  first:   nothing held, or the held file can't be written and this one can: hold it and show the Q3 sheet;
  //  again:   it is the file Msetter saved: hold nothing new, say to import it first;
  //  check:   Msetter saved a file after the held one was opened: show what the camera kept of it;
  //  compare: two exports: show which settings differ.
  // keep: whether the new file becomes the held one (a file Msetter can't write never replaces one it can).
  function openPlan(held, text) {
    if (!held) return { mode: 'first', keep: true };
    if (held.saved && text === held.saved.text) return { mode: 'again', keep: false };
    var oldOk = canWrite(held.text), newOk = canWrite(text);
    if (!oldOk && newOk) return { mode: 'first', keep: true };
    return { mode: held.saved && held.saved.at > held.at ? 'check' : 'compare', keep: newOk || !oldOk };
  }
  // Which design values Save compares with: the design as it came from this model's file, else the M's factory settings.
  function baseFor(origin, m, factoryS) { return origin && origin.q3 === m ? origin.S : factoryS; }
  // Whether the design came from the very file held for this model (not an earlier one, not another model's).
  function designFrom_(origin, m, held) { return !!(origin && held && origin.q3 === m && origin.q3at === held.at); }

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
  function slotWords(s) { return s === null ? 'list' : s === 'all' ? 'all' : s === 0 ? 'now' : String(s); }
  // o: { camera, codes, firmware, did, check: { rows, other } or diffs: [...] }
  // One line per value, codes and numbers only, so most reports fit in a mail link. Codes that aren't four hex digits
  // (a hand-edited file) are shown as (other), so no typed text reaches the report.
  function codeOf(c) { return /^[0-9A-F]{4}$/.test(c) ? c : '(other)'; }
  function report(o) {
    var L = ['Camera: ' + o.camera, 'Firmware: ' + (o.firmware || 'not given'), 'Codes in the file: ' + o.codes, 'Notes: ' + (o.did || 'none'), ''];
    if (o.check) {
      L.push('Msetter sent, camera returned (code, profile, sent, returned):');
      o.check.rows.forEach(function (r) { L.push([codeOf(r.code), slotWords(r.slot), shown(r.sent), shown(r.back), r.kept ? 'kept' : 'not kept'].join(' ')); });
      L.push('');
    }
    var diffs = o.check ? o.check.other : o.diffs;
    L.push((o.check ? 'Other differences' : 'Differences') + ' (code, profile, before, after):');
    if (!diffs.length) L.push('none');
    diffs.forEach(function (d) { L.push([codeOf(d.code), slotWords(d.slot), shown(d.a), shown(d.b)].join(' ')); });
    return L.join('\n');
  }
  // A new GitHub issue with the report filled in, or null when the address would be too long for a browser.
  function issueUrl(title, body) {
    var url = ISSUES + '?template=q3-report.md&labels=q3-report&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    return url.length > 7500 ? null : url;
  }
  // An email to the reports address with the report filled in, or null when the link would be too long for some
  // mail programs.
  function mailUrl(title, body) {
    var url = 'mailto:' + REPORTS + '?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    return url.length > 2000 ? null : url;
  }
  function blankIssueUrl(title) { return ISSUES + '?template=q3-report.md&labels=q3-report&title=' + encodeURIComponent(title); }

  var Q3 = { MODELS: MODELS, CAMERAS: CAMERAS, ENTRIES: ENTRIES, entriesFor: entriesFor, untested: untested, nameCodes: nameCodes, cameraOf: cameraOf, read: read, write: write, writable: writable,
    merge: merge, designFrom: designFrom, compare: compare, check: check, report: report, nameOf: nameOf, shown: shown,
    slotWords: slotWords, issueUrl: issueUrl, blankIssueUrl: blankIssueUrl, mailUrl: mailUrl, REPORTS: REPORTS,
    canWrite: canWrite, openPlan: openPlan, baseFor: baseFor, designIsFrom: designFrom_ };
  if (typeof module !== 'undefined' && module.exports) module.exports = Q3;
  else root.Q3 = Q3;
})(typeof window !== 'undefined' ? window : globalThis);
