import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Track div depth in main-screen specifically  
ms = h.find('id="main-screen"')
# Find the <div tag start
ds = h.rfind('<div', 0, ms)
# Skip past the tag
i = h.find('>', ds) + 1
d = 1
trace_inside_ms = []
last_opened = 'main-screen'
while i < len(h) and d > 0:
    t4 = h[i:i+4]; t6 = h[i:i+6]
    if t4.lower() == '<div' and (i+4 < len(h) and h[i+4] in (' ', '>')):
        # get id
        end_tag = h.find('>', i)
        tag_snip = h[i:end_tag+1][:60]
        id_m = re.search(r'id="([^"]+)"', tag_snip)
        last_opened = id_m.group(1) if id_m else tag_snip[:30]
        d += 1
    elif t6.lower() == '</div>':
        if d > 0:
            d -= 1
            if d < 2:  # near top
                line = h[:i].count('\n') + 1
                trace_inside_ms.append((d, 'CLOSE (was in %s)' % last_opened, i, line))
    if d == 0:
        ms_close = i + 6
        break
    i += 1

close_line = h[:ms_close].count('\n') + 1
print('main-screen closes at byte %d (line %d)' % (ms_close, close_line))
print('\nLast 15 </div>s that reduced depth near 0:')
for td, desc, pos, line in trace_inside_ms[-15:]:
    print('  depth=%d line=%d pos=%d: %s' % (td, line, pos, desc))

# Show context of close
ctx = h[max(0,ms_close-400):ms_close+100]
print('\n=== Close context ===')
for ln in ctx.split('\n'):
    s = ln.strip()
    if s: print('  %s' % s[:140])

# Check: what elements are wrapping main-screen's closing?
# IS there an extra </div>? Let's count divs inside main-screen
# Track ALL divs within main-screen boundaries
d2 = 1
i2 = h.find('>', h.rfind('<div', 0, h.find('id="main-screen"'))) + 1
opens = 0; closes = 0
while i2 < ms_close:
    if h[i2:i2+4].lower() == '<div' and (i2+4 < len(h) and h[i2+4] in (' ', '>')):
        opens += 1
    elif h[i2:i2+6].lower() == '</div>':
        closes += 1
    i2 += 1
print('\nInside main-screen (bytes %d-%d): %d <div> opens, %d </div> closes' % (h.find('>', ds)+1, ms_close, opens, closes))
