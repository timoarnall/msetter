# Leica Q technical details

## What Msetter writes

Msetter writes these into the camera's own export: profile names, exposure limits, white balance and file format on all three; on the Q3 and Q3 43 also copyright, ISO, the four screen layouts with their peaking colors, flash settings, EVF-LCD and EVF brightness, eye sensor, focus aid, Auto Review and the self-timer with their on/off switches, the thumbwheel in A and M, the FN buttons, the thumbwheel button, Favorites, connectivity and language; on the Q2 also film styles with their contrast, sharpness and saturation, focus peaking, Auto Review, Auto Power Off, EVF-LCD, electronic shutter, the thumbwheel, screen brightness, eye sensor, the FN Button and Right Wheel Button, Favorites and the capture assistants of the first screen layout. The Save sheet marks each setting untested until a camera has kept it. Everything else in the file stays as it is. Msetter also compares two exports and names the settings that changed. It can't make files for the Q3 Monochrom.

## Why Msetter can't write a whole Q file

**Reading a Q file.** The Q3 saves its user profiles to the card as `settings.lcs`, a text file in the same format as the M's. Any text editor opens it, and several tools read it.

**Writing a Q file.** A Q3 file on firmware 4.1 has 587 settings (586 in one 4.1.1 file), each stored as a number. To write one, an editor has to know what each number means and which numbers the camera accepts. On the M, the camera skips a value it doesn't accept and doesn't say so, so a profile can import with settings you didn't intend. What the Q does with such a value is unknown.

**Rules.** For the M cameras, Msetter has a table of every setting: each code, its allowed values and its factory value. No such table is available for the Q3.

**Decoding by hand.** Without the table, each setting has to be found by testing. Change one setting on the camera, export, and compare the file with the previous export: the code that changed is that setting, and its new value is that option's number. This has to be done for every setting and for enough of each setting's options to show how they are numbered. Then edited files have to be imported to check that the camera keeps the values.

## What is known

Each code in a Q3 file on firmware 4.1 has a likely meaning and a confidence level, listed in [every Q3 code](leica-q-codes.md).

| How sure | Codes | Meaning |
|---|---|---|
| Known | 95 | Two independent sources agree, or the camera's own screen or the photographer's own words match their own file on a setting changed from factory. |
| Likely | 218 | One strong clue, such as the manual's option list matching the values in the file. |
| Guess | 169 | A clue that fits but proves nothing, such as the code's neighbors. |
| Unknown | 105 | No clue. |

**Reliable.** The photo and video buttons and most of their jobs, the Auto ISO limits, the Look each profile uses and the Look IDs, focus mode, AF mode, subject detection, AF assist lamp, image stabilization, drive mode, file format, JPG size, aspect ratio, the self-timer, EVF frame rate, USB mode, the thumbwheel in P and M, and the four photo screen layouts (info profiles).

**Unresolved.** The thumbwheel in S and A, whether job 88 or 110 is Perspective Control, jobs 92, 95, 96, 103 and 124, the item lists (`D054` and `D10A` runs: Favorites or a second function list), the scale of the Look adjustments, `D3DB` to `D3E2`, most of the video settings, and 105 codes with no clue.

**Factory values.** Ken Rockwell's shared Q3 file (firmware 4.1.0) has four profiles he never saved. They hold the factory value of every code but one, listed in [every Q3 code](leica-q-codes.md).

**Untested.** No file with edited settings has been imported on a Q3. Files with only the `Camera` line changed have (see Models under File format).

## Other tools

None of these projects has a tested list of the values the camera accepts.

