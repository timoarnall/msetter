// The camera test kit (camera-test/) holds the files a person imports on a real camera. These tests keep the kit
// honest: every file is what its page says it is, and Msetter still writes Test A byte for byte.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
const CATALOGUE = globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
const SETS = require('../src/sets.js');

const KIT = path.join(__dirname, '..', 'camera-test');
// The kit stays in the private repo; the public copy has no camera-test folder, so there is nothing to check.
const expected = fs.existsSync(path.join(KIT, 'expected.json')) ? JSON.parse(fs.readFileSync(path.join(KIT, 'expected.json'), 'utf8')) : {};
if (!Object.keys(expected).length) test('camera test kit', { skip: 'no camera-test folder in this copy' }, () => {});
const read = (m, t) => fs.readFileSync(path.join(KIT, m, 'Test ' + t, 'settings.lcse'), 'utf8');
const diff = (a, b) => {  // [code, slot] pairs whose values differ
  const out = [];
  for (const code of Object.keys(a.S)) a.S[code].forEach((v, i) => { if (JSON.stringify(v) !== JSON.stringify(b.S[code][i])) out.push(code + '[' + i + ']'); });
  return out;
};

for (const model of Object.keys(expected)) {
  test(`${model}: the three files open as ${model} files and check as described`, () => {
    for (const t of ['A', 'B', 'C']) {
      const text = read(model, t), doc = E.parse(text);
      assert.strictEqual(doc.model, model, 'Test ' + t + ' camera');
      assert.strictEqual(JSON.parse(text).Camera, E.model(model).camera);
      assert.strictEqual(E.serialize(doc), text, 'Test ' + t + ' reads back byte for byte');
    }
    const [A, B, C] = ['A', 'B', 'C'].map(t => E.parse(read(model, t)));
    assert.deepStrictEqual(E.check(A), [], 'Test A is clean');
    assert.deepStrictEqual(E.check(B).map(i => i.code + '[' + i.slot + ']'), ['D00B[1]'], 'Test B: only Alpha\'s maximum ISO 99, on purpose');
    assert.deepStrictEqual(E.check(C).map(i => i.code), ['D124'], 'Test C: only the start profile that is not marked saved, on purpose');
  });

  test(`${model}: Tests B and C differ from A only as the kit says`, () => {
    const [A, B, C] = ['A', 'B', 'C'].map(t => E.parse(read(model, t)));
    assert.deepStrictEqual(diff(A, B), ['D00B[1]', 'D6B2[0]']);
    assert.strictEqual(B.S.D00B[1], 99);
    assert.strictEqual(B.S.D6B2[0], A.S.D6B2[0] & ~(1 << 3), 'Charlie is no longer marked saved');
    assert.deepStrictEqual(diff(A, C), ['D6B2[0]']);
    assert.strictEqual(C.S.D6B2[0], 0);
    assert.strictEqual(C.S.D124[0], 2);
    assert.deepStrictEqual(E.filledProfiles(C), [1, 2, 3], 'opening C keeps the three profiles it fills');
  });

  test(`${model}: Test A matches expected.json`, () => {
    const a = E.parse(read(model, 'A')), x = expected[model], L2 = CATALOGUE.LAYOUTS[1];
    assert.strictEqual(x.problemsA, 0);
    assert.deepStrictEqual({ names: E.profiles(a).map(q => E.profileName(a, q)), start: a.S.D124[0], mask: a.S.D6B2[0], speed: [1, 2, 3].map(q => a.S.D00C[q]),
      iso: [1, 2, 3].map(q => a.S.D00B[q]), top: a.S.D193[1], fn: a.S.D191[1], fav: a.S.D1A9[1].items, grid: a.S[L2.grid][1], artist: a.S['501E'][1],
      copyright: a.S['501F'][1], prefix: a.S.D002 }, x.check);
  });

  // The same steps as camera-test/build-kit.js, through the save path in Node: Factory on the M11-P, the page's start.
  test(`${model}: Msetter still writes Test A byte for byte`, () => {
    const set = SETS.find(s => s.id === 'factory'), d = D.fromSet(set, 'M11-P'), origin = { model: 'M11-P', S: E.clone(d.S) };
    D.addProfile(d, 1); D.addProfile(d, 1);
    d.S.D037 = ['Alpha']; d.S.D038 = ['Bravo']; d.S.D039 = ['Charlie'];
    const per = { D00C: [2560, 1792, 1280], D00B: [6400, 3200, 800] };
    for (const c in per) per[c].forEach((v, i) => { d.S[c][i + 1] = v; });
    const L2 = CATALOGUE.LAYOUTS[1];
    [1, 2, 3].forEach(q => { d.S.D193[q] = 26; d.S.D191[q] = 15; d.S.D1A9[q] = { value: d.S.D1A9[q].value, items: [53264, 5, 20499] }; d.S[L2.grid][q] = 1; d.S['501E'][q] = 'MSETTER TEST'; d.S['501F'][q] = 'TEST 2026'; d.S.D02F[q] = 1; });
    if (E.rule(d.model, 'D002').p) [0, 1, 2, 3].forEach(q => { d.S.D002[q] = 'MST'; }); else d.S.D002 = ['MST'];
    d.S.D124 = [2]; E.syncLive(d);
    const r = D.forCamera(d, model, { set, origin });
    assert.strictEqual(E.serialize(r.doc), read(model, 'A'));
  });

  // The way back: Restore is the camera's own export unchanged; Own file is that export with profile 4 renamed CHECK.
  const own = (dir) => path.join(KIT, model, dir, 'settings.lcse');
  if (fs.existsSync(own('Restore'))) test(`${model}: Restore is the camera's own export, and Own file differs only in profile 4's name`, () => {
    const before = fs.readFileSync(path.join(KIT, 'returned', model, 'before.lcse'), 'utf8');
    const restore = fs.readFileSync(own('Restore'), 'utf8'), ownText = fs.readFileSync(own('Own file'), 'utf8');
    assert.strictEqual(restore, before, 'Restore is before.lcse byte for byte');
    const R = E.parse(restore), O = E.parse(ownText);
    assert.strictEqual(R.model, model);
    assert.strictEqual(E.serialize(O), ownText, 'Own file reads back byte for byte');
    assert.deepStrictEqual(E.check(R), []);
    assert.deepStrictEqual(E.check(O), []);
    assert.deepStrictEqual(diff(R, O), ['D03A[0]']);
    assert.deepStrictEqual(O.S.D03A, ['CHECK']);
  });
}
