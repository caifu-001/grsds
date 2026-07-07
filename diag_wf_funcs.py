import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. saveWtVisual
idx = c.find('function saveWtVisual')
if idx == -1: idx = c.find('saveWtVisual')
print('=== saveWtVisual ===')
if idx >= 0:
    print(c[idx:idx+600])
print()

# 2. all wf* onclick/onchange references
refs = set()
for m in re.finditer(r'(onclick|onchange)="([^"]+)"', c):
    for fn in re.findall(r'(wf\w+)', m.group(2)):
        refs.add(fn)
print('Referenced wf* in HTML attrs:')
for r in sorted(refs):
    print(f'  {r}')

# check each exists as function
print('\nExistence:')
for fn in sorted(refs):
    fdx = c.find(f'function {fn}')
    print(f'  {fn}: {"OK" if fdx>=0 else "MISSING"}')

# 3. Also check all wfSaveTemplate references
print('\n=== wfSaveTemplate ===')
idx = c.find('wfSaveTemplate')
if idx >= 0:
    print(c[max(0,idx-30):idx+300])
else:
    print('NOT FOUND anywhere')
