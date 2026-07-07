import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find inventory-view opening - get the full opening tag
iv_key = 'id="inventory-view"'
iv_idx = c.find(iv_key)
opener_idx = c.rfind("<div", 0, iv_idx)
print(f"inventory-view <div at char {opener_idx}")
print(f"Opening: {c[opener_idx:opener_idx+80]}")

# Scan from AFTER the opening tag's '>'
gt_idx = c.find(">", iv_idx) + 1
i = gt_idx
depth = 0  # We're now INSIDE inventory-view
line_num = c[:i].count("\n") + 1

# Track each depth change with line info
depth_changes = []
while i < len(c):
    if c[i:i+4] == "<div":
        depth += 1
        ln = c[:i].count("\n") + 1
        depth_changes.append(("+", depth, ln, c[i:i+min(80, len(c)-i)].replace("\n", " ")))
        i += 4
    elif c[i:i+6] == "</div>":
        if depth == 0:
            ln = c[:i].count("\n") + 1
            print(f"\n✅ inventory-view CLOSING at char {i}, line {ln}")
            print(f"Context: {c[max(0,i-100):i+100]}")
            break
        depth -= 1
        ln = c[:i].count("\n") + 1
        depth_changes.append(("-", depth, ln, ""))
        i += 6
    elif c[i:i+4] == "<!--":
        comment_end = c.find("-->", i)
        if comment_end > 0:
            i = comment_end + 3
        else:
            i += 1
    else:
        i += 1

# Show the last 20 depth changes before closing
print(f"\n=== Last 20 depth changes before closing ===")
for d in depth_changes[-20:]:
    direction, d, ln, ctx = d
    prefix = "+" if direction == "+" else "-"
    ctx_str = f" → {ctx[:60]}" if ctx else ""
    print(f"  L{ln:>5}: {prefix} depth={d}{ctx_str}")
