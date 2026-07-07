import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find inventory-view opening tag and trace div depth
iv_idx = c.find('id="inventory-view"')
# Find the actual opening <div tag
div_start = c.rfind("<div", 0, iv_idx)
tag_end = c.find(">", iv_idx) + 1

print(f"inventory-view <div at {div_start}, > at {tag_end}")

# Walk through characters tracking <div> nesting depth
depth = 1  # We're inside inventory-view's opening div
i = tag_end
while depth > 0 and i < len(c):
    # Check for <div (not </div)
    if c[i:i+4] == "<div":
        # Make sure it's not a closing tag
        depth += 1
        i += 4
    elif c[i:i+6] == "</div>":
        depth -= 1
        if depth == 0:
            print(f"Inventory-view </div> found at char {i}")
            # Show surrounding context
            ctx = c[max(0,i-200):i+6+200]
            lines = ctx.split("\n")
            print("\nSurrounding context:")
            for j, line in enumerate(lines):
                s = line.strip()
                if s:
                    marker = ""
                    if "</div>" in s and max(0,ctx.find(s)) < 200:
                        marker = " <<< THIS"
                    # Find line numbers relative to file
                    abs_line = c[:i].count("\n") - 5 + j
                    if marker:
                        print(f"  L{abs_line}: {s[:120]}{marker}")
            break
        i += 6
    # Skip comments
    elif c[i:i+4] == "<!--":
        comment_end = c.find("-->", i)
        if comment_end > 0:
            i = comment_end + 3
        else:
            i += 1
    else:
        i += 1

# Also check what section is right before the closing
print(f"\nTotal chars scanned: {i - tag_end}")
# What major sections are inside inventory-view?
# Check for key markers
for marker in ["analytics-view", "projects-view", "collab-view", "service-view", "Leads View", "Analytics Dashboard", "After-Sales", "采购管理", "供应商库", "库存管理", "选品调研"]:
    idx = c.find(f'id="{marker}"', tag_end, i)
    if idx < 0:
        idx = c.find(marker, tag_end, i)
    if idx > 0 and idx < i:
        print(f"  ✓ '{marker}' is INSIDE inventory-view (char {idx})")
    elif idx > 0:
        print(f"  ○ '{marker}' is OUTSIDE inventory-view (char {idx})")
    else:
        pass  # not found
