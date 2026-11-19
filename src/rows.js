// A row of the profile table: its setting in each profile, whether every profile shares one value, and whether
// it changed since the starting point.
(function (App) {
  'use strict';
  var E = Engine, C = CATALOGUE, W = Words;
  var short = W.short;
  var st = App.st, rule = App.rule, profiles = App.profiles;

  function rowCode(row, p) { return row.code || row.codeFor(st.doc.S, p); }
  function rowKey(row) { return row.code || row.name; }
  function rowVal(row, p) {
    var code = rowCode(row, p);
    return code ? E.get(st.doc, code, p) : undefined;
  }
  function layoutCodes() { var out = []; C.LAYOUTS.forEach(function (L) { for (var k in L) out.push(L[k]); }); return out; }
  function sameAcross(row) {
    var ps = profiles();
    if (row.ctl === 'layouts') return layoutCodes().every(function (c) { return ps.every(function (p) { return st.doc.S[c][p] === st.doc.S[c][ps[0]]; }); });
    var first = JSON.stringify(rowVal(row, ps[0])), c0 = rowCode(row, ps[0]);
    return ps.every(function (p) { return rowCode(row, p) === c0 && JSON.stringify(rowVal(row, p)) === first; });
  }
  function visible(row) {
    if (row.only && !row.only.some(function (m) { return st.targets.indexOf(m) >= 0; })) return false;
    var code = row.code || 'D13E';
    return !!(st.doc.S[code] && rule(code));
  }
  // A change to one profile keeps its row apart (a tile per profile), even when the values come to match: a row joins
  // into one bar only when it starts equal or when asked (Use … in every profile).
  function setRow(row, p, v) {
    var ps = p === 'all' ? profiles() : [p];
    ps.forEach(function (q) {
      var code = rowCode(row, q); if (code) E.put(st.doc, code, q, v);
    });
    if (p !== 'all' && profiles().length > 1) st.split[rowKey(row)] = true;
  }

  // Whether the row's value in profile p (or in any profile, for 'all') changed: src/changes.js decides, for every view.
  function edited(row, p) {
    var qs = p === 'all' ? profiles() : [p];
    if (row.ctl === 'layouts') return qs.some(function (q) { return layoutCodes().some(function (c) { return App.markedAt(c, q); }); });
    return qs.some(function (q) { var c = rowCode(row, q); return c && App.markedAt(c, q); });
  }
  function wasText(row, q) {  // what a changed value was, for the dot's tooltip: "Was 1/250"
    var c = rowCode(row, q), v = c && row.ctl !== 'layouts' && row.ctl !== 'favorites' ? App.wasAt(c, q) : undefined;  // a list's count says nothing about its order
    return v === undefined ? 'Changed' : 'Was ' + short(c, v);
  }

  // The screen layouts of profile p in a few words: "Grid, Histogram", or "Plain".
  function layoutSummaryOf(doc, p) {
    var names = { grid: 'Grid', histo: 'Histogram', horizon: 'Horizon', clip: 'Clipping', peak: 'Peaking' }, on = [];
    C.LAYOUTS.forEach(function (L) { Object.keys(names).forEach(function (k) { if (doc.S[L[k]][p] === 1 && on.indexOf(names[k]) < 0) on.push(names[k]); }); });
    return on.length ? on.join(', ') : 'Plain';
  }

  // The table row that shows a setting, wherever it is.
  function rowOf(code) { var r = null; C.themes.forEach(function (t) { t.rows.forEach(function (x) { if (x.code === code) r = x; }); }); return r; }
  // Where a change goes: a value shared by every profile (and not split by Set per profile) changes in every
  // profile, from the table, the editors and the camera alike; anything else changes in the selected profile.
  function scopeOf(code) { var row = rowOf(code) || { code: code }; return profiles().length > 1 && sameAcross(row) && !st.split[rowKey(row)] ? 'all' : st.sel; }

  // A row joins into a bar only when it starts equal or when asked (design rule 4 of docs/state.md, "Rows"). After every
  // step, a row whose values differ is marked apart, so a later step that makes them equal again (removing a profile,
  // undoing one) never joins it. Only a request clears the mark: Use … in every profile, a part set, a new design.
  function keepApart() {
    if (profiles().length < 2) return;
    // every row, shown or not: a row for a camera not chosen now still keeps its shape for when it is
    C.themes.forEach(function (t) { t.rows.forEach(function (r) { if ((!r.code || (st.doc.S[r.code] && rule(r.code))) && !sameAcross(r)) st.split[rowKey(r)] = true; }); });
    E.model(st.doc.model).order.forEach(function (code) {
      var r = rule(code); if (!r || !r.p || r.dyn || rowOf(code) || !st.doc.S[code]) return;
      if (!sameAcross({ code: code })) st.split[code] = true;
    });
  }

  Object.assign(App, { keepApart: keepApart, rowCode: rowCode, rowKey: rowKey, rowVal: rowVal, layoutCodes: layoutCodes,
    sameAcross: sameAcross, visible: visible, setRow: setRow, edited: edited, wasText: wasText,
    layoutSummaryOf: layoutSummaryOf, rowOf: rowOf, scopeOf: scopeOf });
})(window.App = window.App || {});
