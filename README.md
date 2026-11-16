# Msetter

Msetter is a free app for setting up a Leica M from a computer or phone instead of the camera's menus. You design the camera's user profiles side by side, choose what each button does, put the Favorites menu and the screen layouts in order, and save one settings file for each of your cameras. The camera loads it from its memory card in one step. **Everything stays in your browser:** files you open and settings you make never leave your computer or phone, and I never see them. Works on the M11, M11-P, M11 Monochrom and M-EV1.

**[Read the project page](https://timoarnall.github.io/msetter/)** or **[try the app](https://timoarnall.github.io/msetter/app/)**.

<a href="https://timoarnall.github.io/msetter/"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="site/images/hero-dark.jpg">
  <img alt="User profiles with different color looks side by side, the camera drawing with its buttons, and the camera screen showing the Golden look" src="site/images/hero-light.jpg">
</picture></a>

### Why

**Typing on a camera is painful.** Profile names, copyright and file names are spelled out one letter at a time with the arrow pad.

**Menus are deep and small.** Every setting sits a few levels down a menu built for a three-inch screen, reached with a few buttons and a wheel. A new camera takes hours to set up.

**Each profile needs the same change.** A setting you want everywhere has to be changed in every user profile, one at a time.

**The Leica FOTOS app doesn't fix it.** It can change some settings from your phone, but it is still slow, one setting at a time, with little way to organise your user profiles, menus or buttons.

**Two cameras drift apart.** An M11-P and an M-EV1 have slightly different menus and options. Keeping them alike means going through every menu on both.

**Profiles can't be compared.** The camera shows one user profile at a time, so you can't see what makes Fast different from Slow.

**There is no undo.** A stray press changes a profile and nothing tells you.

**A reset starts you from scratch.** After a reset, a repair or a firmware update your setup is gone unless you remember it.

### What it does

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="site/images/in-action-dark.gif">
  <img alt="The app in use: picking the Color looks set, stepping through the profiles on the camera screen, choosing a job for the FN button and dragging a Favorite into place" src="site/images/in-action-light.gif">
</picture>

**Your user profiles sit side by side**, one column each, with a row for every setting. A setting that is the same in every profile shows once, so one change reaches them all.

**The camera is drawn with its buttons and the ones you can set are red.** Click one to choose its job from a short list grouped by what it does, or to see what it does on the camera's screen.

**The camera's screen shows how each profile looks**, using a photo with the profile's white balance, film style, exposure and screen layout, so you can compare Golden with Cinema before you shoot.

**You drag the Favorites menu and the four screen layouts into order**, the order they appear in on the camera.

**Each of your cameras gets its own file.** A value one body doesn't have is swapped for the nearest one it does, and the app lists every swap.

**Every setting has a plain name and one line on what it does**, and each page says what a settings file can't change.

**Everything can be undone.** Changed values are marked, and Save lists every change before it writes the file.

**Nothing leaves your browser.** Msetter has no server, no account and no tracking. A file you open is read by your browser, not uploaded, and your design is kept in your browser on that device so it is there next time. I never see anything you open or make. The Mac app works the same way and writes the file straight to the camera's card.

### Starting sets

A set is a group of user profiles, Leica's name for the saved settings you switch between, made for one kind of photography. Each set also chooses the button jobs, the Favorites menu and the screen layouts. Pick one in the app, then change anything.

**One press switches profiles.** Put User Profile on a button, usually the top one, and each press moves to the next profile: Fast → Medium → Slow → Sloow → Fast. Every set does this, and FN keeps its factory job.

**Profiles set limits.** With the shutter speed and ISO dials on A, a profile can't fix the shutter speed or the ISO. It sets a speed limit and a maximum ISO, and the camera chooses within them. Below are the four profiles of the Speed ladder.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="site/images/limits-dark.svg">
  <img alt="The Speed ladder set. Fast: speed limit 1/1000, maximum ISO 6400. Medium: 1/250 and 6400. Slow: 1/(4f) and 3200. Sloow: 1/(4f) and 64, so the shutter goes slower instead, for a tripod." src="site/images/limits-light.svg" width="820">
</picture>

Fast keeps the shutter at 1/1000 or faster and lets ISO climb to 6400; once ISO is at 6400, the shutter goes slower than the limit. Sloow allows only ISO 64, so in low light the shutter goes slower straight away: a profile for a tripod. 1/(4f) follows the lens and is drawn for a 50 mm lens, about 1/200. With the ISO dial on M, or on the M-EV1, a profile sets the ISO itself. The aperture is always yours, or use an ND filter.

<!-- sets:start -->
**Speed ladder.** Shutter and ISO limits for less and less light. The top button steps through them.

| User profile | Speed limit | Max ISO | White balance |
|---|---|---|---|
| Fast | 1/1000 | 6400 | Daylight |
| Medium | 1/250 | 6400 | Auto |
| Slow | 1/(4f) | 3200 | Auto |
| Sloow | 1/(4f) | 64 | Auto |

**Day and night.** Just two user profiles, one for daylight and one for the dark. The top button switches.

| User profile | Speed limit | Max ISO | Exposure |
|---|---|---|---|
| Day | 1/500 | 6400 | 0 |
| Night | 1/60 | 25000 | −1/3 |

**Everyday.** Sun to a tripod at night: limits and white balance for each light. The top button switches, the thumbwheel sets brightness.

| User profile | Speed limit | Max ISO | White balance | Exposure |
|---|---|---|---|---|
| Sunny | 1/1000 | 3200 | Daylight | 0 |
| Shade | 1/250 | 6400 | Shadow | 0 |
| Indoors | 1/125 | 12500 | Auto | 0 |
| Evening | 1/(2f) | 12500 | Auto | −1/3 |
| Night | 1/f | 25000 | Auto | −2/3 |
| Tripod | 1/2 | 100 | Auto | 0 |

**Motion.** Shutter speed as the look, from frozen to streaked. Low ISO limits force slow speeds, so Drag and Streak blur.

| User profile | Speed limit | Max ISO | Drive | Exposure |
|---|---|---|---|---|
| Freeze | 1/2000 | 50000 | Fast burst | 0 |
| Crisp | 1/500 | 12500 | Single | 0 |
| Walk | 1/60 | 6400 | Single | 0 |
| Pan | 1/30 | 800 | Slow burst | 0 |
| Drag | 1/15 | 400 | Single | −1/3 |
| Streak | 1/2 | 100 | Single | −2/3 |

**Color looks.** JPG looks, from golden to cinema. The DNG beside each keeps everything.

| User profile | White balance | Film style | Exposure |
|---|---|---|---|
| Golden | 6500 K | Natural | +1/3 |
| Faded | Auto | Natural | +1/3 |
| Punchy | Auto | Vivid | 0 |
| Cool | 4200 K | Standard | 0 |
| Cinema | Tungsten | Natural | −1/3 |
| True | Auto | Standard | 0 |

**Cinema.** Film grades with a speed limit for each light. Metering protects highlights.

| User profile | Speed limit | Max ISO | White balance | Film style |
|---|---|---|---|---|
| Day | 1/125 | 3200 | 5500 K | Natural |
| Golden | 1/(2f) | 6400 | 7200 K | Natural |
| Dusk | 1/60 | 12500 | Tungsten | Natural |
| Neon | 1/60 | 25000 | Auto | Vivid |
| Interior | 1/60 | 12500 | 4200 K | Natural |
| Noir | 1/60 | 12500 | Auto | Monochrome High Contrast |

**Street.** Fast limits for sun, shade, inside and night, plus black and white. Metering keeps the highlights. No review, no touch.

| User profile | Speed limit | Max ISO | Film style | Exposure |
|---|---|---|---|---|
| Sunny | 1/500 | 6400 | Standard | −1/3 |
| Shade | 1/250 | 12500 | Standard | −1/3 |
| Inside | 1/125 | 25000 | Standard | −1/3 |
| Night | 1/60 | 25000 | Standard | −2/3 |
| Mono | 1/250 | 12500 | Monochrome | −1/3 |

**One speed.** The shutter dial stays on one speed, often 1/250, and each profile fixes the ISO and white balance for its light. No review, no touch, as with film. On a camera with an ISO dial, set it to M.

| User profile | ISO | White balance | Film style |
|---|---|---|---|
| Sun | 200 | Daylight | Standard |
| Shade | 400 | Shadow | Standard |
| Inside | 3200 | Auto | Standard |
| Night | 6400 | Auto | Standard |
| Pushed | 3200 | Auto | Monochrome High Contrast |

**Portrait.** Softer color for people: outdoors, window, flash, and black and white. Pressing the thumbwheel magnifies for focus.

| User profile | Speed limit | Max ISO | Film style | Exposure |
|---|---|---|---|---|
| Outdoor | 1/(2f) | 6400 | Natural | 0 |
| Window | 1/125 | 12500 | Natural | +1/3 |
| Flash | 1/125 | 6400 | Natural | 0 |
| Mono | 1/(2f) | 6400 | Monochrome | 0 |

**Landscape.** Tripod at base ISO with a 2 s timer, handheld, brackets, blue hour, black and white. Grid, horizon and histogram on.

| User profile | Speed limit | Max ISO | ISO | White balance |
|---|---|---|---|---|
| Tripod | 1/(4f) | 3200 | 64 | Auto |
| Walk | 1/(2f) | 3200 | Auto | Auto |
| Bracket | 1/(4f) | 3200 | 64 | Auto |
| Blue hour | 1/8 | 6400 | Auto | Daylight |
| Mono | 1/(2f) | 3200 | Auto | Auto |

**Night.** High ISO for dark streets and street lights, and a tripod for stars. Lights off, screens dimmed.

| User profile | Speed limit | Max ISO | ISO | White balance |
|---|---|---|---|---|
| Dark | 1/f | 25000 | Auto | Auto |
| Darker | 1/30 | 50000 | Auto | Auto |
| Lights | 1/60 | 12500 | Auto | Tungsten |
| Stars | 1/(4f) | 3200 | 3200 | 3900 K |

**Events.** Silent for ceremonies and speeches, people, flash at the party, details. Pressing the thumbwheel magnifies for focus.

| User profile | Speed limit | Max ISO | Film style | Drive |
|---|---|---|---|---|
| Quiet | 1/250 | 12500 | Standard | Single |
| People | 1/(2f) | 6400 | Natural | Single |
| Party | 1/125 | 6400 | Standard | Single |
| Details | 1/125 | 6400 | Standard | Single |
| Speeches | 1/125 | 25000 | Standard | Slow burst |

**Black and white.** Black and white looks, soft to noir, with color DNGs kept beside them. White focus peaking.

| User profile | Speed limit | Max ISO | Film style | Exposure |
|---|---|---|---|---|
| Soft | 1/(2f) | 6400 | Monochrome | +1/3 |
| Mono | 1/(2f) | 6400 | Monochrome | 0 |
| Hard | 1/(2f) | 6400 | Monochrome High Contrast | 0 |
| Noir | 1/60 | 6400 | Monochrome High Contrast | −2/3 |
| Grain | 1/250 | 50000 | Monochrome | 0 |
| Color | 1/(2f) | 6400 | Standard | 0 |

**Travel.** Days out, museums, food, nights, and a battery saver.

| User profile | Speed limit | Max ISO | Film style | Exposure |
|---|---|---|---|---|
| Day | 1/(2f) | 6400 | Standard | 0 |
| Museum | 1/125 | 25000 | Standard | 0 |
| Food | 1/125 | 12500 | Vivid | 0 |
| Night | 1/f | 25000 | Standard | −1/3 |
| Saver | 1/(2f) | 12500 | Standard | 0 |

**Kids and pets.** Fast speeds and bursts, outside and in, and a quiet one for sleeping.

| User profile | Speed limit | Max ISO | Drive | Shutter |
|---|---|---|---|---|
| Run | 1/1000 | 25000 | Fast burst | Hybrid |
| Play | 1/500 | 12500 | Slow burst | Hybrid |
| Inside | 1/250 | 25000 | Slow burst | Hybrid |
| Asleep | 1/60 | 12500 | Single | Electronic |

**Factory.** Every setting as a new camera has it, in one profile.

| User profile | Speed limit | Max ISO |
|---|---|---|
| User1 | 1/(4f) | 3200 |

<!-- sets:end -->

### How to use it

1. **Pick your cameras.** Msetter makes a separate file for each, so two bodies can share one design even where their menus differ.
2. **Start from a set or from your camera.** To start from your camera, export its settings to the card (User Profile › Manage Profiles › Export Profiles) and open the file in the app.
3. **Change what you like.** Settings are grouped by what they are for. Point at a setting to see what it does. Undo takes back anything.
4. **Save and import.** Copy `settings.lcse` to the top of the card, then User Profile › Manage Profiles › Import Profiles. This replaces every profile on the camera, so export yours first.

**On the camera**, press the top button to step through the profiles. If you change a setting, the camera shows Default instead of the profile's name until you choose a profile again. The camera doesn't say when it skips a value, so check a few settings after your first import.

**[Try the app](https://timoarnall.github.io/msetter/app/)**

### How it works

The camera keeps everything in **one JSON file, `settings.lcse`, at the top level of its card**. `Camera` names the body, `Version` is a number the camera writes, and `Settings` holds the values. Each setting has a four-character code, such as `D00C` for the shutter speed limit. A setting that belongs to a profile holds seven values: the one the camera is using now, then one for each of user profiles one to six. A setting for the whole camera holds one value. The M11, M11-P and M-EV1 write 139 codes, the M11-D 140 and the M11 Monochrom 145.

The file holds **the six profile names, which profiles are saved and which one the camera starts in**, the job of each button (top button, FN, thumbwheel press and turn, FN on pictures, and the M-EV1's FN lever both ways), the Favorites menu in order with up to 11 items per profile, the four screen layouts, and everything else in the camera's menus, from white balance and film styles to file names, copyright and power saving.

When you import, **the camera first checks that the `Camera` name in the file matches its own exactly**. If it doesn't, nothing is imported and nothing is shown. If it does, the camera reads each value on its own: **a value it doesn't allow is skipped and the old value kept**, and a code missing from the file keeps its current value. **Profiles not marked as saved are reset.** None of this shows a message, so Msetter lists the values a camera would skip when you open a file, and marks the profiles it saves.

**A file can't move the dials or the lens.** Shutter speed, aperture and the ISO dial stay where they are, so a profile sets limits for A instead. A file also can't set the date, the time or the camera's network name, or reorder the main menu, and **user profiles can only be switched from a button**, not a dial. On the M-EV1, which has no ISO dial, the ISO is in the file; on the M11-P the same code sets the ISO the dial uses at M.

**Msetter makes no network requests.** It is a page of static files: a file you open is read with the browser's file reader, your design is kept in the browser's local storage on your device, and clearing the site's data removes it. A test fails if the app code ever gains a network call.

Msetter knows **every setting's factory value**, so it can build a file from scratch for any of these bodies, without a file from the camera. The M11-D also has a settings file, but no user profiles and no way to import one: neither the camera nor the Leica FOTOS app offers Import Profiles (M11-D manual; owners on the Leica forum, November 2024). **Files from Msetter match the camera's own.** Given the same values, a file built from scratch is the same, byte for byte, as a real export, apart from the network name, which newer firmware leaves out. A test checks this on every change. The camera has also imported a file edited by hand.

The **documentation** lists every code with its allowed values and its factory value on each camera in [docs/settings](docs/settings/README.md). How the controls, menus, Favorites and screen layouts fit together, with page references to Leica's manuals, is in [docs/interaction-architecture.md](docs/interaction-architecture.md). The file format is in [docs/file-format.md](docs/file-format.md), the differences between bodies in [docs/cameras.md](docs/cameras.md), and the questions anyone with a camera can help settle in [docs/open-questions.md](docs/open-questions.md).

| Path | What it is |
|---|---|
| `index.html`, `src/app.js`, `src/app.css` | The app |
| `src/engine.js` | Reads, checks, converts and writes settings files; used by the app and the tests |
| `src/rules.js` | Every code for every camera: kind, allowed values, factory value, the camera's own names. Generated; don't edit by hand |
| `src/catalogue.js` | Plain names, help, notes and the grouping of job lists |
| `src/sets.js` | The starting sets |
| `src/camera.js`, `src/photos.js` | The camera drawing, the camera screen and its photo |
| `site/` | This project's page on GitHub Pages; the app is published beside it at `app/` |
| `mac/` | The Mac app around the same page, with card writing and backups |
| `docs/` | The documentation; `docs/settings/` is generated by `tools/build_docs.py` |

To **add a starting set**, edit `src/sets.js`, then run `node tools/build_sets_tables.js` to refresh the tables on the project page and in this README; the tests check every value on the M11-P and M-EV1 and convert it to the other bodies. Plain names and help live in `src/catalogue.js`; run `python3 tools/build_docs.py` afterwards to refresh the docs. To add a camera or a firmware version, start from a real export with the artist, copyright and network name blanked, and see [docs/README.md](docs/README.md). `node --test test/*.test.js` runs the tests, which also run on every push; `test/browser-check.js` clicks through the app in Safari's engine and Chrome at desktop and phone sizes. Build the Mac app with `zsh mac/build.sh`.

Free, under the MIT licence; see [LICENSE](LICENSE). The photo on the camera screen is by Timo Arnall. Msetter is not made by or connected to Leica Camera AG; Leica, M11 and M-EV1 are its trademarks. The app contains no Leica firmware, manuals or artwork.
