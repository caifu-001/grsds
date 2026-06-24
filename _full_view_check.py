import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

views = ['dash-view','client-view','projects-view','opportunity-view',
         'collaboration-view','reports-view','inventory-view','service-view',
         'leads-view','main-view','main-screen','admin-view']
for v in views:
    pos = h.find('id="' + v + '"')
    if pos > 0:
        line = h[:pos].count('\n') + 1
        div_start = h.rfind('<div', 0, pos)
        end_tag = h.find('>', pos)
        tag = h[div_start:end_tag+1] if end_tag > 0 else h[div_start:pos+30]
        print('%s: line=%d byte=%d tag=%s' % (v, line, pos, tag[:80]))
    else:
        print('%s: NOT FOUND!' % v)

# Now check what's actually in main-screen
ms = h.find('id="main-screen"')
# Find main-screen closing
d = 1; i = ms + 1
# Find the div tag start
ds = h.rfind('<div', 0, ms)
# Skip to end of this tag
i = h.find('>', ds) + 1
d = 1
while i < len(h) and d > 0:
    t4 = h[i:i+4]; t6 = h[i:i+6]
    if t4.lower() == '<div' and (i+4 < len(h) and h[i+4] in (' ', '>')):
        d += 1
    elif t6.lower() == '</div>':
        d -= 1
        if d == 0:
            ms_close = i + 6
            break
    i += 1

ms_close_line = h[:ms_close].count('\n') + 1
print('\nmain-screen CLOSES at byte %d (line %d)' % (ms_close, ms_close_line))

# Show all views inside vs outside main-screen
print('\n=== View containment in main-screen (%d to %d) ===' % (ds, ms_close))
for v in views:
    pos = h.find('id="' + v + '"')
    if pos > 0:
        inside = ds < pos < ms_close
        print('  %-22s %s' % (v, 'INSIDE' if inside else 'OUTSIDE'))

# Show what closes main-screen
ctx = h[max(0,ms_close-300):ms_close+100]
print('\n=== Context around main-screen close ===')
for ln in ctx.split('\n'):
    s = ln.strip()
    if s: print('  ' + s[:140])
