#!/usr/bin/env python3
"""substitution helper."""
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

changes = []

old = "document.getElementById('topbar-title').textContent='资源管理';"
new = "document.getElementById('topbar-title').textContent='供应链';"
count = c.count(old)
c = c.replace(old, new)
changes.append(f"replaced {count} occurrences of '资源管理' → '供应链' in topbar-title")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
