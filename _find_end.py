import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Find end of compare section and next function
idx = c.find("cmpContainer.innerHTML=containerHtml;")
if idx > 0:
    next_func = c.find("function ", idx)
    between = c[idx + 50 : next_func]
    print("After compare table body:")
    print(repr(between[:300]))
    print(f"\nNext function at {next_func}:")
    print(c[next_func:next_func + 60])
