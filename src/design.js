// Building and changing a design: profiles made from starting sets, copied, added and removed.
(function (root) {
  'use strict';
  var Engine = root.Engine || require('./engine.js');
  var CATALOGUE = root.CATALOGUE || require('./catalogue.js');

  function applyValues(doc, slot, v) {
    Object.keys(v || {}).forEach(function (k) {
      if (k === 'favorites') { doc.S.D1A9[slot] = { value: doc.S.D1A9[slot].value, items: v.favorites.slice(0, Engine.FAVORITES_MAX) }; return; }
      if (k === 'layout') {
        v.layout.forEach(function (L, li) {
          Object.keys(L).forEach(function (key) { doc.S[CATALOGUE.LAYOUTS[li][key]][slot] = L[key]; });
        });
        return;
      }
      if (doc.S[k]) doc.S[k][slot] = v[k];
    });
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
    doc.setName = set.name;
    return doc;
  }

  // Values a set gives to one of its profiles, for previews.
  function setValues(set, i, modelName) {
    var doc = fromSet(set, modelName);
    return function (code) { return doc.S[code][i + 1]; };
  }

  function copyProfile(doc, from, to) {
    var m = Engine.model(doc.model);
    m.order.forEach(function (code) { if (m.rules[code].p) doc.S[code][to] = Engine.clone(doc.S[code][from]); });
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
      }
      var base = copyFrom ? Engine.profileName(doc, copyFrom) : 'User';
      doc.S[Engine.NAME_CODES[p - 1]] = [uniqueName(doc, base.slice(0, 8), p)];
      list.push(p); list.sort();
      Engine.setProfiles(doc, list);
      if (!doc.S.D124[0]) doc.S.D124 = [p];
      return p;
    }
    return null;
  }

  function uniqueName(doc, base, p) {
    var names = Engine.profiles(doc).map(function (q) { return Engine.profileName(doc, q); });
    var n = base.length < 3 ? base + p : base;
    var stem = base.replace(/\d+$/, '').slice(0, 9) || base.slice(0, 9);  // a copy of User1 is User2, not User12
    for (var i = 2; names.indexOf(n) >= 0; i++) n = stem + i;
    return n;
  }

  function removeProfile(doc, p) {
    Engine.setProfiles(doc, Engine.profiles(doc).filter(function (q) { return q !== p; }));
  }

  // A profile name the camera accepts: 3 to 10 letters, numbers, spaces or dashes.
  function cleanName(s) { return String(s).replace(/[^A-Za-z0-9 \-]/g, '').slice(0, 10); }

  var Design = { applyValues: applyValues, fromSet: fromSet, setValues: setValues, copyProfile: copyProfile,
    addProfile: addProfile, removeProfile: removeProfile, cleanName: cleanName };
  if (typeof module !== 'undefined' && module.exports) module.exports = Design;
  else root.Design = Design;
})(typeof window !== 'undefined' ? window : globalThis);
