import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Check all major view containers
views = [
    'main-view', 'client-view', 'dash-view', 'sales-view',
    'inventory-view', 'collaboration-view', 'reports-view',
    'service-view', 'project-view', 'opportunity-view',
    'leads-view', 'admin-view', 'settings-screen'
]

print("=== View containers ===")
for v in views:
    idx = h.find(f'id="{v}"')
    if idx >= 0:
        # Get the opening tag
        tag_end = h.find('>', idx)
        tag = h[idx:tag_end+1].replace('\n',' ')[:100]
        
        # Find closing </div> for this specific id
        # Track div depth from this point
        d = 0; s = False; close_idx = idx
        for i in range(idx, min(len(h), idx + 500000)):
            t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
            if t4 == '<div' and t6 != '</div': d += 1; s = True
            elif t6 == '</div>': d -= 1
            if s and d == 0:
                close_idx = i + 6
                break
        
        line_open = h[:idx].count('\n') + 1
        line_close = h[:close_idx].count('\n') + 1
        size = close_idx - idx
        print(f'  {v}: line {line_open}-{line_close} ({size} bytes) {"⚠️ NOT CLOSED" if d != 0 else ""}')
    else:
        print(f'  {v}: ❌ NOT FOUND')

# Check main structure: main-screen -> everything
print(f'\n=== Main structure ===')
ms = h.find('id="main-screen"')
if ms > 0:
    ms_line = h[:ms].count('\n') + 1
    print(f'main-screen at line {ms_line}')
    
    # Find all direct children of main-screen by tracking depth
    d = 0; s = False
    children = []
    for i in range(ms, len(h)):
        t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
        if t4 == '<div' and t6 != '</div':
            d += 1
            if d == 1 and s:
                # Direct child of main-screen
                id_match = h[i:i+80]
                children.append((i, id_match.replace('\n',' ')[:80]))
        elif t6 == '</div>':
            d -= 1
        if not s: s = True
        if s and d == -1:
            break
    
    ms_end = i
    print(f'main-screen ends at byte {ms_end}, depth now {d}')
    print(f'Direct children ({len(children)}):')
    for c_idx, c_tag in children:
        c_line = h[:c_idx].count('\n') + 1
        print(f'  line {c_line}: {c_tag}')

# Check specific collapsed sections
print(f'\n=== Missing view analysis ===')
# Are these views inside main-screen?
for v in ['client-view', 'dash-view', 'inventory-view', 'collaboration-view', 'reports-view', 'service-view', 'project-view']:
    idx = h.find(f'id="{v}"')
    if idx >= 0 and ms > 0 and ms_end > 0:
        inside = ms < idx < ms_end
        print(f'  {v}: {"inside" if inside else "OUTSIDE"} main-screen')
