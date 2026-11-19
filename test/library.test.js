// Design rule: a library profile is the same profile every time (docs/state.md, "Library").
// It brings its whole Exposure, Image and Shooting pages as its own set makes them, whatever came before it, and adding
// it never changes another camera's file for a setting it doesn't set. Run: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
globalThis.Design = D;
const SETS = require('../src/sets.js');
globalThis.SETS = SETS;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const LIB = require('../src/library.js');

const FACTORY = SETS.find(s => s.id === 'factory');
const ENTRIES = [].concat(...LIB.groups.map(g => g.items));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A design as the page makes it: Factory, then library profiles added one after another (the first takes USER1's place).
function design(model, entries) {
  const doc = D.fromSet(FACTORY, model), slots = [];
  entries.forEach((x, i) => {
    const v = LIB.valuesFor(x, model);
    slots.push(i === 0 ? D.replaceValues(doc, E.profiles(doc)[0], v, x.name) : D.addValues(doc, v, x.name));
  });
  return { doc, slots };
}

test('the library has every set but Factory, each entry known by its own id', () => {
  const ids = ENTRIES.map(x => x.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(ENTRIES.length >= 60);
});

test('an entry brings the same Exposure, Image and Shooting values whatever was added before it', () => {
  const codes = LIB.ownCodes();
  for (const model of ['M11-P', 'M-EV1']) {
    const alone = {};
    ENTRIES.forEach(x => { alone[x.id] = LIB.valuesFor(x, model); });
    // every entry after a few very different ones: a tripod profile, a flash profile, a black and white one
    const before = ['architecture-0', 'portrait-2', 'mono-2', 'experimental-3'].map(id => ENTRIES.find(x => x.id === id));
    ENTRIES.forEach(x => {
      before.forEach(b => {
        const { doc, slots } = design(model, [b, x]);
        codes.forEach(c => { if (doc.S[c]) assert.ok(same(doc.S[c][slots[1]], alone[x.id][c]), model + ' ' + x.id + ' after ' + b.id + ': ' + c); });
      });
    });
  }
});

test('adding a library profile never changes the other camera\'s file for a setting it does not set', () => {
  const codes = LIB.ownCodes();
  for (const [from, to] of [['M11-P', 'M-EV1'], ['M-EV1', 'M11-P'], ['M11', 'M-EV1']]) {
    const plain = D.forCamera(D.fromSet(FACTORY, from), to, { set: FACTORY, origin: D.fromSet(FACTORY, from), start: D.fromSet(FACTORY, from) }).doc;
    ENTRIES.forEach(x => {
      const origin = D.fromSet(FACTORY, from), { doc } = design(from, [x]);
      const out = D.forCamera(doc, to, { set: FACTORY, origin, start: origin }).doc;
      E.model(to).order.forEach(c => {
        const r = E.rule(to, c);
        if (!r || codes.includes(c) || E.NAME_CODES.includes(c) || c === 'D6B2' || c === 'D124') return;
        const slots = r.p ? [0, 1] : [0];
        slots.forEach(q => assert.ok(same(out.S[c][q], plain.S[c][q]), from + ' to ' + to + ', ' + x.id + ': ' + c + ' in slot ' + q));
      });
    });
  }
});

test('a saved profile keeps its three pages', () => {
  const x = ENTRIES.find(e => e.id === 'motion-0');
  const { doc, slots } = design('M11-P', [x]);
  const v = {}; LIB.ownCodes().forEach(c => { if (doc.S[c]) v[c] = E.clone(doc.S[c][slots[0]]); });
  const again = design('M11-P', [ENTRIES.find(e => e.id === 'mono-3'), { name: 'MINE', values: v }]);
  LIB.ownCodes().forEach(c => { if (doc.S[c]) assert.ok(same(again.doc.S[c][again.slots[1]], v[c]), c); });
});
