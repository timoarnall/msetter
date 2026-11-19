// The stylesheet stays tidy: dark mode is defined once in two places that must match, every class it styles is
// one the page writes, and colors are tokens, named once at the top.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('src/app.css').replace(/\/\*[\s\S]*?\*\//g, '');
const scripts = fs.readdirSync(path.join(root, 'src')).filter(f => /\.js$/.test(f)).map(f => 'src/' + f);

// The body of the block that starts at the first match of open, up to its matching brace.
function block(text, open) {
  const at = text.search(open);
  assert.ok(at >= 0, 'found ' + open);
  let i = text.indexOf('{', at), depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}' && !--depth) return { start: at, end: j + 1, body: text.slice(i + 1, j) };
  }
  throw new Error('unclosed block ' + open);
}
const decls = body => body.replace(/\s+/g, ' ').trim();

test('the two dark mode blocks are the same', () => {
  // the system's dark mode, and the claude.ai host's data-theme="dark": they must never drift apart
  const sys = block(css, /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-theme="light"\]\)/);
  const host = block(css, /:root\[data-theme="dark"\]/);
  const inner = block(sys.body, /:root:not/);
  assert.strictEqual(decls(inner.body), decls(host.body));
});

test('every class the stylesheet styles is written by the page', () => {
  // Classes come from the selectors; the page writes them in index.html and in strings in src/*.js
  // (markup, classList calls and class pieces such as ' ladder').
  const selectors = [], re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(css))) if (!/^\s*@/.test(m[1])) selectors.push(m[1]);
  const classes = new Set();
  selectors.forEach(s => (s.match(/\.[A-Za-z_][\w-]*/g) || []).forEach(c => classes.add(c.slice(1))));
  const strings = [read('index.html')];
  scripts.forEach(f => strings.push(...(read(f).match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g) || [])));
  const words = new Set(strings.join(' ').match(/[A-Za-z_][\w-]*/g));
  const HOST = [];  // classes a host page adds (none today)
  const unused = [...classes].filter(c => !words.has(c) && !HOST.includes(c));
  assert.deepStrictEqual(unused, [], 'classes styled but never written');
});

test('colors are tokens: no color literal outside the token blocks', () => {
  const tokens = [block(css, /:root \{/), block(css, /@media \(prefers-color-scheme: dark\)/), block(css, /:root\[data-theme="dark"\]/)];
  let rest = css;
  tokens.sort((a, b) => b.start - a.start).forEach(b => { rest = rest.slice(0, b.start) + rest.slice(b.end); });
  const found = rest.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) || [];
  assert.deepStrictEqual(found, [], 'color literals outside the tokens in app.css');
});

test('colors in the scripts belong to the drawn camera and its screen alone', () => {
  // the photo's tints, the peaking colors and the screen's marks live in src/camera.js; everything else uses tokens
  const found = scripts.filter(f => f !== 'src/camera.js').map(f => [f, read(f).match(/['"]#[0-9a-fA-F]{3,8}['"]|\brgba?\(/g)]).filter(x => x[1]);
  assert.deepStrictEqual(found, []);
});

// A sideways swipe on a phone must not bounce either page. The project page lost this lock once when it was rebuilt
// from its template, so both pages are checked for both rules.
test('the app and the project page are locked sideways', () => {
  for (const f of ['src/app.css', 'site/index.src.html', 'site/index.html']) {
    const text = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(text, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/, f + ': html and body clip sideways');
    assert.match(text, /html\s*\{[^}]*overscroll-behavior-x:\s*none/, f + ': html does not bounce sideways');
  }
});
