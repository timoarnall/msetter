# State

Every piece of state in Msetter, the rules that tie it together, and where each is kept. Read this before changing anything that remembers something. The checks that guard these rules are named at the end.

## Undo steps

`src/state.js`. A change is `remember()` (notes the state and hides the notice), the change, then `save()`, which settles the change records (see Changed), keeps rows apart (see Rows), makes an Undo step only if the state differs, and writes the browser's storage. `past` holds up to 80 steps; neither `past` nor `future` is stored, so a reload starts with no Undo.

- **In a step (`snapshot`)**: the design (`doc`), the selected profile (`sel`), the starting set (`setId`), the part sets chosen (`parts`), the cameras (`targets`), the starting point (`origin`), the opened files (`bases`), the rows set per profile (`split`) and the change records (`recs`, `drop`). These decide what Save writes, where the next change goes and what counts as changed.
- **Left out on purpose**: the section shown (`theme`), the camera drawn (`view`; empty means the design's own camera, so the drawing and the table agree), whether a camera has been chosen on this page (`camsPicked`), the All settings search and filter (`query`, `filter`), mounted cards (`cards`), the Q files, Saved profiles, the pretend camera, `Motion`'s hint for the next redraw, the library row whose tick is drawing (`justAdded`), sheets, menus and the notice.
- **A notice offers Undo only when its action made a step** (`madeStep()`, read by `notice()` in `src/ui.js`). Choosing the value already chosen, or any action that changes nothing, shows its notice without Undo, so Undo never undoes something else. The notice's other buttons change nothing in the design: Show (what a camera change changed) and Reload (see Doors).
- **Opening a sheet or a menu writes nothing.** Choosing a profile in the Save sheet's Default profile row is one step, like any other change.

## Undo words

Each step keeps the words of the notice its action showed. `notice()` hands them to `nameStep()`, which names the newest step when the action made one. Undo says them back after "Undid:" with only the verb lowered (`said()`): `Undid: removed GOLDEN`, `Undid: renamed USER1 to GOLDEN`. A name stays as it is, so a part set's notice, which names the set first, comes back as `Undid: Rangefinder buttons in every profile`. Redo says the same words after "Redid:".

A step without a notice (a value chosen from its menu, a typed value) is said by what differs between the two states (`whatChanged()`): the setting and its profile ("ISO in GOLDEN"), a profile name, the cameras, a part set, or where the design started.

## Where the design came from

`st.setId`, `st.parts`, `st.bases`, `st.targets` and `st.origin = { model, S, from, touched?, kept?, q3?, q3at? }`. `begin()` (`src/state.js`) starts a new design and clears what belonged to the old one: its rows set per profile, the part sets, the opened files unless passed on, the selected profile and the change records.

| Starting point | How you get there | setId | bases | origin.q3 | Its name in the top bar |
|---|---|---|---|---|---|
| Factory | first visit, Start over | `factory` | none | none | Factory |
| A starting set | Add all on a library group while the first profile is untouched (`useSet`) | its id | none | none | the set's name |
| An M file | Open | none | the file, plus earlier ones | none | From your M-EV1 |
| A Q file | opening a Q file into an untouched design, or Use this file's settings | `factory` | none | the model, and `q3at` = that file's `at` | From your Q3 |

- The starting point keeps one name for as long as you work on it (`originName()` in `src/app.js`): adding profiles never renames it. The name is a status and has no icon that could read as a button; a file read and kept has a tick.
- The first library profile added on the untouched first profile takes that profile's place and leaves `setId` as it was, so the design still follows Factory (see Library).
- Add all on a design from a file adds profiles. No control lays a set over an opened file: `Design.fromSetOn` is reached only through `useSet`, which runs only on an untouched design, and an untouched design has no file.
- Save follows `setId` and `parts`, so each camera gets its own version of a starting set and of each part set.

## Which camera the design is on

`st.doc` is a document for one of the picked cameras (`st.doc.model`). It stays on its camera while that camera is picked, and it need not be the first in the list: adding a camera never moves it. When its own camera is unpicked, `Design.moveTo` moves the design and its `origin`, keeping every origin field, to the first picked camera in `MODELS` order (`primary()`). Profiles added since the start move their records along, so a value nobody changed stays unmarked on the new camera.

`camsPicked` says whether anyone has chosen a camera on this page. A tap in the camera menu always adds or removes that one camera, and sets `camsPicked`. An opened file then joins the cameras chosen; while `camsPicked` is false, the file's camera is the only one.

## Profiles and slots

A profile is whatever is in slot 1 to 6 with its bit set in `D6B2` (`src/design.js`).

- `Design.addProfile` and `Design.addValues` take the first free slot, so a profile added after a Remove lands in the freed place, not at the end.
- `Design.removeProfile` clears the bit and puts the slot back to the camera's factory values and name. When the default profile is removed, the file starts the camera in the first profile (see Saving).
- `Design.moveProfile(doc, from, to)` moves values between slots: the slots stay and the order the camera lists them changes. `D124` (the default profile) follows its profile. The change records move first (`App.moveRecs`), and the selection follows its profile (`wireProfiles` in `src/app.js`): the selection names a profile, not a place.
- `Design.replaceValues` gives a slot new values and a name: the first library profile in place of the untouched first one.
- `st.sel` is always a saved profile (`fixSel()`).

## Changed

`src/changes.js`, a pure module. A value is changed when it differs from what its own profile held when it came into the design. One function, `Changes.compute`, says so, and every view reads it.

- **The records** (`st.recs`, one per saved profile, keyed by its slot). A profile from the starting point has `{ id, from }` and compares with the start, `origin.S` at slot `from`. A profile added since (from the library, Saved, Blank, Duplicate, Add all) has `{ id, at, name }` and compares with `at`, its values as it arrived; it arrives with no dots. `lib` names the library entry it came from (see Library). `Changes.start(doc)` makes the records when a design begins; `Changes.settle()` runs in every `save()`, giving a new profile its record and dropping the records of profiles that are gone; `Changes.move()` moves records with their profiles. A record leaves with its profile. Settings of the whole camera compare with the start's slot 0.
- **The lines**, in this order: Added GOLDEN; Removed SUNNY; Moved FAST to 2 (start profiles out of their old order); Renamed USER1 to GOLDEN, which also puts a dot on the name ("Was USER1"); then one line per changed value against each profile's own record, "PUNCHY: Shutter speed limit 1/(4f) to 1/2000", or "Every profile: ISO Auto to 64" when every profile changed the same way. With one profile a value line has no name in front. A list (Favorites) is named, without its items.
- **The default profile line** is "Default profile GOLDEN", when the camera would start in a different profile than at the start. The default is judged by which profile it is, not by its slot: it follows its profile when profiles move, and a profile that took the start's default's place counts as that default. A file that names none (a camera's own export, `D124` 0) starts the camera in the first profile once anything changed, so that is a line too.
- **The untouched first profile** that the first library profile takes the place of leaves with no Removed line (`st.drop`, `App.renew`), so that step is one line: Added GOLDEN.
- **What reads it** (`App.changes()`, worked out once per redraw): the red dot in a value's mark place and its tooltip, "Was 1/(4f)" (`App.markedAt`, `App.wasAt`, `App.edited`, `App.wasText`); the count in the top bar, which opens the Save sheet; the Save sheet's Changes row; All settings' Changed filter; whether the design is untouched (`placeholder()` in `src/app.js`, `untouched()` in `src/q3page.js`); the default profile Save writes; whether a camera change says what it changed. The count is the number of lines, and every dot is covered by a line.
- **Checked by** `test/changes.test.js`: four library profiles arrive with no dots and each edit gets its own (the owner's screenshot of 2026-11-19); every profile step (Duplicate, move, remove, Blank) makes one line and no marks; a move of a start profile is one line and no dots, and a rename marks the name; a removed start profile and a profile added after it read as Removed and Added, never a rename; the same change in every profile is one line; every mark is covered by a line, and the state from before the edits has none. The state walk checks the same after every step on the drawn page (see Checks).

## Library

`src/library.js`. The starting sets, Factory left out, as groups of single profiles in the order of design rule 8, each entry with one line.

- **Entries are known by id**: the set's id and the profile's place in it (`street-3`). A profile added from an entry is tagged with that id in its record (`App.tag`), and `App.fromLibrary(id)` says whether one is in your profiles, renamed or not. The row then shows a green tick in place of its +. Another group's NIGHT stays addable; a second NIGHT gets the name Duplicate would give it.
- **What an entry brings** (`LIBRARY.valuesFor(entry, model)`): every setting on the Exposure, Image and Shooting pages, and the tuning of every film style, as its own set makes them on the design's camera. `Design.addValues` copies your first profile, then lays these on top, then the name. So Buttons, Favorites, Screen and Camera come from your first profile, and the same entry gives the same three pages whatever was added before it.
- **Saved** (`msetter-yours-v1`, in this browser only, outside the design and Undo): Save to the library keeps the same three pages of a profile, whole, under its name. An entry's id is `yours:` and its name. A second save with the same name replaces the first, and Remove from the library has no Undo.
- **The first add** on the untouched first profile (`placeholder()`: one profile, starting set Factory, no changes, no opened file) takes that profile's place (`Design.replaceValues`, `App.renew`). The starting set stays, so each camera's file keeps that camera's own factory values for everything the profile doesn't set.
- **Add all** on the untouched first profile starts from the whole set (`useSet`: its buttons, Favorites and screen layouts too, and the set's name in the top bar). Otherwise it adds the group's entries not in your profiles yet, as many as fit in six, and the notice names what it added and what had no room ("Added NIGHT and MONO. No room for DAY"). The + and Add all are off at six.
- **Checked by** `test/library.test.js`: every entry has its own id; on the M11-P and the M-EV1, every entry added after a tripod, a flash, a black and white and a long-exposure profile has the Exposure, Image and Shooting values it has alone; for three pairs of cameras, adding any entry leaves the other camera's file as Factory makes it for every setting the entry doesn't set; a saved profile comes back with its three pages.

## Rows

A row of the table is one bar (one value across the columns, linked dots at its end) when there are two or more profiles, every profile holds the same value (`sameAcross` in `src/rows.js`), and the row is not marked apart in `st.split` (`joined` in `src/table.js`). `scopeOf(code)` uses the same test, so a bar's change goes to every profile, from the table, the editors and the pretend camera alike.

- **A row joins only when it starts equal or when asked.** The mark is keyed by the row's code, or its name for rows without one (Contrast, Sharpness, Saturation, which follow each profile's film style).
- **What marks a row apart**: a change to one profile's value (`setRow`), Set per profile (`splitRow`), an editor working on one profile, and `keepApart()`, which runs in every `save()`: every row whose values differ is marked apart, and so is every per-profile setting without a row of its own whose values differ. So a step that makes values equal again (removing a profile, Undo, a camera change, a Favorite toggled on the pretend camera) never joins a row.
- **What clears it**: Use … in every profile and Same in every profile… (`useEverywhere`, when the values end equal), a part set (`pickPart` clears its codes and its kind's rows), a new design (`begin`). Undo and Redo bring back the marks the step held.

## Doors

What comes in from outside is typed at the door, before anything reads it. A file can be hand-made, and the one-file copy of the page has no content security policy.

- **An opened file** (`Engine.parse`): only keys of four hex digits are read, so `__proto__` and other odd keys never get in. Codes the camera's rules don't know are kept as they are in `doc.extra`. `Engine.sanitize` then types every slot: numbers where the setting holds numbers, text where it holds text, numbers in lists. A slot of the wrong kind, or the wrong number of slots, takes the factory value and is listed in `doc.unread`; the page lists it with the values the camera can't use ("could not be read, so it is the factory value").
- **The stored design** (`profile-maker-v1`, `load()` in `src/state.js`): the design and its starting point are typed like an opened file, and the fields around them (`targets`, `split`, `parts`, `bases`, `recs`, `drop`, `sel`) are checked for their shape. A stored design that throws while loading or drawing is shelved (`shelve()`): kept under `profile-maker-v1-broken`, removed, and the page starts fresh and says "Your profiles in this browser couldn't be read, so this is a fresh start. A copy is set aside."
- **Saved** (`LIBRARY.yours()`): only entries with a text name and a set of values; only values under codes of four hex digits and of the kinds a setting holds; names cut to ten characters.
- **The Q files held** (`msetter-q3-v1`): a held file that no longer reads as its model is dropped.
- **Into the page**: text from a file or from storage (names, Artist, values) goes into markup through `esc` (`Words.esc`).
- **A write that fails**: `save()` says once, "This browser isn’t keeping your profiles: its storage is off or full".
- **Another tab**: a change in another tab to the stored design, Saved or the Q files shows "Changed in another tab" with Reload. This tab doesn't read the new copy by itself, and saving here would overwrite it.
- **Checked by** `test/hostile.test.js`: a file with quotes, tags, objects, nulls, lists, `true` and `NaN` in its values and `__proto__`, `constructor` and a key that isn't hex opens with every value of its setting's kind, nothing reaches the prototype or the saved file, and the slots it replaced are listed; a camera's own export needs no typing and saves byte for byte; a stored design with the wrong shapes is typed back into shape.

## Q3 experiment

`src/q3page.js` keeps, per Q model, the owner's file in the browser's storage (`msetter-q3-v1`), outside the design and Undo:

`held[m] = { text, name, at, saved?: { text, changes: [{ code, slot, p, to }], at } }`

Every decision about it is a pure function in `src/q3.js`, tested in `test/q3.test.js`:

- **`Q3.openPlan(held[m], text)`** says what opening a Q3 file does:

  | Mode | When | What the page does | The new file is held |
  |---|---|---|---|
  | first | nothing held, or the held file can't be written and the new one can | holds it, shows the Q3 sheet; an untouched design takes its settings | yes |
  | again | the file is the one Msetter saved | says to import it first | no |
  | check | Msetter saved a file after the held one was opened | Q3 import result | yes |
  | compare | anything else | What changed between the two exports | yes, unless it can't be written and the held one can |

- **`Q3.baseFor(origin, m, factory)`**: Save writes a setting into model `m`'s file when the design's value differs from this base: the design as it came from that model's file (`origin.q3 === m`), or else the M's factory settings. Untouched M defaults never overwrite the owner's Q3 values.
- **`Q3.designIsFrom(origin, m, held[m])`**: the design came from this very file (`origin.q3at === held[m].at`). If not, the Q3 sheet offers Use this file's settings.
- **`Q3.canWrite(text)`**: firmware 4 (told by `D31B` and `D3DB`, which only firmware 4 writes) and laid out exactly as the camera writes. Other files open and compare but don't save.

A design "untouched" enough to take a new Q3 file's settings has no changes since it started from the factory settings or from a Q3 file (`untouched()`). Close file deletes `held[m]` and its saved record. The Q cameras are offered in a browser only: in the Mac app and on claude.ai the camera menu has no Experimental group, the Save sheet has no Q rows, and a Q file doesn't open (the page says where it does).

## Layers on the page

`src/ui.js`. Every layer opens through `layer()`: a stack of sheets, a popover menu, the tip of an (i) and the notice. A sheet or a menu is named after its title, keeps Tab inside it, and gives the focus back to what opened it. Escape closes the top layer only. Undo, Redo and opening a file close every sheet first. ⌘Z does nothing while a sheet is open or a text field has the focus. A sheet closed by the person redraws the page.

- The notice shows for 4 seconds, 4.8 with a tick, and a receipt (lines that tick in, after a file opens) 4 seconds plus 0.4 a line. Any later change or click hides it. Over a sheet it has no buttons.
- The camera menu stays open while cameras are tapped and redraws its ticks in place.
- A tip never shows while a menu is open.

While a pointer is down, `changed()` waits for the click to land before drawing (`src/app.js`), so a redraw never swallows a click.

## Movement and ticks

`Motion` (`src/motion.js`) holds no design state: the hint for the next redraw (`undo`, `redo`, `reorder`), the place a library card flies from, the field to tick after the next redraw (`tickNext`), and the sections already risen this visit. Every tick and fade is an animation of its own element, never a timer, so a redraw takes it away with its element and nothing is left behind.

- A tick draws in a value's mark place after a redraw that changed one or two values, then the red dot shows there if the value differs from its record. Never after Undo, Redo or a move: their notice says what came back. A typed value or a profile name already shows before the redraw, so it ticks through `tickNext`.
- A library card flies in from its + only when its place is on the screen.
- Reduced motion turns movement off; ticks still show.

Design rule 11 has how marks are drawn.

## Pretend camera

`Camera.sim` in `src/camera.js`: live view, the open screen list, the screen layout shown, exposure compensation, zoom, peaking and crop. Changing the camera drawn closes the list and turns live view off; changing the profile closes the list and resets exposure compensation; any value change resets zoom, peaking and crop only. Entering the Screen page closes the list, turns live view on and shows layout 1. An open screen list keeps the values it opened with until it is closed.

## Saving

`saveWords()` in `src/save.js` turns every save result into the button's words: `saved` → Saved; `cancelled` or `declined` → Save file; unavailable (claude.ai without downloads) → This page can't save files here; another camera's card → Another camera's card; anything else → Not saved. Card writes in the Mac app say Written, Another camera's card or Not written, with no line of reason. After a save, a checklist ticks in under the camera's row (`savedChecks`); it and the button's words go when the sheet is drawn again (a camera or the default profile chosen in it). The Save sheet redraws when cards are mounted or removed while it is open. A browser can't tell when a download is canceled, so a Q3 Save always records `saved`.

The default profile (`D124`) is decided when the file is made (`defaultProfile()`): the design's own default when it is a saved profile. A camera's own export names none (0); that stays 0 while nothing has changed, and once anything has, the file starts the camera in the first profile, which the list of changes says. The Save sheet's Default profile row shows what the file will hold.

## Known gaps

- An open list on the pretend screen shows the values it opened with.
- `held` is read once per page load: two tabs open at once overwrite each other's Q3 files.
- A press dragged out of the window and released there leaves the page waiting for the click to land until the next click.
- One value, two rows: Look's Saturation is marked apart by its name, its row in All settings by its code, so Set per profile on one leaves the other a bar while the values match.
- `placeholder()` and the Q page's `untouched()` are two tests for an untouched design: a Q design with one profile counts as untouched, so the first library + takes its profile's place.
- `camsPicked` is outside Undo: tap a camera, Undo, then open a file, and the file keeps the cameras chosen before.

## Checks

`zsh tools/check.sh` runs all of them; [code-map.md](code-map.md) lists each one and the order.

**`App.checkState()`** (`src/app.js`) returns the rules the page breaks, as a list; it is empty when all hold:

- the selected profile is a saved one;
- there are one to six profiles, no two with the same name;
- the design is on a picked camera, and the start is on the design's camera;
- no record is left for a profile that is gone;
- the top bar's count is the number of lines of changes;
- every dot has a line that names its setting or its profile;
- no bar on the page holds values that differ.

**`test/state-walk.js`** calls it after every step of a seeded random walk through the page's own events (library adds, Add all, Saved, Blank, Duplicate, Remove, moves, Set per profile, Use … in every profile, part sets, filters, sections, Undo, Redo, Start over, opening a file, cameras, the default profile, and value edits through each control's own menu). After every step it also checks each step's promises: a profile step marks no value and adds no Renamed line; an edit marks its value unless the value is back at its record; a row joins only when it starts equal or when asked; Undo then Redo returns the same state; a bar's change goes to every profile; a pick that changed nothing leaves a notice with no button; the cameras are offered ones, in order; the starting set and part sets are real ones; the default profile is saved, or 0 as in a camera's own export. A failure prints its seed and its last steps. The full check runs 300 steps on seeds 7, 11 and 23, after the browser flows. The browser flows don't call `App.checkState()`.

The other checks of these rules: `test/changes.test.js` (Changed), `test/library.test.js` (Library), `test/hostile.test.js` (Doors), `test/q3.test.js` (the Q3 state and transfer), `test/scripts.test.js` (a change that changes nothing makes no Undo step), `test/flows.js` (the Q3 experiment end to end, Undo only when something changed, Undo and Redo in every flow) and the save proof (`test/save-golden.js`: no saved M file changed).
