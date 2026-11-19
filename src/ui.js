// The parts of the page that come and go: the layers over the page (sheets, menus, the tip, the notice), and dragging
// to reorder.
(function (App) {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); }, esc = Words.esc;

  // A control as a selector of its tag and data attributes, so it can be found again after the page is drawn again.
  // A Remove button is known by its place alone.
  function selectorOf(fe) {
    return fe.tagName.toLowerCase() + [].map.call(fe.attributes, function (a) {
      return /^data-/.test(a.name) ? '[' + a.name + (a.name === 'data-remove' ? '' : '="' + a.value.replace(/["\\]/g, '\\$&') + '"') + ']' : '';
    }).join('');
  }
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
      var sel = selectorOf(fe);
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
  // The tools' icons, one set for the whole page: 16 px grid, 2 px round strokes, drawn in the accent by .tool (the dots
  // are the bars' own marks, 22 by 10).
  var TOOL = {
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',  // remove: the + turned back
    save: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.75h7v10.5L8 10.6l-3.5 2.65z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    open: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10.5V3M5 6l3-3 3 3M3 10.5v1.75c0 .7.55 1.25 1.25 1.25h7.5c.7 0 1.25-.55 1.25-1.25V10.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    more: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12.5" cy="8" r="1.4" fill="currentColor"/></svg>',
    link: '<svg class="mi" viewBox="0 0 22 10" aria-hidden="true"><path d="M3 5h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="3" cy="5" r="2.2" fill="currentColor"/><circle cx="11" cy="5" r="2.2" fill="currentColor"/><circle cx="19" cy="5" r="2.2" fill="currentColor"/></svg>',
  };
  // Drawn like the page's other icons: 16 px grid, 1.8 px round strokes.
  var INFO_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 7.4v3.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="8" cy="5" r="1.15" fill="currentColor"/></svg>';
  function info(tip) { return '<span class="info" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '">' + INFO_SVG + '</span>'; }

  // Lines in a list: the first three, then a Show N more tool that shows the rest where they belong and goes away.
  function linesHTML(lines, cls) {
    return '<ul class="notes ' + (cls === undefined ? 'dim' : cls) + '">' + lines.map(function (x, i) { return '<li' + (i >= 3 ? ' hidden' : '') + '>' + esc(x) + '</li>'; }).join('') +
      (lines.length > 3 ? '<li class="showmore"><button class="tool" data-showmore>Show ' + (lines.length - 3) + ' more</button></li>' : '') + '</ul>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-showmore]'); if (!b) return;
    var li = b.closest('li'); [].forEach.call(li.parentNode.children, function (x) { x.hidden = false; }); li.remove();
  });
  // ---------- layers ----------
  // Every layer over the page opens through layer() (design rule 10): a sheet, a menu, the tip and the notice.
  // A sheet or a menu is named after its title, keeps Tab inside it, closes with Escape (the top one only), and on
  // closing gives the focus back to what had it when the layer opened, found again by its data attributes when the
  // page was drawn since. The tip stays inside the window and right of the sidebar, and never shows with a menu.
  // The notice sits clear of the dock and of the control that caused it.
  var stack = [], layerId = 0, pressed = null, restoring = false;
  // The control last pressed: Safari doesn't focus a button on a click, so this is what opened a layer there.
  document.addEventListener('pointerdown', function (e) {
    pressed = { el: e.target.closest ? e.target.closest('button, input, select, textarea, [tabindex]') : null, x: e.clientX, y: e.clientY, at: Date.now() };
  }, true);
  // kind: 'sheet', 'menu', 'tip' or 'notice'. opts: { opener, label (when the layer has no title of its own), close }.
  function layer(el, kind, opts) {
    opts = opts || {};
    if (kind === 'tip') return placeTip(el, opts.anchor);
    if (kind === 'notice') return placeNotice(el);
    var fe = document.activeElement, opener = opts.opener && opts.opener.nodeType === 1 ? opts.opener
      : fe && fe !== document.body ? fe : pressed && pressed.el && pressed.el.isConnected && Date.now() - pressed.at < 1500 ? pressed.el : null;
    var title = !opts.label && el.querySelector('h2');
    if (title) { if (!title.id) title.id = 'layer' + (++layerId); el.setAttribute('aria-labelledby', title.id); }
    else el.setAttribute('aria-label', opts.label || 'Menu');
    var l = { el: el, kind: kind, opener: opener, again: opener ? selectorOf(opener) : '', close: opts.close };
    stack.push(l);
    hideTip();
    return l;
  }
  // The focus was inside the layer, or nowhere, as it closed: it goes back to the opener, or to the control drawn in
  // its place.
  function holds(el) { var a = document.activeElement; return !a || a === document.body || el.contains(a); }
  function giveBack(l) {
    var to = l.opener && l.opener.isConnected ? l.opener : null;
    if (!to && l.again) to = [].filter.call(document.querySelectorAll(l.again), function (x) { return x.getClientRects().length; })[0];
    if (!to) return;
    restoring = true; to.focus({ preventScroll: true }); restoring = false;
  }
  function sheetOpen() { return stack.some(function (l) { return l.kind === 'sheet'; }); }
  var TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]';
  function tabbables(el) {
    return [].filter.call(el.querySelectorAll(TABBABLE), function (x) { return x.tabIndex >= 0 && x.getClientRects().length && !x.closest('[hidden]'); });
  }
  // Escape closes the top layer and nothing else; Tab and Shift-Tab go round the controls of the top sheet or menu.
  document.addEventListener('keydown', function (e) {
    var top = stack[stack.length - 1];
    if (!top) { if (e.key === 'Escape') hideTip(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); top.close(); return; }
    if (e.key !== 'Tab' || e.metaKey || e.ctrlKey) return;  // Option-Tab moves focus in Safari, so it is held too
    var all = tabbables(top.el); e.preventDefault(); if (!all.length) return;
    var i = all.indexOf(document.activeElement), n = all.length;
    all[i < 0 ? (e.shiftKey ? n - 1 : 0) : (i + (e.shiftKey ? n - 1 : 1)) % n].focus();
  }, true);

  // The tip of an (i): above it, inside the window and right of the sidebar, below it when there is no room above.
  // A page title's (i) holds the rest of the section's note: its tip opens below, wider.
  var tipEl = null, tipFor = null;
  function showTip(a) {
    var text = a.getAttribute('data-tip');
    if (!text || popEl || !a.isConnected) return;  // never with a menu open: the (i) of a row opens its menu
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.id = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipEl.textContent = text; tipEl.hidden = false; tipFor = a;
    layer(tipEl, 'tip', { anchor: a });
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; tipFor = null; }
  function placeTip(el, a) {
    var r = a.getBoundingClientRect(), side = $('.side'), sr = side && side.getBoundingClientRect(), min = 8;
    if (sr && sr.width && sr.right <= r.left + 1 && !a.closest('.side, .veil')) min = sr.right + 8;
    var title = !!a.closest('h1');
    el.style.left = min + 'px'; el.style.top = '0px'; el.style.maxWidth = Math.min(title ? 420 : 320, innerWidth - min - 8) + 'px';
    var w = el.offsetWidth, h = el.offsetHeight;
    var left = Math.max(min, Math.min(innerWidth - 8 - w, title ? r.left - 8 : r.left + r.width / 2 - w / 2)), top = r.top - 8 - h;
    if (title || top < 8) top = r.bottom + 8;
    el.style.left = left + 'px'; el.style.top = top + 'px';
    return el;
  }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;  // a finger shows the tip by focusing the (i)
    var a = e.target.closest && e.target.closest('[data-tip]'); if (a && a !== tipFor) showTip(a);
  });
  document.addEventListener('pointerout', function (e) {
    if (!tipFor || (e.relatedTarget && tipFor.contains(e.relatedTarget))) return;
    if (e.target.closest && e.target.closest('[data-tip]') === tipFor && document.activeElement !== tipFor) hideTip();
  });
  document.addEventListener('focusin', function (e) {
    var a = e.target.closest && e.target.closest('[data-tip]');
    if (a && !restoring) showTip(a); else hideTip();  // focus given back after a menu doesn't bring the tip back
  });
  document.addEventListener('focusout', function (e) { if (tipFor && e.target === tipFor && !tipFor.matches(':hover')) hideTip(); });
  window.addEventListener('scroll', hideTip, true);

  // The notice: low and centered, above the dock on phones. It moves up past any tool or button in its way and past
  // the control that caused it (the one with the focus, or the place last pressed). Says whether it found a clear place.
  function placeNotice(el) {
    var gap = 8, dock = $('#dock'), dr = dock && dock.getBoundingClientRect(), tb = $('#topbar'), tr = tb && tb.getBoundingClientRect();
    var floor = dr && dr.height && dr.top < innerHeight ? dr.top - gap : innerHeight - 24;
    var ceiling = tr && tr.height && tr.bottom > 0 ? tr.bottom + gap : gap;
    var top = stack.filter(function (l) { return l.kind === 'sheet'; }).pop();  // over a sheet: clear of the whole sheet
    el.style.bottom = (innerHeight - floor) + 'px';
    var w = el.offsetWidth, h = el.offsetHeight, left = (innerWidth - w) / 2;
    var avoid = top ? [top.el.getBoundingClientRect()] : [].map.call(document.querySelectorAll('.tool, .btn, .chip'), function (b) { return b.getBoundingClientRect(); });
    var fe = document.activeElement;
    if (fe && fe !== document.body && !el.contains(fe)) avoid.push(fe.getBoundingClientRect());
    if (pressed && Date.now() - pressed.at < 2000) avoid.push({ left: pressed.x - 22, right: pressed.x + 22, top: pressed.y - 22, bottom: pressed.y + 22, width: 44, height: 44 });
    avoid = avoid.filter(function (r) { return r.width && r.height && r.bottom > ceiling && r.top < floor; });
    var bottom = floor, clear = false;
    for (var k = 0; k < 40; k++) {
      var hits = avoid.filter(function (r) { return r.left < left + w && r.right > left && r.top < bottom && r.bottom > bottom - h; });
      if (!hits.length) { clear = true; break; }
      bottom = Math.min.apply(null, hits.map(function (r) { return r.top; })) - gap;
      if (bottom - h < ceiling) { bottom = floor; break; }  // nowhere clear: its own place
    }
    el.style.bottom = (innerHeight - bottom) + 'px';
    return clear;
  }

  // A short message at the bottom after a big change, with Undo next to it.
  var noticeTimer = 0, noticeAt = 0;
  // button: 'undo' (default), 'redo', 'none', or { label, act }: a button of its own, such as Only in Night or Show.
  // opts.done: the action finished and was checked, so a green tick draws itself in a beat later. Only for whole
  // actions (added, removed, a part set, cameras, a file opened); never for Undo, and not when nothing changed.
  var noticeAct = null;
  addEventListener('scroll', function () { var n = $('#notice'); if (n && n.classList.contains('show') && Date.now() - noticeAt > 900) n.classList.remove('show'); }, true);
  function notice(text, button, opts) {
    var el = $('#notice'); button = sheetOpen() ? 'none' : button || 'undo';  // no Undo over a sheet: it would change what the sheet shows
    var nothing = App.madeStep && !App.madeStep();
    if (button === 'undo' && nothing) button = 'none';  // the action changed nothing: an Undo would undo something else
    var done = opts && opts.done && (!nothing || opts.always);
    if (!nothing && App.nameStep && button !== 'redo') App.nameStep(text);  // Undo says these words back
    if (!el) { el = document.createElement('div'); el.id = 'notice'; el.className = 'notice'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    noticeAct = typeof button === 'object' ? button.act : null;
    el.classList.remove('receipt');
    el.innerHTML = (done ? Motion.TICK : '') + '<span>' + esc(text) + '</span>' + (button === 'none' ? '' : typeof button === 'object' ? '<button class="quiet" data-act>' + esc(button.label) + '</button>'
      : '<button class="quiet" data-' + button + '>' + (button === 'redo' ? 'Redo' : 'Undo') + '</button>');
    el.classList.add('show'); clearTimeout(noticeTimer); noticeAt = Date.now();
    layer(el, 'notice');
    if (done) Motion.tick(el.querySelector('svg'));
    noticeTimer = setTimeout(function () { el.classList.remove('show'); }, done ? 4800 : 4000);
  }
  // A notice that lists checks as they tick in, one after another (opening a file): lines are { t, note }.
  function receipt(lines, button) {
    notice('', button);
    var el = $('#notice'), box = document.createElement('div'); box.className = 'checks';
    el.classList.add('receipt'); el.replaceChild(box, el.querySelector('span'));
    Motion.checklist(box, lines);
    layer(el, 'notice');  // placed again at its full height
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { el.classList.remove('show'); }, 4000 + lines.length * 400);
  }
  function hideNotice() { var el = $('#notice'); if (el) el.classList.remove('show'); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#notice [data-act]')) { hideNotice(); if (noticeAct) noticeAct(); }
    else if (e.target.closest('#notice [data-undo]')) App.undo();
    else if (e.target.closest('#notice [data-redo]')) App.redo();
    else if (!e.target.closest('#notice') && Date.now() - noticeAt > 400) hideNotice();
  });

  var popEl = null, popVeil = null, popLayer = null;
  // The mark for the scope choice in menus, at the right of the row as on the bars: linked dots for every profile.
  // Set per profile is words only (three loose dots read as …).
  var MENU_ICON = {
    link: TOOL.link,
  };
  // Focus goes back to what opened the menu, unless it moved somewhere else on purpose.
  function closeMenu() {
    if (!popEl) return;
    var l = popLayer, had = holds(popEl);
    popEl.remove(); popEl = null; if (popVeil) { popVeil.remove(); popVeil = null; }
    popLayer = null;
    var i = stack.indexOf(l); if (i >= 0) stack.splice(i, 1);
    if (had && l) giveBack(l);
  }
  // A list that scrolls ends on an item cut about in half, so it reads as one that goes on below. Returns how much
  // shorter the menu became.
  function cutEnd(pop) {
    if (pop.scrollHeight <= pop.clientHeight + 1) return 0;
    var foot = pop.querySelector('.popfoot'), pr = pop.getBoundingClientRect();
    var edge = foot ? foot.getBoundingClientRect().top : pr.top + pop.clientHeight;
    var items = [].filter.call(pop.children, function (c) { return !/\b(pophead|popfoot|sep)\b/.test(c.className); }).map(function (c) { return c.getBoundingClientRect(); });
    var k = -1; items.forEach(function (r, i) { if (r.top < edge - 1) k = i; });
    if (k < 0) return 0;
    var r = items[k], seen = (Math.min(edge, r.bottom) - r.top) / r.height;
    if (seen >= 0.3 && seen <= 0.7) return 0;
    var at = seen > 0.7 ? r : items[k - 1]; if (!at) return 0;
    var less = Math.round(edge - (at.top + at.height / 2));
    if (less <= 0 || pop.clientHeight - less < 120) return 0;
    pop.style.maxHeight = (pop.offsetHeight - less) + 'px';
    return less;
  }
  // Items: { t, cur } to pick, { sep } for a line, { head } for a label over a group.
  // Next to the thing clicked on wide screens; a sheet from the bottom on phones.
  // stay: for a menu that picks more than one (the cameras), a function giving its items again; a pick then redraws the
  // menu in place instead of closing it, so nothing under it shows through between picks. An item with close: true
  // closes it as usual.
  function menu(anchor, items, pick, note, stay) {
    closeMenu();
    var opener = anchor && anchor.nodeType === 1 ? anchor : null;
    var rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    var bottom = innerWidth < 600;
    popEl = document.createElement('div'); popEl.className = 'pop' + (bottom ? ' bottom' : ''); popEl.setAttribute('role', 'listbox');
    var hi, lead, foot;
    var row = function (it, i) {
      if (it.sep) return '<div class="sep"></div>';
      if (it.head) return '<div class="head">' + esc(it.head) + '</div>';
      if (it.html) return '<div class="line">' + it.html + '</div>';  // a line to read, not to pick (the change list)
      return '<button role="option" data-i="' + i + '" class="' + (i === hi ? 'hi' : '') + (it.pin ? ' act' : '') + '" aria-selected="' + !!it.cur + '"><span class="tick">' + (it.cur ? '✓' : '') + '</span><span class="lab"><span class="n">' + esc(it.t) + '</span>' + (it.d ? '<span class="d">' + esc(it.d) + '</span>' : '') + '</span>' + (it.icon ? '<span class="end">' + (MENU_ICON[it.icon] || '') + '</span>' : '') + '</button>';
    };
    var draw = function () {
      hi = items.findIndex(function (it) { return it.cur; });
      if (hi < 0) hi = items.findIndex(function (it) { return it.t; });
      lead = 0; while (items[lead] && items[lead].pin) lead++;  // pinned items stay in view above the list
      foot = items.filter(function (it) { return it.foot; });     // and footer items below it (the scope choice)
      var head = (note ? '<div class="note">' + esc(note) + '</div>' : '') + items.slice(0, lead).map(row).join('');
      popEl.innerHTML = (head ? '<div class="pophead">' + head + '</div>' : '') + items.slice(lead).map(function (it, i) { return it.foot ? '' : row(it, i + lead); }).join('') +
        (foot.length ? '<div class="popfoot">' + foot.map(function (it) { return row(it, items.indexOf(it)); }).join('') + '</div>' : '');
    };
    draw();
    // named by its note, or its first heading, or the control that opened it
    var head0 = items.filter(function (it) { return it.head; })[0];
    popLayer = layer(popEl, 'menu', { opener: opener, close: closeMenu,
      label: note || (head0 && head0.head) || (opener && (opener.getAttribute('aria-label') || opener.textContent.trim())) || 'Menu' });
    if (bottom) { popVeil = document.createElement('div'); popVeil.className = 'popveil'; document.body.appendChild(popVeil); }
    document.body.appendChild(popEl);
    var above = false;
    if (!bottom) {
      var w = popEl.offsetWidth, hgt = popEl.offsetHeight;
      var left = Math.min(innerWidth - w - 8, Math.max(8, rect.left));
      var below = innerHeight - rect.bottom - 12, room = rect.top - 12, top;
      if (hgt <= below || below >= 240) { top = rect.bottom + 4; popEl.style.maxHeight = Math.min(hgt, below) + 'px'; }
      else { var hh = Math.min(hgt, room); popEl.style.maxHeight = hh + 'px'; top = Math.max(8, rect.top - hh - 4); above = true; }
      popEl.style.left = left + 'px'; popEl.style.top = top + 'px';
    }
    var cur = popEl.querySelector('.hi');
    if (cur && popEl.querySelector('.head')) { if (!bottom) cur.focus({ preventScroll: true }); }
    else if (cur) { var hd = popEl.querySelector('.pophead'); popEl.scrollTop = Math.max(0, cur.offsetTop - (hd ? hd.offsetHeight : 0) - popEl.clientHeight / 3); if (!bottom) cur.focus({ preventScroll: true }); }
    var less = cutEnd(popEl);
    if (less && above) popEl.style.top = (parseFloat(popEl.style.top) + less) + 'px';  // still touching what opened it
    popEl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.dataset.i, it = items[i];
      if (!stay || it.close) { closeMenu(); pick(it); return; }
      var y = popEl.scrollTop, menuEl = popEl;
      pick(it);
      if (popEl !== menuEl) return;  // the pick opened something else
      items = stay(); draw(); popEl.scrollTop = y;
      var again = popEl.querySelector('[data-i="' + i + '"]'); if (again) again.focus({ preventScroll: true });
    });
    popEl.addEventListener('keydown', function (e) {
      var bs = Array.prototype.slice.call(popEl.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
    });
  }
  var swallow = 0;  // a click outside a menu closes it and does nothing else
  document.addEventListener('pointerdown', function (e) { if (popEl && !popEl.contains(e.target) && e.target !== popVeil) { closeMenu(); swallow = Date.now(); } }, true);
  document.addEventListener('click', function (e) { if (swallow && Date.now() - swallow < 700) { swallow = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('click', function (e) { if (popVeil && e.target === popVeil) closeMenu(); });

  // Sheets stack: the newest is on top, and Escape closes only that one. A sheet closed by the person draws the page
  // again; quiet: closed by the page itself (Undo, opening a file), which draws it anyway.
  function sheet(html, wire) {
    var veil = document.createElement('div'); veil.className = 'veil';
    veil.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    var el = veil.querySelector('.sheet');
    var close = function (quiet) {
      var i = stack.indexOf(l); if (i < 0) return;
      var had = holds(veil);
      stack.splice(i, 1); veil.remove();
      if (!quiet) App.render();
      if (had) giveBack(l);
    };
    var l = layer(el, 'sheet', { close: function () { close(); } });
    l.quiet = function () { close(true); };
    document.body.appendChild(veil);
    veil.addEventListener('click', function (e) { if (e.target === veil || e.target.closest('[data-close]')) close(); });
    if (wire) wire(el, close);
    var first = veil.querySelector('.sheet [autofocus]') || veil.querySelector('.sheet button, .sheet input'); if (first) first.focus({ preventScroll: true });  // [autofocus] keeps a phone's keyboard down
    // a notice from before: its Undo would act under the sheet, and it stays only where it is clear of the sheet
    var n = $('#notice');
    if (n) { n.querySelectorAll('button').forEach(function (b) { b.remove(); }); if (n.classList.contains('show') && !placeNotice(n)) hideNotice(); }
    return veil;
  }
  // Undo, Redo and opening a file change what every sheet shows, so they close them first, the top one first, so the
  // focus steps back down to what opened the first.
  function closeSheets() { stack.filter(function (l) { return l.kind === 'sheet'; }).reverse().forEach(function (l) { l.quiet(); }); }

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
      var live = container.isConnected ? container : opts.root ? document.querySelector(opts.root) : null;  // a redraw replaced the list
      var row = live && live.querySelectorAll(itemSel)[to], again = row && (opts.touch ? row.querySelector(opts.touch) : row.matches(handleSel) ? row : row.querySelector(handleSel));
      if (again) again.focus();
    });
  }

  Object.assign(App, { $: $, esc: esc, info: info, INFO_SVG: INFO_SVG, TOOL: TOOL, linesHTML: linesHTML, keepFocus: keepFocus, notice: notice, receipt: receipt, hideNotice: hideNotice,
    closeMenu: closeMenu, menu: menu, sheet: sheet, closeSheets: closeSheets, dragReorder: dragReorder });
})(window.App = window.App || {});
