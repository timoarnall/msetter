# How Msetter works

The settings file, what a camera does when it imports one, and what Msetter does to make sure each camera gets a file it takes.

**A settings file is plain text.** When you export (User Profile › Manage Profiles › Export Profiles), the camera writes one file, `settings.lcse`, to the top level of the card, next to the `DCIM` folder. Import reads the same file back. Inside is JSON, a common text format for data, so any text editor can open it. It has no checksum and no encryption.

**Each setting is a code and a list of values.** The code is four characters, such as `5013` for Drive Mode. Codes that start with 5 are standard codes from PTP, the protocol cameras use over USB; codes that start with D are Leica's own. A setting that belongs to user profiles has seven values: the first is what the camera is using now, and the other six are user profiles one to six. A setting for the whole camera has a single value; only a few are like that, such as the profile names, which profiles are saved and which one the camera starts in. The M11, M11-P and M-EV1 write 139 settings, the M11-D 140 and the M11 Monochrom 145. Shortened, a file looks like this:

```
{
  "Camera": "LEICA M11-P",
  "Version": 3185,
  "Settings": {
    "5013": [0, 0, 7, 0, 0, 0, 0],
    "D037": ["Day"],
    "D038": ["Sport"],
    "D124": [1],
    "D6B2": [6],
    ...
  }
}
```

`Camera` is the camera's name. `Version` is a number the camera writes; every export so far holds 3185. `5013` is Drive Mode: Single (0) now and in profile 1, Continuous - high speed (7) in profile 2, Single in the rest. `D037` and `D038` are the names of profiles 1 and 2. `D124` starts the camera in profile 1. `D6B2` says which profiles are saved: each saved profile adds its own number, 2 for profile 1, 4 for profile 2, 8 for profile 3 and so on up to 64, so 6 means profiles 1 and 2 (a bitmask). The camera puts every value on its own line, in a fixed order; this is spaced for reading. Favorites and the lens lists vary in length, so the camera writes each of their slots as a leading value, a count and that many items, one after another in a single array.

**A file holds the user profiles and most menu settings.** That includes the six profile names, which profiles are saved, which one the camera starts in, the job of each button (top button, FN, thumbwheel press and turn, FN on pictures, and the M-EV1's front lever both ways), the Favorites menu in order with up to 11 items per profile, the four screen layouts, white balance, film styles, file names, copyright and power saving.

**A file can't change what you set by hand.** The shutter speed dial, the aperture ring and the ISO dial stay where they are. A file also can't set the date, the time or the camera's network name, or reorder the main menu. The M-EV1 has no ISO dial, so on the M-EV1 the ISO is a setting in the file.

**Import checks the camera's name first.** The camera compares the `Camera` line with its own name, exactly: a file that says `LEICA M11-P` imports only on an M11-P. If the names differ, nothing changes. Then the camera looks up every setting it knows in the file and checks each value on its own. It skips a value it doesn't allow and keeps the old one. A setting missing from the file keeps its current value, and the camera ignores a code it doesn't know. Last, it resets every profile the file doesn't mark as saved to factory settings. The camera shows no message for any of this, so an import can finish and change nothing.

**Msetter saves one file per camera.** A file imports only on the camera it names. Msetter checks every value against each camera's rules before saving, because the camera skips a wrong value and doesn't say so, and when you open a file it lists anything a camera would skip. It knows every setting's code, allowed values and factory value on each camera, so it can write a complete file without an export from the camera. When you start from your own export, Msetter keeps anything it doesn't recognize exactly as it was.

**Files from Msetter match the camera's own.** Given the same values, a file Msetter writes from scratch matches a real export byte for byte: the same codes in the same order, laid out the same way. The one difference is the network name, which newer firmware leaves out. A test checks this on every change.

**Moving profiles between cameras.** The M11, M11-P, M11 Monochrom and M-EV1 write the same layout and mostly the same codes. They differ in a few settings, in the options some allow, and in a few cases in what a code means: `D010` is the ISO on the M-EV1, but on the M11-P it is the ISO the dial uses at M. Msetter keeps every value the other camera allows, and for the rest uses the closest one it has and tells you.

**Files from Msetter import on real cameras.** Files Msetter wrote from scratch imported on an M11-P and an M-EV1 on firmware 2.6.4. Both cameras accepted the file and list its profiles. Whether they kept every value exactly is unknown. To find out, export after the import and compare that export with the file you imported. Some import steps are also untested on a camera, such as resetting unsaved profiles. The [open questions](docs/open-questions.md) list each one, with how to test it safely.

**Nothing leaves your device.** Msetter is a web page with no server. It runs in your browser, reads the files you open inside it, and keeps your profiles in the browser's storage on your device. Clearing the site's data removes them. The page tells the browser to refuse every network request (a Content-Security-Policy), and a test fails if the code ever tries to make one. The Mac app is the same page in a window. It can also save straight to a card, and copies the card's own file to a backup folder first.

**The M11-D can't import a file.** It has a settings file but no user profiles and no Import Profiles, either on the camera or in the Leica FOTOS app (M11-D manual; owners on the Leica forum, November 2024).

More: the [file format](file-format.md), [every setting](settings/README.md), the [cameras compared](cameras.md), [how the controls fit together](interaction-architecture.md), the [open questions](open-questions.md) and [if something goes wrong](if-something-goes-wrong.md).
