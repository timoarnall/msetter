// The zip writer behind "Save all": checksums, a zip that reads back, and the same bytes the save proof recorded.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Zip = require('../src/zip.js');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
const SETS = require('../src/sets.js');

test('crc32 gives the standard check value', () => {
  assert.strictEqual(Zip.crc32(Buffer.from('123456789')), 0xCBF43926);
  assert.strictEqual(Zip.crc32(Buffer.from('')), 0);
});

// Reads a stored zip back through its central directory.
function unzip(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), end = b.length - 22;
  assert.strictEqual(dv.getUint32(end, true), 0x06054b50, 'end record');
  const n = dv.getUint16(end + 10, true), size = dv.getUint32(end + 12, true), at = dv.getUint32(end + 16, true);
  assert.strictEqual(at + size, end, 'the central directory ends where the end record starts');
  const files = [];
  for (let i = 0, p = at; i < n; i++) {
    assert.strictEqual(dv.getUint32(p, true), 0x02014b50, 'central header');
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), time = dv.getUint16(p + 12, true), crc = dv.getUint32(p + 16, true);
    const len = dv.getUint32(p + 20, true), nameLen = dv.getUint16(p + 28, true), local = dv.getUint32(p + 42, true);
    const name = Buffer.from(b.subarray(p + 46, p + 46 + nameLen)).toString('utf8');
    assert.strictEqual(dv.getUint32(local, true), 0x04034b50, 'local header');
    const data = b.subarray(local + 30 + dv.getUint16(local + 26, true), local + 30 + dv.getUint16(local + 26, true) + len);
    assert.strictEqual(Zip.crc32(data), crc, 'checksum of ' + name);
    files.push({ name, text: Buffer.from(data).toString('utf8'), flags, method, time });
    p += 46 + nameLen;
  }
  return files;
}

test('a zip reads back: names, texts, stored, UTF-8 names, no time', () => {
  const files = [{ name: 'M11-P/settings.lcse', text: '{"a":1}' }, { name: 'M11 Monochrom/settings.lcse', text: 'Ä é' }];
  const back = unzip(Zip.bytes(files));
  assert.deepStrictEqual(back.map(f => ({ name: f.name, text: f.text })), files);
  back.forEach(f => { assert.strictEqual(f.method, 0); assert.strictEqual(f.flags, 0x0800); assert.strictEqual(f.time, 0); });
});

test('the "Save all" zips have the bytes the save proof recorded', () => {
  const gold = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/save-golden.json'), 'utf8'));
  const MODELS = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];
  for (const [id, cams] of [['ladder', ['M11-P', 'M-EV1']], ['ladder', MODELS], ['factory', ['M11', 'M11 Monochrom']]]) {
    // a set picked on the page: the design is made for the first camera, and its starting point is the set itself
    const set = SETS.find(s => s.id === id), doc = D.fromSet(set, cams[0]), origin = { model: cams[0], S: E.clone(doc.S) };
    const files = cams.map(m => ({ name: m + '/settings.lcse', text: E.serialize(D.forCamera(doc, m, { set, origin }).doc) }));
    const sha = crypto.createHash('sha256').update(Zip.bytes(files)).digest('hex');
    assert.strictEqual(sha, gold['zip ' + id + ' on ' + cams.join('+')].sha, id + ' on ' + cams.join('+'));
  }
});
