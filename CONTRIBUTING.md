# Contributing

Msetter is plain HTML, CSS and JavaScript with no build step. Open `index.html` from a local server and it runs.

## Run the checks

```
npm install
npm run check          # everything: unit tests, generated files, the save proof, Chrome and WebKit, the browser flows
npm run check:quick    # the Node tests and generated files only
```

`zsh tools/check.sh` is the same thing. Every check also runs on every push. A change that breaks a check isn't merged.

What the checks guard, each with its own file in `test/`:

- **Every saved file is right.** The save proof makes 2,903 files from fixed designs and compares each with a recorded copy. A difference fails it. A recorded copy is changed only after a file-by-file comparison shows every difference is intended.
- **One meaning of changed.** The red dots, the count, the list of changes and the Changed filter all come from `src/changes.js`.
- **The page's rules hold.** A seeded random walk takes hundreds of steps through the page and checks its rules after each (`test/state-walk.js`); a failure prints its seed.
- **The design rules hold on the drawn page.** `test/design-rules.test.js`, `test/contrast.test.js`, `test/marks.js` and `test/layers.js` measure them: type sizes, tools, corners, colors and contrast, nothing drawn over anything, nothing cut.
- **Words.** `test/voice-words.json` holds the word list; `test/voice.test.js` reads every word a person can see in the app, the page, the README and the docs.
- **Nothing untrusted gets in.** Opened files and stored data are typed at the door; a hostile file can't put markup in the page.
- **No dead code.** Every style, listener and export is used.

## Report a problem

[Open an issue](https://github.com/timoarnall/msetter/issues/new?template=bug.md). Say which camera and firmware, which browser or the Mac app, Msetter's version (in About, in the … menu), what you did and what happened. If a file is part of it, attach it with the artist, copyright and the camera's serial in its network name removed.

Problems are sorted by how often they happen and how bad they are, each 1 to 10. A score under 5 stays an open issue for later.

## Correct a setting

A setting's name, allowed values and factory value come from `src/rules.js`, which is generated: don't edit it. To correct one, open an issue with an export from the camera that shows it, and the camera's firmware.

Plain names, help and grouping are in `src/catalogue.js`. After changing it, run `python3 tools/build_docs.py` and check in what it writes.

## Add a set

Library profiles come from the sets in `src/sets.js`; their one-line descriptions are in `src/library.js`. Every value in a set must be allowed on the M11-P and the M-EV1: the tests check each one and convert it to the other cameras. A set for buttons, Favorites or screen layouts goes in `PART_SETS` in the same file, with a version for any camera that lacks a job or item.

## Pictures

Every picture on the project page and in this README is made from the live app by `node tools/shoot/docs.js`, then `python3 tools/build_site.py` writes the page. Run both after a change the pictures show.

## Never accepted

- Leica's own files, manuals or artwork, or anything taken from them
- Anyone's camera export that still holds their name, copyright or the camera's serial
- Code that makes a network request: the app runs with no server, and a test fails on any request
- A value written to a file without checking it against that camera's rules
