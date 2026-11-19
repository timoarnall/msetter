#!/bin/zsh
# Makes the Mac app's release files from the commit every check passed on:
# builds the app from that commit, runs its self-test (30 seconds at most), zips the app, writes the zip's SHA-256,
# and prints the gh command that makes the GitHub release. It does not run that command.
#   zsh mac/release.sh
# Refuses unless zsh tools/check.sh passed on this exact commit with nothing uncommitted (tools/.checked).
set -e; setopt pipefail
cd "${0:A:h}/.."
VERSION="$(cat VERSION)"
STATE="$(zsh tools/commit_state.sh)"
[ "$(cut -d' ' -f1,2 tools/.checked 2>/dev/null)" = "$(git rev-parse HEAD) clean" ] \
  || { echo "Every check must pass on this commit first: run zsh tools/check.sh, then release."; exit 1; }
[ "$STATE" = "$(git rev-parse HEAD) clean" ] || echo "Uncommitted changes are left out: the app is built from commit ${STATE:0:12}."

MSETTER_BUILD_WORKTREE= zsh mac/build.sh
BIN="build/Msetter.app/Contents/MacOS/Msetter"
SHOT="build/selftest.png"
[ "$(plutil -extract CFBundleShortVersionString raw build/Msetter.app/Contents/Info.plist)" = "$VERSION" ] \
  || { echo "The app's version is not $VERSION."; exit 1; }

# The self-test opens the page in the app, checks its files and its version, and quits. A page that never loads
# would leave it waiting, so it gets 30 seconds.
echo "== self-test"
"$BIN" --selftest "$SHOT" & PID=$!
( sleep 30; kill $PID 2>/dev/null && echo "The self-test took longer than 30 seconds and was stopped." ) & WATCH=$!
RC=0; wait $PID || RC=$?
kill $WATCH 2>/dev/null || true
[ $RC = 0 ] || { echo "The self-test failed (exit $RC)."; exit 1; }

ZIP="build/Msetter-$VERSION.zip"
rm -f "$ZIP" "$ZIP.sha256"
ditto -c -k --keepParent build/Msetter.app "$ZIP"
(cd build && shasum -a 256 "Msetter-$VERSION.zip" > "Msetter-$VERSION.zip.sha256")
NOTES="$(grep -m1 "^- $VERSION " CHANGELOG.md | sed -E 's/^- [^:]*: //')"

echo "== release files"
cat "$ZIP.sha256"
echo
echo "To release, publish the web app for this commit first (it carries VERSION and CHANGELOG.md), then run:"
echo
echo "  gh release create v$VERSION -R timoarnall/msetter --title \"Msetter $VERSION\" --notes ${(q-)NOTES} \"$ZIP\" \"$ZIP.sha256\""
