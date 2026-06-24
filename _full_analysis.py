import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Check existence of all view/screen IDs that JS references
js_view_ids = [
    'admin-view','client-view','collab-view','company-reg-screen','dir-screen',
    'home-view','inventory-view','invitation-screen','leads-view','login-screen',
    'main-screen','my-screen','order-view','pending-screen','performance-view',
    'projects-view','purchase-view','reports-view','sales-view','service-view',
    'settings-screen','suppliers-view'
]

print('=== JS-referenced views in HTML ===')
for v in js_view_ids:
    pos = h.find('id="' + v + '"')
    line = h[:pos].count('\n') + 1 if pos > 0 else 0
    print('  %-25s HTML=%s line=%d' % (v, pos > 0, line))

# Now the key question: what IS in main-screen?
ms = h.find('id="main-screen"')
ds = h.rfind('<div', 0, ms)
d = 1; i = h.find('>', ds) + 1
main_screen_ids = []
while i < len(h) and d > 0:
    t4 = h[i:i+4]
    if t4.lower() == '<div' and (i+4 < len(h) and h[i+4] in (' ', '>')):
        id_match = re.search(r'id="([^"]+)"', h[i:h.find('>', i)])
        if id_match and not id_match.group(1).startswith('ef-') and not id_match.group(1).startswith('fif-') and not id_match.group(1).startswith('nmf-'):
            main_screen_ids.append((d, id_match.group(1), i))
        d += 1
    elif h[i:i+6].lower() == '</div>':
        d -= 1
    i += 1

print('\n=== All id= elements inside main-screen ===')
for depth, mid, pos in main_screen_ids:
    print('  depth=%d %s (line %d)' % (depth, mid, h[:pos].count('\n')+1))

# Now check navigateTo
nt = h.find('function navigateTo(')
d = 0; s = False
for i in range(nt, min(nt+5000, len(h))):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: nt_end = i+1; break
nt_body = h[nt:nt_end]
print('\n=== navigateTo ===')
print(nt_body[:2000])
