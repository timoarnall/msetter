// Recording engine for the documentation's GIFs and stills. The page runs in slow motion (every animation, transition
// and timer K times slower), screenshots are taken as fast as Chrome gives them, and each frame keeps its time divided
// by K, so the GIF plays at the page's true speed with far more frames than a real-time capture gets.
// Pointer moves, typing and pauses are written in real time; the engine stretches them by K while recording.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const K = 6;
const CURSOR = `(() => { const d = document.createElement('div'); d.id = 'rec-cursor';
  d.style.cssText = 'position:fixed;z-index:2147483647;left:-60px;top:-60px;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:12px;background:rgba(128,128,128,0.28);box-shadow:0 0 0 1.5px rgba(255,255,255,0.9),0 0 0 3px rgba(0,0,0,0.22);pointer-events:none;transition:transform 90ms';
  document.documentElement.appendChild(d);
  const mv = e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; };
  addEventListener('pointermove', mv, true); addEventListener('pointerdown', e => { mv(e); d.style.transform = 'scale(0.72)'; }, true);
  addEventListener('pointerup', () => { d.style.transform = ''; }, true); })()`;

async function open(url, o) {
  o = Object.assign({ width: 1440, height: 900, dpr: 2, scheme: 'light', touch: false, cursor: true }, o || {});
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: o.width, height: o.height }, deviceScaleFactor: o.dpr, colorScheme: o.scheme, hasTouch: o.touch, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.addInitScript(() => { const st = window.setTimeout; window.__slow = 1; window.setTimeout = function (f, d) { var a = [].slice.call(arguments, 2); return st.apply(window, [f, (d || 0) * window.__slow].concat(a)); }; });
  if (o.cursor) await p.addInitScript('addEventListener("DOMContentLoaded", () => ' + CURSOR + ')');
  await p.goto(url);
  if (o.fresh !== false) { await p.evaluate(() => localStorage.clear()); await p.reload(); }
  await p.waitForTimeout(600);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable');
  const r = { browser, page: p, cdp, mx: o.width / 2, my: o.height / 2, slow: 1, shots: [], rec: false, clip: null };

  r.speed = async (k) => { r.slow = k; await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / k }); await p.evaluate(k => { window.__slow = k; }, k); };
  r.sleep = (ms) => new Promise(res => setTimeout(res, ms * r.slow));
  r.start = async (clip) => {
    r.clip = clip || null; r.shots = []; await r.speed(K); r.rec = true; const t0 = Date.now();
    r.loop = (async () => { while (r.rec) { const t = Date.now(); const buf = await p.screenshot({ type: 'png', clip: r.clip || undefined, animations: 'allow', caret: 'initial' }); r.shots.push({ t: (t - t0) / K, buf }); } })();
  };
  r.stop = async () => { r.rec = false; await r.loop; await r.speed(1); return r.shots; };
  r.box = async (target) => { const l = typeof target === 'string' ? p.locator(target).first() : target; await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); if (!b) throw new Error('no box for ' + target); return b; };
  r.center = async (target) => { const b = await r.box(target); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  // Moves the pointer along an eased path in real-time ms.
  r.glide = async (x, y, ms) => { ms = ms || 450; const n = Math.max(6, Math.round(ms / 16)), x0 = r.mx, y0 = r.my;
    for (let i = 1; i <= n; i++) { const t = i / n, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; await p.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); await r.sleep(ms / n); }
    r.mx = x; r.my = y; };
  r.to = async (target, ms) => { const c = await r.center(target); await r.glide(c.x, c.y, ms); return c; };
  r.click = async (target, ms) => { await r.to(target, ms); await r.sleep(120); await p.mouse.down(); await r.sleep(90); await p.mouse.up(); await r.sleep(60); };
  // from and to: a selector, a locator, or a point { x, y }.
  const point = async (t) => t && typeof t === 'object' && 'x' in t && 'y' in t && !t.boundingBox ? t : r.center(t);
  r.drag = async (from, to, ms, hold) => { const a = await point(from); await r.glide(a.x, a.y, 450); await r.sleep(150); await p.mouse.down(); await r.sleep(hold || 220);
    const c = await point(to); await r.glide(c.x, c.y, ms || 900); await r.sleep(200); await p.mouse.up(); await r.sleep(80); };
  r.type = async (text, perChar) => { for (const ch of text) { await p.keyboard.type(ch); await r.sleep(perChar || 85); } };
  r.key = async (k) => { await p.keyboard.press(k); await r.sleep(60); };
  r.close = () => browser.close();
  return r;
}

// Writes a GIF from recorded shots: true timing, a hold on the last frame, a shared palette tuned for flat UI color.
function gif(shots, out, o) {
  o = Object.assign({ width: 1600, fps: 30, hold: 1.6 }, o || {});
  const dir = out + '.frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  let list = '';
  shots.forEach((s, i) => { const f = 'f' + String(i).padStart(5, '0') + '.png'; fs.writeFileSync(path.join(dir, f), s.buf);
    const d = i < shots.length - 1 ? Math.max(0.001, (shots[i + 1].t - s.t) / 1000) : o.hold; list += "file '" + f + "'\nduration " + d.toFixed(4) + '\n'; });
  list += "file 'f" + String(shots.length - 1).padStart(5, '0') + ".png'\n";
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf',
    'fps=' + o.fps + ',scale=' + o.width + ':-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', '-loop', '0', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  return fs.statSync(out).size;
}

module.exports = { open, gif, K };
