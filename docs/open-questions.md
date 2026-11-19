# Open questions

Most of these questions need only a camera, a card and a text editor to answer.

## How to test safely

1. Export your camera's own settings first (User Profile › Manage Profiles › Export Profiles) and copy `settings.lcse` off the card. You need it to restore your settings.
2. Put the test file on the card as `settings.lcse` and import it (User Profile › Manage Profiles › Import Profiles).
3. Switch the camera off and on, so the settings are saved (M-EV1 manual p.44).
4. Check the result on the camera, then export again and compare the new file with the one you imported. `diff <(jq -S . imported.lcse) <(jq -S . exported.lcse)` shows every change.
5. Put your own file back on the card and import it to restore your settings.

Before a firmware update, answer Yes when the camera asks whether to save your profiles to the card. Owners report updates that cleared their profiles.

To find what a setting does, export, change one setting on the camera, export again and compare the two files. Only that setting's code should change.

## How to report a finding

Open an issue with: the camera, its firmware version (Camera Information in the menu), the file you imported or exported, and what you saw. Blank `501E` (Artist), `501F` (Copyright) and `D12F` (network name, which holds the serial number) before sharing a file.

When a question is answered, move it to [answered](#answered) with the date, the camera and firmware or the published source, and the result. Then update the page that states the fact and remove its "Untested on a camera" mark. If the answer changes a code's allowed or factory values, say so in the issue: `src/rules.js` is generated and is not edited by hand.

## Profiles

### A file with no saved profiles that worked

**Question.** What does import do with a file whose saved-profiles mask (`D6B2`) is 0?

**What is known.** After import, the camera is described as resetting every profile whose bit in `D6B2` is clear, and resetting all of them if the default profile (`D124`) is not marked as saved. In February 2026, a file with `D6B2` = 0 and `D124` = 1 and four named, configured profiles was imported on an M-EV1 (firmware 2.6.1), and the four profiles were reported to arrive. By the rule above, every profile should have been reset. Either the rule is wrong, or that import did less than it seemed to.

**How to settle it.** Import a file with four named profiles, `D6B2` = 0 and `D124` = 1. Check whether the profiles keep their names and settings after switching off and on. Then repeat with `D6B2` = 30 for comparison. Msetter always writes `D6B2` to match the profiles it fills, so its files are safe whichever way this goes.

### Importing default profile zero

**Question.** What does import do with a file whose default profile (`D124`) is 0?

**What is known.** 0 is what the camera writes when no profile is active; see [What default profile zero means](#what-default-profile-zero-means).

**How to settle it.** Import a file with `D124` = 0 and see which profile, if any, is marked Active.

### Spare bit in the saved-profiles mask

**Question.** `D6B2` allows 0 to 127, so bit 0 (value 1) can be set. Does it mean anything?

**How to settle it.** Import a file with `D6B2` = 31 instead of 30 and compare the export that follows.

### Live slot on import

**Question.** Does import apply slot 0 to the camera's live settings, or does the camera load the default profile and ignore slot 0?

**How to settle it.** Import a file whose slot 0 differs from profile 1 in one visible setting (such as exposure compensation, `5010`) with `D124` = 1, and check which value the camera uses.

### Characters in profile names

**Question.** Which characters does import accept in profile names (`D037` and the others)?

**What is known.** Names are 3 to 10 characters (M-EV1 manual p.55). The camera's keyboard has upper and lower case letters, digits, a space and the symbols @ # $ % & * − + ( ) ! " ' : ; / ? , . (M11 Monochrom manual p.56). Msetter allows letters, numbers, spaces and dashes.

**How to settle it.** Import names with accented letters, punctuation and other symbols, and see which ones arrive.

### Settings that may not change with the profile

**Question.** The file stores almost every setting per profile, including Language, date format, Wi-Fi band, USB charging and the status lights. Does switching profile on the camera change these?

**What is known.** The manuals say a profile stores "any menu settings" and give no exceptions (M11 Monochrom manual p.61). After Reset Camera, date, time and language must be set again (p.146). One Q3 owner uses a profile to turn Wi-Fi and Bluetooth off. No report covers the M11 family.

**How to settle it.** Import two profiles that differ only in Language (`D036`), then switch between them.

## File on the card

### What Version newer firmware writes

**Question.** What number does an export from firmware 2.6.4 put in `Version`? Does import ignore it?

**What is known.** Exports from firmware 2.6.1 hold 3185, and so do exports from an M11-P and an M-EV1 on firmware 2.6.4 (November 2026). Import is described as reading the number without comparing it.

**How to settle it.** Import a file with `Version` set to 1 and check whether it imports.

### Files that leave codes out

**Question.** Does a file holding only some codes import, leaving the other settings as they were?

**How to settle it.** Import a file with only `Camera`, `Version`, `D037` and one per-profile setting, then export and compare.

### Network name and a failed transfer

**Question.** Why did a file with another camera's network name (`D12F`) fail to import?

**What is known.** In February 2026, on an M-EV1 with firmware 2.6.1, a file holding an M11-P's `D12F` imported with no effect; the camera reported success. The same file with the M-EV1's own `D12F` worked. The two files differed only in `D12F`. On firmware 2.6.4, `D12F` is no longer exported, and import is described as not using it. Other causes, such as which profiles were saved on the camera before each import, have not been ruled out. Owners report the same kind of failure on other Leica bodies: an M10 file imported into another M10 did nothing (2018), and Q3 files would not import into a Q3 43 (2024, 2025), while files moved between SL2 bodies worked (2023). The manuals say profiles on a card can be used "on another camera" (M-EV1 manual p.54).

**How to settle it.** On 2.6.4, import the same file twice, once with another camera's `D12F` and once without the code, starting from the same camera state each time.

## Buttons and menus

### Thumbwheel turn values without names

**Question.** On the M11-D, Customize Wheel (`D077`) allows 1, 3 and 4. 1 is Exposure Compensation; 3 and 4 have no names. What are they?

**What is known.** The M11 Monochrom's Customize Wheel offers Exposure Compensation, Focus Aid and No Function (M11 Monochrom manual p.61). The M11-D manual names no such menu; it says turning the wheel sets exposure compensation, or ISO with the ISO dial on M, or the exposure time with the shutter speed dial on B (M11-D manual p.45).

### FN button factory job in review

**Question.** On the M-EV1, what does the FN button do in review with its factory value? The M-EV1 manual gives the factory job as Delete Single on p.121 and as Shooting mode on p.39.

**What is known.** On the M11 Monochrom the FN button's factory job is Live View in both shooting and review (M11 Monochrom manual p.47), which matches `D190` = 1 on the M11 bodies.

### Favorites leading value

**Question.** Each Favorites slot starts with a value before the count and the items. It has been 13 in every export seen. 13 is also the item number of Lens Detection, the first item in the list. Is it the last item used, a cursor, or something else? Does changing it do anything?

### Lens list items

**Question.** `D1AB`, `D1AC` and `D1AD` are written like Favorites, with a value and a list of items, but every export seen holds no items (`[5, 0]`). What goes in the list, for example after editing the list of M lenses?

**What is known.** Firmware 2.6.0 (October 2025) added an editable list of M lenses; its release note says the list is available for all profiles and is included when profiles are exported.

**How to settle it.** Change Edit List of M-lenses on the camera, export, and compare.

### Where a profile's lens is kept

**Question.** Each profile keeps its own manually chosen lens (see [answered](#lens-choice-per-profile)), but Lens Selection M (`D1AB`) holds one value for the whole camera. Which code holds each profile's lens?

**How to settle it.** Choose one lens in user profile 1 and another in user profile 2, save both, export, and compare.

## Screen layouts

### Which layout is showing

**Question.** `D07A` and `D07B` hold 0 to 4. Which camera state does each one cover, and is 0 the full picture without a layout?

**How to settle it.** Step to a layout with the center button, export, and compare; repeat in review.

## Settings without a name

### Unnamed settings

**Question.** What do these codes do?

| Code | Cameras | What is known |
|---|---|---|
| `D033` | M11, M11-D, M11 Monochrom | Two values, 0 and 1, factory 0. |
| `D016` | M11 Monochrom | Five values, factory 1. |
| `D1F5` | M11 Monochrom | Five values, factory 2. |
| `D1F6` | M11 Monochrom | Five values, factory 2. |

**How to settle it.** On that camera, change one menu setting at a time, export, and see which of these codes changes. Full entries: [unnamed settings](settings/unnamed.md).

### High ISO names on the Monochrom

**Question.** The M11 Monochrom allows ISO 64000 to 200000. The camera's names for these values are unknown; they are probably "ISO 64000" and so on.

**What is known.** The manual lists ISO 125 to 200000 in 33 steps and writes each value in full (M11 Monochrom manual p.101).

### Other unknown meanings

| Code | Question |
|---|---|
| `0342` | How the camera passes new pictures to the Leica FOTOS app. What do values 0 to 3 do? |
| `D140` | An on/off flag that only a reset to factory settings changes. What is it for? |
| `500A` | Focus mode: 0, 1 or 2, factory 2. What do 0 and 1 do on an M camera? |
| `D3BC`, `D3BD` | The two axes of White Balance Adjustment, added in firmware 2.6.0. It shifts the white point and affects auto white balance and the film styles. Which color axis is which? |

## Factory values

### Factory values on other cameras

**Question.** Factory values for the M-EV1 match the unused profiles in a real export. Do the M11, M11-P and M11 Monochrom values in [factory values](settings/factory-values.md) match their real exports?

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

### Files made from scratch

*Settled 2026-11-16 on an M11-P and an M-EV1, both on firmware 2.6.4.* A file Msetter built from a starting set (Motion) with a few changes imported on both cameras. Both cameras accepted it, work, and list its user profiles. Whether they kept every value exactly is unknown. To find out, export after the import and compare that export with the file you imported, as in [How to test safely](#how-to-test-safely).

### M11-D and user profiles

*Settled 2026-11-16 from the M11-D manual and owners.* The M11-D has no user profiles. Its manual (edition 2024/09) describes no profiles, no Import Profiles and no Export Profiles, on the camera or in the Leica FOTOS app, and Reset Camera there offers no profile export (p.78). Settings are changed in the Leica FOTOS app; the only file it reads from a card is a firmware update (p.79). Owners on the Leica forum say the same (November 2024). It still has a settings file with 140 codes, but there is no known way to load one.

### Leica Looks and other film styles

*Settled 2026-11-16 from Leica's Looks page and owners.* Leica Looks are color looks that the Leica FOTOS app installs on the Q3, Q3 43, SL3, SL3-S and SL3-P, up to six at a time. Leica's list of compatible cameras has no M body, and owners report that FOTOS won't install them on the M-EV1. On the M11 bodies and the M-EV1, Film Style (`D13E`) has five values, Standard, Vivid, Natural, Monochrome and Monochrome High Contrast, and a settings file can set only those. Other looks come from combining a film style with its contrast, saturation and sharpness, the white balance and extended dynamic range.

### Where the file goes on the card

*Settled 2026-11-16 from the manuals and an owner's report.* Export Profiles writes `settings.lcse` at the top of the card (an owner on the Leica forum, July 2024; some card readers show it as `SETTINGS`). A new export replaces the file already on the card without asking. Every profile slot goes into the file, including empty ones, and import overwrites every profile in the camera; single profiles can't be exported or imported (M-EV1 manual p.56, M11 Monochrom manual p.63). The camera also offers to export profiles before Reset Camera (M11 Monochrom manual p.146) and before a firmware update (release notes 2.2.0 to 2.6.4).

### What default profile zero means

*Settled 2026-11-16 from the manuals and several owners.* When you change a setting while a profile is in use, the camera stops showing the profile's name and shows the Default Profile mark instead, and no profile is marked Active (M-EV1 manual p.55; several owners on the Leica forum and Fred Miranda, 2022 to 2025). The changed settings stay in place until you choose a profile again. That is the state a default profile (`D124`) of 0 records: a real M-EV1 export held 0 while its live settings matched profile 2 in everything but the layout on screen (`D07A`). It is still open what import does with 0: [Importing default profile zero](#importing-default-profile-zero).

### Lens choice per profile

*Settled 2026-11-16 from owners.* Each user profile keeps its own manually chosen lens, and switching profiles switches the lens. Reported on an M11-P (Leica forum, September 2025) and on an early M11 (January 2022). Which code holds it is still open: [Where a profile's lens is kept](#where-a-profiles-lens-is-kept).

### Center Frame job

*Settled 2026-11-16 from one owner.* Button job 121, Center Frame, moves the focus frame back to the center of the picture, also while the view is magnified. Reported by an M11 Monochrom owner who found it as a new job (Leica forum, June 2024). It is not in any manual's list of jobs.

### Top button job without a name

*Settled 2026-11-16 from the M11-D manual.* Job 37 is the M11-D's factory top button job. A press steps the viewfinder display through the shots remaining, battery level, USB mode, storage mode, connectivity mode, Content Credentials, Wi-Fi band and exposure time (M11-D manual p.45). The manual gives the job no name. Its other option, Focus Aid, works only with a Visoflex 2 or the Leica FOTOS app (p.60).

### Monochrom settings without names

*Settled 2026-11-16 from the M11 Monochrom manual (2025 edition).*

- `5014` is Contrast and `5015` is Sharpness: the two settings under Customize image properties, five steps each (p.76). Both are the standard PTP codes for those settings.
- `D177` is Toning: Off, Sepia (weak), Sepia (strong), Blue (weak), Blue (strong), Selenium (weak), Selenium (strong) (p.75). The seven values match the seven options, factory Off. The options are matched in the order the camera lists its values. Untested on a camera.
- Button job 87 and Favorites item 40 are most likely Toning: it is the only Monochrom-only entry on both the button job list and the Favorites list (pp.168 to 170). Job 88 is Customize image properties.

### Touch Mode off in LV mode

*Settled 2026-11-16 from a release note summary and one owner.* Off (LV mode) was added in firmware 2.0.1 (October 2023). It turns touch control off only in Live View; touch still works in review and the menus, and the direction pad still moves the magnified area (Leica forum, June 2024).

### Focus peaking sensitivity per layout

*Settled 2026-11-16 from the manuals.* The camera has one peaking sensitivity, Low or High, that applies to all screen layouts (M-EV1 manual p.82, M11 Monochrom manual p.90). The peaking color is set per layout. The file still holds one sensitivity per layout (`D085`, `D1A1`, `D1A2`, `D1A3`); Msetter doesn't change them. What the camera does with a file where they differ is unknown.
