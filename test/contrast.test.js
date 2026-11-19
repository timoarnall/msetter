// Rule 9, colors keep their numbers (design-rules.md, rule 1's table): every brightness meets its number on every
// surface it sits on, in light and dark, computed from the tokens at the top of src/app.css. Text is measured as WCAG
// contrast; a surface by its CIE lightness (L*, 0 black to 100 white) against the surface under it, which reads the
// same in both modes where a contrast ratio shrinks in the dark. The project page repeats the app's tokens exactly.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

// The body of the block that starts at the first match of open, up to its matching brace.
function block(text, open) {
  const at = text.search(open);
  assert.ok(at >= 0, 'found ' + open);
  let i = text.indexOf('{', at), depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}' && !--depth) return text.slice(i + 1, j);
  }
  throw new Error('unclosed block ' + open);
}
const tokens = body => Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
// Light is the first :root block; dark is the light tokens with the data-theme="dark" block laid over them (the
// system's dark block equals it: test/css.test.js). var(--x) is followed to its value.
function modes(text) {
  const css = strip(text), light = tokens(block(css, /:root \{/)), dark = Object.assign({}, light, tokens(block(css, /:root\[data-theme="dark"\]/)));
  const resolve = t => { const out = {}; for (const k in t) { let v = t[k], n = 0; while (/^var\(--([\w-]+)\)$/.test(v) && n++ < 9) v = t[v.match(/^var\(--([\w-]+)\)$/)[1]]; out[k] = v; } return out; };
  return { light: resolve(light), dark: resolve(dark) };
}
const APP = modes(read('src/app.css'));

const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = h => { const c = rgb(h).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const lstar = h => { const y = lum(h); return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : 24389 / 27 * y; };

// The table in design-rules.md, rule 1. [token, at least, the surfaces it sits on]
const SURFACES = ['root', 'panel', 's0', 's1', 's2', 's3', 's4', 'bar', 'tile', 'sunk', 'sel'];
const TEXT = [
  ['fg', 4.5, SURFACES.concat(['tile-sel'])],                           // names, values, titles
  ['dim', 4.5, SURFACES],                                                 // descriptions, unselected names, labels in sheets
  ['dim', 3, ['tile-sel']],                                               // marks on the selected tile: the chevron, the …
  ['aside', 4.5, ['s1']],                                                 // a sheet's optional part: the help that asks for reports
  ['faint', 3, SURFACES.filter(s => s !== 's0' && s !== 's4')],           // column heads, a card's labels, the (i), None, chevrons
  ['accent-fg', 4.5, ['accent-fill']],                                    // a red button's words
  ['accent-on-fg', 4.5, ['fg']],                                          // Undo and Redo on the notice
  ['root', 4.5, ['fg']]                                                   // the notice's words and the tip's
];
// [surface, the surface under it]: at least 3 L* apart
const STEPS = [['bar', 'root'], ['tile', 'root'], ['tile-sel', 'root'], ['s1', 'root'], ['sunk', 'root'], ['s2', 'root'], ['panel', 'root'],
  ['s0', 'root'], ['s3', 'root'], ['s3', 's1'], ['s3', 's2'], ['s3', 'panel'], ['s2', 's1'], ['s0-foot', 's0'], ['s0-hi', 's0-foot'], ['s0-hi', 's0']];
const STEP = 3;

for (const mode of ['light', 'dark']) {
  const t = APP[mode];
  test(`rule 9, ${mode}: every brightness meets its number on every surface it sits on`, () => {
    const low = [];
    for (const [k, n, on] of TEXT) for (const s of on) {
      assert.ok(t[k] && t[s], `--${k} and --${s} are tokens`);
      const r = ratio(t[k], t[s]); if (r < n) low.push(`--${k} on --${s}: ${r.toFixed(2)}:1, needs ${n}:1`);
    }
    assert.deepStrictEqual(low, []);
  });
  test(`rule 9, ${mode}: every surface is a visible step from the surface under it`, () => {
    const flat = [];
    for (const [a, b] of STEPS) {
      assert.ok(t[a] && t[b], `--${a} and --${b} are tokens`);
      const d = Math.abs(lstar(t[a]) - lstar(t[b])); if (d < STEP) flat.push(`--${a} on --${b}: ${d.toFixed(1)} L*, needs ${STEP}`);
    }
    assert.deepStrictEqual(flat, []);
  });
}

test('rule 9: the project page repeats the app\'s colors exactly', () => {
  const SITE = modes(read('site/index.html')), off = [];
  for (const mode of ['light', 'dark']) for (const k in SITE[mode]) {
    if (!/^#[0-9a-f]{3,8}$/i.test(SITE[mode][k])) continue;  // type and spacing are the page's own
    if (!APP[mode][k]) off.push(`${mode} --${k}: the app has no such token`);
    else if (SITE[mode][k].toLowerCase() !== APP[mode][k].toLowerCase()) off.push(`${mode} --${k}: ${SITE[mode][k]}, the app ${APP[mode][k]}`);
  }
  assert.deepStrictEqual(off, []);
  const darkSys = tokens(block(strip(read('site/index.html')), /@media \(prefers-color-scheme: dark\) \{ :root:not/).replace(/^[^{]*\{/, ''));
  const darkHost = tokens(block(strip(read('site/index.html')), /:root\[data-theme="dark"\]/));
  assert.deepStrictEqual(darkSys, darkHost, 'the page\'s two dark blocks are the same');
});

// The faintest gray names things; a value is never in it. Known: two values the table still draws faint, each listed
// until its fix lands (then this list fails, so it only shrinks).
const VALUE = /\.(v|pc-v|lv|alt)$/;
const KNOWN = [];
test('rule 9: --faint is never on a value', () => {
  const css = strip(read('src/app.css')), faint = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(^|;)\s*color:\s*var\(--faint\)/.test(m[2])) continue;
    for (const sel of m[1].replace(/^[\s\S]*\{/, '').split(',').map(s => s.trim())) if (VALUE.test(sel.split(/[\s>+~]+/).pop().replace(/:[\w-]+(\(.*\))?$/, ''))) faint.push(sel);
  }
  assert.deepStrictEqual(faint.filter(s => !KNOWN.includes(s)), [], 'values drawn in --faint');
  assert.deepStrictEqual(KNOWN.filter(s => !faint.includes(s)), [], 'fixed: take these off the KNOWN list');
});
