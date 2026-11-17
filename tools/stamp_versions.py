#!/usr/bin/env python3
"""Stamps every script and stylesheet link in index.html with the first 8 characters of its file's SHA-256.

A browser keeps a file it has loaded for a while, so a changed file needs a new address or people keep the old one.
Stamping from the contents means the address changes exactly when the file does, and never by hand.
  python3 tools/stamp_versions.py          rewrite index.html
  python3 tools/stamp_versions.py --check  exit 1 if any stamp is out of date (used by the tests and publishing)
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, 'index.html')
LINK = re.compile(r'((?:src|href)=")(src/[^"?]+)(?:\?v=[^"]*)?(")')


def stamp(m):
    with open(os.path.join(ROOT, m.group(2)), 'rb') as f:
        digest = hashlib.sha256(f.read()).hexdigest()[:8]
    return m.group(1) + m.group(2) + '?v=' + digest + m.group(3)


html = open(PAGE, encoding='utf-8').read()
stamped = LINK.sub(stamp, html)
if '--check' in sys.argv:
    if stamped != html:
        print('index.html has out-of-date file stamps. Run: python3 tools/stamp_versions.py')
        sys.exit(1)
    print('stamps up to date')
elif stamped != html:
    open(PAGE, 'w', encoding='utf-8').write(stamped)
    print('index.html stamped')
else:
    print('stamps up to date')
