import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    raw = f.read()
c = raw.replace("\r\n", "\n")

# Find inventory-view opening > and the </div> at ~line 2329
iv_start = c.find(">", c.find('id="inventory-view"')) + 1

# Find the </div> that appears right before "<!-- ====== Leads View ====== -->"
leads_comment = c.find("<!-- ====== Leads View ====== -->")
# Find the nearest </div> before this
target_div = c.rfind("</div>", 0, leads_comment)
print(f"Target </div> at char {target_div}, line {c[:target_div].count(chr(10))+1}")

# Count <div and </div> in this range
segment = c[iv_start:target_div]
open_cnt = len(re.findall(r'<div[\s>]', segment))
close_cnt = len(re.findall(r'</div>', segment))
print(f"inventory-view > to target </div>: <div={open_cnt}, </div>={close_cnt}, balance={open_cnt-close_cnt}")
print(f"Expected balance: 0 (so inventory-view gets closed)")
print(f"Actual: {open_cnt-close_cnt} (extra opens)")
print()

# If balance > 0: need extra </div>s before target_div
# If balance = 0: target_div closes inventory-view ✓
# If balance < 0: extra closing (unlikely)

# Also check: inventory-view to the actual closing at line 17065
actual_close = 1059415
seg2 = c[iv_start:actual_close]
open2 = len(re.findall(r'<div[\s>]', seg2))
close2 = len(re.findall(r'</div>', seg2))
print(f"inventory-view > to actual close (line 17065): <div={open2}, </div>={close2}, balance={open2-close2}")
print(f"  (should be 0)")

# Show the exact div structure near the target
ctx_start = max(0, target_div - 60)
ctx_end = min(len(c), target_div + 80)
print(f"\nContext around target </div>:")
for i, line in enumerate(c[ctx_start:ctx_end].split("\n")):
    s = line.strip()
    marker = " <--- target" if target_div <= ctx_start + sum(len(l)+1 for l in c[ctx_start:ctx_end].split("\n")[:i]) < target_div+70 else ""
    if s:
        print(f"  {s[:120]}{marker}")
