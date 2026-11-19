# If something goes wrong

Every case ends the same way: put back the export you made before you started. The Save sheet's first step makes it, and Msetter keeps a copy of any file you opened in this browser.

## Back to how it was

1. Copy your earlier export to the top of the card and name it `settings.lcse`.
2. On the camera: User Profile › Manage Profiles › Import Profiles.
3. The camera takes every value in the file and resets the profiles the file doesn't hold. Your camera is as it was when you exported.

The camera never changes until you import, so a file you haven't imported can't have done anything.

## When the camera won't import the file

- The file must be called `settings.lcse` and sit at the top of the card, not in a folder.
- It must be made for this camera: an M-EV1 refuses a file made for an M11-P. Save makes one file per camera; Save all puts each in its own folder in the zip.
- If the name and camera are right, the file may be damaged on the way to the card. Save it again from Msetter and copy it again.

Nothing changed on the camera. If you want the camera as it was before you started, it already is.

## Something is wrong after importing

A value the camera can't use is skipped without a word, and the setting keeps what it had. A wrong value can also come from a change you didn't mean to make.

1. Open the camera's own new export in Msetter: User Profile › Manage Profiles › Export Profiles, then Open in Msetter. The table shows what the camera holds now.
2. Change what is wrong and save again, or go back to how it was, above.
3. If Msetter wrote a value the camera then showed wrongly, report it: [open an issue](https://github.com/timoarnall/msetter/issues/new) with the camera, its firmware and the setting.

## Your profiles are gone from the page

Msetter keeps your profiles in this browser only. Another browser, another device, a private window or cleared site data starts fresh.

- Open the last file you saved from Msetter: it holds every profile.
- If the page says your profiles couldn't be read and this is a fresh start, a copy was set aside in this browser; [open an issue](https://github.com/timoarnall/msetter/issues/new) and it can be recovered.
- To keep a profile across designs, save it to the library from its … menu.

If none of this brought your profiles back, go back to how it was, above: the camera still holds what you last imported.
