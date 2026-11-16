# How the camera is organised

How the controls, menus and profiles of an M11-family camera fit together, and which parts a settings file can set. It is written from Leica's manuals for the M-EV1 and the M11-P, cited by page; the manuals are listed in the [documentation index](README.md#manuals). For the M11, M11-D and M11 Monochrom, see [cameras](cameras.md).

## Overview

The camera has three layers.

1. **Dials set things directly.** The shutter speed dial, the M11-P's ISO dial, and the aperture and focus rings on the lens are physical. Their positions are not stored anywhere a file can reach.
2. **Buttons do the jobs you give them.** The FN button, the top button, the thumbwheel and the M-EV1's front lever each run a job picked from a list. Their jobs are settings, stored per profile.
3. **Menus hold everything else.** A user profile is a saved set of menu settings, button jobs included. Loading a profile changes many settings at once.

A settings file holds layers 2 and 3. It cannot move a dial.

## Shutter speed dial

The dial turns without a stop and clicks at each marked speed and at half steps between them (M-EV1 manual p.36, M11-P manual p.44).

| Position | What the camera does |
|---|---|
| A | Aperture priority: you set the aperture on the lens, the camera picks the shutter speed (M-EV1 manual p.96). |
| 4000 to 8s | That fixed speed, 1/4000 s to 8 s. |
| B | Long exposure. The time, or B and T, is set in the Control Center (M-EV1 manual p.98 and 99). |
| Flash symbol | 1/180 s, the fastest speed for flash. |

On A with Auto ISO (the camera picks the ISO), two settings decide what happens as the light falls: the slowest shutter speed the camera will use before it raises ISO (`D00C`, Shutter Speed Limit) and the highest ISO it may raise to (`D00B`, Maximum ISO) (M-EV1 manual p.89, M11-P manual p.100 and 101). Both are per profile, so each profile can set its own limits for blur and noise while the dial stays on A. A fixed speed on the dial ignores the limit.

`D00C` can also follow the lens: 1/f is one over the focal length, so 1/50 s with a 50 mm lens; 1/(2f) and 1/(4f) are twice and four times as fast. This needs a lens the camera can identify, or a lens chosen by hand in Lens Detection (M-EV1 manual p.89).

## ISO dial

The M11-P has an ISO dial on the top plate: pull it up to turn it, push it down to lock (M11-P manual p.44).

| Position | ISO |
|---|---|
| A | Auto ISO, within Maximum ISO and Shutter Speed Limit. |
| 64, 200, 400, 800, 1600, 3200, 6400 | That fixed ISO. |
| M | The value of M-ISO in the menu: Auto ISO or any of 30 values from 64 to 50000 (M11-P manual p.99 and 100). |

The M-EV1 has no ISO dial. ISO is a menu setting, and by factory setting the thumbwheel press opens it (M-EV1 manual p.39 and 88).

Both cameras store this setting under the same code, `D010`, with different effects:

- On the M-EV1, `D010` is the ISO.
- On the M11-P, `D010` is M-ISO, used only when the dial is on M. Factory value 12500.

A file moved from one body to the other keeps the number but changes what it does. Msetter starts new designs with `D010` on Auto so a shared design never fixes ISO on the M-EV1.

## Function buttons

Three buttons take jobs on both cameras.

| Button | Where | Code while shooting |
|---|---|---|
| FN button | Left of the screen, the middle of three buttons | `D191` |
| Top button | On the top plate, the manuals' function button | `D193` |
| Thumbwheel press | Pressing the wheel under your thumb | `D195` |

A short press runs the job. Pressing and holding opens the list of jobs so you can pick another (M-EV1 manual p.52, M11-P manual p.60). Some jobs act at once (Focus Aid magnifies the view); most open a menu as a quick bar of choices. The list of jobs, which button and camera allows each one, and the factory jobs are in [button jobs](settings/button-jobs.md). The manuals list the jobs on M-EV1 manual p.154 to 156 and M11-P manual p.168 to 170.

Factory jobs (M-EV1 manual p.39, M11-P manual p.47):

| Button | M-EV1 | M11-P |
|---|---|---|
| FN button | EVF to LCD switch | Live View |
| Top button | Focus Aid | Focus Aid |
| Thumbwheel press | ISO | Exposure Compensation |

The M-EV1 manual gives the thumbwheel press as ISO on p.39 and as Exposure Compensation in its overview on p.154. The camera's factory value is ISO.

