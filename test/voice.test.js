// Words, checked: every word a person reads in Msetter, against one list (test/voice-words.json): the house voice
// rules, the phrases struck in review, the retired words, the project's own patterns and American spelling. Design
// rule 6 (labels, not explanations) and the writing rules.
//
// Where the words are: string literals in src/*.js (comments and code skipped; rules.js, q3codes.js and photos.js left
// out: they hold the camera's own names, generated names and a picture), index.html, site/index.html, README.md,
// docs/*.md, the prose in tools/build_docs.py and tools/build_q_codes.py (docs/settings/ is checked through its
// generator), mac/*.swift and the GitHub issue templates. A script with words that no check reads fails the first test.
//
// EXPECTED, below, lists breaches already known in src/*.js, index.html, site/index.html and README.md, by file and the
// string (its first 90 characters). They are being fixed; each fix removes its line. A listed breach that is gone
// fails the last test, so the list only shrinks. No other file may have a listed breach.
//   VOICE_PRINT=1 node --test test/voice.test.js     prints the current breaches in those files in EXPECTED's form
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const W = JSON.parse(fs.readFileSync(path.join(__dirname, 'voice-words.json'), 'utf8'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ls = (d, re) => fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d)).filter(f => re.test(f)).sort().map(f => d + '/' + f) : [];
const KEY = 90;  // a string is known by its first 90 characters

// Breaches known on 2026-11-19, in the files being rewritten. Each fix removes its line; the list ends empty.
const EXPECTED = {
  'src/save.js': [
    "if (r.notes.length) lines.push({ note: true, t: W.count(r.notes.length, 'setting') + ' cha",
    "lines.push({ t: W.count(ps.length, 'profile') + (ps.length > 1 && ps.indexOf(start) >= 0 ?",
    "lines.push({ t: W.count(ps.length, 'profile') + (ps.indexOf(start) >= 0 && ps.length > 1 ?",
  ]
};
const KNOWN_FILES = /^(src\/[\w-]+\.js|index\.html|site\/index\.html|README\.md)$/;

// ---------- where the words are ----------

