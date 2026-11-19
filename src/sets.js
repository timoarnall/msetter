// Starting sets: groups of profiles for one kind of shooting.
// base applies to every profile in the set; each profile then sets its own values.
// Values are stored values (see rules.js). Names are 3 to 10 characters, as the camera requires.
// Layout values use the keys of CATALOGUE.LAYOUTS with an index: e.g. layout: [{ grid: 1, horizon: 1 }] sets layout 1
// to grid and horizon, and turns its other parts (info bars, histogram, clipping, peaking) off.
// favorites: the Favorites page, in order (item numbers from rules.js, D1A9; at most 11).
// Every set with more than one profile puts User Profile on the top button, so the profiles are one press apart.
// FN is left on its factory job: Live View on the M11 bodies, the viewfinder and screen switch on the M-EV1.
// A profile here is a decision a photographer would make before going out (a second camera, a film, a speed, a way of
// seeing), never a scene mode for the weather: Auto ISO already follows sun and shade. What working photographers do
// with these cameras (review off, short Favorites, Format Storage left out, peaking Low and red) holds in every set.
var FAV = { drive: 20499, timer: 53399, interval: 1, bracket: 14, metering: 20491, expComp: 20496, iso: 53264, autoIso: 12, wb: 5,
  grayCard: 24, format: 53252, dngSize: 53654, filmStyle: 53566, edr: 53748, review: 53274, shutter: 53461, flash: 3, flashComp: 53313,
  zoom: 53328, perspective: 53655, touch: 54059, profile: 11, evfLcd: 25, fotos: 53536, formatCard: 8, assistants: 9, focusAid: 53280, power: 31, lens: 13, dateTime: 15,
  jpgSettings: 6, noise: 53656, toning: 40 };

