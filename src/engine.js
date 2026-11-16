// Read, build, check and write Leica M11-family settings files (.lcse).
// Runs in the browser (window.Engine) and in Node (module.exports) so the tests use the same code.
//
// How a camera imports a file (from its firmware, 2.6.4):
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
  function nearest(r, v) {
    if (legal(r, v)) return v;
    if (r.k === 'r' && typeof v === 'number') return Math.max(r.min, Math.min(r.max, Math.round(v)));
    if (r.k === 't' && typeof v === 'string') { var s = v.slice(0, r.max); while (s.length < r.min) s += r.d.charAt(s.length) || 'X'; return s; }
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
  function keyOrder(text, raw) {
    if (typeof text !== 'string') return Object.keys(raw.Settings || {});
    var out = [], re = /"([0-9A-Fa-f]{4})"\s*:\s*\[/g, m;
    while ((m = re.exec(text))) if (out.indexOf(m[1]) < 0 && raw.Settings && m[1] in raw.Settings) out.push(m[1]);
    Object.keys(raw.Settings || {}).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  function parse(text) {
    var raw = typeof text === 'string' ? JSON.parse(text) : text;
    var name = modelForCamera(raw.Camera);
    if (!name) throw new Error('This file is for "' + raw.Camera + '". Profile Maker knows the M11, M11-P, M11 Monochrom, M11-D and M-EV1.');
    var m = model(name), doc = blank(name);
    doc.order = keyOrder(text, raw);
    doc.version = raw.Version;
    doc.fromFile = true;
    doc.order.forEach(function (code) {
      var r = m.rules[code], arr = raw.Settings[code];
      if (!r) { doc.extra[code] = arr; return; }
      doc.S[code] = r.dyn ? splitDynamic(arr, slotCount(r)) : arr.slice(0, slotCount(r));
      while (doc.S[code].length < slotCount(r)) doc.S[code].push(r.d);
    });
    m.order.forEach(function (code) { if (doc.order.indexOf(code) < 0) doc.order.push(code); });
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
    if (!a) return;
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
        var w = nearest(r, v);
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
    var list = profiles(doc), a = doc.S.D124[0];
    if (a && list.indexOf(a) < 0) out.push({ level: 'warning', code: 'D124', slot: 0, text: 'the camera would start in a profile that is not saved, and reset every profile' });
    return out;
  }

  // ---------- labels ----------
  function label(code, v) {
    if (v && typeof v === 'object') return (v.items || []).length + ' items';
    var L = RULES.labels[code];
    if (L && L[v] !== undefined) return L[v];
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
    RULES: RULES, NAME_CODES: NAME_CODES, FAVORITES_MAX: FAVORITES_MAX,
    model: model, rule: rule, modelForCamera: modelForCamera, legal: legal, nearest: nearest,
    blank: blank, parse: parse, dumps: dumps, entries: entries, toFile: toFile, serialize: serialize,
    profiles: profiles, profileName: profileName, setProfiles: setProfiles, syncLive: syncLive,
    translate: translate, check: check, label: label, options: options, sharedOptions: sharedOptions, clone: clone
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
