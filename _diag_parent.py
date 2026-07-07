import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find the parent structure for each view by looking at the lines before the id
views = ['analytics-view','projects-view','collab-view','service-view','inventory-view','client-view','reports-view']
for v in views:
    idx = c.find(f'id="{v}"')
    if idx < 0:
        print(f"{v}: NOT FOUND")
        continue
    # Show ~300 chars of context before
    ctx = c[max(0,idx-300):idx]
    lines = ctx.split("\n")
    print(f"\n=== {v} (at char {idx}) ===")
    for line in lines[-10:]:
        s = line.strip()
        if s: print(f"  {s[:150]}")

# Also check parent wrapping - is the analytics-view inside inventory-view or something similar?
print("\n\n=== Checking parent containers ===")
# Search for <div id="inventory-view"
iv_idx = c.find('id="inventory-view"')
if iv_idx > 0:
    # Find its end - count <div> depth
    tag_start = c.find(">", iv_idx) + 1
    depth = 0
    for i in range(tag_start, len(c)):
        if c[i:i+4] == "<div": depth += 1
        elif c[i:i+6] == "</div>":
            if depth == 0:
                iv_end = i + 6
                break
            depth -= 1
    iv_inner = c[tag_start:iv_end-len("</div>")]
    # Check if analytics-view or projects-view is inside
    for v in ["analytics-view", "projects-view", "collab-view", "service-view", "reports-view"]:
        if f'id="{v}"' in iv_inner:
            print(f"  ⚠ {v} is INSIDE inventory-view!")
    
    # Check what's inside inventory-view
    print(f"\ninventory-view innerHTML: {len(iv_inner)} chars")
    
# Now check: is analytics-view placed BEFORE or AFTER inventory-view?
for v in ["analytics-view", "projects-view", "collab-view", "service-view"]:
    idx = c.find(f'id="{v}"')
    iv_idx = c.find('id="inventory-view"')
    if idx > 0 and iv_idx > 0:
        rel = "BEFORE" if idx < iv_idx else "AFTER"
        print(f"  {v} is {rel} inventory-view (delta: {abs(idx-iv_idx)} chars)")
