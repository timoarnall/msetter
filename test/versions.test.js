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

// One version number, written by hand in VERSION only. The page reads it from src/version.js (written by
// tools/stamp_versions.py), and mac/build.sh writes it into the Mac app's Info.plist.
const vm = require('vm');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const VERSION = read('VERSION').trim();

test('VERSION, the page and the Mac app carry one version number', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/, 'VERSION holds one version number such as 1.0.0');
  const page = {}; vm.runInNewContext(read('src/version.js'), page);
  assert.strictEqual(page.VERSION, VERSION, 'src/version.js matches VERSION. Run: python3 tools/stamp_versions.py');
  const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
  assert.strictEqual(scripts[0], 'src/version.js', 'index.html loads src/version.js before every other script');
  assert.ok(!/<key>CFBundle(ShortVersionString|Version)<\/key>/.test(read('mac/Info.plist')), 'mac/Info.plist holds no version of its own');
  const build = read('mac/build.sh');
  assert.match(build, /VERSION="\$\(cat "\$SRC\/VERSION"\)"/, 'mac/build.sh reads VERSION from what it builds');
  for (const key of ['CFBundleShortVersionString', 'CFBundleVersion']) {
    assert.ok(build.includes('plutil -replace ' + key + ' -string "$VERSION" "$APP/Contents/Info.plist"'), 'mac/build.sh writes ' + key);
  }
  assert.ok(!('version' in JSON.parse(read('package.json'))), 'package.json holds no version of its own');
});

test('the newest line of CHANGELOG.md is for this version', () => {
  const newest = read('CHANGELOG.md').split('\n').find(l => l.startsWith('- '));
  assert.ok(newest && newest.startsWith('- ' + VERSION + ' ('), 'CHANGELOG.md starts with "- ' + VERSION + ' (date): ...", not: ' + newest);
});
