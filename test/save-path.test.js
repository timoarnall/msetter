// The save path in src/design.js: what a camera's file keeps when the design moves between cameras, and what the
// notes say. Each test is one case a person can make in the page.
const test = require('node:test');
const assert = require('node:assert');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
globalThis.CATALOGUE = require('../src/catalogue.js');
const D = require('../src/design.js');
const SETS = require('../src/sets.js');
const set = id => SETS.find(s => s.id === id);

// A design started from a set, as the page holds it: the design, the set, and the starting point.
function start(id, model) {
  const doc = D.fromSet(set(id), model);
  return { doc, set: set(id), origin: { model, S: E.clone(doc.S) } };
}
const move = (st, to) => { const mv = D.moveTo(st.doc, to, { set: st.set, origin: st.origin }); return Object.assign({}, st, { doc: mv.doc, origin: mv.origin, mv }); };
const file = (st, to) => D.forCamera(st.doc, to, { set: st.set, origin: st.origin });

test('a setting only the M11 Monochrom has survives adding and removing the M11-P', () => {
  let st = start('factory', 'M11 Monochrom');
  st.doc.S.D177[1] = E.rule('M11 Monochrom', 'D177').v.find(v => v !== st.doc.S.D177[1]);
  const toning = st.doc.S.D177[1];
  st = move(st, 'M11-P');
  assert.deepStrictEqual(st.mv.kept, ['D177'], 'the move names Toning as kept');
  assert.strictEqual(file(st, 'M11 Monochrom').doc.S.D177[1], toning, 'the Monochrom file keeps Toning while the M11-P is first');
  st = move(st, 'M11 Monochrom');
  assert.strictEqual(st.doc.S.D177[1], toning, 'Toning is back when the Monochrom is first again');
  assert.ok(!st.doc.kept.D177, 'Toning is no longer kept aside');
});

test('Content Credentials survive the M11 as first camera', () => {
  let st = start('factory', 'M11-P');
  st.doc.S.D21C[1] = E.rule('M11-P', 'D21C').v.find(v => v !== st.doc.S.D21C[1]);
  const cc = st.doc.S.D21C[1];
  st = move(st, 'M11');
  assert.deepStrictEqual(st.mv.kept, ['D21C']);
  st = move(st, 'M11-P');
  assert.strictEqual(st.doc.S.D21C[1], cc);
});

test('a kept setting follows the profiles: copy, remove and add', () => {
  let st = start('night', 'M11 Monochrom');
  const v = E.rule('M11 Monochrom', 'D177').v.find(x => x !== st.doc.S.D177[1]);
  st.doc.S.D177[1] = v;
  st = move(st, 'M11-P');
  const q = D.addProfile(st.doc, 1);
  assert.strictEqual(st.doc.kept.D177[q], v, 'a copied profile copies the kept value');
  D.removeProfile(st.doc, 1);
  assert.strictEqual(st.doc.kept.D177[1], E.blank('M11 Monochrom').S.D177[1], 'a removed profile goes back to the factory value');
});

test('Factory follows each camera, and the file says so', () => {
  const st = start('factory', 'M11-P');
  const r = file(st, 'M-EV1');
  assert.strictEqual(r.doc.S.D077[1], E.blank('M-EV1').S.D077[1], 'the M-EV1 gets its own thumbwheel turn');
  const n = r.notes.find(x => x.code === 'D077' && x.slot === 1);
  assert.ok(n && n.follow === 'Factory' && n.from === 0 && n.to === 1, 'a note names the change: ' + JSON.stringify(n));
});

test('a value changed on one camera is kept after the design moves, even where it equals another camera\'s set value', () => {
  let st = start('factory', 'M-EV1');
  st.doc.S.D077[1] = 0;  // the M-EV1's factory is 1; 0 is the M11-P's factory
  st = move(st, 'M11-P');
  assert.strictEqual(st.doc.S.D077[1], 0);
  assert.strictEqual(file(st, 'M-EV1').doc.S.D077[1], 0, 'the M-EV1 file keeps the value you chose');
});

test('Favorites follow the set on each camera, whole', () => {
  const st = start('factory', 'M11');
  const r = file(st, 'M11-P');
  assert.deepStrictEqual(r.doc.S.D1A9[1].items, [41], 'the M11-P file has its factory Favorites');
  const n = r.notes.find(x => x.code === 'D1A9' && x.slot === 1);
  assert.deepStrictEqual([n.kind, n.gained, n.lost, n.follow], ['items', [41], [], 'Factory']);
  const back = file(start('factory', 'M11-P'), 'M11');
  const nb = back.notes.find(x => x.code === 'D1A9' && x.slot === 1);
  assert.deepStrictEqual(back.doc.S.D1A9[1].items, []);
  assert.deepStrictEqual([nb.lost, nb.gained, nb.follow], [[41], [], 'Factory'], 'the note says what goes, not "keeps 0 of 1"');
});

