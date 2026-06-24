import sys
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Post-script HTML
s2 = h.rfind('</script>')
post = h[s2+9:]

# Track div depth through post-script content
d = 0
extra_closes = []
for i, ch in enumerate(post):
    if post[i:i+4].lower() == '<div' and (post[i+4:i+5] in (' ', '>')):
        d += 1
    elif post[i:i+6].lower() == '</div>':
        if d == 0:
            # This is an extra close!
            ctx = post[max(0,i-120):i+120]
            line_in_post = post[:i].count('\n') + 1
            extra_closes.append((i, line_in_post, ctx))
        else:
            d -= 1

print(f'Final depth: {d}')
print(f'Extra </div>s (when depth already 0): {len(extra_closes)}')
for idx, (pos, line, ctx) in enumerate(extra_closes):
    print(f'\n=== Extra #{idx+1} at post offset {pos} (line {line}) ===')
    # Show the context with markers
    before = ctx[:120]
    after = ctx[120:]
    print(f'Before: ...{before}...')
    print(f'After: ...{after}...')