// String literals in a script, with line numbers. Skips comments, and regex literals (a / after an operator).
function literals(src) {
  const out = []; let i = 0, line = 1, prev = '';
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); line += (src.slice(i, e).match(/\n/g) || []).length; i = e + 2; continue; }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$/.test(prev)) {  // a regex literal
      i++; let cls = false;
      while (i < src.length && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
      i++; prev = 'r'; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, s = '';
      const at = line;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && src[j + 1] === 'u' && src[j + 2] === '{') {  // Swift's \u{2019}
          const e = src.indexOf('}', j); s += String.fromCodePoint(parseInt(src.slice(j + 3, e), 16)); j = e + 1; continue;
        }
        if (src[j] === '\\') { s += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; continue; }
        if (c === '`' && src[j] === '$' && src[j + 1] === '{') { let d = 1; j += 2; while (d && j < src.length) { if (src[j] === '{') d++; if (src[j] === '}') d--; j++; } s += '{…}'; continue; }
        if (src[j] === '\n') line++;
        s += src[j]; j++;
      }
      out.push({ line: at, s }); i = j + 1; prev = 's'; continue;
    }
    if (!/\s/.test(c)) prev = /[A-Za-z0-9_$]/.test(c) ? (/[A-Za-z]/.test(c) && src.slice(i - 6, i + 1).endsWith('return') ? 'return' : 'w') : c;
    i++;
  }
  return out;
}
const ATTR = /\b(title|aria-label|placeholder|alt|data-tip)="([^"]+)"/g;
// The words a person reads in one literal: attribute values, and the text between tags. Class names, selectors,
// style values and single lower-case words (keys, ids) are code, not words. A literal often ends inside a tag
// ('<span aria-label="Slot ' + n): the start of that attribute's value counts, the rest of the tag doesn't.
const ATTR_OPEN = /\b(title|aria-label|placeholder|alt|data-tip)="([^"]*)$/;
function wordsOf(s) {
  const got = [];
  for (const m of s.matchAll(ATTR)) got.push(m[2]);
  const open = s.match(/<[a-zA-Z][^>]*$/), part = open && open[0].match(ATTR_OPEN);
  if (part && /[A-Za-z]{2}/.test(part[2])) got.push(part[2].trim());
  const t = s.replace(/^[^<>]*=["'][^<>]*>/, ' ').replace(/<[a-zA-Z][^>]*$/, ' ').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[.,;:] (?=\w)/, '');
  const prose = t.length > 2 && /[A-Za-z]{2}/.test(t) && !/^[\w.#:\-\[\]="' ()>~*+,%/]*$/.test(t) || /^[A-Z][a-z]+( [a-z]+)*[.…]?$/.test(t) || / [a-z]+ /.test(t);
  if (prose && !/var\(--|\bpx\b|=>|querySelector|^[.#\[]|^[a-z-]+( [a-z-]+)*$/.test(t)) got.push(t);
  return got;
}
const GENERATED = /^src\/(rules|q3codes|photos)\.js$/;
// Every string literal as written, markup and keys included: the struck phrases and the house voice words are
// checked here too, so a phrase can't hide in a string that doesn't read as words (design rule 6's old scan).
const RAW = [];
function scripts() {
  const out = [];
  for (const f of ls('src', /\.js$/).filter(f => !GENERATED.test(f)).concat(ls('mac', /\.swift$/)))
    for (const l of literals(read(f))) {
      RAW.push({ f, line: l.line, text: l.s });
      for (const w of wordsOf(l.s)) out.push({ f, line: l.line, text: w, ui: true });
    }
  return out;
}
function pages() {
  const out = [];
  for (const f of ['index.html', 'site/index.html']) {
    read(f).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, '')).split('\n').forEach((l, i) => {
      for (const m of l.matchAll(ATTR)) out.push({ f, line: i + 1, text: m[2], ui: f === 'index.html' });
      const t = l.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]{2}/.test(t)) out.push({ f, line: i + 1, text: t, ui: f === 'index.html', heading: /<h[1-3][\s>]/.test(l) });
    });
  }
  return out;
}
const MARKDOWN = () => ['README.md'].concat(ls('docs', /\.md$/), ls('.github/ISSUE_TEMPLATE', /\.md$/));
function markdown() {
  const out = [];
  for (const f of MARKDOWN()) {
    let code = false;
    read(f).split('\n').forEach((l, i) => {
      if (/^```/.test(l)) { code = !code; return; }
      if (code || !l.trim() || /^---\s*$/.test(l)) return;
      const text = l.replace(/`[^`]*`/g, '`…`').replace(/\]\([^)]*\)/g, ']').replace(/https?:\S+/g, '');
      out.push({ f, line: i + 1, text, heading: /^#{1,6} /.test(l) });
    });
  }
  return out;
}
// The prose a docs generator writes: its quoted strings that read as words. Comments and error messages are skipped.
const GENERATORS = ['tools/build_docs.py', 'tools/build_q_codes.py'];
function generators() {
  const out = [];
  for (const f of GENERATORS) read(f).split('\n').forEach((l, i) => {
    if (/^\s*#/.test(l) || /fail\(|raise |sys\.exit|print\(/.test(l)) return;
    for (const m of l.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
      const s = m[1] !== undefined ? m[1] : m[2];
      if (/[A-Za-z]{3,} [a-z]/.test(s)) out.push({ f, line: i + 1, text: s.replace(/\\(.)/g, '$1'), heading: /^#{1,6} /.test(s) });
    }
  });
  return out;
}
const ALL = [].concat(scripts(), pages(), markdown(), generators());
const UI = ALL.filter(x => x.ui);
// The public pages talk to the same people as the app, so they use its words too: README, project page, issue templates.
const PUBLIC = ALL.filter(x => x.ui || /^(README\.md|site\/index\.html|\.github\/)/.test(x.f));

// ---------- matching ----------
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyOf = s => s.replace(/\s+/g, ' ').trim().slice(0, KEY);
// A match inside an allowed phrase (a genre name, someone else's quoted words) doesn't count.
const allowed = (text, m) => W.allow.phrases.some(p => {
  const t = text.toLowerCase(), q = p.toLowerCase(); let k = t.indexOf(q);
  while (k >= 0) { if (k <= m.index && m.index + m[0].length <= k + q.length) return true; k = t.indexOf(q, k + 1); }
  return false;
});
// First person in someone else's quoted words is theirs: 'for still subjects I set 1/8'.
const unquoted = s => s.replace(/(^|[\s(:])(['‘"“])[^'‘’"“”]+['’"”](?=[\s).,;:]|$)/g, '$1');
const BREACHES = [], seen = new Set();
function add(check, x, what) {  // once per place: a raw literal repeats what its words already reported
  const id = [check, x.f, x.line, what].join('\n');
  if (!seen.has(id)) { seen.add(id); BREACHES.push({ check, f: x.f, line: x.line, key: keyOf(x.key || x.text), msg: what }); }
}
function scan(check, items, pats) {
  for (const [name, p] of Object.entries(pats)) {
    if (name === 'about') continue;
    const re = new RegExp(p.re, 'g' + (p.ci ? 'i' : '') + 'u');
    for (const x of items) {
      const text = name === 'first person' ? unquoted(x.text) : x.text;
      for (const m of text.matchAll(re)) if (!allowed(text, m)) add(check, x, `${name}: "${m[0]}"`);
    }
  }
}

// ---------- the rules ----------
scan('voice', ALL.concat(RAW), W.voice);
scan('project', ALL, W.project);
for (const x of ALL.concat(RAW)) for (const p of W.struck.phrases) if (x.text.toLowerCase().includes(p.toLowerCase())) add('struck', x, `struck phrase "${p}"`);
const british = Object.keys(W.spelling.pairs);
for (const x of ALL) for (const m of x.text.matchAll(new RegExp('\\b(' + british.map(esc).join('|') + ')\\w*', 'gi'))) {
  if (allowed(x.text, m)) continue;
  const stem = british.find(b => m[1].toLowerCase() === b);
  add('spelling', x, `British "${m[0]}" (American: ${W.spelling.pairs[stem]}…)`);
}
const owner = (read('LICENSE').match(/Copyright \(c\) \d{4} (.+)/) || [])[1] || '';
const ownerRe = owner ? new RegExp('\\b(' + owner.trim().split(/\s+/).map(esc).join('|') + ')\\b') : null;
if (ownerRe) for (const x of ALL) if (ownerRe.test(x.text) && !/Made by|Copyright|©/.test(x.text)) add('owner', x, 'the owner\'s name outside the credit');
scan('interface', UI, W.ui_only);
for (const x of PUBLIC) {
  if (W.allow.strings[x.text]) continue;
  for (const [old, use] of Object.entries(W.retired.words)) {
    const re = new RegExp('(?<![\\w-])' + esc(old) + '(?![\\w-])', 'u');
    if (re.test(x.text)) add('interface', x, `retired "${old}" (use ${use})`);
  }
}
// Titles: no commas, no counts, never "The …". A model name such as M11-P is not a count.
const COUNT = /(^|\s)(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|hundred)\s+[a-z]+s\b/i;
function title(x, t) {
  t = t.replace(/^#+\s*/, '').trim();
  if (!t) return;
  if (t.includes(',')) add('titles', x, 'a comma in a title');
  if (COUNT.test(t)) add('titles', x, 'a count in a title');
  if (/^The\s/.test(t)) add('titles', x, 'a title starting "The"');
}
for (const x of ALL) if (x.heading) title(x, x.text);
for (const f of ls('src', /\.js$/).filter(f => !GENERATED.test(f))) read(f).split('\n').forEach((l, i) => {
  for (const m of l.matchAll(/<h[1-3][^>]*>([^<'"]+)/g)) title({ f, line: i + 1, text: m[1] }, m[1]);
});
// A notice or a tick line names what happened, never a count. A count is allowed where it is the news, with the reason.
const COUNT_OK = { 'Room for ': 'how much room is left is the fact', 'what changed': 'the change count in the top bar' };
for (const f of ls('src', /\.js$/).filter(f => !GENERATED.test(f))) read(f).split('\n').forEach((l, i) => {
  const hit = /\bnotice\((?:(?!\)\s*;).)*\bcount\(/.test(l) || /lines\.push\(\{[^}]*\bt: [^}]*\bcount\(/.test(l);
  if (hit && !Object.keys(COUNT_OK).some(k => l.includes(k))) add('notices', { f, line: i + 1, text: l.trim() }, 'a count where names belong');
});

// Empty sentences: lines that sound like copy and say nothing (the owner, 2026-11-19, on "What one press of the
// shutter does.": "the worst of your ai-ey writing"). Shapes, not words, so a new one is caught too:
//  - a tagline: a sentence that opens with What, How, Where, When, Why or Which and ends in a full stop
//  - a label-colon opener: "Private: your profiles…", "Your own menu page: Menu shows…"
//  - a summary with no main verb: "Every setting you can change.", "Your user profiles, in the order…"
//  - a list of nouns with no verb: "Power, lights, phone, language, file names and your copyright."
const VERB = /\b(is|are|was|were|be|been|has|have|had|do|does|did|can|can’t|can't|cannot|could|will|would|should|may|might|must|isn’t|isn't|aren’t|doesn’t|don’t|won’t)\b|\b[a-z]+(ed|ing)\b|\b(keeps?|stays?|shows?|takes?|makes?|sets?|changes?|goes|go|uses?|turns?|steps?|holds?|writes?|reads?|needs?|gets?|gives?|lets?|puts?|lists?|says?|asks?|starts?|moves?|adds?|opens?|saves?|imports?|exports?|skips?|resets?|matches|rises?|replaces?|counts?|fits?|breaks?|follows?|sends?|brings?|works?|means?|comes?|runs?|looks?|plays?|leaves?|stops?|blurs?|climbs?|fires?|lights?|wraps?|tells?|checks?|finds?|knows?|shoots?|press(es)?|choose|chooses|apply|applies|carry|carries|pick|picks|try|tries|see|sees|allows?|offers?|includes?|contains?|names?|describes?|explains?)\b/i;
// A docs paragraph may open with a bold or italic label ("**What is known.**", "*Settled 2026-11-16.*"): a label, not a
// sentence. Table rows are data.
const sentences = t => String(t).replace(/<[^>]*>/g, ' ').replace(/^\s*(\*\*[^*]+\*\*|\*[^*]+\*)\s*/, '').replace(/\*\*/g, '')
  .split(/(?<=[.!?])\s+(?=[A-Z“"(])/).map(x => x.trim()).filter(Boolean);
for (const x of ALL) {
  if (/^\s*\|/.test(x.text)) continue;
  for (const z of sentences(x.text)) {
    const words = z.split(/\s+/).length, prose = /[.]$/.test(z) && words >= 3 && !/^[-*#|>`]/.test(z);
    if (!prose) continue;
    // a wh-opening with a comma has its main clause ("When you export, the camera writes…"); without one it is a tagline
    // "What it does is unknown." is a sentence: a wh-clause as the subject of is or are, then what it is
    const whole = /\s(is|are) (unknown|untested|known|in|on|at|the|a|an|listed|written|kept|set|given)\b/.test(z);
    if (/^(What|How|Where|When|Why|Which)\b/.test(z) && !/,/.test(z) && !whole) add('empty', x, 'a tagline that opens with "' + z.split(' ')[0] + '": "' + z.slice(0, 70) + '"');
    // docs use labeled lists on purpose (Thumbwheel press: factory…); the app and the public pages don't
    if ((x.ui || /^(site\/|README)/.test(x.f)) && words >= 5 && /^[A-Z][a-z]+(?: [a-z]+){0,4}: \S/.test(z) && !/^(Every profile|Undid|Redid|Note|Default profile): /.test(z)) add('empty', x, 'a label-colon opener: "' + z.slice(0, 70) + '"');
    if ((words <= 8 && /^(Every|All|Everything)\b[^.,;:]* (you|that|which) [^.]*\.$/.test(z)) || /^Your [a-z ]+, (in|for|with|from|on|of) /.test(z)) add('empty', x, 'a summary with no main verb: "' + z.slice(0, 70) + '"');
    if ((z.match(/,/g) || []).length >= 2 && /\band\b/.test(z) && words <= 14 && !VERB.test(z.replace(/\b(and|or)\b/g, ''))) add('empty', x, 'a list of nouns with no verb: "' + z.slice(0, 70) + '"');
  }
}

// ---------- reporting ----------
const isExpected = b => (EXPECTED[b.f] || []).includes(b.key);
function report(check) {
  const out = BREACHES.filter(b => b.check === check && !isExpected(b)).map(b => `${b.f}:${b.line}  ${b.msg}  in "${b.key}"`);
  assert.deepStrictEqual(out, [], check + ':\n' + out.join('\n'));
}
if (process.env.VOICE_PRINT) {
  const by = {};
  for (const b of BREACHES) if (KNOWN_FILES.test(b.f)) (by[b.f] = by[b.f] || new Set()).add(b.key);
  console.log('const EXPECTED = {\n' + Object.keys(by).sort().map(f => '  ' + JSON.stringify(f) + ': [\n' +
    [...by[f]].map(k => '    ' + JSON.stringify(k)).join(',\n') + '\n  ]').join(',\n') + '\n};');
}

test('every file a person reads is scanned', () => {
  const scanned = new Set(ALL.map(x => x.f).concat(RAW.map(x => x.f)));  // every string literal is checked for struck phrases
  for (const f of ['src/app.js', 'src/save.js', 'src/q3page.js', 'src/catalogue.js', 'src/sets.js', 'src/library.js', 'index.html', 'site/index.html',
    'README.md', 'docs/README.md', 'docs/leica-q.md', 'mac/main.swift', 'tools/build_docs.py', 'tools/build_q_codes.py', '.github/ISSUE_TEMPLATE/q3-report.md'])
    assert.ok(scanned.has(f), f + ' is scanned');
  // Every script that holds words is read; the ones with none are the engine, the zip writer, movement and file work.
  const missing = ls('src', /\.js$/).filter(f => !GENERATED.test(f) && !/(zip|motion|design|engine|version)\.js$/.test(f) && !scanned.has(f));
  assert.deepStrictEqual(missing, [], 'scripts with words that no check reads');
  assert.ok(UI.length > 500, 'the interface strings are found (' + UI.length + ')');
  assert.ok(ownerRe, 'the license names its author, so the owner check knows the name');
});

test('the house voice rules', () => report('voice'));
test('the project\'s own patterns: time framing, unknowns as a schedule, first person, second names, idiom headings', () => report('project'));
test('phrases struck in review stay struck, everywhere', () => report('struck'));
test('American spelling', () => report('spelling'));
test('the owner\'s name only in the credit and the license', () => report('owner'));
test('interface words: labels, not explanations; one word for one thing', () => report('interface'));
test('titles: no commas, no counts, never "The …"', () => report('titles'));
test('notices and ticks name things, not counts', () => report('notices'));
test('no empty sentences: taglines, label-colon openers, summaries and noun lists with no verb', () => report('empty'));

test('known breaches: only in the files being rewritten, and each one still there', () => {
  const outside = Object.keys(EXPECTED).filter(f => !KNOWN_FILES.test(f));
  assert.deepStrictEqual(outside, [], 'files that must pass with nothing listed');
  const live = new Set(BREACHES.map(b => b.f + '\n' + b.key));
  const gone = [];
  for (const [f, keys] of Object.entries(EXPECTED)) for (const k of keys) if (!live.has(f + '\n' + k)) gone.push(`${f}  "${k}"`);
  assert.deepStrictEqual(gone, [], 'fixed: remove these from EXPECTED in test/voice.test.js');
});

// The project page and README say what Msetter does for a photographer, not how the interface shows it (ticks, dots,
// tiles, bars, wrapping columns), and they don't lean on "every" for emphasis. Link text (the docs page called Every
// setting) is left out.
test('the project page and README: what Msetter does, no "every", no interface mechanics', () => {
  const page = read('site/index.html').replace(/<(style|script)[\s\S]*?<\/\1>/g, '').replace(/<a\b[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, ' ');
  const readme = read('README.md').replace(/<picture>[\s\S]*?<\/picture>/g, '').replace(/\[[^\]]*\]\([^)]*\)/g, '');
  const bad = [];
  for (const [f, text] of [['site/index.html', page], ['README.md', readme]])
    for (const re of [/\bevery\w*\b[^.]*/gi, /\b(green tick|red dot|ticks? in|tiles?|bars?|wrap\w*)\b[^.]*/gi])
      for (const m of text.match(re) || []) bad.push(f + ': ' + m.slice(0, 70));
  assert.deepStrictEqual(bad, []);
});
