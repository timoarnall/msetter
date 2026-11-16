# Cameras

Five cameras share the settings file described here: the M11, M11-P, M11-D, M11 Monochrom and M-EV1, all on firmware 2.6.4. They use the same layout, the same seven slots and the same import rules. They differ in which codes their files hold, which values some codes allow, and some factory values. Every difference, code by code, is in [differences between cameras](settings/differences.md); this page summarises them.

## At a glance

| Camera | `Camera` field | Codes in the file | Real exports seen | Manual cited here |
|---|---|---|---|---|
| M11 | `LEICA M11` | 139 | none | M11 manual, for one page only |
| M11-P | `LEICA M11-P` | 139 | yes | M11-P manual |
| M11-D | `LEICA M11-D` | 140 | none | none |
| M11 Monochrom | `LEICA M11 Monochrom` | 145 | none | none |
| M-EV1 | `LEICA M EV1` | 139 | yes, firmware 2.6.1 | M-EV1 manual and quick start guide |

138 codes are in all five files, and 106 of those are identical on all five: same kind, same allowed values, same factory value. All 146 codes found in any of the five files are listed in file order in [factory values](settings/factory-values.md).

Only the M-EV1's factory values are backed by a real export (its unused profiles). Everything this page says about the M11, M11-D and M11 Monochrom comes from the rules in `src/rules.js` alone and is not yet confirmed on a camera.

## M11-P

The reference rangefinder for this documentation, with an ISO dial and a mechanical frame selector lever (M11-P manual p.44 and 92).

- `D010` is M-ISO, the ISO used when the ISO dial is on M. Factory 12500.
- The FN button's factory job is Live View (1). Live View is a job only on bodies with a rangefinder; the M-EV1 does not allow it.
- Thumbwheel press: factory Exposure Compensation (10). Thumbwheel turn: factory No Function (0).
- Exposure preview (`D115`): factory Shutter Button Half Pressed (4).
- Viewfinder brightness (`D133`) has no Auto; it is for the Visoflex 2 accessory viewfinder.
- Of the codes it shares with the M11, only Favorites differs: the M11-P allows Leica Content Credentials (41) as an item.

## M-EV1

An M body with a built-in electronic viewfinder, no ISO dial and a two-way front lever (M-EV1 manual p.38 and 39).

- The `Camera` field is `LEICA M EV1`, with a space and no hyphen.
- `D010` is the ISO itself. Factory Auto ISO (0).
- No button allows Live View (1). The FN button's factory job is EVF <> LCD (27).
- Thumbwheel press: factory ISO (11). Thumbwheel turn: factory Exposure Compensation (1).
- The front lever's codes `D1D6` and `D1D7` are in every camera's file, but only the M-EV1 has the lever.
- Exposure preview: factory Permanent (1). Focus Aid: factory Manual (0).
- Viewfinder brightness allows Auto (5).
- Focus peaking sensitivity in all four screen layouts: factory Low (0), where the other bodies have High (1). The manual says High (M-EV1 manual p.82); a real export's unused profiles hold Low.

Compared with the M11-P, 127 of the 139 codes are identical. The other 12 are `D010`, `D020`, `D077`, `D085`, `D1A1`, `D1A2`, `D1A3`, `D115`, `D133`, `D191`, `D193` and `D195`.

## M11

- No Content Credentials: `D21C` is not in the file, and Favorites does not allow Leica Content Credentials (41).
- Has `D033`, a code with no name yet, which the M11-P and M-EV1 do not have.
- Otherwise the same as the M11-P, factory values included.

## M11-D

The M11-D has no rear screen. Its rules show many choices removed:

