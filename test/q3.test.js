// The Q3 experiment (src/q3.js): a Q3 file is read and written in the camera's own layout, only the settings the
// two cameras share are written, only where the design changed them, and a report never holds names or copyright text.
// No real Q3 file is in this repository: the test file is made from the public code list's factory values and order.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const E = require('../src/engine.js');
const Q = require('../src/q3.js');
const codes = require(path.join(__dirname, '..', 'docs', 'leica-q3-codes.json'));

// A made-up Q3 export on firmware 4.1: factory values in every slot, written the way the camera writes.
function madeUp(camera, edit) {
  const S = {};
  codes._order.forEach(c => {
    const e = codes[c], f = e.factory === null ? 0 : e.factory;
    if (e.kind === 'text camera-wide') S[c] = [f];
    else if (e.kind === 'number list per profile') S[c] = [].concat(...Array(7).fill(f));
    else S[c] = Array(7).fill(f);
  });
  if (edit) edit(S);
  return Q.write({ camera: camera || 'LEICA Q3', codes: codes._order.filter(c => c in S), S });
}
function factoryDesign(model, ps) { const d = E.blank(model); E.setProfiles(d, ps || [1, 2, 3, 4]); d.S.D124 = [1]; E.syncLive(d); return d; }

test('a Q3 file reads and writes back byte for byte, in the camera\'s layout', () => {
  const t = madeUp();
  const f = Q.read(t);
  assert.strictEqual(f.model, 'Q3');
  assert.strictEqual(f.codes[0], 'D054', 'the file keeps its own order, not JSON.parse\'s');
  assert.strictEqual(Q.write(f), t);
  assert.strictEqual(Q.writable(t), '');
  assert.ok(!t.endsWith('\n') && t.charCodeAt(0) === 123, 'no byte-order mark and no final newline');
  assert.ok(/"D1FA":\[\n {6}36, 1, 95,\n/.test(t), 'button lists are written one group per line');
  assert.strictEqual(Q.read(madeUp('LEICA Q3 43')).model, 'Q3 43');
});

test('other cameras and older firmware are refused with a plain reason', () => {
  assert.throws(() => Q.read(madeUp('LEICA Q2')), /Q2/);
  const old = madeUp(null, S => { Object.keys(S).slice(400).forEach(c => delete S[c]); });
  const f = Q.read(old);
  assert.ok(!f.firmware4);
  assert.match(Q.writable(old), /firmware before 4/);
  assert.strictEqual(Q.cameraOf(madeUp()), 'LEICA Q3');
  assert.strictEqual(Q.cameraOf('{"Camera":"LEICA M11-P","Settings":{}}'), null);
});

test('a factory design writes nothing, and nor does a design made from the file', () => {
  const t = madeUp(null, S => { S.D00B[2] = 25000; S.D037[0] = 'Street'; });
  for (const model of ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom']) {
    const r = Q.merge(t, factoryDesign(model), E.blank(model).S);
    assert.strictEqual(r.changes.length, 0, model + ': factory design');
    assert.strictEqual(r.text, t, model + ': same bytes');
    const d = Q.designFrom(t, model);
    assert.deepStrictEqual(E.profiles(d.doc), [1, 2, 3, 4, 5, 6]);
    assert.strictEqual(E.profileName(d.doc, 1), 'Street');
    assert.strictEqual(Q.merge(t, d.doc, E.clone(d.doc.S)).text, t, model + ': untouched design from the file');
  }
});

test('changes cross with the Q3\'s own numbers, only in the design\'s profiles', () => {
  const t = madeUp(), t43 = madeUp('LEICA Q3 43');
  const d = factoryDesign('M-EV1', [1, 2]), base = E.blank('M-EV1').S;
  d.S.D00B[2] = 5000;                 // Maximum ISO: the Q3 has whole stops only, so 3200
  d.S.D00C[2] = 32768;                // 1/f: 1/30 on the Q3's 28 mm, 1/60 on the Q3 43
  d.S.D13A[1] = 0; d.S.D16C[2] = 1;   // histogram: on is 3 on the Q3
  d.S.D1A6[2] = 1; d.S.D162[2] = 2;   // grid on, 6 x 4: one code on the Q3
  d.S.D038[0] = 'SLOW';
  d.S.D00B[3] = 100;                  // profile 3 is not in the design: never written
  const r = Q.merge(t, d, base), S = JSON.parse(r.text).Settings;
  assert.strictEqual(S.D00B[2], 3200);
  assert.strictEqual(S.D00C[2], 1280);
  assert.strictEqual(Q.merge(t43, d, base).changes.filter(c => c.code === 'D00C')[0].to, 1536);
  assert.strictEqual(S.D13A[1], 0);
  assert.strictEqual(S.D16C[2], 3);
  assert.strictEqual(S.D162[2], 2);
  assert.strictEqual(S.D038[0], 'SLOW');
  const f = JSON.parse(t).Settings;
  for (const c of Object.keys(S)) for (const i of [0, 3, 4, 5, 6]) if (S[c].length === 7 && c !== 'D1FA' && c !== 'D1FB') assert.deepStrictEqual(S[c][i], f[c][i], c + ' slot ' + i + ' untouched');
});

test('values the Q3 lacks and profiles that don\'t keep a setting are left alone and listed', () => {
  const t = madeUp(null, S => { S['5010'][1] = 255; });
  const d = factoryDesign('M11-P', [1]), base = E.blank('M11-P').S;
  d.S['5005'][1] = 5;      // HMI: not on the Q3
  d.S['5010'][1] = 1000;   // the Q3's profile 1 holds 255: it doesn't keep exposure compensation
  const r = Q.merge(t, d, base);
  assert.strictEqual(r.changes.length, 0);
  assert.deepStrictEqual(r.skipped.map(s => s.entry.q + ' ' + s.why).sort(), ['5005 none', '5010 unset']);
  assert.strictEqual(r.text, t);
});

test('the comparison names what changed and what the camera kept', () => {
  const a = madeUp(), b = madeUp(null, S => { S.D1EE[3] = 2; });
  const diffs = Q.compare(a, b);
  assert.deepStrictEqual(diffs.map(x => [x.code, x.slot, x.a, x.b]), [['D1EE', 3, codes.D1EE.factory, 2]]);
  const d = factoryDesign('M-EV1', [1, 2]); d.S.D00B[1] = 1600; d.S.D00B[2] = 12500;
  const saved = Q.merge(a, d, E.blank('M-EV1').S);
  const back = madeUp(null, S => { S.D00B[1] = 1600; S.D1EE[3] = 2; });  // the camera kept one of two
  const ck = Q.check({ text: saved.text, changes: saved.changes }, back);
  assert.deepStrictEqual(ck.rows.map(r => [r.slot, r.kept]), [[1, true], [2, false]]);
  assert.deepStrictEqual(ck.other.map(x => x.code), ['D1EE']);
});

test('a report holds codes and numbers, never names, artist or copyright', () => {
  const a = madeUp(), b = madeUp(null, S => { S.D037[0] = 'Private'; S['501E'][2] = 'Jane Doe'; S['501F'][2] = '(c) Jane'; S.D002[1] = 'J'; S.D00B[2] = 800; S.DA01[2] = '0000000F641111200000000000000000'; });
  const text = Q.report({ camera: 'LEICA Q3', codes: 587, firmware: '4.1.1', did: 'Set Saturation +1', diffs: Q.compare(a, b) });
  for (const secret of ['Private', 'Jane', '(c)', '"J"', 'User1']) assert.ok(text.indexOf(secret) < 0, 'the report leaves out ' + secret);
  assert.match(text, /\| D00B \| 2 \| .* \| 6400 \| 800 \|/);
  assert.match(text, /0000000F641111200000000000000000/, 'Looks records are numbers and stay in');
  assert.ok(Q.issueUrl('Q3 two exports', text).startsWith('https://github.com/timoarnall/msetter/issues/new?template=q3-report.md'));
  assert.strictEqual(Q.issueUrl('long', 'x'.repeat(9000)), null);
});
