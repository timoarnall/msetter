# What about the Q

Msetter makes settings files for the Leica M11, M11-P, M11 Monochrom and M-EV1. It can't make them for the Q3, Q3 43, Q3 Monochrom or Q2 yet. This page explains why in plain words, what it would take, and how Q owners can help. Below that is everything known so far about the Q's settings file, for anyone who wants to take it further.

## Why not yet

**Reading a Q file is easy.** The Q3 saves its user profiles to the card as `settings.lcs`, a text file laid out the same way as the M's. Anyone can open it, and several people have written tools that do.

**Writing one safely is hard.** A Q3 file on firmware 4.1 holds 586 settings, and each one is stored as a number. To change a setting, an editor has to know which number means what, and which numbers the camera will accept. A wrong guess fails silently. On the M bodies, the camera skips a value it doesn't accept and shows no message, so a profile can look loaded when it isn't what you designed. Nobody has yet reported what the Q does with a value it doesn't accept.

**On the M the camera's own list can be read. On the Q it is encrypted.** Every camera's firmware carries a table of its settings: each code, the values it allows and its factory value. The M11 family's firmware is not encrypted, so that table can be read directly, and Msetter's rules for the M bodies come from it. Every setting and every allowed value is checked against the camera's own list, not guessed. The Q3's firmware is encrypted and no key has been published, so its table can't be read. The same list has to be rebuilt from outside the camera.

**From outside means one setting at a time.** Change a setting on the camera, export, and compare the new file with the one before. Note which code changed and to what. Repeat that for every setting, and for enough of each setting's options to be sure how they are numbered. Then check that the camera takes edited values back when you import a file. [What it would take](#what-it-would-take) counts the work.

## Where it stands

Every code in a Q3 file on firmware 4.1 has been matched as far as the public evidence allows. The full list is in [every Q3 code](leica-q-codes.md).

| How sure | Codes | Meaning |
|---|---|---|
| Known | 75 | Two independent sources agree, or the camera's own USB list confirms it. |
| Likely | 222 | One strong clue, such as the manual's option list matching the values in the file. |
| Guess | 164 | A clue that fits but proves nothing, such as the code's neighbors. |
| Unknown | 125 | No clue yet. |

**Solid enough to build on.** The buttons, the Auto ISO limits, the Look a profile uses, focus mode, AF mode and subject detection, drive mode, file format, the self-timer, and the four photo screen layouts (info profiles).

**Still open.** Several button job numbers, the custom function lists, what the Look adjustments are, most of the video settings that firmware 4 added, and about a dozen runs of codes with no clue at all.

**Nothing has been tested on a camera.** No one has yet imported an edited file on a Q3 and checked what arrived.

## Who else tried

Each project below got the file open. None got as far as knowing which values the camera accepts.

