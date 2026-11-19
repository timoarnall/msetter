// Property tests: random designs, made the way the app makes them, on every camera the app offers.
// Each design starts from a starting set, an empty file, the sample export or an M11-D file, then takes a
// random run of edits: legal values, Favorites, add, remove, copy, rename, start profile, a change of camera.
// Every file the app would save from it is then checked, and so is each translation to another camera and back.
//
// Deterministic: a tiny seeded generator, no dependencies. A failure names the seed and the edits, so
//   PROPS_SEED=<seed> PROPS_RUNS=1 node --test test/engine-props.test.js
// replays it. PROPS_RUNS sets how many designs (default 400).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
const SETS = require('../src/sets.js');

const OFFERED = ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom'];  // the cameras the app offers (MODELS in src/state.js)
const RUNS = +process.env.PROPS_RUNS || 400;
const SEED = +process.env.PROPS_SEED || 20261116;
const EXPORT = fs.readFileSync(path.join(__dirname, 'fixtures', 'mev1-export.lcse'), 'utf8');

// ---------- a tiny seeded generator (mulberry32) ----------
function prng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = xs => xs[Math.floor(r() * xs.length)];
  r.chance = p => r() < p;
  r.shuffle = xs => { const a2 = xs.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return r;
}

const ALNUM_UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -';
// Artist and copyright take whatever is typed: quotes, backslashes and © test the writer's escaping.
const FREE_TEXT = 'abcXYZ019 -_.,"\\/:[]{}©é';
const SPECIAL = new Set(['D6B2', 'D124'].concat(E.NAME_CODES));
// The ISO and the front levers mean something else on the M-EV1, which keeps its own unless you changed them (Design.forCamera).
const OWN_ON_EVF = new Set(['D010', 'D1D6', 'D1D7']);

function randText(rnd, alphabet, n) { let s = ''; for (let i = 0; i < n; i++) s += alphabet[rnd.int(0, alphabet.length - 1)]; return s; }
function randomValue(rnd, r, code) {
  if (r.k === 'l') return rnd.pick(r.v);
  if (r.k === 'r') return rnd.int(r.min, r.max);
  if (r.k === 't') return randText(rnd, code === 'D002' || code === 'D019' ? ALNUM_UP : FREE_TEXT, rnd.int(r.min, r.max));
  throw new Error('unknown rule kind ' + r.k + ' for ' + code);
}
// A name the app's name field would keep: 3 to 10 letters, numbers, spaces or dashes, no spaces at the ends.
function randName(rnd, taken) {
  for (;;) {
    const n = rnd.int(3, 10);
    // names Msetter writes are in capitals, as the camera shows them; two names differing only in case are the same
    let s = (randText(rnd, NAME_CHARS.replace(' ', ''), 1) + randText(rnd, NAME_CHARS, n - 2) + randText(rnd, NAME_CHARS.replace(' ', ''), 1)).toUpperCase();
    if (taken.map(t => String(t).toUpperCase()).indexOf(s) < 0) return s;
  }
}

// ---------- what the app does: the real save path in src/design.js ----------
// st: { doc, base, set, origin }. set is the starting set the design follows (none after a file is opened); origin is
// the design as the set made it, moved along with the design, as the page keeps it.
// prepare(st, target): the file Save writes for one camera (prepare in src/save.js).
function prepare(st, target) { return D.forCamera(st.doc, target, { base: st.base, set: st.set, origin: st.set && st.origin }).doc; }
// moveTo(st, to): the first chosen camera changes (toggleTarget in src/save.js); names, saved profiles and start profile stay.
function moveTo(st, to) {
  const mv = D.moveTo(st.doc, to, { base: st.base, set: st.set, origin: st.origin });
  return Object.assign({}, st, { doc: mv.doc, origin: mv.origin });
}

