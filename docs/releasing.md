# Releasing

A release puts one version of Msetter in three places: the web app on GitHub Pages, the Mac app on the GitHub releases page, and the one-file copy of the page on claude.ai. All three are made from one commit on which every check passed.

## Version

`VERSION` holds the version number, such as `1.0.0`, and is the only place it is typed. `python3 tools/stamp_versions.py` writes it into `src/version.js` as the page's `VERSION` constant. `mac/build.sh` writes it into the Mac app's `Info.plist`, so the app's About window shows it. `test/versions.test.js` fails when they disagree, and the Mac app's self-test fails when the app's version is not the page's.

A fix raises the last number (1.0.1). A new feature raises the middle number (1.1.0). A change that makes saved files or stored designs behave differently raises the first number (2.0.0).

`CHANGELOG.md` has one line per publish, newest first: the version, the date and what changed, in plain words.

## Steps

1. **Set the version.** Edit `VERSION`, run `python3 tools/stamp_versions.py`, add the line to `CHANGELOG.md` and commit.
2. **Run every check.** `zsh tools/check.sh`, or `npm run check`. When every check passes and nothing is uncommitted, it writes the commit to `tools/.checked`. Publishing and the Mac release refuse any other commit, so any change after the check means running it again.
3. **Publish the web app.** From `main` in the private repository, `zsh tools/publish_public.sh "<the CHANGELOG line>"` copies the public files to the public repository. The Pages workflow then publishes the project page and the app.
4. **Release the Mac app.** `zsh mac/release.sh` builds the app from the checked commit and runs its self-test, which has 30 seconds to load the page, check the saved files and compare the versions. It then zips the app with `ditto`, writes the zip's SHA-256 beside it in `build/`, and prints the `gh release create v<VERSION>` command. Run that command once the web app is published.
5. **Update the claude.ai copy.** `python3 tools/build_page.py` writes `dist/profile-maker.html`. The check already rebuilt and compared it, so it matches the commit. Publish it to the same artifact address as before so the link stays the same; the address is in the private repository's notes. Open it there and save one file, to confirm Save works under that host.

## Refusals

- `tools/publish_public.sh` refuses away from `main`, with uncommitted changes, when `tools/.checked` does not name this commit as clean, when the newest line of `CHANGELOG.md` does not start with the version in `VERSION` or still says "[to be written", when a stamp or a generated doc is out of date, and when it finds private text.
- `MSETTER_PUBLISH_UNCHECKED=1 zsh tools/publish_public.sh "..."` publishes without a passed check, after a warning and five seconds to stop it. Use it only when the checks themselves are broken and the publish cannot wait.
- `mac/release.sh` refuses unless `tools/.checked` names this commit as clean.
- `mac/build.sh` builds from the last commit, so uncommitted changes never reach the app. `MSETTER_BUILD_WORKTREE=1 zsh mac/build.sh` builds the working folder, for trying a change before committing it.

## Checks on another computer

The checks need zsh, Python 3 and Node 24. From a fresh clone, run `npm ci`, then `npx playwright install chromium webkit`, then `npm run check`. `tools/check.sh` finds Playwright in `node_modules`. The browser checks run in WebKit and in Google Chrome, or in Playwright's own Chromium where Chrome is not installed.

The public repository runs the same command on every push and pull request (`.github/workflows/check.yml`). The public copy has no `camera-test/` folder, so there the check skips the save proof and the browser flows, says so, and records no passed commit.
