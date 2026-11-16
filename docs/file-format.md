# Settings file format

A Leica M11-family camera can export its six user profiles to a memory card and import them again (M-EV1 manual p.56, M11-P manual p.63). The exported file is plain JSON text with the extension `.lcse`. It has no checksum and no encryption, so any tool can read and write it.

This page describes the file. What each setting means is in the [settings reference](settings/README.md). Statements marked "Not yet confirmed on a camera" have not been checked against a real camera; everything else is shown by real camera exports or by Leica's manuals, which are cited by page. The manuals are listed in the [documentation index](README.md#manuals).

## File name and place on the card

The file is called `settings.lcse` and sits at the top level of the card, outside the `DCIM` folder. A card holds one such file. Export overwrites it without asking (M-EV1 manual p.56, M11-P manual p.63), and import reads it from the same place. The name and place are not yet confirmed on a camera; see [open questions](open-questions.md#where-the-file-goes-on-the-card).

Profile Maker saves `settings.lcse`. If a saved file ends in `.json`, rename it to `settings.lcse` before copying it to the card.

## Top level

The file is one JSON object with three keys, always in this order:

| Key | Holds |
|---|---|
| `Camera` | The camera's model name as text. |
| `Version` | A whole number. |
| `Settings` | An object with one entry per setting. |

### Camera

The model name of the camera that wrote the file. Import checks that it matches the body exactly; a file for another model imports nothing, and the camera shows no message. Not yet confirmed on a camera.

| Camera | `Camera` field |
|---|---|
| M11 | `LEICA M11` |
| M11-P | `LEICA M11-P` |
| M11-D | `LEICA M11-D` |
| M11 Monochrom | `LEICA M11 Monochrom` |
| M-EV1 | `LEICA M EV1` |

The M-EV1's name has a space where the model name has a hyphen.

### Version

Real exports from an M-EV1 on firmware 2.6.1 and from an M11-P both hold `3185`. Import reads the number but does not compare it with anything. Not yet confirmed on a camera. Profile Maker writes `3185`, or keeps the number from a file it opened. What firmware 2.6.4 writes here is an [open question](open-questions.md#what-version-newer-firmware-writes).

### Settings

Each key in `Settings` is a four-character code in upper-case hexadecimal, such as `D00C`, with no `0x` in front. The code names one setting. Codes that start with 5 are standard PTP device property codes (PTP is the picture transfer protocol cameras use over USB); codes that start with D are Leica's own; one code, `0342`, is neither.

Every value is an array, even for a setting with one value. The length of the array says whether a setting is per profile or camera-wide (see [slots](#slots)).

A camera's file holds a fixed set of codes, in a fixed order. On firmware 2.6.4 the M11, M11-P and M-EV1 write 139 codes, the M11-D 140 and the M11 Monochrom 145. [Factory values](settings/factory-values.md) lists them all in order.

## Slots

A **per-profile** setting has seven values, called slots:

| Slot | Holds |
|---|---|
| 0 | The live settings: what the camera is using at the moment of export. |
| 1 to 6 | User profiles 1 to 6. |

A **camera-wide** setting has one slot. Only eleven settings are camera-wide: the six profile names, the start profile (`D124`), the saved-profiles mask (`D6B2`) and the three lens choices (`D1AB`, `D1AC`, `D1AD`). Everything else is per profile, including button jobs, Favorites, screen layouts and settings such as Language and Wi-Fi band. Whether the camera changes settings like Language when you switch profile is not yet confirmed on a camera.

The camera writes all six profile slots whether or not a profile is saved. In a real M-EV1 export, the slots of unused profiles hold the factory values.

The manuals also mention a Default Profile, the factory settings, which cannot be changed (M-EV1 manual p.54, M11-P manual p.61). It has no slot in the file.

## Kinds of value

| Kind | Written as | Example |
|---|---|---|
| One of a list | A whole number from the setting's list of allowed values. What the number means depends on the setting: an option number, an ISO number, thousandths of a stop, seconds. | `D00B`: `6400` is ISO 6400 |
| Range | Any whole number between a minimum and a maximum. | `D01D`, clipping limit: 200 to 255 |
| Text | A JSON string with a minimum and maximum length. | `D037`, profile 1 name: 3 to 10 characters |
| Lists of items | A value, a count and that many items, per slot. See below. | `D1A9`, Favorites |

Each setting's kind, allowed values and factory value are in the [settings reference](settings/README.md).

### Lists of items

Four settings hold a list whose length varies: `D1A9` (Favorites, per profile) and the lens choices `D1AB`, `D1AC` and `D1AD` (camera-wide). Each slot is written as:

```
leading value, number of items, item, item, ...
```

and the slots follow each other in one flat array. So a per-profile list is not seven values long; its length depends on how many items each profile holds.

From a real M-EV1 export, where every slot holds one Favorites item, 41 (Leica Content Credentials):

```json
"D1A9":[13, 1, 41,  13, 1, 41,  13, 1, 41,  13, 1, 41,  13, 1, 41,  13, 1, 41,  13, 1, 41]
```

(The camera writes one number per line; spacing here is for reading.) In a real M11-P export, slot 0 held five items:

```json
13, 5, 20499, 1, 53274, 28, 8
```

These are Drive Mode (20499, which is `5013` written as a decimal number), Interval Shooting (1), Auto Review (53274, which is `D01A`), Edit Favorites (28) and Format Storage (8). An item above 255 is the code of a setting; a small number is a menu page. Favorites holds up to 11 items (M-EV1 manual p.45). The leading value has been 13 in every export seen so far; what it does is an [open question](open-questions.md#favorites-leading-value).

The lens lists in exports seen so far hold no items: `"D1AB":[5, 0]` is the value 5 followed by a count of 0.

## Profiles

Four groups of codes work together.

**Names.** `D037`, `D038`, `D039`, `D03A`, `D0AD` and `D0AE` are the names of profiles 1 to 6. The codes for profiles 5 and 6 do not follow on from the first four. Each is camera-wide text of 3 to 10 characters (M-EV1 manual p.55). Factory names are `User1` to `User6`.

**Saved profiles.** `D6B2` is a bitmask: one bit per saved profile. Bit 1 is profile 1, bit 6 is profile 6, and bit 0 is not used for a profile.

| Profile | Add |
|---|---|
| 1 | 2 |
| 2 | 4 |
| 3 | 8 |
| 4 | 16 |
| 5 | 32 |
| 6 | 64 |

A real M-EV1 export with profiles 1 to 4 saved holds `30` (2 + 4 + 8 + 16). After import, the camera resets every profile whose bit is clear to factory values. Not yet confirmed on a camera, and a file imported in February 2026 seems to contradict it: see [open questions](open-questions.md#a-file-with-no-saved-profiles-that-worked).

**Start profile.** `D124` is the profile the camera uses, 1 to 6. If it names a profile whose bit in `D6B2` is clear, import resets every profile and the camera loads its factory settings. Not yet confirmed on a camera. A real M-EV1 export with four saved profiles held `0` here; what 0 means is an [open question](open-questions.md#start-profile-zero).

**Live slot.** Slot 0 of every per-profile setting is what the camera is using. Profile Maker writes a copy of the start profile into slot 0, so the camera starts in that profile with nothing marked as changed. Whether import applies slot 0 to the live settings is not yet confirmed on a camera.

Rules for a tool that writes files:

- Set `D6B2` to exactly the profiles the file fills.
- Set `D124` to one of those profiles.
- Never copy `D6B2` or `D124` from another file without checking them against the profiles you write.

## What import does

From the manuals:

- Import replaces every profile on the camera. Empty profile slots are transferred too, and a single profile cannot be imported on its own (M-EV1 manual p.56, M11-P manual p.63).
- Settings are saved permanently only when the camera is switched off. Removing the battery while the camera is on loses changes (M-EV1 manual p.44, M11-P manual p.52). Switch the camera off and on after an import.

How the camera reads the file. None of this is confirmed on a camera yet:

1. `Camera` must match the body's name exactly, or nothing is imported.
2. `Version` is read and not compared.
3. The camera goes through the settings it knows and looks for each one's code in the file. A code the camera does not know is ignored. A setting missing from the file keeps its current value.
4. Each slot's value is checked on its own. A value the setting does not allow is skipped, and that slot keeps its current value.
5. After the settings, `D6B2` and `D124` decide which profiles are reset, as described under [profiles](#profiles).
6. None of these cases shows a message on the camera. A file can import "successfully" and change nothing.

Because of points 3 and 4, a file with a wrong value does not fail; it quietly does less than intended. Profile Maker checks every value against the target camera's rules before saving and lists anything the camera would skip.

Whether a file holding only some codes imports cleanly is not yet confirmed on a camera. Profile Maker always writes every code.

## Network name

Exports from firmware 2.6.1 hold one more code, `D12F`: the camera's Wi-Fi and Bluetooth name, which is the model name followed by the serial number unless changed. Firmware 2.6.4 does not write it, and its import does not use it. Not yet confirmed on a camera.

In February 2026, on an M-EV1 with firmware 2.6.1, a file holding another camera's `D12F` imported with no effect, and the same file with the M-EV1's own `D12F` worked. Why is an [open question](open-questions.md#network-name-and-a-failed-transfer). Leave `D12F` out of files you make, or keep the target camera's own value. Profile Maker keeps any code it does not know exactly as it was in the file it opened. Blank `D12F` before sharing a file: it holds the camera's serial number.

## Formatting the camera writes

A camera export is laid out in one exact way. Any valid JSON with the same content should import the same; not yet confirmed on a camera. Matching the layout lets a tool compare its output with a real export byte for byte. Profile Maker reads a real export and writes it back identical.

- Two spaces of indent per level.
- Every array element on its own line, including the single value of a camera-wide setting.
- No space after a colon, one line break after a comma.
- Keys in the camera's own order: `Camera`, `Version`, `Settings`, then the setting codes in the order of [factory values](settings/factory-values.md). The codes are not sorted.
- No line break after the final `}`.

JavaScript's `JSON.parse` moves keys that look like whole numbers (`5005`, `5010`, `5013`) to the front of an object. To keep the camera's order, read the order from the text, as `src/engine.js` does.

## Minimal example

A file for an M-EV1 with two saved profiles, Fast and Slow, that differ in their slowest shutter speed (`D00C`), starting in Fast:

```json
{
  "Camera":"LEICA M EV1",
  "Version":3185,
  "Settings":{
    "D00C":[
      2560,
      2560,
      2048,
      32770,
      32770,
      32770,
      32770
    ],
    "D124":[
      1
    ],
    "D6B2":[
      6
    ],
    "D037":[
      "Fast"
    ],
    "D038":[
      "Slow"
    ]
  }
}
```

- `D00C` slot 0 copies profile 1 (1/1000 s). Profile 2 is 1/250 s. Profiles 3 to 6 keep the factory value, 32770 (1/(4f) s).
- `D124` 1 starts the camera in profile 1.
- `D6B2` 6 marks profiles 1 and 2 as saved (2 + 4).

This file is valid JSON in the camera's layout, but it leaves out most codes. A file that leaves codes out is not yet confirmed to import cleanly; a file built for real use should hold every code, with factory values where you have nothing to change.

## Annotated excerpt

From a real M-EV1 export (firmware 2.6.1), shortened. Artist, copyright and network name are blanked.

```json
{
  "Camera":"LEICA M EV1",
  "Version":3185,
  "Settings":{
    "D010":[
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    "5013":[
      5,
      5,
      5,
      5,
      5,
      0,
      0
    ],
    ...
    "D124":[
      0
    ],
    "D6B2":[
      30
    ],
    "D037":[
      "Fast"
    ],
    ...
  }
}
```

| Line | Meaning |
|---|---|
| `"Camera":"LEICA M EV1"` | Written by an M-EV1. |
| `"Version":3185` | The number exports from firmware 2.6.1 carry. |
| `"D010":[0, ...]` | ISO (on the M-EV1) is Auto ISO in the live settings and in every profile. |
| `"5013":[5, 5, 5, 5, 5, 0, 0]` | Drive mode: Continuous, low speed (5) live and in profiles 1 to 4; Single (0) in profiles 5 and 6, which are unused and hold the factory value. |
| `"D124":[0]` | Start profile 0. What 0 means is an open question. |
| `"D6B2":[30]` | Profiles 1 to 4 are saved. |
| `"D037":["Fast"]` | Profile 1 is called Fast. |

The full file is in `test/fixtures/mev1-export.lcse`.
