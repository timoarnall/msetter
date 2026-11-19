// Starting sets: groups of profiles for one kind of shooting.
// base applies to every profile in the set; each profile then sets its own values.
// Values are stored values (see rules.js). Names are 3 to 10 characters, as the camera requires.
// Layout values use the keys of CATALOGUE.LAYOUTS with an index: e.g. layout: [{ grid: 1, horizon: 1 }] sets layout 1
// to grid and horizon, and turns its other parts (info bars, histogram, clipping, peaking) off.
// favorites: the Favorites page, in order (item numbers from rules.js, D1A9; at most 11).
// Every set with more than one profile puts User Profile on the top button, so the profiles are one press apart.
// FN is left on its factory job: Live View on the M11 bodies, the viewfinder and screen switch on the M-EV1.
var FAV = { drive: 20499, timer: 53399, interval: 1, bracket: 14, metering: 20491, expComp: 20496, iso: 53264, autoIso: 12, wb: 5,
  grayCard: 24, format: 53252, dngSize: 53654, filmStyle: 53566, edr: 53748, review: 53274, shutter: 53461, flash: 3, flashComp: 53313,
  zoom: 53328, perspective: 53655, touch: 54059, profile: 11, evfLcd: 25, fotos: 53536, formatCard: 8, assistants: 9, focusAid: 53280, power: 31, lens: 13, dateTime: 15,
  jpgSettings: 6, noise: 53656, toning: 40 };

