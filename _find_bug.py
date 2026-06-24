import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

ms = h.find('<div id="main-screen"')
ms_end_tag = h.find('>', ms)
ms_close_byte = None

d = 0; started = False
for i in range(ms, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div':
        d += 1; started = True
    elif t6 == '</div>':
        d -= 1
    if started and d < 0:
        # Found the extra closing div!
        ms_close_byte = i
        break

if ms_close_byte is None:
    print('Could not find extra closing div near main-screen')
else:
    line = h[:ms_close_byte+6].count('\n') + 1
    # Show context around the extra </div>
    ctx_start = max(0, ms_close_byte - 300)
    ctx_end = min(len(h), ms_close_byte + 100)
    ctx = h[ctx_start:ctx_end]
    
    print(f'Extra </div> at byte {ms_close_byte}, line {line}')
    print(f'\nContext (300 chars before, 100 after):')
    print(ctx)
    
    # Also check: what's the ID of the enclosing element at this point?
    # Trace backwards to find the most recent <div id="..."
    back = ms_close_byte
    recent_ids = []
    d2 = 0
    for i in range(ms_close_byte, ms, -1):
        t6 = h[i-6:i].lower()
        t4 = h[i-4:i].lower()
        if t4 == '<div':
            d2 += 1
            if d2 <= 3:
                id_start = i - 4
                tag_end = h.find('>', id_start)
                tag = h[id_start:tag_end+1] if tag_end > 0 else h[id_start:id_start+80]
                recent_ids.append(f'depth {d2}: {tag[:100]}')
        elif t6 == '</div>':
            d2 -= 1
    print(f'\nRecent opening divs before extra close:')
    for rid in recent_ids:
        print(f'  {rid}')

# Find dash-view
dv = h.find('dash-view')
if dv >= 0:
    dv_line = h[:dv].count('\n') + 1
    print(f'\ndash-view found at byte {dv}, line {dv_line}')
    # Show context
    print(h[max(0,dv-30):dv+100])
else:
    print('\n❌ dash-view NOT FOUND in entire file!')
    # Search for dashboard related
    for term in ['dashboard', 'dash', 'dash-view', 'home-view']:
        idx = h.find(term)
        if idx >= 0:
            ctx = h[max(0,idx-20):idx+80]
            print(f'  "{term}" at {idx}: ...{ctx[:100]}...')
