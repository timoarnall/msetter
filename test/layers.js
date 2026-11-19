// Rule 5, layers behave one way (design-rules.md, rule 10), measured on the page as drawn, in Chrome and WebKit:
// - every sheet (Save, the Q sheets) is named, keeps Tab inside it for 40 presses, and Escape gives the focus back to
//   the control that opened it (issue #5: the Q3 sheet);
// - in a sheet, everything that changes the file comes before the first Save; at most one red button is in view, the
//   dock included; Done is never red;
// - in every section, at 1440 and 390, the first (i)'s tip is inside the window and right of the sidebar, and a row's
//   (i) never shows its tip and its menu together;
// - a long menu's footer is on its own surface, and a list that scrolls ends on a cut item;
// - a notice overlaps no tool, button or the control that caused it, and stays above the dock;
// - rule 9, drawn: a shared bar reads against the page, an unselected name against its tile.
//
//   python3 -m http.server 8330 --bind 127.0.0.1      (in the project folder)
//   NODE_PATH="<a folder whose node_modules holds playwright>" /opt/homebrew/opt/node@24/bin/node test/layers.js [url]
//
// Prints one PASS or FAIL line per check; exits non-zero when any check fails or no browser starts.
const { webkit, chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'engine.js'));
const Q3 = require(path.join(__dirname, '..', 'src', 'q3.js'));
const Q3CODES = require(path.join(__dirname, '..', 'docs', 'leica-q3-codes.json'));

const URL = process.argv[2] || process.env.LAYERS_URL || 'http://127.0.0.1:8330/index.html';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msetter-layers-'));
let failed = 0, ran = 0;
function report(browser, where, name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${browser}  ${where}: ${name}` + (!ok && detail ? `  -- ${detail}` : ''));
}

async function launch(name) {
  try { return name === 'chrome' ? await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch()) : await webkit.launch(); }
  catch (e) { console.log(`FAIL  ${name}  launch: ${e.message.split('\n')[0]}`); failed++; return null; }
}
// A fresh page with empty storage, motion reduced so nothing is caught halfway.
async function open(browser, w, h, scheme) {
  const touch = w < 600;
  const ctx = await browser.newContext({ viewport: { width: w, height: h || 900 }, colorScheme: scheme || 'dark', reducedMotion: 'reduce', hasTouch: touch, isMobile: false });
  ctx.setDefaultTimeout(8000);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    if (await page.evaluate(() => !!window.ProfileMaker)) break;
  }
  await page.evaluate(() => { ProfileMaker.state.camsPicked = true; });
  return { ctx, page, errors };
}
const pause = (page, ms) => page.waitForTimeout(ms || 120);
async function theme(page, id) { await page.click(`#themes [data-theme="${id}"]`); await pause(page, 80); }

// What the page shows about the open sheet and everything red: run in the page.
function sheetState() {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const fill = (() => { const b = document.createElement('div'); b.style.background = 'var(--accent-fill)'; document.body.appendChild(b); const c = getComputedStyle(b).backgroundColor; b.remove(); return c; })();
  const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
  const red = [...document.querySelectorAll('button, a, [role="button"]')].filter(b => shown(b) && getComputedStyle(b).backgroundColor === fill);
  const label = sh && (sh.getAttribute('aria-labelledby') ? (document.getElementById(sh.getAttribute('aria-labelledby')) || {}).textContent : sh.getAttribute('aria-label'));
  const saves = sh ? [...sh.querySelectorAll('[data-save], [data-qsave], [data-card]')] : [];
  const changers = sh ? [...sh.querySelectorAll('[data-cam], [data-start]')] : [];
  const late = saves.length ? changers.filter(c => saves[0].compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).map(c => c.outerHTML.slice(0, 60)) : [];
  const done = sh ? [...sh.querySelectorAll('[data-close]')] : [];
  return { open: !!sh, label: label || '', red: red.map(b => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30)), late,
    doneRed: done.filter(b => getComputedStyle(b).backgroundColor === fill).length, title: sh ? (sh.querySelector('h2') || {}).textContent : '' };
}
const focusIn = (page, sel) => page.evaluate(s => { const a = document.activeElement, el = [...document.querySelectorAll(s)].pop(); return !!(el && a && el.contains(a)); }, sel);
const focused = page => page.evaluate(() => { const a = document.activeElement; return a ? a.outerHTML.slice(0, 80) : 'none'; });

