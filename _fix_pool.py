import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

old = "html+='<button class=\"btn-lead-primary\" onclick=\"event.stopPropagation();convertLeadToClient(\\''+l.id+'\\')\">转客户</button>';\n    html+='<button class=\"btn-lead-success\""
if old in html:
    html = html.replace(old, "html+='<button class=\"btn-lead-success\"", 1)
    print("[OK] renderPoolLeads convertLeadToClient removed")
else:
    print("[ERR] not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Size: {len(html.encode('utf-8'))} bytes")