**[Leica Dial & Dot](https://github.com/NikolasEisberg/Leica-Settings-App)** (Q3, October to November 2026). A desktop app that opens and saves Q3 files without disturbing them, copies profiles and compares two files. Its menus cover 61 of the 346 settings in a file from before firmware 4, and a 4.1 file has 240 more. Its value lists don't match the camera's own: drive mode offers 0 to 7, while the camera accepts 0, 2, 5, 6, 7, 8, 9, 11 and 14. Nothing in the repository shows a test on a camera.

**[Leica-configurator](https://github.com/scuba-maldives/Leica-configurator)** (SL3, February 2025). A Windows and Mac app for the SL3's buttons per exposure mode, its wheels, profile names, artist and copyright. It was written over three days and hasn't changed since. Its code marks the video controls "ALL VIDEO TO FIND YET!!!".

**[leica_q3_hack](https://github.com/clippit/leica_q3_hack)** (Q3, December 2024 to April 2025). It documented the Q3's Wi-Fi protocols and the layout of its firmware file. The firmware's outer layer is a simple scramble that is easy to undo, but the sections inside appear to be encrypted. The project stopped there.

**[libgphoto2](https://github.com/gphoto/libgphoto2/pull/1370)** (Q3 43, November 2026). The open-source camera library named 17 Q3 settings, most with their values, by changing one setting at a time over USB on a Q3 43 with firmware 4.1.1. The camera offers only 65 properties over USB, and just 43 of them are in the settings file. The commits say they were generated with an AI coding tool, and a later commit corrects one swapped pair of values.

**The Leica forum** (2015 to 2024). Owners have opened the file in text editors since the M240 and asked for an editor: [user profiles management](https://www.l-camera-forum.com/topic/393838-user-profiles-management/), [hand-editing exported user profiles](https://www.l-camera-forum.com/topic/249771-hand-editing-exported-user-profiles), [listing and editing user profiles](https://www.l-camera-forum.com/topic/378757-listing-editing-user-profiles). In the first of those threads, a member was said to be drafting an app to store and edit profiles in 2024, and then it went quiet. In [a thread on moving a Q2 profile to a Q3](https://www.l-camera-forum.com/topic/383015-transfer-user-profile-to-q3-from-settingslcs-file/), a reply judged decoding the file more work than setting up new profiles by hand.

**Shared setups.** Photographers share whole files to import as they are: [Hudson Henry](https://www.hudsonhenry.com/leica-q3-settings-file-page) for the Q2, Q3 and Q3 43, and [Leica Store Australia](https://www.leica-store.com.au/sl3settings) for the SL3. These copy one person's camera. They don't let you edit anything.

All of them stopped at the same wall. Reading the file is easy. Knowing the values takes either the camera's own list, which is encrypted on the Q, or one test per setting.

## What it would take

**One test.** Each test follows these steps.
1. Change one setting in the menu.
2. Export (Menu › User Profile › Manage Profiles › Export Profiles).
3. Move the card to a computer and compare the new file with the last one.
4. Write down the code and the value, then put the card back.

That takes about two minutes once practiced. Only one change per export works: two changes in one export can't be told apart.

**Naming every setting.** 511 of the 586 codes aren't known yet. Several runs repeat one layout: four video screen layouts, four video profiles and eleven Looks slots. A test on one copy shows the pattern for the others, so roughly 300 tests remain. That is about ten hours at a camera.

**Confirming the values.** A setting with eight options needs up to eight tests to prove how its options are numbered. Testing every option of the hundred or so settings an editor would offer comes to about 600 more tests, or around twenty hours. For the rest, the first and last option usually show the pattern.

**Checking import.** Write a file with 30 to 50 edited settings, import it, export again and compare. The comparison shows which values arrived and which the camera skipped. A few dozen imports would cover every setting an editor offers.

**Each model and each update.** The Q3 43 writes one extra setting, and some values follow the lens, such as digital zoom. Nobody has shared a Q3 Monochrom file. The Q2 writes a smaller file of 177 codes with its own numbering. Firmware 4.0 added 255 settings to the Q3 and dropped 15, so a large update means checking again.

**Shared across owners.** Split by menu area, every part becomes a few hours' work for one owner. A tool that compares two exports and names the codes that changed would cut each test to the menu change and the export.

## How to help

**First export your own settings.** Do it every time, before any test (Menu › User Profile › Manage Profiles › Export Profiles), and copy `settings.lcs` off the card. That file is your way back.

**Most useful: a factory-reset export from firmware 4.1.1.** Export your own settings and keep the file. Reset the camera, then export again and import your own file back. The reset export shows every factory value at once, which settles many of the guesses.

**One-change pairs.** Export, change one setting, export again, and keep both files. These tests settle the most:
- Exposure Metering set to Center-Weighted. The public USB label and this page disagree on its number.
- FN 1 set to Color Temperature, to check whether job 106 is Color Temperature.
- One change in Customize Control › FN Buttons, to tell the custom function lists apart from the Control Center.
- Sharpness changed on the Standard Look, to name the Look adjustments.
- One video resolution and its frame rate changed, to confirm the video profiles.

**USB list.** On a Q3, Q3 Monochrom or Q2, `gphoto2 --summary` lists the settings the camera offers over USB and the values it allows.

**Sharing.** Open an issue with the camera, its firmware version (Camera Information in the menu), the files and what you changed. Blank `501E` (Artist) and `501F` (Copyright) first. The files go into a public issue, so share only what you are happy to publish.

## Technical details

**File.** `settings.lcs` at the top of the card. The name must be exact: a browser download renamed `settings(1).lcs` is ignored. It is JSON, formatted the same way as the M's `.lcse`: two-space indent, no space after colons, each value on its own line, no byte-order mark and no final newline. There are two top-level keys, `Camera` (`LEICA Q3`, `LEICA Q3 43`, `LEICA Q2`) and `Settings`. There is no `Version` key. Codes are in a fixed order that is not sorted, and the first is `D054`.

**Kinds of value.** In a Q3 file on firmware 4.1:
- 552 codes hold seven numbers: the live settings, then profiles 1 to 6.
- 26 codes hold seven strings. Among them, `DA01` to `DA16` are 32-hex-digit records, described under Looks below.
- 6 codes hold one string each: the profile names, `D037` to `D03A`, `D0AD` and `D0AE`, the same codes as on the M.
- 2 codes, `D1FA` and `D1FB`, hold 21 numbers, three per slot. They read 36, 1, 95 in every slot of every file seen, the SL3's included. Their meaning is unknown.

**Profiles.** A Q file has neither `D6B2` (the M's saved-profiles mask) nor `D124` (the start profile). Import replaces all six profiles, empty ones included, and export writes all six (Q3 manual, User Profiles; owners confirm). A profile can hold 255 or -1 for a setting it doesn't store. In one shared file, a landscape profile has these in 24 codes, among them autofocus, thumbwheel and Look settings. Twelve more codes hold 255 or -1 in every slot.

**Models.** The camera refuses a file from another model. The Q3 manual: "Leica Q3 profiles can therefore not be used on a Leica Q3 43 or Leica Q3 Monochrome." Forum owners report Q3 and Q3 43 files failing in both directions, and a Q2 file refused by a Q3. The on-screen message hasn't been recorded. The Q3 43 writes 587 codes, one more than the Q3 (`D17A`). Between one photographer's Q3 and Q3 43 files, 76 codes hold different values. Some follow the lens, such as digital zoom (28 mm on the Q3, 43 mm on the Q3 43), and the rest are the photographer's own choices.

**Firmware.** A Q3 file from before firmware 4 has 346 codes, and one from 4.1 has 586. Firmware 4.0.0 (December 2025) brought AI eye and face autofocus with human and animal detection, two AF modes in place of Multi-Field and Spot, a Digital Zoom Steps menu kept separately for photo and video, Video Profiles in the menu, a touch interface with Favorites folded into the Control Center, an intensity setting for Looks, rotating info bars, and merged File Format and Compression. Leica's release notes: [4.1.1](https://leica-camera.com/sites/default/files/-4.1.1--Q-Family-Release-Notes-EN.pdf), [4.1.0](https://leica-camera.com/sites/default/files/2026-05/-4.1.0--Q-Family-Release-Notes-2_EN.pdf), 4.0.0 in [Dutch](https://leica-camera.com/sites/default/files/NL_-4.0.0--Q-Family-Release-Notes.pdf) and [Japanese](https://leica-camera.com/sites/default/files/JA_-4.0.0--Q-Family-Release-Notes.pdf) (the English PDF has been taken down). Profiles survive updates: the camera offers to save them to the card first. Whether a file from older or newer firmware imports is not known.

**Other Leica files.** The Q2 writes the same format with 177 codes, and keeps the names of profiles 5 and 6 in `FF16` and `FF17`. The SL3 writes JSON that strict parsers reject: `D088` has trailing commas, such as `[0,]`. An editor should read it leniently and write it back the way the camera does.

**Shared with the M.** About 100 Q3 codes also appear in M11 files. The same code usually means the same thing, but not always:
- `D13E`, the M's Film Style, stays 0 in every Q3 slot, even in a black-and-white profile. Firmware 4 selects the Look with `D69C`.
- `D00C`, the Auto ISO shutter speed limit, stores Auto as 0 on the Q3. The M's 1/f options don't exist there.
- `D050`, the M's digital zoom, stays 0. The Q3's is `D21D`.
- The codes the M uses for FN 3 and the FN 4 lever are the Q3's center button and thumbwheel button.
- `D097`, the self-timer, uses different numbers, and its on/off moved to `D32D`.
- `D003`, `D017`, `D09E` and `D0A0` hold values the M doesn't allow, and `D01A` and `D134` offer different options.

**Buttons.** One numbering covers the buttons, the custom function lists and the Control Center tiles.

| Control | Photo | Video | Review |
|---|---|---|---|
| FN 1 | `D191` | `D1BD` | `D190` |
| FN 2 | `D193` | `D1D1` | `D192` |
| Center button | `D195` | `D1D5` | `D20F` |
| Thumbwheel button | `D1D6` | `D1D8` | `D194` |

The photo codes are known. The factory values (21 Digital Zoom, 36 Photo-Video, 37 Toggle Info Levels, 11 ISO) match the manual's factory settings. The video and review codes are likely. Known job numbers include 3 Magnification, 4 Drive Mode, 5 Self-timer, 6 Interval Shooting, 7 Exposure Bracketing, 8 Capture Assistants, 9 Exposure Metering, 10 Exposure Compensation, 11 ISO, 12 Auto ISO Settings, 15 White Balance, 21 Digital Zoom, 26 User Profile, 36 Photo-Video, 37 Toggle Info Levels, 44 Focus Mode and 45 AF Mode. Still open: 88, 92, 106 and 124. The full table is in [every Q3 code](leica-q-codes.md#button-jobs). `D1D7`, `D1D9`, `D1DA` and `D1DB` are SL3 buttons the Q3 doesn't have; their values never change, so an editor copies them through.

**Thumbwheel.** `D1ED`, `D1EE`, `D1EF` and `D1F1` look like the thumbwheel's job in P, S, A and M (likely): 0 Auto, 1 Exposure Compensation, 3 ISO. `D1E7` to `D1EA` may be the video equivalents (a guess).

**Custom lists and Control Center.** `D054` to `D05D` with `D070` (photo) and `D10A` to `D113` (video) are packed lists of job numbers ending in 0, with no header. On a reset camera they are empty. They are probably the list behind Customize Control › FN Buttons, though Favorites is the other reading. `D31B` to `D32A` look like the Control Center's eight tiles per mode, alternating photo and video (likely).

**Exposure and focus.** `500F` ISO, `D00B` Maximum ISO (200 to 100000), `D00C` Shutter Speed Limit in 1/256-stop steps with 0 = Auto, `D0D3` Maximum ISO with flash, `5010` exposure compensation in thousandths of a stop, and `500B` metering (0 Spot, 1 Center-Weighted, 2 Multi-Field, 32769 Highlight-Weighted). `500A` focus mode (0 AFs, 1 AFc, 5 Intelligent AF), `D137` AF mode, `D0BF` subject detection (0 Off, 1 human, 4 animal). `5013` drive mode (0 Single, 2 Interval, 8 Bracketing, with 5, 6, 7, 9, 11 and 14 as the continuous speeds).

**Looks.** `D69C` is the photo Look and `D69D` the video Look: 11 Monochrom High Contrast, 12 Vivid, 13 Natural, 15 Standard, 16 Monochrom, and 21 for a downloaded Look. `DA01` to `DA16` are the installed Looks list: 11 slots (5 core Looks and 6 downloaded) in identical odd and even pairs, probably photo and video. Each record is 32 hex digits: digits 0 to 7 hold the Look ID (0 = empty), digits 8 and 9 hold 0x64 (100, probably intensity in percent), digits 10 to 14 hold five values that all read 1, and the rest are zero. The Look adjustments (`D08A` to `D094`, `D0B0` and `D0B1`, `D1AE` to `D1B7`) are placed per Look. Contrast is known. Sharpness, Saturation, Highlights and Shadows are likely, and every value seen is 0.

**Screen layouts.** The four photo info profiles (`D15E` to `D172`, with `D01F`, `D0C4`, `D139` and `D13A`) are known. The unsaved profiles of an older file match the manual's four factory layouts exactly. Firmware 4 added four video layouts in `D27E` to `D316`, with info bars, grid, zebra, peaking, level gauge, histogram and frame lines in the manual's order (likely). Frame-line ratios pack the numerator × 100 in the high 16 bits and the denominator in the low 16, giving 4:3, 5:3 and 37:20.

**Video.** `D380` to `D3B3` are four video profiles of 13 codes each. Each holds a frame rate for every MOV resolution (C8K, 8K, C4K, 4K, FHD ProRes, FHD, FHD Slow Motion) and every MP4 resolution (8K, 4K, FHD), stored as frames per second × 1000, so 59940 is 59.94 fps. The first code of each profile holds the code number of the selected resolution's frame-rate setting (a guess). The working frame rates sit in `D103` to `D105`, `D1DC` to `D1DE`, `D214`, `D215`, `D217` and `D218`. `D0DE` to `D109` repeat the photo settings for video: focus, AF mode, ISO, maximum ISO, color temperature.

**Over USB.** A Q3 43 on firmware 4.1.1 offers 65 properties over USB. 43 of them are in the settings file, and libgphoto2 names 17 of those, most with their values ([PR 1370](https://github.com/gphoto/libgphoto2/pull/1370), [PR 1371](https://github.com/gphoto/libgphoto2/pull/1371), [the dumps](https://github.com/gphoto/libgphoto2/tree/master/camlibs/ptp2/cameras)). Stabilization, noise reduction, flash, shutter type, AF assist light, perspective control and video profiles can't be reached over USB. A Q3 on firmware 1.2 listed 49 codes without values ([gphoto2 issue 601](https://github.com/gphoto/gphoto2/issues/601)), and an SL3 refused every query ([issue 1203](https://github.com/gphoto/libgphoto2/issues/1203)).

**Largest unknown runs.** `D05E` to `D07D` (17 codes, mostly 0, between the grid and auto magnification settings), `D0F4` to `D102` (11: audio, iDR or LUT candidates), `D179` to `D184` (11), `D3DB` to `D3E2` (8, new in firmware 4, set per profile), and smaller groups in `D154` to `D15A`, `FF26` to `FF47`, `D34x` and `D189` to `D18F`.

**Sources.** Hudson Henry's shared Q2, Q3 and Q3 43 files, whose six named profiles (Standard, B&W, LS / Pano, People, Animals, Bracketing) show which codes move together. A Q3 file from before firmware 4, from the Dial & Dot repository. The Q3 manual's menu overview and factory settings. The libgphoto2 USB tests. The M11 family's settings tables for the codes the two lines share. The two editors above, given little weight. Each code's own evidence is listed in [every Q3 code](leica-q-codes.md), and the data is in [`leica-q3-codes.json`](leica-q3-codes.json). Rebuild the list with `python3 tools/build_q_codes.py`.
