import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()
tg = h.find('>', h.find('<script>'))
s2 = h.rfind('</script>')
js = h[tg+1:s2]

# Find all getElementById references to views
views_in_js = set(re.findall(r"getElementById\('([^']+)'\)", js))
views_in_js.update(re.findall(r'getElementById\("([^"]+)"\)', js))

missing = ['dash-view', 'opportunity-view', 'collaboration-view', 'main-view']
print('=== HTML existence check ===')
for v in missing:
    in_html = ('id="' + v + '"') in h
    in_js = v in views_in_js
    print('%s: HTML=%s JS=%s' % (v, in_html, in_js))

# Also check broader: what view ids are in JS but not in HTML
all_views = [v for v in views_in_js if 'view' in v.lower() or 'screen' in v.lower()]
print('\n=== View-like IDs in JS only (not in HTML) ===')
for v in sorted(all_views):
    in_html = ('id="' + v + '"') in h
    if not in_html:
        print('  %s' % v)

# Check handleFab - what views does it toggle?
fab = h.find('function handleFab')
if fab > 0:
    d = 0; s = False
    for i in range(fab, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: fab_end = i+1; break
    fab_body = h[fab:fab_end]
    print('\n=== handleFab references ===')
    refs = re.findall(r"getElementById\('([^']+)'\)", fab_body)
    for r in refs:
        in_html = ('id="' + r + '"') in h
        print('  %-22s HTML=%s' % (r, in_html))
