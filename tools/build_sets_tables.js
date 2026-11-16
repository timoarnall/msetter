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

// The limits diagram: as light falls, the shutter slows to the speed limit, then ISO climbs to the maximum,
// then the shutter slows past the limit.
function diagram(c) {
  const t = (x, y, s, a, col) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'start') + '" fill="' + (col || c.dim) + '">' + s + '</text>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 236" width="560" height="236" role="img" aria-label="As light falls, the shutter speed slows until it reaches the speed limit. Then ISO climbs until it reaches the maximum. Then the shutter slows past the limit.">' +
    '<style>text{font:600 13px -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif}</style>' +
    t(0, 54, 'Shutter', 'start', c.fg) + t(0, 70, 'speed') + t(0, 176, 'ISO', 'start', c.fg) +
    t(560, 14, 'Less light →', 'end') +
    '<path d="M100 30 L230 82 L390 82 L540 116" fill="none" stroke="' + c.fg + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M100 192 L230 192 L390 146 L540 146" fill="none" stroke="' + c.fg + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="230" cy="82" r="5" fill="' + c.accent + '"/><circle cx="390" cy="146" r="5" fill="' + c.accent + '"/>' +
    t(310, 72, 'Speed limit 1/250', 'middle', c.fg) + t(465, 136, 'Maximum ISO 6400', 'middle', c.fg) +
    t(165, 228, 'Shutter slows', 'middle') + t(310, 228, 'ISO climbs', 'middle') + t(465, 228, 'Shutter slows again', 'middle') +
    '</svg>\n';
}
fs.writeFileSync(path.join(root, 'site/images/limits-light.svg'), diagram({ fg: '#1a1a1a', dim: '#77746e', accent: '#E20612' }));
fs.writeFileSync(path.join(root, 'site/images/limits-dark.svg'), diagram({ fg: '#d6d4cf', dim: '#8a8781', accent: '#F0303D' }));
console.log('build_sets_tables: ' + tables.length + ' sets');
