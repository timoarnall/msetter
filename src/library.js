// The profile library: the starting sets as groups of single user profiles, each with one line and its own values.
// A profile's own values are its v in sets.js plus the metering, film style and white balance its set gives every
// profile. Never a set's buttons, Favorites or screen layouts: an added profile takes those from your first profile.
// Use these (the group's link) still starts from the whole set, as the starting sets did.
// Yours: profiles kept from your own designs, in this browser only.
var LIBRARY = (function () {
  'use strict';
  // set id -> one line per profile, in the set's order
  var LINES = {
    everyday: ['Bright sun. Fast speeds and daylight color.', 'Open shade or cloud. Shadow white balance warms it up.', 'By a window or under lamps.',
      'Low sun to dusk. The speed limit follows the lens, a third darker.', 'After dark by hand. Status and base lights off.', 'On a tripod: 2 s timer, silent shutter, speeds down to 1/2.'],
    motion: ['Stops sport and splashes. Fast bursts.', 'Stops people walking and cycling.', 'Keeps a little movement in hands and feet.',
      'Follow a moving subject so the background streaks. Slow bursts.', 'Blurs crowds and traffic. An ND filter helps in daylight.', 'Long blur of water and lights. Needs an ND filter in daylight.'],
    looks: ['Warm late light, a third brighter.', 'Soft, low-contrast color with more detail in the highlights.', 'Strong color and contrast.',
      'Cool, clean color.', 'Tungsten color, low contrast, a third darker.', 'Standard color with Auto white balance.'],
    experimental: ['Move the camera during the exposure.', 'Blur in fast bursts at 1/8.', 'A flash at the end of a slow blur.',
      'The B setting on a tripod at ISO 64.', 'Electronic shutter up to 1/16000.', 'A picture every 5 seconds.'],
    architecture: ['Tripod at ISO 64: 2 s timer, silent shutter, noise reduction after long exposures.', 'By hand: the camera straightens buildings shot tilting up.',
      'Five frames a stop apart on a tripod, for bright windows and dark rooms.', 'Rooms by hand with verticals straightened. ISO may climb to 12500.',
      'Lit buildings after sunset on a tripod. Daylight color keeps the sky blue.'],
    daynight: ['Any daylight.', 'After dark: ISO may climb to 25000, a third darker.'],
    cinema: ['Natural film look in daylight. Metering keeps the highlights.', 'Warm film look for the last hour of sun.', 'Blue dusk under tungsten color.',
      'Signs and streets at night in vivid color.', 'Rooms under warm lamps.', 'High-contrast black and white, two thirds darker.'],
    street: ['Sun on the street. Metering keeps the highlights.', 'The shady side of the street.', 'Cafes, shops and stations.',
      'Streets after dark, two thirds darker.', 'Black and white on the street.'],
    fixed: ['ISO 200 and daylight color, for sun.', 'ISO 400 and shadow color, for shade.', 'ISO 3200, for inside.', 'ISO 6400, for night.',
      'High-contrast black and white at ISO 3200.'],
    portrait: ['Portraits outside. Center-weighted metering for the face.', 'By a window, a third brighter.',
      'A flash on the camera, fired at the end of the exposure.', 'Black and white portraits.'],
    landscape: ['Tripod at ISO 64: 2 s timer, silent shutter, touch on.', 'Landscapes by hand. The speed limit follows the lens.',
      'Five frames a stop apart, for merging later.', 'After sunset. Daylight color keeps the blue.', 'High-contrast black and white, with a DNG of each.'],
    night: ['Dark streets by hand. Metering keeps the highlights.', 'Very little light. ISO may climb to 50000.', 'Lit signs and windows in tungsten color.',
      'A tripod under stars: ISO 3200, dim screens.'],
    events: ['Silent shutter, no review, lights off.', 'Groups and talks. A one-second review.', 'Indoors with a flash, ambient light kept.',
      'Small things up close. Digital zoom 1.3x.', 'Silent bursts while people talk.'],
    mono: ['Gentle black and white, a third brighter.', 'Black and white with a little more contrast.', 'High-contrast black and white.',
      'Deep blacks, darker, highlights kept.', 'Black and white at high ISO, grain left in.', 'Back to standard color.'],
    travel: ['A day out. The phone connection stays fast.', 'Where cameras must be quiet.', 'At the table: vivid color, a third brighter.',
      'After dark by hand, a third darker.', 'Makes the battery last: dim screens, phone off, quick sleep.'],
    kids: ['Running children and dogs. Fast bursts.', 'Play outside. Slow bursts.', 'Play indoors. ISO may climb to 25000.', 'Silent shutter, so they stay asleep.']
  };
  var FROM_BASE = ['500B', 'D13E', '5005'];

  // Everyday, Motion, Color looks, Experimental, Architecture, then the rest in the order SETS lists them; not Factory.
  var groups = SETS.filter(function (s) { return s.id !== 'factory' && (s.profiles || []).length; }).map(function (s) {
    return { id: s.id, name: s.name, help: s.help, items: s.profiles.map(function (p, i) {
      var v = {};
      FROM_BASE.forEach(function (k) { if (s.base && k in s.base) v[k] = s.base[k]; });
      Object.keys(p.v || {}).forEach(function (k) { v[k] = p.v[k]; });
      return { id: s.id + '-' + i, name: String(p.name).toUpperCase(), line: (LINES[s.id] || [])[i] || '', values: v };
    }) };
  });

  // Yours: { name, values, line } kept in this browser.
  var KEY = 'msetter-yours-v1';
  function yours() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
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
  return { groups: groups, yours: yours, keep: keep, forget: forget, find: find };
})();
