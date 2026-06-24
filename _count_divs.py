import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Count all divs from admin-tabs to main-fab
at = h.find('class="admin-tabs"')
mf = h.find('id="main-fab"')
section = h[at:mf]

opens = 0; closes = 0; depth = 0; min_depth = 0; max_depth = 0
prob = None
for i in range(len(section)):
    if section[i:i+4].lower() == '<div' and section[i:i+5].lower() != '</div':
        depth += 1; opens += 1
        if depth > max_depth: max_depth = depth
    elif section[i:i+6].lower() == '</div>':
        depth -= 1; closes += 1
        if depth < min_depth: 
            min_depth = depth
            if prob is None:
                # Show what's around this first negative
                abs_pos = at + i
                ctx = h[max(0,abs_pos-80):abs_pos+80]
                prob = repr(ctx)

print(f"<div={opens} </div>={closes} depth min={min_depth} max={max_depth}")
if prob:
    print(f"First negative at ~{abs_pos}: {prob}")

# Find all top-level closing </div> between admin panels
# Track depth and find where it goes -1
depth = 0
for i in range(at, mf):
    off = i - at
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        depth += 1
    elif h[i:i+6].lower() == '</div>':
        depth -= 1
        if depth == -1:
            # Show the context at this position  
            ctx = h[max(0,i-200):i+200]
            print(f"\nExtra </div> at byte {i}")
            lines = ctx.split('\n')
            for j, line in enumerate(lines):
                md = ''
                abs_line_byte = max(0,i-200) + sum(len(l)+1 for l in lines[:j])
                if abs(abs_line_byte - i) < 50: md = ' <<<<'
                if line.strip():
                    print(f"  {line.strip()[:130]}{md}")
            break
