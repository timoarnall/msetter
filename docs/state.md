# State

Every piece of state in Msetter, the rules that tie it together, and where each lives. Read this before changing anything that remembers something. The checks that guard these rules are named at the end.

## Undo steps

`src/state.js`. A change is `remember()` (notes the state), the change, then `save()`, which makes an Undo step only if the state differs. `past` holds up to 80 steps; neither `past` nor `future` is stored, so a reload starts with no Undo.

- **In a step (`snapshot`)**: the design (`doc`), the selected profile (`sel`), the starting set (`setId`), the part sets picked (`parts`), the cameras (`targets`), the starting point (`origin`), the opened files (`bases`) and the rows set per profile (`split`). These decide what Save writes or where the next change goes.
- **Left out on purpose**: the section shown (`theme`), the camera drawn (`view`), the All settings search (`query`), mounted cards (`cards`), the Q3 files, the pretend camera, sheets and the notice.
- **A notice offers Undo only when its action made a step** (`madeStep()`, read by `notice()` in `src/ui.js`). Picking the set already picked, or any action that changes nothing, shows its notice without Undo, so Undo never undoes something else.

## Where the design came from

`st.setId`, `st.parts`, `st.bases`, `st.targets` and `st.origin = { model, S, from, touched?, kept?, q3?, q3at? }`. `begin()` (`src/state.js`) starts a new design and clears what belonged to the old one; `Design.moveTo` moves the design and its `origin` when the first camera changes and keeps every origin field.

| Starting point | How you get there | setId | bases | origin.q3 |
|---|---|---|---|---|
| Factory | first visit, Start over | factory | none | none |
| A starting set | picking one | its id | none | none |
| An M file | Open file | none | the file, plus earlier ones | none |
| A Q3 file | opening a Q3 file into an untouched design, or Use this file's settings | none | none | the model, and `q3at` = that file's `at` |

The Save sheet's change list and the change dots count from `origin`. Save follows `setId` and `parts` so each camera gets its own version of a starting set.

## The Q3 experiment

`src/q3page.js` keeps, per Q model, the owner's file in the browser's storage (`msetter-q3-v1`), outside the design and Undo:

`held[m] = { text, name, at, saved?: { text, changes: [{ code, slot, p, to }], at } }`

Every decision about it is a pure function in `src/q3.js`, tested in `test/q3.test.js`:

- **`Q3.openPlan(held[m], text)`** says what opening a Q3 file does:

  | Mode | When | What the page does | The new file is held |
  |---|---|---|---|
  | first | nothing held, or the held file can't be written and the new one can | holds it, shows the Q3 sheet; an untouched design takes its settings | yes |
  | again | the file is the one Msetter saved | says to import it first | no |
  | check | Msetter saved a file after the held one was opened | What your Q3 kept | yes |
  | compare | anything else | What changed between the two exports | yes, unless it can't be written and the held one can |

- **`Q3.baseFor(origin, m, factory)`**: Save writes a setting into model `m`'s file when the design's value differs from this base: the design as it came from that model's file (`origin.q3 === m`), or else the M's factory settings. Untouched M defaults never overwrite the owner's Q3 values.
- **`Q3.designIsFrom(origin, m, held[m])`**: the design came from this very file (`origin.q3at === held[m].at`). If not, the Q3 sheet offers Use this file's settings.
- **`Q3.canWrite(text)`**: firmware 4 (told by `D31B` and `D3DB`, which only firmware 4 writes) and laid out exactly as the camera writes. Other files open and compare but don't save.

A design "untouched" enough to take a new Q3 file's settings has no changes since it started from the factory settings or from a Q3 file. Close file deletes `held[m]` and its saved record. The Q3 is hidden in the Mac app and on claude.ai (chips, Save rows, and opening a Q3 file).

## Layers on the page

`src/ui.js`. A popover menu, a stack of sheets, and the notice (4 seconds, hidden by any later change or click). Escape closes the menu, then the top sheet. Undo, Redo and opening a file close every sheet first. ⌘Z does nothing while a sheet is open. A sheet closed by the person redraws the page.

While a pointer is down, `changed()` waits for the click to land before drawing (`src/app.js`), so a redraw never swallows a click.

## The pretend camera

`Camera.sim` in `src/camera.js`: live view, the open screen list, the screen layout shown, exposure compensation, zoom, peaking and crop. Changing the camera drawn closes the list and turns live view off; changing the profile closes the list and resets exposure compensation; any value change resets zoom, peaking and crop only. An open screen list keeps the values it opened with until it is closed.

## Saving

`saveWords()` in `src/save.js` turns every save result into the button's words: saved → Saved; cancelled or declined → Save file; unavailable (claude.ai without downloads) → This page can't save files here; anything else (failed, no card, another camera's card) → Not saved. Card writes in the Mac app say Written or Not written, with the reason. The Save sheet redraws when cards are mounted or removed while it is open. A browser can't tell when a download is cancelled, so a Q3 Save always records `saved`.

## Known gaps

- On phones Start over is not in the bar at the bottom.
- An open list on the pretend screen shows the values it opened with.
- `held` is read once per page load: two tabs open at once overwrite each other's Q3 files.
- A press dragged out of the window and released there leaves the page waiting for the click to land until the next click.

## Checks

`zsh tools/check.sh` runs all of them. The rules above are covered by `test/q3.test.js` (the Q3 state and transfer), `test/scripts.test.js` (Undo only after a change, Set per profile inside Undo), `test/flows.js` (the Q3 experiment end to end, Undo only when something changed, Undo and Redo in every flow) and the save proof (`test/save-golden.js`: no saved M file changed).
