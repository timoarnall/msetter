#!/usr/bin/env python3
"""Writes src/version.js from VERSION, then stamps every script and stylesheet link in index.html with the first
8 characters of its file's SHA-256.

VERSION is the one place the version number is written by hand; the page reads it as the constant VERSION from
src/version.js, which index.html loads first. mac/build.sh copies the same file into the Mac app.
A browser keeps a file it has loaded for a while, so a changed file needs a new address or people keep the old one.
Stamping from the contents means the address changes exactly when the file does, and never by hand.
  python3 tools/stamp_versions.py          rewrite src/version.js and index.html
  python3 tools/stamp_versions.py --check  exit 1 if either is out of date (used by the tests and publishing)
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, 'index.html')
VERSION_FILE = os.path.join(ROOT, 'VERSION')
VERSION_JS = os.path.join(ROOT, 'src', 'version.js')
LINK = re.compile(r'((?:src|href)=")(src/[^"?]+)(?:\?v=[^"]*)?(")')
CHECK = '--check' in sys.argv

version = open(VERSION_FILE, encoding='utf-8').read().strip()
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    print('VERSION must hold one version number such as 1.0.0, not: ' + repr(version))
    sys.exit(1)
version_js = ("// Generated from VERSION by tools/stamp_versions.py. Do not edit by hand.\n"
              "var VERSION = '" + version + "';\n")


def read(p):
    return open(p, encoding='utf-8').read() if os.path.exists(p) else None


def stamp(m):
    if not os.path.exists(os.path.join(ROOT, m.group(2))):
        return m.group(0)  # only src/version.js can be missing here, and only with --check, which reports it
    with open(os.path.join(ROOT, m.group(2)), 'rb') as f:
        digest = hashlib.sha256(f.read()).hexdigest()[:8]
    return m.group(1) + m.group(2) + '?v=' + digest + m.group(3)


stale = []
if read(VERSION_JS) != version_js:
    stale.append('src/version.js')
    if not CHECK:
        open(VERSION_JS, 'w', encoding='utf-8').write(version_js)

html = read(PAGE)
page = html
if 'src="src/version.js' not in page:  # loaded first, so every other script can read VERSION
    page = page.replace('<script src="src/', '<script src="src/version.js"></script>\n<script src="src/', 1)
page = LINK.sub(stamp, page)
if page != html:
    stale.append('index.html')
    if not CHECK:
        open(PAGE, 'w', encoding='utf-8').write(page)

if CHECK and stale:
    print(' and '.join(stale) + ' out of date. Run: python3 tools/stamp_versions.py')
    sys.exit(1)
print(('wrote ' + ' and '.join(stale)) if stale else 'stamps up to date')
