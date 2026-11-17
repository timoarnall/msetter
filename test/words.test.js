// Words: every setting has a name, counts read right, and the button list matches the Buttons page.
const test = require('node:test');
const assert = require('node:assert');
globalThis.RULES = require('../src/rules.js');
const E = require('../src/engine.js');
globalThis.Engine = E;
const C = globalThis.CATALOGUE = require('../src/catalogue.js');
const W = require('../src/words.js');

test('every setting of every offered camera has a name', () => {
  // the firmware and the manuals name every code except these
  const UNNAMED = { M11: ['D033'], 'M11 Monochrom': ['D016', 'D1F5', 'D1F6', 'D033'] };
  for (const m of ['M11-P', 'M-EV1', 'M11', 'M11 Monochrom']) {
    const none = E.model(m).order.filter(c => W.settingName(c) === c);
    assert.deepStrictEqual(none, UNNAMED[m] || [], m);
  }
});

test('counts say 1 item and 2 items', () => {
  assert.strictEqual(W.count(0, 'item'), '0 items');
  assert.strictEqual(W.count(1, 'item'), '1 item');
  assert.strictEqual(W.count(2, 'profile'), '2 profiles');
  assert.strictEqual(W.listOf(['A']), 'A');
  assert.strictEqual(W.listOf(['A', 'B', 'C']), 'A, B and C');
});

test('the button list names each button as the Buttons page does', () => {
  const rows = C.themes.find(t => t.id === 'buttons').rows;
  W.BUTTONS.filter(b => !b.edit).forEach(b => {
    const row = rows.find(r => r.code === b.code);
    assert.ok(row, b.code + ' is on the Buttons page');
    assert.strictEqual(b.name, row.name);
    assert.strictEqual(!!b.lever, !!row.only, b.name + ' is only on some bodies');
  });
});

test('short values', () => {
  assert.strictEqual(W.short('D010', 0), 'Auto');
  assert.strictEqual(W.short('D115', 4), 'Half-press');
  assert.strictEqual(W.settingName('D1A5'), 'Screen layout 1 grid');
});
