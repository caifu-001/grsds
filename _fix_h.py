import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

old_pat = re.compile(r"\+h\(u\.substr\(u\.lastIndexOf\('/'\)\+1\)\)")
match = old_pat.search(c)
if match:
    old = match.group()
    new = "+(u||'').slice(((u||'').lastIndexOf('/')+1))"
    c = c.replace(old, new)
    print("Replaced:", old)
    with open(p, "w", encoding="utf-8-sig", newline="") as f:
        f.write(c.replace("\n", "\r\n"))
    c2 = c.replace("\r\n", "\n")
    hu_count = c2.count("+h(u")
    hm_count = c2.count("+h(m")
    print(f"h(u refs: {hu_count}")
    print(f"h(m refs: {hm_count}")
else:
    print("Pattern not found")
