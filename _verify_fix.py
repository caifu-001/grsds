import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()
parts = re.split(r'</?script[^>]*>', h, flags=re.IGNORECASE)
ho = ''
for i, p in enumerate(parts):
    if i % 2 == 0: ho += p
o = len(re.findall(r'<div(?:\s|>)', ho))
c = len(re.findall(r'</div', ho))
print('Pure HTML divs: %d open, %d close, net=%d' % (o, c, o-c))

av = ho.find('id="admin-view"')
ds = ho.rfind('<div', 0, av)
d = 1; i = ds + 4; ac = 0
while i < len(ho) and d > 0:
    if ho[i:i+4] == '<div' and ho[i+4] in (' ', '>'): d += 1
    elif ho[i:i+6] == '</div>': d -= 1
    if d == 0: ac = i + 6; break
    i += 1

wf = ho.find('id="admin-workflows"')
print('admin-workflows inside admin-view: %s (wf=%d, av_close=%d)' % (wf < ac, wf, ac))

# Check switchAdminTab
sw = h.find('function switchAdminTab(')
d2 = 0; s_flag = False; sw_end = 0
for i in range(sw, len(h)):
    if h[i] == '{': d2 += 1; s_flag = True
    elif h[i] == '}': d2 -= 1
    if s_flag and d2 == 0: sw_end = i + 1; break
sw_body = h[sw:sw_end]
panels_ref = set(re.findall(r"getElementById\('(admin-[^']+)'\)", sw_body))
print('switchAdminTab references:')
for p in sorted(panels_ref):
    print('  %s' % p)
print('TOTAL: %d panels' % len(panels_ref))

# Also check JS syntax
tg = h.find('>', h.find('<script>'))
s2 = h.rfind('</script>')
js = h[tg+1:s2]
try:
    compile(js, 'index.html', 'exec')
    print('\nJS syntax: OK')
except SyntaxError as e:
    print('\nJS syntax: ERROR line %d - %s' % (e.lineno, e.msg))