// ---------- a random design ----------
// Returns { doc, base, filled, log }. filled is kept by the test itself, so D6B2 is checked against it, not against itself.
function startDesign(rnd, model, log) {
  const how = rnd.int(0, 9);
  if (how <= 4) {
    const set = rnd.pick(SETS);
    log.push(`fromSet(${set.id}, ${model})`);
    const doc = D.fromSet(set, model);
    return { doc, base: null, set, origin: { model, S: E.clone(doc.S) }, filled: set.profiles.map((_, i) => i + 1) };
  }
  if (how <= 6) {  // an empty design: the page adds a first profile
    log.push(`blank(${model}) + addProfile`);
    const doc = E.blank(model);
    const p = D.addProfile(doc);
    E.syncLive(doc);
    return { doc, base: null, filled: [p] };
  }
  if (how <= 8) {  // the sample export, opened (openText): its own camera keeps it as the base for saving
    const file = E.parse(EXPORT);
    log.push(`open export, design on ${model}`);
    const doc = model === file.model ? E.clone(file) : moveTo({ doc: file }, model).doc;
    return { doc, base: E.clone(file), filled: E.profiles(file) };
  }
  // A file from an M11-D (not offered): it opens as an M11 design, then moves to the chosen camera.
  const d = E.blank('M11-D');
  const n = rnd.int(0, 3), list = [];
  for (let p = 1; p <= n; p++) list.push(p);
  E.setProfiles(d, list); d.S.D124 = [n ? 1 : 0];
  E.RULES.models['M11-D'].order.forEach(code => {
    const r = E.rule('M11-D', code);
    if (SPECIAL.has(code) || r.dyn || !rnd.chance(0.3)) return;
    for (let s = 0; s < d.S[code].length; s++) d.S[code][s] = randomValue(rnd, r, code);
  });
  log.push(`M11-D file with ${n} profiles opened as M11, design on ${model}`);
  const opened = E.parse(E.serialize(d));
  let doc = E.translate(opened, 'M11').doc;
  const filled = E.profiles(doc);
  if (!filled.length) filled.push(D.addProfile(doc));
  if (model !== 'M11') doc = moveTo({ doc }, model).doc;
  return { doc, base: null, filled };
}

function edit(rnd, st, log) {
  const doc = st.doc, m = E.model(doc.model), filled = st.filled;
  const kind = rnd.pick(['value', 'value', 'value', 'value', 'favorites', 'favorites', 'add', 'remove', 'copy', 'rename', 'start', 'camera', 'use']);
  if (kind === 'value') {
    const codes = m.order.filter(c => !SPECIAL.has(c) && !m.rules[c].dyn);
    const code = rnd.pick(codes), r = m.rules[code], v = randomValue(rnd, r, code);
    const slots = !r.p ? [0] : rnd.chance(0.3) ? filled.slice() : [rnd.pick(filled)];
    slots.forEach(s => { doc.S[code][s] = v; });
    log.push(`set ${code}[${slots}] = ${JSON.stringify(v)}`);
  } else if (kind === 'favorites') {
    const allowed = m.rules.D1A9.v, ps = rnd.chance(0.4) ? filled.slice() : [rnd.pick(filled)];
    const how = rnd.pick(['add', 'add', 'remove', 'move', 'replace']);
    let pickItems = null;
    if (how === 'replace') pickItems = rnd.shuffle(allowed).slice(0, rnd.int(0, E.FAVORITES_MAX));
    const addItem = rnd.pick(allowed);
    ps.forEach(q => {
      const items = doc.S.D1A9[q].items;
      if (how === 'add' && items.length < E.FAVORITES_MAX && items.indexOf(addItem) < 0) items.push(addItem);
      if (how === 'remove' && items.length) items.splice(rnd.int(0, items.length - 1), 1);
      if (how === 'move' && items.length > 1) { const f = rnd.int(0, items.length - 1), t = rnd.int(0, items.length - 1); items.splice(t, 0, items.splice(f, 1)[0]); }
      if (how === 'replace') doc.S.D1A9[q] = { value: doc.S.D1A9[q].value, items: pickItems.slice() };
    });
    log.push(`favorites ${how} in ${ps}`);
  } else if (kind === 'add' && filled.length < 6) {
    const from = rnd.chance(0.7) ? rnd.pick(filled) : undefined;
    const p = D.addProfile(doc, from);
    assert.ok(p, 'addProfile gives a slot when fewer than six are filled');
    filled.push(p); filled.sort((a, b) => a - b);
    log.push(`addProfile(${from || ''}) -> ${p}`);
  } else if (kind === 'remove' && filled.length > 1) {  // the app offers Remove only when another profile is left
    const p = rnd.pick(filled);
    D.removeProfile(doc, p);
    filled.splice(filled.indexOf(p), 1);
    log.push(`removeProfile(${p})`);
  } else if (kind === 'copy' && filled.length > 1) {
    const [from, to] = rnd.shuffle(filled);
    D.copyProfile(doc, from, to);
    log.push(`copyProfile(${from} -> ${to})`);
  } else if (kind === 'rename') {
    const p = rnd.pick(filled), others = filled.filter(q => q !== p).map(q => E.profileName(doc, q));
    const name = randName(rnd, others);
    assert.strictEqual(D.cleanName(name), name, 'a clean name passes the name field unchanged');
    doc.S[E.NAME_CODES[p - 1]] = [name];
    log.push(`rename ${p} ${JSON.stringify(name)}`);
  } else if (kind === 'start') {
    const p = rnd.pick(filled);
    doc.S.D124 = [p];
    log.push(`start ${p}`);
  } else if (kind === 'camera') {
    const to = rnd.pick(OFFERED.filter(x => x !== doc.model));
    Object.assign(st, moveTo(st, to));
    log.push(`camera ${to}`);
  } else if (kind === 'use') {  // a profile takes a set's profile values and name, as a library profile does
    const p = rnd.pick(filled), set = rnd.pick(SETS), i = rnd.int(0, set.profiles.length - 1);
    D.replaceValues(doc, p, Object.assign({}, set.base, set.profiles[i].v), set.profiles[i].name);
    log.push(`use ${p} ${set.id} ${i}`);
  }
  E.syncLive(st.doc);
}

