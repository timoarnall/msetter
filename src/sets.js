// Starting sets: groups of profiles for one kind of shooting.
// base applies to every profile in the set; each profile then sets its own values.
// Values are stored values (see rules.js). Names are 3 to 10 characters, as the camera requires.
// Layout values use the keys of CATALOGUE.LAYOUTS with an index: e.g. layout: [{ grid: 1, horizon: 1 }] sets layout 1.
// favorites: the Favorites page, in order (item numbers from rules.js, D1A9; at most 11).
// Most sets put User Profile on the top button, so the profiles are one press apart.
var FAV = { drive: 20499, timer: 53399, interval: 1, bracket: 14, metering: 20491, expComp: 20496, iso: 53264, autoIso: 12, wb: 5,
  grayCard: 24, format: 53252, dngSize: 53654, filmStyle: 53566, edr: 53748, review: 53274, shutter: 53461, flash: 3, flashComp: 53313,
  zoom: 53328, perspective: 53655, touch: 54059, profile: 11, evfLcd: 25, fotos: 53536, formatCard: 8, assistants: 9, focusAid: 53280, power: 31 };

var SETS = [
  { id: 'ladder', name: 'Speed ladder', help: 'Four shutter and ISO limits for less and less light. The top button steps through them.',
    base: { '5010': -667, '500B': 32769, '5013': 5, D193: 26, D195: 13, D191: 27, D077: 1, D1D6: 84, D108: 300, D017: 6, D01A: 0, D020: 1 },
    profiles: [
      { name: 'Fast', v: { D00C: 2560, D00B: 6400, '5005': 1, D32B: 2, D1D7: 3 } },
      { name: 'Medium', v: { D00C: 2048, D00B: 6400, D32B: 2, D1D7: 3 } },
      { name: 'Slow', v: { D00C: 32770, D00B: 3200, D32B: 0, D1D7: 21 } },
      { name: 'Sloow', v: { D00C: 32770, D00B: 64, D32B: 0, D1D7: 21 } }
    ] },

  { id: 'everyday', name: 'Everyday', help: 'Sun to a tripod at night: limits and white balance for each light. The top button switches, the thumbwheel sets brightness.',
    base: { D193: 26, D191: 3, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D115: 4, D020: 1,
      favorites: [FAV.drive, FAV.iso, FAV.wb, FAV.filmStyle, FAV.timer, FAV.format, FAV.formatCard],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1, horizon: 1 }, { bars: 0 }, { bars: 1, peak: 1, clip: 1 }] },
    profiles: [
      { name: 'Sunny', v: { D00C: 2560, D00B: 3200, '5005': 1 } },
      { name: 'Shade', v: { D00C: 2048, D00B: 6400, '5005': 3 } },
      { name: 'Indoors', v: { D00C: 1792, D00B: 12500, '5005': 0 } },
      { name: 'Evening', v: { D00C: 32769, D00B: 12500, '5005': 0, '5010': -333 } },
      { name: 'Night', v: { D00C: 32768, D00B: 25000, '5005': 0, '5010': -667, D0C3: 0, D1AA: 0 } },
      { name: 'Tripod', v: { D00C: 256, D00B: 100, D097: 3, D0D5: 1, D198: 1, D32B: 0 } }
    ] },

  { id: 'motion', name: 'Motion', help: 'Shutter speed as the look, from frozen to streaked. Low ISO limits force slow speeds, so Drag and Streak blur.',
    base: { D193: 26, D191: 3, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D020: 1,
      favorites: [FAV.drive, FAV.iso, FAV.expComp, FAV.shutter, FAV.timer],
      layout: [{ bars: 1, histo: 1 }, { bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Freeze', v: { D00C: 2816, D00B: 50000, '5013': 7 } },
      { name: 'Crisp', v: { D00C: 2304, D00B: 12500 } },
      { name: 'Walk', v: { D00C: 1536, D00B: 6400 } },
      { name: 'Pan', v: { D00C: 1280, D00B: 800, '5013': 5 } },
      { name: 'Drag', v: { D00C: 1024, D00B: 400, '5010': -333 } },
      { name: 'Streak', v: { D00C: 256, D00B: 100, '5010': -667 } }
    ] },

  { id: 'looks', name: 'Color looks', help: 'Six JPG looks. The DNG beside each keeps everything.',
    base: { D004: 1, D193: 26, D191: 15, D195: 22, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D00C: 32769, D00B: 6400, D01A: 3,
      favorites: [FAV.filmStyle, FAV.wb, FAV.expComp, FAV.edr, FAV.iso],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, clip: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Golden', v: { D13E: 3, D092: 1, '5005': 11, D014: 6500, '5010': 333 } },
      { name: 'Faded', v: { D13E: 3, D090: -2, D092: -1, '5010': 333, D1F4: 2 } },
      { name: 'Punchy', v: { D13E: 2, D08D: 1, D08F: 1 } },
      { name: 'Cool', v: { D13E: 1, D08A: 1, '5005': 11, D014: 4200 } },
      { name: 'Cinema', v: { D13E: 3, D090: -1, D092: -1, '5005': 4, '5010': -333, D1F4: 1 } },
      { name: 'True', v: { D13E: 1, '5005': 0 } }
    ] },

  { id: 'cinema', name: 'Cinema', help: 'Film grades with a speed limit for each light. Metering protects highlights.',
    base: { D004: 1, '500B': 32769, D1F4: 1, D193: 26, D191: 3, D195: 15, D077: 1, D1D6: 84, D1D7: 3, D01A: 1,
      favorites: [FAV.wb, FAV.filmStyle, FAV.expComp, FAV.iso, FAV.edr],
      layout: [{ bars: 1, grid: 1, gridFmt: 2 }, { bars: 1, histo: 1 }, { bars: 0, grid: 1 }, { bars: 1, clip: 1 }] },
    profiles: [
      { name: 'Day', v: { D13E: 3, D090: -1, D092: -1, '5005': 11, D014: 5500, D00C: 1792, D00B: 3200, D1F4: 2 } },
      { name: 'Golden', v: { D13E: 3, D092: 1, '5005': 11, D014: 7200, D00C: 32769, D00B: 6400 } },
      { name: 'Dusk', v: { D13E: 3, D090: -1, '5005': 4, '5010': -667, D00C: 1536, D00B: 12500 } },
      { name: 'Neon', v: { D13E: 2, D08F: 1, '5005': 0, '5010': -333, D00C: 1536, D00B: 25000 } },
      { name: 'Interior', v: { D13E: 3, '5005': 11, D014: 4200, D00C: 1536, D00B: 12500 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, D00C: 1536, D00B: 12500 } }
    ] },

  { id: 'street', name: 'Street', help: 'Fast limits for sun, shade, inside and night, plus black and white. Quiet shutter, no review, no touch.',
    base: { '5010': -333, '500B': 2, D0D5: 2, D01A: 0, D32B: 2, D193: 26, D191: 3, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D004: 1,
      favorites: [FAV.drive, FAV.iso, FAV.filmStyle, FAV.expComp, FAV.shutter, FAV.formatCard],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }, { bars: 1, histo: 1, horizon: 1 }] },
    profiles: [
      { name: 'Sunny', v: { D00C: 2304, D00B: 6400 } },
      { name: 'Shade', v: { D00C: 2048, D00B: 12500 } },
      { name: 'Inside', v: { D00C: 1792, D00B: 25000 } },
      { name: 'Night', v: { D00C: 1536, D00B: 25000, '5010': -667 } },
      { name: 'Mono', v: { D00C: 2048, D00B: 12500, D13E: 4, D093: 1 } }
    ] },

  { id: 'portrait', name: 'Portrait', help: 'Softer color for people: outdoors, window, flash, and black and white. The top button magnifies for focus; FN switches.',
    base: { '500B': 1, D01A: 3, D193: 3, D191: 26, D195: 15, D077: 1, D1D6: 84, D1D7: 3, D004: 1, D13E: 3, D090: -1, D092: -1,
      favorites: [FAV.wb, FAV.filmStyle, FAV.expComp, FAV.timer, FAV.flash, FAV.flashComp],
      layout: [{ bars: 1, peak: 1, peakColor: 3 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Outdoor', v: { D00C: 32769, D00B: 6400 } },
      { name: 'Window', v: { D00C: 1792, D00B: 12500, '5010': 333 } },
      { name: 'Flash', v: { D00C: 1792, D00B: 6400, D0D3: 1600, D003: 4, D009: 1, D041: -667 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 6400, D13E: 4, D093: 1 } }
    ] },

  { id: 'landscape', name: 'Landscape', help: 'Tripod at base ISO with a 2 s timer, handheld, brackets, blue hour, black and white. Grid, horizon and histogram on.',
    base: { '500B': 2, D004: 0, D115: 1, D01A: 5, D193: 26, D191: 3, D195: 10, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.bracket, FAV.timer, FAV.interval, FAV.dngSize, FAV.perspective, FAV.edr],
      layout: [{ bars: 1, grid: 1, horizon: 1, histo: 1 }, { bars: 1, histo: 1, clip: 1 }, { bars: 0, grid: 1 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Tripod', v: { D010: 64, D097: 3, D0D5: 1, D198: 1, D32B: 0 } },
      { name: 'Walk', v: { D00C: 32769, D00B: 3200 } },
      { name: 'Bracket', v: { D010: 64, '5013': 8, D006: 5, D007: 1000, D097: 3, D0D5: 1 } },
      { name: 'Blue hour', v: { D00C: 768, D00B: 6400, '5005': 1 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 3200, D13E: 5, D0B0: 1 } }
    ] },

  { id: 'night', name: 'Night', help: 'High ISO for dark streets and street lights, and a tripod for stars. Lights off, screens dimmed.',
    base: { D0C3: 0, D1AA: 0, D01E: 11, D133: 11, D01A: 0, D32B: 2, '500B': 32769, D193: 26, D191: 3, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.iso, FAV.wb, FAV.timer, FAV.shutter, FAV.expComp],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1, peakColor: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Dark', v: { D00C: 32768, D00B: 25000, '5010': -333 } },
      { name: 'Darker', v: { D00C: 1280, D00B: 50000, '5010': -667 } },
      { name: 'Lights', v: { D00C: 1536, D00B: 12500, '5005': 4, '5010': -333 } },
      { name: 'Stars', v: { D010: 3200, D097: 3, D0D5: 1, D198: 0, '5005': 11, D014: 3900, D01E: 10, D133: 10 } }
    ] },

  { id: 'events', name: 'Events', help: 'Silent for ceremonies and speeches, people, flash at the party, details. FN switches; the top button magnifies.',
    base: { '5005': 0, D004: 1, D193: 3, D191: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, D17A: 1,
      favorites: [FAV.shutter, FAV.flash, FAV.flashComp, FAV.drive, FAV.iso, FAV.formatCard],
      layout: [{ bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Quiet', v: { D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0, D00C: 2048, D00B: 12500 } },
      { name: 'People', v: { D00C: 32769, D00B: 6400, D13E: 3, D01A: 1 } },
      { name: 'Party', v: { D0D3: 1600, D003: 4, D009: 1, D041: -667, D00C: 1792, D00B: 6400 } },
      { name: 'Details', v: { D00C: 1792, D00B: 6400, D050: 3, D01A: 3 } },
      { name: 'Speeches', v: { D0D5: 1, D01A: 0, D00C: 1792, D00B: 25000, '5013': 5 } }
    ] },

  { id: 'mono', name: 'Black and white', help: 'Six black and white looks, soft to noir, with color DNGs kept beside them. White focus peaking.',
    base: { D004: 1, D11E: 3, D193: 26, D191: 3, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D00C: 32769, D00B: 6400,
      favorites: [FAV.filmStyle, FAV.expComp, FAV.iso, FAV.format],
      layout: [{ peak: 1, peakColor: 3 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Soft', v: { D13E: 4, D093: -1, '5010': 333 } },
      { name: 'Mono', v: { D13E: 4, D093: 1 } },
      { name: 'Hard', v: { D13E: 5, D0B0: 1 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, '500B': 32769, D00C: 1536 } },
      { name: 'Grain', v: { D13E: 4, D093: 1, D081: 0, D00C: 2048, D00B: 50000 } },
      { name: 'Color', v: { D13E: 1 } }
    ] },

  { id: 'film', name: 'Film habits', help: 'Shoot like film: no review, no touch. Color, black and white, and a pushed roll at a fixed ISO.',
    base: { D01A: 0, D32B: 1, D115: 0, D051: 30, D004: 0, D0C3: 0, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.iso, FAV.filmStyle, FAV.formatCard] },
    profiles: [
      { name: 'Film', v: { D00C: 2048, D00B: 6400 } },
      { name: 'Film Mono', v: { D00C: 2048, D00B: 12500, D13E: 4, D004: 1 } },
      { name: 'Pushed', v: { D010: 3200, D13E: 5, D004: 1 } }
    ] },

  { id: 'travel', name: 'Travel', help: 'Days out, museums, food, nights, and a battery saver.',
    base: { D004: 1, '5005': 0, D193: 26, D191: 3, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.drive, FAV.timer, FAV.wb, FAV.fotos, FAV.power, FAV.formatCard],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1, horizon: 1 }, { bars: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Day', v: { D00C: 32769, D00B: 6400, D1FC: 2 } },
      { name: 'Museum', v: { D00C: 1792, D00B: 25000, D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0 } },
      { name: 'Food', v: { D00C: 1792, D00B: 12500, D13E: 2, D01A: 3 } },
      { name: 'Night', v: { D00C: 32768, D00B: 25000, '5010': -333 } },
      { name: 'Saver', v: { D00C: 32769, D00B: 12500, D1FC: 0, D051: 30, D108: 60, D01A: 0, D01E: 13, D133: 13, D115: 4 } }
    ] },

  { id: 'kids', name: 'Kids and pets', help: 'Fast speeds and bursts, outside and in, and a quiet one for sleeping.',
    base: { D193: 26, D191: 3, D195: 13, D077: 1, D1D6: 84, D1D7: 3, D01A: 0, D0D5: 2, '500B': 2,
      favorites: [FAV.drive, FAV.iso, FAV.expComp, FAV.shutter],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, histo: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Run', v: { D00C: 2560, D00B: 25000, '5013': 7 } },
      { name: 'Play', v: { D00C: 2304, D00B: 12500, '5013': 5 } },
      { name: 'Inside', v: { D00C: 2048, D00B: 25000, '5013': 5 } },
      { name: 'Asleep', v: { D00C: 1536, D00B: 12500, '5013': 0, D0D5: 1 } }
    ] },

  { id: 'factory', name: 'Factory', help: 'Every setting as a new camera has it, in one profile.',
    base: {}, profiles: [{ name: 'User1', v: {} }] }
];
if (typeof module !== 'undefined') module.exports = SETS;
