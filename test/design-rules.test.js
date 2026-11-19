// The design rules, checked: one test per rule, and a test that fails names the rule it guards. The rules: one type
// size, actions as tools with + and − in the same place, concentric corners and cards whose rows line up, values at the
// left, one icon weight, labels instead of explanations, None for empty values.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('src/app.css').replace(/\/\*[\s\S]*?\*\//g, '');
const scripts = fs.readdirSync(path.join(root, 'src')).filter(f => /\.js$/.test(f) && !/^(rules|q3codes|photos)\.js$/.test(f));
const src = Object.fromEntries(scripts.map(f => [f, read('src/' + f)]));

// Every rule in the stylesheet as [selector, declarations], media queries opened up.
function rules(text) {
  const out = [], re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) out.push([m[1].replace(/^[\s\S]*\{/, '').trim(), m[2]]);
  return out;
}
const RULES = rules(css);
// The pretend camera screen copies the camera's own small type (--screen-… tokens); nothing else may.
const onScreen = sel => sel.split(',').every(s => /^\s*(\.screen|\.layout \.mini)\b/.test(s));

test('rule 1, type: one size for everything and twice that for page titles', () => {
  const bad = RULES.filter(([sel, d]) => /font-size/.test(d)).filter(([sel, d]) => {
    const v = d.match(/font-size:\s*([^;]+)/)[1].trim();
    if (v === 'var(--type)' || v === 'var(--type-2x)' || v === 'inherit') return false;
    return !(/^var\(--screen-[a-z-]+\)$/.test(v) && onScreen(sel));
  }).map(([sel, d]) => sel + ' { ' + d.match(/font-size:\s*[^;]+/)[0] + ' }');
  assert.deepStrictEqual(bad, [], 'font sizes other than --type and --type-2x outside the pretend screen');
  assert.ok(!/--type-small|--lead-small/.test(css), 'the small size is gone for good');
  const small = scripts.filter(f => /class="[^"]*\bsmall\b/.test(src[f]));
  assert.deepStrictEqual(small, [], 'markup asking for small type');
  const inline = scripts.filter(f => /font-size\s*:/.test(src[f]) && f !== 'camera.js');
  assert.deepStrictEqual(inline, [], 'type sizes set from scripts');
});

test('rule 2, tools: every action is a tool; no red text links in the page', () => {
  // .quiet (red words on no background) is kept for the notice's Undo and Redo, which sit on its dark surface
  const quiet = scripts.filter(f => f !== 'ui.js' && /class="quiet/.test(src[f]));
  assert.deepStrictEqual(quiet, [], 'red text links outside the notice');
  const tool = RULES.find(([sel]) => sel === '.tool');
  assert.ok(tool && /background: var\(--s3\)/.test(tool[1]) && /border-radius: var\(--r-group\)/.test(tool[1]), 'the tool: a tile on --s3 with --r-group corners');
  const svg = RULES.find(([sel]) => sel === '.tool svg');
  assert.ok(svg && /color: var\(--accent\)/.test(svg[1]), 'a tool\'s icon is in the accent');
});

test('rule 2b, add is + and remove is −, in the same place on every tile', () => {
  const removes = [];
  for (const f of scripts) for (const m of src[f].matchAll(/data-(premove|libforget|remove)="[^\n]*?' \+ (T|TOOL|App\.TOOL)\.(\w+)/g)) removes.push(f + ' ' + m[1] + ' ' + m[3]);
  assert.ok(removes.length >= 3, 'found the remove tools: ' + removes.join(', '));
  assert.deepStrictEqual(removes.filter(r => !/ minus$/.test(r)), [], 'every remove tool is −');
  assert.ok(/data-libadd="[^\n]*?' \+ T\.plus/.test(src['app.js']) && /<span class="tool icon">' \+ T\.plus/.test(src['app.js']), 'add is + in the library and on Blank');
});

test('rule 3, corners: a card\'s corner radius is a tool\'s plus the inset', () => {
  const tok = name => +css.match(new RegExp('--' + name + ':\\s*(\\d+)px'))[1];
  assert.strictEqual(tok('r-card'), tok('r-group') + tok('inset'), '--r-card = --r-group + --inset');
  for (const card of ['.pcard', '.startcard']) {
    const r = RULES.find(([sel]) => sel === card);
    assert.ok(r && /border-radius: var\(--r-card\)/.test(r[1]) && /padding: var\(--inset\)/.test(r[1]), card + ' uses --r-card and --inset');
  }
  const foot = RULES.find(([sel]) => sel === '.pcard .pc-foot');
  assert.ok(foot && /justify-content: space-between/.test(foot[1]) && /grid-row: 6/.test(foot[1]), 'a card\'s tools sit in its bottom right corner, on its last row');
  const card = RULES.find(([sel]) => sel === '.pcard');
  assert.ok(/grid-template-rows: auto repeat\(3, var\(--lead\)\) 1fr auto/.test(card[1]), 'every card has the same rows, so they line up across the cards');
});

test('rule 4, alignment: values sit at the left of their bar, tile or field', () => {
  const surfaces = /(\.gcell|\.pick|\.pfield|\.txt|\.pbar|\.ptiles|\.librow|\.pcard|\.startcard|\.libtitle)/;
  const bad = RULES.filter(([sel, d]) => surfaces.test(sel) && !/\.tool|\.grip|\.lhave|svg/.test(sel) && /text-align:\s*center|justify-content:\s*center/.test(d)).map(([sel]) => sel);
  assert.deepStrictEqual(bad, [], 'centered values');
});

test('rule 5, icons: drawn icons in one weight, the (i) among them', () => {
  assert.ok(/INFO_SVG = '<svg/.test(src['ui.js']), 'the (i) is a drawn icon, not a letter');
  const widths = [];
  for (const f of ['ui.js', 'table.js', 'app.js']) for (const m of src[f].matchAll(/stroke-width="([\d.]+)"/g)) widths.push(+m[1]);
  const off = widths.filter(w => w < 1.4 || w > 2.2);
  assert.deepStrictEqual(off, [], 'icon strokes between 1.4 and 2.2 on the 16 px grid');
  const info = RULES.find(([sel]) => sel === '.info');
  assert.ok(info && /color: var\(--dim\)/.test(info[1]), 'the (i) is --dim, readable, not --faint');
});

test('rule 6, words: plain labels, no explaining in the interface, the voice rules', () => {
  // Words struck from the page in review, and the house list of words to avoid, as far as a page can show them.
  const struck = ['Use these', 'Kept in this browser', 'Kept from your design', 'Keep in Yours', '>Yours<', "'Yours'", 'Give each profile its own',
    'Use one in every profile', 'By hand:', 'What you don’t change stays', 'Make every profile the same',
    'delve', 'leverage', 'seamless', 'seamlessly', 'effortless', 'robust', 'powerful', 'intuitive', 'unlock', 'it\'s worth noting', 'simply '];
  const found = [];
  for (const f of scripts) for (const w of struck) if (src[f].toLowerCase().includes(w.toLowerCase())) found.push(f + ': ' + w);
  assert.deepStrictEqual(found, [], 'struck words');
});

test('rule 7, empty values read None, never a blank bar', () => {
  assert.ok(/data-kind="text" value="' \+ esc\(v\) \+ '" placeholder="None"/.test(src['table.js']), 'text fields show None when empty');
});
