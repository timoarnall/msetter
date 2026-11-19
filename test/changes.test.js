// Design rule: changed has one meaning (docs/state.md, "Changed"). A value is changed when it differs from what its
// own profile held when it came into the design. Every profile step leaves no new marks and exactly one line; an edit
// marks exactly that value. Owner's screenshot of 2026-11-19: only the first of four profiles had a red dot.
// Run: node --test test/*.test.js
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
const W = require('../src/words.js');
const Changes = require('../src/changes.js');

const FACTORY = SETS.find(s => s.id === 'factory');
const words = { name: W.settingName, value: W.short };
const entry = id => [].concat(...LIB.groups.map(g => g.items)).find(x => x.id === id);

// A small stand-in for the page's state: the design, its start, the records, and the same steps the page takes.
function page(model) {
  const s = { doc: D.fromSet(FACTORY, model || 'M11-P'), drop: [] };
  s.origin = { model: s.doc.model, S: E.clone(s.doc.S) };
  s.recs = Changes.start(s.doc);
  s.settle = () => { s.recs = Changes.settle(s.doc, s.recs); };
  s.now = () => Changes.compute(s.doc, s.origin, Changes.settle(s.doc, s.recs), s.drop, words);
  s.add = (id) => {  // the page's addFromLibrary: the first takes the untouched USER1's place
    const x = entry(id), v = LIB.valuesFor(x, s.doc.model), ps = E.profiles(s.doc);
    const untouched = ps.length === 1 && !s.now().lines.length;
    if (untouched) {
      D.replaceValues(s.doc, ps[0], v, x.name);
      const was = s.recs[ps[0]]; const r = Object.assign({}, s.recs); delete r[ps[0]]; s.recs = Changes.settle(s.doc, r);
      if (was && !was.at) { s.drop.push(was.from); s.recs[ps[0]].took = was.from; }
      return ps[0];
    }
    const q = D.addValues(s.doc, v, x.name); s.settle(); return q;
  };
  s.edit = (code, q, v) => { E.put(s.doc, code, q, v); s.settle(); };
  s.move = (from, to) => { s.recs = Changes.move(s.doc, Changes.settle(s.doc, s.recs), from, to); D.moveProfile(s.doc, from, to); s.settle(); };
  s.remove = (q) => { D.removeProfile(s.doc, q); s.settle(); };
  s.rename = (q, name) => { s.doc.S[E.NAME_CODES[q - 1]] = [name]; s.settle(); };
  s.duplicate = (q) => { const n = D.addProfile(s.doc, q); s.doc.S[E.NAME_CODES[n - 1]] = [String(E.profileName(s.doc, q)) + ' 2']; s.settle(); return n; };
  return s;
}

test('screenshot (b): four library profiles arrive with no dots, and each edit gets its own dot', () => {
  const s = page();
  ['looks-0', 'looks-2', 'motion-0', 'mono-1'].forEach(s.add);
  assert.deepStrictEqual(s.now().lines, ['Added GOLDEN', 'Added SLIDE', 'Added FREEZE', 'Added TONES']);
  assert.deepStrictEqual(Object.keys(s.now().marks), []);
  const ps = E.profiles(s.doc), opts = E.options('M11-P', 'D00C').map(o => o.v);
  ps.slice(1).forEach((q, i) => s.edit('D00C', q, opts.find(v => v !== s.doc.S.D00C[q] && v !== opts[i])));
  assert.deepStrictEqual(Object.keys(s.now().marks).sort(), ps.slice(1).map(q => 'D00C ' + q).sort());
  assert.strictEqual(s.now().lines.length, 4 + 3);
});

test('every profile step makes one line and no marks', () => {
  const s = page();
  s.add('looks-0'); s.add('motion-1'); s.add('travel-0');
  const start = s.now().lines.length;
  const steps = [
    ['duplicate', () => s.duplicate(E.profiles(s.doc)[1])],
    ['move', () => s.move(0, 2)],
    ['remove', () => s.remove(E.profiles(s.doc)[3])],
    ['blank', () => { D.addProfile(s.doc); s.settle(); }]
  ];
  let n = start;
  steps.forEach(([what, run]) => {
    run();
    const now = s.now();
    assert.deepStrictEqual(Object.keys(now.marks), [], what + ' left marks');
    assert.ok(Math.abs(now.lines.length - n) <= 1, what + ': ' + now.lines.join(' | '));
    n = now.lines.length;
  });
});

