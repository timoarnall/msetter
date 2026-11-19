# Code map

The app is plain scripts and one stylesheet: no build step, no dependencies, no network. It runs from `file://`, from GitHub Pages, inside the Mac app (`mac/`), and as one self-contained page that `python3 tools/build_page.py` writes into `dist/`.

## Files

`index.html` loads the scripts in this order. Each one may use the ones above it. `src/library.js` asks `Design` for an entry's values only when they are needed, after every script has loaded.

| File | Its job |
|---|---|
| `src/version.js` | Generated from `VERSION` by `tools/stamp_versions.py`: the page's `VERSION` constant. Never edited by hand. |
| `src/rules.js` | Generated facts about each camera: every code in the file, its allowed values, factory value and the camera's own name. Never edited by hand. |
| `src/engine.js` | Reads, checks, translates and writes settings files. Untrusted data is typed at the door: `Engine.parse` reads only codes of four hex digits and `Engine.sanitize` gives every value the kind its setting holds, listing what it replaced ([state.md](state.md), Doors). `Engine.get` and `Engine.put` read and write a profile's value (slot 0 for a camera-wide setting). Runs in Node too. |
| `src/changes.js` | What changed, as pure functions: each profile's record (what it is compared with), and from the records the lines (Added, Removed, Moved, Renamed, each changed value, the default profile) and the marks for the red dots. The dots, the count, the Save sheet and the Changed filter all read it ([state.md](state.md), Changed). Runs in Node too. |
| `src/q3codes.js` | Generated from `docs/leica-q3-codes.json` by `tools/build_q_codes.py`: what each code in a Q3 file is thought to be, and how sure. Never edited by hand. |
| `src/q3.js` | The Q3 experiment's file work: reads and writes a Q3 export in the camera's layout, writes the settings the M and Q3 share into it (`Q3.ENTRIES` says which, and how values cross), compares two exports, and writes the report. Runs in Node too. |
| `src/catalogue.js` | Which settings the page shows, grouped into sections, with names, help and job groups. |
| `src/sets.js` | The starting sets, and the part sets for buttons, Favorites and screen layouts. |
| `src/library.js` | The Profiles page's library: every starting set's profiles as single profiles, each known by its id, with a line each. `LIBRARY.valuesFor` says what an entry brings: its Exposure, Image and Shooting pages as its set makes them on a camera. Saved: the profiles saved in this browser, typed as they are read ([state.md](state.md), Library). |
| `src/design.js` | Builds and changes a design (profiles from sets, part sets, add, add from the library, copy, remove, move, rename) and makes the file for each camera: `Design.forCamera` is the save path, `Design.moveTo` moves the design when its own camera is unpicked. Runs in Node too. |
| `src/zip.js` | The zip writer behind Save all. Runs in Node too. |
| `src/words.js` | What the page calls settings and values, counts ("1 item"), `esc` for markup, and the one list of buttons whose job can be set. Runs in Node too. |
| `src/photos.js` | The photo on the pretend camera screen. |
| `src/camera.js` | The camera drawing and the pretend screen, placed in the Buttons, Screen and Favorites pages. It talks to the page only through the `ctx` the page gives it. |
| `src/motion.js` | Movement and ticks: values roll, columns build in and fold away, rows join and split, library profiles fly to their card when its place is on the screen, sections rise once, ticks draw themselves in a value's mark place, checklists tick in line by line. Every tick and fade is an animation of its own element, never a timer. `Motion.tickNext` names a typed field to tick after the next redraw. Timings are tokens in `app.css` (`--t-…`). Reduced motion turns movement off; ticks still show. |
| `src/ui.js` | The layers over the page, each opened through `layer()`: sheets, popover menus, the tip of an (i), and the notice and its receipt. Also the tools' icons (`App.TOOL`), the (i), lists of three lines with Show N more, drag to reorder, and `keepFocus`. |
| `src/state.js` | The state (`st`), Undo and Redo with each step's words, the browser's storage (typed when read, a broken copy set aside, a failed write said once), `begin` for a new design, the starting point and the change records, read through `App.changes()`. |
| `src/rows.js` | A table row: its setting in each profile, whether the profiles share it, whether it changed, where a change goes (`scopeOf`), and `keepApart`, which marks a row apart after every step so it joins only when asked. |
| `src/table.js` | The table: a bar for a value every profile shares, a tile per profile where they differ. `controlHTML` draws each value as one line with its mark's place; `fitGrid` wraps the profiles into rows when a name or a value would be cut. The (i) menu on each setting (help, the camera's name and code, the scope choice); Use … in every profile and Set per profile; a profile's … menu, with one home for each action, and renaming a card in place. |
| `src/editors.js` | The Favorites and Screen layouts editors: on the Favorites page beside the pretend screen, and at the end of the Screen page. A Favorites or layouts value in a table goes to its editor (`App.goEditor`); there is no second copy in a sheet. |
| `src/save.js` | Each camera's file and its notes, the default profile the file holds (decided when the file is made), the Save sheet, downloads, the Mac app's bridge, opening a file, changing cameras. |
| `src/q3page.js` | The Q experiment on the page: the Q3, Q3 43 and Q2 in the camera menu and their sheet (`PAGE` words the Q2's), the import result with a tick for each setting kept, the Save rows. |
| `src/events.js` | What clicks, keys, drags and typing do on the page. |
| `src/app.js` | The sidebar, the top bar (camera menu, the starting point's name, the count of changes, Undo and Redo, the … menu), the dock on phones, each section's page, the Profiles page with your profiles and the library (`addFromLibrary`, `addAll`), the camera's `ctx`, `App.checkState()`, the notice when another tab changes what this browser keeps, and the start. |
| `src/app.css` | All styles. Every value is a token at the top; dark mode is the same tokens set twice (system dark mode, and `data-theme="dark"` from the claude.ai host). |

Removed and gone for good: the Favorites and layouts sheets (`favoritesSheet`, `layoutsSheet`), `Design.ownValues` (Saved keeps whole pages) and `useSetProfile`. `test/dead-code.test.js` keeps code no page uses out.

The page's files share one object, `App`. A file takes the names it needs from files above it as locals at its top (`var st = App.st, ...`), and uses files below it through `App` at the time of the call (`App.render()`). It ends by putting what other files use on `App`. `test/scripts.test.js` checks that every `App.x` used is defined, and `test/dead-code.test.js` that every name put on `App` is used outside its own file.

`window.ProfileMaker` (`state`, `render`, `prepare`, `openText`, `saveSheet`, `undo`, `redo`, `nativeReply`, `setCards`) and `Camera` (`render`, `layoutPreview`, `light`, `sim`, `press`, `show`) are used by the Mac app, the tests and capture scripts. Keep those names.

## State

The full map of what the page remembers, the rules that tie it together, and the Q3 experiment's state is in [state.md](state.md). In short, everything about the design is in `st` (`src/state.js`):

- `doc`: the design, a document for one of the picked cameras, which it stays on while that camera is picked (`{ model, S: { code: slots }, ... }`; per-profile settings have 7 slots, 0 is the camera's live state and 1 to 6 the profiles).
- `targets`: the chosen cameras. `bases`: an opened file per camera, the base for that camera's file. `setId`: the starting set the design follows. `parts`: the part set chosen for each part since then (`{ buttons, favorites, layouts }`), which the design follows too. `origin`: the starting point. `recs` and `drop`: what each profile is compared with for the change marks.
- `sel`: the selected profile. `split`: rows shown a tile per profile; a change to one profile's value and `keepApart` after every step set it, so a row joins into one bar only when it starts equal or when asked. `filter`: All settings shows All, Different or Changed. `theme`: the section shown. `view`: the camera drawn. `query`: the All settings search. `cards`: mounted cards (Mac app). `camsPicked`: whether anyone has chosen a camera on this page.

A change goes `remember()`, then the change, then `changed()` (or `changedSoon()` for text fields). `remember()` notes the state and hides the notice; `save()` settles the change records, keeps rows apart, turns the change into an Undo step if anything changed, and writes the browser's storage. The notice that follows names the step, and Undo says those words back. The pretend camera's own state (`Camera.sim`) is not part of the design.

## Drawing the page

- `render()` (`src/app.js`) draws the page from the state: the sidebar, dock and section list are built once and then updated in place, so a button there keeps the keyboard focus. The camera drawing comes next, because the layouts editor's previews draw from it. The main page is drawn again with `keepFocus`, which puts the focus, the typing cursor and the scroll back; on All settings the search box stays and only the rows under it are drawn again. Then `fitGrid` measures the table, and `Motion.play` moves what changed.
- `refresh()` is for changes made in place (an editor, a drag along a value, the Save sheet): everything but the main page is updated, and on the Favorites and Screen pages the editors' heads too.
- While a pointer is down, `changed()` waits for the click to finish before drawing, so a click is never lost to a redraw.
- The camera drawing shows another picked camera than the design's from what Save writes for it (`fileFor`). The pretend camera resets only when the camera, the profile or a value changed.

## Save proof

`test/save-golden.js` drives the page through its own buttons for 2,903 saved files (every starting set with every choice of cameras, a walk of camera changes, every part set on every choice of cameras and through the walk, opened files, seeded edits, Save all zips, saved sessions) and records the SHA-256 of every file Save writes and its notes in `test/fixtures/save-golden.json`. `--check` compares and must print `0 differences in 2903 files`. A change that alters one saved byte or note fails it. Record again (`--write`) only when a change to the saved files is wanted and has been tested on a camera. Recording keeps the saved sessions already in `test/fixtures/save-golden-sessions.json`, so saves from older versions of the page are still checked.

## Tests

Node tests, `node --test test/*.test.js`:

| Test | What it guards |
|---|---|
| `test/engine.test.js` | Reading and writing files: a camera export comes back byte for byte, factory values, profiles and slots, moving to another camera, labels, a wrong camera refused. |
| `test/engine-props.test.js` | Random designs on every offered camera, made the way the page makes them: every saved file is clean, reads back, and keeps profiles, names and Favorites; six profiles at most; name rules. `PROPS_SEED` replays a failure. |
| `test/save-path.test.js` | The save path: what each camera's file keeps when the design moves between cameras, sets and part sets followed on each camera, and the notes. |
| `test/sets.test.js` | Every starting set makes a file every camera accepts; adding, copying and removing profiles; part sets. |
| `test/changes.test.js` | One meaning of changed: profile steps make one line and no marks, an edit marks its value, every mark has a line ([state.md](state.md), Changed). |
| `test/library.test.js` | A library profile is the same every time, and adding one never changes another camera's file for a setting it doesn't set ([state.md](state.md), Library). |
| `test/hostile.test.js` | Untrusted data is typed at the door: a hand-made file can't put markup or odd objects into the page or the saved file ([state.md](state.md), Doors). |
| `test/q3.test.js` | The Q experiment: Q files read and written in the camera's layout, only shared settings written, reports without names, and the experiment's state. |
| `test/words.test.js` | Every setting has a name, counts read right, the button list matches the Buttons page. |
| `test/zip.test.js` | The zip writer: checksums, a zip that reads back, the bytes the save proof recorded. |
| `test/scripts.test.js` | The scripts load in order, every `App` name used is defined, every section draws, and a change that changes nothing makes no Undo step. |
| `test/dead-code.test.js` | Code no page uses is deleted: every styled class and every `data-` attribute read is written by markup, every `App` name and module export is used outside its file, every icon is drawn once. |
| `test/css.test.js` | The stylesheet: the two dark mode blocks match, every class it styles is written by the page, colors are tokens. |
| `test/contrast.test.js` | Design rule 9: every brightness meets its number on every surface it is on, light and dark, computed from the tokens; the project page uses the app's tokens. |
| `test/design-rules.test.js` | One test per design rule that can be read from the stylesheet and markup: type sizes, tools, + and − in the same place, corners, values at the left, rows level, the Profile label, icons, empty places, None, sheets as forms, hierarchy. |
| `test/voice.test.js` | Every word a person reads (the page's strings, `index.html`, the project page, the README, the docs and their generators, the Mac app, the issue templates) against one word list, `test/voice-words.json`. |
| `test/privacy.test.js` | No network requests anywhere in the app, and the page's and the one-file copy's content security policies. |
| `test/versions.test.js` | Every file `index.html` loads is stamped with its contents; `VERSION`, the page and the Mac app carry one version; the change log's newest line is for it. |
| `test/camera-kit.test.js` | The camera test kit (`camera-test/`, in the private repository only) is what its pages say. |

In a browser, with Playwright:

| Test | What it guards |
|---|---|
| `test/save-golden.js` | The save proof (above). |
| `test/browser-check.js` | In WebKit and Chrome, desktop and phone: Add all, every section, a menu and Escape, a button's jobs on the drawing, the Favorites screen; no errors, no sideways scroll, every saved file checks clean, and the names the Mac app and the scripts call are there. |
| `test/flows.js` | What a person does, in Chrome and WebKit: renaming, Undo and Redo, Save all, opening files, cameras, part sets, the editors, keyboard focus, phone widths, the Q3 experiment. A known failure is named next to its check and counts only with `FLOWS_STRICT=1`. |
| `test/state-walk.js` | A seeded random walk through the page's events, with `App.checkState()` and each step's promises checked after every step ([state.md](state.md), Checks). |
| `test/marks.js` | Design rule 11 on the drawn page: after a change to a tile, a bar, a switch, a name and a typed field, the tick and the dot overlap nothing and are on the value's line, no tick is left, nothing is cut; Chrome and WebKit, wide and phone, light and dark. Run by hand with the app served; `tools/check.sh` doesn't run it. |

`test/pretend-user.js` and `test/phone.html` are tools, not checks: one drives a page step by step for pretend-user passes, the other shows the page at phone width.

## Checks

Run from the repository folder. Playwright is needed for the browser checks; `NODE_PATH` names a folder whose `node_modules` holds Playwright, or `npm ci` puts it in this folder's `node_modules`.

`zsh tools/check.sh` (or `npm run check`) runs every check in this order, with a local server of its own on a free port, and stops at the first failure:

1. Unit tests: `node --test test/*.test.js`.
2. File stamps: `python3 tools/stamp_versions.py --check`.
3. The word list in step with the house voice file: `python3 tools/sync_voice.py --check`.
4. Generated docs: `tools/build_docs.py` and `tools/build_q_codes.py` run, and nothing in `docs/` or `src/q3codes.js` may change.
5. The one-file copy: `tools/build_page.py` rebuilds `dist/profile-maker.html`, which may not change (the public copy has no `dist/`, so there it only has to build).
6. The save proof: `node test/save-golden.js --check` must print `0 differences`.
7. Chrome and WebKit: `node test/browser-check.js`.
8. The browser flows: `node test/flows.js` on the local server.
9. The state walk: `node test/state-walk.js 300 7 11 23` on the local server.

`zsh tools/check.sh quick` (`npm run check:quick`) stops after step 5. Steps 6, 8 and 9 need `camera-test/`, which only the private repository holds; without it they are skipped and say so. When every check passes on a clean tree, the check writes the commit to `tools/.checked`, which publishing and the Mac release require ([releasing.md](releasing.md)). The Mac app is built and tested by `mac/release.sh`: `zsh mac/build.sh && build/Msetter.app/Contents/MacOS/Msetter --selftest out.png`.
