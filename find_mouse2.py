import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# find any addEventListener with mousemove
import re
print('=== ALL mousemove/mouseup/mousedown listeners ===')
for ev in ['mousemove', 'mouseup', 'mousedown']:
    pattern = r'addEventListener\(' + chr(34) + ev + chr(34)
    for m in re.finditer(pattern, c):
        pos = m.start()
        # find the line/scope
        line_start = c.rfind('\n', 0, pos) + 1
        line_end = c.find('\n', pos)
        line = c[line_start:line_end][:300]
        # find what's before
        prefix = c[max(0, pos-150):pos]
        # find what target
        tm = re.search(r'(\w+(?:\.\w+)*)\s*\.addEventListener', c[max(0, pos-200):pos])
        target = tm.group(1) if tm else '?'
        print('  target=' + target + ' ev=' + ev)
        print('    line: ' + line[:250])
        print('    next 300 chars: ' + c[pos:pos+300])
        print()
