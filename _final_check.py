import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

c = open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8-sig").read()

sc = c[c.find("<script>"):c.rfind("</script>")]
o = sc.count("{")
cl = sc.count("}")
print(f"JS braces: open={o}  close={cl}  diff={o - cl}")

print(f"h function defined: {len(re.findall(r'function h', c))}")
print(f"h( calls: {len(re.findall(r'\\bh\\(', c))}")

import os
print(f"Size: {os.path.getsize(r'D:/1kaifa/grsds/index.html') / 1024:.1f} KB")
