// The parts of the page that come and go: the notice at the bottom, popover menus, sheets, and dragging to reorder.
(function (App) {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); }, esc = Words.esc;

  // Draw part of the page again and put the keyboard focus, the typing cursor and the scroll back where they were.
  // The focused control is found again by its data attributes and its place among controls alike. A Remove button
  // is found by its place alone, so after a Remove the focus moves on to the next one.
  // The scroll is kept for the part and for everything around it, the page included: Safari forgets the scroll of
  // whatever holds a part that is drawn again (All settings draws only its rows, inside the page that scrolls).
  function keepFocus(el, draw) {
    var fe = document.activeElement, back = null, scrolled = [];
    for (var n = el, depth = 0; n && depth < 40; n = n.parentElement, depth++) if (n.scrollTop) scrolled.push([n, n.scrollTop]);  // the page is never 40 deep
    var page = document.scrollingElement;
    if (page && page.scrollTop && !scrolled.some(function (s) { return s[0] === page; })) scrolled.push([page, page.scrollTop]);
    if (fe && fe !== el && el.contains(fe)) {
      var sel = fe.tagName.toLowerCase() + [].map.call(fe.attributes, function (a) {
        return /^data-/.test(a.name) ? '[' + a.name + (a.name === 'data-remove' ? '' : '="' + a.value.replace(/["\\]/g, '\\$&') + '"') + ']' : '';
      }).join('');
      back = { sel: sel, i: [].indexOf.call(el.querySelectorAll(sel), fe), a: fe.selectionStart, b: fe.selectionEnd };
    }
    draw();
    scrolled.forEach(function (s) { s[0].scrollTop = s[1]; });
    if (!back) return;
    var all = el.querySelectorAll(back.sel), to = all[Math.min(back.i, all.length - 1)] || el.querySelector('button:not(:disabled), input');
    if (!to) return;
    to.focus({ preventScroll: true });
    if (back.a != null) try { to.setSelectionRange(back.a, back.b); } catch (err) { /* number fields have no cursor to set */ }
  }

  // A small (i) with a hint that shows on hover or focus, beside a word that needs one: guidance in place of a sentence.
  function info(tip) { return '<span class="info" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '">i</span>'; }

  // A short message at the bottom after a big change, with Undo next to it.
  var noticeTimer = 0, noticeAt = 0;
  // button: 'undo' (default), 'redo', 'none', or { label, act }: a button of its own, such as Only in Night or Show.
  var noticeAct = null;
  function notice(text, button) {
    var el = $('#notice'); button = sheets.length ? 'none' : button || 'undo';  // no Undo over a sheet: it would change what the sheet shows
    if (button === 'undo' && App.madeStep && !App.madeStep()) button = 'none';  // the action changed nothing: an Undo would undo something else
    if (!el) { el = document.createElement('div'); el.id = 'notice'; el.className = 'notice'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    noticeAct = typeof button === 'object' ? button.act : null;
    el.innerHTML = '<span>' + esc(text) + '</span>' + (button === 'none' ? '' : typeof button === 'object' ? '<button class="quiet" data-act>' + esc(button.label) + '</button>'
      : '<button class="quiet" data-' + button + '>' + (button === 'redo' ? 'Redo' : 'Undo') + '</button>');
    el.classList.add('show'); clearTimeout(noticeTimer); noticeAt = Date.now();
    noticeTimer = setTimeout(function () { el.classList.remove('show'); }, 4000);
  }
  function hideNotice() { var el = $('#notice'); if (el) el.classList.remove('show'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#notice [data-act]')) { hideNotice(); if (noticeAct) noticeAct(); }
    else if (e.target.closest('#notice [data-undo]')) App.undo();
    else if (e.target.closest('#notice [data-redo]')) App.redo();
    else if (!e.target.closest('#notice') && Date.now() - noticeAt > 400) hideNotice();
  });

  var popEl = null, popVeil = null, popOpener = null;
  // Focus goes back to what opened the menu, unless it moved somewhere else on purpose.
  function closeMenu() {
    var back = popEl && (popEl.contains(document.activeElement) || document.activeElement === document.body) ? popOpener : null;
    if (popEl) { popEl.remove(); popEl = null; } if (popVeil) { popVeil.remove(); popVeil = null; }
    popOpener = null;
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }
  // Items: { t, cur } to pick, { sep } for a line, { head } for a label over a group.
  // Next to the thing clicked on wide screens; a sheet from the bottom on phones.
  function menu(anchor, items, pick, note) {
    closeMenu();
    popOpener = anchor && anchor.nodeType === 1 ? anchor : null;
    var rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    var bottom = innerWidth < 600;
    popEl = document.createElement('div'); popEl.className = 'pop' + (bottom ? ' bottom' : ''); popEl.setAttribute('role', 'listbox');
    var hi = items.findIndex(function (it) { return it.cur; });
    if (hi < 0) hi = items.findIndex(function (it) { return it.t; });
    var lead = 0; while (items[lead] && items[lead].pin) lead++;  // pinned items stay in view above the list
    var row = function (it, i) {
      if (it.sep) return '<div class="sep"></div>';
      if (it.head) return '<div class="head">' + esc(it.head) + '</div>';
      return '<button role="option" data-i="' + i + '" class="' + (i === hi ? 'hi' : '') + (it.pin ? ' act' : '') + '" aria-selected="' + !!it.cur + '"><span class="tick">' + (it.cur ? '✓' : '') + '</span><span class="lab"><span class="n">' + esc(it.t) + '</span>' + (it.d ? '<span class="d">' + esc(it.d) + '</span>' : '') + '</span></button>';
    };
    var head = (note ? '<div class="note">' + esc(note) + '</div>' : '') + items.slice(0, lead).map(row).join('');
    popEl.innerHTML = (head ? '<div class="pophead">' + head + '</div>' : '') + items.slice(lead).map(function (it, i) { return row(it, i + lead); }).join('');
    if (bottom) { popVeil = document.createElement('div'); popVeil.className = 'popveil'; document.body.appendChild(popVeil); }
    document.body.appendChild(popEl);
    if (!bottom) {
      var w = popEl.offsetWidth, hgt = popEl.offsetHeight;
      var left = Math.min(innerWidth - w - 8, Math.max(8, rect.left));
      var below = innerHeight - rect.bottom - 12, above = rect.top - 12, top;
      if (hgt <= below || below >= 240) { top = rect.bottom + 4; popEl.style.maxHeight = Math.min(hgt, below) + 'px'; }
      else { var hh = Math.min(hgt, above); popEl.style.maxHeight = hh + 'px'; top = Math.max(8, rect.top - hh - 4); }
      popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
    }
    var cur = popEl.querySelector('.hi');
    if (cur && popEl.querySelector('.head')) { if (!bottom) cur.focus({ preventScroll: true }); }
    else if (cur) { var hd = popEl.querySelector('.pophead'); popEl.scrollTop = Math.max(0, cur.offsetTop - (hd ? hd.offsetHeight : 0) - popEl.clientHeight / 3); if (!bottom) cur.focus({ preventScroll: true }); }
    popEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var it = items[+b.dataset.i]; closeMenu(); pick(it); });
    popEl.addEventListener('keydown', function (e) {
      var bs = Array.prototype.slice.call(popEl.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    });
  }
  var swallow = 0;  // a click outside a menu closes it and does nothing else
  document.addEventListener('pointerdown', function (e) { if (popEl && !popEl.contains(e.target) && e.target !== popVeil) { closeMenu(); swallow = Date.now(); } }, true);
  document.addEventListener('click', function (e) { if (swallow && Date.now() - swallow < 700) { swallow = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('click', function (e) { if (popVeil && e.target === popVeil) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (popEl && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); } });

  // Sheets stack: the newest is on top, and Escape closes only that one.
  var sheets = [];
  function sheet(html, wire) {
    var veil = document.createElement('div'); veil.className = 'veil';
    veil.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(veil);
    var n = $('#notice'); if (n) n.querySelectorAll('button').forEach(function (b) { b.remove(); });  // a notice's Undo would act under the sheet
    var close = function (quiet) {
      var i = sheets.indexOf(close); if (i < 0) return;
      sheets.splice(i, 1); veil.remove(); if (!quiet) App.render();
    };
    sheets.push(close);
    veil.addEventListener('click', function (e) { if (e.target === veil || e.target.closest('[data-close]')) close(); });
    if (wire) wire(veil.querySelector('.sheet'), close);
    var first = veil.querySelector('.sheet [autofocus]') || veil.querySelector('.sheet button, .sheet input'); if (first) first.focus({ preventScroll: true });  // [autofocus] keeps a phone's keyboard down
    return veil;
  }
  // Undo, Redo and opening a file change what every sheet shows, so they close them first.
  function closeSheets() { sheets.slice().forEach(function (c) { c(true); }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheets.length && !popEl) sheets[sheets.length - 1](); });

  // Drag an item by its handle, with a mouse or a finger; the others make room. done(from, to) records the move.
  // opts: { skip: what inside the handle stays a plain button, touch: the handle for a finger, so the rest can scroll }
  function dragReorder(container, itemSel, handleSel, done, opts) {
    opts = opts || {};
    container.addEventListener('pointerdown', function (e) {
      if (opts.skip && e.target.closest(opts.skip)) return;
      if (opts.touch && e.pointerType === 'touch' && !e.target.closest(opts.touch)) return;
      var h = e.target.closest(handleSel); if (!h || !container.contains(h)) return;
      var item = h.closest(itemSel), items = Array.prototype.slice.call(container.querySelectorAll(itemSel)), from = items.indexOf(item);
      if (from < 0) return;
      e.preventDefault(); h.setPointerCapture && h.setPointerCapture(e.pointerId);
      var rects = items.map(function (it) { return it.getBoundingClientRect(); }), r0 = rects[from], ox = e.clientX, oy = e.clientY, to = from;
      item.classList.add('dragging');
      var move = function (ev) {
        var dx = ev.clientX - ox, dy = ev.clientY - oy, cx = r0.left + r0.width / 2 + dx, cy = r0.top + r0.height / 2 + dy, best = from, bd = Infinity;
        item.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        rects.forEach(function (r, i) { var d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); if (d < bd) { bd = d; best = i; } });
        to = best;
        items.forEach(function (it, i) {
          if (it === item) return;
          var sh = from < to && i > from && i <= to ? -1 : from > to && i >= to && i < from ? 1 : 0;
          it.style.transform = sh ? 'translate(' + (rects[i + sh].left - rects[i].left) + 'px,' + (rects[i + sh].top - rects[i].top) + 'px)' : '';
        });
      };
      var up = function () {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
        items.forEach(function (it) { it.style.transform = ''; }); item.classList.remove('dragging');
        if (to !== from) done(from, to);
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    container.addEventListener('keydown', function (e) {  // with the keyboard: arrow keys on a handle move it
      if (opts.skip && e.target.closest(opts.skip)) return;
      var h = e.target.closest(handleSel); if (!h) return;
      var items = Array.prototype.slice.call(container.querySelectorAll(itemSel)), from = items.indexOf(h.closest(itemSel));
      var step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]; if (!step) return;
      var to = from + step; if (to < 0 || to >= items.length) return;
      e.preventDefault(); done(from, to);
      var again = container.querySelectorAll(handleSel)[to]; if (again) again.focus();
    });
  }

  Object.assign(App, { $: $, esc: esc, info: info, keepFocus: keepFocus, notice: notice, hideNotice: hideNotice,
    closeMenu: closeMenu, menu: menu, sheet: sheet, closeSheets: closeSheets, dragReorder: dragReorder });
})(window.App = window.App || {});
