import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Find all getElementById calls in JS and what they target
tg = h.find('>', h.find('<script>'))
s2 = h.rfind('</script>')
js = h[tg+1:s2]

ids = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js)
id_set = set(ids)

# Group by view-like
view_ids = sorted([i for i in id_set if '-view' in i or '-screen' in i])
print('=== View/screen IDs in JS ===')
for vi in view_ids:
    in_html = ('id="' + vi + '"') in h
    count = ids.count(vi)
    print('  %-30s HTML=%s refs=%d' % (vi, in_html, count))

# Also check handleFab completely
fab = h.find('function handleFab(')
d = 0; s = False
for i in range(fab, len(h)):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: fab_end = i+1; break
fab_body = h[fab:fab_end]
print('\n=== handleFab ===')
print(fab_body[:3000])

# And check navigateTo
nt = h.find('function navigateTo(')
if nt > 0:
    d = 0; s = False
    for i in range(nt, min(nt+3000, len(h))):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: nt_end = i+1; break
    nt_body = h[nt:nt_end]
    print('\n=== navigateTo ===')
    print(nt_body[:3000])
