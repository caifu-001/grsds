import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Search for navigateTo
matches = list(re.finditer(r'navigateTo', h))
print('navigateTo found at:')
for m in matches:
    line = h[:m.start()].count('\n') + 1
    ctx = h[max(0,m.start()-30):m.start()+50]
    print('  line %d: ...%s...' % (line, ctx.strip()[:80]))

# Also search for function that handles main navigation  
# Look for onclick="showSection" or similar patterns
show_section = list(re.finditer(r'function show\w+\(', h))
print('\nshow* functions:')
for m in show_section[:20]:
    line = h[:m.start()].count('\n') + 1
    end = h.find(')', m.start()) + 1
    ctx = h[m.start():end+min(40, len(h)-end)]
    print('  line %d: %s' % (line, ctx[:80]))

# Search for onclick handlers that set views
onclicks = list(re.finditer(r'onclick="[^"]*[Vv]iew[^"]*"', h))
print('\nonclick with View:')
for m in onclicks[:30]:
    line = h[:m.start()].count('\n') + 1
    print('  line %d: %s' % (line, m.group()[:100]))

# Check openSettings, openMy, closeMy
for fn in ['openSettings', 'openMy', 'closeMy', 'openDir', 'closeDir']:
    pos = h.find('function ' + fn + '(')
    if pos > 0:
        line = h[:pos].count('\n') + 1
        d = 0; s = False
        for i in range(pos, min(pos+800, len(h))):
            if h[i] == '{': d += 1; s = True
            elif h[i] == '}': d -= 1
            if s and d == 0: fn_end = i+1; break
        fn_body = h[pos:fn_end]
        print('\n=== %s (line %d) ===' % (fn, line))
        print(fn_body[:500])