function makeDesign(seed) {
  const rnd = prng(seed), log = [], model = OFFERED[seed % OFFERED.length];
  const st = startDesign(rnd, model, log);
  const n = rnd.int(4, 30);
  for (let i = 0; i < n; i++) edit(rnd, st, log);
  st.log = log;
  return st;
}

// ---------- the properties ----------
function leaves(x, at, out) {
  if (Array.isArray(x)) x.forEach((v, i) => leaves(v, at + '[' + i + ']', out));
  else if (x && typeof x === 'object') Object.keys(x).forEach(k => leaves(x[k], at + '.' + k, out));
  else out.push([at, x]);
  return out;
}

// design: the working design rather than a saved file. A starting set picked with only the M11 Monochrom chosen
// may hold values that camera lacks after edits; Save swaps them, so only saved files must check clean.
function checkFile(doc, model, filled, base, why, design) {
  const m = E.RULES.models[model];
  assert.strictEqual(doc.model, model, why + ' model');
  if (!design) assert.deepStrictEqual(E.check(doc), [], why + ': check finds nothing');

  // serialize, parse, serialize: the same file both ways
  const text = E.serialize(doc), back = E.parse(text);
  assert.strictEqual(back.model, model, why + ' reads back as the same camera');
  assert.deepStrictEqual(back.S, doc.S, why + ': every value reads back');
  assert.strictEqual(E.serialize(back), text, why + ': writes back byte for byte');
  const raw = JSON.parse(text);
  assert.strictEqual(raw.Camera, m.camera, why + ' Camera');

  // saved profiles and the start profile
  const want = filled.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(E.profiles(doc), want, why + ': D6B2 holds the filled profiles');
  assert.strictEqual(doc.S.D6B2[0], want.reduce((s, p) => s | (1 << p), 0), why + ' D6B2 bits');
  const start = doc.S.D124[0];
  assert.ok(start === 0 || want.indexOf(start) >= 0, why + ': D124 ' + start + ' is a filled profile or 0');
  if (start) for (const code of m.order) if (m.rules[code].p) assert.deepStrictEqual(doc.S[code][0], doc.S[code][start], why + ': live slot of ' + code + ' mirrors the start profile');

  // names
  const names = want.map(p => E.profileName(doc, p));
  names.forEach(n => {
    assert.strictEqual(typeof n, 'string', why + ' name type');
    assert.ok(n.length >= 3 && n.length <= 10, why + ': name ' + JSON.stringify(n) + ' is 3 to 10 characters');
    assert.strictEqual(n, n.trim(), why + ': name ' + JSON.stringify(n) + ' has no spaces at the ends');
  });
  assert.strictEqual(new Set(names).size, names.length, why + ': names are unique ' + JSON.stringify(names));

  // Favorites
  const fav = m.rules.D1A9;
  doc.S.D1A9.forEach((f, s) => {
    assert.ok(f.items.length <= E.FAVORITES_MAX, why + ': Favorites slot ' + s + ' holds ' + f.items.length + ' items');
    if (!design) f.items.forEach(it => assert.ok(fav.v.indexOf(it) >= 0, why + ': Favorites item ' + it + ' is allowed'));
    assert.strictEqual(new Set(f.items).size, f.items.length, why + ': no Favorites item twice in slot ' + s);
  });

  // slot counts and order
  m.order.forEach(code => {
    const r = m.rules[code], n = r.p ? 7 : 1;
    assert.strictEqual(doc.S[code].length, n, why + ' ' + code + ' slot count');
    if (!r.dyn) assert.strictEqual(raw.Settings[code].length, n, why + ' ' + code + ' slots in the file');
  });
  const written = E.entries(doc).map(e => e[0]);
  assert.deepStrictEqual(Object.keys(raw.Settings).sort(), written.slice().sort(), why + ': the file holds what entries() lists');
  assert.deepStrictEqual(written.filter(c => m.rules[c]), m.order, why + ': codes in the camera\'s order');
  const extras = written.filter(c => !m.rules[c]);
  assert.deepStrictEqual(extras, base && base.model === model ? base.order.filter(c => !m.rules[c]) : [], why + ': no codes the camera does not know, except the opened file\'s own');

  // no NaN, null or undefined anywhere
  for (const [at, v] of leaves(doc.S, 'S', [])) {
    assert.ok(v !== null && v !== undefined && !(typeof v === 'number' && !Number.isFinite(v)), why + ': ' + at + ' is ' + v);
    assert.ok(typeof v === 'number' || typeof v === 'string', why + ': ' + at + ' is a ' + typeof v);
  }
  for (const [at, v] of leaves(raw.Settings, 'Settings', [])) assert.ok(v !== null && v !== undefined, why + ': ' + at + ' in the file is ' + v);
}

