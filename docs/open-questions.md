# Open questions

What is not known yet about the settings file, written as questions anyone with a camera can pick up. Most need only a camera, a card and a text editor.

## How to test safely

1. Export your camera's own settings first (User Profile, Manage Profiles, Export Profiles) and copy `settings.lcse` off the card. This is your way back.
2. Put the test file on the card as `settings.lcse` and import it (User Profile, Manage Profiles, Import Profiles).
3. Switch the camera off and on, so the settings are saved (M-EV1 manual p.44).
4. Check the result on the camera, then export again and compare the new file with the one you imported. `diff <(jq -S . imported.lcse) <(jq -S . exported.lcse)` shows every change.
5. Put your own file back on the card and import it to restore your settings.

To find what a setting does, export, change one setting on the camera, export again and compare the two files. Only that setting's code should change.

## How to report a finding

Open an issue with: the camera, its firmware version (Camera Information in the menu), the file you imported or exported, and what you saw. Blank `501E` (Artist), `501F` (Copyright) and `D12F` (network name, which holds the serial number) before sharing a file.

When a question is answered, move it to [answered](#answered) with the date, the camera and firmware, and the result. Then update the page that states the fact and remove its "Not yet confirmed on a camera" mark. If the answer changes a code's allowed or factory values, say so in the issue: `src/rules.js` is generated and is not edited by hand.

## Profiles

### A file with no saved profiles that worked

**Question.** What does import do with a file whose saved-profiles mask (`D6B2`) is 0?

**What is known.** After import, the camera is described as resetting every profile whose bit in `D6B2` is clear, and resetting all of them if the start profile (`D124`) is not marked as saved. In February 2026, a file with `D6B2` = 0 and `D124` = 1 and four named, configured profiles was imported on an M-EV1 (firmware 2.6.1), and the four profiles were reported to arrive. By the rule above, every profile should have been reset. Either the rule is wrong, or that import did less than it seemed to.

**How to settle it.** Import a file with four named profiles, `D6B2` = 0 and `D124` = 1. Check whether the profiles keep their names and settings after switching off and on. Then repeat with `D6B2` = 30 for comparison. Msetter always writes `D6B2` to match the profiles it fills, so its files are safe whichever way this goes.

### Start profile zero

**Question.** What does `D124` = 0 mean, and what does import do with it?

**What is known.** `D124` is the profile the camera uses, 1 to 6, and its allowed range is 0 to 6. A real M-EV1 export with four saved profiles held 0, while its live settings (slot 0) matched profile 2 in every per-profile code except `D07A`. 0 may mean the Default Profile, or no profile, or a profile with unsaved changes (the manuals describe a mark that replaces the profile name when settings change; M-EV1 manual p.55).

**How to settle it.** Export after choosing a profile in the menu and changing nothing; export again after changing one setting; compare `D124`. Then import a file with `D124` = 0 and see which profile, if any, is marked Active.

### Spare bit in the saved-profiles mask

**Question.** `D6B2` allows 0 to 127, so bit 0 (value 1) can be set. Does it mean anything?

**How to settle it.** Import a file with `D6B2` = 31 instead of 30 and compare the export that follows.

### Live slot on import

**Question.** Does import apply slot 0 to the camera's live settings, or does the camera load the start profile and ignore slot 0?

**How to settle it.** Import a file whose slot 0 differs from profile 1 in one visible setting (such as exposure compensation, `5010`) with `D124` = 1, and check which value the camera uses.

### Characters in profile names

**Question.** Which characters does import accept in profile names (`D037` and the others)?

**What is known.** Names are 3 to 10 characters (M-EV1 manual p.55). The camera's keyboard has upper and lower case and other character sets (M-EV1 manual p.48). Msetter allows letters, numbers, spaces and dashes.

**How to settle it.** Import names with accented letters, punctuation and other symbols, and see which ones arrive.

### Settings that may not follow the profile

**Question.** The file stores almost every setting per profile, including Language, date format, Wi-Fi band, USB charging and the status lights. Does switching profile on the camera change these?

**How to settle it.** Import two profiles that differ only in Language (`D036`), then switch between them.

## The file on the card

### Where the file goes on the card

**Question.** Does the camera write `settings.lcse` at the top level of the card, and read it from there?

**What is known.** That is the name and place this documentation and Msetter use. It has not been checked on a card with the current firmware.

**How to settle it.** Export to an empty card and look at the card on a computer. Note the file name, its folder, and whether a second export replaces the file or adds another.

### What Version newer firmware writes

**Question.** What number does an export from firmware 2.6.4 put in `Version`? Does import really ignore it?

**What is known.** Exports from firmware 2.6.1 hold 3185. Import is described as reading the number without comparing it.

**How to settle it.** Export on 2.6.4 and read the number. Import a file with `Version` set to 1 and check whether it imports.

### Files made from scratch

**Question.** Does a file built only from factory values and your own changes, never exported by a camera, import correctly?

**What is known.** Msetter builds such files. They hold the same codes in the same order as a camera export, and their factory values match the unused profiles in a real M-EV1 export. None has been imported on a camera yet.

**How to settle it.** Make a file in Msetter for your camera with one or two profiles, import it, and check a few settings in each profile.

### Files that leave codes out

**Question.** Does a file holding only some codes import, leaving the other settings as they were?

**How to settle it.** Import a file with only `Camera`, `Version`, `D037` and one per-profile setting, then export and compare.

### Network name and a failed transfer

**Question.** Why did a file with another camera's network name (`D12F`) fail to import?

**What is known.** In February 2026, on an M-EV1 with firmware 2.6.1, a file holding an M11-P's `D12F` imported with no effect; the camera reported success. The same file with the M-EV1's own `D12F` worked. The two files differed only in `D12F`. On firmware 2.6.4, `D12F` is no longer exported, and import is described as not using it. Other causes, such as which profiles were saved on the camera before each import, have not been ruled out.

**How to settle it.** On 2.6.4, import the same file twice, once with another camera's `D12F` and once without the code, starting from the same camera state each time.

## Buttons and menus

### Center Frame job

**Question.** What does button job 121 do? Its name is Center Frame. All five cameras allow it on the FN button and thumbwheel press, but it is not in the manuals' lists of button jobs.

**How to settle it.** Import a file with `D191` = 121 and press the FN button.

### Top button job without a name

**Question.** On the M11-D, the top button (`D193`) allows only job 3 (Focus Aid) and job 37, and 37 is its factory job. Job 37 has no name. What is it?

**How to settle it.** On an M11-D, press the top button with factory settings, or hold it to see the list of jobs.

### Monochrom button job and Favorites item without names

**Question.** The M11 Monochrom allows button job 87 and Favorites item 40, neither of which has a name. What are they? Job 88 is named Customize Image Properties; does it open that menu?

**How to settle it.** On an M11 Monochrom, hold the FN button and read the list of jobs; open Edit Favorites and read the list of items.

### Thumbwheel turn values without names

**Question.** On the M11-D, Customize Wheel (`D077`) allows 1, 3 and 4. 1 is Exposure Compensation; 3 and 4 have no names. What are they?

### FN button factory job in review

**Question.** What does the FN button do in review with its factory value? `D190` = 1, whose name is Live View. The M-EV1 manual gives the factory job as Delete Single on p.121 and as Shooting mode on p.39.

### Favorites leading value

**Question.** Each Favorites slot starts with a value before the count and the items. It has been 13 in every export seen. 13 is also the item number of Lens Detection, the first item in the list. Is it the last item used, a cursor, or something else? Does changing it do anything?

### Lens list items

**Question.** `D1AB`, `D1AC` and `D1AD` are written like Favorites, with a value and a list of items, but every export seen holds no items (`[5, 0]`). What goes in the list, for example after editing the list of M lenses?

**How to settle it.** Change Edit List of M-lenses on the camera, export, and compare.

### Touch Mode off in LV mode

**Question.** Touch Mode (`D32B`) has three options: On, Off and Off (LV mode). What does Off (LV mode) leave working?

## Screen layouts

### Which layout is showing

**Question.** `D07A` and `D07B` hold 0 to 4. Which camera state does each one cover, and is 0 the full picture without a layout?

**How to settle it.** Step to a layout with the center button, export, and compare; repeat in review.

### Focus peaking sensitivity per layout

**Question.** The manuals describe one peaking sensitivity for all layouts (M-EV1 manual p.82). The file holds one per layout (`D085`, `D1A1`, `D1A2`, `D1A3`). Does changing it in one layout change the others?

## Settings without a name

### Unnamed settings

**Question.** What do these codes do?

| Code | Cameras | What is known |
|---|---|---|
| `D033` | M11, M11-D, M11 Monochrom | Two values, 0 and 1, factory 0. |
| `D177` | M11 Monochrom | Seven values, factory -1. Can be a Favorites item. |
| `5014` | M11 Monochrom | Five values named Low to High. Standard PTP code for Contrast. |
| `5015` | M11 Monochrom | Five values named Low to High. Standard PTP code for Sharpness. |
| `D016` | M11 Monochrom | Five values, factory 1. |
| `D1F5` | M11 Monochrom | Five values, factory 2. |
| `D1F6` | M11 Monochrom | Five values, factory 2. |

**How to settle it.** On that camera, change one menu setting at a time, export, and see which of these codes changes. Full entries: [unnamed settings](settings/unnamed.md).

### High ISO names on the Monochrom

**Question.** The M11 Monochrom allows ISO 64000 to 200000. The camera's names for these values are not known yet; they are probably "ISO 64000" and so on.

### Other meanings not yet confirmed

| Code | Question |
|---|---|
| `0342` | How the camera passes new pictures to the Leica FOTOS app. What do values 0 to 3 do? |
| `D140` | An on/off flag that only a reset to factory settings changes. What is it for? |
| `500A` | Focus mode: 0, 1 or 2, factory 2. What do 0 and 1 do on an M camera? |
| `D3BC`, `D3BD` | The two axes of White Balance Adjustment. Which color axis is which? |

## Factory values

### Factory values on other cameras

**Question.** Factory values for the M-EV1 match the unused profiles in a real export. Do the M11, M11-P, M11-D and M11 Monochrom values in [factory values](settings/factory-values.md) match their real exports?

**How to settle it.** After Reset Camera, export and compare with the table. Profiles 5 and 6, if unused, should hold factory values.

### Factory values against the manuals

The manuals and the camera's factory values disagree in places. The table in [factory values](settings/factory-values.md) follows the camera.

| Setting | Manual | Camera |
|---|---|---|
| Maximum ISO with flash (`D0D3`) | 3200 (M-EV1 manual p.89, M11-P manual p.101) | 200 |
| Focus peaking sensitivity on the M-EV1 (`D085` and others) | High (M-EV1 manual p.82) | Low |
| Screen layouts on the M-EV1 | A set shown in the M-EV1 quick start guide (p.15) | Only layout 1 on, with info bars, peaking and histogram |
| Thumbwheel press on the M-EV1 (`D195`) | ISO (p.39) and Exposure Compensation (p.154) | ISO |

## Answered

Nothing yet. Move questions here when a camera has settled them, with the date, the camera, the firmware and the result.
