// Words: what the page calls each setting and value, the buttons whose job you can set, and counts.
// One place for them, so the table, the menus, the drawing and the Save sheet say the same thing.
// Runs in the browser (window.Words) and in Node (module.exports) so the tests use the same code.
(function (root) {
  'use strict';
  var E = root.Engine || require('./engine.js');
  var C = root.CATALOGUE || require('./catalogue.js');

  var ROW_SHORT = {}, ROW_NAME = {};
  C.themes.forEach(function (t) { t.rows.forEach(function (r) { if (r.code) { ROW_NAME[r.code] = r.name; if (r.short) ROW_SHORT[r.code] = r.short; } }); });

  // A value as the page shows it: the row's own short form, else the camera's name made shorter (ISO 800 is 800).
  function short(code, v) {
    if (ROW_SHORT[code] && ROW_SHORT[code][v] !== undefined) return ROW_SHORT[code][v];
    var t = E.label(code, v);
    return C.SHORT[code] ? C.SHORT[code](t) : t;
  }
  // The screen layouts' settings: "Screen layout 2 peaking color".
  var LAYOUT_PART = { bars: 'info bars', grid: 'grid', gridFmt: 'grid type', clip: 'clipping', clipLimit: 'clipping limit', peak: 'peaking',
    peakColor: 'peaking color', peakSens: 'peaking sensitivity', horizon: 'horizon', histo: 'histogram' };
  var LAYOUT_NAME = {};
  C.LAYOUTS.forEach(function (L, li) { for (var k in L) LAYOUT_NAME[L[k]] = 'Screen layout ' + (li + 1) + ' ' + (LAYOUT_PART[k] || k); });
  // Film style tuning: "Saturation for Natural", for the style the code belongs to.
  var STYLE_NAME = {};
  Object.keys(C.STYLE || {}).forEach(function (k) { C.STYLE[k].forEach(function (c, i) { if (c) STYLE_NAME[c] = ['Contrast', 'Sharpness', 'Saturation'][i] + ' for ' + E.label('D13E', +k); }); });
  // A setting's name: the page's own, a screen layout's, a film style's tuning, else the camera's.
  function rowName(code) { return ROW_NAME[code]; }
  function settingName(code) { return ROW_NAME[code] || LAYOUT_NAME[code] || STYLE_NAME[code] || E.RULES.names[code] || code; }

  // Words put into markup: & < > and " written as entities.
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // "1 item", "3 items"
  function count(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  // "A", "A and B", "A, B and C"
  function listOf(t) { return t.length > 1 ? t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1] : t[0]; }

  // The buttons whose job you can set, in the order the list under the drawing shows them.
  // ctl: the control on the drawing. also: the name inside a sentence ("Also on the top button").
  // lever: only bodies with a front lever (the M-EV1). edit: a sheet to open instead of a list of jobs.
  var BUTTONS = [
    { ctl: 'top', code: 'D193', name: 'Top button', also: 'top button' },
    { ctl: 'fn', code: 'D191', name: 'FN button', also: 'FN button' },
    { ctl: 'wheel', code: 'D195', name: 'Thumbwheel press', also: 'thumbwheel press' },
    { ctl: 'wheel', code: 'D077', name: 'Thumbwheel turn' },
    { ctl: 'lever-in', code: 'D1D6', name: 'Front lever toward lens', also: 'front lever toward the lens', lever: true },
    { ctl: 'lever-out', code: 'D1D7', name: 'Front lever away from lens', also: 'front lever away from the lens', lever: true },
    { ctl: 'menu', code: 'D1A9', name: 'Menu button', edit: 'favorites' },
    { ctl: 'center', code: 'D15E', name: 'Center button', edit: 'layouts' }
  ];

  // The parts a part set changes (kind in PART_SETS): the name on its own, and inside a sentence.
  var PART_KINDS = { buttons: { name: 'Buttons', also: 'buttons' }, favorites: { name: 'Favorites', also: 'Favorites' }, layouts: { name: 'Screen layouts', also: 'screen layouts' } };

  // What Msetter is, in the same words in the app's About and on the project page's footer (tools/build_site.py
  // writes the footer from these lines): what it makes, that it is private, free, who made it, and that it is not Leica's.
  var ABOUT = [
    'Msetter is a free app for setting up Leica M11, M11-P, M11 Monochrom and M-EV1 cameras. It saves a settings file that the camera imports from its card.',
    'Your profiles stay in this browser, and nothing leaves your computer unless you send a report.',
    'Made by Timo Arnall and free under the MIT license.',
    'Msetter isn’t made by or connected to Leica Camera AG. Leica, M11, M11-P, M11 Monochrom, M-EV1, Q2, Q3, Q3 43, Visoflex and FOTOS are its trademarks.'
  ];
  var HELP_URL = 'https://github.com/timoarnall/msetter/blob/main/docs/if-something-goes-wrong.md';

  var Words = { ABOUT: ABOUT, HELP_URL: HELP_URL, esc: esc, short: short, settingName: settingName, rowName: rowName, count: count, listOf: listOf, BUTTONS: BUTTONS, PART_KINDS: PART_KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Words;
  else root.Words = Words;
})(typeof window !== 'undefined' ? window : globalThis);
