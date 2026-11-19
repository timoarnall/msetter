// Movement and ticks. A change happens at once; then what changed on the page moves from where it was, and a finished
// action gets a green tick that draws itself in a beat later. Nothing waits for movement. Every tick and fade is an
// animation of its own element, never a timer, so a redraw takes it away with the element and nothing is left behind.
// Reduced motion turns movement off while ticks still show, at once.
// The timings are tokens at the top of app.css (--t-…, in milliseconds), tuned by eye in a motion lab.
var Motion = (function () {
  'use strict';
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  // No movement with reduced motion, or while the page isn't showing (a hidden window, a sleeping display): a row that
  // rises in starts invisible, and an animation that never runs would leave it so.
  function still() { return !!(document.hidden || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)); }
  function token(name, fallback) {
    if (typeof getComputedStyle !== 'function') return fallback;  // the tests' pretend page has no styles
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }
  function ms(name, fallback) { return still() ? 0 : token(name, fallback); }
  function anim(el, frames, dur, delay) {
    if (!el || !el.animate || !dur) return null;
    return el.animate(frames, { duration: dur, delay: delay || 0, easing: EASE, fill: 'backwards' });
  }

  // ---------- ticks ----------
  var TICK = '<svg class="tick" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Draws the tick in svg (and fades in its words) after the beat; with reduced motion, at once. Returns the time it
  // takes, in milliseconds.
  function tick(svg, words, wait) {
    if (!svg) return 0;
    var path = svg.querySelector('path'), w = still() ? 0 : wait === undefined ? token('--t-tick-wait', 200) : wait, d = still() ? 0 : token('--t-tick-draw', 180);
    if (!path.animate || !(w + d)) return 0;
    path.style.strokeDasharray = '22';
    path.animate([{ strokeDashoffset: 22 }, { strokeDashoffset: 0 }], { duration: d, delay: w, easing: 'ease-out', fill: 'backwards' });
    if (words) words.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, delay: w, easing: 'ease-out', fill: 'backwards' });
    return w + d;
  }
  // Lines that tick in one after another: { t, note } each. Every line is already true when it shows; the beat only
  // paces the telling. A note (something to know, not wrong) gets a gray dot instead of a tick.
  function checklist(box, lines) {
    box.innerHTML = '';
    var gap = still() ? 0 : token('--t-tick-gap', 160), wait = still() ? 0 : token('--t-tick-wait', 200);
    lines.forEach(function (ln, i) {
      var row = document.createElement('div');
      row.className = 'check' + (ln.note ? ' note' : '');
      row.innerHTML = (ln.note ? '<span class="mk" aria-hidden="true"><i></i></span>' : TICK) + '<span class="ct"></span>';
      row.querySelector('.ct').textContent = ln.t;
      box.appendChild(row);
      // each line opens its own room as it ticks in, so the receipt grows line by line
      if (row.animate && wait + i * gap) row.animate([{ maxHeight: '0px', opacity: 0 }, { maxHeight: '64px', opacity: 1 }], { duration: 160, delay: wait + i * gap, easing: 'ease-out', fill: 'backwards' });
      if (!ln.note) tick(row.querySelector('svg'), row.querySelector('.ct'), wait + i * gap);
    });
  }

  // ---------- the page, before and after a redraw ----------
  // Keyed things: a value's control (its row and profile), a profile's head in the table, a profile card.
  function keyOf(el) {
    if (el.dataset.pcard) return 'c:' + el.dataset.pname;
    if (el.dataset.pHead) return 'h:' + el.dataset.pHead;
    return 'v:' + el.dataset.row + '|' + el.dataset.p;
  }
  var SEL = '#main .grid [data-row][data-p], #main [data-p-head], #main [data-pcard]';
  function textOf(el) {
    if (el.classList.contains('toggle')) return el.getAttribute('aria-checked');
    if (el.tagName === 'INPUT') return el.value;
    var v = el.querySelector('.v'); return v ? v.textContent : el.textContent;
  }
  function snap(root) {
    var out = {};
    if (!root) return out;
    root.querySelectorAll(SEL).forEach(function (el) { out[keyOf(el)] = { el: el, r: el.getBoundingClientRect(), t: textOf(el) }; });
    return out;
  }
  var hint = null, flyFrom = null, typed = null;
  // A value typed into a field already shows before the redraw, so the redraw can't see it change: the field to tick
  // after the next redraw.
  function tickNext(sel) { typed = sel; }
  // What the next redraw is: 'undo' (values roll back down), 'reorder' (cards move, values don't roll), or null.
  function setHint(h) { hint = h; }
  // The next redraw's new profile card flies in from here (the library's + that added it).
  function flyFromRect(r) { flyFrom = r; }
  function capture(main) { return { page: main && main.dataset.page, map: snap(main) }; }

  function ghost(r, cls) {
    var g = document.createElement('div'); g.className = 'ghost ' + (cls || '');
    g.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    document.body.appendChild(g); return g;
  }
  function gone(a, el) { if (a && a.finished) a.finished.then(function () { el.remove(); }, function () { el.remove(); }); else el.remove(); }
  // The new value rolls in from below as the old one leaves upward (downward on Undo).
  function roll(el, old, down) {
    var v = el.querySelector('.v'); if (!v || !old) return;
    var d = token('--t-roll', 170), dir = down ? -1 : 1, o = document.createElement('span');
    o.className = 'vold'; o.textContent = old; o.setAttribute('aria-hidden', 'true'); el.insertBefore(o, v);
    gone(anim(o, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + (-20 * dir) + 'px)', opacity: 0 }], ms('--t-roll', d)), o);
    anim(v, [{ transform: 'translateY(' + (20 * dir) + 'px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], ms('--t-roll', d));
  }
  // A tick in the value's mark place for a moment after it changed; then the red dot shows there, if the value differs
  // from where its profile started. The tick is the place's own animation: a redraw ends it with the element.
  function cellTick(el) {
    var host = el.closest('.toggle-wrap, .field, .pfield') || el, mk = host.querySelector('.mk');
    if (!mk) return;
    var t = document.createElement('span'); t.className = 'celltick'; t.innerHTML = TICK; mk.appendChild(t); mk.classList.add('ticking');
    var drawn = tick(t.querySelector('svg')), hold = token('--t-tick-hold', 1100), fade = still() ? 0 : token('--t-rise', 200);
    var end = function () { t.remove(); mk.classList.remove('ticking'); };
    if (!t.animate) { end(); return; }
    var a = t.animate([{ opacity: 1 }, { opacity: 1, offset: fade ? hold / (hold + fade) : 1 }, { opacity: 0 }], { duration: hold + fade, delay: drawn, fill: 'forwards' });
    a.finished.then(end, end);
  }

  function play(before, main) {
    var h = hint, from = flyFrom, t = typed; hint = null; flyFrom = null; typed = null;
    if (t && main && !h) { var te = main.querySelector(t); if (te) cellTick(te); }
    if (!before || !main || before.page !== main.dataset.page) return;
    var was = before.map, now = snap(main), changed = [];
    if (still()) {  // no movement; the ticks still show
      if (h) return;
      Object.keys(now).forEach(function (k) { var o = was[k]; if (o && k[0] === 'v' && o.t !== now[k].t) changed.push(now[k].el); });
      if (changed.length && changed.length <= 2) changed.forEach(cellTick);
      return;
    }
    var heads = function (m) { return Object.keys(m).filter(function (k) { return k[0] === 'h'; }).map(function (k) { return k.slice(2); }); };
    var oldCols = heads(was), newCols = heads(now).filter(function (p) { return oldCols.indexOf(p) < 0; });
    var goneCols = oldCols.filter(function (p) { return !now['h:' + p]; });
    var rowIndex = function (el) { var g = el.closest('.grow'); return g ? [].indexOf.call(g.parentNode.children, g) : 0; };
    var build = ms('--t-build', 280), stagger = ms('--t-stagger', 40), join = ms('--t-join', 260);
    Object.keys(now).forEach(function (k) {
      var n = now[k], o = was[k], el = n.el;
      if (o) {
        if (o.t !== n.t && h !== 'reorder' && k[0] === 'v') {  // values only: a card or a head changing is not a value changing
          if (el.classList.contains('toggle')) { el.setAttribute('aria-checked', o.t); void el.offsetWidth; el.setAttribute('aria-checked', n.t); }
          else roll(el, o.t, h === 'undo');
          changed.push(el);
        }
        var dx = o.r.left - n.r.left, dy = o.r.top - n.r.top;
        if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && (k[0] !== 'v' || h === 'reorder' || newCols.length || goneCols.length)) anim(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], build);
        return;
      }
      if (k[0] === 'c' && from && n.r.bottom > 0 && n.r.top < innerHeight) {  // a card added from the library flies in from its +, when its place is on the screen
        anim(el, [{ transform: 'translate(' + (from.left - n.r.left) + 'px,' + (from.top - n.r.top) + 'px) scale(.6)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], ms('--t-fly', 420));
        return;
      }
      var m = k.match(/^v:(.*)\|(all|\d+)$/);
      if (m && m[2] === 'all') {  // a row joined: its tiles slide into the bar
        var tiles = Object.keys(was).filter(function (x) { return x.indexOf('v:' + m[1] + '|') === 0 && x !== k; });
        if (tiles.length) {
          tiles.forEach(function (x) { var g = ghost(was[x].r, 'tileghost'); gone(anim(g, [{ left: was[x].r.left + 'px', width: was[x].r.width + 'px', opacity: 1 }, { left: n.r.left + 'px', width: n.r.width + 'px', opacity: 0 }], join), g); });
          anim(el, [{ opacity: 0 }, { opacity: 1 }], join * 0.7, join * 0.5);
          return;
        }
      }
      if (m && m[2] !== 'all' && was['v:' + m[1] + '|all'] && newCols.indexOf(m[2]) < 0) {  // a row split: the bar breaks into tiles
        var b = was['v:' + m[1] + '|all'].r;
        anim(el, [{ transform: 'translateX(' + (b.left - n.r.left) + 'px)', width: b.width + 'px' }, { transform: 'none', width: n.r.width + 'px' }], join);
        return;
      }
      var col = m ? m[2] : k[0] === 'h' ? k.slice(2) : null;
      if (col && newCols.indexOf(col) >= 0) {  // a new profile's column: it grows in, its values row by row
        anim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], build, k[0] === 'h' ? 0 : stagger * (1 + rowIndex(el)));
        return;
      }
      anim(el, [{ opacity: 0 }, { opacity: 1 }], build);
    });
    goneCols.forEach(function (p) {  // a removed profile's column folds away
      Object.keys(was).forEach(function (k) {
        if (k !== 'h:' + p && !new RegExp('^v:.*\\|' + p + '$').test(k)) return;
        var g = ghost(was[k].r, k[0] === 'h' ? 'headghost' : 'tileghost');
        gone(anim(g, [{ transform: 'none', opacity: 1 }, { transform: 'scaleX(0)', opacity: 0 }], build), g);
      });
    });
    if (!h && changed.length && changed.length <= 2) changed.forEach(cellTick);  // never after Undo, Redo or a move
  }

  // The first time a section opens in a visit, its rows rise in quickly; later visits show them at once.
  var seen = {};
  function rise(main, page) {
    if (seen[page]) return; seen[page] = true;
    if (still()) return;
    var d = token('--t-rise', 200), st = token('--t-stagger', 40) * 0.75;
    [].slice.call(main.querySelectorAll('.grow')).slice(0, 16).forEach(function (g, i) {
      [].forEach.call(g.children, function (c) { anim(c, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], d, 40 + i * st); });
    });
    main.querySelectorAll('.pcard, .libcat').forEach(function (c, i) { if (i < 16) anim(c, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], d, 40 + i * st); });
  }

  // An opened file fills the table in profile by profile: each column's heads and values arrive in turn.
  function fill(main) {
    if (still() || !main) return;
    var d = token('--t-build', 280), st = token('--t-stagger', 40) * 2.5;
    main.querySelectorAll('.grid [data-p-head], .grid [data-p-col], .grid .gcell.wide').forEach(function (el) {
      var col = el.dataset.pHead || el.dataset.pCol, ps = [].map.call(main.querySelectorAll('.grid [data-p-head]'), function (h) { return h.dataset.pHead; });
      var i = col ? ps.indexOf(col) : 0;
      anim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], d, 60 + i * st);
    });
    seen[main.dataset.page] = true;
  }
  return { TICK: TICK, fill: fill, still: still, tick: tick, checklist: checklist, capture: capture, play: play,
    hint: setHint, flyFrom: flyFromRect, tickNext: tickNext, rise: rise };
})();
