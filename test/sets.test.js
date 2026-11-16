// Every starting set must make a file both cameras accept without a single skipped value.
const test = require('node:test');
const assert = require('node:assert');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
const SETS = require('../src/sets.js');

for (const set of SETS) {
  test(set.name + ' works on every camera', () => {
    for (const model of ['M11-P', 'M-EV1']) {
      const doc = D.fromSet(set, model);
      assert.deepStrictEqual(E.check(doc), [], model);
      set.profiles.forEach((p, i) => {
        assert.ok(p.name.length >= 3 && p.name.length <= 10, p.name + ' length');
        const all = Object.assign({}, set.base, p.v);
        for (const [code, v] of Object.entries(all)) {
          if (code === 'layout') continue;
          if (code === 'favorites') { assert.deepStrictEqual(doc.S.D1A9[i + 1].items, v, `${model} ${p.name} favorites`); continue; }
          assert.strictEqual(doc.S[code][i + 1], v, `${model} ${p.name} ${code}`);
        }
      });
      assert.deepStrictEqual(E.profiles(doc), set.profiles.map((_, i) => i + 1));
      assert.strictEqual(doc.S.D124[0], 1);
      const text = E.serialize(doc);
      assert.deepStrictEqual(E.parse(text).S, doc.S, model + ' reads back the same');
    }
    // The other M11 bodies get the closest allowed values (the M11-D has no screen and fewer options).
    for (const model of ['M11', 'M11-D', 'M11 Monochrom']) {
      const { doc } = E.translate(D.fromSet(set, 'M11-P'), model);
      assert.deepStrictEqual(E.check(doc), [], model);
    }
  });
}

test('the speed ladder matches the working M-EV1 export', () => {
  const fs = require('fs'), path = require('path');
  const real = E.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mev1-export.lcse'), 'utf8'));
  const doc = D.fromSet(SETS.find(s => s.id === 'ladder'), 'M-EV1');
  for (const code of ['D00C', 'D00B', '5005', 'D32B', 'D1D7', '5010', '500B', 'D193', 'D195', 'D191']) {
    for (const p of [1, 2, 3, 4]) assert.strictEqual(doc.S[code][p], real.S[code][p], code + ' profile ' + p);
  }
});

test('adding, copying and removing profiles', () => {
  const doc = D.fromSet(SETS[0], 'M11-P');
  const p = D.addProfile(doc, 1);
  assert.strictEqual(p, 5);
  assert.strictEqual(doc.S.D00C[5], doc.S.D00C[1]);
  assert.notStrictEqual(E.profileName(doc, 5), 'Fast');
  D.removeProfile(doc, 1);
  assert.deepStrictEqual(E.profiles(doc), [2, 3, 4, 5]);
  assert.strictEqual(doc.S.D124[0], 2);
  assert.strictEqual(D.cleanName('Sl/oo?w!'), 'Sloow');
});
