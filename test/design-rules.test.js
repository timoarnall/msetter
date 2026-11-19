// The design rules, checked: one test per rule, and a test that fails names the rule it guards. The rules: one type
// size, actions as tools with + and − in the same place, concentric corners and cards whose rows line up, values at the
// left, one icon weight, None for empty values. Labels instead of explanations (rule 6) is in test/voice.test.js.
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

// The type scale: each size and the only places it may be used. A new use is a change to the rules first.
const SIZES = {
  'var(--type-2x)': ['.main h1', '.sheet h2', 'h2.lib'],                       // page titles, the Library heading, a sheet's title
  'var(--type-title)': ['.libtitle h3', '.main h2.sub'],                       // group titles inside a page
  'var(--type-small)': ['.libhead .lh', '.pcard .pc-l', '.pcard .pc-num']      // labels that name a column or a value
};
test('rule 1, type: four sizes, each with its strict list of uses', () => {
  const bad = [];
  RULES.filter(([sel, d]) => /font-size/.test(d)).forEach(([sel, d]) => {
    const v = d.match(/font-size:\s*([^;]+)/)[1].trim();
    if (v === 'var(--type)' || v === 'inherit') return;
    if (/^var\(--screen-[a-z-]+\)$/.test(v) && onScreen(sel)) return;
    const allowed = SIZES[v];
    if (!allowed || !sel.split(',').every(x => allowed.includes(x.trim()))) bad.push(sel + ' { font-size: ' + v + ' }');
  });
  assert.deepStrictEqual(bad, [], 'a size used outside its list');
  const small = scripts.filter(f => /class="[^"]*\bsmall\b/.test(src[f]));
  assert.deepStrictEqual(small, [], 'markup asking for small type by class');
  const inline = scripts.filter(f => /font-size\s*:/.test(src[f]) && f !== 'camera.js');
  assert.deepStrictEqual(inline, [], 'type sizes set from scripts');
});

