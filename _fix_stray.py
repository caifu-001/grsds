import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Fix the stray }); in openFWVisitForm
old = """  document.getElementById('fw-visit-modal').classList.remove('hidden');
  });
  if(id){"""
new = """  document.getElementById('fw-visit-modal').classList.remove('hidden');
  if(id){"""
if old in c:
    c = c.replace(old, new)
    print("OK: removed stray });")
else:
    print("FAIL: pattern not found")
    # Show context
    idx = c.find("fw-visit-modal').classList.remove('hidden')")
    if idx > 0:
        print(repr(c[idx:idx+150]))

# Now check for `h is not defined` — in selectFWClient we used escHtml and maybe h
# Let me find all uses of `h(` or `h2(` in the FWB code
import re
for m in re.finditer(r'\bh2?\s*\(', c):
    ctx = c[max(0,m.start()-30):m.start()+60]
    ln = c[:m.start()].count("\n") + 1
    print(f"  Line {ln}: ...{ctx}...")

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
