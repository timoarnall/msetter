// The page's scripts load in index.html's order and every name one script takes from another is there.
// Each script runs in one shared context, as in the browser, with a stand-in for the window and document that
// answers any question with another stand-in. Then the page is drawn once on every section.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);

// Anything: callable, any property is another stand-in, a number when used as one, an empty list when looped over.
function stub() {
  const fn = function () { return stub(); };
  const store = {};
  return new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return [][Symbol.iterator].bind([]);
      if (k === 'length') return 0;
      if (k === 'then') return undefined;  // not a promise
      if (k in store) return store[k];
      return stub();
    },
    set(t, k, v) { store[k] = v; return true; },
    has() { return true; }
  });
}

function load() {
  const window = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2, addEventListener() {}, matchMedia: () => ({ matches: false }) };
  const storage = {};
  const context = Object.assign(window, {
    document: stub(), console, setTimeout: () => 0, clearTimeout() {},
    localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } },
    TextEncoder, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} }, FileReader: function () {}
  });
  window.window = window; window.globalThis = window; window.self = window; window.matchMedia = window.matchMedia;
  vm.createContext(context);
  for (const f of order) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
  return context;
}

test('index.html loads every script in src', () => {
  const files = fs.readdirSync(path.join(root, 'src')).filter(f => /\.js$/.test(f)).map(f => 'src/' + f).sort();
  assert.deepStrictEqual(order.slice().sort(), files);
});

test('the scripts load in order and the page draws every section', () => {
  const w = load();
  for (const name of ['RULES', 'Engine', 'CATALOGUE', 'SETS', 'Design', 'PHOTO', 'Camera', 'ProfileMaker']) assert.ok(w[name], name + ' is defined');
  const P = w.ProfileMaker;
  const themes = ['sets', 'all', 'menus'].concat(w.CATALOGUE.themes.map(t => t.id));
  for (const t of themes) { P.state.theme = t; P.render(); }
  for (const m of P.state.targets) assert.ok(w.Engine.serialize(P.prepare(m).doc).length > 1000, 'a file for the ' + m);
});

test('every App name a script uses is defined by one of them', () => {
  const w = load();
  const used = new Set();
  order.forEach(f => { for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/\bApp\.([A-Za-z_$][\w$]*)/g)) used.add(m[1]); });
  const missing = [...used].filter(n => !w.App || !(n in w.App));
  assert.deepStrictEqual(missing, []);
});

test('a change that changes nothing makes no Undo step, so its notice offers no Undo', () => {
  const w = load(), A = w.App, st = A.st;
  A.remember(); A.save();
  assert.strictEqual(A.madeStep(), false, 'nothing changed');
  A.remember(); st.doc.S.D00B[1] = st.doc.S.D00B[1] === 6400 ? 3200 : 6400; A.save();
  assert.strictEqual(A.madeStep(), true, 'a value changed');
  // Set per profile is part of Undo: undoing a change brings back the rows split at the time
  A.remember(); st.split.D00B = true; st.doc.S.D00B[1] = 1600; A.save();
  A.undo();
  assert.ok(!st.split.D00B, 'Undo brings back the split rows of its time');
});
