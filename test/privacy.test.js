// The project page and README promise that nothing leaves the browser. This keeps that true:
// the app's code and pages may not make network requests or load anything from another site. Plain links are fine.
// And the page's Content-Security-Policy makes the browser refuse any request at runtime, whatever the code tries.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

test('the app makes no network requests', () => {
  const files = ['index.html', 'site/index.html'].concat(fs.readdirSync(path.join(root, 'src')).filter(f => /\.(js|css)$/.test(f)).map(f => 'src/' + f));
  assert.ok(files.includes('src/rules.js') && files.includes('src/app.js'), 'every script is scanned');
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /\bimport\s*\(/, /\bsrc\s*=\s*["']https?:/i, /<link[^>]*href\s*=\s*["']https?:/i, /url\(\s*["']?https?:/i, /@import/]) {
      assert.ok(!bad.test(s), f + ' matches ' + bad);
    }
  }
});

test('the page blocks every request with a Content-Security-Policy', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'index.html has a Content-Security-Policy meta tag');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.indexOf(m[0]) >= 0 && head.indexOf(m[0]) < head.indexOf('<link'), 'it comes before anything loads');
  const csp = {};
  m[1].split(';').map(d => d.trim()).filter(Boolean).forEach(d => { const [k, ...v] = d.split(/\s+/); csp[k] = v; });
  for (const d of ['connect-src', 'form-action', 'frame-src', 'worker-src', 'object-src', 'base-uri']) {
    assert.deepStrictEqual(csp[d], ["'none'"], d + " is 'none'");
  }
  assert.deepStrictEqual(csp['img-src'].slice().sort(), ["'self'", 'blob:', 'data:'], 'pictures only from the page, data: and blob:');
  assert.deepStrictEqual(csp['default-src'], ["'self'"]);
  assert.deepStrictEqual(csp['script-src'], ["'self'"], 'no inline or outside scripts');
  for (const k of Object.keys(csp)) assert.ok(!csp[k].some(v => /^https?:|^\*$/.test(v)), k + ' names no other site');
});

// The one-file copy (tools/build_page.py) runs inline scripts, so it can't carry the page's policy. Its first script
// adds to <head>, where a policy counts, the parts that leave scripts alone.
test('the one-file copy blocks plugins, a changed base address, form posts and requests', () => {
  const os = require('os'), { execFileSync } = require('child_process');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'msetter-')), 'one-file.html');
  execFileSync('python3', [path.join(root, 'tools/build_page.py'), out]);
  const page = fs.readFileSync(out, 'utf8');
  const first = page.slice(page.indexOf('<script>'), page.indexOf('</script>'));
  const m = first.match(/m\.httpEquiv = 'Content-Security-Policy'; m\.content = "([^"]+)"; document\.head\.appendChild\(m\);/);
  assert.ok(m, 'the first script adds a Content-Security-Policy to <head>');
  const csp = {};
  m[1].split(';').map(d => d.trim()).filter(Boolean).forEach(d => { const [k, ...v] = d.split(/\s+/); csp[k] = v; });
  for (const d of ['object-src', 'base-uri', 'form-action', 'connect-src']) assert.deepStrictEqual(csp[d], ["'none'"], d + " is 'none'");
});