var SETS = [
  // Each profile stands in for a camera a photographer used to carry beside the first (Meyerowitz carried one Leica with
  // color film and one with black and white). Replaces the light ladder Sunny to Night, which only did Auto ISO's job.
  { id: 'everyday', name: 'Everyday', help: 'Each profile stands in for another camera you would otherwise carry: color, black and white, flash, low light and a tripod. Auto ISO already follows the light from sun to shade, so no profile is needed for the weather.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D020: 1, D00C: 32769, D00B: 12500,
      favorites: [FAV.lens, FAV.filmStyle, FAV.expComp, FAV.timer, FAV.flashComp],
      layout: [{ bars: 1 }, { bars: 1, peak: 1 }, { bars: 1, histo: 1, clip: 1 }, { bars: 1, grid: 1, horizon: 1 }] },
    profiles: [
      { name: 'Color', v: { D13E: 3 } },
      { name: 'Mono', v: { D13E: 5, D0B0: 1 } },
      { name: 'Flash', v: { D009: 1, D003: 4, D041: -1000, D0D3: 3200 } },          // fill flash a stop under, at the end of the exposure
      { name: 'Low light', v: { D00C: 32768, D00B: 50000, '5010': -333 } },
      { name: 'Tripod', v: { D00C: 256, D00B: 64, D010: 64, D097: 3, D0D5: 1, D198: 1, D32B: 0 } }
    ] },

  // The limit is the slowest speed before ISO rises, so the fast profiles work in any light and the slow ones blur only
  // in dim light or behind an ND filter.
  { id: 'motion', name: 'Motion', help: 'Each profile sets how movement looks, from frozen at 1/2000 to streaked at half a second. The slow ones blur only in dim light or behind an ND filter (dark glass on the lens).',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D020: 1,
      favorites: [FAV.lens, FAV.drive, FAV.expComp, FAV.shutter, FAV.timer],
      layout: [{ bars: 1, histo: 1 }, { bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Freeze', v: { D00C: 2816, D00B: 50000, '5013': 7 } },
      { name: 'Crisp', v: { D00C: 2304, D00B: 12500 } },
      { name: 'Walk', v: { D00C: 1536, D00B: 6400 } },
      { name: 'Pan', v: { D00C: 1280, D00B: 800, '5013': 5 } },
      { name: 'Drag', v: { D00C: 1024, D00B: 400, '5010': -333 } },
      { name: 'Streak', v: { D00C: 256, D00B: 100, '5010': -667 } }
    ] },

  // Color fixed the way slide film fixed it: a white balance chosen for the light, an exposure chosen for the color.
  // Tungsten in daylight is one photographer's whole look (Iwakura); Slide is the Kodachrome habit of exposing for the
  // highlights (Webb, Haas).
  { id: 'looks', name: 'Color looks', help: 'Auto white balance removes the color of the light; these profiles fix the white balance and the exposure for the color they want. Every picture also saves a DNG, and the M11 Monochrom has no color to set.',
    base: { D004: 1, D193: 26, D195: 22, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D00C: 32769, D00B: 6400,
      favorites: [FAV.lens, FAV.filmStyle, FAV.wb, FAV.expComp, FAV.edr],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, clip: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Golden', v: { D13E: 3, D092: 1, '5005': 11, D014: 6500, '5010': 333 } },
      { name: 'Pastel', v: { D13E: 3, D090: -2, D092: -1, '5010': 667, D1F4: 2 } },
      { name: 'Slide', v: { D13E: 2, D08D: 1, D08F: 1, '5005': 1, '500B': 32769, '5010': -667 } },
      { name: 'Cool', v: { D13E: 1, D08A: 1, '5005': 11, D014: 4200 } },
      { name: 'Daylight', v: { D13E: 3, '5005': 1 } },
      { name: 'Tungsten', v: { D13E: 3, '5005': 4 } }
    ] },

  // Pictures the eye can't see. A one-second review stays on here, the one set where seeing each frame is the method.
  { id: 'experimental', name: 'Experimental', help: 'These profiles make pictures the eye can’t see: camera movement, blur in bursts, a flash over blur, light painting, a bent electronic shutter and a timelapse. Set the shutter dial to 1/8 for the blurs and to B for light painting.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D01A: 1, D020: 1,
      favorites: [FAV.lens, FAV.drive, FAV.timer, FAV.interval, FAV.flashComp],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, clip: 1 }, { bars: 1, grid: 1, horizon: 1 }] },
    profiles: [
      { name: 'ICM', v: { D00C: 512, D00B: 100, '5013': 5, '5010': -333 } },
      { name: 'Movement', v: { D00C: 768, D00B: 6400, '5013': 7 } },
      { name: 'Ghost', v: { D00C: 768, D00B: 800, D009: 1, D041: -667, D003: 7 } },
      { name: 'LightPaint', v: { D010: 64, D00B: 64, D097: 3, D01A: -1, D0D5: 0 } },
      { name: 'Bend', v: { D0D5: 1, D00C: 2816, D00B: 50000, '5013': 7 } },  // the electronic shutter's line-by-line readout bends fast movement
      { name: 'Timelapse', v: { '5013': 2, D000: 300, D001: 5, D00B: 6400, D0D5: 1, D01A: 0 } }
    ] },

  // Buildings: a tripod at the lowest ISO, straightened verticals, brackets for windows, and one profile that lets them
  // lean. No screen layouts here: the Tripod layouts on the Screen page add the grid and horizon.
  { id: 'architecture', name: 'Architecture', help: 'These profiles photograph buildings from a tripod at the lowest ISO, and straighten the verticals or let them lean on purpose. The Tripod layouts on the Screen page add a grid and horizon.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D020: 1,
      favorites: [FAV.lens, FAV.perspective, FAV.timer, FAV.bracket, FAV.shutter] },
    profiles: [
      { name: 'Tripod', v: { D010: 64, D00B: 64, D00C: 256, D097: 3, D0D5: 1, D198: 1 } },   // ISO 64, 2 s timer, silent shutter, noise reduction after long exposures
      { name: 'Verticals', v: { D197: 1, D00C: 32769, D00B: 6400 } },                        // perspective control on
      { name: 'Bracket', v: { D010: 64, D00B: 64, '5013': 8, D006: 5, D007: 1000, D097: 3, D0D5: 1 } },
      { name: 'Interior', v: { D197: 1, D00C: 32768, D00B: 12500, '5005': 0 } },
      { name: 'Looking up', v: { D197: 0, D13E: 5, D0B0: 1, D00C: 32769, D00B: 6400 } }     // perspective control off: steep angles stay steep
    ] },

  // The owner's own ladder (FAST, MEDIUM, SLOW, SLOOOW): each step down trades grain for blur. Was Day and night, two
  // profiles that only did Auto ISO's job; the id stays so the save proof and the flows keep their place.
  { id: 'daynight', name: 'Speed ladder', help: 'Each step down lets the shutter go slower before ISO rises, and lets ISO rise less. Fast keeps pictures sharp and grainy, and Slooow lets them blur and stay clean.',
    base: { D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3, '500B': 2, D004: 1, D020: 1,
      favorites: [FAV.lens, FAV.filmStyle, FAV.expComp, FAV.timer],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1 }, { bars: 0 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Fast', v: { D00C: 32770, D00B: 50000 } },
      { name: 'Medium', v: { D00C: 32769, D00B: 12500 } },
      { name: 'Slow', v: { D00C: 32768, D00B: 3200 } },
      { name: 'Slooow', v: { D00C: 768, D00B: 400 } }
    ] },

  // Tricks from cinematography: a daylight stock, bleach bypass, day for night, neon, lamps, noir.
  { id: 'cinema', name: 'Cinema', help: 'Each profile uses a trick from cinematography, such as a daylight film stock, day for night or bleach bypass. Metering keeps the highlights, and Noir is black and white.',
    base: { D004: 1, '500B': 32769, D1F4: 1, D193: 26, D195: 15, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.wb, FAV.filmStyle, FAV.expComp, FAV.edr],
      layout: [{ bars: 1, grid: 1, gridFmt: 2 }, { bars: 1, histo: 1 }, { bars: 0, grid: 1 }, { bars: 1, clip: 1 }] },
    profiles: [
      { name: '5500K', v: { D13E: 3, D090: -1, D092: -1, '5005': 11, D014: 5500, D00C: 1792, D00B: 6400 } },
      { name: 'Bleach', v: { D13E: 3, D090: 2, D092: -2, '5010': -333, D00C: 1792, D00B: 6400 } },
      { name: 'Fake night', v: { D13E: 3, D092: -1, '5005': 4, '5010': -2000, D00C: 1792, D00B: 3200 } },   // day for night
      { name: 'Neon', v: { D13E: 2, D08F: 1, '5005': 0, '5010': -333, D00C: 1536, D00B: 25000 } },
      { name: 'Interior', v: { D13E: 3, '5005': 11, D014: 4200, D00C: 1536, D00B: 12500 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, D00C: 1536, D00B: 12500 } }
    ] },

  // Ways of working the street, not the weather: zone focusing at f/8, color exposed for the highlights, daylight flash,
  // night, pushed black and white. Focus aid Manual, so turning the ring for a zone never magnifies.
  { id: 'street', name: 'Street', help: 'Each profile follows one way of working the street: zone focusing at f/8, color in hard light, daylight flash, night and grainy black and white. Metering keeps the highlights, and no picture shows after you take it.',
    base: { '5010': -333, '500B': 32769, D0D5: 2, D01A: 0, D32B: 2, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D004: 1, D020: 0,
      favorites: [FAV.lens, FAV.filmStyle, FAV.expComp, FAV.shutter],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, grid: 1 }, { bars: 1, histo: 1, horizon: 1 }] },
    profiles: [
      { name: 'Zone', v: { D00C: 2304, D00B: 12500 } },
      { name: 'Hard light', v: { D13E: 2, D08D: 1, '5005': 1, '5010': -1000 } },
      { name: 'Flash', v: { D009: 0, D003: 3, D041: -333, D0D3: 1600, D00C: 2048, D00B: 6400 } },
      { name: 'Night', v: { D00C: 1536, D00B: 25000, '5010': -667 } },
      { name: 'Pushed', v: { D00C: 2048, D00B: 25000, D13E: 5, D0B0: 1, D081: 0 } }
    ] },

  // A film camera's discipline: the shutter dial on 1/250, the ISO dial on M, a profile chosen like a film, daylight
  // white balance as film had, aperture set by the light. No preview, no review, the wheel turn off so a bump can't
  // change anything.
  { id: 'fixed', name: 'One speed', help: 'Leave the shutter dial on 1/250 and the ISO dial on M, and choose a profile the way you would load a film. You set the aperture by the light, and the screen shows no preview and no review.',
    base: { D01A: 0, D32B: 1, D115: 0, D051: 30, D004: 1, D0C3: 0, D193: 26, D195: 11, D077: 0, D1D6: 84, D1D7: 3, D020: 0, '5005': 1, D00C: 2048,
      favorites: [FAV.lens, FAV.iso, FAV.wb, FAV.filmStyle],
      layout: [{ bars: 1 }, { bars: 0 }, { bars: 1, histo: 1 }, { bars: 1, grid: 1 }] },
    profiles: [
      { name: 'Sunny 16', v: { D010: 100 } },
      { name: 'Box speed', v: { D010: 400 } },
      { name: 'Lamplight', v: { D010: 1600, '5005': 4 } },
      { name: 'Night', v: { D010: 6400 } },
      { name: 'Push 3200', v: { D010: 3200, D13E: 5, D0B0: 1, D081: 0 } }
    ] },

  // Light for faces, and a press of the thumbwheel to magnify on the eyes (Perfido, Penman). 1/125 for people (Nishida).
  { id: 'portrait', name: 'Portrait', help: 'Each profile is a light for faces: open shade, a window, fill flash, black and white, and a fast lens wide open in sun. Pressing the thumbwheel magnifies to check the eyes.',
    base: { '500B': 1, D193: 26, D195: 3, D077: 1, D1D6: 84, D1D7: 3, D004: 1, D13E: 3, D090: -1, D092: -1, D020: 0,
      favorites: [FAV.lens, FAV.filmStyle, FAV.wb, FAV.expComp, FAV.flashComp],
      layout: [{ bars: 1, peak: 1, peakColor: 3 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Open shade', v: { D00C: 32769, D00B: 6400, '5005': 3 } },
      { name: 'Window', v: { D00C: 1792, D00B: 12500, '5010': 333 } },
      { name: 'Flash', v: { D00C: 1792, D00B: 6400, D0D3: 1600, D003: 4, D009: 1, D041: -667 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 6400, D13E: 4, D093: -1 } },
      { name: 'Wide open', v: { D0D5: 1, D00C: 32770, D00B: 800 } }   // the electronic shutter reaches 1/16000 and is silent
    ] },

  // Raw files only, the tripod at base ISO, and handheld at 1/(4f), the speed 60 MP needs.
  { id: 'landscape', name: 'Landscape', help: 'Use the tripod profiles at the lowest ISO with the ISO dial on M, and Handheld when 60 MP needs a fast shutter. The first screen shows grid, horizon and histogram.',
    base: { '500B': 2, D004: 0, D115: 1, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.timer, FAV.bracket, FAV.dngSize, FAV.edr],
      layout: [{ bars: 1, grid: 1, horizon: 1, histo: 1 }, { bars: 1, histo: 1, clip: 1 }, { bars: 0, grid: 1 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Tripod', v: { D010: 64, D00B: 64, D00C: 256, D097: 3, D0D5: 1, D198: 1, D32B: 0 } },
      { name: 'Handheld', v: { D00C: 32770, D00B: 6400 } },
      { name: 'Bracket', v: { D010: 64, D00B: 64, '5013': 8, D006: 5, D007: 1000, D097: 3, D0D5: 1 } },
      { name: 'Blue hour', v: { D00C: 768, D00B: 6400, '5005': 1 } },
      { name: 'Mono', v: { D00C: 32769, D00B: 3200, D13E: 5, D0B0: 1, D004: 1 } }
    ] },

  // Night pictures that stay dark. Dark takes grain to stay sharp; Blur takes blur to stay clean (Nishida's 1/30 at night).
  // The first profile stays DARK, below the top ISO, and the set four profiles: the flows rename it, raise its ISO
  // with the arrow key and add to the set.
  { id: 'night', name: 'Night', help: 'Dark lets ISO climb to stay sharp, Blur holds ISO down and lets the shutter slow, Lights sets the color for lamps, and Stars needs a tripod with the ISO dial on M. The camera’s lights are off and its screens dimmed.',
    base: { D0C3: 0, D1AA: 0, D01E: 11, D133: 11, D01A: 0, D32B: 2, '500B': 32769, D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.wb, FAV.expComp, FAV.timer, FAV.shutter],
      layout: [{ bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1, peakColor: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Dark', v: { D00C: 32768, D00B: 25000, '5010': -667 } },
      { name: 'Blur', v: { D00C: 1280, D00B: 3200, '5010': -667 } },
      { name: 'Lights', v: { D00C: 1536, D00B: 12500, '5005': 4, '5010': -333 } },
      { name: 'Stars', v: { D010: 3200, D097: 3, D0D5: 1, D198: 0, '5005': 11, D014: 3900, D01E: 10, D133: 10 } }
    ] },

  // Weddings and talks: silent for vows and speeches, flash dragged on the dance floor, a crop for details.
  { id: 'events', name: 'Events', help: 'The silent shutter covers vows and speeches, flash lights the dance floor, and a crop frames the details. Pressing the thumbwheel magnifies to check focus.',
    base: { '5005': 0, D004: 1, D193: 26, D195: 3, D077: 1, D1D6: 84, D1D7: 3, D17A: 1,
      favorites: [FAV.lens, FAV.shutter, FAV.flashComp, FAV.drive],
      layout: [{ bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }, { bars: 1, peak: 1 }] },
    profiles: [
      { name: 'Ceremony', v: { D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0, D00C: 1792, D00B: 25000 } },
      { name: 'People', v: { D00C: 32769, D00B: 6400, D13E: 3 } },
      { name: 'Dance', v: { D0D3: 3200, D003: 6, D009: 1, D041: -667, D00C: 1792, D00B: 6400 } },   // flash at the end of 1/15
      { name: 'Details', v: { D00C: 1792, D00B: 6400, D050: 3 } },
      { name: 'Speeches', v: { D0D5: 1, D01A: 0, D00C: 2048, D00B: 25000, '5013': 5 } }
    ] },

  // Black and white chosen before the picture: the screen and viewfinder show it. Red peaking, which shows best on a gray
  // picture (Chudley). No color saves JPG only, as a Monochrom has no color at all.
  { id: 'mono', name: 'Black and white', help: 'Each profile shows the picture in black and white on the screen and in the viewfinder, so you judge light by its tones. Every profile but No color also saves a color DNG.',
    base: { D004: 1, D193: 26, D195: 10, D077: 1, D1D6: 84, D1D7: 3, D00C: 32769, D00B: 6400,
      favorites: [FAV.lens, FAV.filmStyle, FAV.expComp, FAV.format],
      layout: [{ bars: 1, peak: 1, peakColor: 0 }, { bars: 1 }, { bars: 1, histo: 1 }, { bars: 0 }] },
    profiles: [
      { name: 'Soft', v: { D13E: 4, D093: -1, '5010': 333 } },
      { name: 'Tones', v: { D13E: 4, D093: 1 } },
      { name: 'Hard', v: { D13E: 5, D0B0: 1 } },
      { name: 'Noir', v: { D13E: 5, D0B0: 2, '5010': -667, '500B': 32769, D00C: 1536 } },
      { name: 'Rough', v: { D13E: 5, D0B0: 2, D081: 0, D00C: 1280, D00B: 50000 } },   // grain and blur on purpose
      { name: 'No color', v: { D13E: 5, D0B0: 1, D004: 2 } }
    ] },

  // One camera for a trip. Saver went: its battery settings are on the Camera page, which a library profile doesn't bring.
  { id: 'travel', name: 'Travel', help: 'These profiles cover a day on foot, quiet rooms, meals, train windows and evenings out. Favorites holds the date and time for new time zones and Leica FOTOS for the phone.',
    base: { D004: 1, '5005': 0, D193: 26, D195: 13, D077: 1, D1D6: 84, D1D7: 3,
      favorites: [FAV.lens, FAV.dateTime, FAV.fotos, FAV.timer, FAV.power],
      layout: [{ bars: 1, histo: 1 }, { bars: 1, grid: 1, horizon: 1 }, { bars: 0 }, { bars: 1 }] },
    profiles: [
      { name: 'Day', v: { D00C: 32769, D00B: 6400, D1FC: 2, D13E: 3 } },
      { name: 'Museum', v: { D00C: 1792, D00B: 25000, D0D5: 1, D01A: 0, D0C3: 0, D1AA: 0 } },
      { name: 'Table', v: { D00C: 1792, D00B: 12500, D13E: 2, '5010': 333 } },
      { name: 'Night', v: { D00C: 32768, D00B: 25000, '5010': -333 } },
      { name: 'Train', v: { D00C: 2560, D00B: 12500 } }
    ] },

  { id: 'kids', name: 'Kids and pets', help: 'Fast speeds and bursts keep running children and dogs sharp, and the silent shutter lets them sleep.',
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
    base: {}, profiles: [{ name: 'User1', v: {} }] }
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
  { kind: 'buttons', id: 'rangefinder', name: 'Rangefinder', help: 'The top button magnifies and the wheel press sets ISO.',
    v: { D193: 3, D191: 1, D195: 11, D077: 0, D1D6: 0, D1D7: 0 }, bodies: { 'M-EV1': { D191: 27 } } },
  { kind: 'buttons', id: 'wheel', name: 'Exposure on the wheel', help: 'The wheel sets brightness and FN the shutter speed limit.',
    v: { D193: 4, D191: 14, D195: 13, D077: 1, D1D6: 3, D1D7: 84 } },
  { kind: 'buttons', id: 'fnprofiles', name: 'Profiles on FN', help: 'FN switches profiles and the top button keeps Focus Aid.',
    v: { D193: 3, D191: 26, D195: 10, D077: 0, D1D6: 3, D1D7: 0 } },

  { kind: 'favorites', id: 'empty', name: 'Empty', help: 'Menu goes straight to the main menu.',
    v: { favorites: [] } },
  { kind: 'favorites', id: 'jpg', name: 'JPG look', help: 'Film style comes first, then the JPG settings and file sizes.',
    v: { favorites: [FAV.filmStyle, FAV.jpgSettings, FAV.edr, FAV.dngSize, FAV.format] },
    bodies: { 'M11 Monochrom': { favorites: [FAV.jpgSettings, FAV.toning, FAV.dngSize, FAV.format] } } },
  { kind: 'favorites', id: 'tripodfav', name: 'Tripod', help: 'Holds the self-timer, silent shutter, straightening and brackets.',
    v: { favorites: [FAV.timer, FAV.shutter, FAV.perspective, FAV.noise, FAV.bracket] } },

  { kind: 'layouts', id: 'clean', name: 'Clean', help: 'Exposure numbers only; one press adds red peaking.',
    v: { layout: screens([{ bars: 1 }, { bars: 1, peak: 1 }, {}, {}]) } },
  { kind: 'layouts', id: 'check', name: 'Focus and check', help: 'The center button steps from clear view to peaking to histogram.',
    v: { layout: screens([{ bars: 1 }, { bars: 1, peak: 1 }, { bars: 1, histo: 1, clip: 1 }, {}]) } },
  { kind: 'layouts', id: 'tripodlay', name: 'Tripod', help: 'Grid and horizon come first, then histogram and clipping, then peaking.',
    v: { layout: screens([{ bars: 1, grid: 1, horizon: 1 }, { histo: 1, clip: 1, horizon: 1 }, { bars: 1, peak: 1 }, {}]) } }
];
if (typeof module !== 'undefined') { module.exports = SETS; module.exports.PARTS = PART_SETS; }
