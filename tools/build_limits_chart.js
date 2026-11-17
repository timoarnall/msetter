// Draws the limits chart on the project page and in the README from the Speed ladder in src/sets.js,
// as light and dark SVGs, wide and stacked for phones.
//   node tools/build_limits_chart.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
globalThis.RULES = require(path.join(root, 'src/rules.js'));
const E = require(path.join(root, 'src/engine.js'));
globalThis.Engine = E;
const C = require(path.join(root, 'src/catalogue.js'));
globalThis.CATALOGUE = C;
const D = require(path.join(root, 'src/design.js'));
const SETS = require(path.join(root, 'src/sets.js'));

const MODEL = 'M11-P';
function value(doc, code, p) {
  const t = E.label(code, doc.S[code][p]);
  return C.SHORT[code] ? C.SHORT[code](t) : t;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '’');

// The limits chart: the Speed ladder's profiles as bars. Dark is what the camera may use on A; the red dot is the
// profile's limit; the light part is slower speeds it uses only once ISO is at the maximum.
const FOCAL = 50;  // 1/f limits drawn for a 50 mm lens
function seconds(label) {
  let m;
  if ((m = label.match(/^1\/\((\d)f\)$/))) return 1 / (+m[1] * FOCAL);
  if (label === '1/f') return 1 / FOCAL;
  if ((m = label.match(/^1\/(\d+)$/))) return 1 / +m[1];
  if ((m = label.match(/^(\d+(\.\d+)?)$/))) return +m[1];
  throw new Error('shutter label ' + label);
}
function chart(c, set, narrow) {
  const doc = D.fromSet(set, MODEL), ps = E.profiles(doc), row = 50;
  const W = narrow ? 390 : 820, nameW = narrow ? 76 : 104;
  const t = (x, y, str, a, col, size) => '<text x="' + x.toFixed(1) + '" y="' + y + '" text-anchor="' + (a || 'start') + '" fill="' + (col || c.dim) + '" font-size="' + (size || 16) + '">' + str + '</text>';
  const bar = (x1, x2, y, col) => '<line x1="' + x1.toFixed(1) + '" y1="' + y + '" x2="' + x2.toFixed(1) + '" y2="' + y + '" stroke="' + col + '" stroke-width="9" stroke-linecap="round"/>';
  const dot = (x, y) => '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="7" fill="' + c.accent + '"/>';
  const PANELS = {
    shutter: { title: 'Shutter speed limit', lo: 1 / 4000 / 1.15, hi: 1, ends: ['faster', 'slower'], code: 'D00C', num: seconds,
      ticks: [[1 / 4000, '1/4000'], [1 / 1000, '1/1000'], [1 / 250, '1/250'], [1 / 60, '1/60'], [1 / 15, '1/15'], [1 / 4, '1/4'], [1, '1 s']] },
    iso: { title: 'Maximum ISO', lo: 64, hi: 50000, ends: ['cleaner', 'noisier'], code: 'D00B', num: Number,
      ticks: [[64, '64'], [400, '400'], [3200, '3200'], [25000, '25000']] }
  };
  function panel(key, x0, x1, top, names) {
    const P = PANELS[key], X = v => x0 + (Math.log(v) - Math.log(P.lo)) / (Math.log(P.hi) - Math.log(P.lo)) * (x1 - x0);
    const clamp = x => Math.max(x0 + 18, Math.min(x1 - 18, x));
    let g = t(x0 - 5, top, P.title, 'start', c.fg, 17), y = top + 42;
    ps.forEach(p => {
      const label = value(doc, P.code, p), x = X(P.num(label));
      if (names) g += t(0, y + 6, E.profileName(doc, p), 'start', c.fg, 17);
      if (key === 'shutter') g += bar(x, x1, y, c.light);
      g += bar(x0, x, y, c.fg) + dot(x, y) + t(clamp(x), y - 14, label, 'middle', c.fg, 13);
      y += row;
    });
    y -= 12;
    P.ticks.forEach(([v, l]) => { g += t(X(v), y, l, 'middle', c.dim, 13); });
    g += t(x0 - 5, y + 20, P.ends[0], 'start', c.dim, 13) + t(x1 + 5, y + 20, P.ends[1], 'end', c.dim, 13);
    return { g, bottom: y + 20 };
  }
  let g = '', bottom;
  if (narrow) {
    const a = panel('shutter', nameW, W - 14, 22, true), b = panel('iso', nameW, W - 14, a.bottom + 50, true);
    g = a.g + b.g; bottom = b.bottom;
  } else {
    const a = panel('shutter', nameW + 16, 450, 22, true), b = panel('iso', 520, W - 14, 22, false);
    g = a.g + b.g; bottom = Math.max(a.bottom, b.bottom);
  }
  let ly = bottom + 44;
  const lx = narrow ? nameW : nameW + 16;
  g += bar(lx, lx + 34, ly - 5, c.fg) + t(lx + 50, ly, 'what the camera uses', 'start', c.dim, 13);
  if (narrow) ly += 28;
  const l2 = narrow ? lx : lx + 250;
  g += dot(l2 + 17, ly - 5) + t(l2 + 50, ly, 'the profile’s limit', 'start', c.dim, 13);
  ly += 28;
  g += bar(lx, lx + 34, ly - 5, c.light) + t(lx + 50, ly, 'slower, once ISO is at its maximum', 'start', c.dim, 13);
  const H = ly + 12;
  const desc = ps.map(p => E.profileName(doc, p) + ': speed limit ' + value(doc, 'D00C', p) + ', maximum ISO ' + value(doc, 'D00B', p));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(set.name + ' set. ' + desc.join('. ') + '.') + '">' +
    '<style>text{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;font-weight:600}</style>' + g + '</svg>\n';
}
const LADDER = SETS.find(s => s.id === 'ladder');
const LIGHT = { fg: '#1a1a1a', dim: '#77746e', light: '#d9d7d1', accent: '#CE0510' }, DARK = { fg: '#d6d4cf', dim: '#8a8781', light: '#3a3936', accent: '#F0303D' };
fs.writeFileSync(path.join(root, 'site/images/limits-light.svg'), chart(LIGHT, LADDER, false));
fs.writeFileSync(path.join(root, 'site/images/limits-dark.svg'), chart(DARK, LADDER, false));
fs.writeFileSync(path.join(root, 'site/images/limits-narrow-light.svg'), chart(LIGHT, LADDER, true));
fs.writeFileSync(path.join(root, 'site/images/limits-narrow-dark.svg'), chart(DARK, LADDER, true));
console.log('build_limits_chart: written');
