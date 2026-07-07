import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Verify: scan inventory-view and find its closing
iv_key = 'id="inventory-view"'
iv_idx = c.find(iv_key)
gt_idx = c.find(">", iv_idx) + 1
i = gt_idx
depth = 0
while i < len(c):
    if c[i:i+4] == "<div":
        depth += 1; i += 4
    elif c[i:i+6] == "</div>":
        if depth == 0:
            print(f"✅ inventory-view closes at char {i}, line {c[:i].count(chr(10))+1}")
            iv_close = i + 6
            break
        depth -= 1; i += 6
    elif c[i:i+4] == "<!--":
        ce = c.find("-->", i)
        i = ce + 3 if ce > 0 else i + 1
    else:
        i += 1

# Check each view position vs inventory-view close
for v in ["collab-view", "service-view", "projects-view", "analytics-view", "reports-view"]:
    vidx = c.find(f'id="{v}"')
    status = "✅ OUTSIDE" if vidx > iv_close else "❌ INSIDE"
    print(f"  {v}: {status} inventory-view (view at {vidx}, iv-close at {iv_close}, delta={vidx-iv_close})")

# Also run node syntax check
print("\n--- Node syntax check ---")
import subprocess
result = subprocess.run(["node", "--check", p], capture_output=True, text=True)
if result.returncode == 0:
    print("✅ Syntax OK")
else:
    print("❌ Syntax error:")
    print(result.stderr[:500])
