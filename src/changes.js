// What changed: one meaning for the red dots, the count, the list of changes, the Changed filter and the Save sheet.
// A value is changed when it differs from what its own profile held when it came into the design. A profile from the
// starting point compares with the start (origin); a profile added later (library, Blank, Duplicate, the first
// library profile in place of the untouched USER1) compares with its values as it arrived, so it arrives with no dots
// and one line, Added GOLDEN. The record moves with its profile and leaves with it. docs/state.md, "Changed".
//
// recs: { slot: { id, from: start slot } or { id, at: { code: value }, name, took?: the start slot it took the place of } },
// one per saved profile.
// drop: start slots that left without a line (the untouched USER1 a library profile took the place of).
(function (root) {
  'use strict';
  var E = root.Engine || (typeof require === 'function' ? require('./engine.js') : null);
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function nameCode(q) { return E.NAME_CODES[q - 1]; }
  function nameOf(S, q) { return String((S[nameCode(q)] || [''])[0] || '').toUpperCase(); }

  // Records for a design that has just started: each saved profile is its own start.
  function start(doc) { var r = {}; E.profiles(doc).forEach(function (q) { r[q] = { id: 's' + q, from: q }; }); return r; }

  // The profile's values as they are now: what an added profile is compared with from here on.
  function valuesOf(doc, q) {
    var m = E.model(doc.model), at = {};
    m.order.forEach(function (code) { var r = m.rules[code]; if (r.p && doc.S[code]) at[code] = E.clone(doc.S[code][q]); });
    return at;
  }

  // After a step: a saved profile without a record arrived in that step and gets one, holding its values as they are
  // now; a record whose profile is gone goes. Returns a new recs object.
  function settle(doc, recs) {
    var out = {}, ps = E.profiles(doc), n = 0;
    Object.keys(recs || {}).forEach(function (k) { var x = recs[k], i = parseInt(String(x.id).slice(1), 10); if (x.id.charAt(0) === 'a' && i > n) n = i; });
    ps.forEach(function (q) {
      var x = recs && recs[q];
      out[q] = x || { id: 'a' + (++n), at: valuesOf(doc, q), name: nameOf(doc.S, q) };
    });
    return out;
  }

  // The records after moving the profile at place `from` to place `to` in the list of saved profiles, as
  // Design.moveProfile moves the values.
  function move(doc, recs, from, to) {
    var ps = E.profiles(doc), order = ps.slice(), mv = order.splice(from, 1)[0], out = {};
    order.splice(to, 0, mv);
    ps.forEach(function (q, i) { if (recs[order[i]]) out[q] = recs[order[i]]; });
    return out;
  }

  // What the value of code in profile q (0 for a setting of the whole camera) was, or undefined when there is nothing
  // to compare with.
  function was(origin, recs, rule, code, q) {
    if (!rule.p) return origin.S[code] ? origin.S[code][0] : undefined;
    var x = recs[q]; if (!x) return undefined;
    if (x.at) return x.at[code];
    return origin.S[code] ? origin.S[code][x.from] : undefined;
  }
  function wasName(origin, recs, q) { var x = recs[q]; if (!x) return ''; return x.at ? x.name : nameOf(origin.S, x.from); }

  // Longest run of start profiles still in their old order; the rest were moved.
  function movedOnes(list) {  // list: [{ q, from }] in the order shown
    var n = list.length, len = [], prev = [], best = -1;
    for (var i = 0; i < n; i++) {
      len[i] = 1; prev[i] = -1;
      for (var j = 0; j < i; j++) if (list[j].from < list[i].from && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
      if (best < 0 || len[i] > len[best]) best = i;
    }
    var keep = {}; for (var k = best; k >= 0; k = prev[k]) keep[k] = true;
    return list.filter(function (x, i) { return !keep[i]; });
  }

  // Everything that changed. words: { name(code), value(code, v) } for the lines. Returns
  // { lines: [text], marks: { 'code q': value it was } }: q is the profile's slot, 0 for a setting of the whole camera,
  // and a profile's name is marked under its name code.
  function compute(doc, origin, recs, drop, words) {
    var out = { lines: [], marks: {} };
    if (!origin || !origin.S) return out;
    var m = E.model(doc.model), ps = E.profiles(doc), one = ps.length < 2, starts = E.profiles({ S: origin.S });
    var cur = function (q) { return nameOf(doc.S, q); }, prefix = function (q) { return one ? '' : cur(q) + ': '; };
    var ids = {}; ps.forEach(function (q) { if (recs[q]) ids[recs[q].id] = q; });
    var said = function (code, v) { var t = words.value(code, v); return t === '' || t == null ? 'None' : t; };  // an empty value reads None (rule 7)

    // profiles: Added, Removed, Moved, Renamed
    ps.forEach(function (q) { var x = recs[q]; if (x && x.at) out.lines.push('Added ' + cur(q)); });
    starts.forEach(function (s) { if (!ids['s' + s] && (drop || []).indexOf(s) < 0) out.lines.push('Removed ' + nameOf(origin.S, s)); });
    var shown = ps.filter(function (q) { return recs[q] && !recs[q].at; }).map(function (q) { return { q: q, from: recs[q].from }; });
    movedOnes(shown).forEach(function (x) { out.lines.push('Moved ' + cur(x.q) + ' to ' + (ps.indexOf(x.q) + 1)); });
    ps.forEach(function (q) {
      var w = wasName(origin, recs, q);
      if (recs[q] && w !== cur(q)) { if (!recs[q].at) out.lines.push('Renamed ' + w + ' to ' + cur(q)); out.marks[nameCode(q) + ' ' + q] = w; }  // an added profile's Added line already names it
    });
    // values
    // in the order the pages show them (words.order), then the rest in the file's order
    var order = (words.order || []).filter(function (c) { return m.rules[c]; }), seenCode = {};
    order.concat(m.order).forEach(function (code) {
      if (seenCode[code]) return; seenCode[code] = true;
      var r = m.rules[code];
      if (code === 'D6B2' || code === 'D124' || E.NAME_CODES.indexOf(code) >= 0 || !doc.S[code]) return;
      var list = r.dyn ? function (v) { return v && v.items; } : function (v) { return v; };
      if (!r.p) {
        var a = was(origin, recs, r, code, 0), b = doc.S[code][0];
        if (a === undefined || same(list(a), list(b))) return;
        out.marks[code + ' 0'] = a;
        out.lines.push(words.name(code) + (r.dyn ? '' : ' ' + said(code, a) + ' to ' + said(code, b)));
        return;
      }
      var hits = [];
      ps.forEach(function (q) {
        var a = was(origin, recs, r, code, q), b = doc.S[code][q];
        if (a === undefined || same(list(a), list(b))) return;
        out.marks[code + ' ' + q] = a;
        hits.push({ q: q, t: words.name(code) + (r.dyn ? '' : ' ' + said(code, a) + ' to ' + said(code, b)), k: JSON.stringify(list(b)) });
      });
      if (!hits.length) return;
      // one line only when every profile changed the same way, to the same list for a list (Favorites)
      if (!one && hits.length === ps.length && hits.every(function (h) { return h.t === hits[0].t && h.k === hits[0].k; })) out.lines.push('Every profile: ' + hits[0].t);
      else hits.forEach(function (h) { out.lines.push(prefix(h.q) + h.t); });
    });
    // The default profile, by who it is rather than where (it follows its profile when profiles move). A file that
    // names none (a camera's own export) starts in the first profile once anything changed, so that is a line too.
    // A profile that took the place of the start's default (took) is the default it replaced.
    // A file that names none starts the camera in its first profile once anything changed (save.js defaultProfile);
    // that follows the first place, so it is a line only when someone picks a default.
    var d0 = origin.S.D124 ? origin.S.D124[0] : 0, d1 = doc.S.D124[0];
    if (ps.indexOf(d1) < 0) d1 = 0;
    var id1 = d1 && recs[d1] ? recs[d1].id : null, id0 = d0 ? 's' + d0 : null;
    ps.forEach(function (q) { if (recs[q] && recs[q].took === d0 && d0) id0 = recs[q].id; });
    if (id1 && id1 !== id0 && (ps.length > 1 || !d0)) out.lines.push('Default profile ' + cur(d1));
    return out;
  }

  var Changes = { start: start, settle: settle, move: move, compute: compute, valuesOf: valuesOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = Changes;
  else root.Changes = Changes;
})(typeof window !== 'undefined' ? window : globalThis);
