#!/bin/zsh
# Every check in one command, so a person or an agent can tell in one run whether anything broke:
# unit tests, file stamps, generated docs, the one-file copy, the save proof, Chrome and WebKit, and the browser flows
# on a local server of its own (a free port, stopped at the end). Stops at the first failure.
#   zsh tools/check.sh          everything (also: npm run check)
#   zsh tools/check.sh quick    unit tests, stamps, generated docs and the one-file copy only (npm run check:quick)
# When everything passes, it writes the commit it checked to tools/.checked (not committed), with "clean" when the
# folder held nothing else. tools/publish_public.sh and mac/release.sh refuse any other commit.
# The browser checks need Playwright: set NODE_PATH to a folder whose node_modules holds it, put that path in
# tools/.node_path (not committed), or run npm install here.
set -e; setopt pipefail
cd "${0:A:h}/.."
NODE=/opt/homebrew/opt/node@24/bin/node; [ -x "$NODE" ] || NODE=node
[ -z "$NODE_PATH" ] && [ -f tools/.node_path ] && export NODE_PATH="$(cat tools/.node_path)"
[ -z "$NODE_PATH" ] && [ -d node_modules/playwright ] && export NODE_PATH="$PWD/node_modules"
START="$(zsh tools/commit_state.sh 2>/dev/null)" || START=""   # empty outside a git repository

echo "== unit tests"; $NODE --test --test-reporter=dot test/*.test.js
echo "== file stamps"; python3 tools/stamp_versions.py --check
echo "== voice word list"; python3 tools/sync_voice.py --check
echo "== generated docs"
sums() { find docs src/q3codes.js site/index.html -type f -exec shasum {} + | sort | shasum; }
BEFORE=$(sums); python3 tools/build_docs.py >/dev/null; python3 tools/build_q_codes.py >/dev/null; [ -f site/images/stamp.txt ] && python3 tools/build_site.py >/dev/null
[ "$BEFORE" = "$(sums)" ] || { echo "Generated docs or src/q3codes.js were out of date and are now rebuilt: check them in."; exit 1; }
echo "== one-file copy"
if [ -f dist/profile-maker.html ]; then
  BEFORE=$(shasum dist/profile-maker.html); python3 tools/build_page.py >/dev/null
  [ "$BEFORE" = "$(shasum dist/profile-maker.html)" ] || { echo "dist/profile-maker.html was out of date and is now rebuilt: check it in."; exit 1; }
else
  python3 tools/build_page.py "${TMPDIR:-/tmp}/msetter-one-file.html" >/dev/null   # the public copy has no dist/: it only has to build
fi
[ "$1" = quick ] && { echo "== quick checks passed"; exit 0; }

[ -n "$NODE_PATH" ] || { echo "Set NODE_PATH (or tools/.node_path), or run npm install, to run the browser checks."; exit 1; }
# The save proof and one browser flow open the test files in camera-test/, which only the private repository holds.
KITS=1; [ -d camera-test ] || KITS=
if [ -n "$KITS" ]; then
  echo "== save proof"; $NODE test/save-golden.js --check | tail -1 | tee /dev/stderr | grep -q '^0 differences'
else
  echo "== save proof skipped: no camera-test/ folder here"
fi
echo "== Chrome and WebKit"; $NODE test/browser-check.js
if [ -n "$KITS" ]; then
  PORT=$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
  python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER=$!; trap 'kill $SERVER 2>/dev/null' EXIT
  for i in {1..50}; do curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html" && break; sleep 0.1; done
  echo "== browser flows (port $PORT)"; $NODE test/flows.js "http://127.0.0.1:$PORT/index.html" | grep -v '^PASS'
  echo "== layers (port $PORT)"; $NODE test/layers.js "http://127.0.0.1:$PORT/index.html" | grep -v '^PASS'
  echo "== marks (port $PORT)"; $NODE test/marks.js "http://127.0.0.1:$PORT/index.html" | grep -v '^PASS'
  echo "== state walk"; $NODE test/state-walk.js 300 7 11 23 "http://127.0.0.1:$PORT/index.html" | tail -1
else
  echo "== browser flows skipped: no camera-test/ folder here"
  echo "== every check that can run here passed (none recorded as a passed commit)"; exit 0
fi

echo "== every check passed"
END="$(zsh tools/commit_state.sh 2>/dev/null)" || END=""
[ -n "$END" ] || exit 0
if [ "$START" = "$END" ]; then echo "$END $(date -u +%Y-%m-%dT%H:%M:%SZ)" > tools/.checked
else echo "${END%% *} changed $(date -u +%Y-%m-%dT%H:%M:%SZ)" > tools/.checked; fi
case "$(cat tools/.checked)" in
  *" clean "*) echo "Recorded in tools/.checked: commit ${END:0:12} passed every check." ;;
  *) echo "Not recorded as a passed commit: the folder had uncommitted changes or changed during the checks." ;;
esac
