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
  assert.throws(() => Q.read(madeUp('LEICA Q')), /Leica Q\. Msetter opens Q3, Q3 43 and Q2 files only/);
  const old = madeUp(null, S => { codes._generations['4'].added.forEach(c => delete S[c]); });  // a firmware 3.1 file
  const f = Q.read(old);
  assert.ok(!f.recent);
  assert.match(Q.writable(old), /firmware older than 4/);
  assert.strictEqual(Q.cameraOf(madeUp()), 'LEICA Q3');
  assert.strictEqual(Q.cameraOf('{"Camera":"LEICA M11-P","Settings":{}}'), null);
  // firmware 4 is told by the codes only it writes, not by counting
  assert.ok(Q.read(madeUp(null, S => { delete S.D17A; delete S.D054; })).recent, 'a firmware 4 file missing two other codes');
  assert.ok(!Q.read(madeUp(null, S => { delete S.D3DB; })).recent, 'a file without the firmware 4 codes');
  for (const bad of [madeUp() + '\n', madeUp().replace(/\n/g, '\r\n'), '\ufeff' + madeUp()]) assert.ok(!Q.canWrite(bad), 'a file not as the camera wrote it is not written');
});

test('a factory design writes nothing, and nor does a design made from the file', () => {
  const t = madeUp(null, S => { S.D00B[2] = 25000; S.D037[0] = 'Street'; });
  for (const model of ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom']) {
    const r = Q.merge(t, factoryDesign(model), E.blank(model).S);
    assert.strictEqual(r.changes.length, 0, model + ': factory design');
    assert.strictEqual(r.text, t, model + ': same bytes');
    const d = Q.designFrom(t, model);
    assert.deepStrictEqual(E.profiles(d.doc), [1], 'only the profile with a name of its own; User2 to User6 are placeholders');
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
  d.S.D1A6[2] = 1; d.S.D162[2] = 1;   // grid on, 3 x 3: one code on the Q3
  d.S.D038[0] = 'SLOW';
  d.S.D00B[3] = 100;                  // profile 3 is not in the design: never written
  const r = Q.merge(t, d, base), S = JSON.parse(r.text).Settings;
  assert.strictEqual(S.D00B[2], 3200);
  assert.strictEqual(S.D00C[2], 1280);
  assert.strictEqual(Q.merge(t43, d, base).changes.filter(c => c.code === 'D00C')[0].to, 1536);
  assert.strictEqual(S.D13A[1], 0);
  assert.strictEqual(S.D16C[2], 3);
  assert.strictEqual(S.D162[2], 1);
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
  assert.match(text, /^D00B 2 6400 800$/m);
  assert.match(text, /0000000F641111200000000000000000/, 'Looks records are numbers and stay in');
  assert.ok(Q.issueUrl('Q3 two exports', text).startsWith('https://github.com/timoarnall/msetter/issues/new?template=q3-report.md'));
  assert.strictEqual(Q.issueUrl('long', 'x'.repeat(9000)), null);
  assert.ok(Q.mailUrl('Q3 two exports', 'short').startsWith('mailto:devise-put.1y@icloud.com?subject=Q3%20two%20exports&body='));
  assert.strictEqual(Q.mailUrl('long', 'x'.repeat(2000)), null);
  // a code that isn't four hex digits (a hand-edited file) never reaches the report
  const odd = madeUp(), odd2 = odd.replace('"D054":', '"Jane Doe":');
  assert.ok(Q.report({ camera: 'LEICA Q3', codes: 587, diffs: Q.compare(odd, odd2) }).indexOf('Jane') < 0);
  // a report of 30 differences still fits in a mail link
  const many = madeUp(null, S => { codes._order.slice(0, 30).forEach(c => { if (typeof S[c][1] === 'number') S[c][1] = 7; }); });
  assert.ok(Q.mailUrl('Q3 setting change', Q.report({ camera: 'LEICA Q3', codes: 587, firmware: '4.1.1', did: 'a test', diffs: Q.compare(madeUp(), many) })));
});

test('guards: placeholder names, guessed values, copyright with its text, video profiles, values that change on the way', () => {
  const t = madeUp(null, S => { S.D02F = Array(7).fill(1); S.D68A[3] = 1; });
  const d = factoryDesign('M-EV1', [1, 2, 3]), base = E.blank('M-EV1').S;
  d.S.D037[0] = 'Profile 1';           // a placeholder from Add or the Factory set: never over the owner's own name
  d.S['5013'][1] = 7;                  // continuous: the Q3's speeds are numbered by guess
  d.S['501E'][2] = 'Ann';              // artist written: the copyright switch (off on this M) goes with it
  d.S.D00B[3] = 1600;                  // profile 3 was saved in video mode on the Q3: left alone
  d.S.D00B[1] = 8000;                  // not on the Q3: 6400, with a note
  const r = Q.merge(t, d, base), S = JSON.parse(r.text).Settings;
  assert.strictEqual(S.D037[0], codes.D037.factory);
  assert.ok(!r.changes.some(c => c.code === 'D037'), 'no placeholder name written');
  assert.ok(r.skipped.some(s => s.entry.q === '5013' && s.why === 'none'));
  assert.strictEqual(S['501E'][2], 'Ann');
  assert.strictEqual(S.D02F[2], 0, 'the copyright switch goes with the text');
  assert.ok(r.skipped.some(s => s.p === 3 && s.why === 'video'));
  assert.strictEqual(S.D00B[3], codes.D00B.factory);
  assert.ok(r.notes.some(n => n.entry.q === 'D00B' && n.k === 8000 && n.v === 6400));
  // clearing the artist is written; a Q3 name comes in as the page's own name rule cleans it; Dark Background reads as on
  const d2 = factoryDesign('M-EV1', [1]); d2.S['501E'][1] = '';
  assert.ok(Q.merge(madeUp(null, S => { S['501E'] = Array(7).fill('Someone'); }), d2, Object.assign({}, base, { '501E': Array(7).fill('x') })).changes.some(c => c.code === '501E' && c.to === ''));
  const named = Q.designFrom(madeUp(null, S => { S.D037[0] = 'F/2.8 day'; S.D15E[1] = 3; }), 'M-EV1').doc;
  assert.strictEqual(E.profileName(named, 1), 'F28 day');
  assert.strictEqual(named.S.D15E[1], 1);
});

test('the experiment\'s state: what opening a file does, and which values Save compares with', () => {
  const a = madeUp(), b = madeUp(null, S => { S.D1EE[3] = 2; }), old = madeUp(null, S => { codes._generations['4'].added.forEach(c => delete S[c]); });
  const P = (held, text) => Q.openPlan(held, text);
  assert.deepStrictEqual(P(null, a), { mode: 'first', keep: true }, 'nothing held');
  assert.deepStrictEqual(P({ text: a, at: 2 }, b), { mode: 'compare', keep: true }, 'two exports');
  assert.deepStrictEqual(P({ text: a, at: 1, saved: { text: b, at: 2 } }, a), { mode: 'check', keep: true }, 'an export after a save');
  assert.deepStrictEqual(P({ text: a, at: 1, saved: { text: b, at: 2 } }, b), { mode: 'again', keep: false }, 'the saved file itself');
  assert.deepStrictEqual(P({ text: a, at: 3, saved: { text: b, at: 2 } }, b), { mode: 'again', keep: false }, 'the saved file, after another export');
  assert.deepStrictEqual(P({ text: a, at: 3, saved: { text: b, at: 2 } }, a), { mode: 'compare', keep: true }, 'a later export compares');
  assert.deepStrictEqual(P({ text: old, at: 1 }, a), { mode: 'first', keep: true }, 'a writable file after an old-firmware one starts over');
  assert.deepStrictEqual(P({ text: a, at: 1 }, old), { mode: 'compare', keep: false }, 'an old-firmware file never replaces a writable one');
  const fac = { f: 1 }, o = { q3: 'Q3', q3at: 5, S: { o: 1 } };
  assert.strictEqual(Q.baseFor(o, 'Q3', fac), o.S);
  assert.strictEqual(Q.baseFor(o, 'Q3 43', fac), fac, 'another model compares with factory');
  assert.strictEqual(Q.baseFor(null, 'Q3', fac), fac);
  assert.ok(Q.designIsFrom(o, 'Q3', { at: 5 }));
  assert.ok(!Q.designIsFrom(o, 'Q3', { at: 6 }), 'a newer file is not the one the design came from');
  assert.ok(!Q.designIsFrom(o, 'Q3 43', { at: 5 }));
});

// A made-up Q2 export: factory values for the settings Msetter writes, in a Q2's codes, FF4B written twice as every
// Q2 file has it, and the copyright switch at 2, which the M doesn't use. No real Q2 file is in this repository.
const Q2_CODES = [['5010', 0], ['500B', 2], ['5013', 0], ['D006', 3], ['D007', 1000], ['D000', 300], ['D001', 2], ['D00C', 32769],
  ['D00B', 6400], ['5005', 0], ['D014', 5500], ['D004', 1], ['D00F', 3], ['D051', 60], ['D01A', 3], ['FF4B', 0], ['D02F', 2],
  ['FF26', 0], ['FF27', 0], ['FF28', 0], ['FF29', 1]];
const Q2_NAMES = ['D037', 'D038', 'D039', 'D03A', 'FF16', 'FF17'];
function madeUpQ2() {
  const S = {};
  Q2_CODES.forEach(([c, v]) => { S[c] = Array(7).fill(v); });
  Q2_NAMES.forEach((c, i) => { S[c] = ['User' + (i + 1)]; });
  return Q.write({ camera: 'LEICA Q2', codes: Q2_CODES.map(x => x[0]).concat(Q2_NAMES, ['FF4B']), S });
}

test('a Q2 file: its own codes for names and capture assistants, the first screen layout, Auto Review, no copyright', () => {
  const t = madeUpQ2(), f = Q.read(t);
  assert.strictEqual(f.model, 'Q2');
  assert.strictEqual(t.match(/"FF4B"/g).length, 2, 'FF4B stays written twice');
  assert.strictEqual(Q.writable(t), '');
  assert.strictEqual(Q.merge(t, factoryDesign('M11-P', [1, 2, 3, 4, 5, 6]), E.blank('M11-P').S).text, t, 'a factory design writes nothing');
  const d = factoryDesign('M11-P', [1, 2, 3, 4, 5, 6]), S = d.S;
  S.D0AD[0] = 'Street';                       // profile 5's name goes to FF16
  S.D00C[1] = 32768; S['500B'][1] = 1;        // a 1/f limit stays 1/f; metering crosses as it is
  S.D1A5[1] = 1; S.D01F[1] = 2;               // grid on, 6 x 4: the Q2's grid is on or off
  S.D13A[1] = 0; S.D139[1] = 1; S.D0C4[1] = 1; S.D01A[1] = -3;
  S.D169[2] = 1; S.D16C[2] = 0;               // the second screen layout is not the Q2's
  S['501E'][3] = 'Someone'; S.D02F[3] = 1;    // copyright stays as the Q2 has it
  S['500B'][4] = 32769;                       // Highlight-weighted: 2049 in a Q2 file
  const r = Q.merge(t, d, E.blank('M11-P').S);
  const got = r.changes.map(c => c.code + ' ' + c.slot + ' ' + c.to).sort();
  assert.deepStrictEqual(got, ['500B 1 1', '500B 4 2049', 'D00C 1 32768', 'D01A 1 -3', 'FF16 0 Street', 'FF26 1 1', 'FF27 1 1', 'FF28 1 1', 'FF29 1 0'].sort());
  assert.deepStrictEqual(r.skipped.map(s => s.entry.q + ' ' + s.p + ' ' + s.why), [], 'nothing is listed: the other layouts, copyright and codes this older file lacks included');
  assert.ok(Q.untested(r.changes.find(c => c.code === '500B' && c.slot === 4).entry, 2049) && !Q.untested(r.changes.find(c => c.code === '500B' && c.slot === 1).entry, 1), 'Highlight-weighted is untested, Center-weighted is not');
  const back = Q.read(r.text);
  assert.strictEqual(back.S.D02F[3], 2);
  assert.strictEqual(r.text.match(/"FF4B"/g).length, 2);
  const from = Q.designFrom(r.text, 'M11-P').doc.S;
  assert.strictEqual(from.D0AD[0], 'Street');
  assert.deepStrictEqual([from.D1A5[1], from.D01F[1], from.D13A[1], from.D139[1], from.D0C4[1], from.D01A[1], from.D00C[1]], [1, 1, 0, 1, 1, -3, 32768]);
  assert.strictEqual(from.D1A5[2], 0, 'a Q2 grid that is off reads as off');
});

test('a Q2 profile with Auto Review Permanent (-1) takes Msetter’s value', () => {
  const t = madeUpQ2().replace(/("D01A":\[\n)((?: {6}3,?\n){7})/, (m, h) => h + '      3,\n      -1,\n      3,\n      3,\n      3,\n      3,\n      3\n');
  assert.strictEqual(Q.read(t).S.D01A[1], -1);
  const d = factoryDesign('M11-P', [1, 2]); d.S.D01A[1] = 3;
  const r = Q.merge(t, d, E.blank('M11-P').S);
  assert.ok(r.changes.some(c => c.code === 'D01A' && c.slot === 1 && c.to === 3), 'written, not skipped as unset');
  assert.ok(!r.skipped.some(s => s.why === 'unset'));
});

// A Q2 file as firmware 4.00 writes it, with the codes for film styles, peaking, buttons and Favorites at their factory values.
function fullQ2() {
  const S = {}, codes = [];
  const add = (c, v) => { S[c] = Array.isArray(v) ? v : Array(7).fill(v); codes.push(c); };
  Q2_CODES.forEach(([c, v]) => add(c, v));
  [['FF03', 1], ['FF04', 1], ['D134', 1], ['D009', 1], ['D024', 2], ['FF2A', 2], ['D0A6', 2], ['FF42', 1], ['FF2B', 6], ['FF2C', 0], ['FF48', 65356], ['FF49', 20495]].forEach(([c, v]) => add(c, v));
  for (let i = 0x05; i <= 0x11; i++) add('FF' + i.toString(16).toUpperCase().padStart(2, '0'), 3);
  [65356, 20491, 20496, 20485, 53252, 65298, 11, 65363].forEach((v, i) => add('FF' + (0x32 + i).toString(16).toUpperCase(), v));
  [14, 65356, 20491, 20495, 20485, 53252, 65298, 11].forEach((v, i) => add('FF' + (0x3A + i).toString(16).toUpperCase(), v));
  const fav = [20499, 65357, 65281, 20491, 65284, 11, 65363];
  ['D054', 'D055', 'D056', 'D057', 'D058', 'D059', 'D05A', 'D05B', 'D05C', 'D05D', 'D070', 'D071', 'D072', 'D07C'].forEach((c, i) => add(c, fav[i] || 0));
  Q2_NAMES.forEach((c, i) => { S[c] = ['User' + (i + 1)]; codes.push(c); });
  return Q.write({ camera: 'LEICA Q2', codes: codes.concat(['FF4B']), S });
}

test('a Q2 file takes film styles, peaking, buttons, Favorites and more, each marked untested', () => {
  const t = fullQ2();
  assert.strictEqual(Q.merge(t, Q.designFrom(t, 'M11-P').doc, E.clone(Q.designFrom(t, 'M11-P').doc.S)).text, t, 'a design made from the file writes nothing');
  const d = factoryDesign('M11-P', [1, 2]), S = d.S, base = E.clone(S);
  S.D13E[1] = 5; S.D0B0[1] = 2;               // Monochrome High Contrast, contrast +2
  S.D165[1] = 1; S.D11E[1] = 3;               // peaking on, White
  S.D191[1] = 11; S.D193[1] = 26;             // FN button ISO, top button User Profile
  S.D1A9[1] = { value: S.D1A9[1].value, items: [20499, 5, 53264, 11, 13] };  // Lens Detection has no Q2 item
  S.D108[1] = 300; S.D0A2[1] = 2; S.D077[1] = 1; S.D01E[1] = 18;
  const r = Q.merge(t, d, base), at = (c, p) => { const x = r.changes.find(y => y.code === c && y.slot === p); return x && x.to; };
  assert.strictEqual(at('FF04', 1), 5); assert.strictEqual(at('FF10', 1), 5, 'contrast +2 is 5');
  assert.strictEqual(at('FF03', 1), 4, 'White');
  assert.strictEqual(at('FF48', 1), 20495, 'the FN Button starts on ISO');
  assert.deepStrictEqual(['FF32', 'FF33', 'FF34', 'FF35', 'FF36'].map(c => Q.read(r.text).S[c][1]), [20495, 11, 20496, 65535, 65535], 'its list: ISO, User Profile, Exposure Compensation');
  assert.strictEqual(at('FF49', 1), 20496, 'the Right Wheel Button starts on the thumbwheel press job, written with its list');
  assert.deepStrictEqual(['D054', 'D055', 'D056', 'D057', 'D058'].map(c => Q.read(r.text).S[c][1]), [20499, 20485, 20495, 11, 0], 'Favorites in Q2 numbers');
  assert.strictEqual(at('D024', 1), 5); assert.strictEqual(at('FF2A', 1), 1, 'LCD'); assert.strictEqual(at('FF42', 1), 2, 'Exp. Comp.'); assert.strictEqual(at('FF2B', 1), 9);
  assert.ok(r.changes.every(c => Q.untested(c.entry, c.to)), 'every one of these is marked untested');
  assert.strictEqual(r.text.match(/"FF4B"/g).length, 2);
  const back = Q.designFrom(r.text, 'M11-P').doc.S;
  assert.deepStrictEqual([back.D13E[1], back.D0B0[1], back.D165[1], back.D11E[1], back.D191[1], back.D108[1], back.D0A2[1], back.D077[1], back.D01E[1]], [5, 2, 1, 3, 11, 300, 2, 1, 18], 'and reads back');
  assert.deepStrictEqual(back.D1A9[1].items, [20499, 5, 53264, 11]);
});
