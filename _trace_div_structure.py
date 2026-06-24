import sys
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# admin-view closes at 100527 - show what it's actually closing
av_close = 100527
ctx = h[av_close-200:av_close+200]
print("=== What's around admin-view close (byte 100527) ===")
for line in ctx.split('\n'):
    s = line.strip()
    if s:
        print(f'  {s[:140]}')

# Find admin-workflows and show context
wf = 121149
print(f'\n=== What is admin-workflows context (byte 121149) ===')
ctx2 = h[wf-100:wf+200]
for line in ctx2.split('\n'):
    s = line.strip()
    if s:
        print(f'  {s[:140]}')

# Check what's between 100527 and 121149
between = h[100527:121149]
print(f'\n=== Between admin-view close and admin-workflows ({len(between)} bytes) ===')
# Check for divs in this region
import re
divs = [(m.start(), m.group()) for m in re.finditer(r'</?div[^>]*>', between)]
for pos, tag in divs[:20]:
    line = between[:pos].count('\n') + 1
    print(f'  byte {pos}: {tag[:80]}')
print(f'  ... total {len(divs)} div tags in this region')
