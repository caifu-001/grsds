import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

lines = c.split("\n")
total = len(lines)

# Show last 30 lines
print("=== Last 30 lines ===")
for i in range(max(0, total - 30), total):
    print(f"  {i+1}: {lines[i][:200]}")

# Count braces in JS
js_start = c.find("<script>")
idx_script_end = c.rfind("</script>")
script_text = c[js_start:idx_script_end]
o = script_text.count("{")
cl = script_text.count("}")
diff = o - cl
print(f"\nJS section braces: open={o} close={cl} diff={diff}")

# Count single quotes
sq = script_text.count("'")
dq = script_text.count('"')
bt = script_text.count("`")
print(f"Quotes: '={sq} \"={dq} `={bt}")

# Check the compare section specifically
cmp_start = c.find("// ====== Compare Table (Horizontal")
cmp_end = c.find("cmpContainer.innerHTML=containerHtml;", cmp_start)
if cmp_end > 0:
    cmp_end += 40
seg = c[cmp_start:cmp_end]
co = seg.count("{")
ccl = seg.count("}")
cdiff = co - ccl
print(f"\nCompare section braces: open={co} close={ccl} diff={cdiff}")
if cdiff > 0:
    print("UNBALANCED in compare section!")

# Also check the function around the end
# Find the last function definition
func_idx = c.rfind("function ", 0, idx_script_end)
print(f"\nLast function at offset {func_idx}:")
print(c[func_idx:func_idx + 200])
