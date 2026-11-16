# Build one self-contained page from index.html and src/, for publishing where only one file can go.
# Usage: python3 tools/build_page.py [out.html]   (default dist/profile-maker.html)
# The output has no doctype, html, head or body tags: the claude.ai artifact host adds its own.
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'profile-maker.html')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

def src(path): return open(os.path.join(ROOT, path.split('?')[0]), encoding='utf-8').read()

css = ''.join(src(p) for p in re.findall(r'<link rel="stylesheet" href="([^"]+)">', html))
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
body = re.search(r'<body>(.*?)<script', html, re.S).group(1).strip()
desc = re.search(r'<meta name="description" content="([^"]+)">', html).group(1)

page = ['<title>Profile Maker</title>',
        '<meta name="claude:viewport-fit-sides" content="cover">',
        '<meta name="description" content="' + desc + '">',
        '<style>\n' + css + '\n</style>',
        body]
for s in scripts:
    page.append('<script>\n' + src(s).replace('</script', '<\\/script') + '\n</script>')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write('\n'.join(page) + '\n')
print(out, os.path.getsize(out) // 1000, 'KB')
