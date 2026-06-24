import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Split into HTML-only parts (exclude JS strings)
parts = re.split(r'</?script[^>]*>', h, flags=re.IGNORECASE)
ho = ''
for i, p in enumerate(parts):
    if i % 2 == 0: ho += p

# Track depth through pure HTML
d = 0
extra_closes = []
for i, ch in enumerate(ho):
    if ho[i:i+4].lower() == '<div' and (ho[i+4:i+5] in (' ', '>')):
        d += 1
    elif ho[i:i+6].lower() == '</div>':
        if d == 0:
            # map back to original file
            # find what line in the real file this corresponds to
            # This is approximate since ho is stripped of scripts
            extra_closes.append(i)
        else:
            d -= 1

print('Final depth: %d' % d)
print('Extra </div>s in pure HTML: %d' % len(extra_closes))

# Now find these in the real file
# For each extra close in ho, find the corresponding position in h
# We need to map ho indices back to h
# Build a mapping: for each char in ho, what's its position in h
ho_map = []
ho_parts_indices = []
idx_in_h = 0
script_depth = 0
for ch in h:
    if script_depth == 0:
        # Check if entering script
        if h[idx_in_h:idx_in_h+7].lower() == '<script':
            script_depth += 1
        else:
            ho_map.append(idx_in_h)
    else:
        if h[idx_in_h:idx_in_h+8].lower() == '</script>':
            script_depth -= 1
    idx_in_h += 1

for ei, ext_pos in enumerate(extra_closes[:5]):
    if ext_pos < len(ho_map):
        real_pos = ho_map[ext_pos]
        line = h[:real_pos].count('\n') + 1
        ctx_start = max(0, real_pos - 200)
        ctx = h[ctx_start:real_pos+200]
        print('\n=== Extra #%d at real byte %d (line ~%d) ===' % (ei+1, real_pos, line))
        for ln in ctx.split('\n'):
            s = ln.strip()
            if s: print('  ' + s[:140])