- The top button allows only Focus Aid (3) and job 37, which has no name. Its factory job is 37.
- Drive mode (`5013`) allows only Single and the two continuous speeds; Interval Shooting and Exposure Bracketing are not allowed.
- White balance (`5005`) has no Gray Card (9) or Color Temperature (11).
- Thumbwheel turn (`D077`) allows 1 (Exposure Compensation) and two values with no name, 3 and 4. It does not allow No Function (0) or Focus Aid (2). Factory 1.
- Phone connection (`D1FC`) allows Off and Performance Mode, not Eco Mode. Factory Off.
- Picture review (`D01A`) and screen off (`D051`) are Off by factory.
- The four screen layouts have different factory values.
- Has `D033` and Content Credentials.

## M11 Monochrom

- ISO runs from 125 to 200000: ISO 64, 80 and 100 are not allowed, and 64000 to 200000 are. This applies to `D010`, `D00B` and `D0D3`. The higher values have no names yet.
- Six codes only it has: `5014`, `5015`, `D016`, `D177`, `D1F5` and `D1F6`, all per profile and none named yet. See [unnamed settings](settings/unnamed.md).
- No Content Credentials (`D21C`), as on the M11.
- Button jobs: adds 87 (no name yet) and 88 (Customize Image Properties), and does not allow 89 (Extended Dynamic Range).
- Favorites: does not allow White Balance, Gray Card, Film Style, Extended Dynamic Range or Leica Content Credentials; allows `D177` (53623) and item 40, which has no name.
- Extended dynamic range (`D1F4`): factory Medium (1), where the others have Off (0).
- Has `D033`.

## Moving a file between cameras

A file is written for one camera. To use it on another:

1. **Change `Camera`** to the target's exact name. Import checks it and imports nothing on a mismatch. Not yet confirmed on a camera.
2. **Check every value against the target's rules.** The camera skips a value it does not allow and keeps its current one, without a message. Not yet confirmed on a camera. Examples: Live View (1) on any M-EV1 button; ISO 64 on the M11 Monochrom; any top button job other than 3 or 37 on the M11-D. Msetter replaces each such value with the closest one the target allows and lists every change.
3. **Codes the target does not have are ignored.** Not yet confirmed on a camera. The M11 Monochrom's six extra codes do nothing on other bodies, and `D21C` does nothing on the M11 or M11 Monochrom.
4. **Codes the target has but the file lacks keep their current value.** Not yet confirmed on a camera. A file from an M11-P leaves the M11 Monochrom's six extra settings as they were on that camera.
5. **Same code, different effect.** `D010` is the ISO on the M-EV1 and the dial's M value elsewhere. The front lever codes act only on the M-EV1.
6. **Factory values differ.** A file made from one camera's factory values carries that camera's defaults to the other: an M-EV1 file puts EVF <> LCD on an M11-P's FN button.
7. **Profiles.** Set `D6B2` and `D124` for the profiles you are writing; see [file format](file-format.md#profiles).
8. **Network name.** Leave `D12F` out, or use the target camera's own; see [file format](file-format.md#network-name).
9. **Version.** Keep it as it is. It is not compared. Not yet confirmed on a camera.

What has been seen on a camera: in February 2026 a file exported from an M11-P, with `Camera` changed to `LEICA M EV1` and `D12F` changed to the M-EV1's own, imported on an M-EV1 (firmware 2.6.1) and its four profiles appeared.

## Adding a camera

Other M11-family bodies, or later firmware, should follow the same pattern. What a new camera needs:

- Its `Camera` string, taken from a real export.
- Its list of codes, their order, kinds, allowed values and factory values. These live in `src/rules.js`, which is generated and must not be edited by hand. Open an issue with a real export (Artist, Copyright and network name blanked) and the camera's firmware version.
- A row in [at a glance](#at-a-glance) and a section on this page.

Once `src/rules.js` has the camera, `python3 tools/build_docs.py` adds it to every generated page, Msetter offers it for saving, and the tests check that a file built from its factory values passes its own rules. See [how to extend this](README.md#how-to-extend-this).

Other Leica lines, such as the SL3 and Q3, are not covered.
