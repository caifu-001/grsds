import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

at = h.find('class="admin-tabs"')
mf = h.find('id="main-fab"')
section = h[at:mf]

# Track div depth
depth = 0
prev_depth_zero = at
idx = 0
last_div0 = -1
while idx < len(section):
    if section[idx:idx+4].lower() == '<div' and section[idx:idx+5].lower() != '</div':
        depth += 1
    elif section[idx:idx+6].lower() == '</div>':
        depth -= 1
        if depth == -1:
            # Found where depth goes negative!
            abs_pos = at + idx
            ctx = h[max(0,abs_pos-200):abs_pos+200]
            print(f"DEPTH -1 at byte {abs_pos}")
            for i, line in enumerate(ctx.split('\n')):
                marker = ' <<<' if abs_pos <= at + idx - len(ctx[:200]) + len('\n'.join(ctx.split('\n')[:i])) else ''
                if line.strip():
                    print(f"  {line.strip()[:130]}{marker}")
            break
    if depth == 0:
        prev_depth_zero = at + idx
    idx += 1

print(f"Last depth-0 at byte {prev_depth_zero} (offset {prev_depth_zero - at})")
# Show what's after the last depth-0
after = h[prev_depth_zero:mf]
print(f"\nContent between last depth-0 and main-fab ({len(after)} bytes):")
for line in after.split('\n'):
    if line.strip():
        print(f"  {line.strip()[:130]}")
