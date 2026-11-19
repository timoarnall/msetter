#!/bin/zsh
# Prints the last commit and whether the folder holds anything that commit doesn't: "<commit> clean" or "<commit> dirty".
# Dirty means a changed tracked file anywhere, or a new file where the app, its checks or its releases look.
# tools/check.sh records it when every check passes; tools/publish_public.sh and mac/release.sh refuse anything else.
cd "${0:A:h}/.."
HEAD="$(git rev-parse --verify -q HEAD)" || exit 1
NEW="$(git ls-files --others --exclude-standard -- index.html src docs site test tools mac camera-test dist .github \
  package.json package-lock.json VERSION CHANGELOG.md LICENSE README.md)"
if git diff --quiet HEAD && [ -z "$NEW" ]; then echo "$HEAD clean"; else echo "$HEAD dirty"; fi
