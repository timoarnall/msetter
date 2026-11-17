// Every script and stylesheet in index.html carries a stamp made from its own contents, so a browser that kept an old
// copy fetches the new one as soon as the file changes. tools/stamp_versions.py writes the stamps.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('every file index.html loads is stamped with its current contents', () => {
  const links = [...html.matchAll(/(?:src|href)="(src\/[^"?]+)(?:\?v=([^"]*))?"/g)];
  assert.ok(links.length >= 10, 'found the page\'s scripts and stylesheet');
  const stale = links.filter(([, file, v]) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 8) !== v)
    .map(([, file]) => file);
  assert.deepStrictEqual(stale, [], 'out of date: ' + stale.join(', ') + '. Run: python3 tools/stamp_versions.py');
});
