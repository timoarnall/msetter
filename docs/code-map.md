# Code map

The app is plain scripts and one stylesheet: no build step, no dependencies, no network. It runs from `file://`, from GitHub Pages, inside the Mac app (`mac/`), and as one self-contained page that `python3 tools/build_page.py` writes into `dist/`.

## Files

`index.html` loads the scripts in this order. Each one may use the ones above it.

| File | Its job |
|---|---|
| `src/rules.js` | Generated facts about each camera: every code in the file, its allowed values, factory value and the camera's own name. Never edited by hand. |
| `src/engine.js` | Reads, checks, translates and writes settings files. `Engine.get` and `Engine.put` read and write a profile's value (slot 0 for a camera-wide setting). Runs in Node too. |
| `src/q3codes.js` | Generated from `docs/leica-q3-codes.json` by `tools/build_q_codes.py`: what each code in a Q3 file is thought to be, and how sure. Never edited by hand. |
| `src/q3.js` | The Q3 experiment's file work: reads and writes a Q3 export in the camera's layout, writes the settings the M and Q3 share into it (`Q3.ENTRIES` says which, and how values cross), compares two exports, and writes the report. Runs in Node too. |
| `src/catalogue.js` | Which settings the page shows, grouped into sections, with names, help and job groups. |
| `src/sets.js` | The starting sets, and the part sets for buttons, Favorites and screen layouts. |
| `src/design.js` | Builds and changes a design (profiles from sets, part sets, add, copy, remove, rename) and makes the file for each camera: `Design.forCamera` is the save path, `Design.moveTo` moves the design when the first camera changes. Runs in Node too. |
| `src/zip.js` | The zip writer behind Save all. Runs in Node too. |
| `src/words.js` | What the page calls settings and values, counts ("1 item"), `esc` for markup, and the one list of buttons whose job can be set. Runs in Node too. |
| `src/photos.js` | The photo on the pretend camera screen. |
| `src/camera.js` | The camera panel: the drawing, the pretend screen and the list of jobs. It talks to the page only through the `ctx` object the page passes to `Camera.render`. |
| `src/ui.js` | The notice, popover menus, sheets, drag to reorder, and `keepFocus`. |
| `src/state.js` | The state (`st`), Undo and Redo, the browser's storage, `begin` for a new design, the starting point and the list of changes. |
| `src/rows.js` | A table row: its setting in each profile, whether the profiles share it, whether it changed, and where a change goes (`scopeOf`). |
| `src/table.js` | The profile table: its controls and menus, Make every profile the same, the profile menu. |
| `src/editors.js` | The Favorites and screen layouts editors, in a sheet or on the Favorites and layouts page. |
| `src/save.js` | Each camera's file and its notes, the Save sheet, downloads, the Mac app's bridge, opening a file, changing cameras. |
| `src/q3page.js` | The Q3 experiment on the page: the Q3, Q3 43 and Q2 chips and their sheet (`PAGE` words the Q2's), the owner's export kept in the browser's storage (`msetter-q3-v1`, outside the design and Undo), the Q3 rows of the Save sheet, and the comparison with Send and Copy report. Hidden in the Mac app and on claude.ai. |
| `src/events.js` | What clicks, keys, drags and typing do on the page. |
| `src/app.js` | The sidebar and dock, each section's page, the camera panel's `ctx`, and the start. |
| `src/app.css` | All styles. Every value is a token at the top; dark mode is the same tokens set twice (system dark mode, and `data-theme="dark"` from the claude.ai host). |

The page's files share one object, `App`. A file takes the names it needs from files above it as locals at its top (`var st = App.st, ...`), and uses files below it through `App` at the time of the call (`App.render()`). It ends by putting what other files use on `App`. `test/scripts.test.js` checks that every `App.x` used is defined.

`window.ProfileMaker` (`state`, `render`, `prepare`, `openText`, `saveSheet`, `undo`, `redo`, `nativeReply`, `setCards`) and `Camera` (`render`, `layoutPreview`, `light`, `sim`, `press`, `show`) are used by the Mac app, the tests and capture scripts. Keep those names.

## State

The full map of what the page remembers, the rules that tie it together, and the Q3 experiment's state is in [state.md](state.md). In short, everything about the design is in `st` (`src/state.js`):

- `doc`: the design, a document for the first chosen camera (`{ model, S: { code: slots }, ... }`; per-profile settings have 7 slots, 0 is the camera's live state and 1 to 6 the profiles).
- `targets`: the chosen cameras. `bases`: an opened file per camera, the base for that camera's file. `setId`: the starting set the design follows. `parts`: the part set picked for each part since then (`{ buttons, favorites, layouts }`), which the design follows too. `origin`: the starting point, for change marks and the change list.
- `sel`: the selected profile. `split`: rows shown per profile although the profiles agree. `theme`: the section shown. `view`: the camera drawn. `query`: the All settings search. `cards`: mounted cards (Mac app).

A change goes `remember()`, then the change, then `changed()` (or `changedSoon()` for text fields). `remember()` notes the state; `save()` turns it into an Undo step if anything changed and writes the browser's storage. The pretend camera's own state (`Camera.sim`) is not part of the design.

## Drawing the page

- `render()` (`src/app.js`) draws the page from the state: the sidebar, dock and section list are built once and then updated in place, so a button there keeps the keyboard focus; the main page is drawn again with `keepFocus`, which puts the focus, the typing cursor and the scroll back; on All settings the search box stays and only the rows under it are drawn again. Then the camera panel.
- `refresh()` is for changes made in place (an editor, the Save sheet): everything but the main page is updated, and on the Favorites and layouts page the labels are updated too.
- While a pointer is down, `changed()` waits for the click to finish before drawing, so a click is never lost to a redraw.
- The camera panel shows another camera than the design's from what Save writes for it (`fileFor`). The pretend camera resets only when the camera, the profile or a value changed.

## The save proof

`test/save-golden.js` drives the page through its own buttons for 2,819 saved files (every starting set with every choice of cameras, a walk of camera changes, every part set on every choice of cameras and through the walk, opened files, seeded edits, Save all zips, saved sessions) and records the SHA-256 of every file Save writes and its notes in `test/fixtures/save-golden.json`. `--check` compares and must print `0 differences in 2819 files`. A change that alters one saved byte or note fails it. Record again (`--write`) only when a change to the saved files is wanted and has been tested on a camera. Recording keeps the saved sessions already in `test/fixtures/save-golden-sessions.json`, so saves from older versions of the page are still checked.

## Checks

Run from the repository folder. Playwright and Chrome are needed for all but the first; `NODE_PATH` names a folder whose `node_modules` holds Playwright.

`zsh tools/check.sh` runs every one of these in order, with a local server of its own, and stops at the first failure (`zsh tools/check.sh quick` for the Node tests, stamps and generated docs only). One at a time:

```sh
node --test test/*.test.js                          # Node tests: engine, sets, save path, words, zip, scripts, styles, privacy
node test/save-golden.js --check                    # the save proof
node test/browser-check.js                          # Chrome and WebKit, desktop and phone
python3 -m http.server 8094 --bind 127.0.0.1 &      # then:
FLOWS_STRICT=1 node test/flows.js http://127.0.0.1:8094/index.html   # what a person does, in Chrome and WebKit
python3 tools/build_docs.py && git diff --exit-code docs/   # generated docs up to date
python3 tools/build_page.py                         # the one-file page
zsh mac/build.sh && build/Msetter.app/Contents/MacOS/Msetter --selftest out.png   # the Mac app
```
