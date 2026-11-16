# Settings documentation

How Leica M11-family cameras store user profiles and settings in their settings file, what every setting in that file is, and how the camera's controls relate to it. Written for people who make tools for these cameras, and for their coding agents. Msetter, the app in this repository, is built on it.

## Cameras and firmware

| Camera | `Camera` field | Firmware | Codes in the file |
|---|---|---|---|
| M11 | `LEICA M11` | 2.6.4 | 139 |
| M11-P | `LEICA M11-P` | 2.6.4 | 139 |
| M11-D | `LEICA M11-D` | 2.6.4 | 140 (no user profiles and no import; see [cameras](cameras.md#m11-d)) |
| M11 Monochrom | `LEICA M11 Monochrom` | 2.6.4 | 145 |
| M-EV1 | `LEICA M EV1` | 2.6.4 | 139 |

Real camera exports seen so far come from an M-EV1 on firmware 2.6.1 and from an M11-P. Other Leica lines are not covered.

## Files

| File | What it holds | Written |
|---|---|---|
| [file-format.md](file-format.md) | The `.lcse` file: layout, slots, kinds of value, profiles, what import does, the camera's formatting, examples. | by hand |
| [interaction-architecture.md](interaction-architecture.md) | How dials, buttons, menus, Favorites, screen layouts and profiles fit together, and which of them a file can set. | by hand |
| [cameras.md](cameras.md) | What differs between the five cameras, and what moving a file between them does. | by hand |
| [open-questions.md](open-questions.md) | What is not known yet, as questions anyone with a camera can settle. | by hand |
| [settings/README.md](settings/README.md) | Index of every code, and how to read an entry. | generated |
| [settings/](settings/README.md) theme pages | One entry per code: name, plain name, scope, kind, factory value, allowed values with the camera's names, cameras. | generated |
| [settings/button-jobs.md](settings/button-jobs.md) | Every job a button can have, what it does, and where it is allowed. | generated |
| [settings/factory-values.md](settings/factory-values.md) | Every code in the order the camera writes it, with each camera's factory value. | generated |
| [settings/differences.md](settings/differences.md) | Every code that differs between cameras. | generated |

Generated pages come from `src/rules.js` (codes, order, allowed values, factory values, the camera's names), `src/catalogue.js` (Msetter's plain names, help and themes) and `src/engine.js` (the Favorites item a reset camera holds), by `tools/build_docs.py`. Each generated page starts with a line saying so. Do not edit them by hand.

## Words used here

| Word | Meaning |
|---|---|
| Settings file | The `.lcse` file a camera exports to its card and imports from it. JSON text. |
| Code | The four-character key of one setting in the file, such as `D00C`. |
| Profile | One of six saved sets of settings, with a name. The camera also has a Default Profile, its factory settings, which cannot be changed. |
| Slot | One value of a setting. A per-profile setting has seven slots: slot 0 is the live settings, slots 1 to 6 the profiles. |
| Per profile | A setting with seven slots, which can differ between profiles. Almost every setting is per profile. |
| Camera-wide | A setting with one slot, the same whatever profile is in use. Only eleven are. |
| Live settings | What the camera is using at the moment, which may differ from any saved profile. |
| Factory value | A setting's value after Reset Camera. |
| Job | What a button, the thumbwheel or the M-EV1's front lever does when pressed or moved. A number from a list. |
| Screen layout | One of four sets of displays on the shooting screen: info bars, grid, clipping, peaking, horizon, histogram. Leica calls them info profiles. |
| Favorites | A menu page of up to 11 items you choose. |
| Control Center, status screen | The first menu page on the M-EV1 and M11-P: an overview of the camera's state. |
| Auto ISO | The camera chooses the ISO, within limits you set. |
| 1/f | A slowest shutter speed tied to the lens: one over the focal length, so 1/50 s with a 50 mm lens. |
| PTP | Picture transfer protocol, the standard cameras use over USB. Codes starting with 5 are its standard property codes. |

## What counts as known

- Facts shown by real camera exports are stated plainly: the file's layout and formatting, the slot layout, how lists of items are written, the M-EV1's factory values.
- Facts from Leica's manuals cite the manual and page.
- Everything else is marked **Not yet confirmed on a camera**. To find every such statement: `grep -rni "not yet confirmed" docs`.
- Questions with no answer yet are in [open questions](open-questions.md).

## Manuals

Leica's published manuals, cited by short name and page. Page numbers are PDF pages; in the instruction manuals they are also the printed page numbers. This repository holds no copy of them; follow the links.

| Short name | Title | Edition | Link |
|---|---|---|---|
| M-EV1 manual | Leica M EV1 Instruction Manual, English | M EV1/EN/2025/3.0/1 | [PDF](https://leica-camera.com/sites/default/files/pm-24992-Leica-M-EV1_Instructions_en.pdf) |
| M-EV1 quick start guide | Leica M EV1 Quick Start Guide, all languages | English pages 12 to 15 | [PDF](https://leica-camera.com/sites/default/files/pm-24989-Leica-M-EV1_QSG_all.pdf) |
| M11-P manual | Leica M11-P Instruction Manual, English | M11-P/EN/2025/5/2.2.2/1 | [PDF](https://leica-camera.com/sites/default/files/pm-13812-Leica-M11-P_Instructions_EN_2.0.1.pdf) |
| M11 manual | Leica M11 Instruction Manual, English, for firmware 1.4 | M11/EN/2025/5/1.4/2 | [PDF](https://leica-camera.com/sites/default/files/pm-13736-EN_M11_FW1.4.pdf) |

The M11-P manual describes an older menu: it calls the first menu page the status screen and has a Live View switch. The M-EV1 manual matches the current menus more closely. The M11 manual is used only for Copyright Information (p.82), which the newer manuals no longer describe.

These pages paraphrase the manuals. They do not reproduce their text, tables or drawings.

## How to extend this

### When the app's data changes

Run `python3 tools/build_docs.py` from the repository root and commit the regenerated `docs/settings/` with the change. The script needs Python 3 and nothing else. It prints a warning for any code that no page claims; give such a code a page in `PAGES` in the script.

### To add a note to a setting

Short facts the app does not carry (how a number is written, what a manual says, what is not confirmed) live in `NOTES` in `tools/build_docs.py`, one entry per code. Keep each to a sentence or two, cite manual pages, and use the `NOT_CONFIRMED` text for anything not seen on a camera. Then run the script.

### To record a finding

1. Test it on a camera, following [how to test safely](open-questions.md#how-to-test-safely).
2. If it answers an open question, move the question to [answered](open-questions.md#answered) with the date, the camera, the firmware and the result.
3. Update the hand-written page that states the fact, and remove its "Not yet confirmed on a camera" mark. For a fact in a generated page, change `NOTES` in `tools/build_docs.py` and run it.
4. If the finding changes a code's allowed values, factory value or name, open an issue. `src/rules.js` is generated outside this repository and is not edited by hand.

### To add a firmware version

1. Export from a camera on the new firmware and compare its codes, their order and its unused profiles' values with [factory values](settings/factory-values.md).
2. Record the `Version` number it writes in [file format](file-format.md#version).
3. Report differences in an issue so `src/rules.js` can be regenerated, then run `python3 tools/build_docs.py` and update the firmware column above.

### To add a camera

See [adding a camera](cameras.md#adding-a-camera).

### Writing

Plain, literal English: say what a thing does; explain a term the first time it appears; tables where they help; no em-dashes. Use the camera's own words for option names. Paraphrase Leica's manuals and cite the page; never copy them.

## Not made by Leica

Msetter and this documentation are not made by or connected to Leica Camera AG. Leica, M11 and M-EV1 are trademarks of Leica Camera AG.
