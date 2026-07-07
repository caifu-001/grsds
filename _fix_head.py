import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

old = "<th>选品渠道</th><th>产品名称</th>"
new = '<th style="width:32px">对比</th><th>选品渠道</th><th>产品名称</th>'
if old in c:
    c = c.replace(old, new)
    print("FIX 8: added checkbox column to thead")
else:
    print("FAIL 8")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

import os
print(f"Done. Size: {os.path.getsize(p)/1024:.1f} KB")
