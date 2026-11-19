// What a click, a key, a drag or typing does on the page.
(function (App) {
  'use strict';
  var E = Engine, D = Design, W = Words;
  var short = W.short;
  var $ = App.$, notice = App.notice, menu = App.menu, st = App.st, rule = App.rule, profiles = App.profiles,
    pname = App.pname, remember = App.remember, undo = App.undo, redo = App.redo, save = App.save, begin = App.begin,
    rowCode = App.rowCode, rowKey = App.rowKey, rowVal = App.rowVal, setRow = App.setRow, optionItems = App.optionItems,
    duplicate = App.duplicate, profileMenu = App.profileMenu, rowByKey = App.rowByKey,
    pOf = App.pOf, pickOptions = App.pickOptions, markSel = App.markSel, favoritesSheet = App.favoritesSheet,
    layoutsSheet = App.layoutsSheet, saveSheet = App.saveSheet, readFile = App.readFile,
    toggleTarget = App.toggleTarget;

  // Clicking a profile's name selects it all, so typing replaces it.
  var justFocused = null;
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input[data-name]')) { justFocused = e.target; e.target.select(); } });
  document.addEventListener('mouseup', function (e) { if (e.target === justFocused) e.preventDefault(); justFocused = null; });

  // A part set: its values in every saved profile, one Undo step. The pretend camera shows the part it changed.
  function pickPart(x) {
    remember();
    D.pickPart(st.doc, x, st.origin);
    st.parts[x.kind] = x.id;
    D.partCodes(x, st.doc.model).forEach(function (c) { delete st.split[c]; });  // a part set is the same in every profile: its rows join
    App.changed();
    notice(W.PART_KINDS[x.kind].name + ': ' + x.name + (profiles().length > 1 ? ' in every profile' : ''), 'undo', { done: true });
    Camera.show(x.kind);
  }

  function wire() {
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !document.querySelector('.veil') && !(document.activeElement && /INPUT/.test(document.activeElement.tagName))) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (mod && e.key.toLowerCase() === 's') {  // a field being typed in keeps its text: leaving it takes the change
        e.preventDefault(); var a = document.activeElement; if (a && a.blur && a !== document.body) a.blur(); saveSheet();
      }
    });
    $('#file').addEventListener('change', function (e) { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ''; });
    document.addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drop'); });
    document.addEventListener('dragleave', function (e) { if (!e.relatedTarget) document.body.classList.remove('drop'); });
    document.addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drop'); var f = e.dataTransfer.files[0]; if (f) readFile(f); });

    // the file panel (sidebar) and the dock (phones) share their buttons
    var panelClick = function (e) {
      var t = e.target;
      if (t.closest('[data-open]')) { $('#file').click(); return; }
      if (t.closest('[data-save]')) { saveSheet(); return; }
      if (t.closest('[data-undo-btn]')) { undo(); return; }
      if (t.closest('[data-redo-btn]')) { redo(); return; }
      if (t.closest('[data-restart]')) { App.startOver(); return; }
      var cam = t.closest('[data-cam]'); if (cam) toggleTarget(cam.dataset.cam);
    };
    $('#filebox').addEventListener('click', panelClick);
    $('#dock').addEventListener('click', panelClick);
    $('#themes').addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme]'); if (!b) return;
      st.theme = b.dataset.theme; save(); App.render(); $('#main').scrollTop = 0;
      if (innerWidth < 760) { b = $('#themes [data-theme="' + st.theme + '"]'); if (b) b.scrollIntoView({ inline: 'center', block: 'nearest' }); window.scrollTo(0, 0); }
    });

    var main = $('#main');
    // pointing at a button's row in the table lights that button on the drawing
    main.addEventListener('pointerover', function (e) { var g = e.target.closest('.grow'); Camera.light(g ? g.dataset.code : null); });
    main.addEventListener('pointerleave', function () { Camera.light(null); });
    main.addEventListener('click', function (e) {
      var t = e.target;
      var pt = t.closest('[data-part]');
      if (pt) { pickPart(App.partSet(pt.dataset.part)); return; }
      // the Profiles page: the library's +, Yours, your profile cards, Use these N
      var la = t.closest('[data-libadd]'); if (la) { App.addFromLibrary(la.dataset.libadd, la.getBoundingClientRect()); return; }
      var lf = t.closest('[data-libforget]'); if (lf) { App.forgetYours(lf.dataset.libforget); return; }
      if (t.closest('[data-pblank]')) { App.addBlank(); return; }
      var pr = t.closest('[data-premove]'); if (pr) { App.removeProfile(+pr.dataset.premove); return; }
      var kp = t.closest('[data-pkeep]'); if (kp) { App.keepProfile(+kp.dataset.pkeep); return; }
      var pc = t.closest('[data-pcard]'); if (pc && !t.closest('button')) { st.sel = +pc.dataset.pcard; save(); App.render(); return; }
      if (t.closest('[data-golib]')) { App.goLibrary(); return; }
      var b = t.closest('[data-set]'); if (b) { App.useSet(b.dataset.set); return; }
      if (t.closest('[data-open]')) { $('#file').click(); return; }
      var cm = t.closest('[data-cam]'); if (cm) { toggleTarget(cm.dataset.cam); return; }
      var pk = t.closest('[data-pick-profile]'); if (pk) { st.sel = +pk.dataset.pickProfile; save(); App.render(); return; }
      var mo = t.closest('[data-more]'); if (mo) { profileMenu(mo, mo.dataset.more === 'sel' ? st.sel : +mo.dataset.more); return; }
      var rm = t.closest('[data-rowmenu]'); if (rm) { App.rowMenu(rm, rowByKey(rm.dataset.rowmenu)); return; }
      // the Favorites and layouts editors' scope: each profile its own, or one list in every profile
      var vr = t.closest('[data-vary]'); if (vr) { App.splitRow(App.rowOf(vr.dataset.vary)); return; }
      var sm = t.closest('[data-same]'); if (sm) { App.sameMenu(sm, App.rowOf(sm.dataset.same)); return; }
      var fl = t.closest('[data-filter]'); if (fl) { st.filter = fl.dataset.filter; App.render(); return; }
      var cell = t.closest('.gcell'); if (cell && cell.querySelector('[data-p]') && !t.closest('[data-kind]')) { var pp = cell.querySelector('[data-p]').dataset.p; if (pp !== 'all') { st.sel = +pp; App.render(); } }
      var c = t.closest('[data-kind]'); if (!c) return;
      var rw = rowByKey(c.dataset.row), p = pOf(c);
      if (p !== 'all') { st.sel = p; markSel(); }
      if (c.dataset.kind === 'toggle') {
        remember(); var o = pickOptions(rw, p).opts, tv = c.getAttribute('aria-checked') === 'true' ? o[0].v : o[1].v; setRow(rw, p, tv); App.changed(); shared(rw, p, tv);
      } else if (c.dataset.kind === 'favorites') favoritesSheet(p);
      else if (c.dataset.kind === 'layouts') layoutsSheet(p);
      else if (c.dataset.kind === 'pick' && !justScrubbed) {
        // the scope choice first (a bar's Give each profile its own, a tile's Use 1/250 in every profile), then the values
        var po = pickOptions(rw, p), scope = App.scopeItem(rw, p), items = optionItems(po.code, po.opts, po.cur);
        if (scope) items = [scope, { sep: true, pin: true }].concat(items);
        menu(c, items, function (it) {
          if (App.scopeAct(it, rw)) return;
          remember(); setRow(rw, p, it.v); App.changed(); shared(rw, p, it.v);
        }, rw.name + (profiles().length < 2 ? '' : p === 'all' ? ', every profile' : ' in ' + pname(p)));
      }
      if (p !== 'all' && c.dataset.kind !== 'toggle') App.paintCamera();
    });

    // A value changed for every profile at once: the notice says so and offers it for the selected profile alone.
    function shared(rw, p, v) {
      if (p !== 'all' || profiles().length < 2) return;
      var sel = st.sel, name = pname(sel), key = rowKey(rw);
      notice(rw.name + ' ' + short(rowCode(rw, sel), v) + ' in every profile', { label: 'Only in ' + name, act: function () {
        App.undo(); remember(); st.split[key] = true; setRow(rw, sel, v); App.changed(); notice(rw.name + ' ' + short(rowCode(rw, sel), v) + ' in ' + name);
      } });
    }

    // drag a ladder value left and right
    var drag = null, justScrubbed = false;
    main.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;  // main button only; on touch screens a sideways swipe scrolls the table instead
      var c = e.target.closest('.pick.ladder'); if (!c) return;
      var rw = rowByKey(c.dataset.row), p = pOf(c), po = pickOptions(rw, p);
      drag = { el: c, row: rw, p: p, x: e.clientX, i0: Math.max(0, po.opts.findIndex(function (o) { return o.v === po.cur; })), opts: po.opts, moved: false, last: -1 };
    });
    var endScrub = function () { if (drag && drag.moved) { save(); App.render(); } drag = null; };
    document.addEventListener('pointercancel', endScrub); document.addEventListener('contextmenu', endScrub); window.addEventListener('blur', endScrub);
    document.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!e.buttons) { endScrub(); return; }  // the press ended somewhere we didn't hear about
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      if (!drag.moved) { drag.moved = true; remember(); drag.el.setPointerCapture && drag.el.setPointerCapture(e.pointerId); }
      var i = Math.max(0, Math.min(drag.opts.length - 1, drag.i0 + Math.round(dx / 14)));
      if (i === drag.last) return;
      drag.last = i; setRow(drag.row, drag.p, drag.opts[i].v); E.syncLive(st.doc);
      var v = drag.el.querySelector('.v'); v.textContent = short(rowCode(drag.row, drag.p === 'all' ? profiles()[0] : drag.p), drag.opts[i].v);
      drag.el.classList.add('scrub');
      App.paintCamera();
    });
    document.addEventListener('pointerup', function () {
      if (!drag) return;
      if (drag.moved) { justScrubbed = true; setTimeout(function () { justScrubbed = false; }, 0); save(); App.render(); }
      drag = null;
    });
    main.addEventListener('keydown', function (e) {
      var c = e.target.closest('.pick[data-kind="pick"]');
      if (!c || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      var rw = rowByKey(c.dataset.row), p = pOf(c), po = pickOptions(rw, p);
      var i = po.opts.findIndex(function (o) { return o.v === po.cur; }) + (e.key === 'ArrowRight' ? 1 : -1);
      if (i < 0 || i >= po.opts.length) return;
      remember(); setRow(rw, p, po.opts[i].v); App.changed();
      var again = $('#main [data-row="' + c.dataset.row + '"][data-p="' + c.dataset.p + '"]'); if (again) again.focus();
    });
    main.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.name) {
        var p = +t.dataset.name, nm = D.checkName(st.doc, p, t.value);
        if (nm.why) { t.value = pname(p); notice(nm.why === 'short' ? 'A profile name needs 3 to 10 letters, numbers, spaces or dashes' : 'Another profile is already called ' + nm.name, 'none'); return; }
        t.value = nm.name;
        if (nm.name === pname(p)) return;
        remember(); st.doc.S[E.NAME_CODES[p - 1]] = [nm.name]; App.changedSoon(); return;
      }
      if (t.dataset.kind === 'text' || t.dataset.kind === 'number') {
        var rw = rowByKey(t.dataset.row), p2 = pOf(t), q2 = p2 === 'all' ? profiles()[0] : p2, code = rowCode(rw, q2), r = rule(code), was = rowVal(rw, q2), v;
        if (t.dataset.kind === 'number') {  // a number out of range becomes the closest one allowed
          v = Math.round(+t.value);
          if (!E.legal(r, v)) { v = E.nearest(r, isNaN(v) ? was : v); notice(rw.name + ' is ' + r.min + ' to ' + r.max + '. Msetter used ' + v, 'none'); }
        } else {  // text the camera can't take puts the old text back
          v = code === 'D002' || code === 'D019' ? t.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : t.value;
          if (!E.legal(r, v)) {
            t.value = was;
            notice('Type ' + (r.min === r.max ? 'exactly ' + r.min : r.min + ' to ' + r.max) + (code === 'D002' || code === 'D019' ? ' letters or numbers' : ' characters'), 'none');
            return;
          }
        }
        t.value = v;
        remember(); setRow(rw, p2, v); App.changedSoon();
      }
    });
    main.addEventListener('focusin', function (e) { var t = e.target; if (t.dataset && t.dataset.name) { st.sel = +t.dataset.name; App.paintCamera(); markSel(); } });
    main.addEventListener('input', function (e) {
      if (e.target.id === 'q') { st.query = e.target.value; App.render(); return; }
      // a profile name shows in capitals as it is typed (the field's style) and is stored in capitals when it changes:
      // rewriting the field while typing would stop Safari from sending the change
    });
  }

  Object.assign(App, { wire: wire });
})(window.App = window.App || {});
