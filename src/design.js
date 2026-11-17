// Building and changing a design: profiles made from starting sets, copied, added, removed and renamed, and the
// design's file for each camera.
(function (root) {
  'use strict';
  var Engine = root.Engine || require('./engine.js');
  var CATALOGUE = root.CATALOGUE || require('./catalogue.js');

  // The parts of a screen layout that are on or off. A set that names a layout turns off the parts it doesn't name.
  var PARTS_ON_OFF = ['bars', 'grid', 'clip', 'peak', 'horizon', 'histo'];
  function applyValues(doc, slot, v) {
    Object.keys(v || {}).forEach(function (k) {
      if (k === 'favorites') { doc.S.D1A9[slot] = { value: doc.S.D1A9[slot].value, items: v.favorites.slice(0, Engine.FAVORITES_MAX) }; return; }
      if (k === 'layout') {
        v.layout.forEach(function (L, li) {
          var codes = CATALOGUE.LAYOUTS[li];
          PARTS_ON_OFF.forEach(function (key) { if (!(key in L)) doc.S[codes[key]][slot] = 0; });
          Object.keys(L).forEach(function (key) { doc.S[codes[key]][slot] = L[key]; });
        });
        return;
      }
      if (!doc.S[k]) return;
      var r = Engine.rule(doc.model, k), x = v[k];
      doc.S[k][slot] = r && !Engine.legal(r, x) ? Engine.nearest(r, x, k) : x;  // a set's value this camera lacks: the closest it has
    });
    var fr = Engine.rule(doc.model, 'D1A9');  // Favorites only hold items this camera has
    if (fr && doc.S.D1A9[slot]) doc.S.D1A9[slot].items = doc.S.D1A9[slot].items.filter(function (it) { return fr.v.indexOf(it) >= 0; });
  }

  // Values every new design starts from, on top of the factory values. D010 is the ISO on the M-EV1 and the
  // ISO dial's M position on the M11-P (factory 12500 there); Auto keeps a shared design safe on both.
  var START = { D010: 0 };

  function fromSet(set, modelName) {
    var doc = Engine.blank(modelName), list = [];
    set.profiles.forEach(function (p, i) {
      var slot = i + 1;
      list.push(slot);
      doc.S[Engine.NAME_CODES[i]] = [p.name];
      applyValues(doc, slot, START);
      applyValues(doc, slot, set.base);
      applyValues(doc, slot, p.v);
    });
    Engine.setProfiles(doc, list);
    doc.S.D124 = [1];
    Engine.syncLive(doc);
    return doc;
  }

  // Profile to takes every per-profile value of profile from, and the values kept for other cameras.
  function copyProfile(doc, from, to) {
    var m = Engine.model(doc.model);
    m.order.forEach(function (code) { if (m.rules[code].p) doc.S[code][to] = Engine.clone(doc.S[code][from]); });
    eachKept(doc, function (code) { doc.kept[code][to] = Engine.clone(doc.kept[code][from]); });
  }

  function addProfile(doc, copyFrom) {
    var list = Engine.profiles(doc);
    for (var p = 1; p <= 6; p++) {
      if (list.indexOf(p) >= 0) continue;
      if (copyFrom) copyProfile(doc, copyFrom, p);
      else {
        var b = Engine.blank(doc.model);
        Engine.model(doc.model).order.forEach(function (code) { if (Engine.model(doc.model).rules[code].p) doc.S[code][p] = Engine.clone(b.S[code][p]); });
        applyValues(doc, p, START);
        eachKept(doc, function (code) { doc.kept[code][p] = keptSlot(code, p); });
      }
      var base = copyFrom ? Engine.profileName(doc, copyFrom) : 'Profile ' + p;
      doc.S[Engine.NAME_CODES[p - 1]] = [uniqueName(doc, base, p)];
      var wasEmpty = !list.length;
      list.push(p); list.sort();
      Engine.setProfiles(doc, list);
      if (wasEmpty) doc.S.D124 = [p];  // the start profile changes only when this is the first profile
      return p;
    }
    return null;
  }

  // A copy of Profile 1 is Profile 2, of User1 is User2, of Fast is Fast 2, of F16 is F16 2. Names stay 3 to 10 characters.
  function uniqueName(doc, base, p) {
    var names = Engine.profiles(doc).map(function (q) { return Engine.profileName(doc, q); });
    base = String(base || '').trim().slice(0, 10);
    var n = base.length < 3 ? (base + ' ' + p).trim().slice(0, 10) : base;
    var m = base.match(/^(.*?)(\s?)(\d+)$/), stem = m && m[1].trim().length >= 2 ? m[1].trim() : base, sep = m && m[1].trim().length >= 2 ? m[2] : ' ';
    for (var i = 2; names.indexOf(n) >= 0; i++) { var tail = sep + i; n = stem.slice(0, 10 - tail.length).trim() + tail; }
    return n;
  }

  // The emptied slot goes back to the camera's factory values and name, as the camera resets it after import.
  function removeProfile(doc, p) {
    Engine.setProfiles(doc, Engine.profiles(doc).filter(function (q) { return q !== p; }));
    var b = Engine.blank(doc.model), m = Engine.model(doc.model), nc = Engine.NAME_CODES[p - 1];
    m.order.forEach(function (code) { if (m.rules[code].p && b.S[code]) doc.S[code][p] = Engine.clone(b.S[code][p]); });
    if (b.S[nc]) doc.S[nc] = Engine.clone(b.S[nc]);
    eachKept(doc, function (code) { doc.kept[code][p] = keptSlot(code, p); });
  }

  // Profile p takes profile i of a starting set: its values and its name, made unique among the other profiles.
  function useSetProfile(doc, p, set, i) {
    var src = fromSet(set, doc.model), m = Engine.model(doc.model), nc = Engine.NAME_CODES[p - 1], keep = Engine.profileName(doc, p);
    m.order.forEach(function (code) { if (m.rules[code].p) doc.S[code][p] = Engine.clone(src.S[code][i + 1]); });
    eachKept(doc, function (code) { doc.kept[code][p] = keptSlot(code, p, set, i); });
    doc.S[nc] = [''];  // so the name it had does not count as taken
    doc.S[nc] = [uniqueName(doc, set.profiles[i].name || keep, p)];
  }

  // A profile name the camera accepts: 3 to 10 letters, numbers, spaces or dashes.
  function cleanName(s) { return String(s).replace(/[^A-Za-z0-9 \-]/g, '').trim().slice(0, 10).trim(); }
  // What typing a name for profile p gives: { name: the cleaned name, why: null, 'short' (under 3 characters once
  // cleaned) or 'taken' (another profile has it) }. The name is the profile's own when why is set.
  function checkName(doc, p, typed) {
    var name = cleanName(typed);
    if (name.length < 3) return { name: name, why: 'short' };
    if (Engine.profiles(doc).some(function (q) { return q !== p && Engine.profileName(doc, q) === name; })) return { name: name, why: 'taken' };
    return { name: name, why: null };
  }

  // ---------- part sets ----------
  // A part set (PART_SETS in sets.js) changes one part of the camera in every profile: the buttons, Favorites or the
  // screen layouts. Each camera has its own version of it.
  var ALL_SLOTS = [1, 2, 3, 4, 5, 6];
  function partValues(part, model) { return Object.assign({}, part.v, part.bodies && part.bodies[model]); }
  // The codes a part set writes on a camera: for a layout set, every part of the layouts it names.
  function partCodes(part, model) {
    var out = [], v = partValues(part, model);
    Object.keys(v).forEach(function (k) {
      if (k === 'favorites') out.push('D1A9');
      else if (k === 'layout') v.layout.forEach(function (L, li) {
        var codes = CATALOGUE.LAYOUTS[li];
        Object.keys(codes).forEach(function (key) { if (key in L || PARTS_ON_OFF.indexOf(key) >= 0) out.push(codes[key]); });
      });
      else out.push(k);
    });
    return out;
  }
  function usePart(doc, part, slots) { var v = partValues(part, doc.model); slots.forEach(function (q) { applyValues(doc, q, v); }); }
  // Picking a part set: its values in every saved profile. They count as untouched again, so each camera's file takes
  // that camera's version of the set until you change one (origin.touched, see followStart).
  function pickPart(doc, part, origin) {
    var ps = Engine.profiles(doc), t = origin && origin.touched;
    usePart(doc, part, ps);
    if (t) partCodes(part, doc.model).forEach(function (c) {
      if (!t[c]) return;
      t[c] = t[c].filter(function (q) { return ps.indexOf(q) < 0; });
      if (!t[c].length) delete t[c];
    });
  }
  // Whether every saved profile holds the part set's values for this camera.
  function partMatches(doc, part) {
    var x = setDoc(null, [part], doc.model), ps = Engine.profiles(doc);
    return ps.length > 0 && partCodes(part, doc.model).every(function (c) {
      if (!doc.S[c] || !x.S[c]) return true;
      return ps.every(function (q) { return c === 'D1A9' ? same(doc.S[c][q].items, x.S[c][1].items) : same(doc.S[c][q], x.S[c][1]); });
    });
  }
  function withParts(doc, parts) {
    if (!parts || !parts.length) return doc;
    var x = { model: doc.model, S: Engine.clone(doc.S) };
    parts.forEach(function (p) { usePart(x, p, ALL_SLOTS); });
    return x;
  }

  // ---------- moving a design to another camera ----------
  var SPECIAL = ['D6B2', 'D124'].concat(Engine.NAME_CODES);
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // A starting set (or none) with the part sets picked after it, made on a camera. Read only: followStart asks for the
  // same few many times.
  var setDocs = {};
  function setDoc(set, parts, model) {
    var k = (set ? set.id : '') + ' ' + (parts || []).map(function (p) { return p.id; }).join(' ') + ' ' + model;
    if (!setDocs[k]) { setDocs[k] = set ? fromSet(set, model) : Engine.blank(model); (parts || []).forEach(function (p) { usePart(setDocs[k], p, ALL_SLOTS); }); }
    return setDocs[k];
  }
  function fits(r, v) { return r.dyn ? Engine.legal(r, v.value) && v.items.every(function (it) { return r.v.indexOf(it) >= 0; }) : Engine.legal(r, v); }

  // Settings still exactly as the starting set left them take each camera's own version of that set, so Factory is
  // each camera's own factory. Untouched means: equal to the set's value on the design's camera, equal to the starting
  // point (ref, moved along with the design), and not changed before an earlier move (touched: { code: [slots] }).
  // So a value you changed is never replaced, even one that later lands on the set's value of another camera.
  // Part sets picked after the starting set (parts) are followed the same way, for the codes they write, with or
  // without a starting set: their values count as part of the starting point. A part set's Favorites are compared by
  // their items. Other lists are compared whole. Returns the slots it replaced: [{ code, slot, by: the set's name }].
  function followStart(out, design, toModel, set, ref, touched, parts) {
    var took = [];
    parts = parts || [];
    if ((!set && !parts.length) || toModel === design.model) return took;
    if (ref && ref.model !== design.model) ref = null;
    var by = {};
    parts.forEach(function (p) { partCodes(p, design.model).concat(partCodes(p, toModel)).forEach(function (c) { by[c] = p; }); });
    ref = ref && withParts(ref, parts);
    var from = setDoc(set, parts, design.model), mine = setDoc(set, parts, toModel), m = Engine.model(toModel);
    m.order.forEach(function (code) {
      var r = m.rules[code], part = by[code], items = part && r.dyn;
      if ((!set && !part) || !from.S[code] || !mine.S[code] || !design.S[code] || SPECIAL.indexOf(code) >= 0) return;
      var key = function (x) { return items ? x.items : x; };
      for (var q = r.p ? 1 : 0; q < out.S[code].length; q++) {
        var v = design.S[code][q];
        if (!same(key(v), key(from.S[code][q])) || (ref && ref.S[code] && !same(key(v), key(ref.S[code][q]))) || (touched && touched[code] && touched[code].indexOf(q) >= 0) || !fits(r, mine.S[code][q])) continue;
        out.S[code][q] = items ? { value: out.S[code][q].value, items: mine.S[code][q].items.slice() } : Engine.clone(mine.S[code][q]);
        took.push({ code: code, slot: q, by: (part || set).name });
      }
    });
    return took;
  }

  // The design's values on another camera: translated, then following the starting set and the part sets.
  // opts: { base: a file opened from that camera, set: the starting set the design follows, parts: the part sets picked
  // since, ref and touched: see followStart }.
  // doc.kept holds the values of settings the camera lacks, so a later move to a camera that has them brings them back.
  // Notes: { code, slot, kind: 'value' | 'items', from, to, follow: set name when the set's own version was taken,
  // lost and gained: the list items that went and came }. Notes name the design's value, not a step in between.
  function carry(design, toModel, opts) {
    opts = opts || {};
    var src = design.kept ? { model: design.model, S: Object.assign({}, design.kept, design.S), version: design.version } : design;
    var res = Engine.translate(src, toModel, opts.base && opts.base.model === toModel ? opts.base : undefined);
    var m = Engine.model(toModel), doc = res.doc, key = function (n) { return n.code + ' ' + n.slot; }, took = {};
    var followed = followStart(doc, src, toModel, opts.set, opts.ref, opts.touched, opts.parts);
    followed.forEach(function (f) { took[key(f)] = true; });
    var notes = res.notes.filter(function (n) { return !took[key(n)]; });
    followed.forEach(function (f) {
      var was = src.S[f.code][f.slot], now = doc.S[f.code][f.slot];
      if (same(was, now)) return;
      notes.push(m.rules[f.code].dyn ? { code: f.code, slot: f.slot, kind: 'items', from: was.items.length, to: now.items.length, follow: f.by }
        : { code: f.code, slot: f.slot, kind: 'value', from: was, to: now, follow: f.by });
    });
    notes.forEach(function (n) {
      if (n.kind !== 'items') return;
      var a = src.S[n.code][n.slot].items, b = doc.S[n.code][n.slot].items;
      n.lost = a.filter(function (x) { return b.indexOf(x) < 0; }); n.gained = b.filter(function (x) { return a.indexOf(x) < 0; });
    });
    notes.sort(function (x, y) { return m.order.indexOf(x.code) - m.order.indexOf(y.code) || x.slot - y.slot; });
    var kept = {};
    Object.keys(src.S).forEach(function (code) { if (!m.rules[code]) kept[code] = Engine.clone(src.S[code]); });
    if (Object.keys(kept).length) doc.kept = kept;
    return { doc: doc, notes: notes };
  }

  // The file for one camera. opts: { base, set, parts, origin: the starting point, on the design's camera }.
  // Profile names, saved profiles and the start profile are the design's own. Returns { doc, notes }.
  function forCamera(design, toModel, opts) {
    opts = opts || {};
    var o = opts.origin, res = carry(design, toModel, { base: opts.base, set: opts.set, parts: opts.parts, ref: o, touched: o && o.touched }), doc = res.doc;
    Engine.NAME_CODES.forEach(function (c) { doc.S[c] = design.S[c].slice(); });
    doc.S.D6B2 = design.S.D6B2.slice(); doc.S.D124 = design.S.D124.slice();
    Engine.syncLive(doc);
    return { doc: doc, notes: res.notes };
  }

  // The design moves to another camera (the first camera chosen changed). The starting point moves with it, so the
  // change list and followStart go on comparing like with like. opts: { base, set, parts, origin }. Returns { doc, origin, notes, kept }:
  // kept names the settings the new camera lacks that hold something other than the old camera's factory value.
  function moveTo(design, toModel, opts) {
    opts = opts || {};
    var origin = null, o = opts.origin;
    if (o) {  // what differs from the starting point (and the part sets picked since) now stays marked as changed,
      // whatever the move does to the values
      var touched = Engine.clone(o.touched || {}), start = o.model === design.model && withParts(o, opts.parts);
      if (start) Object.keys(design.S).forEach(function (code) {
        if (!start.S[code] || SPECIAL.indexOf(code) >= 0) return;
        design.S[code].forEach(function (v, q) {
          if (same(v, start.S[code][q])) return;
          touched[code] = touched[code] || [];
          if (touched[code].indexOf(q) < 0) touched[code].push(q);
        });
      });
      var oc = carry(o, toModel, { set: opts.set, ref: design, touched: touched }).doc;
      origin = Object.assign({}, o, { model: toModel, S: oc.S, touched: touched });
      if (oc.kept) origin.kept = oc.kept; else delete origin.kept;
    }
    var res = forCamera(design, toModel, { base: opts.base, set: opts.set, parts: opts.parts, origin: origin && Object.assign({}, o, { touched: origin.touched }) });
    var b = Engine.blank(design.model), ps = Engine.profiles(design), kept = Object.keys(res.doc.kept || {}).filter(function (code) {
      var r = Engine.rule(design.model, code);
      return r && (r.p ? ps : [0]).some(function (q) { return !same(design.S[code][q], b.S[code][q]); });
    });
    return { doc: res.doc, origin: origin, notes: res.notes, kept: kept };
  }

  // A kept setting's value for a profile slot, from the first camera that has the setting: the set's, or the factory's.
  function keptSlot(code, p, set, i) {
    for (var name in Engine.RULES.models) {
      if (!Engine.rule(name, code)) continue;
      return Engine.clone(set ? fromSet(set, name).S[code][i + 1] : Engine.blank(name).S[code][p]);
    }
  }
  function eachKept(doc, fn) { Object.keys(doc.kept || {}).forEach(function (code) { if (doc.kept[code].length === 7) fn(code); }); }

  var Design = { fromSet: fromSet, copyProfile: copyProfile, addProfile: addProfile, removeProfile: removeProfile,
    useSetProfile: useSetProfile, cleanName: cleanName, checkName: checkName, forCamera: forCamera, moveTo: moveTo,
    partCodes: partCodes, usePart: usePart, pickPart: pickPart, partMatches: partMatches };
  if (typeof module !== 'undefined' && module.exports) module.exports = Design;
  else root.Design = Design;
})(typeof window !== 'undefined' ? window : globalThis);
