import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Use chr(34) for double-quote to avoid escape issues in PS
for ev in ['mousemove', 'mouseup', 'mousedown', 'click']:
    needle = 'document.addEventListener(' + chr(34) + ev + chr(34)
    idx = c.find(needle)
    print('=== document ' + ev + ' ===' if idx >= 0 else '=== document ' + ev + ': NOT FOUND ===')
    if idx >= 0:
        print(c[idx:idx+1500])
    print()