// A value both cameras allow comes back unchanged from a trip to the other camera and back.
function sameWhereShared(orig, back, other, why) {
  const m = E.model(orig.model);
  m.order.forEach(code => {
    const r = m.rules[code], ro = E.rule(other, code);
    if (!ro || SPECIAL.has(code) || (OWN_ON_EVF.has(code) && (other === 'M-EV1' || orig.model === 'M-EV1'))) return;
    orig.S[code].forEach((v, s) => {
      const fits = r.dyn ? E.legal(ro, v.value) && v.items.every(it => ro.v.indexOf(it) >= 0) && v.items.length <= E.FAVORITES_MAX : E.legal(ro, v);
      if (fits) assert.deepStrictEqual(back.S[code][s], v, why + ': ' + code + '[' + s + '] survives the trip through the ' + other);
    });
  });
}

test(`${RUNS} random designs: every saved file is clean, round-trips and keeps profiles, names and Favorites right`, () => {
  const t0 = Date.now();
  let files = 0;
  for (let i = 0; i < RUNS; i++) {
    const seed = SEED + i, st = makeDesign(seed);
    const why = `seed ${seed} (${st.doc.model})`;
    try {
      // the working design itself, then the file Save writes for every camera the app offers
      checkFile(st.doc, st.doc.model, st.filled, st.base, why + ' design', true);
      for (const target of OFFERED) {
        const file = prepare(st, target);
        checkFile(file, target, st.filled, st.base, why + ' saved for ' + target);
        files++;
        if (target === st.doc.model) continue;
        // the first chosen camera changes to the target and back again
        const there = moveTo(st, target), back = moveTo(there, st.doc.model);
        checkFile(prepare(back, st.doc.model), st.doc.model, st.filled, st.base, why + ' to ' + target + ' and back');
        sameWhereShared(st.doc, back.doc, target, why + ' to ' + target + ' and back');
        // settings the target lacks come back exactly
        E.model(st.doc.model).order.filter(c => !E.rule(target, c)).forEach(c => {
          assert.deepStrictEqual(back.doc.S[c], st.doc.S[c], why + ': ' + c + ', which the ' + target + ' lacks, comes back after a move there and back');
        });
        files++;
      }
    } catch (e) {
      console.log(`replay: PROPS_SEED=${seed} PROPS_RUNS=1\nedits: ${st.log.join('; ')}`);
      throw e;
    }
  }
  assert.ok(files > RUNS * 4, 'files checked');
  // A guard against something becoming far slower, not a benchmark: GitHub's machines take about 11 s, this Mac about 4.
  assert.ok(Date.now() - t0 < 60000, 'runs in under a minute (' + (Date.now() - t0) + ' ms)');
});

