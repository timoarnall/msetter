#!/bin/zsh
# Builds "build/Profile Maker.app" from mac/ and the web app (index.html, src/).
# Universal (Apple silicon and Intel), signed for this Mac only (ad hoc).
set -e
cd "${0:A:h}/.."
APP="build/Profile Maker.app"
rm -rf "$APP" build/AppIcon.iconset
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" build
for arch in arm64 x86_64; do
  swiftc -O -swift-version 5 -target $arch-apple-macos13 mac/main.swift -o build/ProfileMaker-$arch -framework AppKit -framework WebKit
done
lipo -create build/ProfileMaker-arm64 build/ProfileMaker-x86_64 -output "$APP/Contents/MacOS/ProfileMaker"
rm build/ProfileMaker-arm64 build/ProfileMaker-x86_64
cp mac/Info.plist "$APP/Contents/Info.plist"
cp index.html "$APP/Contents/Resources/web/"
cp -R src "$APP/Contents/Resources/web/src"
swift mac/icon.swift build/AppIcon.iconset
iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf build/AppIcon.iconset
codesign --force --deep --sign - "$APP"
echo "built $APP"
