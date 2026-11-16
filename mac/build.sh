#!/bin/zsh
# Builds "build/Msetter.app" from mac/ and the web app (index.html, src/).
# Universal (Apple silicon and Intel), signed for this Mac only (ad hoc).
set -e
cd "${0:A:h}/.."
APP="build/Msetter.app"
rm -rf "$APP" build/AppIcon.iconset
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" build
for arch in arm64 x86_64; do
  swiftc -O -swift-version 5 -target $arch-apple-macos13 mac/main.swift -o build/Msetter-$arch -framework AppKit -framework WebKit
done
lipo -create build/Msetter-arm64 build/Msetter-x86_64 -output "$APP/Contents/MacOS/Msetter"
rm build/Msetter-arm64 build/Msetter-x86_64
cp mac/Info.plist "$APP/Contents/Info.plist"
cp index.html "$APP/Contents/Resources/web/"
cp -R src "$APP/Contents/Resources/web/src"
swift mac/icon.swift build/AppIcon.iconset
iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf build/AppIcon.iconset
codesign --force --deep --sign - "$APP"
echo "built $APP"
