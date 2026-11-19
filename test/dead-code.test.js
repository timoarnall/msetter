// Design rule 6: code no page uses is deleted. Every class the stylesheet styles is written by markup; every data-
// attribute the scripts listen for is written by markup; every name put on App and every module export is used
// outside its own file; every icon is drawn once. From the 2026-11-19 code review's scan.
// Run: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const srcFiles = fs.readdirSync(path.join(root, 'src')).filter(f => /\.js$/.test(f) && !/^(rules|q3codes|photos)\.js$/.test(f)).map(f => 'src/' + f);
const code = Object.fromEntries(srcFiles.concat(['index.html']).map(f => [f, read(f)]));
const all = Object.values(code).join('\n');
const tests = fs.readdirSync(path.join(root, 'test')).filter(f => /\.js$/.test(f)).map(f => read('test/' + f)).join('\n') + read('mac/main.swift');
const css = read('src/app.css').replace(/\/\*[\s\S]*?\*\//g, '');

// 1. classes written by markup
const written = new Set();
for (const m of all.matchAll(/class(?:Name)?\s*=\s*\\?["']([^"']*)/g)) m[1].split(/\s+/).forEach(c => c && written.add(c.replace(/[^\w-]/g, '')));
for (const m of all.matchAll(/classList\.(?:add|toggle|remove|contains)\(\s*'([\w-]+)'/g)) written.add(m[1]);
for (const m of all.matchAll(/'( [\w-]+)'/g)) written.add(m[1].trim());            // class pieces such as (on ? ' current' : '')
for (const m of all.matchAll(/\(\s*\w+(?:\.\w+)* \? ' ?([\w-]+)'/g)) written.add(m[1]);
for (const m of all.matchAll(/className = '([^']*)'/g)) m[1].split(/\s+/).forEach(c => written.add(c));
for (const m of all.matchAll(/'ghost ' \+ \(cls \|\| ''\)|ghost\(was\[\w+\]\.r, '([\w-]+)'\)|'([\w-]+ghost)'/g)) { if (m[1]) written.add(m[1]); if (m[2]) written.add(m[2]); }
const styled = new Set();
for (const m of css.matchAll(/([^{}]+)\{/g)) if (!/^\s*@/.test(m[1])) (m[1].match(/\.[A-Za-z_][\w-]*/g) || []).forEach(c => styled.add(c.slice(1)));
const deadClasses = [...styled].filter(c => !written.has(c)).sort();

// 2. data attributes read vs written
const reads = new Set(), writes = new Set();
for (const m of all.matchAll(/\[data-([\w-]+)/g)) reads.add(m[1]);
for (const m of all.matchAll(/dataset\.(\w+)/g)) reads.add(m[1].replace(/[A-Z]/g, c => '-' + c.toLowerCase()));
for (const m of all.matchAll(/ data-([\w-]+)(?:=|["' >])/g)) writes.add(m[1]);
for (const m of all.matchAll(/dataset\.(\w+)\s*=[^=]/g)) writes.add(m[1].replace(/[A-Z]/g, c => '-' + c.toLowerCase()));
for (const m of all.matchAll(/setAttribute\('data-([\w-]+)'/g)) writes.add(m[1]);
for (const m of all.matchAll(/'data-' \+ button/g)) { writes.add('undo'); writes.add('redo'); }
const readNotWritten = [...reads].filter(a => !writes.has(a)).sort();

// 3. App names defined but never read elsewhere
const defined = new Map();
for (const f of srcFiles) for (const m of code[f].matchAll(/Object\.assign\(App, \{([\s\S]*?)\}\);/g)) for (const k of m[1].matchAll(/(\w+)\s*:/g)) defined.set(k[1], f);
const unusedApp = [...defined].filter(([k, f]) => !srcFiles.some(g => g !== f && new RegExp('\\bApp\\.' + k + '\\b').test(code[g])) &&
  !new RegExp('\\b' + k + '\\b').test(tests)).map(([k, f]) => f + ' App.' + k);
// names re-read within their own file through App (fine) are not counted; names only re-taken as locals count as used
const unusedApp2 = unusedApp.filter(s => { const k = s.split('App.')[1]; return !srcFiles.some(g => new RegExp('= App\\.' + k + '\\b').test(code[g]) && !s.startsWith(g)); });

// 4. module exports nothing outside uses
const MODS = { Engine: 'src/engine.js', Design: 'src/design.js', Words: 'src/words.js', Zip: 'src/zip.js', Q3: 'src/q3.js', Camera: 'src/camera.js', Motion: 'src/motion.js', LIBRARY: 'src/library.js' };
const ALIAS = { Engine: ['E', 'Engine'], Design: ['D', 'Design'], Words: ['W', 'Words'], Zip: ['Zip'], Q3: ['Q3'], Camera: ['Camera'], Motion: ['Motion'], LIBRARY: ['LIBRARY'] };
const outside = (file) => Object.entries(code).filter(([f]) => f !== file).map(([, s]) => s).join('\n') + tests;
const unusedExports = [];
for (const [mod, file] of Object.entries(MODS)) {
  const s = code[file];
  const at = Math.max(s.lastIndexOf('var ' + mod + ' = {'), s.lastIndexOf('  return { '));
  const block = at >= 0 ? [null, s.slice(s.indexOf('{', at) + 1, s.indexOf('}', s.indexOf('{', at)))] : null;
  const names = [...block[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]);
  const out = outside(file);
  names.forEach(n => { if (!ALIAS[mod].some(a => new RegExp('\\b' + a + '\\.' + n + '\\b').test(out))) unusedExports.push(mod + '.' + n); });
}

// 5. SVG strings written more than once
const svgs = {};
for (const f of srcFiles) for (const m of code[f].matchAll(/'(<svg[^']{40,})'/g)) (svgs[m[1]] = svgs[m[1]] || []).push(f);
const dupSvg = Object.entries(svgs).filter(([, fs]) => fs.length > 1).map(([s, fs]) => fs.join(', ') + ': ' + s.slice(0, 70) + '…');


// Written at runtime in a way the scan can't see, each with where.
const RUNTIME = {
  classes: ['m', 'layouts'],   // src/camera.js: the exposure scale's longer marks (i % 3 === 0 ? 'm' : ''); src/editors.js: PAGE names each editor's box
  data: ['undo', 'redo']   // src/ui.js: the notice's Undo and Redo, named from its button
};
// Leftovers known and being removed: each must still be there, so the list only shrinks.
const KNOWN = {
  data: [],
  svg: 0            // every icon is drawn once
};

test('every class the stylesheet styles is written by markup', () => {
  assert.deepStrictEqual(deadClasses.filter(c => !RUNTIME.classes.includes(c)), []);
});
test('every data- attribute a script listens for is written by markup', () => {
  assert.deepStrictEqual(readNotWritten.filter(a => !RUNTIME.data.includes(a) && !KNOWN.data.includes(a)), []);
  KNOWN.data.forEach(a => assert.ok(readNotWritten.includes(a), a + ' is gone: take it off the known list'));
});
test('every App name is read outside its own file', () => { assert.deepStrictEqual(unusedApp2, []); });
test('every module export is used outside its module', () => { assert.deepStrictEqual(unusedExports, []); });
test('every icon is drawn once', () => {
  assert.ok(dupSvg.length <= KNOWN.svg, dupSvg.join('\n'));
  assert.ok(dupSvg.length >= KNOWN.svg, 'fewer icons drawn twice than known: lower KNOWN.svg');
});
