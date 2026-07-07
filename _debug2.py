import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

lines = c.split("\n")
total = len(lines)

print("=== Last 30 lines ===")
for i in range(max(0, total - 30), total):
    print(f"  {i+1}: {lines[i][:200]}")

print("\n=== Searching for unbalanced braces ===")
# Count all { and } in JS section
js_start = c.find("<script>")
if js_start < 0:
    js_start = c.find("<script")
idx_script_end = c.rfind("</script>")
script_text = c[js_start:idx_script_end]

opens = script_text.count("{")
closes = script_text.count("}")
print(f"JS section: {{ = {opens}, }} = {closes}, diff = {opens - closes}")

# Search for `}}` vs `}}}`
triple_close = script_text.count("}}}")
double_close = script_text.count("}}")
print(f"Triple }}} = {triple_close}, Double }} = {double_close}")

# Also check the new compare section
cmp_start = c.find("// ====== Compare Table (Horizontal")
if cmp_start > 0:
    cmp_end = c.find("body.innerHTML=bodyHtml;", cmp_start)
    if cmp_end < 0:
        cmp_end = c.find("cmpContainer.innerHTML=containerHtml;", cmp_start) + 40
    seg = c[cmp_start:cmp_end]
    o = seg.count("{")
    cl = seg.count("}")
    print(f"\nCompare section: {{ = {o}, }} = {cl}, diff = {o - cl}")
    if o != cl:
        # Show the segment
        print("Compare section text:")
        print(seg[:2000])
