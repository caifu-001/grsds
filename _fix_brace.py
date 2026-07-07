import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Add missing closing brace for refreshScoutingCompare
old = "cmpContainer.innerHTML=containerHtml;\n\n"
new = "cmpContainer.innerHTML=containerHtml;\n}\n\n"
if old in c:
    c = c.replace(old, new)
    print("FIX: added missing } to close refreshScoutingCompare")
else:
    # Try without the double newline
    idx = c.find("cmpContainer.innerHTML=containerHtml;")
    if idx > 0:
        snippet = c[idx : idx + 80]
        print(f"Found: {repr(snippet)}")
        # The issue is the line ends, then goes to next function
        old2 = c[idx : c.find("\nfunction ", idx)][:60]
        print(f"Context to next func: {repr(old2)}")
        new2 = "cmpContainer.innerHTML=containerHtml;\n}\n"
        c = c[: idx + len("cmpContainer.innerHTML=containerHtml;")] + "\n}\n" + c[idx + len("cmpContainer.innerHTML=containerHtml;\n"):]
        print("FIX (alt): added missing } after compare container")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

# Verify
c2 = c
opens = c2[c2.find("<script>"):c2.rfind("</script>")].count("{")
closes = c2[c2.find("<script>"):c2.rfind("</script>")].count("}")
diff = opens - closes
print(f"JS braces: open={opens} close={closes} diff={diff}")

import os
print(f"Size: {os.path.getsize(p)/1024:.1f} KB")
