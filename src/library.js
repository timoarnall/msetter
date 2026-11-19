// The profile library: the starting sets as groups of single user profiles, each with one line. A library profile is
// the same profile every time: it brings its whole Exposure, Image and Shooting pages as its own set makes them
// (valuesFor), and takes Buttons, Favorites, Screen and Camera from your first profile. An entry is known by its id,
// so another group's NIGHT stays addable. Add all (on each group) adds what fits, or starts from the whole set when
// the only profile is the untouched first one. Saved: profiles saved from your own designs, the same three pages, in
// this browser only (storage key msetter-yours-v1). docs/state.md, "Library".
var LIBRARY = (function () {
  'use strict';
  // set id -> one line per profile, in the set's order. A line says only what the library profile brings (its Exposure,
  // Image and Shooting pages): never the screen, lights, phone or review, which stay with your first profile.
  var LINES = {
    everyday: ['Shoot Natural color all day at 1/(2f) or faster.', 'Switch to high-contrast black and white and keep the color in the DNG.',
      'Fill flash a stop below the daylight fires at the end of the exposure.', 'After dark, ISO climbs to 50000 before the shutter drops below 1/f.',
      'On a tripod, ISO 64, a 2 s timer and the silent shutter keep the picture still.'],
    motion: ['Fast bursts at 1/2000 stop sport, splashes and running dogs.', 'Walkers and cyclists stay sharp at 1/500.', 'At 1/60 hands and feet blur a little while faces stay sharp.',
      'Follow a cyclist or car at 1/30 so the background streaks behind it.', 'Crowds and traffic smear at 1/15 once the light drops or an ND filter goes on.',
      'Water and car lights turn to streaks at half a second, best from a tripod.'],
    looks: ['Late sun gets warmer at 6500 K, with richer color and a third more light.', 'Two thirds of extra light give pale, soft color, like overexposed color negative film.',
      'Daylight white balance and two thirds under give dense, saturated color, like slide film.', 'Snow, steel and winter light turn clean and blue at 4200 K.',
      'Daylight white balance in every light keeps lamps orange and shade blue.', 'Tungsten white balance turns daylight blue and leaves lamplight white.'],
    experimental: ['Move the camera during a quarter second so light turns into strokes of color.', 'Fast bursts at 1/8 blur everything, and one frame in many keeps a face clear.',
      'A flash at the end of 1/8 freezes people on top of their own blur.', 'Draw with a flashlight during long exposures on B, from a tripod at ISO 64.',
      'The electronic shutter reads the sensor line by line, so fast pans and propellers bend.', 'A picture every five seconds, 300 in all, makes a timelapse from a tripod.'],
    architecture: ['Shoot from a tripod at ISO 64, with a 2 s timer and the silent shutter.', 'Straightens buildings shot tilting up.',
      'Five frames a stop apart hold bright windows and dark rooms in one set.', 'Straightens rooms by hand, with ISO allowed up to 12500.',
      'Let buildings lean in steep views up or down, in high-contrast black and white.'],
    daynight: ['Auto ISO climbs to 50000 to keep 1/(4f), so pictures stay sharp and grainy.', 'Auto ISO climbs to 12500 to keep 1/(2f), for most pictures by hand.',
      'ISO stops at 3200 and the shutter may drop below 1/f, so dim light brings blur before grain.', 'The shutter slows to 1/8 before ISO rises, and ISO stops at 400, for blur and clean files.'],
    cinema: ['A fixed 5500 K gives low-contrast color with the balance of daylight film stock.', 'Strong contrast and little color look like film developed without its bleach step.',
      'Tungsten white balance and two stops under turn a sunny day into night, as films do.', 'Signs and wet streets glow in strong color at night, a third darker.',
      'Rooms under lamps stay warm at 4200 K.', 'Shadows go black as in film noir, in the hardest black and white and two thirds under.'],
    street: ['Set the lens to f/8 and three meters, and Auto ISO keeps 1/500 for passers-by.', 'A stop under in hard sun keeps bright walls in color and lets shadows go black.',
      'Flash in daylight at arm’s length lifts a face out of a busy street.', 'Streets after dark stay two thirds under at 1/60, so night looks like night.',
      'Noise reduction at its lowest leaves the grain in, like pushed black and white film.'],
    fixed: ['ISO 100 for sun, where the sunny 16 rule gives about f/11 at 1/250 without a meter.', 'ISO 400 covers shade, cloud and bright rooms, like film at its box speed.',
      'ISO 1600 and tungsten white balance suit rooms lit by lamps.', 'ISO 6400 in daylight color keeps street lamps orange, as on film.',
      'ISO 3200 in high-contrast black and white looks like film pushed two stops.'],
    portrait: ['Shadow white balance warms faces in open shade.', 'Faces by a window get 1/125 or faster and a third more light.',
      'Fill flash two thirds under the daylight fires at the end of the exposure.', 'Soft black and white keeps skin in the middle grays.',
      'The silent shutter reaches 1/16000, so a fast lens stays wide open in full sun.'],
    landscape: ['A tripod, ISO 64 and a 2 s timer give the most detail the sensor holds.', 'By hand, 60 MP needs four times the focal length to stay sharp.',
      'Five frames a stop apart from a tripod merge later into one picture.', 'Daylight white balance keeps the sky deep blue after sunset.',
      'Hard light turns into high-contrast black and white, with a DNG of each frame.'],
    night: ['ISO climbs to 25000 to keep 1/f, and the picture stays two thirds dark.', 'ISO stops at 3200 and then the shutter slows below 1/30, so lights and people blur.',
      'Tungsten white balance makes lamps white and the night sky deep blue.', 'Shoot stars from a tripod at ISO 3200 with the ISO dial on M.'],
    events: ['The silent shutter keeps vows and readings quiet at 1/125, with ISO up to 25000.', 'Guests and groups come out in Natural color at 1/(2f) or faster.',
      'Flash at the end of 1/15 leaves the dance floor lights trailing behind sharp faces.', 'The 1.3x crop brings rings, tables and flowers closer.',
      'Silent bursts at 1/250 catch the face between words.'],
    mono: ['Gentle contrast and a third more light suit gray, overcast days.', 'Black and white that keeps every gray teaches you to see light as tones.',
      'Hard sun and deep shadow turn into strong blacks and whites.', 'Expose for the highlights and let the rest fall to black.',
      'High ISO, slow speeds and hard contrast leave grain and blur in on purpose.', 'JPG files in black and white only, so no color version exists to fall back on.'],
    travel: ['Walk all day in Natural color at 1/(2f) or faster.', 'The silent shutter suits museums, churches and anywhere a shutter sound is unwelcome.',
      'Food and drink come out in vivid color, a third brighter.', 'ISO climbs to 25000 for evenings out by hand, a third under.',
      'At 1/1000 the view from a train or car window stays sharp.'],
    kids: ['Fast bursts at 1/1000 stop running children and dogs.', 'Slow bursts at 1/500 follow play outside.', 'Play indoors stays sharp at 1/250, with ISO up to 25000.',
      'The silent shutter at 1/60 lets a sleeping child sleep on.']
  };
  // The settings a library profile brings: every setting on the Exposure, Image and Shooting pages, with the tuning of
  // every film style (the Image page's Contrast, Sharpness and Saturation follow the style).
  var PAGES = ['exposure', 'look', 'shooting'], codes = null;
  function ownCodes() {
    if (codes) return codes;
    codes = [];
    CATALOGUE.themes.forEach(function (t) { if (PAGES.indexOf(t.id) >= 0) t.rows.forEach(function (r) { if (r.code && codes.indexOf(r.code) < 0) codes.push(r.code); }); });
    Object.keys(CATALOGUE.STYLE).forEach(function (k) { CATALOGUE.STYLE[k].forEach(function (c) { if (c && codes.indexOf(c) < 0) codes.push(c); }); });
    return codes;
  }
  // What entry x brings on camera model: from its set as the set makes it on that camera, or as it was saved.
  var made = {};
  function valuesFor(x, model) {
    if (!x.set) return x.values;
    var k = x.set + ' ' + model;
    if (!made[k]) made[k] = Design.fromSet(SETS.filter(function (s) { return s.id === x.set; })[0], model);
    var doc = made[k], v = {};
    ownCodes().forEach(function (c) { if (doc.S[c]) v[c] = Engine.clone(doc.S[c][x.index + 1]); });
    return v;
  }

  // Color looks, Black and white, Motion, Experimental, Architecture, Travel, then the rest in the order SETS lists them
  // (Everyday, Speed ladder, Cinema, Street, One speed, Portrait, Landscape, Night, Events, Kids and pets); not Factory
  // (Timo, 2026-11-18). SETS keeps its own order: the save proof's edit runs pick sets by place in it.
  var FIRST = ['looks', 'mono', 'motion', 'experimental', 'architecture', 'travel'];
  var place = function (s) { var i = FIRST.indexOf(s.id); return i >= 0 ? i : FIRST.length + SETS.indexOf(s); };
  var groups = SETS.filter(function (s) { return s.id !== 'factory' && (s.profiles || []).length; }).sort(function (a, b) { return place(a) - place(b); }).map(function (s) {
    return { id: s.id, name: s.name, help: s.help, items: s.profiles.map(function (p, i) {
      return { id: s.id + '-' + i, set: s.id, index: i, name: String(p.name).toUpperCase(), line: (LINES[s.id] || [])[i] || '' };
    }) };
  });

  // Saved: { name, values } saved from your designs, in this browser.
  var KEY = 'msetter-yours-v1';
  // Typed like an opened file: a name, and values under codes of four hex digits, each a number, text or a list.
  function yours() {
    var list; try { list = JSON.parse(localStorage.getItem(KEY)); } catch (e) { list = null; }
    if (!Array.isArray(list)) return [];
    var ok = function (v) { return typeof v === 'number' || typeof v === 'string' || (v && typeof v === 'object' && typeof v.value === 'number' && Array.isArray(v.items) && v.items.every(function (x) { return typeof x === 'number'; })); };
    return list.filter(function (x) { return x && typeof x.name === 'string' && x.values && typeof x.values === 'object'; }).map(function (x) {
      var v = {}; Object.keys(x.values).forEach(function (k) { if (/^[0-9A-Fa-f]{4}$/.test(k) && ok(x.values[k])) v[k] = x.values[k]; });
      return { name: x.name.slice(0, 10), values: v, line: typeof x.line === 'string' ? x.line : '' };
    });
  }
  function keep(entry) {
    var list = yours().filter(function (x) { return x.name !== entry.name; });
    list.unshift(entry);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage off */ }
  }
  function forget(name) { try { localStorage.setItem(KEY, JSON.stringify(yours().filter(function (x) { return x.name !== name; }))); } catch (e) { /* storage off */ } }
  function find(id) {
    if (/^yours:/.test(id)) { var n = id.slice(6); return yours().filter(function (x) { return x.name === n; })[0]; }
    for (var g = 0; g < groups.length; g++) for (var i = 0; i < groups[g].items.length; i++) if (groups[g].items[i].id === id) return groups[g].items[i];
    return null;
  }
  return { groups: groups, yours: yours, keep: keep, forget: forget, find: find, valuesFor: valuesFor, ownCodes: ownCodes };
})();
if (typeof module !== 'undefined') module.exports = LIBRARY;
