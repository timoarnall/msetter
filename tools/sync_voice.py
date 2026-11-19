# Copies the house voice rules' verification grep into Msetter's public word list, so the word check
# (test/voice.test.js) uses the same patterns as every other piece of writing. The voice file is private: its
# path is never written into the repository.
#   python3 tools/sync_voice.py            rewrite the "voice" part of test/voice-words.json
#   python3 tools/sync_voice.py --check    exit 1 if the word list is out of date (tools/check.sh runs this)
# The voice file's path comes from $VOICE_FILE or tools/.voice_path (one line, not committed). Without either,
# the check prints a note and passes, so the public copy and GitHub's test run work without it.
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS = os.path.join(ROOT, 'test', 'voice-words.json')
CHECK = '--check' in sys.argv
# Patterns the app does not enforce, with the reason. Everything else in the grep is enforced.
SKIP = {'scolding': 'about the owner\'s own work cadence; the app never reports on it',
        'passive voice': 'a first net for prose; too many fixed phrases in docs (is saved, is reset) to fail a build on',
        'hedges': 'first-person hedges; the first-person check covers them',
        'preamble tells': 'letters and briefings; framing sentences are read by hand',
        'lead-ins, asides, second names': 'Markdown lead-ins are read by hand; "the body" is a project pattern'}
ABOUT = 'From the house voice rules\' verification grep, by tools/sync_voice.py. Do not edit by hand.'


def voice_path():
    p = os.environ.get('VOICE_FILE')
    dot = os.path.join(ROOT, 'tools', '.voice_path')
    if not p and os.path.exists(dot):
        with open(dot, encoding='utf8') as f:
            p = f.read().strip()
    return os.path.expanduser(p) if p else None


def patterns(text):
    if '## Verification grep' not in text:
        sys.exit('The voice file has no "## Verification grep" section; nothing to copy.')
    block = text.split('## Verification grep', 1)[1]
    out = {}
    for m in re.finditer(r'echo "-- ([^:"]+):";\s*grep -n(i?)E? (\$\'[^\']*\'|\'[^\']*\'|"[^"]*") "\$F"', block):
        name, ci, q = m.group(1).strip(), m.group(2) == 'i', m.group(3)
        if q.startswith("$'"):  # zsh $'...' quoting: the em-dash is written as bytes
            pat = bytes(q[2:-1], 'ascii').decode('unicode_escape').encode('latin-1').decode('utf8')
        else:
            pat = q[1:-1]
        if name not in SKIP:
            out[name] = {'re': pat, 'ci': ci}
    if not out:
        sys.exit('No patterns found in the voice file\'s grep block.')
    return out


p = voice_path()
if not p or not os.path.exists(p):
    print('No voice file found ($VOICE_FILE or tools/.voice_path); the word list stays as it is.')
    sys.exit(0)
with open(p, encoding='utf8') as f:
    new = patterns(f.read())
with open(WORDS, encoding='utf8') as f:
    words = json.load(f)
old = {k: v for k, v in words.get('voice', {}).items() if k != 'about'}
if CHECK:
    if old != new or words.get('voice_skipped') != SKIP:
        gone, added = sorted(set(old) - set(new)), sorted(set(new) - set(old))
        changed = sorted(k for k in set(old) & set(new) if old[k] != new[k])
        print('The voice rules changed since the word list was made. Run python3 tools/sync_voice.py.')
        for label, ks in (('removed', gone), ('added', added), ('changed', changed)):
            if ks:
                print('  %s: %s' % (label, ', '.join(ks)))
        sys.exit(1)
    print('Word list matches the voice rules (%d patterns).' % len(new))
    sys.exit(0)
words['voice'] = dict({'about': ABOUT}, **new)
words['voice_skipped'] = SKIP
with open(WORDS, 'w', encoding='utf8') as f:
    json.dump(words, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('Wrote %d voice patterns to %s' % (len(new), os.path.relpath(WORDS, ROOT)))