test('Favorites come back whole after the M11 Monochrom was first', () => {
  for (const s of SETS) {
    let st = start(s.id, 'M11-P');
    const before = E.clone(st.doc.S.D1A9);
    st = move(move(st, 'M11 Monochrom'), 'M11-P');
    assert.deepStrictEqual(st.doc.S.D1A9, before, s.id);
  }
});

test('a Favorites list you changed is not replaced by the set\'s list on a move there and back', () => {
  let st = start('street', 'M-EV1');
  const fs = st.doc.S.D1A9[3].items;
  fs.splice(fs.indexOf(53566), 1);  // Film Style, which the Monochrom lacks: the list is now the Monochrom's own
  const mine = fs.slice();
  st = move(move(st, 'M11 Monochrom'), 'M-EV1');
  assert.deepStrictEqual(st.doc.S.D1A9[3].items, mine);
});

test('notes name what Favorites loses on a camera that lacks an item', () => {
  const doc = D.fromSet(set('factory'), 'M11-P');
  doc.S.D1A9[1].items = [41, 5];  // Content Credentials, White Balance
  const r = D.forCamera(doc, 'M11 Monochrom', {});
  const n = r.notes.find(x => x.code === 'D1A9' && x.slot === 1);
  assert.deepStrictEqual(n.lost.sort((a, b) => a - b), [5, 41]);
});

test('replacing a profile with one from a set takes its values and a unique name', () => {
  const doc = D.fromSet(set('night'), 'M11-P');
  const names = E.profiles(doc).map(p => E.profileName(doc, p));
  D.useSetProfile(doc, 2, set('night'), 0);
  assert.strictEqual(E.profileName(doc, 2), names[0] + ' 2');
  assert.deepStrictEqual(doc.S.D00C[2], doc.S.D00C[1]);
  D.useSetProfile(doc, 2, set('factory'), 0);
  assert.strictEqual(E.profileName(doc, 2), 'USER1');
});

// ---------- part sets ----------
const part = id => SETS.PARTS.find(p => p.id === id);
const withPart = (st, ...ids) => { ids.forEach(id => D.pickPart(st.doc, part(id), st.origin)); return Object.assign({}, st, { parts: ids.map(part) }); };
const fileP = (st, to) => D.forCamera(st.doc, to, { set: st.set, parts: st.parts, origin: st.origin });
const moveP = (st, to) => { const mv = D.moveTo(st.doc, to, { set: st.set, parts: st.parts, origin: st.origin }); return Object.assign({}, st, { doc: mv.doc, origin: mv.origin, mv }); };

test('each camera gets its own version of a part set, and the notes say so', () => {
  const st = withPart(start('night', 'M11-P'), 'rangefinder', 'jpg');
  const ev = fileP(st, 'M-EV1');
  for (const q of [1, 2, 3, 4]) assert.strictEqual(ev.doc.S.D191[q], 27, 'FN is EVF <> LCD on the M-EV1');
  const n = ev.notes.find(x => x.code === 'D191' && x.slot === 1);
  assert.ok(n && n.follow === 'Rangefinder', JSON.stringify(n));
  const mono = fileP(st, 'M11 Monochrom');
  assert.deepStrictEqual(mono.doc.S.D1A9[2].items, [6, 40, 53654, 53252], 'the Monochrom gets its own JPG look');
  assert.strictEqual(mono.doc.S.D1A9[2].value, st.doc.S.D1A9[2].value);
});

test('a part set value you changed after picking it is kept on every camera', () => {
  const st = withPart(start('night', 'M11-P'), 'rangefinder');
  st.doc.S.D191[2] = 11;
  const ev = fileP(st, 'M-EV1');
  assert.strictEqual(ev.doc.S.D191[2], 11, 'the changed profile keeps ISO');
  assert.strictEqual(ev.doc.S.D191[1], 27, 'the others follow the set');
});

test('a part set followed through a walk of camera changes', () => {
  let st = withPart(start('factory', 'M11-P'), 'rangefinder', 'jpg', 'check');
  st = moveP(st, 'M-EV1');
  assert.strictEqual(st.doc.S.D191[1], 27);
  st = moveP(st, 'M11 Monochrom');
  assert.strictEqual(st.doc.S.D191[1], 1);
  assert.deepStrictEqual(st.doc.S.D1A9[1].items, [6, 40, 53654, 53252]);
  st = moveP(st, 'M11-P');
  assert.strictEqual(st.doc.S.D191[1], 1);
  assert.deepStrictEqual(st.doc.S.D1A9[1].items, [53566, 6, 53748, 53654, 53252]);
  for (const p of ['rangefinder', 'jpg', 'check']) assert.ok(D.partMatches(st.doc, part(p)), p + ' still matches');
});

