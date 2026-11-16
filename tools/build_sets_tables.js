// Writes the starting-set tables into site/index.html and README.md, and the limits diagram as light and dark SVGs,
// straight from src/sets.js so the page never drifts from the app.
//   node tools/build_sets_tables.js
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
// Columns a set's table may show, in order; a set shows those that differ between its profiles, at most four.
const COLUMNS = [['D00C', 'Speed limit'], ['D00B', 'Max ISO'], ['D010', 'ISO'], ['5005', 'White balance'], ['D13E', 'Film style'],
  ['5013', 'Drive'], ['5010', 'Exposure'], ['D0D5', 'Shutter'], ['D01A', 'Review']];

function value(doc, code, p) {
  const v = doc.S[code][p];
  if (code === '5005' && v === 11) return doc.S.D014[p] + ' K';
  if (code === 'D010' && v === 0) return 'Auto';
  const t = E.label(code, v);
  if (code === '5013') return t.replace(/^Continuous - high speed$/, 'Fast burst').replace(/^Continuous - low speed$/, 'Slow burst');
  return C.SHORT[code] ? C.SHORT[code](t) : t;
}

function table(set) {
  const doc = D.fromSet(set, MODEL), ps = E.profiles(doc);
  let cols = COLUMNS.filter(([code]) => ps.some(p => value(doc, code, p) !== value(doc, code, ps[0]))).slice(0, 4);
  if (!cols.length) cols = COLUMNS.slice(0, 2);
  return { name: set.name, help: set.help, cols: cols.map(c => c[1]),
    rows: ps.map(p => [E.profileName(doc, p)].concat(cols.map(([code]) => value(doc, code, p)))) };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '’');
const tables = SETS.map(table);

const html = '<div class="setgrid">\n' + tables.map(t =>
  '      <div class="setcard">\n        <p><b>' + esc(t.name) + '</b> ' + esc(t.help) + '</p>\n' +
  '        <div class="tscroll"><table>\n          <thead><tr><th>User profile</th>' + t.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>\n          <tbody>\n' +
  t.rows.map(r => '            <tr>' + r.map((c, i) => (i ? '<td>' : '<th scope="row">') + esc(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('\n') +
  '\n          </tbody>\n        </table></div>\n      </div>').join('\n') + '\n    </div>';

const md = tables.map(t =>
  '**' + t.name + '.** ' + t.help.replace(/’/g, "'") + '\n\n| User profile | ' + t.cols.join(' | ') + ' |\n|' + '---|'.repeat(t.cols.length + 1) + '\n' +
  t.rows.map(r => '| ' + r.join(' | ') + ' |').join('\n')).join('\n\n');

function between(file, start, end, body) {
  const p = path.join(root, file), s = fs.readFileSync(p, 'utf8');
  const i = s.indexOf(start), j = s.indexOf(end);
  if (i < 0 || j < i) throw new Error(file + ': markers ' + start + ' … ' + end + ' not found');
  fs.writeFileSync(p, s.slice(0, i + start.length) + '\n' + body + '\n' + s.slice(j));
}
between('site/index.html', '<!-- sets:start -->', '<!-- sets:end -->', '    ' + html + '\n    ');
between('README.md', '<!-- sets:start -->', '<!-- sets:end -->', md + '\n');

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
    shutter: { title: 'Shutter speed limit', lo: 1 / 1000 / 1.6, hi: 1, ends: ['faster', 'slower'], code: 'D00C', num: seconds,
      ticks: [[1 / 1000, '1/1000'], [1 / 250, '1/250'], [1 / 60, '1/60'], [1 / 15, '1/15'], [1 / 4, '1/4'], [1, '1 s']] },
    iso: { title: 'Maximum ISO', lo: 64, hi: 50000, ends: ['cleaner', 'noisier'], code: 'D00B', num: Number,
      ticks: [[64, '64'], [400, '400'], [3200, '3200'], [25000, '25000']] }
  };
  function panel(key, x0, x1, top, names) {
    const P = PANELS[key], X = v => x0 + (Math.log(v) - Math.log(P.lo)) / (Math.log(P.hi) - Math.log(P.lo)) * (x1 - x0);
    const clamp = x => Math.max(x0 + 18, Math.min(x1 - 18, x));
    let g = t(x0 - 5, top, P.title, 'start', c.fg, 17), y = top + 40;
    ps.forEach(p => {
      const label = value(doc, P.code, p), x = X(P.num(label));
      if (names) g += t(0, y + 6, E.profileName(doc, p), 'start', c.fg, 16);
      if (key === 'shutter') g += bar(x, x1, y, c.light);
      g += bar(x0, x, y, c.fg) + dot(x, y) + t(clamp(x), y - 14, label, 'middle', c.fg, 15);
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
  g += bar(lx, lx + 34, ly - 5, c.fg) + t(lx + 50, ly, 'what the camera uses', 'start', c.dim, 14);
  if (narrow) ly += 28;
  const l2 = narrow ? lx : lx + 250;
  g += dot(l2 + 17, ly - 5) + t(l2 + 50, ly, 'the profile’s limit', 'start', c.dim, 14);
  ly += 28;
  g += bar(lx, lx + 34, ly - 5, c.light) + t(lx + 50, ly, 'slower, once ISO is at its maximum', 'start', c.dim, 14);
  const H = ly + 12;
  const desc = ps.map(p => E.profileName(doc, p) + ': speed limit ' + value(doc, 'D00C', p) + ', maximum ISO ' + value(doc, 'D00B', p));
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(set.name + ' set. ' + desc.join('. ') + '.') + '">' +
    '<style>text{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;font-weight:600}</style>' + g + '</svg>\n';
}
const LADDER = SETS.find(s => s.id === 'ladder');
const LIGHT = { fg: '#1a1a1a', dim: '#77746e', light: '#d9d7d1', accent: '#E20612' }, DARK = { fg: '#d6d4cf', dim: '#8a8781', light: '#3a3936', accent: '#F0303D' };
fs.writeFileSync(path.join(root, 'site/images/limits-light.svg'), chart(LIGHT, LADDER, false));
fs.writeFileSync(path.join(root, 'site/images/limits-dark.svg'), chart(DARK, LADDER, false));
fs.writeFileSync(path.join(root, 'site/images/limits-narrow-light.svg'), chart(LIGHT, LADDER, true));
fs.writeFileSync(path.join(root, 'site/images/limits-narrow-dark.svg'), chart(DARK, LADDER, true));
console.log('build_sets_tables: ' + tables.length + ' sets');
