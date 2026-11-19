# Leica Q cameras

Msetter can set many of the settings on a Leica Q3, Q3 43 or Q2. [Open the app](https://timoarnall.github.io/msetter/app/) in a browser, choose your Q in the camera menu and open your camera's own export. Change what you want and save. Msetter writes your changes into that file and leaves the rest as the camera wrote it.

On all three, Msetter writes profile names, exposure limits, white balance, file format, Auto Review, eye sensor, EVF-LCD, the thumbwheel, the buttons and Favorites. On the Q3 and Q3 43 it also writes copyright, ISO, screen layouts, flash settings, EVF brightness, focus aid, the self-timer, connectivity and language. On the Q2 it also writes film styles with their contrast, sharpness and saturation, focus peaking, Auto Power Off, electronic shutter, screen brightness and capture assistants.

In tests, a Q2 kept nearly all the settings Msetter wrote. On the Q3 and Q3 43 the settings are untested. Msetter needs a Q3 or Q3 43 file from firmware 4 or later, and can't write files for the Q3 Monochrom. The Mac app doesn't offer the Q.

## Why Q support is experimental

A Q3 file on firmware 4.1 holds 587 settings, and most of them are not in an M file. For the M cameras, Msetter has a list of each setting and the values the camera accepts. The Q runs different firmware and no such list is available for it, so tests on a camera have to show what each Q setting is and which values it takes. Tests and shared files show what 95 of the 587 are, and give a likely meaning or a guess for most of the rest.

[Leica Q technical details](leica-q-technical.md) has what is known about each setting, the file format, other tools and the sources.

## How to help

Each result shows which settings the camera keeps and how it numbers them, and goes into the next version of Msetter.

**Import test.**
1. On the camera, choose Menu › User Profile › Manage Profiles › Export Profiles (Export Profile on the Q2).
2. Copy `settings.lcs` to your computer and keep a copy. Importing it restores your settings.
3. In Msetter, choose your Q in the camera menu, open that file, change some settings and save.
4. Copy the saved file to the top of the card, named exactly `settings.lcs`.
5. On the camera, choose Menu › User Profile › Manage Profiles › Import Profiles (Import Profile on the Q2).
6. Take photos of the camera screen showing the settings you changed.
7. Export again and open the new file in Msetter. It shows which settings the camera kept.
8. Choose the firmware version, press Email or GitHub, and add your photos.

**One-change test.**
1. Export and copy `settings.lcs` to your computer.
2. Change one setting on the camera and take a photo of the screen showing it.
3. Export again, copy the new file and open both files in Msetter. It names the settings that changed.
4. Type what you changed, choose the firmware version, press Email or GitHub, and add your photo.

On a Q3, each of these changes answers an open question:
- Thumbwheel button set to Perspective Control.
- Thumbwheel in S set to ISO.
- Digital Zoom Steps with only 90 mm switched off in photo mode.
- Vivid Look with Saturation +1 and nothing else.
- One item added to Favorites.
- Touch AF set to Touch AF + Release.
- One video resolution and its frame rate changed.
- Exposure Metering set to Center-Weighted.

Email goes to devise-put.1y@icloud.com, and GitHub opens a public [Q3 report](https://github.com/timoarnall/msetter/issues/new?template=q3-report.md) issue. The report leaves out profile names and copyright.
