// The camera panel: a drawing of the top and back, a screen that shows a profile the way the camera does,
// and a list of what each button does in the selected profile.
// Buttons you can set are drawn in the accent color. Click one to change its job or try it; click the others to press them.
// The drawing is in millimeters, measured from scaled photos of the bodies.
// The screen is a sketch of the camera's own screens over one of Timo's photos; it shows the selected profile's values.
var Camera = (function () {
  'use strict';
  var sim = { lv: false, panel: null, hi: 0, toast: '', toastTimer: 0, layout: 0, menu: 0, zoom: false, peak: false, ev: 0, crop: 0 };
  var ctx = null, root = null, tipEl = null, shown = '';

  // Buttons whose job you can set, and the settings that hold the jobs.
  var JOBS = { top: ['D193'], fn: ['D191'], wheel: ['D195', 'D077'], 'lever-in': ['D1D6'], 'lever-out': ['D1D7'] };
  var NAMES = { top: 'Top button', fn: 'FN button', wheel: 'Thumbwheel', 'lever-in': 'Front lever toward lens', 'lever-out': 'Front lever away from lens',
    play: 'Play button', menu: 'Menu button', pad: 'Direction pad', center: 'Center button', shutter: 'Shutter button', frame: 'Frame selector lever' };
  // The list under the drawing: one line per job.
  var LIST = Words.BUTTONS;

  var esc = Words.esc;
  // A value of the profile shown, or of another profile (slot) for a layout preview, as stored and as the page says it.
  function v(code, slot) { return Engine.get(ctx.doc, code, slot === undefined ? ctx.slot : slot); }
  function has(code) { return !!ctx.doc.S[code] && !!Engine.rule(ctx.doc.model, code); }
  function L(code, slot) { return Words.short(code, v(code, slot)); }
  function isEVF() { return ctx.model === 'M-EV1'; }
  var EDIT = { menu: { what: 'favorites', code: 'D1A9', label: 'Change Favorites…' }, center: { what: 'layouts', code: 'D15E', label: 'Change the screen layouts…' } };
  function settable(c) { return (!!JOBS[c] && (isEVF() || c.indexOf('lever') < 0) && JOBS[c].some(has)) || (!!EDIT[c] && has(EDIT[c].code)); }
  function listRows() { return LIST.filter(function (r) { return (!r.lever || isEVF()) && has(r.code); }); }

  // ---------- drawing ----------
  // A control: the visible shape plus a larger invisible target, at least 12 mm (24 px at the drawing's size), so small buttons
  // are easy to hit; the target's outline is also the focus ring. A control drawn in both views is one tab stop: copy skips the second.
  function ctl(name, shape, hit, copy) {
    var job = settable(name);
    return '<g class="ctl' + (job ? ' job' : '') + '" data-ctl="' + name + '" tabindex="' + (copy ? -1 : 0) + '" role="button" aria-label="' + esc(NAMES[name]) + '">' + shape + hit + '</g>';
  }
  // Small drawing helpers. n(x) keeps the numbers short.
  function n(x) { return Math.round(x * 100) / 100; }
  function knurl(cx, cy, r1, r2, count) {  // short radial lines round the rim of a dial
    var d = '';
    for (var i = 0; i < count; i++) { var a = i / count * Math.PI * 2, c = Math.cos(a), si = Math.sin(a); d += 'M' + n(cx + r1 * c) + ' ' + n(cy + r1 * si) + 'L' + n(cx + r2 * c) + ' ' + n(cy + r2 * si); }
    return '<path class="knurl" d="' + d + '"/>';
  }
  function marks(cx, cy, r, count, from, to, size) {  // dots for the numbers on a dial, from and to in degrees, 0 at the back
    var s = '';
    for (var i = 0; i < count; i++) { var a = (from + (to - from) * i / (count - 1) + 90) * Math.PI / 180; s += '<circle class="mark" cx="' + n(cx + r * Math.cos(a)) + '" cy="' + n(cy + r * Math.sin(a)) + '" r="' + (size || 0.55) + '"/>'; }
    return s;
  }
  function ridges(x, y, w, h, count) {  // the knurled side of a dial or wheel seen edge on
    var d = '';
    for (var i = 1; i < count; i++) d += 'M' + n(x + w * i / count) + ' ' + n(y + 0.6) + 'v' + n(h - 1.2);
    return '<path class="knurl" d="' + d + '"/>';
  }
  function hasIsoDial() { return ctx.model === 'M11' || ctx.model === 'M11-P' || ctx.model === 'M11 Monochrom'; }

  // Two views that line up: the top seen from above with the front edge at the top, and the back.
  // Everything is placed in millimeters from the left end of the body, so a dial sits at the same x in both.
  // Measured from scaled photos of the M-EV1 and M11-P.
  var X = { shoe: 61, shoeW: 18, dial: 94, dialR: 10.5, rel: 115.3, relR: 8, top: 129.5, iso: 7.8, isoR: 7, lever: 30.5, mount: 36, mountW: 49.5 };
  function drawing() {
    var B = 50, s = '<svg viewBox="-1 -14 141 145" role="group" aria-label="Camera controls">';

    // ---- top, from above ----
    // what sticks out at the back edge: the eyepiece and the thumb rest
    if (isEVF()) s += '<rect class="part" x="9.6" y="31" width="28.8" height="9" rx="2.5"/>';
    else s += '<rect class="part" x="15.5" y="31" width="16.4" height="8.4" rx="2.5"/>';
    s += '<rect class="part" x="110" y="31" width="26" height="8" rx="3"/>';
    // what sticks out at the front edge: the lens mount
    s += '<rect class="part" x="' + X.mount + '" y="-6.5" width="' + X.mountW + '" height="8" rx="1.6"/>';
    s += '<rect class="shell" x="0" y="0" width="139" height="36" rx="16"/>';
    if (hasIsoDial()) s += '<circle class="part" cx="' + X.iso + '" cy="17.5" r="' + X.isoR + '"/>' + knurl(X.iso, 17.5, X.isoR - 1.1, X.isoR - 0.2, 28) + marks(X.iso, 17.5, 4.3, 7, -50, 230) +
      '<circle class="mark" cx="' + n(X.iso + X.isoR + 1.5) + '" cy="17.5" r="0.6"/>';   // index beside the dial, at A
    s += '<rect class="part" x="' + X.shoe + '" y="17" width="' + X.shoeW + '" height="19" rx="1.4"/>';
    s += '<circle class="part" cx="' + X.dial + '" cy="14.5" r="' + X.dialR + '"/>' + knurl(X.dial, 14.5, X.dialR - 1.3, X.dialR - 0.2, 40) + marks(X.dial, 14.5, 7.3, 11, 120, 420);
    s += '<circle class="mark" cx="' + n(X.dial - X.dialR - 1.6) + '" cy="14.5" r="0.6"/>';                          // index beside the dial, at A
    s += '<circle class="part" cx="' + X.rel + '" cy="12.5" r="' + X.relR + '"/>' + knurl(X.rel, 12.5, X.relR - 1, X.relR - 0.2, 26);
    s += '<rect class="part" x="' + (X.rel - 1.4) + '" y="' + (12.5 + X.relR - 1) + '" width="2.8" height="4.4" rx="1"/>';  // on/off tab
    s += ctl('shutter', '<circle cx="' + X.rel + '" cy="12.5" r="3.5"/>', '<circle class="hit" cx="' + X.rel + '" cy="12.5" r="6"/>');
    s += ctl('top', '<circle cx="' + X.top + '" cy="10.5" r="2.9"/>', '<circle class="hit" cx="' + X.top + '" cy="10.5" r="6"/>');
    // the front lever, right against the lens mount: a knob seen from above, and its swing each way
    s += '<rect class="part" x="' + (X.lever - 1.3) + '" y="-4.6" width="2.6" height="5" rx="1"/><circle class="part" cx="' + X.lever + '" cy="-4.6" r="2.3"/>';
    if (isEVF()) {
      var ay = -10, arrow = function (dir) {  // a shaft and an open head, like an airport sign
        var a = X.lever + dir * 2.6, b = X.lever + dir * 9.6, hx = b - dir * 2.6;
        return '<path class="arrow" d="M' + n(a) + ' ' + ay + 'H' + n(b) + 'M' + n(hx) + ' ' + (ay - 2.6) + 'L' + n(b) + ' ' + ay + 'L' + n(hx) + ' ' + (ay + 2.6) + '"/>';
      };
      s += ctl('lever-out', arrow(-1), '<rect class="hit" x="' + n(X.lever - 14.3) + '" y="' + (ay - 4.2) + '" width="12" height="12" rx="3"/>');
      s += ctl('lever-in', arrow(1), '<rect class="hit" x="' + n(X.lever + 2.3) + '" y="' + (ay - 4.2) + '" width="12" height="12" rx="3"/>');
    } else s += ctl('frame', '<circle cx="' + X.lever + '" cy="-4.6" r="2.3" class="ghost"/>', '<circle class="hit" cx="' + X.lever + '" cy="-4.6" r="6"/>');

    // ---- back ----
    // the top controls seen edge on, at the same x as above
    if (hasIsoDial()) s += '<rect class="part" x="' + n(X.iso - X.isoR) + '" y="' + (B - 3) + '" width="' + (2 * X.isoR) + '" height="4" rx="1"/>';
    s += '<rect class="part" x="' + X.shoe + '" y="' + (B - 2.6) + '" width="' + X.shoeW + '" height="3.6" rx="0.8"/>';
    s += '<rect class="part" x="' + n(X.dial - X.dialR) + '" y="' + (B - 4.6) + '" width="' + (2 * X.dialR) + '" height="5.6" rx="1.2"/>';
    s += '<rect class="part" x="' + n(X.rel - X.relR) + '" y="' + (B - 3.4) + '" width="' + (2 * X.relR) + '" height="4.4" rx="1"/>';
    s += ctl('shutter', '<rect x="' + n(X.rel - 3.4) + '" y="' + (B - 5.6) + '" width="6.8" height="2.6" rx="1.2"/>', '<rect class="hit" x="' + n(X.rel - 6) + '" y="' + (B - 10) + '" width="12" height="12" rx="3"/>', true);
    s += ctl('top', '<rect x="' + n(X.top - 2.8) + '" y="' + (B - 1.8) + '" width="5.6" height="2.6" rx="1"/>', '<rect class="hit" x="' + n(X.top - 6) + '" y="' + (B - 10) + '" width="12" height="12" rx="3"/>', true);
    s += '<rect class="shell" x="0" y="' + B + '" width="139" height="80" rx="7"/>';
    if (isEVF()) {
      s += '<rect class="part" x="9.6" y="' + (B + 2) + '" width="28.8" height="16.5" rx="6.5"/><rect class="glass" x="12.6" y="' + (B + 4.6) + '" width="21.4" height="11.2" rx="3.6"/>';
      s += '<circle class="part" cx="51" cy="' + (B + 10) + '" r="3.6"/>';           // diopter wheel
    } else s += '<rect class="part" x="15.5" y="' + (B + 2) + '" width="16.4" height="16.8" rx="6"/><rect class="glass" x="18.2" y="' + (B + 5.3) + '" width="11" height="10.2" rx="2.6"/>';
    // the thumbwheel lies in a raised thumb rest, on the back surface
    s += '<rect class="part" x="110" y="' + (B + 5) + '" width="26" height="14" rx="5"/>';
    s += ctl('wheel', '<rect x="121.8" y="' + (B + 9.4) + '" width="13" height="5.6" rx="2"/>' + ridges(121.8, B + 9.4, 13, 5.6, 9).replace('class="knurl"', 'class="ridge"'),
      '<rect class="hit" x="117" y="' + (B + 5) + '" width="21" height="15" rx="4"/>');
    s += '<rect class="glass" x="33" y="' + (B + 23) + '" width="75" height="53" rx="2.5"/>';
    s += ctl('play', '<rect x="19" y="' + (B + 31) + '" width="8" height="7" rx="1.8"/>', '<rect class="hit" x="15" y="' + (B + 28.5) + '" width="16" height="12" rx="3"/>');
    s += ctl('fn', '<rect x="19" y="' + (B + 45.5) + '" width="8" height="7" rx="1.8"/>', '<rect class="hit" x="15" y="' + (B + 43) + '" width="16" height="12" rx="3"/>');
    s += ctl('menu', '<rect x="19" y="' + (B + 60) + '" width="8" height="7" rx="1.8"/>', '<rect class="hit" x="15" y="' + (B + 57.5) + '" width="16" height="12" rx="3"/>');
    // the direction pad: a rocker with a dot for each direction, and the center button
    var px = 120, py = B + 38;
    s += ctl('pad', '<circle cx="' + px + '" cy="' + py + '" r="9"/>' + [[0, -6.3], [6.3, 0], [0, 6.3], [-6.3, 0]].map(function (o) {
      return '<circle class="dir" cx="' + n(px + o[0]) + '" cy="' + n(py + o[1]) + '" r="0.85"/>';
    }).join(''), '<circle class="hit" cx="' + px + '" cy="' + py + '" r="9"/>');
    s += ctl('center', '<circle cx="' + px + '" cy="' + py + '" r="3.5"/>', '<circle class="hit" cx="' + px + '" cy="' + py + '" r="6"/>');
    return s + '</svg>';
  }

  // ---------- the screen ----------
  // What each white balance does to a daylight scene: Cloudy and Shadow warm it, Tungsten cools it.
  var WB_TINT = { 2: ['#ff9a3c', 0.34], 3: ['#ff8a2c', 0.5], 4: ['#3c7dff', 0.62], 5: ['#3c7dff', 0.3], 6: ['#3c7dff', 0.3], 7: ['#ff9a3c', 0.26], 8: ['#ff9a3c', 0.14] };
  // The screen is drawn for a shot: { slot: the profile, layout: 0 to 3, zoom, peak, crop: the pretend camera's state }.
  function shot() { return { slot: ctx.slot, layout: sim.layout, zoom: sim.zoom, peak: sim.peak, crop: sim.crop }; }
  function look(sh) {
    var f = [], style = v('D13E', sh.slot) || 1;
    var ev = (v('5010', sh.slot) || 0) / 1000 + sim.ev;
    if (v('D115', sh.slot) !== 0) f.push('brightness(' + Math.pow(2, ev * 0.55).toFixed(3) + ')');
    var codes = CATALOGUE.STYLE[style] || [];
    var con = 1 + (codes[0] ? v(codes[0], sh.slot) * 0.09 : 0), sat = 1 + (codes[2] ? v(codes[2], sh.slot) * 0.16 : 0);
    if (style === 2) { con += 0.12; sat += 0.35; } if (style === 3) { con -= 0.08; sat -= 0.15; }
    if (style === 5) con += 0.35;
    f.push('contrast(' + con.toFixed(2) + ')');
    if (style >= 4) f.push('grayscale(1)'); else f.push('saturate(' + sat.toFixed(2) + ')');
    if (sh.zoom) f.push('blur(0.4px)');
    var wb = v('5005', sh.slot), tint = WB_TINT[wb] || null;
    if (wb === 11) { var k = v('D014', sh.slot); tint = k < 5500 ? ['#3c7dff', (5500 - k) / 3500 * 0.42] : ['#ff9a3c', (k - 5500) / 6000 * 0.4]; }
    return { filter: f.join(' '), tint: style >= 4 ? null : tint };
  }

  // The screen shows one photo (src/photos.js). White balance, film style and exposure change it as the camera would.
  // Peaking and clipping are worked out from the photo itself: sharp edges get the peaking color, the brightest parts are marked.
  // The four peaking colors (red, blue, green, white), also on the swatches of the layouts editor.
  var PEAK_COLORS = ['#ff3b30', '#3c7dff', '#34c759', '#ffffff'];
  var PEAK_RGB = PEAK_COLORS.map(function (h) { return [1, 3, 5].map(function (i) { return Math.round(parseInt(h.substr(i, 2), 16) / 2.55) / 100; }); });
  var PEAK_GAIN = 7, PEAK_CUT = -1.3;  // edge strength to alpha: higher cut, fewer marks
  function scene(sh) {
    var lk = look(sh), z = sh.zoom ? 'transform:scale(3);transform-origin:60% 58%;' : '';
    var src = typeof PHOTO !== 'undefined' ? PHOTO : '';
    var s = '<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" style="filter:' + lk.filter + ';' + z + '">';
    s += '<image href="' + src + '" x="0" y="0" width="300" height="200" preserveAspectRatio="xMidYMid slice"/>';
    if (lk.tint) s += '<rect width="300" height="200" fill="' + lk.tint[0] + '" opacity="' + lk.tint[1].toFixed(2) + '" style="mix-blend-mode:soft-light"/>';
    return s + '</svg>';
  }
  // Sharper screens spread an edge over more pixels, so the edge finder is scaled by the pixel density.
  function dpr() { return Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)); }
  function photoMarks(kind, rgb) {  // peaking or clipping drawn from the photo
    var src = typeof PHOTO !== 'undefined' ? PHOTO : '', id = kind + rgb.join('').replace(/\./g, '');
    var f = kind === 'peak'
      ? '<feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>' +
        '<feGaussianBlur stdDeviation="0.45"/><feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true"/>' +
        '<feColorMatrix type="matrix" values="0 0 0 0 ' + rgb[0] + '  0 0 0 0 ' + rgb[1] + '  0 0 0 0 ' + rgb[2] + '  ' + n(PEAK_GAIN * dpr()) + ' 0 0 0 ' + PEAK_CUT + '"/>'
      : '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.23  0 0 0 0 0.19  6 12 2 0 -19"/>';
    return '<defs><filter id="' + id + '" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' + f + '</filter></defs>' +
      '<image href="' + src + '" x="0" y="0" width="300" height="200" preserveAspectRatio="xMidYMid slice" filter="url(#' + id + ')"/>';
  }

  // The parts a screen layout can show; a layout with none of them on is empty and the camera skips it.
  var SHOWS = ['bars', 'grid', 'clip', 'peak', 'horizon', 'histo'];
  function layoutUsed(i, slot) { var L = CATALOGUE.LAYOUTS[i]; return SHOWS.some(function (k) { return has(L[k]) && v(L[k], slot) === 1; }); }
  function overlays(sh) {
    if (sh.layout < 0) return '';  // the full picture, with nothing over it
    var Lc = CATALOGUE.LAYOUTS[sh.layout], s = '<svg viewBox="0 0 300 200" preserveAspectRatio="none">';
    var on = function (k) { return has(Lc[k]) && v(Lc[k], sh.slot) === 1; };
    if (on('grid')) {
      var six = v(Lc.gridFmt, sh.slot) === 2, cols = six ? 6 : 3, rows = six ? 4 : 3;
      for (var i = 1; i < cols; i++) s += '<line x1="' + (300 * i / cols) + '" y1="0" x2="' + (300 * i / cols) + '" y2="200" stroke="#fff" stroke-opacity="0.45" stroke-width="0.6"/>';
      for (var j = 1; j < rows; j++) s += '<line x1="0" y1="' + (200 * j / rows) + '" x2="300" y2="' + (200 * j / rows) + '" stroke="#fff" stroke-opacity="0.45" stroke-width="0.6"/>';
    }
    if (on('peak') || sh.peak) s += photoMarks('peak', PEAK_RGB[v(Lc.peakColor, sh.slot)] || PEAK_RGB[0]);
    if (on('clip')) s += photoMarks('clip', [1, 0, 0]);
    if (on('horizon')) s += '<path d="M110 100h30M160 100h30M150 95v10" stroke="#fff" stroke-width="1.2" fill="none"/>';
    if (on('histo')) s += '<rect x="10" y="' + (on('bars') ? 136 : 150) + '" width="64" height="36" rx="3" fill="#000" fill-opacity="0.55"/><path d="M14 ' + (on('bars') ? 168 : 182) + 'c8-2 10-20 18-22s10 12 16 10 8-18 14-16 6 20 8 28z" fill="#fff" fill-opacity="0.75"/>';
    if (sh.crop) { var c = sh.crop === 3 ? 0.77 : 0.56, w = 300 * c, h = 200 * c; s += '<rect x="' + (150 - w / 2) + '" y="' + (100 - h / 2) + '" width="' + w + '" height="' + h + '" fill="none" stroke="#fff" stroke-width="1"/>'; }
    return s + '</svg>' + (on('bars') ? bars(sh.slot) : '');
  }

  function evScale(slot) {
    var ev = Math.round(((v('5010', slot) || 0) / 1000 + sim.ev) * 3), s = '<span class="evs">';
    for (var i = -9; i <= 9; i++) s += '<i class="' + (i === ev ? 'on' : i % 3 === 0 ? 'm' : '') + '"></i>';
    return s + '</span>';
  }
  function bars(slot) {
    var iso = v('D010', slot) === 0 || isEVF() ? 'ISO Auto' : 'ISO ' + L('D010', slot);
    var fmt = { 0: 'DNG', 1: 'DNG+JPG', 2: 'JPG' }[v('D004', slot)];
    return '<div class="tb"><span>' + esc(ctx.name(slot)) + '</span><span class="r"><span class="sd">' + esc(L('500B', slot)) + '</span><span>' + fmt + '</span></span></div>' +
      '<div class="bb"><span>A</span><span>' + esc(L('D00C', slot)) + '</span><span>' + esc(iso) + '</span>' + evScale(slot) + '<span class="sd">' + esc(L('5005', slot)) + '</span></div>';
  }

  // The status screen, as on the camera: a top line, a panel with the exposure scale and four values over small
  // labels, and a row of tiles for the settings you change most (M11-P manual pp.50 to 53).
  function status() {
    var val = function (big, label) { return '<div class="sv"><b>' + esc(big) + '</b><span>' + label + '</span></div>'; };
    return '<div class="status">' +
      '<div class="st-top"><span>' + esc(ctx.name(ctx.slot)) + '</span><span>' + esc(L('D004')) + '</span></div>' +
      '<div class="st-main">' + evScale(ctx.slot) + '<div class="st-vals">' + val('A', 'Mode') + val(L('D00C'), 'Speed limit') + val(L('D00B'), 'Max ISO') + val(Words.short('5010', v('5010')), 'EV') + '</div></div>' +
      '<div class="st-tiles">' + [L('5013'), L('500B'), L('5005'), L('D13E')].map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div></div>';
  }

  // Menus fill the screen, as Leica draws them: a header with the title and, for Favorites and the main menu, markers
  // for the status screen, Favorites and the main menu's pages; six rows; the selected row bright over a red line.
  function panel() {
    var p = sim.panel, pages = '';
    if (p.kind) pages = '<span class="pages"><i class="st"></i><i class="fv' + (p.kind === 'fav' ? ' on' : '') + '"></i>' +
      [1, 2, 3, 4, 5].map(function (k) { return '<i' + (p.kind === 'main' && k === 1 ? ' class="on"' : '') + '>' + k + '</i>'; }).join('') + '</span>';
        // a list box of options: the selected row is the one tab stop, the arrow keys move it, Enter picks it
    var s = '<div class="panel' + (p.kind ? ' menu' : '') + '"><div class="t"><span class="tt">' + esc(p.title) + '</span>' + pages + '</div>' +
      '<div class="rows" role="listbox" aria-label="' + esc(p.title) + '" data-title="' + esc(p.title) + '">';
    p.items.forEach(function (it, i) {
      var cur = i === sim.hi;
      s += '<button role="option" aria-selected="' + cur + '" tabindex="' + (cur ? 0 : -1) + '" data-i="' + i + '" class="' + (cur ? 'cur' : '') + '"><span>' + esc(it.t) + '</span>' + (it.d || p.kind ? '<span class="sd">' + esc(it.d || '') + '</span>' : '') + '</button>';
    });
    return s + '</div></div>';
  }
  // The selected row stays in the six visible rows; the list scrolls only when the selection leaves them.
  // Rows are a sixth of the list's height, so their edges fall between pixels: measure exactly and allow one pixel.
  function keepRowInView() {
    var rows = root && root.querySelector('.screen .panel .rows'), cur = rows && rows.querySelector('.cur');
    if (!cur) return;
    var box = rows.getBoundingClientRect(), r = cur.getBoundingClientRect();
    if (r.top < box.top - 1) rows.scrollTop += r.top - box.top;
    else if (r.bottom > box.bottom + 1) rows.scrollTop += r.bottom - box.bottom;
  }

  function screenHTML() {
    var live = (isEVF() || sim.lv) && sim.menu !== 1;
    var s = live ? scene(shot()) + overlays(shot()) : status();
    if (sim.panel) s += panel();
    if (sim.toast) s += '<div class="toast">' + esc(sim.toast) + '</div>';
    return s;
  }

  // ---------- pressing ----------
  function toast(t) {
    sim.toast = t; clearTimeout(sim.toastTimer);
    sim.toastTimer = setTimeout(function () { sim.toast = ''; paintScreen(); }, 1600);
  }
  function openList(title, items, cur, pick, kind) { sim.panel = { title: title, items: items, pick: pick, kind: kind }; sim.hi = Math.max(0, cur); }
  function closePanel() { sim.panel = null; sim.menu = 0; }

  function settingList(code, title) {
    var opts = ctx.options(code), cur = v(code);
    openList(title || Words.settingName(code), opts.map(function (o) { return { t: Words.short(code, o.v), v: o.v }; }),
      opts.findIndex(function (o) { return o.v === cur; }),
      function (it) { ctx.set(code, it.v); closePanel(); toast(Words.settingName(code) + ': ' + it.t); });
  }

  function runJob(code) {
    var job = v(code), name = Words.short(code, job);
    if (job === 26) {
      var ps = ctx.profiles;
      openList('User Profile', ps.map(function (p) { return { t: ctx.name(p), p: p }; }), ps.indexOf(ctx.slot),
        function (it) { closePanel(); ctx.select(it.p); toast(ctx.name(it.p)); });
      return;
    }
    if (job === 3) { sim.zoom = !sim.zoom; toast(sim.zoom ? 'Focus Aid' : 'Focus Aid off'); return; }
    if (job === 84) { sim.peak = !sim.peak; toast(sim.peak ? 'Focus Peaking' : 'Focus Peaking off'); return; }
    if (job === 1) { sim.lv = !sim.lv; toast(sim.lv ? 'Live View' : 'Live View off'); return; }
    if (job === 21) { var z = v('D050') === 2 ? 3 : v('D050'); sim.crop = sim.crop ? 0 : z; toast(sim.crop ? 'Digital Zoom ' + (z === 3 ? '1.3x' : '1.8x') : 'Digital Zoom off'); return; }
    if (job === 0) { toast('No function'); return; }
    var target = CATALOGUE.JOB_SETTING[job];
    if (target && has(target)) { settingList(target, name); return; }
    toast(name);
  }

  // Favorites, as the camera shows them: the items, then Main Menu as the last row, so five items fit on the first
  // page. With no items the camera skips the page and goes on to the main menu.
  function favoritesList() {
    var fav = v('D1A9'), items = (fav && fav.items) || [];
    if (!items.length) { sim.menu = 3; mainMenu(); return; }
    openList('Favorites', items.map(function (it) {
      var code = CATALOGUE.favoriteSetting(it), d = code && has(code) ? Words.short(code, v(code)) : '';
      return { t: Words.short('D1A9', it), d: d, code: code };
    }).concat([{ t: 'Main Menu', main: true }]), 0, function (it) {
      if (it.main) { sim.menu = 3; mainMenu(); return; }
      if (it.code && has(it.code) && ctx.options(it.code).length) settingList(it.code); else { closePanel(); toast(it.t); }
    }, 'fav');
  }
  function mainMenu(hi) {  // hi: the row to select, so toggling a row keeps it selected
    var fav = (v('D1A9') || { items: [] }).items;
    var opts = ctx.options('D1A9');
    openList('Main Menu', opts.map(function (o) { return { t: o.t, d: fav.indexOf(o.v) >= 0 ? '★' : '', item: o.v }; }), hi || 0,
      function (it) {
        var had = fav.indexOf(it.item) >= 0; ctx.toggleFavorite(it.item);
        var now = ((v('D1A9') || { items: [] }).items).indexOf(it.item) >= 0;
        toast(now === had ? 'Favorites holds 11 items at most' : (now ? 'Added ' : 'Removed ') + it.t); mainMenu(sim.hi);
      }, 'main');
  }

  // The direction pad: the side clicked, or the arrow key pressed. Up and down move through a list on the screen.
  function padDir(e) {
    var g = e && e.target.closest && e.target.closest('[data-ctl]'), r = g && g.getBoundingClientRect();
    if (!r) return 'Down';
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'Up' : 'Down') : (dx < 0 ? 'Left' : 'Right');
  }
  function still() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function press(c, e, dir) {
    var scr = document.querySelector('#cam .screen');
    if (scr) { var sr = scr.getBoundingClientRect(); if (sr.top < 0 || sr.bottom > innerHeight) scr.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' }); }
    if (c !== 'menu' && sim.menu === 1) sim.menu = 0;
    if (c === 'menu') {  // as on the camera: the status screen, then Favorites, then the main menu
      var next = (sim.menu + 1) % 4;
      sim.panel = null; sim.menu = next;
      if (next === 2) favoritesList(); else if (next === 3) mainMenu();
      if (next === 1) toast('Status screen');
    } else if (c === 'center') {
      if (sim.panel) { var it = sim.panel.items[sim.hi]; if (it && sim.panel.pick) sim.panel.pick(it); }
      else {  // as on the camera: the full picture, then each layout with something on, then the full picture again
        var used = [0, 1, 2, 3].filter(function (i) { return layoutUsed(i, ctx.slot); }), at = used.indexOf(sim.layout);
        sim.layout = at + 1 < used.length ? used[at + 1] : -1;
        toast(sim.layout < 0 ? 'Full picture' : 'Screen layout ' + (sim.layout + 1));
      }
    } else if (c === 'pad') {
      var d = dir || padDir(e);
      if (sim.panel && (d === 'Up' || d === 'Down')) sim.hi = Math.max(0, Math.min(sim.panel.items.length - 1, sim.hi + (d === 'Up' ? -1 : 1)));
      else toast(d);
    } else if (c === 'play') { closePanel(); toast('Your pictures would show here'); }
    else if (c === 'shutter') { closePanel(); sim.zoom = false; toast('Click'); }
    else if (c === 'frame') toast('Shows other frame lines in the viewfinder');
    else if (JOBS[c]) { if (sim.panel) closePanel(); else runJob(JOBS[c][0]); }
    paintScreen();
  }
  function flash(c) {
    if (!root) return;
    var gs = root.querySelectorAll('.body [data-ctl="' + c + '"]');
    gs.forEach(function (g) { g.classList.add('on'); }); setTimeout(function () { gs.forEach(function (g) { g.classList.remove('on'); }); }, 220);
  }

  function turn(dir) {
    var t = v('D077');
    if (t === 1) { sim.ev = Math.max(-3, Math.min(3, Math.round((sim.ev + dir / 3) * 3) / 3)); toast('Exposure ' + Words.short('5010', Math.round(((v('5010') || 0) / 1000 + sim.ev) * 3) * 1000 / 3 | 0)); }
    else if (t === 2) { sim.zoom = dir > 0; toast(sim.zoom ? 'Focus Aid' : 'Focus Aid off'); }
    else toast('No function');
    paintScreen();
  }

  // ---------- painting ----------
  // Repainting replaces the screen's contents, so the list's scroll and the keyboard focus are carried across.
  function paintScreen() {
    if (!root) return;
    var scr = root.querySelector('.screen'), had = scr.contains(document.activeElement);
    var rows = scr.querySelector('.panel .rows'), top = rows && sim.panel && rows.dataset.title === sim.panel.title ? rows.scrollTop : 0;
    scr.innerHTML = screenHTML();
    rows = scr.querySelector('.panel .rows'); if (rows) rows.scrollTop = top;
    keepRowInView();
    if (had) { var cur = scr.querySelector('.rows .cur'); (cur || scr).focus({ preventScroll: true }); }
  }
  // After Try it: the focus goes to the menu it opened, or back to the control.
  function settle(t) {
    var cur = root && root.querySelector('.screen .rows .cur');
    if (cur) cur.focus({ preventScroll: true }); else if (t && t.isConnected) t.focus({ preventScroll: true });
  }

  // Tooltips: the control's name, what it does, then what a click does.
  function tipText(c) {
    var t = NAMES[c];
    if (c === 'menu') return t + ': the status screen, then Favorites, then the main menu. ' + (settable(c) ? 'Click to try it or change Favorites.' : 'Click to press.');
    if (c === 'center') return t + ': steps from the full picture through each screen layout that has something on. ' + (settable(c) ? 'Click to try it or change them.' : 'Click to press.');
    if (c === 'wheel' && settable(c)) {
      var does = [];
      if (has('D195')) does.push('press for ' + L('D195'));
      if (has('D077')) does.push('turn for ' + L('D077'));
      return t + ': ' + does.join(', ') + '. Click to try it or change it.';
    }
    if (settable(c)) return t + ': ' + L(JOBS[c][0]) + '. Click to try it or change it.';
    if (c === 'pad') return t + ': up and down move through lists on the screen. Click a side to press it.';
    if (c === 'play') return t + ': shows your pictures. Click to press.';
    if (c === 'frame') return t + ': shows other frame lines in the viewfinder. It has no job to set.';
    return t + '. Click to press.';
  }

  function showTip(c, x, y) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); }
    tipEl.textContent = tipText(c); tipEl.style.display = 'block';
    var w = tipEl.offsetWidth; tipEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px'; tipEl.style.top = (y - tipEl.offsetHeight - 12) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; }

  // The list under the drawing: what each settable button does in this profile. Click a line to change it.
  function listHTML() {
    return listRows().map(function (r) {
      var k = (v('D1A9') || { items: [] }).items.length;
      var val = r.edit === 'favorites' ? 'Favorites, ' + Words.count(k, 'item') : r.edit === 'layouts' ? 'Four screen layouts' : L(r.code);
      return '<button class="job" data-ctl="' + r.ctl + '" data-code="' + r.code + '"' + (r.edit ? ' data-edit="' + r.edit + '"' : '') + '><span class="jn">' + esc(r.name) + '</span>' +
        '<span class="jv">' + esc(val) + '</span><span class="chev" aria-hidden="true"></span></button>';
    }).join('');
  }

  // Light up a control (from the list or the Buttons table) and its lines in the list.
  function light(c) {
    if (!root) return;
    root.querySelectorAll('.lit').forEach(function (n) { n.classList.remove('lit'); });
    if (!c) return;
    root.querySelectorAll('[data-ctl="' + c + '"]').forEach(function (n) { n.classList.add('lit'); });
  }
  function ctlForCode(code) { for (var c in JOBS) if (JOBS[c].indexOf(code) >= 0) return c; return null; }

  // Clicking a settable button: a menu to try it or change its job (both jobs for the thumbwheel).
  function jobMenu(c, t) {
    var codes = JOBS[c].filter(has).map(function (code) {
      var row = LIST.filter(function (r) { return r.code === code; })[0];
      return { code: code, label: c === 'wheel' ? (code === 'D077' ? 'Turning it' : 'Pressing it') : null, name: row ? row.name : NAMES[c] };
    });
    ctx.jobMenu(t, codes, NAMES[c], function () { flash(c); press(c); settle(t); });
  }

  // The tabs, the camera switch and the list are redrawn on every render: the focus goes back to the same button.
  function focusKey(n) {
    if (!n || !n.dataset) return null;
    if (n.dataset.p) return '.profiles [data-p="' + n.dataset.p + '"]';
    if (n.dataset.view) return '[data-view="' + n.dataset.view + '"]';
    if (n.dataset.code && n.classList.contains('job')) return '.job[data-code="' + n.dataset.code + '"]';
    if (n.dataset.ctl) return '.body [data-ctl="' + n.dataset.ctl + '"]';
    return null;
  }
  function render(el, c) {
    var first = root !== el || (ctx && ctx.model !== c.model);
    var fe = document.activeElement, back = el.contains(fe) && !fe.closest('.screen') ? focusKey(fe) : null;
    // a change of camera, profile or setting starts the pretend camera fresh, so a press never undoes an earlier one;
    // drawing the panel again for anything else (another section, a selection) leaves it as it is
    var now = c.model + ' ' + c.slot + ' ' + JSON.stringify(c.doc.S);
    if (now !== shown) { sim.zoom = false; sim.peak = false; sim.crop = 0; shown = now; }
    // another profile or camera closes the menus and goes back to shooting; the User Profile list stays open to show the pick
    if (ctx && ctx.slot !== c.slot) { sim.ev = 0; if (!sim.panel || sim.panel.title !== 'User Profile') closePanel(); }
    ctx = c; root = el;
    if (first) {
      sim.lv = false; closePanel();
      var touch = window.matchMedia && matchMedia('(hover: none)').matches;
      el.innerHTML = '<div class="camhead"><div class="seg profiles" role="group" aria-label="Profile shown"></div><div class="which"></div></div><div class="screen" tabindex="-1" aria-live="polite"></div><div class="body">' + drawing() + '</div>' +
        '<p class="small dim caption">' + (touch ? 'Tap' : 'Click') + ' a red button to change its job.</p>' +
        '<div class="jobs"></div>';
      wire(el);
    }
    el.querySelector('.profiles').innerHTML = ctx.profiles.map(function (p) {
      return '<button data-p="' + p + '" aria-pressed="' + (p === ctx.slot) + '" title="Double-click to rename">' + esc(ctx.name(p)) + '</button>';
    }).join('');
    el.querySelector('.jobs').innerHTML = listHTML();
    var which = el.querySelector('.which');
    which.innerHTML = ctx.models.length > 1 ? '<span class="seg">' + ctx.models.map(function (m) {
      return '<button data-view="' + m + '" aria-pressed="' + (m === ctx.model) + '" title="Show the ' + esc(m) + '">' + esc(m) + '</button>';
    }).join('') + '</span>' : '';
    if (sim.panel && sim.panel.title === 'User Profile') { sim.hi = ctx.profiles.indexOf(ctx.slot); }
    paintScreen();
    var again = back && !el.contains(document.activeElement) && el.querySelector(back);
    if (again) again.focus({ preventScroll: true });
  }

  var lastTab = { p: 0, t: 0 };
  function wire(el) {
    // A second click on the same tab renames it. The first click redraws the tabs, so dblclick would never fire.
    el.querySelector('.profiles').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var p = +b.dataset.p, now = Date.now();
      if (lastTab.p === p && now - lastTab.t < 500) { lastTab.t = 0; ctx.rename(p); return; }
      lastTab = { p: p, t: now }; ctx.select(p);
    });
    el.querySelector('.which').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) ctx.view(b.dataset.view); });
    el.querySelector('.screen').addEventListener('click', function (e) {
      var b = e.target.closest('.panel button'); if (!b || !sim.panel) return;
      var it = sim.panel.items[+b.dataset.i]; sim.hi = +b.dataset.i; if (sim.panel.pick) sim.panel.pick(it); paintScreen();
    });
    var jobs = el.querySelector('.jobs');
    jobs.addEventListener('click', function (e) {
      var b = e.target.closest('.job'); if (!b) return;
      if (b.dataset.edit) { ctx.edit(b.dataset.edit); return; }
      var code = b.dataset.code, row = LIST.filter(function (r) { return r.code === code; })[0];
      ctx.jobMenu(b, [{ code: code, name: row.name }], row.name, null);
    });
    jobs.addEventListener('pointerover', function (e) { var b = e.target.closest('.job'); light(b ? b.dataset.ctl : null); });
    jobs.addEventListener('pointerleave', function () { light(null); });
    var svg = el.querySelector('.body svg');
    var act = function (t, e) {
      var c = t.dataset.ctl; hideTip();
      if (EDIT[c] && settable(c)) ctx.menu(t.getBoundingClientRect(), [{ t: 'Try it', id: 'try', pin: true }, { sep: true, pin: true }, { t: EDIT[c].label, id: 'edit' }],
        function (it) { if (it.id === 'try') { flash(c); press(c, null); settle(t); } else ctx.edit(EDIT[c].what); }, NAMES[c]);
      else if (settable(c)) jobMenu(c, t);
      else { flash(c); press(c, e); }
    };
    svg.addEventListener('click', function (e) { var t = e.target.closest('[data-ctl]'); if (t) act(t, e); });
    svg.addEventListener('keydown', function (e) {
      var t = e.target.closest('[data-ctl]'); if (!t) return;
      // the arrow keys turn the focused thumbwheel and press the focused direction pad on that side
      var arrow = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }[e.key];
      if (arrow && t.dataset.ctl === 'wheel') { e.preventDefault(); flash('wheel'); turn(arrow === 'Up' || arrow === 'Right' ? 1 : -1); return; }
      if (arrow && t.dataset.ctl === 'pad') { e.preventDefault(); flash('pad'); press('pad', null, arrow); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation(); act(t, null);
    });
    svg.addEventListener('pointerleave', function () { hideTip(); light(null); });
    svg.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = e.target.closest('[data-ctl]');
      if (t) { showTip(t.dataset.ctl, e.clientX, e.clientY); light(t.dataset.ctl); } else { hideTip(); light(null); }
    });
    svg.addEventListener('wheel', function (e) {
      var t = e.target.closest('[data-ctl="wheel"]'); if (!t) return;
      e.preventDefault(); turn(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    if (!el.dataset.keys) el.dataset.keys = '1';  // the panel stays on the page, so its keys are added once
    else return;
    // Keys on the screen's menus, only while the focus is on the screen: elsewhere in the panel Enter and the arrows keep their own jobs.
    el.addEventListener('keydown', function (e) {
      if (!sim.panel || !e.target.closest('.screen')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sim.hi = Math.max(0, Math.min(sim.panel.items.length - 1, sim.hi + (e.key === 'ArrowUp' ? -1 : 1))); paintScreen(); }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var row = e.target.closest('.panel button'); if (row) sim.hi = +row.dataset.i;
        press('center');
      }
      if (e.key === 'Escape') { closePanel(); paintScreen(); }
    });
  }

  // After a part set is picked, the pretend camera shows that part: Favorites as the second press of Menu shows them,
  // screen layout 1 in Live View, or the buttons whose jobs changed lit for a moment. Nothing scrolls.
  function show(kind) {
    if (!root) return;
    closePanel();
    if (kind === 'favorites') { sim.menu = 2; favoritesList(); }
    else if (kind === 'layouts') { sim.lv = true; sim.layout = 0; toast('Screen layout 1'); }
    else ['top', 'fn', 'wheel', 'lever-in', 'lever-out'].forEach(flash);
    paintScreen();
  }

  // A small screen for the layouts editor: profile slot, screen layout 0 to 3, with nothing pressed.
  function layoutPreview(slot, layout) { var sh = { slot: slot, layout: layout, zoom: false, peak: false, crop: 0 }; return scene(sh) + overlays(sh); }

  // press and sim are for capture scripts and tests that drive the pretend camera
  return { render: render, press: press, show: show, layoutPreview: layoutPreview, sim: sim, PEAK_COLORS: PEAK_COLORS, light: function (code) { light(code ? ctlForCode(code) : null); } };
})();
