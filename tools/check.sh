#!/bin/zsh
# Every check in one command, so a person or an agent can tell in one run whether anything broke:
# unit tests, file stamps, generated docs, the save proof, Chrome and WebKit, and the browser flows on a local server
# of its own (a free port, stopped at the end). Stops at the first failure.
#   zsh tools/check.sh          everything
#   zsh tools/check.sh quick    unit tests, stamps and generated docs only
# The browser checks need Playwright: set NODE_PATH to a folder whose node_modules holds it, or put that path in
# tools/.node_path (not committed).
set -e; setopt pipefail
cd "${0:A:h}/.."
NODE=/opt/homebrew/opt/node@24/bin/node; [ -x "$NODE" ] || NODE=node
[ -z "$NODE_PATH" ] && [ -f tools/.node_path ] && export NODE_PATH="$(cat tools/.node_path)"

echo "== unit tests"; $NODE --test --test-reporter=dot test/*.test.js
echo "== file stamps"; python3 tools/stamp_versions.py --check
echo "== generated docs"
sums() { find docs src/q3codes.js -type f -exec shasum {} + | sort | shasum; }
BEFORE=$(sums); python3 tools/build_docs.py >/dev/null; python3 tools/build_q_codes.py >/dev/null
[ "$BEFORE" = "$(sums)" ] || { echo "Generated docs or src/q3codes.js were out of date and are now rebuilt: check them in."; exit 1; }
[ "$1" = quick ] && { echo "== quick checks passed"; exit 0; }

[ -n "$NODE_PATH" ] || { echo "Set NODE_PATH (or tools/.node_path) to run the browser checks."; exit 1; }
echo "== save proof"; $NODE test/save-golden.js --check | tail -1 | tee /dev/stderr | grep -q '^0 differences'
echo "== Chrome and WebKit"; $NODE test/browser-check.js
PORT=$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!; trap 'kill $SERVER 2>/dev/null' EXIT
for i in {1..50}; do curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html" && break; sleep 0.1; done
echo "== browser flows (port $PORT)"; $NODE test/flows.js "http://127.0.0.1:$PORT/index.html" | grep -v '^PASS'
echo "== every check passed"
