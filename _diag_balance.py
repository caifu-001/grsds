import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find inventory-view open tag
iv_idx = c.find('id="inventory-view"')
print(f"inventory-view opens at char {iv_idx}")

# Find the opening tag end
tag_end = c.find(">", iv_idx) + 1

# We need to find where inventory-view SHOULD close
# Look at: reports-view closing --> inventory-view opening --> content --> inventory-view closing
# The issue is inventory-view closing is delayed

# Find reports-view's closing (should be right before inventory-view)
# Let's trace the structure
# The pattern is: </div><!-- /reports-view --> then <!-- Inventory View --> then <div id="inventory-view"

# Actually let me find the EXACT closing </div> of inventory-view by counting 
# all opening divs from its start

# First let me find where the next sibling view should be
# In correct structure, after inventory-view's end, we'd see service-view, collab-view etc.

# Let me look at the DIV balance. From iv_idx to service-view opening:
sv_idx = c.find('id="service-view"')
print(f"service-view opens at char {sv_idx}")

# Count <div and </div> between inventory-view start and service-view
segment = c[iv_idx:sv_idx]
open_divs = 0
close_divs = 0
pos = 0
while True:
    next_open = segment.find("<div", pos)
    next_close = segment.find("</div>", pos)
    if next_open < 0 and next_close < 0:
        break
    if next_open >= 0 and (next_close < 0 or next_open < next_close):
        open_divs += 1
        pos = next_open + 4
    else:
        close_divs += 1
        pos = next_close + 6

print(f"<div count from inventory-view to service-view: {open_divs}")
print(f"</div> count: {close_divs}")
print(f"Balance: {open_divs - close_divs} (should be 0 if inventory-view closed before service-view)")

# Now find where inventory-view content "should" end
# Look for "<!-- ====== Leads View ====== -->" or similar markers
print("\n=== Looking for section markers between service-view and its surroundings ===")
section_markers = []
for marker in ["<!-- ======", "<!-- ==", "<!-- Leads", "<!-- After-Sales", "<!-- Collab", "<!-- Projects", "<!-- Analytics", "<!-- Service"]:
    idx = c.find(marker, iv_idx)
    if idx > 0:
        section_markers.append((idx, marker))
        # Show 5 chars after marker
        end_line = c.find("\n", idx)
        print(f"  char {idx}: {c[idx:end_line].strip()[:100]}")

# Show the exact transition from inventory-view content to the next section
# Let's look around char 178000-179000 (where collab-view starts at 178605)
print("\n=== Structure around inventory-view end / collab-view start ===")
# Show 50 lines around the suspected boundary
start = 178400
for i, line in enumerate(c[start:start+600].split("\n")):
    s = line.strip()
    if s:
        # Mark key lines
        marker = ""
        if "collab-view" in s: marker = " <<< collab-view"
        if "service-view" in s: marker = " <<< service-view"
        if "</div>" in s: marker = f" {marker} </div>"
        if marker:
            print(f"  L{i}: {s[:120]}{marker}")
