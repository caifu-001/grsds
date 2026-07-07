import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Find all addEventListener with mousedown/mouseup/click
print('=== mousedown listeners ===')
for m in re.finditer(r"addEventListener\([\"']mousedown[\"']", c):
    pos = m.start()
    print(c[max(0, pos-30):pos+200])
    print('---')

print()
print('=== click listeners ===')
for m in re.finditer(r"addEventListener\([\"']click[\"']", c):
    pos = m.start()
    print(c[max(0, pos-30):pos+200])
    print('---')

print()
print('=== document.body / document onX ===')
for kw in ['document.body.onmousedown', 'document.onmousedown', 'document.body.onclick', 'document.onclick', 'onmousedown=', 'onmouseup=']:
    cnt = c.count(kw)
    if cnt > 0:
        print(f'{kw}: {cnt}')

# Check for any global mousedown that re-renders panel
print()
print('=== Looking for wfShowProps( calls in event handlers ===')
for m in re.finditer(r'wfShowProps\(', c):
    pos = m.start()
    ctx = c[max(0, pos-100):pos+100]
    if 'addEventListener' in ctx or 'onmousedown' in ctx or 'onclick' in ctx:
        print('FOUND:', ctx)
        print('---')