var SETS = [
  { id: 'ladder', name: 'Speed ladder', help: 'Limits that take you from fast subjects to slow ones as the light changes: Fast for action, Medium for people, Slow for slow movement, Sloow on a tripod. In daylight, use an ND filter (dark glass on the lens) to get slow speeds.',
    base: { '5010': -667, '500B': 32769, '5013': 5, D193: 26, D195: 13, D077: 1, D1D6: 84, D108: 300, D017: 6, D01A: 0, D020: 1,
      favorites: [FAV.lens, FAV.iso, FAV.expComp, FAV.drive, FAV.wb, FAV.formatCard] },
    profiles: [
      { name: 'Fast', v: { D00C: 2560, D00B: 6400, '5005': 1, D32B: 2, D1D7: 3 } },
      { name: 'Medium', v: { D00C: 2048, D00B: 6400, D32B: 2, D1D7: 3 } },
      { name: 'Slow', v: { D00C: 32770, D00B: 3200, D32B: 0, D1D7: 21 } },
      { name: 'Sloow', v: { D00C: 32770, D00B: 64, D32B: 0, D1D7: 21 } }
    ] },

  { id: 'daynight', name: 'Day and night', help: 'Day in daylight, Night after dark. Night lets ISO climb to 25000 and keeps the picture a third of a stop darker.',
    base: { D193: 26, D195: 11, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D020: 1,
      favorites: [FAV.lens, FAV.drive, FAV.iso, FAV.wb, FAV.expComp, FAV.formatCard],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1 }, { bars: 0 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Day', v: { D00C: 2304, D00B: 6400 } },
      { name: 'Night', v: { D00C: 1536, D00B: 25000, '5010': -333 } }
    ] },

  { id: 'everyday', name: 'Everyday', help: 'Switch profile as the light changes on a walk; the darker the light, the higher ISO may go. Tripod adds a 2 s timer and the silent shutter, and allows speeds down to 1/2 s: in daylight, use an ND filter for those.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D115: 4, D020: 1,
      favorites: [FAV.lens, FAV.drive, FAV.iso, FAV.wb, FAV.filmStyle, FAV.timer, FAV.format, FAV.formatCard],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1, horizon: 1 }, { bars: 0 }, { bars: 1, peak: 1, clip: 1 }] },
    profiles: [
      { name: 'Sunny', v: { D00C: 2560, D00B: 3200, '5005': 1 } },
      { name: 'Shade', v: { D00C: 2048, D00B: 6400, '5005': 3 } },
      { name: 'Indoors', v: { D00C: 1792, D00B: 12500, '5005': 0 } },
      { name: 'Evening', v: { D00C: 32769, D00B: 12500, '5005': 0, '5010': -333 } },
      { name: 'Night', v: { D00C: 32768, D00B: 25000, '5005': 0, '5010': -667, D0C3: 0, D1AA: 0 } },
      { name: 'Tripod', v: { D00C: 256, D00B: 100, D097: 3, D0D5: 1, D198: 1, D32B: 0 } }
    ] },

  { id: 'motion', name: 'Motion', help: 'Pick how movement looks: Freeze and Crisp stop it, Walk and Pan keep a little, and Drag and Streak blur it. In daylight, use an ND filter (dark glass on the lens) to get the slow speeds.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D020: 1,
      favorites: [FAV.lens, FAV.drive, FAV.iso, FAV.expComp, FAV.shutter, FAV.timer],
      layout: [{ bars: 1, histo: 1 }, { bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Freeze', v: { D00C: 2816, D00B: 50000, '5013': 7 } },
      { name: 'Crisp', v: { D00C: 2304, D00B: 12500 } },
      { name: 'Walk', v: { D00C: 1536, D00B: 6400 } },
      { name: 'Pan', v: { D00C: 1280, D00B: 800, '5013': 5 } },
      { name: 'Drag', v: { D00C: 1024, D00B: 400, '5010': -333 } },
      { name: 'Streak', v: { D00C: 256, D00B: 100, '5010': -667 } }
    ] },

  { id: 'looks', name: 'Color looks', help: 'Pick a JPG look for the subject or the mood. Each picture also saves a DNG, so you can change the look later. Not for the M11 Monochrom.',
    base: { D004: 1, D193: 26, D195: 22, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D00C: 32769, D00B: 6400, D01A: 3,
      favorites: [FAV.lens, FAV.filmStyle, FAV.wb, FAV.expComp, FAV.edr, FAV.iso],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, clip: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Golden', v: { D13E: 3, D092: 1, '5005': 11, D014: 6500, '5010': 333 } },
      { name: 'Faded', v: { D13E: 3, D090: -2, D092: -1, '5010': 333, D1F4: 2 } },
      { name: 'Punchy', v: { D13E: 2, D08D: 1, D08F: 1 } },
      { name: 'Cool', v: { D13E: 1, D08A: 1, '5005': 11, D014: 4200 } },
      { name: 'Cinema', v: { D13E: 3, D090: -1, D092: -1, '5005': 4, '5010': -333, D1F4: 1 } },
      { name: 'Plain', v: { D13E: 1, '5005': 0 } }
    ] },

  { id: 'cinema', name: 'Cinema', help: 'Switch profile as the light changes through the day and evening; each has its own color and speed limit, and Noir is black and white. Metering keeps the highlights.',
    base: { D004: 1, '500B': 32769, D1F4: 1, D193: 26, D195: 15, D077: 1, D1D6: 84, D1D7: 3, D01A: 1,
      favorites: [FAV.lens, FAV.wb, FAV.filmStyle, FAV.expComp, FAV.iso, FAV.edr],
      layout: [{ bars: 1, grid: 1, gridFmt: 2 }, { bars: 1, histo: 1 }, { bars: 0, grid: 1 }, { bars: 1, clip: 1 }] },
    profiles: [
      { name: 'Day', v: { D13E: 3, D090: -1, D092: -1, '5005': 11, D014: 5500, D00C: 1792, D00B: 3200, D1F4: 2 } },
      { name: 'Golden', v: { D13E: 3, D092: 1, '5005': 11, D014: 7200, D00C: 32769, D00B: 6400 } },
      { name: 'Dusk', v: { D13E: 3, D090: -1, '5005': 4, '5010': -667, D00C: 1536, D00B: 12500 } },
      { name: 'Neon', v: { D13E: 2, D08F: 1, '5005': 0, '5010': -333, D00C: 1536, D00B: 25000 } },
      { name: 'Interior', v: { D13E: 3, '5005': 11, D014: 4200, D00C: 1536, D00B: 12500 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, D00C: 1536, D00B: 12500 } }
    ] },

  { id: 'street', name: 'Street', help: 'Switch as you walk from sun into shade, inside or night; Mono is black and white. Metering keeps the highlights. No review, and no touch while you shoot.',
    base: { '5010': -333, '500B': 32769, D0D5: 2, D01A: 0, D32B: 2, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D004: 1,
      favorites: [FAV.lens, FAV.drive, FAV.iso, FAV.filmStyle, FAV.expComp, FAV.shutter, FAV.formatCard],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }, { bars: 1, histo: 1, horizon: 1 }] },
    profiles: [
      { name: 'Sunny', v: { D00C: 2304, D00B: 6400 } },
      { name: 'Shade', v: { D00C: 2048, D00B: 12500 } },
      { name: 'Inside', v: { D00C: 1792, D00B: 25000 } },
      { name: 'Night', v: { D00C: 1536, D00B: 25000, '5010': -667 } },
      { name: 'Mono', v: { D00C: 2048, D00B: 12500, D13E: 4, D093: 1 } }
    ] },

  { id: 'fixed', name: 'One speed', help: 'Leave the shutter dial on one speed, such as 1/250, and the ISO dial on M, then pick the profile for the light. Each fixes ISO and white balance.',
    base: { D01A: 0, D32B: 1, D115: 0, D051: 30, D004: 1, D0C3: 0, D193: 26, D195: 11, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.iso, FAV.wb, FAV.filmStyle, FAV.formatCard],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, histo: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Sun', v: { D010: 200, '5005': 1 } },
      { name: 'Shade', v: { D010: 400, '5005': 3 } },
      { name: 'Inside', v: { D010: 3200, '5005': 0 } },
      { name: 'Night', v: { D010: 6400, '5005': 0 } },
      { name: 'Pushed', v: { D010: 3200, D13E: 5 } }
    ] },

  { id: 'portrait', name: 'Portrait', help: 'For people: Outdoor and Window in daylight, Flash with a flash on the camera, Mono in black and white. Pressing the thumbwheel magnifies to check the eyes.',
    base: { '500B': 1, D01A: 3, D193: 26, D195: 3, D077: 1, D1D6: 84, D1D7: 3, D004: 1, D13E: 3, D090: -1, D092: -1,
      favorites: [FAV.lens, FAV.wb, FAV.filmStyle, FAV.expComp, FAV.timer, FAV.flash, FAV.flashComp],
      layout: [{ bars: 1, peak: 1, peakColor: 3 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Outdoor', v: { D00C: 32769, D00B: 6400 } },
      { name: 'Window', v: { D00C: 1792, D00B: 12500, '5010': 333 } },
      { name: 'Flash', v: { D00C: 1792, D00B: 6400, D0D3: 1600, D003: 4, D009: 1, D041: -667 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 6400, D13E: 4, D093: 1 } }
    ] },

  { id: 'landscape', name: 'Landscape', help: 'Tripod and Bracket for careful frames at the lowest ISO, with the ISO dial on M; Walk for handheld; Blue hour after sunset. Grid, horizon and histogram on.',
    base: { '500B': 2, D004: 0, D115: 1, D01A: 5, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.bracket, FAV.timer, FAV.interval, FAV.dngSize, FAV.perspective, FAV.edr],
      layout: [{ bars: 1, grid: 1, horizon: 1, histo: 1 }, { bars: 1, histo: 1, clip: 1 }, { bars: 0, grid: 1 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Tripod', v: { D010: 64, D097: 3, D0D5: 1, D198: 1, D32B: 0 } },
      { name: 'Walk', v: { D00C: 32769, D00B: 3200 } },
      { name: 'Bracket', v: { D010: 64, '5013': 8, D006: 5, D007: 1000, D097: 3, D0D5: 1 } },
      { name: 'Blue hour', v: { D00C: 768, D00B: 6400, '5005': 1 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 3200, D13E: 5, D0B0: 1, D004: 1 } }
    ] },

  { id: 'night', name: 'Night', help: 'Dark and Darker for handheld pictures after dark, Lights for streets and signs, Stars on a tripod at ISO 3200 with the ISO dial on M. Lights off, screens dimmed.',
    base: { D0C3: 0, D1AA: 0, D01E: 11, D133: 11, D01A: 0, D32B: 2, '500B': 32769, D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.iso, FAV.wb, FAV.timer, FAV.shutter, FAV.expComp],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1, peakColor: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Dark', v: { D00C: 32768, D00B: 25000, '5010': -333 } },
      { name: 'Darker', v: { D00C: 1280, D00B: 50000, '5010': -667 } },
      { name: 'Lights', v: { D00C: 1536, D00B: 12500, '5005': 4, '5010': -333 } },
      { name: 'Stars', v: { D010: 3200, D097: 3, D0D5: 1, D198: 0, '5005': 11, D014: 3900, D01E: 10, D133: 10 } }
    ] },

  { id: 'events', name: 'Events', help: 'For weddings and talks: Quiet and Speeches use the silent shutter, Party a flash, Details the digital zoom. Pressing the thumbwheel magnifies to check focus.',
    base: { '5005': 0, D004: 1, D193: 26, D195: 3, D077: 1, D1D6: 84, D1D7: 3, D17A: 1,
      favorites: [FAV.lens, FAV.shutter, FAV.flash, FAV.flashComp, FAV.drive, FAV.iso, FAV.formatCard],
      layout: [{ bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Quiet', v: { D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0, D00C: 2048, D00B: 12500 } },
      { name: 'People', v: { D00C: 32769, D00B: 6400, D13E: 3, D01A: 1 } },
      { name: 'Party', v: { D0D3: 1600, D003: 4, D009: 1, D041: -667, D00C: 1792, D00B: 6400 } },
      { name: 'Details', v: { D00C: 1792, D00B: 6400, D050: 3, D01A: 3 } },
      { name: 'Speeches', v: { D0D5: 1, D01A: 0, D00C: 1792, D00B: 25000, '5013': 5 } }
    ] },

  { id: 'mono', name: 'Black and white', help: 'Black and white for every light: Soft, Mono, Hard, Noir or Grain, and Color to switch back. Each saves a DNG as well. Peaking is white.',
    base: { D004: 1, D11E: 3, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D00C: 32769, D00B: 6400,
      favorites: [FAV.lens, FAV.filmStyle, FAV.expComp, FAV.iso, FAV.format],
      layout: [{ bars: 1, peak: 1, peakColor: 3 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Soft', v: { D13E: 4, D093: -1, '5010': 333 } },
      { name: 'Mono', v: { D13E: 4, D093: 1 } },
      { name: 'Hard', v: { D13E: 5, D0B0: 1 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, '500B': 32769, D00C: 1536 } },
      { name: 'Grain', v: { D13E: 4, D093: 1, D081: 0, D00C: 2048, D00B: 50000 } },
      { name: 'Color', v: { D13E: 1 } }
    ] },

  { id: 'travel', name: 'Travel', help: 'Day for walking around, Museum where you must be quiet, Food at the table, Night after dark, and Saver to make the battery last.',
    base: { D004: 1, '5005': 0, D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.drive, FAV.timer, FAV.wb, FAV.dateTime, FAV.fotos, FAV.power, FAV.formatCard],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1, horizon: 1 }, { bars: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Day', v: { D00C: 32769, D00B: 6400, D1FC: 2 } },
      { name: 'Museum', v: { D00C: 1792, D00B: 25000, D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0 } },
      { name: 'Food', v: { D00C: 1792, D00B: 12500, D13E: 2, D01A: 3, '5010': 333 } },
      { name: 'Night', v: { D00C: 32768, D00B: 25000, '5010': -333 } },
      { name: 'Saver', v: { D00C: 32769, D00B: 12500, D1FC: 0, D051: 30, D108: 60, D01A: 0, D01E: 13, D133: 13, D115: 4 } }
    ] },

  { id: 'kids', name: 'Kids and pets', help: 'Fast speeds and bursts for Run, Play and Inside, and the silent shutter for Asleep, so you don\'t wake them.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, D01A: 0, D0D5: 2, '500B': 2,
      favorites: [FAV.lens, FAV.drive, FAV.iso, FAV.expComp, FAV.shutter],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, histo: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Run', v: { D00C: 2560, D00B: 25000, '5013': 7 } },
      { name: 'Play', v: { D00C: 2304, D00B: 12500, '5013': 5 } },
      { name: 'Inside', v: { D00C: 2048, D00B: 25000, '5013': 5 } },
      { name: 'Asleep', v: { D00C: 1536, D00B: 12500, '5013': 0, D0D5: 1 } }
    ] },

  { id: 'factory', name: 'Factory', help: 'Leica’s factory settings and one user profile, except peaking Low, picture review off, touch off while shooting and ISO Auto with the ISO dial on M.',
    base: {}, profiles: [{ name: 'Profile 1', v: {} }] }
];

// Part sets: one part of the camera (buttons, Favorites or screen layouts), the same in every profile. Picking one
// changes only that part. v: the values, written as in a starting set's base. bodies: what a camera does differently,
// because it lacks a job or an item (the M-EV1 has no Live View on FN; the M11 Monochrom has no Film Style).
// A button set writes every button job and the M-EV1's lever (which the M11 bodies ignore), a Favorites set the
// whole list, a layout set every part of all four layouts, so a set always replaces the whole part.
function screens(layouts) {  // every part of all four layouts: peaking Low and Red, grid 3 x 3, clipping from 253
  return layouts.map(function (L) { return Object.assign({ peakSens: 0, peakColor: 0, gridFmt: 1, clipLimit: 253 }, L); });
}
var PART_SETS = [
  { kind: 'buttons', id: 'rangefinder', name: 'Rangefinder', help: 'Focus and expose by hand. The top button magnifies, pressing the thumbwheel sets the ISO, and turning it does nothing.',
    v: { D193: 3, D191: 1, D195: 11, D077: 0, D1D6: 0, D1D7: 0 }, bodies: { 'M-EV1': { D191: 27 } } },
  { kind: 'buttons', id: 'wheel', name: 'Exposure on the wheel', help: 'Shoot on A with Auto ISO. Turn the thumbwheel for brighter or darker, press it for the maximum ISO, press FN for the speed limit.',
    v: { D193: 4, D191: 14, D195: 13, D077: 1, D1D6: 3, D1D7: 84 } },
  { kind: 'buttons', id: 'fnprofiles', name: 'Profiles on FN', help: 'FN opens the list of user profiles and Focus Aid stays on the top button. Pressing the thumbwheel opens exposure compensation.',
    v: { D193: 3, D191: 26, D195: 10, D077: 0, D1D6: 3, D1D7: 0 } },

  { kind: 'favorites', id: 'empty', name: 'Empty', help: 'Menu goes from the status screen straight to the main menu.',
    v: { favorites: [] } },
  { kind: 'favorites', id: 'jpg', name: 'JPG look', help: 'Change the film style, JPG settings and file format without the main menu, for shooting DNG and JPG.',
    v: { favorites: [FAV.filmStyle, FAV.jpgSettings, FAV.edr, FAV.dngSize, FAV.format] },
    bodies: { 'M11 Monochrom': { favorites: [FAV.jpgSettings, FAV.toning, FAV.dngSize, FAV.format] } } },
  { kind: 'favorites', id: 'tripodfav', name: 'Tripod', help: 'Set the self-timer, silent shutter, straightening, noise reduction and brackets before a tripod shot.',
    v: { favorites: [FAV.timer, FAV.shutter, FAV.perspective, FAV.noise, FAV.bracket] } },

  { kind: 'layouts', id: 'clean', name: 'Clean', help: 'The picture with only the exposure numbers. One press of the center button adds red peaking.',
    v: { layout: screens([{ bars: 1 }, { bars: 1, peak: 1 }, {}, {}]) } },
  { kind: 'layouts', id: 'check', name: 'Focus and check', help: 'A clear view to compose, then peaking to focus, then histogram and clipping to check the exposure.',
    v: { layout: screens([{ bars: 1 }, { bars: 1, peak: 1 }, { bars: 1, histo: 1, clip: 1 }, {}]) } },
  { kind: 'layouts', id: 'tripodlay', name: 'Tripod', help: 'Grid and horizon to level, histogram and clipping to check the exposure, then peaking to focus.',
    v: { layout: screens([{ bars: 1, grid: 1, horizon: 1 }, { histo: 1, clip: 1, horizon: 1 }, { bars: 1, peak: 1 }, {}]) } }
];
if (typeof module !== 'undefined') { module.exports = SETS; module.exports.PARTS = PART_SETS; }
