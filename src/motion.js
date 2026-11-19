// Movement and ticks. A change happens at once; then what changed on the page moves from where it was, and a finished
// action gets a green tick that draws itself in a beat later. Nothing waits for movement, a later action cancels a
// tick still waiting, and reduced motion turns movement off while ticks still show, at once.
// The timings are tokens at the top of app.css (--t-…, in milliseconds), tuned by eye in a motion lab.
var Motion = (function () {
  'use strict';
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  function still() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
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
  var waiting = [];
  function cancel() { waiting.forEach(clearTimeout); waiting = []; }
  function later(fn, wait) { var id = setTimeout(function () { waiting.splice(waiting.indexOf(id), 1); fn(); }, wait); waiting.push(id); return id; }
  // Draws the tick in svg (and fades in its words) after the beat; with reduced motion, at once.
  function tick(svg, words, wait) {
    if (!svg) return;
    var path = svg.querySelector('path'), w = still() ? 0 : wait === undefined ? token('--t-tick-wait', 200) : wait;
    path.style.strokeDashoffset = '22';
    if (words) words.style.opacity = '0';
    var draw = function () {
      var d = still() ? 0 : token('--t-tick-draw', 180);
      path.style.transition = 'stroke-dashoffset ' + d + 'ms ease-out'; path.style.strokeDashoffset = '0';
      if (words) { words.style.transition = 'opacity ' + d + 'ms ease-out'; words.style.opacity = '1'; }
    };
    if (!w) { draw(); return; }
    void path.getBoundingClientRect();
    later(draw, w);
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
      if (ln.note) { row.style.opacity = '0'; var show = function () { row.style.transition = 'opacity 160ms ease-out'; row.style.opacity = '1'; }; if (wait + i * gap) later(show, wait + i * gap); else show(); }
      else tick(row.querySelector('svg'), row.querySelector('.ct'), wait + i * gap);
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
  var hint = null, flyFrom = null;
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
  // A small tick in a tile for a moment after its value changed; the red dot stays.
  function cellTick(el) {
    var host = el.closest('.toggle-wrap') || el;
    var t = document.createElement('span'); t.className = 'celltick'; t.innerHTML = TICK; host.appendChild(t);
    tick(t.querySelector('svg'));
    later(function () { var a = anim(t, [{ opacity: 1 }, { opacity: 0 }], ms('--t-rise', 200)); if (a) { t.style.opacity = '0'; gone(a, t); } else t.remove(); }, token('--t-tick-wait', 200) + 1100);
  }

  function play(before, main) {
    var h = hint, from = flyFrom; hint = null; flyFrom = null;
    if (!before || !main || before.page !== main.dataset.page || still()) return;
    var was = before.map, now = snap(main), changed = [];
    var heads = function (m) { return Object.keys(m).filter(function (k) { return k[0] === 'h'; }).map(function (k) { return k.slice(2); }); };
    var oldCols = heads(was), newCols = heads(now).filter(function (p) { return oldCols.indexOf(p) < 0; });
    var goneCols = oldCols.filter(function (p) { return !now['h:' + p]; });
    var rowIndex = function (el) { var g = el.closest('.grow'); return g ? [].indexOf.call(g.parentNode.children, g) : 0; };
    var build = ms('--t-build', 280), stagger = ms('--t-stagger', 40), join = ms('--t-join', 260);
    Object.keys(now).forEach(function (k) {
      var n = now[k], o = was[k], el = n.el;
      if (o) {
        if (o.t !== n.t && h !== 'reorder') {
          if (el.classList.contains('toggle')) { el.setAttribute('aria-checked', o.t); void el.offsetWidth; el.setAttribute('aria-checked', n.t); }
          else roll(el, o.t, h === 'undo');
          changed.push(el);
        }
        var dx = o.r.left - n.r.left, dy = o.r.top - n.r.top;
        if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && (k[0] !== 'v' || h === 'reorder' || newCols.length || goneCols.length)) anim(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], build);
        return;
      }
      if (k[0] === 'c' && from) {  // a card added from the library flies in from its +
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
    if (h !== 'undo' && h !== 'reorder' && changed.length && changed.length <= 2) changed.forEach(cellTick);
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
  return { TICK: TICK, fill: fill, still: still, tick: tick, checklist: checklist, cancel: cancel, capture: capture, play: play,
    hint: setHint, flyFrom: flyFromRect, rise: rise, anim: anim, ms: ms };
})();
