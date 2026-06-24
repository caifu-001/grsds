import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find admin-view
av = h.find('id="admin-view"')
# Find main-fab
mf = h.find('id="main-fab"')
section = h[av:mf]

# Track depth and dump every </div> with context
depth = 0
issues = []
for i in range(len(section)):
    if section[i:i+4].lower() == '<div' and section[i:i+5].lower() != '</div':
        depth += 1
    elif section[i:i+6].lower() == '</div>':
        depth -= 1
        # Get context around this </div>
        ctx = section[max(0,i-10):i+20]
        line_start = section.rfind('\n', 0, i) + 1
        issues.append((av + i, depth, ctx.replace('\n','\\n')))

# Print all </div> positions with depth
print(f"Total <div> count: {sum(1 for j in range(len(section)) if section[j:j+4].lower()=='<div' and section[j:j+5].lower()!='</div')}")
print(f"Total </div> count: {sum(1 for j in range(len(section)) if section[j:j+6].lower()=='</div')}")
print(f"\nAll </div> with depths:")
for byte, d, ctx in issues:
    marker = ' ⚠️ DEPTH <= 0' if d <= 0 else ''
    print(f"  byte {byte}: depth={d:2d} ctx={ctx}{marker}")

# Now find where depth first goes to -1 or 0 at top level
depth = 0
admin_view_open = h.find('<div id="admin-view" class="hidden">')
for i in range(admin_view_open, mf):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        depth += 1
    elif h[i:i+6].lower() == '</div>':
        depth -= 1
        if depth == 0:
            print(f"\n⚠️ admin-view depth returns to 0 at byte {i} (should only close at admin-view end)")
            # Show context
            start = max(0, i-100)
            end = min(len(h), i+100)
            print(f"  Context: ...{repr(h[start:end])}...")
        elif depth == -1:
            print(f"\n❌ Extra </div> at byte {i}")
            start = max(0, i-100)
            end = min(len(h), i+100)
            print(f"  Context: ...{repr(h[start:end])}...")
