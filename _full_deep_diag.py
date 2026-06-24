import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# split by script tags for pure HTML
parts = re.split(r'</?script[^>]*>', h, flags=re.IGNORECASE)
ho = ''
for i, p in enumerate(parts):
    if i % 2 == 0: ho += p

# Build mapping from ho positions back to real h
ho_map = []
in_script = False
idx_in_h = 0
while idx_in_h < len(h):
    if not in_script:
        if idx_in_h + 7 <= len(h) and h[idx_in_h:idx_in_h+7].lower() == '<script':
            in_script = True
            idx_in_h += 7
        else:
            ho_map.append(idx_in_h)
            idx_in_h += 1
    else:
        if idx_in_h + 8 <= len(h) and h[idx_in_h:idx_in_h+8].lower() == '</script>':
            in_script = False
            idx_in_h += 8
        else:
            idx_in_h += 1

# Track depth in pure HTML
d = 0
extra_closes_ho = []
for i, ch in enumerate(ho):
    if ho[i:i+4].lower() == '<div' and (i+4 < len(ho) and ho[i+4] in (' ', '>')):
        d += 1
    elif ho[i:i+6].lower() == '</div>':
        if d == 0:
            extra_closes_ho.append(i)
        else:
            d -= 1

for ext_pos in extra_closes_ho:
    real_pos = ho_map[ext_pos] if ext_pos < len(ho_map) else 0
    line = h[:real_pos].count('\n') + 1
    print('Extra </div> at real byte %d (line ~%d):' % (real_pos, line))
    # Show context
    ctx = h[max(0,real_pos-200):real_pos+200]
    for ln in ctx.split('\n'):
        s = ln.strip()
        if s: print('  ' + s[:140])

# Also check: does main-screen contain all main views?
ms = ho.find('id="main-screen"')
if ms > 0:
    ds = ho.rfind('<div', 0, ms)
    d = 1; i = ds + 4; ac = 0
    while i < len(ho) and d > 0:
        if ho[i:i+4] == '<div' and ho[i+4] in (' ', '>'): d += 1
        elif ho[i:i+6] == '</div>':
            d -= 1
            if d == 0: ac = i + 6; break
        i += 1
    
    ms_real_start = ho_map[ds] if ds < len(ho_map) else 0
    ms_real_end = ho_map[ac-1] if ac-1 < len(ho_map) else 0
    
    print('\n=== main-screen: ho %d-%d, real ~%d-%d ===' % (ds, ac, ms_real_start, ms_real_end))
    
    # Check contained views in pure HTML
    views = ['dash-view', 'client-view', 'projects-view', 'opportunity-view', 
             'collaboration-view', 'reports-view', 'inventory-view', 'service-view',
             'leads-view', 'main-view']
    for v in views:
        pos = ho.find('id="' + v + '"')
        inside = ds < pos < ac if pos > 0 else False
        print('  %-22s %s (pos=%d)' % (v, 'INSIDE' if inside else 'OUTSIDE/BEFORE', pos))

# Try direct file check on main-view specifically
print('\n=== Direct file check: what surrounds main-view? ===')
mv = h.find('id="main-view"')
if mv > 0:
    # Find the containing <div
    parent_div = h.rfind('<div', 0, mv)
    print('main-view parent div at %d: %s' % (parent_div, h[parent_div:parent_div+80]))
    # Is it inside main-screen?
    ms_direct = h.find('id="main-screen"')
    print('main-screen at %d' % ms_direct)