test('a profile from the start: a move is one line and no dots; a rename marks the name', () => {
  const s = page();
  const doc = D.fromSet(SETS.find(x => x.id === 'everyday'), 'M11-P');
  s.doc = doc; s.origin = { model: doc.model, S: E.clone(doc.S) }; s.recs = Changes.start(doc);
  s.move(0, 3);
  const now = s.now();
  assert.deepStrictEqual(now.lines, ['Moved ' + String(E.profileName(doc, E.profiles(doc)[3])).toUpperCase() + ' to 4']);
  assert.deepStrictEqual(Object.keys(now.marks), []);
  const q = E.profiles(doc)[0], old = String(E.profileName(doc, q)).toUpperCase();
  s.rename(q, 'BRIGHT');
  assert.ok(s.now().lines.includes('Renamed ' + old + ' to BRIGHT'));
  assert.deepStrictEqual(Object.keys(s.now().marks), [E.NAME_CODES[q - 1] + ' ' + q]);
});

test('removing a start profile is one line, and a profile added in its place is Added, not a rename', () => {
  const s = page();
  const doc = D.fromSet(SETS.find(x => x.id === 'everyday'), 'M11-P');
  s.doc = doc; s.origin = { model: doc.model, S: E.clone(doc.S) }; s.recs = Changes.start(doc);
  const q = E.profiles(doc)[1], name = String(E.profileName(doc, q)).toUpperCase();
  s.remove(q);
  assert.deepStrictEqual(s.now().lines, ['Removed ' + name]);
  s.add('looks-0');
  assert.deepStrictEqual(s.now().lines.sort(), ['Added GOLDEN', 'Removed ' + name].sort());
  assert.deepStrictEqual(Object.keys(s.now().marks), []);
});

test('the same change in every profile is one line', () => {
  const s = page();
  const doc = D.fromSet(SETS.find(x => x.id === 'everyday'), 'M11-P');
  s.doc = doc; s.origin = { model: doc.model, S: E.clone(doc.S) }; s.recs = Changes.start(doc);
  const ps = E.profiles(doc), was = doc.S.D0D3[ps[0]], to = E.options('M11-P', 'D0D3').map(o => o.v).find(v => ps.every(q => doc.S.D0D3[q] !== v));
  if (!ps.every(q => doc.S.D0D3[q] === was)) ps.forEach(q => { s.origin.S.D0D3[q] = was; doc.S.D0D3[q] = was; });
  ps.forEach(q => s.edit('D0D3', q, to));
  assert.deepStrictEqual(s.now().lines, ['Every profile: ' + W.settingName('D0D3') + ' ' + W.short('D0D3', was) + ' to ' + W.short('D0D3', to)]);
  assert.strictEqual(Object.keys(s.now().marks).length, ps.length);
});

test('every mark is covered by a line, and Undo to the start leaves none', () => {
  const s = page();
  s.add('looks-0'); s.add('motion-0');
  const before = JSON.stringify({ doc: s.doc, recs: s.recs, drop: s.drop });
  const q = E.profiles(s.doc)[1];
  s.edit('D010', q, 6400); s.rename(q, 'FAST');
  const now = s.now();
  Object.keys(now.marks).forEach(k => {
    const [code, slot] = k.split(' '); const name = String(E.profileName(s.doc, +slot)).toUpperCase();
    assert.ok(now.lines.some(l => l.includes(W.settingName(code)) || l.includes(name)), k);
  });
  const back = JSON.parse(before); s.doc = back.doc; s.recs = back.recs; s.drop = back.drop;
  assert.deepStrictEqual(Object.keys(s.now().marks), []);
});