test('rule 2, tools: every action is a tool; no red text links in the page', () => {
  // .quiet (red words on no background) is kept for the notice's Undo and Redo, which sit on its dark surface
  const quiet = scripts.filter(f => f !== 'ui.js' && /class="quiet/.test(src[f]));
  assert.deepStrictEqual(quiet, [], 'red text links outside the notice');
  const tool = RULES.find(([sel]) => sel === '.tool');
  assert.ok(tool && /background: var\(--s3\)/.test(tool[1]) && /border-radius: var\(--r-group\)/.test(tool[1]), 'the tool: a tile on --s3 with --r-group corners');
  const minor = RULES.find(([sel]) => sel === '.tool.minor svg');
  assert.ok(minor && /color: var\(--dim\)/.test(minor[1]), 'a less important tool (the …) has a gray icon');
  assert.ok(/class="tool icon minor" data-more=/.test(src['app.js']) && /class="tool icon minor" data-more=/.test(src['table.js']), 'the … is a minor tool on cards and in the table');
  const crumb = RULES.find(([sel]) => sel === '.startcard .sc-path .crumb');
  assert.ok(crumb && !/background/.test(crumb[1]), 'words that are not actions get no tile');
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

test('rule 4b, table rows line up on their first line', () => {
  const row = RULES.find(([sel]) => sel === '.librow');
  assert.ok(row && /align-items: start/.test(row[1]), 'a library row starts every column at the top');
  assert.ok(RULES.some(([sel, d]) => sel === '.librow > span:not(.lact)' && /padding-top/.test(d)), 'its words sit level with the middle of its tool');
});

test('rule 4c, every profile table labels its header row Profile, on the setting names\' edge', () => {
  assert.ok(/<div class="ghead ghead0"><span class="glead">Profile<\/span><\/div>/.test(src['table.js']), 'the header row says Profile');
  assert.ok(RULES.some(([sel, d]) => sel === '.ghead0' && /padding-left: 0/.test(d)), 'on the same left edge as the setting names');
});

test('rule 10, sheets are forms: one left edge for labels, one for content, one right edge for buttons', () => {
  const form = RULES.find(([sel]) => sel === '.form');
  assert.ok(form && /grid-template-columns: var\(--form-label\) minmax\(0, 1fr\) auto/.test(form[1]) && /align-items: baseline/.test(form[1]), 'a form: label, content, actions, on one baseline');
  assert.ok(/function frow\(label, content, actions\)/.test(src['save.js']) && /class="frow"/.test(src['q3page.js']), 'the Save sheet\'s rows, the Q rows among them, are form rows');
  assert.ok(!/<details><summary>\d|' more<\/summary>/.test(src['save.js'] + src['q3page.js']), 'a long list ends with Show N more, not a toggle stuck between its lines');
  const primaries = (src['save.js'].match(/btn primary/g) || []).length;
  assert.ok(/st\.targets\.length === 1/.test(src['save.js']), 'a camera\'s own Save is red only when it is the one way to save');
  const steps = RULES.find(([sel]) => sel === '.steps li::before');
  assert.ok(steps && /position: absolute/.test(steps[1]) && /left: 0/.test(steps[1]), 'step numbers sit inside the content\'s left edge');
});

test('rule 9, hierarchy: group titles stand out from the rows under them', () => {
  const t = RULES.find(([sel]) => sel === '.libtitle h3');
  assert.ok(t && /font-size: var\(--type-title\)/.test(t[1]) && /color: var\(--fg\)/.test(t[1]), 'a group title is the title size and the brightest text');
  assert.ok(/SET_ICON\[setId\]/.test(src['app.js']), 'a group title has its set\'s icon');
});

test('rule 5, icons: drawn icons in one weight, the (i) among them', () => {
  assert.ok(/INFO_SVG = '<svg/.test(src['ui.js']), 'the (i) is a drawn icon, not a letter');
  const widths = [];
  for (const f of ['ui.js', 'table.js', 'app.js']) for (const m of src[f].matchAll(/stroke-width="([\d.]+)"/g)) widths.push(+m[1]);
  const off = widths.filter(w => w < 1.4 || w > 2.2);
  assert.deepStrictEqual(off, [], 'icon strokes between 1.4 and 2.2 on the 16 px grid');
  const info = RULES.find(([sel]) => sel === '.info');
  assert.ok(info && /color: var\(--faint\)/.test(info[1]), 'the (i) is quieter than the words it explains: --faint, --dim under the pointer');
  assert.ok(RULES.some(([sel, d]) => sel === '.libtitle h3 .info' && /top: 1px/.test(d)), 'beside a title, the (i) sits on the title\'s line');
});

// Rule 6, words (labels, not explanations; struck phrases; the voice rules) is checked in test/voice.test.js against
// test/voice-words.json, over every word a person reads: the page's strings, the README, the docs and the Mac app.

test('rule 3b, an empty slot looks empty: recessed, no rows; every empty place shows', () => {
  const blank = RULES.find(([sel]) => sel === '.pcard.blank');
  assert.ok(blank && /background: var\(--sunk\)/.test(blank[1]) && /box-shadow: var\(--well\)/.test(blank[1]), 'an empty slot is sunk: darker than the page, with the well');
  const card = RULES.find(([sel]) => sel === '.pcard');
  assert.ok(/background: var\(--s1\)/.test(card[1]), 'a filled slot is raised: a shade lighter than the page');
  assert.ok(/for \(var e = n; e < 6; e\+\+\) h \+= '<button class="pcard blank"/.test(src['app.js']), 'every empty place of the six is a slot');
  assert.ok(!/class="pcard blank"[^\n]*rowsOf/.test(src['app.js']), 'an empty slot has no rows of values');
});

test('rule 7, empty values read None, never a blank bar', () => {
  assert.ok(/data-kind="text" value="' \+ esc\(v\) \+ '" placeholder="None"/.test(src['table.js']), 'text fields show None when empty');
  // the field holds its text, then the mark's place and the linked dots, so the text stops short of them (rule 11)
  assert.ok(/::-webkit-inner-spin-button/.test(css) && /\.field \.txt \{ flex: 1 1 auto; min-width: 0/.test(css), 'no stepper or text over the bar\'s dots');
});
