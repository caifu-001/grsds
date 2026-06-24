import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# All admin-panel IDs
admin_ids = [
    'admin-users', 'admin-depts', 'admin-companies-manage', 'admin-companies',
    'admin-roles', 'admin-perms', 'admin-employees', 'admin-freeagents',
    'admin-resignations', 'admin-logs', 'admin-config', 'admin-security',
    'admin-workflows'
]

# Find all positions
av_start = h.find('<div id="admin-view"')
av_end = h.find('</div>', av_start)
# But that's naive. Let's track depth properly
ds = h.find('<div id="admin-view"')
d = 1; i = ds + len('<div')
while i < len(h) and d > 0:
    t4 = h[i:i+4]; t6 = h[i:i+6]
    if t4.lower() == '<div' and (h[i+4] in (' ', '>')):
        d += 1
    elif t6.lower() == '</div>':
        d -= 1
        if d == 0:
            av_close = i + 6
            break
    i += 1

# Now check each ID position against this range

print('Panel containment check (admin-view: %d to %d):' % (ds, av_close))
all_ok = True
for aid in admin_ids:
    pos = h.find('id="' + aid + '"')
    inside = ds < pos < av_close
    ok = 'OK' if inside else 'OUTSIDE'
    if not inside: all_ok = False
    print('  %-30s %s (pos=%d)' % (aid, ok, pos))

print('\nAll inside: %s' % all_ok)

# Check JS validity using Node.js instead
