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

test('adding, copying and removing profiles', () => {
  const doc = D.fromSet(SETS.find(s => s.id === 'night'), 'M11-P');  // four profiles
  const p = D.addProfile(doc, 1);
  assert.strictEqual(p, 5);
  assert.strictEqual(doc.S.D00C[5], doc.S.D00C[1]);
  assert.notStrictEqual(E.profileName(doc, 5), 'Dark');
  D.removeProfile(doc, 1);
  assert.deepStrictEqual(E.profiles(doc), [2, 3, 4, 5]);
  assert.strictEqual(doc.S.D124[0], 2);
  assert.strictEqual(D.cleanName('Sl/oo?w!'), 'SLOOW');  // in capitals, as the camera shows names
});

test('copies get readable names and adding a profile keeps the start profile', () => {
  const fs = require('fs'), path = require('path');
  const d = D.fromSet(SETS.find(s => s.id === 'factory'), 'M-EV1');
  D.addProfile(d, 1); D.addProfile(d, 1);
  assert.deepStrictEqual(E.profiles(d).map(p => E.profileName(d, p)), ['USER1', 'USER2', 'USER3']);
  d.S.D037 = ['F16']; const q = D.addProfile(d, 1);
  assert.strictEqual(E.profileName(d, q), 'F16 2');
  for (const p of E.profiles(d)) { const n = E.profileName(d, p); assert.ok(n.length >= 3 && n.length <= 10 && n === n.trim(), JSON.stringify(n)); }
  const real = E.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mev1-export.lcse'), 'utf8')), start = real.S.D124[0];
  D.addProfile(real, E.profiles(real)[0]);
  assert.strictEqual(real.S.D124[0], start);
});

test('a set that names a screen layout turns off the parts it does not name', () => {
  const C = globalThis.CATALOGUE, onOff = ['bars', 'grid', 'clip', 'peak', 'horizon', 'histo'];
  for (const set of SETS) {
    const layouts = set.base.layout; if (!layouts) continue;
    for (const model of ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom']) {
      const doc = D.fromSet(set, model);
      layouts.forEach((L, li) => set.profiles.forEach((p, i) => {
        for (const k of onOff) assert.strictEqual(doc.S[C.LAYOUTS[li][k]][i + 1], k in L ? L[k] : 0, `${set.name} ${model} layout ${li + 1} ${k}`);
      }));
    }
  }
});

// ---------- part sets: buttons, Favorites and screen layouts ----------
const PARTS = SETS.PARTS;
const BODIES = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];

test('three part sets for each part, each with a name and how it is used', () => {
  for (const kind of ['buttons', 'favorites', 'layouts']) assert.strictEqual(PARTS.filter(p => p.kind === kind).length, 3, kind);
  assert.strictEqual(new Set(PARTS.map(p => p.id)).size, PARTS.length, 'ids are unique');
  for (const p of PARTS) assert.ok(p.name && p.help && p.help.length <= 130, p.id + ' help is short enough for a card');
});

test('every job and item of every part set is one that camera has', () => {
  for (const part of PARTS) for (const model of BODIES) {
    const v = Object.assign({}, part.v, part.bodies && part.bodies[model]);
    for (const [code, x] of Object.entries(v)) {
      if (code === 'layout') continue;
      if (code === 'favorites') { const r = E.rule(model, 'D1A9'); for (const it of x) assert.ok(r.v.includes(it), `${part.id} ${model} item ${it}`); continue; }
      assert.ok(E.legal(E.rule(model, code), x), `${part.id} ${model} ${code} ${x}`);
    }
    const doc = D.fromSet(SETS.find(s => s.id === 'night'), model);
    D.pickPart(doc, part);
    assert.deepStrictEqual(E.check(doc), [], part.id + ' ' + model);
  }
});

test('Favorites sets hold five items or fewer, so Main Menu stays on the first page', () => {
  for (const part of PARTS.filter(p => p.kind === 'favorites')) for (const model of BODIES) {
    const doc = D.fromSet(SETS.find(s => s.id === 'factory'), model);
    D.pickPart(doc, part);
    assert.ok(doc.S.D1A9[1].items.length <= 5 && doc.S.D1A9[1].items.length <= E.FAVORITES_MAX, part.id + ' ' + model);
  }
  const mono = D.fromSet(SETS.find(s => s.id === 'factory'), 'M11 Monochrom');
  D.pickPart(mono, PARTS.find(p => p.id === 'jpg'));
  assert.deepStrictEqual(mono.S.D1A9[1].items.map(i => E.label('D1A9', i)), ['JPG Settings', 'Toning', 'DNG Resolution', 'File Format']);
});

test('a layout set writes every part of all four layouts, a button set every job and the lever', () => {
  const C = globalThis.CATALOGUE, all = C.LAYOUTS.flatMap(L => Object.values(L)).sort();
  for (const part of PARTS.filter(p => p.kind === 'layouts')) for (const model of BODIES) assert.deepStrictEqual(D.partCodes(part, model).sort(), all, part.id + ' ' + model);
  for (const part of PARTS.filter(p => p.kind === 'buttons')) for (const model of BODIES) assert.deepStrictEqual(D.partCodes(part, model).sort(), ['D077', 'D191', 'D193', 'D195', 'D1D6', 'D1D7'], part.id + ' ' + model);
  const doc = D.fromSet(SETS.find(s => s.id === 'factory'), 'M-EV1');
  D.pickPart(doc, PARTS.find(p => p.id === 'clean'));
  assert.deepStrictEqual(C.LAYOUTS.map(L => [doc.S[L.bars][1], doc.S[L.peak][1], doc.S[L.histo][1], doc.S[L.peakSens][1], doc.S[L.peakColor][1]]),
    [[1, 0, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 'Clean: info bars, then info bars and red peaking on Low, then two empty layouts');
});

test('picking a part set changes only its part, in every saved profile', () => {
  for (const part of PARTS) {
    const doc = D.fromSet(SETS.find(s => s.id === 'everyday'), 'M11-P'), before = E.clone(doc.S), codes = D.partCodes(part, 'M11-P');
    D.pickPart(doc, part);
    for (const code of Object.keys(doc.S)) {
      if (code === 'D1A9') { for (let q = 1; q <= 6; q++) assert.strictEqual(doc.S.D1A9[q].value, before.D1A9[q].value); }
      else if (!codes.includes(code) && !(E.rule('M11-P', code) && E.rule('M11-P', code).p)) assert.deepStrictEqual(doc.S[code], before[code], part.id + ' ' + code);
      else if (!codes.includes(code)) assert.deepStrictEqual(doc.S[code].slice(1), before[code].slice(1), part.id + ' ' + code);
    }
    assert.ok(D.partMatches(doc, part), part.id + ' shows as picked');
    for (const other of PARTS.filter(p => p.kind === part.kind && p !== part)) assert.ok(!D.partMatches(doc, other), other.id + ' does not');
  }
});