test('the generator covers every offered camera, every start and every edit', () => {
  const seen = new Set();
  for (let i = 0; i < Math.min(RUNS, 160); i++) {
    const seed = SEED + i, st = makeDesign(seed);
    seen.add(OFFERED[seed % OFFERED.length]);
    st.log.forEach(l => seen.add(l.split(/[ (]/)[0]));
  }
  if (RUNS < 40) return;  // a single replayed seed covers little
  for (const want of OFFERED.concat(['fromSet', 'blank', 'open', 'M11-D', 'set', 'favorites', 'addProfile', 'removeProfile', 'copyProfile', 'rename', 'start', 'camera', 'use'])) {
    assert.ok(seen.has(want), 'covers ' + want);
  }
});

test('every starting set, on every offered camera, saves clean files for every other camera', () => {
  for (const set of SETS) for (const model of OFFERED) {
    const doc = D.fromSet(set, model), filled = set.profiles.map((_, i) => i + 1);
    for (const target of OFFERED) checkFile(prepare({ doc, set, origin: { model, S: E.clone(doc.S) } }, target), target, filled, null, `${set.id} on ${model} saved for ${target}`);
  }
});

test('six profiles: adding stops at six, removing down to one keeps a start profile', () => {
  for (const model of OFFERED) {
    const doc = D.fromSet(SETS.find(s => s.id === 'factory'), model);
    while (E.profiles(doc).length < 6) assert.ok(D.addProfile(doc, 1));
    assert.strictEqual(D.addProfile(doc, 1), null, model + ': no seventh profile');
    assert.strictEqual(doc.S.D6B2[0], 0x7E, model + ' D6B2 with six profiles');
    for (const p of [1, 3, 5, 2, 6]) {
      D.removeProfile(doc, p); E.syncLive(doc);
      const left = E.profiles(doc), start = doc.S.D124[0];
      assert.ok(start === 0 || left.indexOf(start) >= 0, model + ': start ' + start + ' after removing ' + p);
    }
    assert.deepStrictEqual(E.profiles(doc), [4]);
    for (const target of OFFERED) checkFile(prepare({ doc }, target), target, [4], null, model + ' one profile left, saved for ' + target);
  }
});

// With only the M11 Monochrom chosen, a starting set is made on that camera: a value it lacks (Max ISO 64, White
// balance in Favorites) becomes the closest it has, so the set cards and the table show what Save writes.
test('a starting set made on any offered camera holds only values that camera allows', () => {
  const bad = [];
  for (const set of SETS) for (const model of OFFERED) {
    const c = E.check(D.fromSet(set, model));
    if (c.length) bad.push(model + ' ' + set.id + ': ' + [...new Set(c.map(x => x.code))].join(' '));
  }
  assert.deepStrictEqual(bad, []);
});

// An amount the other camera lacks becomes the closest amount it has: Max ISO 64 is ISO 125 on the M11 Monochrom.
test('an ISO the other camera lacks becomes the closest ISO it has', () => {
  for (const code of ['D00B', 'D010', 'D0D3']) {
    const doc = E.blank('M11-P'), to = E.rule('M11 Monochrom', code);
    E.setProfiles(doc, [1]); doc.S.D124 = [1];
    doc.S[code][1] = 64;
    E.syncLive(doc);
    const got = E.translate(doc, 'M11 Monochrom').doc.S[code][1];
    const numbers = to.v.filter(v => v > 0);
    const closest = numbers.reduce((b, v) => Math.abs(v - 64) < Math.abs(b - 64) ? v : b, numbers[0]);
    assert.strictEqual(got, closest, code + ': ISO 64 on the M11-P became ' + E.label(code, got) + ' on the M11 Monochrom');
  }
});

// The name field stores D.cleanName(typed), which trims, so " Fast " is stored as "Fast".
test('a name typed with spaces at the ends is stored without them', () => {
  for (const typed of [' Fast ', 'Slow  ', '   ']) {
    const clean = D.cleanName(typed);
    if (clean.length < 3) continue;  // the field puts the old name back
    assert.strictEqual(clean, clean.trim(), JSON.stringify(typed) + ' is stored as ' + JSON.stringify(clean));
  }
});

test('a typed profile name: cleaned, at least 3 characters, not another profile’s', () => {
  const doc = D.fromSet(SETS.find(s => s.id === 'night'), 'M11-P');
  const [a, b] = E.profiles(doc), other = E.profileName(doc, b);
  assert.deepStrictEqual(D.checkName(doc, a, ' Night/2 '), { name: 'NIGHT2', why: null });
  assert.deepStrictEqual(D.checkName(doc, a, 'é!'), { name: '', why: 'short' });
  assert.deepStrictEqual(D.checkName(doc, a, other), { name: other, why: 'taken' });
  assert.deepStrictEqual(D.checkName(doc, b, other), { name: other, why: null }, 'its own name is not taken');
});
