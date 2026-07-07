#!/usr/bin/env python3
# Fix #6: add canvas chart call before compare table
p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

old = '  // ====== Compare Table ======\n  if(!filtered.length)'
new = '  // ====== Canvas Charts ======\n  drawScoutingCategoryCharts(filtered);\n  // ====== Compare Table ======\n  if(!filtered.length)'

if old in c:
    c = c.replace(old, new)
    print("OK: Fix 6 canvas chart call")
else:
    print("FAIL: Fix 6")

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
print("Done")
