import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

av = h.find('id="admin-view"')
div_start = h.rfind('<div', 0, av)
d = 1; i = div_start + 4
trace = [(0, 'OPEN admin-view', div_start)]
while i < len(h) and d > 0:
    t4 = h[i:i+4]; t6 = h[i:i+6]
    if t4.lower() == '<div' and (h[i+4] in (' ', '>')):
        end = h.find('>', i)
        tag = h[i:end+1]
        id_match = re.search(r'id="([^"]+)"', tag)
        cls_match = re.search(r'class="([^"]+)"', tag)
        label = id_match.group(1) if id_match else (cls_match.group(1) if cls_match else tag[:50])
        trace.append((d, '<div ' + label, i))
        d += 1
    elif t6.lower() == '</div>':
        if d > 0:
            d -= 1
            trace.append((d, '</div>', i))
            if d == 0:
                admin_close = i + 6
                break
    i += 1

for depth, label, pos in trace[-20:]:
    line = h[:pos].count('\n') + 1
    print('  depth=%d line~%d pos=%d: %s' % (depth, line, pos, label[:80]))

close_line = h[:admin_close].count('\n') + 1
print('\nAdmin-view closes at byte %d line ~%d' % (admin_close, close_line))
print('Beyond close context:')
ctx = h[max(0,admin_close-300):admin_close+300]
for line in ctx.split('\n'):
    s = line.strip()
    if s: print('  ' + s[:140])

wf = h.find('id="admin-workflows"')
wf_line = h[:wf].count('\n') + 1
print('\nadmin-workflows at byte %d line ~%d (+%d bytes past close)' % (wf, wf_line, wf - admin_close))
pre = h[max(0, wf-500):wf]
print('\nParent context of admin-workflows:')
for line in pre.split('\n')[-10:]:
    s = line.strip()
    if s: print('  ' + s[:140])

# Check switchAdminTab for 'workflows' reference
sw = h.find('function switchAdminTab')
d2 = 0; s = False
for i in range(sw, len(h)):
    if h[i] == '{': d2 += 1; s = True
    elif h[i] == '}': d2 -= 1
    if s and d2 == 0: sw_end = i+1; break
sw_body = h[sw:sw_end]
has_wf = 'workflows' in sw_body
has_security = 'security' in sw_body
has_logs = 'logs' in sw_body
print('\nswitchAdminTab: workflows=%s security=%s logs=%s' % (has_wf, has_security, has_logs))

# Check what panels switchAdminTab references
panels = set(re.findall(r"getElementById\('(admin-[^']+)'\)", sw_body))
print('Panels referenced in switchAdminTab:', panels)
