// The project page and README promise that nothing leaves the browser. This keeps that true:
// the app's code and page may not make network requests or load anything from another site.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

test('the app makes no network requests', () => {
  const files = ['index.html'].concat(fs.readdirSync(path.join(root, 'src')).filter(f => /\.(js|css)$/.test(f) && f !== 'rules.js').map(f => 'src/' + f));
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /\bimport\s*\(/, /(src|href)\s*=\s*["']https?:/i, /url\(\s*["']?https?:/i, /@import/]) {
      assert.ok(!bad.test(s), f + ' matches ' + bad);
    }
  }
});