**[Leica Dial & Dot](https://github.com/NikolasEisberg/Leica-Settings-App)** (Q3, October to November 2026). A desktop app that opens and saves Q3 files without changing anything else, copies profiles and compares two files. Its menus cover 61 of the 346 settings in a file from before firmware 4. A 4.1 file has 240 more. Its value lists don't match the camera's: its drive mode menu offers 0 to 7, and the camera accepts 0, 2, 5, 6, 7, 8, 9, 11 and 14. The repository shows no tests on a camera.

**[Leica-configurator](https://github.com/scuba-maldives/Leica-configurator)** (SL3, February 2025). A Windows and Mac app for the SL3's buttons per exposure mode, its wheels, profile names, artist and copyright. Its commits span three days, with none since. A comment in its code says the video controls are still to be found: "ALL VIDEO TO FIND YET!!!".

**[leica_q3_hack](https://github.com/clippit/leica_q3_hack)** (Q3, December 2024 to April 2025). It documents the Q3's Wi-Fi protocols and the layout of its firmware file. The whole firmware file is scrambled with a simple fixed pattern, and the main sections inside appear to be encrypted. The last commit is from April 2025.

**[libgphoto2](https://github.com/gphoto/libgphoto2/pull/1370)** (Q3 43, November 2026). The open-source camera library named 17 Q3 settings, most with their values, by changing one setting at a time over USB on a Q3 43 with firmware 4.1.1. The camera offers 65 properties over USB, and 43 of them are in the settings file. The commits say they were generated with an AI coding tool, and a later commit corrects one swapped pair of values.

**The Leica forum** (2015 to 2024). Owners have opened the file in text editors since the M240 and asked for an editor: [user profiles management](https://www.l-camera-forum.com/topic/393838-user-profiles-management/), [hand-editing exported user profiles](https://www.l-camera-forum.com/topic/249771-hand-editing-exported-user-profiles), [listing and editing user profiles](https://www.l-camera-forum.com/topic/378757-listing-editing-user-profiles). In the first thread, a member was said to be writing an app to store and edit profiles in 2024. Nothing was released. In [a thread on moving a Q2 profile to a Q3](https://www.l-camera-forum.com/topic/383015-transfer-user-profile-to-q3-from-settingslcs-file/), a reply judged decoding the file more work than setting up new profiles by hand.

**Shared setups.** Photographers share whole files to import unchanged: [Hudson Henry](https://www.hudsonhenry.com/leica-q3-settings-file-page) for the Q2, Q3 and Q3 43, [Ken Rockwell](https://www.kenrockwell.com/leica/q3-users-guide.htm) for the Q2 and Q3, [Florian Froschmayer](https://www.froschmayer.com/store) for the Q3, Q3 43, SL3 and SL3-S, and [Leica Store Australia](https://www.leica-store.com.au/sl3settings) and [Jono Slack](https://www.slack.co.uk/articles/the-leica-sl3.html) for the SL3. Importing one copies that photographer's setup. There is nothing to edit.

## Work needed to decode the Q

**Test steps.**
1. Change one setting in the menu.
2. Export (Menu › User Profile › Manage Profiles › Export Profiles).
3. Copy the file to a computer and compare it with the previous export.
4. Note the code and the value, and put the card back.

Each test takes about two minutes with practice. Change only one setting per export. With two changes, you can't tell which code belongs to which setting.

**Six settings per export.** Change one setting and save it as profile 1, change the next and save it as profile 2, and so on to profile 6, never changing anything back. Each profile then differs from the one before it by one setting, so one export names six settings. Profile 1 is read against an export made before the first change.

**Naming the settings.** 492 of the 587 codes are not known. Some runs repeat one layout: four video screen layouts, four video profiles and eleven Looks slots. Testing one copy covers the others. That leaves about 300 tests.

**Confirming the values.** To prove how a setting's options are numbered, test each option. A setting with eight options takes up to eight tests. For the hundred or so settings an editor would offer, that is about 600 tests. For other settings, testing the first and last option is usually enough.

**Import checks.** Put 30 to 50 edited settings in one file, import it, export again and compare. The comparison shows which values the camera kept and which it skipped. A few dozen imports cover every setting an editor would offer.

**Other models and updates.** Some Q3 43 values depend on the lens, such as digital zoom. No Q3 Monochrom file has been shared. Firmware 3.1 added 231 settings to the Q3 and removed 14, and firmware 4.0 added 24 more, so large updates need testing again.

**Splitting the work.** The tests divide by menu area, so each owner can take one area. Msetter's comparison names the changed setting, so each test is one menu change and two exports.

## Tests for open questions

**One-change pairs.** Export, change one setting, export again, and open both files in Msetter ([steps](leica-q.md#how-to-help)). These answer open questions:
- Thumbwheel button set to Perspective Control, to tell whether its job is 88 or 110.
- Thumbwheel in S set to ISO, to tell which of `D1EE` and `D1EF` is S.
- Digital Zoom Steps with only 90 mm switched off in photo mode, to test `D3DB` to `D3DE`.
- Vivid Look with Saturation +1 and nothing else, to read the scale of the Look adjustments.
- One item added to Favorites, to tell the item lists from the button lists.
- Touch AF set to Touch AF + Release. `D136` should then hold 2.
- One video resolution and its frame rate changed, to confirm the video profiles.
- Exposure Metering set to Center-Weighted. Value 1 is in no shared file.

**Factory-reset export.** Export your own settings, reset the camera, export again, then import your own file. The reset export shows every factory value on firmware 4.1.1. The 4.1.0 values are known from a shared file.

**USB list.** On a Q3, Q3 Monochrom or Q2, `gphoto2 --summary` lists the settings the camera offers over USB and the values it allows.

**Sharing.** Email devise-put.1y@icloud.com, or open an issue, with the camera, its firmware version (Camera Information in the menu), the files and what you changed. Blank `501E` (Artist) and `501F` (Copyright) first. Issues are public.

## File format

**File.** `settings.lcs` at the top of the card. The name must be exact: a browser download renamed `settings(1).lcs` is ignored. It is JSON, formatted the same way as the M's `.lcse`: two-space indent, no space after colons, each value on its own line, no byte-order mark and no final newline. There are two top-level keys, `Camera` (`LEICA Q3`, `LEICA Q3 43`, `LEICA Q2`) and `Settings`. There is no `Version` key. Codes are in a fixed order that is not sorted, and the first is `D054`.

**Kinds of value.** In a Q3 file on firmware 4.1.1:
- 552 codes hold seven numbers: the live settings, then profiles 1 to 6.
- 26 codes hold seven strings. Among them, `DA01` to `DA16` are 32-hex-digit records, described under Looks below.
- 6 codes hold one string each: the profile names, `D037` to `D03A`, `D0AD` and `D0AE`, the same codes as on the M.
- 2 codes, `D1FA` and `D1FB`, hold the button lists: per slot 36, a count, then that many job numbers. On a reset camera every slot holds 36, 1, 95, which makes 21 numbers.

**Profiles.** A Q file has neither `D6B2` (the M's saved-profiles mask) nor `D124` (the default profile). Import replaces all six profiles, empty ones included, and export writes all six (Q3 manual, User Profiles; owners report the same). A profile holds 255 or -1 for a setting it doesn't store. In one shared file, a landscape profile has these in 24 codes, including autofocus, thumbwheel and Look settings. Twelve more codes hold 255 or -1 in every slot. Each profile also records whether it was saved in photo or video mode (`D68A`).

**Models.** The camera checks the `Camera` line. The Q3 manual: "Leica Q3 profiles can therefore not be used on a Leica Q3 43 or Leica Q3 Monochrome." Owners on the forum report Q3 and Q3 43 files failing in both directions, and a Q2 file refused by a Q3. The on-screen message is not recorded. Two other forum members report that a Q3 43 file imports on a Q3 once `Camera` is changed from `LEICA Q3 43` to `LEICA Q3` (December 2025), and Florian Froschmayer's shared Q3 file is his Q3 43 file with only that line changed. `D17A` is in every Q3 and Q3 43 file except one Q3 file from firmware 4.1.1. Between one photographer's Q3 and Q3 43 files, 76 codes hold different values. Some depend on the lens, such as digital zoom (28 mm on the Q3, 43 mm on the Q3 43). The rest are the photographer's own settings.

**Firmware.** Each firmware writes a fixed set of codes: 344 on 1.x to 2.0.5, 346 on 3.0.0 (which added the AF field sizes to the profile), 563 on 3.1.x (AF detection as its own setting, the video profiles, the Looks list) and 587 on 4.x (the Control Center tiles and `D3DB` to `D3E2`). The [firmware generations](leica-q-codes.md#firmware-generations) list the codes added and removed at each step. Firmware 4.0.0 (December 2025) added AI eye and face autofocus with human and animal detection, two AF modes in place of Multi-Field and Spot, a Digital Zoom Steps menu kept separately for photo and video, Video Profiles in the menu, a touch interface with Favorites moved into the Control Center, an intensity setting for Looks, rotating info bars, and one menu for File Format and Compression. Leica's release notes: [4.1.1](https://leica-camera.com/sites/default/files/-4.1.1--Q-Family-Release-Notes-EN.pdf), [4.1.0](https://leica-camera.com/sites/default/files/2026-05/-4.1.0--Q-Family-Release-Notes-2_EN.pdf), 4.0.0 in [Dutch](https://leica-camera.com/sites/default/files/NL_-4.0.0--Q-Family-Release-Notes.pdf) and [Japanese](https://leica-camera.com/sites/default/files/JA_-4.0.0--Q-Family-Release-Notes.pdf) (Leica removed the English PDF). Updates keep profiles: the camera offers to save them to the card first. Whether a file from older or newer firmware imports is unknown.

**Other Leica files.** SL3 and SL3-S files from before firmware 4 are JSON that strict parsers reject: `D088` has trailing commas, such as `[0,]`. An SL3 file from firmware 4.2.0 is valid JSON, so firmware 4 fixed this. An editor has to accept both. The Q3 and the SL3 run the same software platform (Leica's open-source packages for the two are identical), and an SL3 file on firmware 4.2.0 shares 510 codes with the Q3, including the Control Center tiles but not `D3DB` to `D3E2`.

## Q2

A Q2 file has the Q3's layout with 142 to 177 codes, depending on firmware, and writes `FF4B` twice. Only the six profile names are camera-wide; profiles 5 and 6 are named in `FF16` and `FF17`. Tests on a Q2 with firmware 4.00 on 18 November 2026 named these settings, one change per profile:
- `FF26` to `FF29`: grid (on or off, no grid types), clipping, horizon and histogram, 0 for off and 1 for on. The histogram is on from the factory.
- `D01A`: Auto Review, with the M's values (0 Off, 1, 3 and 5 seconds, -1 Permanent, -3 Shutter pressed).
- `FF15` Flash Mode (3 Slow Sync), `D009` Flash Sync, `D136` Touch AF, `D134` Eye Sensor Sensitivity (0 Low).
- `FF32` to `FF39` and `FF3A` to `FF41`: the FN Button's and the Right Wheel Button's lists, up to eight functions each, 65535 for an empty place. `FF48` and `FF49` hold the function each button runs: with 65373 there, a press opened the focus magnifier at once, so the list is most likely the set of functions the button offers when you change it.
- `D054` to `D05D`, `D070` to `D072` and `D07C`: Favorites, fourteen places. The camera keeps its own order, which is not the order of the Edit Favorites screen.
- A second round of tests on the same camera: white balance uses the M's numbers (Cloudy 2, Shadow 3, Tungsten 4, Flash 8, Color Temperature 11); `FF03` focus peaking Red 1, Green 2, Blue 3, White 4; `D0A6` electronic shutter (2 Extended); `FF2A` EVF-LCD (1 LCD); `FF42` Wheel Assignment (2 Exp. Comp.); `D024` Auto Power Off in minutes; `FF2B` and `FF2C` screen brightness, likely level and Auto.
- `FF04` film style, 1 to 5 as on the M. `FF05` to `FF11`, 1 to 5 for -2 to +2, are most likely contrast, sharpness and saturation per film style in the M's order: the owner had tuned black and white High Contrast, and those values were in `FF10` and `FF11`.

A function is a number in all of these lists: a setting's own code where it has one (White Balance 20485 is `5005`, Drive Mode 20499 is `5013`, AF Mode 65281 is `FF01`, Electronic Shutter 53414 is `D0A6`), otherwise a small number the M uses for the same item (Interval Shooting 1, Flash Settings 3, Format Card 8, User Profile 11, Auto ISO Settings 12, Exposure Bracketing 14). A third round imported a file from Msetter's own save code with 67 values: the camera kept every setting but one (EVF-LCD 0), and every Favorites and button list with the same items in its own order; it refused one guessed function number (6). It showed peaking 0 as Off, flash sync 0 as Start of Exp., electronic shutter 0 as Off and film style 4 as BW Natural. The same camera kept every setting in a file from Msetter, and 60 of 61 values written into a profile from outside. It skipped a maximum ISO it has no step for, kept the rest of the file and didn’t say so. After an import, a profile holding the factory settings shows gray in the profile list.

## Q3 settings

**Codes shared with the M.** About 100 Q3 codes also appear in M11 files. Most mean the same thing on both. These differ:
- `D13E`, the M's Film Style, is 0 in every slot of Q3 files from firmware 3.1 and 4, black-and-white profiles included. Firmware 4 selects the Look with `D69C`. Older Q3 files set it, with values one lower than the USB list's: 0 Standard, 3 Monochrome, 4 Monochrome High Contrast.
- `D00C`, the Auto ISO shutter speed limit, stores Auto as 0 on the Q3. The M's 1/f options don't exist on the Q3.
- `D050`, the M's digital zoom, is always 0. The Q3's digital zoom is `D21D`.
- The codes the M uses for FN 3 and the FN 4 lever are the Q3's center button and thumbwheel button.
- `D097`, the self-timer, uses different numbers, and its on/off switch is `D32D`.
- `D003`, `D017`, `D09E` and `D0A0` hold values the M doesn't allow, and `D01A` and `D134` have different options.

**Buttons.** One set of job numbers is used by the buttons, the button lists, the item lists and the Control Center tiles.

| Control | Photo | Video | Review |
|---|---|---|---|
| FN 1 | `D191` | `D1BD` | `D190` |
| FN 2 | `D193` | `D1D1` | `D192` |
| Center button | `D195` | `D1D5` | `D20F` |
| Thumbwheel button | `D1D6` | `D1D8` | `D194` |

The photo and video codes are known. The photo factory values (21 Digital Zoom, 36 Photo-Video, 37 Toggle Info Levels, 11 ISO) match the manual's factory settings, and the camera writes the photo buttons' jobs by name into each photo's metadata in this order. The review codes are likely. Known job numbers: 3 Magnification, 4 Drive Mode, 5 Self-timer, 6 Interval Shooting, 7 Exposure Bracketing, 8 Capture Assistants, 9 Exposure Metering, 10 Exposure Compensation, 11 ISO, 12 Auto ISO Settings, 15 White Balance, 21 Digital Zoom, 26 User Profile, 27 EVF <> LCD, 36 Photo-Video, 37 Toggle Info Levels, 44 Focus Mode, 45 AF Mode, 73 Aspect Ratio, 82 Toggle Focus Point and 106 AF-L. Likely, among others: 88 Perspective Control (110 by list order), 104 AF-L + AE-L, 105 AE-L, 108 Color Temperature, 120 Camera Settings and 158 Scene Mode. Unknown: 92 and 124. The full table is in [every Q3 code](leica-q-codes.md#button-jobs). `D1D7`, `D1D9`, `D1DA` and `D1DB` are SL3 buttons the Q3 doesn't have. Their values never change, so an editor should leave them as they are.

**Thumbwheel.** `D1ED`, `D1EE`, `D1EF` and `D1F1` are the thumbwheel's job in P, S, A and M, and the numbers depend on the mode. In P, 0 is Program Shift (factory) and 1 Exposure Compensation. In M, 1 is Exposure Compensation (factory since firmware 3.1), 2 ISO and 3 shutter speed. In S and A two owners' screens show Exposure Compensation while the codes hold 0 and 1, so those two are open. `D1E7` to `D1EA` may be the video equivalents (a guess).

**Button lists, item lists and Control Center.** `D1FA` (photo) and `D1FB` (video) are the lists a long press on a function button offers (Customize Control › FN Buttons): per profile, 36, a count, then that many job numbers. Firmware 1 to 3.0 kept one such list per button. `D054` to `D05D` with `D070` (photo) and `D10A` to `D113` (video) are lists of job numbers ending in 0, with no header, empty on a reset camera. Their items can also be setting codes, as in the M's Favorites, so they are probably Favorites. `D31B` to `D32A` are the Control Center's eight tiles per mode, alternating photo and video. The factory first tile is 158, Scene Mode.

**Exposure and focus.** `500F` ISO, `D00B` Maximum ISO (200 to 100000), `D00C` Shutter Speed Limit in 1/256-stop steps with 0 = Auto, `D0D3` Maximum ISO with flash, `5010` exposure compensation in thousandths of a stop, and `500B` metering (0 Spot, 1 Center-Weighted, 2 Multi-Field, 32769 Highlight-Weighted). `500A` focus mode (0 AFs, 1 AFc, 5 Intelligent AF), `D137` AF mode (12 Field / Spot, 13 Zone / Multi-Field; older firmware used 4, 5, 7 and 11), `D138` AF field size, `D0BF` subject detection (0 Off, 1 human, 4 animal), `D136` Touch AF (0 Off, 1 Touch AF, 2 Touch AF + Release), `D04D` AF assist lamp, `D046` image stabilization (0 Off, 3 On, 4 Auto). `5013` drive mode (0 Single, 2 Interval, 8 Bracketing, with 5, 6, 7, 9, 11 and 14 as the continuous speeds).

**Looks.** `D69C` is the photo Look and `D69D` the video Look, by Look ID: 1 Contemporary, 2 Classic, 6 Eternal, 8 Chrome, 11 Monochrome High Contrast, 12 Vivid, 13 Natural, 15 Standard, 16 Monochrome, and 21 for a downloaded Look whose name is unknown. The Q3 Monochrom's own Looks are 17 to 20. The camera writes the Look ID and name into each photo's metadata. `DA01` to `DA16` are the installed Looks list: 11 slots (5 core Looks and 6 downloaded), odd codes for photo and even for video. Each record is 32 hex digits: digits 0 to 7 hold the Look ID (0 = empty), digits 8 and 9 the intensity (hex 64 = 100 %), digits 10 to 14 the Look's Contrast, Highlight, Shadow, Sharpness and Saturation (1 at factory; +2 reads 2), and the rest are zero. These records differ per profile. `D08A` to `D094`, `D0B0`, `D0B1` and `D1AE` to `D1B7` are the Film Style adjustments of firmware 1 to 3. Firmware 4 leaves them at 0.

**Screen layouts.** The four photo info profiles (`D15E` to `D172`, with `D01F`, `D0C4`, `D139` and `D13A`) are known. The unsaved profiles of an older file match the manual's four factory layouts exactly. Info bars hold 0 Off, 1 On or 3 Dark Background. Firmware 3.1 added four video layouts in `D27E` to `D316`, with info bars, grid, zebra, peaking, level gauge, histogram and frame lines in the manual's order (likely). A frame-line ratio is stored as the numerator × 100 in the high 16 bits and the denominator in the low 16 bits, giving 4:3, 5:3 and 37:20.

**Video.** `D380` to `D3B3` are four video profiles of 13 codes each. Each holds a frame rate for every MOV resolution (C8K, 8K, C4K, 4K, FHD ProRes, FHD, FHD Slow Motion) and every MP4 resolution (8K, 4K, FHD), stored as frames per second × 1000, so 59940 is 59.94 fps. `D104` is the frame rate for MOV 4K, and `D216` names the selected resolution by its frame-rate code (`D104` for 4K, `D215` for 8K). The first code of each profile holds the code number of the selected resolution's frame-rate setting (a guess). The current frame rates are in `D103` to `D105`, `D1DC` to `D1DE`, `D214`, `D215`, `D217` and `D218`. `D0DE` to `D109` are video copies of photo settings: focus, AF mode, ISO, maximum ISO, color temperature.

**Over USB.** A Q3 43 on firmware 4.1.1 offers 65 properties over USB. 43 of them are in the settings file, and libgphoto2 names 17 of those, most with their values ([PR 1370](https://github.com/gphoto/libgphoto2/pull/1370), [PR 1371](https://github.com/gphoto/libgphoto2/pull/1371), [the dumps](https://github.com/gphoto/libgphoto2/tree/master/camlibs/ptp2/cameras)). Stabilization, noise reduction, flash, shutter type, AF assist light, perspective control and video profiles are not available over USB. A Q3 on firmware 1.2 listed 49 codes without values ([gphoto2 issue 601](https://github.com/gphoto/gphoto2/issues/601)), and an SL3 refused every query ([issue 1203](https://github.com/gphoto/libgphoto2/issues/1203)).

**Largest unknown runs.** `D05E` to `D07D` (17 codes, mostly 0, between the grid and auto magnification settings), `D0F4` to `D102` (11: audio, iDR or LUT candidates), `D179` to `D184` (11), `D3DB` to `D3E2` (8, new in firmware 4; Digital Zoom Steps is a guess), and smaller groups in `D154` to `D15A`, `FF26` to `FF47`, `D34x` and `D189` to `D18F`.

## Sources

Hudson Henry's shared Q2, Q3 and Q3 43 files, whose six named profiles (Standard, B&W, LS / Pano, People, Animals, Bracketing) show which codes change together, read against the menus he shows in his videos. Ken Rockwell's Q3 file (firmware 4.1.0) with four never-saved profiles, read against his guide, his video and the metadata of his sample photos. Florian Froschmayer's Q3 and Q3 43 files (firmware 3.1) and SL3 files, with his labeled button guides and menu videos. Q3 files Leica forum members posted in 2024 (firmware 1 to 2), whose profile names label settings. Nick Rains' and Jono Slack's SL3 files, which their authors describe in words. The metadata of review photos from a Q3, Q3 43 and Q3 Monochrom. Leica's release notes, which date each file by its set of codes. A Q3 file on firmware 3.0, from the Dial & Dot repository. The Q3 manual's menu overview and factory settings. The libgphoto2 USB tests. The M11 family's settings tables for the codes the two lines share. The two editors above, given little weight. Each code's evidence is in [every Q3 code](leica-q-codes.md), and the data is in [`leica-q3-codes.json`](leica-q3-codes.json). Rebuild the list with `python3 tools/build_q_codes.py`.