In review, while you look at pictures, the buttons have other jobs. The FN button's review job is its own setting, `D190` (M-EV1 manual p.121). The top button marks a picture with a star and the thumbwheel press changes magnification; their codes, `D192` and `D194`, allow only one value, so a file cannot change them.

Every button job is stored per profile. One profile can put Maximum ISO on the thumbwheel press and another can put Shutter Speed Limit there.

## Thumbwheel

Turning the thumbwheel moves through menus and zooms pictures in review. While shooting, its job is set by Customize Wheel (`D077`): No Function, Exposure Compensation or Focus Aid (M-EV1 manual p.53, M11-P manual p.61). The factory job is Exposure Compensation on the M-EV1 and No Function on the M11-P. While the view is magnified, the wheel changes the magnification instead (M-EV1 manual p.86).

Pressing the thumbwheel is a function button; see above.

## Front lever

The M-EV1 has a sprung lever on the front, beside the lens. It moves two ways, and each direction has its own job (M-EV1 manual p.53, M-EV1 quick start guide p.13):

| Direction | Code | Factory job |
|---|---|---|
| Towards the lens | `D1D6` | Focus Peaking |
| Away from the lens | `D1D7` | Digital Zoom |

A quick move runs the job; moving and holding opens the list. The lever's jobs are Digital Zoom, Focus Aid and Focus Peaking, and the file also allows Off.

The M11-P has a lever in the same place, the frame selector. It is mechanical: it shows other frame lines in the viewfinder and springs back (M11-P manual p.92). It has no job. The codes `D1D6` and `D1D7` are still in every M11-family camera's file.

## Center button

The center button of the direction pad confirms in menus. While shooting it steps through the screen layouts (M-EV1 manual p.79); on the M11-P it does so in Live View (M11-P manual p.85). Its job cannot be changed.

## Screen layouts

Leica calls these info profiles; Msetter calls them screen layouts. There are four. Each can turn on any mix of (M-EV1 manual p.78 to 83, M11-P manual p.84 to 89):

- info bars, the lines of settings along the top and bottom of the screen
- a grid of 3 by 3 or 6 by 4
- clipping, which marks areas that are too bright, with a limit from 200 to 255
- focus peaking, which outlines sharp edges in red, green, blue or white, with a sensitivity of Low or High
- a level gauge, which the file calls horizon
- a histogram

A layout with at least one item on shows as On and joins the center button's cycle. Pressing the center button goes from the full picture to the first active layout, then the next, then back to the full picture.

In the file each item of each layout is its own code, 40 codes in all, and every one is per profile. The manuals describe focus peaking sensitivity as one setting for all layouts (M-EV1 manual p.82); the file holds one per layout. Two more codes, `D07A` and `D07B`, record which layout is showing. All of them: [screen layouts](settings/screen-layouts.md).

## Touch screen