// One sheet, already open, opened from the control matched by opener: its name, the Tab trap, its order and its red,
// then Escape and the focus.
async function checkSheet(page, t, where, opener) {
  const s = await page.evaluate(sheetState);
  t(where, 'a sheet is open', s.open);
  if (!s.open) return;
  t(where, 'the sheet is named after its title', !!s.label && s.label === s.title, JSON.stringify([s.label, s.title]));
  const over = await page.evaluate(() => {
    const n = document.querySelector('#notice.show'), sh = [...document.querySelectorAll('.sheet')].pop(); if (!n || !sh) return '';
    const a = n.getBoundingClientRect(), b = sh.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top ? n.textContent : '';
  });
  t(where, 'a notice from before is clear of the sheet, or gone', !over, over);
  let out = '';
  for (let i = 0; i < 40 && !out; i++) { await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab'); if (!(await focusIn(page, '.sheet'))) out = `after ${i + 1} presses: ${await focused(page)}`; }
  t(where, 'Tab 40 times: the focus never leaves the sheet', !out, out);
  t(where, 'everything that changes the file comes before the first Save', !s.late.length, s.late.join(' | '));
  t(where, 'at most one red button in view, the dock included', s.red.length <= 1, s.red.join(', '));
  t(where, 'Done is never red', !s.doneRed);
  await page.keyboard.press('Escape'); await pause(page);
  const back = await page.evaluate(sel => { const a = document.activeElement; return { closed: !document.querySelector('.veil'), on: !!(a && a.matches(sel)), at: a ? a.outerHTML.slice(0, 80) : 'none' }; }, opener);
  t(where, 'Escape closes it and gives the focus back to ' + opener, back.closed && back.on, JSON.stringify(back));
}
// Press Enter on a control, as from the keyboard.
async function enterOn(page, sel) { await page.focus(sel); await page.keyboard.press('Enter'); await pause(page, 200); }

function madeUpQ3(camera, edit) {
  const S = {};
  Q3CODES._order.forEach(c => {
    const e = Q3CODES[c], f = e.factory === null ? 0 : e.factory;
    S[c] = e.kind === 'text camera-wide' ? [f] : e.kind === 'number list per profile' ? [].concat(...Array(7).fill(f)) : Array(7).fill(f);
  });
  ['Street', 'Night', 'Portrait', 'Landscape', 'Video', 'Travel'].forEach((n, i) => { S[E.NAME_CODES[i]] = [n]; });
  S.D00B[2] = 6400;
  if (edit) edit(S);
  return Q3.write({ camera: camera || 'LEICA Q3', codes: Q3CODES._order.filter(c => c in S), S });
}
function q3File(text) { const d = fs.mkdtempSync(path.join(tmp, 'q3-')), f = path.join(d, 'settings.lcs'); fs.writeFileSync(f, text); return f; }
// The Q3 from the camera menu, by keyboard: the menu opens on Enter, the arrows reach the Q3, Enter opens its sheet.
async function q3FromMenu(page, opener) {
  await enterOn(page, opener);
  const i = await page.evaluate(() => [...document.querySelectorAll('.pop button')].findIndex(b => (b.querySelector('.n') || {}).textContent === 'Q3'));
  const at = await page.evaluate(() => [...document.querySelectorAll('.pop button')].indexOf(document.activeElement));
  if (at < 0) await page.keyboard.press('Tab');  // a phone's menu starts with the focus outside it
  const from = Math.max(0, at);
  for (let k = from; k < i; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await pause(page, 200);
}

const SHEETS = async (browser, name, t) => {
  // the Save sheet, desktop and phone, opened from the keyboard
  for (const [w, h, opener] of [[1440, 900, '#filebox [data-save]'], [390, 844, '#dock [data-save]']]) {
    const { ctx, page, errors } = await open(browser, w, h);
    await page.click('#main [data-addall="night"]'); await pause(page);  // several profiles: the Default profile control shows
    await enterOn(page, opener);
    await checkSheet(page, t, `Save sheet ${w}`, opener);
    t(`Save sheet ${w}`, 'no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  // the Q sheets: the Q3 from the camera menu (issue #5), the sheet once a file is open, the Save sheet a Q3 file leads,
  // and the comparison of two exports
  const { ctx, page, errors } = await open(browser, 1440, 900);
  const cams = '#topbar [data-cams]';
  await q3FromMenu(page, cams);
  await checkSheet(page, t, 'Q3 sheet', cams);
  await page.setInputFiles('#file', q3File(madeUpQ3())); await pause(page, 300);
  t('Q3 sheet with a file', 'the file opened into its sheet', /Opened settings\.lcs/.test(await page.evaluate(() => (document.querySelector('.sheet') || {}).textContent || '')));
  await page.keyboard.press('Escape'); await pause(page);
  await q3FromMenu(page, cams);
  await checkSheet(page, t, 'Q3 sheet with a file', cams);
  await page.evaluate(() => { ProfileMaker.state.doc.S.D00B[2] = 12500; ProfileMaker.render(); });
  await enterOn(page, '#filebox [data-save]');
  const lead = await page.evaluate(() => [...document.querySelectorAll('.sheet .frow')].map(r => r.textContent)[0] || '');
  t('Save sheet from a Q3 file', 'the Q3 leads', /^Q3/.test(lead), lead.slice(0, 60));
  await checkSheet(page, t, 'Save sheet from a Q3 file', '#filebox [data-save]');
  await enterOn(page, '#filebox [data-save]');
  await page.click('.sheet [data-mshow]'); await pause(page);
  t('Save sheet from a Q3 file, M rows shown', 'with no M camera chosen it asks for one', await page.locator('.sheet .chips').count() > 0);
  await page.locator('.sheet .chips button', { hasText: /^M11-P$/ }).first().click(); await pause(page, 200);
  const m = await page.evaluate(sheetState);
  t('Save sheet from a Q3 file, M rows shown', 'the M rows show, with one red button in view', m.red.length <= 1 && await page.locator('.sheet [data-save]').count() > 0, m.red.join(', '));
  const redWords = await page.evaluate(() => {
    const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color; probe.remove();
    return [...document.querySelectorAll('.sheet *')].filter(e => !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(e).color === accent).map(e => e.textContent.trim().slice(0, 30));
  });
  t('Save sheet from a Q3 file, M rows shown', 'no red words', !redWords.length, redWords.join(', '));
  await page.keyboard.press('Escape'); await pause(page);
  await page.setInputFiles('#file', q3File(madeUpQ3('LEICA Q3', S => { S.D00B[3] = 3200; }))); await pause(page, 300);
  const cmp = await page.evaluate(sheetState);
  t('Q3 comparison', 'opens with one red button, Done not red', cmp.open && cmp.red.length <= 1 && !cmp.doneRed, JSON.stringify(cmp));
  let out = '';
  for (let i = 0; i < 40 && !out; i++) { await page.keyboard.press('Tab'); if (!(await focusIn(page, '.sheet'))) out = await focused(page); }
  t('Q3 comparison', 'Tab 40 times: the focus never leaves the sheet', !out, out);
  t('Q sheets', 'no page errors', !errors.length, errors.join(' | '));
  await ctx.close();
};

const SECTIONS = ['sets', 'exposure', 'buttons', 'menus', 'screen', 'look', 'shooting', 'camera', 'all'];
const TIPS = async (browser, name, t) => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, errors } = await open(browser, w, h);
    await page.click('#main [data-addall="night"]'); await pause(page);
    for (const s of SECTIONS) {
      await theme(page, s);
      const has = await page.evaluate(() => { const a = document.querySelector('#main [data-tip]'); if (!a) return false; a.scrollIntoView({ block: 'center' }); return true; });
      if (!has) { t(`tips ${w}`, `${s}: has an (i)`, false); continue; }
      await pause(page, 60);
      if (w < 600) await page.evaluate(() => document.querySelector('#main [data-tip]').focus());
      else await page.hover('#main [data-tip]');
      await pause(page, 60);
      const r = await page.evaluate(() => {
        const tip = document.getElementById('tip'), side = document.querySelector('.side').getBoundingClientRect();
        if (!tip || tip.hidden) return { shown: false };
        const b = tip.getBoundingClientRect();
        return { shown: true, inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, right: !side.width || b.left >= side.right, box: [b.left, b.top, b.right, b.bottom].map(Math.round), side: Math.round(side.right) };
      });
      t(`tips ${w}`, `${s}: the first (i)'s tip shows inside the window, right of the sidebar`, r.shown && r.inside && r.right, JSON.stringify(r));
      await page.mouse.move(1, h - 1); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    // a row's (i) opens its menu: the tip goes, and doesn't come back with the focus
    await theme(page, 'exposure');
    await page.evaluate(() => document.querySelector('#main [data-rowmenu]').scrollIntoView({ block: 'center' }));
    if (w >= 600) { await page.hover('#main [data-rowmenu]'); await page.click('#main [data-rowmenu]'); }
    else await page.tap('#main [data-rowmenu]');  // a finger: no hover
    await pause(page);
    const both = await page.evaluate(() => ({ menu: !!document.querySelector('.pop'), tip: !!(document.getElementById('tip') && !document.getElementById('tip').hidden) }));
    t(`tips ${w}`, 'a row\'s (i): its menu shows, its tip doesn\'t', both.menu && !both.tip, JSON.stringify(both));
    await page.keyboard.press('Escape'); await pause(page);
    const after = await page.evaluate(() => ({ tip: !!(document.getElementById('tip') && !document.getElementById('tip').hidden), on: document.activeElement.matches('[data-rowmenu]') }));
    t(`tips ${w}`, 'Escape: the focus is back on the (i), without its tip', after.on && !after.tip, JSON.stringify(after));
    t(`tips ${w}`, 'no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
};

const MENUS = async (browser, name, t) => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, errors } = await open(browser, w, h);
    await page.click('#main [data-addall="night"]'); await pause(page);
    await theme(page, 'exposure');
    // the longest list on the page that has a footer: the ISO or the shutter speed limit
    const keys = await page.evaluate(() => [...document.querySelectorAll('#main .pick.ladder[data-kind="pick"]')].map(b => b.dataset.row + '|' + b.dataset.p));
    let found = null;
    for (const k of keys) {
      const [row, p] = k.split('|');
      const sel = `#main .pick[data-row="${row}"][data-p="${p}"]`;
      await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
      await page.click(sel); await pause(page);
      const m = await page.evaluate(() => {
        const pop = document.querySelector('.pop'); if (!pop) return null;
        const foot = pop.querySelector('.popfoot'), pr = pop.getBoundingClientRect();
        const edge = foot ? foot.getBoundingClientRect().top : pr.top + pop.clientHeight;
        const items = [...pop.children].filter(c => !/pophead|popfoot|sep/.test(c.className)).map(c => c.getBoundingClientRect());
        const last = items.filter(r => r.top < edge - 1).pop();
        return { label: pop.getAttribute('aria-label') || '', scrolls: pop.scrollHeight > pop.clientHeight + 1, foot: !!foot,
          footBg: foot && getComputedStyle(foot).backgroundColor, listBg: getComputedStyle(pop).backgroundColor,
          cut: last ? 1 - (Math.min(edge, last.bottom) - last.top) / last.height : 0 };
      });
      if (m && m.foot && m.scrolls) { found = m; break; }
      await page.keyboard.press('Escape'); await pause(page, 60);
    }
    t(`menus ${w}`, 'a long menu with a footer is found', !!found);
    if (found) {
      t(`menus ${w}`, 'the menu is named', !!found.label, found.label);
      t(`menus ${w}`, 'its footer is on its own surface', found.footBg !== found.listBg, JSON.stringify([found.footBg, found.listBg]));
      t(`menus ${w}`, 'the list ends on an item cut by a quarter or more', found.cut >= 0.25 && found.cut < 1, found.cut.toFixed(2));
      let out = '';
      for (let i = 0; i < 30 && !out; i++) { await page.keyboard.press('Tab'); if (!(await focusIn(page, '.pop'))) out = await focused(page); }
      t(`menus ${w}`, 'Tab stays inside the menu', !out, out);
      await page.keyboard.press('Escape'); await pause(page);
      t(`menus ${w}`, 'Escape gives the focus back to its value', await page.evaluate(() => document.activeElement.matches('.pick')), await focused(page));
    }
    t(`menus ${w}`, 'no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
};

// After a notice: its box overlaps no tool, button or chip in view, nor the control that caused it, nor the dock.
function noticeClear() {
  const n = document.querySelector('#notice.show'); if (!n) return { shown: false };
  const b = n.getBoundingClientRect(), over = (r) => r.width && r.height && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
  const hits = [...document.querySelectorAll('.tool, .btn, .chip')].filter(e => !n.contains(e) && !e.closest('.dock') && over(e.getBoundingClientRect())).map(e => e.outerHTML.slice(0, 60));
  const dock = document.querySelector('#dock'), dr = dock && dock.getBoundingClientRect();
  const a = document.activeElement, cause = a && a !== document.body && !n.contains(a) && over(a.getBoundingClientRect());
  return { shown: true, hits, dock: !!(dr && dr.height && over(dr)), cause: cause ? a.outerHTML.slice(0, 60) : '', lines: Math.round(b.height) };
}
const NOTICES = async (browser, name, t) => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page, errors } = await open(browser, w, h);
    const check = async (what) => {
      await page.waitForSelector('#notice.show', { timeout: 2000 }).catch(() => null); await pause(page, 60);
      const r = await page.evaluate(noticeClear);
      t(`notices ${w}`, `${what}: the notice covers no tool, no dock and not what caused it`, r.shown && !r.hits.length && !r.dock && !r.cause, JSON.stringify(r));
    };
    // + on a Blank card
    await page.evaluate(() => document.querySelector('#main [data-pblank]').scrollIntoView({ block: 'end' }));
    await page.click('#main [data-pblank]'); await check('+ on Blank');
    // + on a library row at the bottom of the window
    const row = await page.evaluate(h => {
      const adds = [...document.querySelectorAll('#main [data-libadd]')];
      const a = adds[Math.min(adds.length - 1, 12)]; a.scrollIntoView({ block: 'end' }); return a.dataset.libadd;
    }, h);
    await pause(page, 60);
    await page.click(`#main [data-libadd="${row}"]`); await check('+ on a library row at the bottom');
    // − on a card
    await page.evaluate(() => document.querySelector('#main [data-premove]').scrollIntoView({ block: 'end' }));
    await page.click('#main [data-premove]'); await check('− on a card');
    // a value for every profile, from a bar at the bottom of the window, chosen from the keyboard
    await theme(page, 'exposure');
    const bar = await page.evaluate(() => { const b = [...document.querySelectorAll('#main .pick[data-p="all"][data-kind="pick"]')].pop(); if (!b) return ''; b.scrollIntoView({ block: 'end' }); return `#main .pick[data-row="${b.dataset.row}"][data-p="all"]`; });
    if (bar) {
      await page.focus(bar); await page.keyboard.press('Enter'); await pause(page);
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await check('a bar at the bottom, from the keyboard');
    }
    // a long notice grows with its lines instead of being cut
    await page.evaluate(() => App.notice('Added FREEZE, CRISP, WALK, PAN, DRAG, GOLDEN, FADED, PUNCHY, COOL, CINEMA and a long list of other names that runs on', 'none'));
    const long = await page.evaluate(() => { const s = document.querySelector('#notice.show span'); return s ? { cut: s.scrollWidth > s.clientWidth + 1, h: s.getBoundingClientRect().height } : null; });
    t(`notices ${w}`, 'a long notice grows with its lines, nothing cut', long && !long.cut && long.h > 30, JSON.stringify(long));
    t(`notices ${w}`, 'no page errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
};

// Rule 9, drawn: a sample of real pairs read from the page, in both modes.
const COLORS = async (browser, name, t) => {
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, errors } = await open(browser, 1440, 900, scheme);
    await page.click('#main [data-addall="night"]'); await pause(page);
    await theme(page, 'exposure');
    const r = await page.evaluate(() => {
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = c => { const v = c.map(x => x / 255).map(x => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const L = s => { const y = lum(rgb(s)); return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : 24389 / 27 * y; };
      // the surface under an element: its own background, or the first one behind it
      const bg = el => { for (; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (!/rgba\(.*,\s*0\)$|transparent/.test(c)) return c; } return 'rgb(0, 0, 0)'; };
      const page = bg(document.querySelector('#main'));
      const bar = document.querySelector('#main .gcell.wide .pick'), name = document.querySelector('#main .ghead:not(.sel) .pfield input');
      return { bar: bar ? Math.abs(L(bg(bar)) - L(page)) : null, name: name ? ratio(getComputedStyle(name).color, bg(name)) : null };
    });
    t(`colors ${scheme}`, 'a shared bar reads against the page (3 L* or more)', r.bar !== null && r.bar >= 3, JSON.stringify(r));
    t(`colors ${scheme}`, 'an unselected profile name on its tile is 4.5:1 or more', r.name !== null && r.name >= 4.5, JSON.stringify(r));
    await ctx.close();
  }
};

(async () => {
  for (const name of ['chrome', 'webkit']) {
    const browser = await launch(name); if (!browser) continue;
    ran++;
    const t = (where, what, ok, detail) => report(name, where, what, ok, detail);
    for (const part of [SHEETS, TIPS, MENUS, NOTICES, COLORS]) {
      try { await part(browser, name, t); } catch (e) { report(name, part.name || 'part', 'ran to the end', false, e.message.split('\n')[0]); }
    }
    await browser.close();
  }
  if (!ran) { console.log('FAIL: no browser could start'); process.exit(1); }
  console.log(failed ? `${failed} failed` : 'every layer check passed');
  process.exit(failed ? 1 : 0);
})();
