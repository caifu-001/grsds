import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find inventory-view opening
iv_idx = c.find('id="inventory-view"')
# Find the <div start for inventory-view
div_start = c.rfind("<div", 0, iv_idx)
tag_close = c.find(">", iv_idx)  # This finds the > of id="inventory-view"

# Now count from tag_close+1 (first char after inventory-view opening div's >)
pos = tag_close + 1
depth = 0
div_positions = []

while pos < len(c):
    if c[pos:pos+4] == "<div":
        depth += 1
        div_positions.append((pos, depth, "open"))
        pos += 4
    elif c[pos:pos+6] == "</div>":
        div_positions.append((pos, depth, "close"))
        if depth == 0:
            print(f"inventory-view closing </div> at char {pos}")
            # Show context
            line_num = c[:pos].count("\n") + 1
            ctx_start = max(0, pos - 300)
            ctx_end = min(len(c), pos + 200)
            print(f"Line ~{line_num}")
            for line in c[ctx_start:ctx_end].split("\n"):
                s = line.strip()
                if s:
                    marker = " <<< CLOSING" if "</div>" in s and c[ctx_start:ctx_end].index(s) > 200 else ""
                    print(f"  {s[:130]}{marker}")
            break
        depth -= 1
        pos += 6
    elif c[pos:pos+4] == "<!--":
        comment_end = c.find("-->", pos)
        if comment_end > 0:
            pos = comment_end + 3
        else:
            pos += 1
    else:
        pos += 1

print(f"\nTotal nested divs at various depths during scan:")
# Count by depth range
depth_counts = {}
for p, d, t in div_positions:
    key = f"depth {d}"
    depth_counts[key] = depth_counts.get(key, 0) + 1
for k in sorted(depth_counts.keys(), key=lambda x: int(x.split()[1])):
    if depth_counts[k] > 5:
        print(f"  {k}: {depth_counts[k]} occurrences")

# Check where key views open relative to this
for v in ["collab-view", "service-view", "projects-view", "analytics-view"]:
    idx = c.find(f'id="{v}"')
    if idx > 0:
        rel = "inside" if idx < pos else "outside"
        print(f"  {v} at char {idx} is {rel} inventory-view closing")