Tap, double tap, swipe and pinch move the focus frame, magnify, scroll pictures and switch to review (M-EV1 manual p.40, M11-P manual p.48). The manuals say only that touch can be switched off from firmware 2.0.0. The setting is Touch Mode (`D32B`), per profile, with three options: On, Off and Off (LV mode). Off (LV mode) turns touch off only in Live View; touch still works in review and the menus (see [answered](open-questions.md#touch-mode-off-in-lv-mode)).

## Viewfinder and screen

On the M-EV1, EVF <> LCD (`D0A2`) picks where the picture shows (M-EV1 manual p.61):

| Option | Shooting | Pictures and menus |
|---|---|---|
| Auto | Eye sensor switches | Eye sensor switches |
| EVF | Viewfinder | Viewfinder |
| LCD | Screen | Screen |
| EVF extended | Viewfinder | Eye sensor switches |

Eye sensor sensitivity (`D134`) and the brightness of the screen (`D01E`) and viewfinder (`D133`) are separate settings (M-EV1 manual p.62). On the M11-P, EVF <> LCD, eye sensor sensitivity and viewfinder brightness apply to the Visoflex 2 accessory viewfinder (M11-P manual p.68 and 69).

## Menus

The MENU button steps through three sections (M-EV1 manual p.41 and 42, M11-P manual p.49 and 50):

1. **Control Center** on the M-EV1, **status screen** on the M11-P: an overview of the camera's state with panels for the most used settings. It always comes first. Its layout is fixed.
2. **Favorites**: your own menu page, up to 11 items over up to two pages. It shows only when it holds at least one item.
3. **Main menu**: every setting, over several pages.

After the last page of the main menu, MENU returns to the Control Center. Holding MENU and pressing right on the direction pad steps back (M-EV1 manual p.46).

Favorites are chosen in Customize Control, Edit Favorites, by turning each menu item On or Off. Reset Favorites turns them all off (M-EV1 manual p.51, M11-P manual p.59). Which items can be Favorites is in the manuals' overview (M-EV1 manual p.154 to 156, M11-P manual p.168 to 170). In the file, Favorites are one per-profile setting, `D1A9`, so each profile can have its own Favorites page. How the list is written: [file format](file-format.md#lists-of-items).

## Profiles

The camera has six user profiles and a Default Profile, which holds the factory settings and cannot be changed (M-EV1 manual p.54 to 56, M11-P manual p.61 to 63).

- **Save**: User Profile, Manage Profiles, Save as Profile, then a slot. This copies the current settings into the slot and overwrites what was there.
- **Rename**: User Profile, Manage Profiles, Rename Profiles. Names are 3 to 10 characters.
- **Use**: User Profile, then a profile. The chosen one is marked Active and empty slots are grey.
- **Changed**: if you change a setting while a profile is active, an icon replaces the profile's name in the menu. The profile itself keeps its saved values until you save again.
- **Empty a slot**: only Reset Camera does this, by answering Yes to resetting user profiles (M-EV1 manual p.54 and 134).
- **Export and import**: User Profile, Manage Profiles, Export Profiles or Import Profiles. All six slots go together, empty ones included. Export overwrites the file on the card without asking; import overwrites every profile in the camera.
- **Saving**: settings are written permanently only when the camera is switched off (M-EV1 manual p.44, M11-P manual p.52).

The camera has no dial position for profiles. The quickest way to switch is a button with the job User Profile, which opens the list.

The manuals say a profile stores "any menu settings" and give no list. In the file, every setting is per profile except eleven: the six profile names, the start profile, the saved-profiles mask and the three lens choices. That puts button jobs, Favorites, screen layouts, Touch Mode and even Language in each profile. Whether the camera switches all of these when you change profile is not yet confirmed on a camera.

## What a settings file can set

| Control or feature | In the file | Codes |
|---|---|---|
| Shutter speed dial position | No | |
| ISO dial position (M11-P) | No | `D010` holds the value for M |
| Aperture and focus rings | No | |
| FN button | Yes, per profile | `D191`, and `D190` in review |
| Top button | Yes, per profile | `D193`; `D192` in review is fixed |
| Thumbwheel press | Yes, per profile | `D195`; `D194` in review is fixed |
| Thumbwheel turn | Yes, per profile | `D077` |
| Front lever (M-EV1) | Yes, per profile | `D1D6`, `D1D7` |
| Frame selector lever (M11-P) | No | |
| Center button | No; it always steps through the layouts | |
| Screen layouts | Yes, per profile | 40 codes, see [screen layouts](settings/screen-layouts.md) |
| Which layout is showing | Yes, per profile | `D07A`, `D07B` (meaning not yet confirmed on a camera) |
| Touch screen on or off | Yes, per profile | `D32B` |
| Control Center or status screen layout | No | |
| Favorites page | Yes, per profile | `D1A9` |
| Exposure settings: compensation, metering, Auto ISO limits | Yes, per profile | `5010`, `500B`, `D00B`, `D00C` |
| Profile names | Yes, camera-wide | `D037`, `D038`, `D039`, `D03A`, `D0AD`, `D0AE` |
| Which profiles are saved | Yes, camera-wide | `D6B2` |
| Which profile the camera starts in | Yes, camera-wide | `D124` |
| Lens chosen by hand | Yes, camera-wide | `D1AB`, `D1AC`, `D1AD` |
| Date and time | No; only the date and time formats | `D031`, `D032` |
| Main switch, shutter button, PLAY, MENU, direction pad | No | |

Everything else in the menus that has a code is listed in the [settings reference](settings/README.md).

## Things to keep in mind

- Exposure compensation stays set until you set it back to 0, even after the camera is switched off (M-EV1 manual p.104). A profile that sets it will hold it.
- Maximum ISO and Shutter Speed Limit only act when ISO is Auto: dial on A, or M-ISO set to Auto with the dial on M on the M11-P; ISO set to Auto on the M-EV1.
- Changing a setting, from a button or a menu, changes the live settings. The profile keeps its saved values until you save it again, and the menu marks it as changed (M-EV1 manual p.54 and 55).
- The camera never reports a problem with an imported file. Check a file against the camera's rules before importing it; see [file format](file-format.md#what-import-does).
