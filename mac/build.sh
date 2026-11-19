#!/bin/zsh
# Builds "build/Msetter.app" from mac/ and the web app (index.html, src/).
# Universal (Apple silicon and Intel), signed for this Mac only (ad hoc).
# The app is built from the last commit, not the working folder, so uncommitted changes never ship;
# MSETTER_BUILD_WORKTREE=1 builds the working folder instead (for trying a change before committing it).
# The version comes from VERSION and goes into the app's Info.plist (its About window shows it).
set -e
cd "${0:A:h}/.."
APP="build/Msetter.app"
SRC=.
if [ "$MSETTER_BUILD_WORKTREE" != 1 ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  SRC="$(mktemp -d "${TMPDIR:-/tmp}/msetter-build.XXXXXX")"
  trap 'rm -rf "$SRC"' EXIT
  git archive HEAD index.html src mac VERSION | tar -x -C "$SRC"
  git diff --quiet HEAD -- index.html src mac VERSION && [ -z "$(git ls-files --others --exclude-standard -- index.html src mac VERSION)" ] \
    || echo "Uncommitted changes are left out of the app (MSETTER_BUILD_WORKTREE=1 builds them)."
  echo "building commit $(git rev-parse --short HEAD)"
else
  echo "building the working folder"
fi
VERSION="$(cat "$SRC/VERSION")"
rm -rf "$APP" build/AppIcon.iconset
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" build
for arch in arm64 x86_64; do
  swiftc -O -swift-version 5 -target $arch-apple-macos13 "$SRC/mac/main.swift" -o build/Msetter-$arch -framework AppKit -framework WebKit
done
lipo -create build/Msetter-arm64 build/Msetter-x86_64 -output "$APP/Contents/MacOS/Msetter"
rm build/Msetter-arm64 build/Msetter-x86_64
cp "$SRC/mac/Info.plist" "$APP/Contents/Info.plist"
plutil -replace CFBundleShortVersionString -string "$VERSION" "$APP/Contents/Info.plist"
plutil -replace CFBundleVersion -string "$VERSION" "$APP/Contents/Info.plist"
cp "$SRC/index.html" "$APP/Contents/Resources/web/"
cp -R "$SRC/src" "$APP/Contents/Resources/web/src"
swift "$SRC/mac/icon.swift" build/AppIcon.iconset
iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf build/AppIcon.iconset
codesign --force --deep --sign - "$APP"
echo "built $APP $VERSION"
