import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Get showLeads full
pos = h.find('function showLeads()')
d = 0; s = False
for i in range(pos, min(pos+3000, len(h))):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: sl_end = i+1; break
print('=== showLeads ===')
print(h[pos:sl_end])

# Get showProjectsDirect
pp = h.find('function showProjectsDirect()')
d = 0; s = False
for i in range(pp, min(pp+1500, len(h))):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: sp_end = i+1; break
print('\n=== showProjectsDirect ===')
print(h[pp:sp_end])

# Also search for other navigation patterns - look for onclick in the topbar/sidebar
# Search for "more-menu" handlers
# Search for common onclick patterns
patterns = [
    r'function switchTo\(',
    r'function openView\(',
    r"onclick=\"show\w+\(",
    r"onclick=\"open\w*[Vv]iew",
    r"onclick=\"switch\w+\(",
]
for pat in patterns:
    matches = list(re.finditer(pat, h))
    if matches:
        print('\n=== Pattern: %s (%d matches) ===' % (pat, len(matches)))
        for m in matches[:5]:
            line = h[:m.start()].count('\n') + 1
            end = min(m.end()+80, len(h))
            print('  line %d: %s' % (line, h[m.start():end].split('\n')[0][:120]))
