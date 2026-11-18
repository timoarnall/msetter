// Which settings the app shows, grouped by theme in order of importance, with plain names and one-line help.
// Option names come from the camera itself (rules.js), so they match what the camera shows.
// A row: code (or codeFor(S, slot) when it depends on another setting), name, help, and optional:
//   ladder: options have an order, so the value can be dragged left and right
//   when(S, slot): the setting only matters when this is true
//   only: cameras the row applies to
//   ctl: 'favorites' | 'layouts' | 'text' | 'number' (default: chosen from the rule)
//   short: shorter option names for this row
var CATALOGUE = (function () {
  var STYLE = { 1: ['D08A', 'D08B', 'D08C'], 2: ['D08D', 'D08E', 'D08F'], 3: ['D090', 'D091', 'D092'], 4: ['D093', 'D094', null], 5: ['D0B0', 'D0B1', null] };
  function styleCode(i) { return function (S, slot) { return STYLE[S.D13E[slot]] ? STYLE[S.D13E[slot]][i] : null; }; }

  var themes = [
    { id: 'exposure', title: 'Exposure', note: 'A profile can’t turn the dials or the aperture ring. With the shutter speed and ISO dials on A it sets limits instead: the speed below which ISO rises, and the maximum ISO. Once ISO reaches the maximum, the shutter goes slower than the limit. With the ISO dial on M, and always on the M-EV1, the ISO here is used. Set the aperture yourself, or use an ND filter.', rows: [
      { code: 'D00C', name: 'Shutter speed limit', ladder: true, help: 'The slowest speed before Auto ISO goes up. The 1/f choices follow the lens.' },
      { code: 'D00B', name: 'Maximum ISO', ladder: true, help: 'Auto ISO stops here. In less light the shutter then goes slower than the limit.' },
      { code: 'D010', name: 'ISO', ladder: true, help: 'Auto or one fixed ISO. Used with the ISO dial on M; the M-EV1 has no dial and always uses it.' },
      { code: '5010', name: 'Exposure compensation', ladder: true, help: 'Makes pictures brighter or darker than the meter suggests.' },
      { code: '500B', name: 'Metering', help: 'How the camera measures the light.' },
      { code: 'D115', name: 'Exposure preview', help: 'When the screen shows how bright the picture will be.', short: { 4: 'Half-press' } }
    ] },
    { id: 'buttons', title: 'Buttons', note: 'Each button does one job per profile. Put User Profile on a button, usually the top one, and a press opens the list of user profiles. Turning the thumbwheel or a dial can’t switch profiles. A set gives every button its job in every profile.', rows: [
      { code: 'D193', name: 'Top button', help: 'The small button right of the shutter button.' },
      { code: 'D191', name: 'FN button', help: 'The middle button left of the screen.' },
      { code: 'D195', name: 'Thumbwheel press', help: 'Pressing the wheel under your thumb.' },
      { code: 'D077', name: 'Thumbwheel turn', help: 'What turning the wheel changes.' },
      { code: 'D1D6', name: 'Front lever toward lens', only: ['M-EV1'], help: 'The lever beside the lens, pushed toward it.' },
      { code: 'D1D7', name: 'Front lever away from lens', only: ['M-EV1'], help: 'The lever beside the lens, pushed away from it.' },
      { code: 'D190', name: 'FN button on pictures', help: 'What FN does while you look at pictures.' },
      { code: 'D1A9', name: 'Favorites', ctl: 'favorites', help: 'Your own menu page, up to 11 items. The Menu button shows it second, after the status screen.' }
    ] },
    { id: 'menus', title: 'Favorites and layouts', custom: true, note: 'Drag Favorites and the screen layouts into order. The Menu button shows the status screen, then Favorites. The center button steps through the layouts. The main menu can’t be reordered. A set replaces Favorites or all four layouts in every profile.', rows: [] },
    { id: 'screen', title: 'Screen', note: 'What the screen and viewfinder show while you shoot. A set replaces all four screen layouts in every profile. Order them in Favorites and layouts.', rows: [
      { code: 'D32B', name: 'Touch', help: 'Off (LV mode) turns touch off while you shoot and keeps it for menus and pictures.', short: { 2: 'Off in Live View' } },
      { code: 'D01A', name: 'Picture review', help: 'Shows each picture after you take it.' },
      { code: 'D15E', name: 'Screen layouts', ctl: 'layouts', help: 'Four layouts for the shooting screen, which Leica calls info profiles. The center button steps through them.' },
      { code: 'D020', name: 'Focus aid', help: 'Automatic magnifies the view when you turn the focus ring.' },
      { code: 'D0A2', name: 'Screen or viewfinder', help: 'Where the picture shows. Auto switches with the eye sensor.' },
      { code: 'D134', name: 'Eye sensor', help: 'How readily the eye sensor switches to the viewfinder.' },
      { code: 'D01E', name: 'Screen brightness', ladder: true, help: 'Auto follows the light around you.' },
      { code: 'D133', name: 'Viewfinder brightness', ladder: true, help: 'For the electronic viewfinder or the Visoflex 2.' }
    ] },
    { id: 'look', title: 'Look', note: 'These change JPG files and the picture on the screen. DNG files are not changed. The cameras have five film styles and no hidden ones. Leica Looks are on the Q3 and SL3 only, and Msetter doesn’t set them. For other looks, combine a style with contrast, saturation, sharpness, white balance and extended dynamic range.', rows: [
      { code: '5005', name: 'White balance', help: 'Makes white look white under different light. Cloudy and Shadow make pictures warmer, Tungsten cooler.' },
      { code: 'D014', name: 'Color temperature', ladder: true, when: function (S, s) { return S['5005'][s] === 11; }, help: 'Used when white balance is Color Temperature.' },
      { code: 'D13E', name: 'Film style', help: 'Color and contrast of JPG files.' },
      { codeFor: styleCode(0), name: 'Contrast', ladder: true, help: 'For the film style chosen above.' },
      { codeFor: styleCode(1), name: 'Sharpness', ladder: true, help: 'For the film style chosen above.' },
      { codeFor: styleCode(2), name: 'Saturation', ladder: true, help: 'For the film style chosen above. Black and white styles have none.' },
      { code: 'D1F4', name: 'Extended dynamic range', help: 'Keeps more detail in bright and dark areas.' },
      { code: 'D081', name: 'Noise reduction', ladder: true, help: 'For JPG files. Lower keeps more grain and detail.' }
    ] },
    { id: 'files', title: 'Files', note: 'Format, size and names. File and folder names take letters and numbers only.', rows: [
      { code: 'D004', name: 'File format', help: 'DNG is the raw file. JPG is ready to share.' },
      { code: 'D196', name: 'DNG size', help: 'Smaller files hold fewer pixels.' },
      { code: 'D00F', name: 'JPG size', help: 'Smaller files hold fewer pixels.' },
      { code: 'D017', name: 'Storage', help: 'Where pictures go. IN is the camera’s own memory.' },
      { code: 'D002', name: 'File names start with', ctl: 'text', help: 'Three letters or numbers.' },
      { code: 'D019', name: 'Folder name', ctl: 'text', help: 'Five letters or numbers. The camera puts a number in front, as in 100LEICA.' },
      { code: 'D02F', name: 'Copyright in files', help: 'Writes Artist and Copyright into every picture.' },
      { code: '501E', name: 'Artist', ctl: 'text', help: 'Up to 20 characters.' },
      { code: '501F', name: 'Copyright', ctl: 'text', help: 'Up to 20 characters.' },
      { code: 'D21C', name: 'Content Credentials', help: 'Signs each picture so anyone can check where it came from.' }
    ] },
    { id: 'shooting', title: 'Shooting', note: 'What one press of the shutter does. Bracketing and interval settings apply only when Drive is set to them.', rows: [
      { code: '5013', name: 'Drive', help: 'One picture per press, bursts, intervals or brackets.', short: { 5: 'Burst low', 7: 'Burst high' } },
      { code: 'D0D5', name: 'Shutter', help: 'Electronic is silent. Hybrid adds the electronic shutter for speeds faster than 1/4000.' },
      { code: 'D097', name: 'Self-timer', help: 'Waits before taking the picture.' },
      { code: 'D198', name: 'Long exposure noise reduction', help: 'Takes a second, dark exposure of the same length to remove noise. Doubles the wait.' },
      { code: 'D006', name: 'Bracket size', help: 'How many pictures in a bracket.' },
      { code: 'D007', name: 'Bracketing step', ladder: true, help: 'How far apart the bracketed pictures are.' },
      { code: 'D000', name: 'Interval pictures', ctl: 'number', help: 'How many pictures an interval series takes.' },
      { code: 'D001', name: 'Interval seconds', ctl: 'number', help: 'Time between interval pictures.' },
      { code: 'D050', name: 'Digital zoom', help: 'Crops the picture to look like a longer lens.' },
      { code: 'D197', name: 'Perspective control', help: 'Straightens lines that lean when you tilt the camera.' }
    ] },
    { id: 'flash', title: 'Flash', note: 'Only with a flash on the camera. Then these limits replace the ones in Exposure.', rows: [
      { code: 'D0D3', name: 'Maximum ISO with flash', ladder: true, help: 'Auto ISO limit while a flash is on the camera.' },
      { code: 'D003', name: 'Shutter speed limit with flash', help: 'Slower lets in more of the room light.' },
      { code: 'D041', name: 'Flash compensation', ladder: true, help: 'More or less flash.' },
      { code: 'D009', name: 'Flash timing', help: 'End of exposure puts motion trails behind moving things.' }
    ] },
    { id: 'camera', title: 'Camera', note: 'Power, lights, phone and language. A file can’t set the date, time or the camera’s network name.', rows: [
      { code: 'D108', name: 'Turn off after', ladder: true, help: 'The camera sleeps when you leave it this long.' },
      { code: 'D051', name: 'Screen off after', ladder: true, help: 'The screen goes dark sooner to save battery.' },
      { code: 'D1FC', name: 'Phone connection', help: 'Bluetooth and Wi-Fi for the Leica FOTOS app.' },
      { code: 'D1E6', name: 'Wi-Fi band', help: '5 GHz is faster. 2.4 GHz reaches farther.' },
      { code: 'D17A', name: 'USB charging', help: 'Charges the battery over the USB-C socket.' },
      { code: 'D0C3', name: 'Status light', help: 'The small light on the back.' },
      { code: 'D1AA', name: 'Base light', help: 'The light under the base plate.' },
      { code: 'D340', name: 'Dust protection', help: 'Keeps the sensor covered while you change lenses.' },
      { code: 'D036', name: 'Language', help: 'Menu language.' },
      { code: 'D031', name: 'Date format', help: 'How dates appear.' }
    ] }
  ];

  // Screen layouts (info levels): one row of codes per layout.
  var LAYOUTS = [
    { bars: 'D15E', grid: 'D1A5', gridFmt: 'D01F', clip: 'D139', clipLimit: 'D01D', peak: 'D165', peakColor: 'D11E', peakSens: 'D085', horizon: 'D0C4', histo: 'D13A' },
    { bars: 'D15F', grid: 'D1A6', gridFmt: 'D162', clip: 'D170', clipLimit: 'D173', peak: 'D166', peakColor: 'D19E', peakSens: 'D1A1', horizon: 'D169', histo: 'D16C' },
    { bars: 'D160', grid: 'D1A7', gridFmt: 'D163', clip: 'D171', clipLimit: 'D175', peak: 'D167', peakColor: 'D19F', peakSens: 'D1A2', horizon: 'D16A', histo: 'D16D' },
    { bars: 'D161', grid: 'D1A8', gridFmt: 'D164', clip: 'D172', clipLimit: 'D174', peak: 'D168', peakColor: 'D1A0', peakSens: 'D1A3', horizon: 'D16B', histo: 'D16E' }
  ];

  // Favorites items: the stored number is either a setting code or a small menu number.
  // For each, the setting whose value the Favorites page shows (when there is one).
  var FAVORITE_SETTING = { 5: '5005', 12: 'D00B', 25: 'D0A2', 41: 'D21C', 11: 'D124' };
  function favoriteSetting(item) {
    if (FAVORITE_SETTING[item]) return FAVORITE_SETTING[item];
    if (item > 255) { var h = item.toString(16).toUpperCase(); while (h.length < 4) h = '0' + h; return h; }
    return null;
  }

  // What each button job opens on the camera, as a setting (null: an action or a page of its own).
  var JOB_SETTING = { 4: '5013', 5: 'D097', 9: '500B', 10: '5010', 11: 'D010', 12: 'D00B', 13: 'D00B', 14: 'D00C', 15: '5005',
    18: 'D004', 19: 'D196', 20: 'D00F', 21: 'D050', 22: 'D13E', 23: 'D0D5', 24: 'D009', 25: 'D041', 27: 'D0A2', 29: 'D1FC',
    40: 'D3D2', 86: 'D197', 89: 'D1F4', 122: 'D32B', 6: '5013', 7: 'D006' };

  var SHORT = {  // shorter forms of the camera's names, used everywhere in the app
    D00C: function (t) { return t.replace(/ s$/, ''); }, D003: function (t) { return t.replace(/ s$/, ''); },
    D00B: function (t) { return t.replace(/^ISO /, ''); }, D0D3: function (t) { return t.replace(/^ISO /, ''); },
    D010: function (t) { return t === 'Auto ISO' ? 'Auto' : t.replace(/^ISO /, ''); },
    '5010': ev, D041: ev, D007: function (t) { return t; }
  };
  function ev(t) {
    var m = /^EV ([+-]?\d+)\.5$/.exec(t);
    if (m) { var n = parseInt(m[1], 10); return (n < 0 || m[1] === '-0' ? '−' : '+') + (Math.abs(n) ? Math.abs(n) + ' ' : '') + '1/2'; }
    if (t === '0 EV') return '0';
    return t.replace(/ EV$/, '').replace(/^-/, '−');
  }

  // One line under each choice in a menu, for the choices whose camera name does not say enough.
  var JOB_HELP = {
    1: 'Shows the picture on the screen.', 2: 'Tells the camera which lens is on.',
    3: 'Magnifies the view to focus.', 4: 'Opens single, burst, interval or bracketing.', 5: 'Opens the self-timer choices.',
    6: 'Opens the interval settings.', 7: 'Opens the bracketing settings.', 8: 'Opens the grid, histogram, horizon and peaking settings.',
    9: 'Opens the metering choices.', 10: 'Opens exposure compensation: brighter or darker.', 11: 'Opens the ISO choices.', 12: 'Opens the Auto ISO limits.',
    13: 'Opens the highest ISO that Auto ISO may use.', 14: 'Opens the slowest speed before ISO goes up.', 15: 'Opens the white balance choices.',
    17: 'Measures white balance from a gray card.', 40: 'Fine-tunes white balance.', 18: 'Opens the file format: DNG, JPG or both.', 19: 'Opens the DNG sizes.',
    20: 'Opens the JPG sizes.', 21: 'Crops to look like a longer lens.', 86: 'Straightens lines that lean.',
    122: 'Opens the touch screen choices.', 22: 'Opens the color and black and white looks.', 89: 'Keeps more detail in bright and dark areas.',
    23: 'Opens mechanical, electronic or hybrid.', 24: 'Opens the flash settings.', 25: 'Opens flash compensation: more or less flash.',
    26: 'Opens the list of user profiles.', 27: 'Switches between viewfinder and screen.', 28: 'Erases the card. Asks first.',
    29: 'Connects to the phone app.', 84: 'Outlines sharp edges in color.', 121: 'Moves the focus frame back to the center.'
  };
  var LENS_SPEED = { f: 'One over the lens length: 1/50 with a 50 mm lens. Needs a coded lens or Lens Detection.', f2: 'Twice that: 1/100 with a 50 mm lens. Steadier.', f4: 'Four times that: 1/200 with a 50 mm lens. Freezes movement.' };
  var SLOW = 'Blurs movement. In daylight, needs an ND filter (dark glass on the lens).';  // 1/30 s and slower
  var OPTION_HELP = {
    D00C: { 32768: LENS_SPEED.f, 32769: LENS_SPEED.f2, 32770: LENS_SPEED.f4, 1280: SLOW, 1024: SLOW, 768: SLOW, 512: SLOW, 256: SLOW },
    D003: { 0: LENS_SPEED.f, 1: LENS_SPEED.f2, 2: LENS_SPEED.f4 },
    D077: { 0: 'Turning does nothing.', 1: 'Turning makes pictures brighter or darker.', 2: 'Turning magnifies the view.' },
    '5005': { 0: 'The camera decides.', 1: 'For sun.', 2: 'Warmer. For clouds.', 3: 'Warmer still. For shade.', 4: 'Cooler. For light bulbs.',
      5: 'For film lights.', 6: 'For warm tube lights.', 7: 'For cool tube lights.', 8: 'For flash.', 9: 'Measures from a gray card.', 11: 'Set it in kelvin.' }
  };
  var JOB_CODES = { D193: 1, D191: 1, D195: 1, D1D6: 1, D1D7: 1 };
  // Long job lists, grouped by what the job does to the picture, likely ones first. Rare ones (formatting the card) and Off last.
  var JOB_GROUPS = [
    { name: 'Most used', jobs: [26, 3, 10, 11, 15] },
    { name: 'Focus and view', jobs: [84, 1, 21, 27, 8, 121] },
    { name: 'Brightness and ISO', jobs: [13, 14, 12, 9, 7] },
    { name: 'Color and look', jobs: [22, 40, 17, 89] },
    { name: 'Shooting', jobs: [4, 5, 6, 23, 86, 2] },
    { name: 'Flash', jobs: [24, 25] },
    { name: 'Camera', jobs: [122, 29] },
    { name: 'Files and card', jobs: [18, 19, 20, 28] },
    { name: 'Off', jobs: [0] }
  ];
  function jobGroups(code) { return JOB_CODES[code] ? JOB_GROUPS : null; }
  // Favorites items, grouped the same way for the Add menu.
  var FAV_GROUPS = [
    { name: 'Brightness and ISO', items: [20496, 53264, 12, 20491, 14] },
    { name: 'Focus and view', items: [53280, 9, 53328, 25, 29, 54059, 53655] },
    { name: 'Color and look', items: [5, 53566, 24, 6, 53748, 53656] },
    { name: 'Shooting', items: [20499, 53399, 1, 53461, 13, 53274] },
    { name: 'Flash', items: [3, 53313] },
    { name: 'Files and card', items: [53252, 53654, 53271, 53250, 41, 8] },
    { name: 'Camera', items: [11, 17, 28, 30, 31, 53536, 15, 53302, 54080, 21, 16] }
  ];
  function optionHelp(code, v) {
    if (JOB_CODES[code]) return JOB_HELP[v] || '';
    return (OPTION_HELP[code] && OPTION_HELP[code][v]) || '';
  }

  return { themes: themes, LAYOUTS: LAYOUTS, favoriteSetting: favoriteSetting, JOB_SETTING: JOB_SETTING, SHORT: SHORT, STYLE: STYLE, optionHelp: optionHelp, jobGroups: jobGroups, FAV_GROUPS: FAV_GROUPS };
})();
if (typeof module !== 'undefined') module.exports = CATALOGUE;
