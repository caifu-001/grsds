import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# main-screen boundaries
ms = h.find('id="main-screen"')
ms_start = h.rfind('<div', 0, ms)
ms_start = h.find('>', ms_start) + 1  # start after the opening tag

# Find main-screen close by tracking depth
i = ms_start; d = 1
while i < len(h) and d > 0:
    if h[i:i+4].lower() == '<div' and h[i+4] in (' ', '>'): d += 1
    elif h[i:i+6].lower() == '</div>':
        d -= 1
        if d == 0: ms_end = i + 6; break
    i += 1

# Now track ALL divs within main-screen, recording depth and what opens/closes
i = ms_start; d = 1; stack = ['main-screen']  # what divs are currently open
close_count = 0; open_count = 0

# Find the deepest unclosed div
extra_closes = []

i = ms_start; d = 1
while i < ms_end:
    if h[i:i+4].lower() == '<div' and h[i+4] in (' ', '>'): 
        open_count += 1
        d += 1
        # Get id if any
        end = h.find('>', i)
        tag = h[i:end+1]
        id_m = re.search(r'id="([^"]+)"', tag)
        label = id_m.group(1) if id_m else tag[:40]
        stack.append(label)
    elif h[i:i+6].lower() == '</div>':
        close_count += 1
        if d == 1:
            # This close would end main-screen!
            line = h[:i].count('\n') + 1
            ctx_start = max(0, i-200)
            ctx = h[ctx_start:i+6]
            extra_closes.append((line, i, ctx))
        else:
            d -= 1
            stack.pop()
    i += 1

print('main-screen: %d opens, %d closes, net=%d' % (open_count, close_count, open_count-close_count))
print('\n=== Extra </div> at depth 1 (would close main-screen) ===')
for line, pos, ctx in extra_closes:
    print('Line %d byte %d:' % (line, pos))
    for ln in ctx.split('\n'):
        s = ln.strip()
        if s: print('  ' + s[:140])
    print()

# The correct close should be at depth 0
# Show what would be the correct final close
last_tag = h.rfind('</div>', 0, ms_end)
last_line = h[:last_tag].count('\n') + 1
print('Final </div> at line %d byte %d (this is the actual main-screen close)' % (last_line, last_tag))
ctx_last = h[max(0,last_tag-200):last_tag+6]
print('Context:')
for ln in ctx_last.split('\n'):
    s = ln.strip()
    if s: print('  ' + s[:140])
