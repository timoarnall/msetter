# Build one self-contained page from index.html and src/, for publishing where only one file can go.
# Usage: python3 tools/build_page.py [out.html]   (default dist/profile-maker.html)
# The output has no doctype, html, head or body tags: the claude.ai artifact host adds its own.
# index.html's Content-Security-Policy can't come along: it refuses inline scripts, and this page is nothing but inline
# scripts. A policy in a <meta> tag only counts inside <head>, and the claude.ai host puts this file inside <body>, so
# the first script adds one to <head> instead (POLICY). It forbids what the page never uses and the host's own code
# doesn't need: plugins, a changed base address, form posts and network requests. Scripts stay open: the host loads
# the code behind Save (its downloads capability) after the page's own scripts.
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLICY = "object-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'"
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'profile-maker.html')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

def src(path): return open(os.path.join(ROOT, path.split('?')[0]), encoding='utf-8').read()

css = ''.join(src(p) for p in re.findall(r'<link rel="stylesheet" href="([^"]+)">', html))
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
body = re.search(r'<body>(.*?)<script', html, re.S).group(1).strip()
desc = re.search(r'<meta name="description" content="([^"]+)">', html).group(1)

page = ['<title>Msetter</title>',
        '<meta name="claude:viewport-fit-sides" content="cover">',
        '<meta name="description" content="' + desc + '">',
        '<script>(function () { var m = document.createElement(\'meta\'); m.httpEquiv = \'Content-Security-Policy\'; '
        'm.content = "' + POLICY + '"; document.head.appendChild(m); })();</script>',
        '<style>\n' + css + '\n</style>',
        body]
for s in scripts:
    page.append('<script>\n' + src(s).replace('</script', '<\\/script') + '\n</script>')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write('\n'.join(page) + '\n')
print(out, os.path.getsize(out) // 1000, 'KB')
