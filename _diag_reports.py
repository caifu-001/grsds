import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find reports-view position and inventory-view closing
rpt_idx = c.find('id="reports-view"')
iv_idx = c.find('id="inventory-view"')
iv_gt = c.find(">", iv_idx) + 1
iv_close = 178565  # from previous fix

print(f"reports-view at {rpt_idx}, iv opens at {iv_gt}, iv closes at {iv_close}")
print(f"reports-view is {'INSIDE' if rpt_idx > iv_gt and rpt_idx < iv_close else 'OUTSIDE'} inventory-view")

# If reports-view is inside, we need to:
# 1. Cut reports-view HTML block out of inventory-view
# 2. Paste it before inventory-view (or after, but before makes more structural sense)
# Actually, in the topbar order: 报表 comes before 供应链

# Find the reports-view HTML block - from id="reports-view" to the next sibling view
# Next sibling should be inventory-view
rpt_start = c.rfind("<div", 0, rpt_idx)
print(f"reports-view <div at {rpt_start}")

# Find where reports-view block ends - look for the comment "<!-- Inventory View -->" or the next view
next_marker = c.find("<!-- Inventory View -->")
print(f"Inventory View comment at {next_marker}")

# The reports-view block should be from rpt_start to just before <!-- Inventory View -->
# Extract it
rpt_block = c[rpt_start:next_marker]
rpt_block_len = len(rpt_block)
print(f"reports-view block: {rpt_block_len} chars")

# Verify it's a self-contained block by checking div balance
import re
opens = len(re.findall(r'<div[\s>]', rpt_block))
closes = len(re.findall(r'</div>', rpt_block))
print(f"block balance: <div={opens}, </div>={closes}, balance={opens-closes}")

if opens != closes:
    print("WARNING: reports-view block is not balanced, need manual inspection")
    # Show first and last 200 chars
    print("First 200:", rpt_block[:200])
    print("Last 200:", rpt_block[-200:])
else:
    print("✅ reports-view block is self-balanced")
