// Untrusted data is typed at the door (docs/state.md, "What comes in"). Settings files get passed around, and the
// one-file copy of the page has no content security policy, so a hand-made file must never put markup or odd objects
// into the page. Run: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');

const exported = fs.readFileSync(path.join(__dirname, 'fixtures', 'mev1-export.lcse'), 'utf8');

// The sample export with every kind of trouble a hand-edited file can hold.
function hostile() {
  const j = JSON.parse(exported), S = j.Settings, codes = Object.keys(S);
  const bad = ['x" onfocus="alert(1)', '<img src=x onerror=alert(1)>', null, { a: 1 }, [1, 2], true, NaN];
  let n = 0;
  codes.forEach(c => {
    if (c === 'D1A9' || c === 'D6B2' || c === 'D124') return;
    if (S[c].length > 1 && n < 40) { S[c][2] = bad[n % bad.length]; n++; }
  });
  // Favorites: profile 1 holds a string item and an object item
  const a = S.D1A9, slots = []; let i = 0;
  while (i < a.length) { const k = a[i + 1]; slots.push([a[i], k].concat(a.slice(i + 2, i + 2 + k))); i += 2 + k; }
  slots[1] = [slots[1][0], 3, 41, 'x" data-injected="1', { x: 1 }];
  S.D1A9 = [].concat(...slots);
  let text = JSON.stringify(j, null, 2);
  text = text.replace('"Settings": {', '"Settings": {\n    "__proto__": [1],\n    "constructor": [2],\n    "nothex": [3],');
  return text;
}

test('a hostile file opens, and every value in it is of the kind its setting holds', () => {
  const doc = E.parse(hostile());
  const m = E.model(doc.model);
  m.order.forEach(code => {
    const r = m.rules[code];
    doc.S[code].forEach(v => {
      if (r.dyn) { assert.strictEqual(typeof v.value, 'number', code); v.items.forEach(x => assert.strictEqual(typeof x, 'number', code)); }
      else if (r.k === 't') assert.strictEqual(typeof v, 'string', code);
      else assert.ok(typeof v === 'number' && isFinite(v), code + ' ' + JSON.stringify(v));
    });
  });
});

test('only codes of four hex digits get in, and nothing reaches the prototype', () => {
  const doc = E.parse(hostile());
  assert.ok(!Object.prototype.hasOwnProperty.call(doc.extra, '__proto__'));
  assert.ok(!('constructor' in doc.extra) || !Object.prototype.hasOwnProperty.call(doc.extra, 'constructor'));
  assert.ok(!doc.order.includes('nothex') && !doc.order.includes('constructor'));
  assert.strictEqual(({}).polluted, undefined);
  const out = E.serialize(doc);
  // text settings may hold any text (the page escapes it); keys and list items may not
  assert.ok(!/"__proto__"|"constructor"|"nothex"|data-injected/.test(out));
});

test('what could not be read is listed, so the page can say so', () => {
  const doc = E.parse(hostile());
  const unread = E.check(doc).filter(i => /could not be read/.test(i.text));
  assert.ok(unread.length >= 30, 'listed ' + unread.length);
});

test('a camera export needs no typing: nothing is listed as unread', () => {
  const doc = E.parse(exported);
  assert.strictEqual(doc.unread, undefined);
  assert.strictEqual(E.serialize(doc), exported);
});

test('a stored design with the wrong shapes is typed back into shape', () => {
  const doc = E.parse(exported);
  doc.S.D010 = 'not a list'; doc.S.D00C = [1, 2]; doc.S.D1A9[1] = { value: 'x', items: ['<b>'] };
  const fixed = E.sanitize(doc);
  assert.ok(fixed.length >= 3);
  assert.ok(Array.isArray(doc.S.D010) && doc.S.D010.length === 7);
  assert.strictEqual(typeof doc.S.D1A9[1].value, 'number');
});
