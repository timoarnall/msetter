// Read, build, check and write Leica M11-family settings files (.lcse).
// Runs in the browser (window.Engine) and in Node (module.exports) so the tests use the same code.
//
// How a camera imports a file (firmware 2.6.4):
//  - "Camera" must be the body's own name exactly, or nothing is imported. No message appears.
//  - "Version" is read but not compared.
//  - Every setting is looked up by its code. Missing codes keep the camera's current value.
//  - Every value is checked on its own. A value the camera does not allow is skipped without a message.
//  - Per-profile settings hold 7 slots: 0 is the live state, 1 to 6 are user profiles 1 to 6.
//  - D6B2 marks which profiles are saved (bit n = profile n). Profiles without a bit are reset.
//    If the active profile (D124) has no bit, every profile is reset.
(function (root) {
  'use strict';
  var RULES = root.RULES || (typeof require === 'function' ? require('./rules.js') : null);
  var NAME_CODES = ['D037', 'D038', 'D039', 'D03A', 'D0AD', 'D0AE'];
  var FAVORITES_MAX = 11;
  var FACTORY_ITEMS = { D1A9: [41] };  // a reset camera's Favorites page holds one item (Leica Content Credentials)

  function model(name) { var m = RULES.models[name]; if (!m) throw new Error('Unknown camera ' + name); return m; }
  function modelForCamera(camera) {
    for (var k in RULES.models) if (RULES.models[k].camera === camera) return k;
    return null;
  }
  function rule(modelName, code) { return model(modelName).rules[code]; }
  // Where a profile's value lives: its own slot (1 to 6) for a per-profile setting, slot 0 for a camera-wide one.
  function slot(r, p) { return r && r.p ? p : 0; }
  function get(doc, code, p) { var r = rule(doc.model, code), a = doc.S[code]; return r && a ? a[slot(r, p)] : undefined; }
  function put(doc, code, p, v) { doc.S[code][slot(rule(doc.model, code), p)] = v; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ---------- values ----------
  function legal(r, v) {
    if (!r) return false;
    if (r.k === 'l') return r.v.indexOf(v) >= 0;
    if (r.k === 'r') return typeof v === 'number' && Math.round(v) === v && v >= r.min && v <= r.max;
    if (r.k === 't') return typeof v === 'string' && v.length >= r.min && v.length <= r.max;
    return true;
  }
  // The closest allowed value: same number if allowed, else the nearest number in an ordered list, else the factory value.
  // Settings whose values are amounts: a value a camera lacks becomes the closest amount it has (ISO 64 → 125 on the
  // Monochrom). Other lists (jobs, modes) fall back to the factory value, since "closest" means nothing there.
  // Shutter limits that follow the lens (32768 and up) and Auto (0) only match their own kind.
  var AMOUNTS = { D00B: 1, D010: 1, D0D3: 1, '5010': 1, D00C: 1, D003: 1 };
  function nearest(r, v, code) {
    if (legal(r, v)) return v;
    if (r.k === 'r' && typeof v === 'number') return Math.max(r.min, Math.min(r.max, Math.round(v)));
    if (r.k === 't' && typeof v === 'string') { var s = v.slice(0, r.max); while (s.length < r.min) s += r.d.charAt(s.length) || 'X'; return s; }
    if (r.k === 'l' && AMOUNTS[code] && typeof v === 'number') {
      var kind = function (x) { return x >= 32768 ? 2 : code === 'D010' && x === 0 ? 1 : 0; }, best = null;  // 0 is Auto only for ISO
      r.v.forEach(function (x) { if (typeof x === 'number' && kind(x) === kind(v) && (best === null || Math.abs(x - v) < Math.abs(best - v))) best = x; });
      if (best !== null) return best;
    }
    return r.d;
  }

  // ---------- documents ----------
  // A document: { model, S: {code: slots}, extra: {code: raw array}, order: [codes as in the source file] }
  // Per-profile slots are 7 values; camera-wide slots are 1 value. A dynamic list slot is {value, items}.
  function slotCount(r) { return r.p ? 7 : 1; }
  function blank(modelName) {
    var m = model(modelName), S = {};
    m.order.forEach(function (code) {
      var r = m.rules[code], n = slotCount(r), a = [];
      var items = (FACTORY_ITEMS[code] || []).filter(function (it) { return r.dyn && r.v.indexOf(it) >= 0; });
      for (var i = 0; i < n; i++) a.push(r.dyn ? { value: r.d, items: items.slice() } : r.d);
      S[code] = a;
    });
    S.D6B2 = [0]; S.D124 = [0];
    return { model: modelName, S: S, extra: {}, order: m.order.slice() };
  }

  function splitDynamic(arr, n) {
    var out = [], i = 0;
    while (i + 1 < arr.length && out.length < n) {
      var cnt = arr[i + 1];
      out.push({ value: arr[i], items: arr.slice(i + 2, i + 2 + cnt) });
      i += 2 + cnt;
    }
    while (out.length < n) out.push({ value: out.length ? out[0].value : 13, items: [] });
    return out;
  }
  function joinDynamic(slots) {
    var out = [];
    slots.forEach(function (s) { out.push(s.value, s.items.length); out.push.apply(out, s.items); });
    return out;
  }

  // JSON.parse puts number-like keys ("5005") first, so the file's own key order is read from the text.
  // Only codes of four hex digits are read: nothing else is a camera setting, and a key like __proto__ never gets in.
  var CODE = /^[0-9A-Fa-f]{4}$/;
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function keyOrder(text, raw) {
    var S = raw.Settings || {}, out = [], re = /"([0-9A-Fa-f]{4})"\s*:\s*\[/g, m;
    if (typeof text === 'string') while ((m = re.exec(text))) if (out.indexOf(m[1]) < 0 && own(S, m[1])) out.push(m[1]);
    Object.keys(S).forEach(function (k) { if (CODE.test(k) && out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  // Untrusted values (an opened file, the browser's storage) are typed before anything reads them: numbers where the
  // camera's rule holds numbers, text where it holds text, numbers in lists. A slot of the wrong kind, or the wrong
  // number of slots, takes the factory value. A camera's own export never needs this; a hand-made or broken file can.
  // Returns the slots it replaced, [{ code, slot }], so the page can say so.
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function typed(r, v) {
    if (r.dyn) return v && typeof v === 'object' && isNum(v.value) && Array.isArray(v.items) && v.items.every(isNum) ? v : null;
    return r.k === 't' ? (typeof v === 'string' ? v : null) : (isNum(v) ? v : null);
  }
  function sanitize(doc) {
    var m = model(doc.model), b = blank(doc.model), fixed = [];
    m.order.forEach(function (code) {
      var r = m.rules[code], a = doc.S[code];
      if (!Array.isArray(a) || a.length !== slotCount(r)) { if (a !== undefined) fixed.push({ code: code, slot: 0 }); doc.S[code] = b.S[code]; return; }
      a.forEach(function (v, i) { if (typed(r, v) === null) { a[i] = clone(b.S[code][i]); fixed.push({ code: code, slot: i }); } });
    });
    ['D6B2', 'D124'].forEach(function (c) { if (!Array.isArray(doc.S[c]) || !isNum(doc.S[c][0])) { doc.S[c] = [0]; fixed.push({ code: c, slot: 0 }); } });
    NAME_CODES.forEach(function (c) { if (doc.S[c] && typeof doc.S[c][0] !== 'string') { doc.S[c] = b.S[c] ? clone(b.S[c]) : ['']; fixed.push({ code: c, slot: 0 }); } });
    return fixed;
  }

  // Errors meant for people say what to do; plain marks them so the page shows them as they are.
  var NOT_SETTINGS = 'This is not a settings file. Open the settings.lcse or settings.lcs your camera exports.';
  function plain(text) { var e = new Error(text); e.plain = true; return e; }
  function parse(text) {
    var raw;
    try { raw = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { throw plain(NOT_SETTINGS); }
    if (!raw || typeof raw !== 'object' || typeof raw.Camera !== 'string' || !raw.Settings || typeof raw.Settings !== 'object') throw plain(NOT_SETTINGS);
    var name = modelForCamera(raw.Camera);
    if (!name) throw plain('This file is from a ' + raw.Camera + '. Msetter works with the M11, M11-P, M11 Monochrom and M-EV1.');
    var m = model(name), doc = blank(name);
    doc.order = keyOrder(text, raw);
    doc.version = raw.Version;
    doc.order.forEach(function (code) {
      var r = m.rules[code], arr = raw.Settings[code];
      if (!Array.isArray(arr)) throw plain(NOT_SETTINGS);
      if (!r) { doc.extra[code] = arr; return; }
      doc.S[code] = r.dyn ? splitDynamic(arr, slotCount(r)) : arr.slice(0, slotCount(r));
      while (doc.S[code].length < slotCount(r)) doc.S[code].push(r.d);
    });
    m.order.forEach(function (code) { if (doc.order.indexOf(code) < 0) doc.order.push(code); });
    var fixed = sanitize(doc);
    if (fixed.length) doc.unread = fixed;
    return doc;
  }

  // ---------- writing (the camera's own layout: json-c pretty print, no space after colons, no final newline) ----------
  function pad(n) { return new Array(n + 1).join(' '); }
  function dumps(x, ind) {
    ind = ind || 0;
    if (Array.isArray(x)) {
      if (!x.length) return '[]';
      return '[\n' + x.map(function (v) { return pad(ind + 2) + dumps(v, ind + 2); }).join(',\n') + '\n' + pad(ind) + ']';
    }
    if (x && typeof x === 'object') {
      var ks = Object.keys(x);
      if (!ks.length) return '{}';
      return '{\n' + ks.map(function (k) { return pad(ind + 2) + JSON.stringify(k) + ':' + dumps(x[k], ind + 2); }).join(',\n') + '\n' + pad(ind) + '}';
    }
    return JSON.stringify(x);
  }

  // [code, stored array] in the order the file is written.
  function entries(doc) {
    var m = model(doc.model), out = [];
    doc.order.forEach(function (code) {
      var r = m.rules[code];
      if (r) out.push([code, r.dyn ? joinDynamic(doc.S[code]) : doc.S[code].slice()]);
      else if (doc.extra[code]) out.push([code, doc.extra[code]]);
    });
    return out;
  }
  function toFile(doc) {
    var Settings = {};
    entries(doc).forEach(function (e) { Settings[e[0]] = e[1]; });
    return { Camera: model(doc.model).camera, Version: doc.version || model(doc.model).version, Settings: Settings };
  }
  function serialize(doc) {
    var m = model(doc.model);
    return '{\n  "Camera":' + JSON.stringify(m.camera) + ',\n  "Version":' + (doc.version || m.version) + ',\n  "Settings":{\n' +
      entries(doc).map(function (e) { return '    ' + JSON.stringify(e[0]) + ':' + dumps(e[1], 4); }).join(',\n') + '\n  }\n}';
  }

  // ---------- profiles ----------
  function profiles(doc) {
    var mask = doc.S.D6B2[0], out = [];
    for (var p = 1; p <= 6; p++) if (mask & (1 << p)) out.push(p);
    return out;
  }
  function profileName(doc, p) { return doc.S[NAME_CODES[p - 1]][0]; }
  // The profiles a file really holds when it marks none as saved (D6B2 = 0, as in a hand-edited file): every slot
  // whose name or values differ from the camera's factory slot, plus the start profile.
  function filledProfiles(doc) {
    var b = blank(doc.model), m = model(doc.model), out = [];
    for (var p = 1; p <= 6; p++) {
      var differs = doc.S[NAME_CODES[p - 1]][0] !== b.S[NAME_CODES[p - 1]][0] || p === doc.S.D124[0] ||
        m.order.some(function (code) { return m.rules[code].p && JSON.stringify(doc.S[code][p]) !== JSON.stringify(b.S[code][p]); });
      if (differs) out.push(p);
    }
    return out;
  }
  function setProfiles(doc, list) {
    var mask = 0; list.forEach(function (p) { mask |= 1 << p; });
    doc.S.D6B2 = [mask];
    var a = doc.S.D124[0];
    if (!list.length) doc.S.D124 = [0];
    else if (a && list.indexOf(a) < 0) doc.S.D124 = [list[0]];
  }

  // The live slot (0) mirrors the profile the camera starts in, so the camera does not show it as changed.
  function syncLive(doc) {
    var a = doc.S.D124[0], m = model(doc.model);
    if (!a || a < 1 || a > 6) return;  // 0 is no profile; anything above 6 comes only from a broken file
    m.order.forEach(function (code) {
      var r = m.rules[code];
      if (r.p) doc.S[code][0] = clone(doc.S[code][a]);
    });
  }

  // ---------- translating between cameras ----------
  // Copies every value the target camera allows; anything else becomes the closest allowed value, with a note.
  function translate(doc, toModel, base) {
    var out = base && base.model === toModel ? clone(base) : blank(toModel);
    var m = model(toModel), notes = [];
    m.order.forEach(function (code) {
      var r = m.rules[code], src = doc.S[code];
      if (!src) return;
      out.S[code] = src.map(function (v, slot) {
        if (r.dyn) {
          var items = v.items.filter(function (it) { return r.v.indexOf(it) >= 0; });
          if (code === 'D1A9') items = items.slice(0, FAVORITES_MAX);
          if (items.length !== v.items.length) notes.push({ code: code, slot: slot, from: v.items.length, to: items.length, kind: 'items' });
          return { value: legal(r, v.value) ? v.value : r.d, items: items };
        }
        if (legal(r, v)) return v;
        var w = nearest(r, v, code);
        notes.push({ code: code, slot: slot, from: v, to: w, kind: 'value' });
        return w;
      }).slice(0, slotCount(r));
      while (out.S[code].length < slotCount(r)) out.S[code].push(r.dyn ? { value: r.d, items: [] } : r.d);
    });
    if (doc.version) out.version = doc.version;
    return { doc: out, notes: notes };
  }

  // ---------- checking ----------
  // What the camera would do with this document, in plain words. level: ok | changed | warning
  function check(doc) {
    var m = model(doc.model), out = [];
    m.order.forEach(function (code) {
      var r = m.rules[code];
      (doc.S[code] || []).forEach(function (v, slot) {
        var ok = r.dyn ? legal(r, v.value) && v.items.every(function (it) { return r.v.indexOf(it) >= 0; }) : legal(r, v);
        if (!ok) out.push({ level: 'warning', code: code, slot: slot, text: 'not allowed on the ' + doc.model + '; the camera would skip it' });
      });
    });
    (doc.unread || []).forEach(function (u) { out.push({ level: 'warning', code: u.code, slot: u.slot, text: 'could not be read, so it is the factory value' }); });
    var list = profiles(doc), a = doc.S.D124[0];
    if (a && list.indexOf(a) < 0) out.push({ level: 'warning', code: 'D124', slot: 0, text: 'the camera would start in a profile that is not saved, and reset every profile' });
    return out;
  }

  // ---------- labels ----------
  function label(code, v) {
    if (v && typeof v === 'object') { var n = (v.items || []).length; return n + (n === 1 ? ' item' : ' items'); }
    var L = RULES.labels[code];
    if (L && L[v] !== undefined) return L[v];
    if (code === 'D1A9' && v > 255) {  // a Favorites item that is a setting and has no name of its own takes the setting's
      var h = v.toString(16).toUpperCase(); while (h.length < 4) h = '0' + h;
      if (RULES.names[h]) return RULES.names[h];
    }
    return String(v);
  }
  function options(modelName, code) {
    var r = rule(modelName, code);
    if (!r || r.k !== 'l') return [];
    return r.v.map(function (v) { return { v: v, t: label(code, v) }; });
  }
  // Options allowed on every camera in the list (the app saves for several cameras at once).
  function sharedOptions(models, code) {
    var first = options(models[0], code);
    return first.filter(function (o) {
      return models.every(function (mn) { var r = rule(mn, code); return r && legal(r, o.v); });
    });
  }

  var Engine = {
    RULES: RULES, NAME_CODES: NAME_CODES, FAVORITES_MAX: FAVORITES_MAX, NOT_SETTINGS: NOT_SETTINGS,
    model: model, rule: rule, slot: slot, get: get, put: put, modelForCamera: modelForCamera, legal: legal, nearest: nearest,
    blank: blank, parse: parse, sanitize: sanitize, entries: entries, toFile: toFile, serialize: serialize,
    profiles: profiles, filledProfiles: filledProfiles, profileName: profileName, setProfiles: setProfiles, syncLive: syncLive,
    translate: translate, check: check, label: label, options: options, sharedOptions: sharedOptions, clone: clone
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
