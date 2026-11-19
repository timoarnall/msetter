#!/usr/bin/env python3
"""Makes site/index.html from site/index.src.html: each PIC:name:alt becomes the GIF of that name in light and dark
(site/images/name-light.gif, name-dark.gif, made by tools/shoot/docs.js), each STILL:name:alt the still of that name,
both with their exact sizes, and ABOUT becomes the app's own About words (Words.ABOUT in src/words.js), so the page's
footer and the app's About can't drift apart. tools/check.sh runs it and fails when the page was out of date.
  python3 tools/build_site.py"""
import html, re, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT, IMAGES = ROOT / 'site/index.src.html', ROOT / 'site/index.html', ROOT / 'site/images'


def size(p):
    b = p.read_bytes()[:32]
    if b[:6] in (b'GIF87a', b'GIF89a'):
        return struct.unpack('<HH', b[6:10])
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    sys.exit(f'{p}: not a GIF or PNG')


def picture(name, alt, ext, cls='shot'):
    light, dark = IMAGES / f'{name}-light.{ext}', IMAGES / f'{name}-dark.{ext}'
    for p in (light, dark):
        if not p.exists():
            sys.exit(f'{p.relative_to(ROOT)} is missing: run node tools/shoot/docs.js')
    w, h = size(light)
    # width and height give the picture its shape before it loads; the page draws it at its column's width
    return (f'<picture><source media="(prefers-color-scheme: dark)" srcset="images/{dark.name}">'
            f'<img class="{cls}" src="images/{light.name}" width="{w}" height="{h}" alt="{html.escape(alt, quote=True)}" loading="lazy"></picture>')


def about():
    words = (ROOT / 'src/words.js').read_text()
    block = re.search(r'var ABOUT = \[(.*?)\];', words, re.S).group(1)
    lines = re.findall(r"'((?:[^'\\]|\\.)*)'", block)
    url = re.search(r"var AUTHOR_URL = '([^']+)';", words).group(1)

    def line(l):  # the name in the credit line links to the author's site, as in the app (Words.aboutHTML)
        m = re.match(r'^(Made by )(.+?)( and .*)$', l)
        if not m:
            return html.escape(l)
        return f'{html.escape(m.group(1))}<a href="{url}">{html.escape(m.group(2))}</a>{html.escape(m.group(3))}'
    return ''.join(f'<p>{line(l)}</p>' for l in lines)


def main():
    text = SRC.read_text()
    text = re.sub(r'PIC:([\w-]+):([^\n<]+)', lambda m: picture(m.group(1), m.group(2).strip(), 'gif'), text)
    text = re.sub(r'STILL:([\w-]+):([^\n<]+)', lambda m: picture('still-' + m.group(1), m.group(2).strip(), 'png'), text)
    text = text.replace('ABOUT', about(), 1)
    head = '<!-- Made by tools/build_site.py from site/index.src.html: edit that file, then run it. -->\n'
    OUT.write_text(text.replace('<!doctype html>\n', '<!doctype html>\n' + head, 1))
    print('wrote', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
