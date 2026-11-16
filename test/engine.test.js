// Run: node --test test/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');

const exportPath = path.join(__dirname, 'fixtures', 'mev1-export.lcse');
const exported = fs.readFileSync(exportPath, 'utf8');

test('a camera export comes back byte for byte', () => {
  const doc = E.parse(exported);
  assert.strictEqual(doc.model, 'M-EV1');
  assert.strictEqual(E.serialize(doc), exported);
});

test('the export holds four saved profiles with their names', () => {
  const doc = E.parse(exported);
  assert.deepStrictEqual(E.profiles(doc), [1, 2, 3, 4]);
  assert.deepStrictEqual([1, 2, 3, 4].map(p => E.profileName(doc, p)), ['Fast', 'Medium', 'Slow', 'Sloow']);
});

test('favorites split into per-profile lists and join back', () => {
  const doc = E.parse(exported);
  assert.strictEqual(doc.S.D1A9.length, 7);
  assert.deepStrictEqual(doc.S.D1A9[1], { value: 13, items: [41] });
});

test('a file made from scratch holds every setting the camera writes, in its order', () => {
  for (const name of Object.keys(E.RULES.models)) {
    const doc = E.blank(name);
    assert.deepStrictEqual(E.entries(doc).map(e => e[0]), E.RULES.models[name].order, name);
    assert.strictEqual(E.toFile(doc).Camera, E.RULES.models[name].camera);
    assert.doesNotThrow(() => JSON.parse(E.serialize(doc)));
    assert.deepStrictEqual(E.check(doc), [], name + ' factory values are all allowed');
  }
});

test('a file made from scratch has the same shape as a camera export', () => {
  const real = JSON.parse(exported).Settings;
  const made = E.toFile(E.blank('M-EV1')).Settings;
  for (const code of Object.keys(made)) {
    assert.ok(code in real, code + ' is in the real export');
    assert.strictEqual(made[code].length, real[code].length, code + ' slot count');
  }
});

test('the factory values match a real export where the export was never changed', () => {
  const real = JSON.parse(exported).Settings;
  const made = E.toFile(E.blank('M-EV1')).Settings;
  for (const code of ['D000', 'D001', 'D06E', 'D006', 'D007', 'D014', 'D130', 'D131', 'D132', 'D01D', 'D051', 'D1E6']) {
    assert.deepStrictEqual(made[code], real[code], code);
  }
});

test('factory values equal the reset profiles in a real export', () => {
  const real = E.parse(exported), made = E.blank('M-EV1');
  for (const code of E.RULES.models['M-EV1'].order) {
    if (!E.rule('M-EV1', code).p) continue;
    for (const slot of [5, 6]) assert.deepStrictEqual(made.S[code][slot], real.S[code][slot], code + ' slot ' + slot);
  }
});

test('profiles and the live slot', () => {
  const doc = E.blank('M11-P');
  E.setProfiles(doc, [1, 2]);
  assert.strictEqual(doc.S.D6B2[0], 6);
  doc.S.D124 = [1];
  doc.S.D00C[1] = 2560;
  E.syncLive(doc);
  assert.strictEqual(doc.S.D00C[0], 2560);
  E.setProfiles(doc, [2]);
  assert.strictEqual(doc.S.D124[0], 2, 'start profile moves when its profile is removed');
  assert.deepStrictEqual(E.check(doc), []);
});

test('moving to another camera keeps what it allows and replaces the rest', () => {
  const doc = E.blank('M11-P');
  doc.S.D193[1] = 1;   // top button: Live View (M11-P only)
  doc.S.D00C[1] = 2560;
  const { doc: ev1, notes } = E.translate(doc, 'M-EV1');
  assert.strictEqual(ev1.S.D00C[1], 2560);
  assert.notStrictEqual(ev1.S.D193[1], 1);
  assert.ok(E.legal(E.rule('M-EV1', 'D193'), ev1.S.D193[1]));
  assert.ok(notes.some(n => n.code === 'D193' && n.slot === 1));
});

test('an export opened and moved to the M11-P keeps profiles and names', () => {
  const doc = E.parse(exported);
  const { doc: p } = E.translate(doc, 'M11-P');
  assert.deepStrictEqual(E.profiles(p), [1, 2, 3, 4]);
  assert.strictEqual(E.profileName(p, 4), 'Sloow');
  assert.strictEqual(E.toFile(p).Camera, 'LEICA M11-P');
  assert.ok(!('D12F' in E.toFile(p).Settings), 'the other camera\'s network name is not copied');
  assert.deepStrictEqual(E.check(p), []);
});

test('labels come from the camera', () => {
  assert.strictEqual(E.label('D32B', 2), 'Off (LV mode)');
  assert.strictEqual(E.label('D193', 26), 'User Profile');
  assert.strictEqual(E.label('D00C', 32770), '1/(4f) s');
  assert.deepStrictEqual(E.sharedOptions(['M11-P', 'M-EV1'], 'D193').some(o => o.v === 1), false);
});

test('a wrong camera name is refused', () => {
  assert.throws(() => E.parse({ Camera: 'LEICA Q3', Version: 1, Settings: {} }));
});
