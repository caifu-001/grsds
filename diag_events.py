import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# all document.addEventListener
print('=== document.addEventListener ===')
for m in re.finditer(r"document\.addEventListener\([\"']([^\"']+)[\"']", c):
    print(f'  event: {m.group(1)}')

# all window.addEventListener
print('=== window.addEventListener ===')
for m in re.finditer(r"window\.addEventListener\([\"']([^\"']+)[\"']", c):
    print(f'  event: {m.group(1)}')

# all addEventListener calls (any target)
print()
print('=== All addEventListener events (top-level) ===')
events = set()
for m in re.finditer(r"\.addEventListener\([\"']([^\"']+)[\"']", c):
    events.add(m.group(1))
for e in sorted(events):
    print(f'  {e}')

# Search for any onclick that calls wfShowProps or replaces panel
print()
print('=== onclick handlers that touch panel ===')
for m in re.finditer(r'onclick="[^"]*panel[^"]*"', c):
    print(f'  {m.group()[:200]}')
print()

# Search for any 'close on outside click' style logic
print('=== Looking for stopPropagation / preventDefault on panel ===')
for m in re.finditer(r'(wf-props-panel|wfShowProps)', c):
    pos = m.start()
    ctx = c[max(0, pos-200):pos+200]
    if 'addEventListener' in ctx or 'onclick' in ctx or 'stopPropagation' in ctx:
        print(f'  pos {pos}: ...{ctx[-200:]}...')
        print()