test('a part set changed before a move stays changed; picking it again makes it follow again', () => {
  let st = withPart(start('factory', 'M11-P'), 'rangefinder');
  st.doc.S.D191[1] = 27;  // EVF <> LCD on the M11-P, which is also the M-EV1's version of the set
  st = moveP(moveP(st, 'M-EV1'), 'M11-P');
  assert.strictEqual(st.doc.S.D191[1], 27, 'the value you chose comes back');
  st = withPart(st, 'rangefinder');
  assert.strictEqual(fileP(st, 'M-EV1').doc.S.D191[1], 27);
  st = moveP(moveP(st, 'M-EV1'), 'M11-P');
  assert.strictEqual(st.doc.S.D191[1], 1, 'after picking the set again the M11-P has its own version');
});

test('a part set follows each camera in an opened file too', () => {
  const doc = D.fromSet(set('factory'), 'M11-P');
  const st = withPart({ doc, set: null, origin: { model: 'M11-P', S: E.clone(doc.S) } }, 'rangefinder');
  assert.strictEqual(fileP(st, 'M-EV1').doc.S.D191[1], 27);
});

// On the M-EV1 the ISO setting is the ISO it shoots at; on an M11 body it is the ISO dial's M position (factory 12500),
// and the front levers do nothing there. An M11-P design leaves both to the M-EV1 unless you changed them.
test('an M11-P design gives the M-EV1 its own ISO and front levers, unless you changed them', () => {
  const eFactory = D.fromSet(set('factory'), 'M-EV1');
  const p = E.blank('M11-P'); E.setProfiles(p, [1, 2]); p.S.D010 = Array(7).fill(12500);  // an M11-P export: ISO 12500 at M
  const origin = { model: 'M11-P', S: E.clone(p.S) };
  let f = D.forCamera(p, 'M-EV1', { start: origin }).doc;
  assert.deepStrictEqual(f.S.D010.slice(1, 3), [eFactory.S.D010[1], E.blank('M-EV1').S.D010[2]], 'not a fixed ISO 12500');
  assert.deepStrictEqual(f.S.D1D6, E.blank('M-EV1').S.D1D6, 'the levers keep the M-EV1’s own jobs');
  const own = E.blank('M-EV1'); own.S.D010 = [64, 64, 64, 64, 64, 64, 64];
  f = D.forCamera(p, 'M-EV1', { start: origin, base: own }).doc;
  assert.strictEqual(f.S.D010[1], 64, 'an opened M-EV1 file keeps its own ISO');
  p.S.D010[2] = 800;
  f = D.forCamera(p, 'M-EV1', { start: origin, base: own }).doc;
  assert.strictEqual(f.S.D010[2], 800, 'an ISO you set goes to the M-EV1');
});

test('a starting set over your own file keeps everything the set doesn’t set', () => {
  const file = E.blank('M11-P'); file.S['501E'] = Array(7).fill('Someone'); E.setProfiles(file, [1, 2, 3]);
  const doc = D.fromSetOn(set('everyday'), file);
  assert.strictEqual(doc.S['501E'][1], 'Someone', 'artist stays');
  assert.deepStrictEqual(E.profiles(doc), set('everyday').profiles.map((x, i) => i + 1), 'the set’s profiles');
  assert.strictEqual(E.profileName(doc, 1), set('everyday').profiles[0].name.toUpperCase());  // written in capitals, as the camera shows names
});

test('choosing the M-EV1 after opening a Q3 file doesn\'t write the M-EV1\'s own ISO into the Q3 file', () => {
  const Q = require('../src/q3.js'), codes = require('../docs/leica-q3-codes.json'), S = {};
  codes._order.forEach(c => { const e = codes[c], f = e.factory === null ? 0 : e.factory; S[c] = e.kind === 'text camera-wide' ? [f] : e.kind === 'number list per profile' ? [].concat(...Array(7).fill(f)) : Array(7).fill(f); });
  S['500F'] = Array(7).fill(400);  // a fixed ISO 400 on the Q3
  const t = Q.write({ camera: 'LEICA Q3', codes: codes._order.filter(c => c in S), S });
  for (const from of ['M11-P', 'M11']) {
    const doc = Q.designFrom(t, from).doc, origin = { model: from, S: E.clone(doc.S), from: 'Q3', q3: 'Q3' };
    const mv = D.moveTo(doc, 'M-EV1', { origin });
    assert.strictEqual(Q.merge(t, mv.doc, Q.baseFor(mv.origin, 'Q3', null)).changes.length, 0, from + ' to M-EV1 writes nothing');
  }
});
