import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

changes = 0

# Fix 1: line 8374 - missing newline between `}` and comment
old1 = "}/ === Company Directory Cascade Sync ==="
if old1 in c:
    c = c.replace(old1, "}\n\n// === Company Directory Cascade Sync ===")
    changes += 1
    print("FIX 1: added newline between } and comment")
else:
    print("FAIL 1: pattern not found")

# Fix 2: h(m) -> (m||"")
idx2 = c.find("h(m)")
if idx2 > 0:
    old2 = c[idx2 - 10:idx2 + 50]
    print("FIX 2 context:", repr(old2))
    old2_exact = "+h(m)+'<br><small>line '+l+':'+c+' | '"
    if old2_exact in c:
        c = c.replace(old2_exact, "+(m||'')+'<br><small>line '+l+':'+c+' | '")
        changes += 1
        print("FIX 2: h(m) replaced")
    else:
        print("FAIL 2: exact string not matched")
        # Try single line search
        line_match = c.find("+h(m)+")
        if line_match > 0:
            print("  Found '+h(m)+' at", line_match)
            print("  Around:", repr(c[line_match - 5:line_match + 50]))
else:
    print("FAIL 2: h(m) not found")

# Check for remaining syntax issues
import re
pattern = re.compile(r'\}//\s+\w')
matches = list(pattern.finditer(c))
if matches:
    print("WARNING: Found }/ comment issues:")
    for m in matches:
        line_num = c[:m.start()].count('\n') + 1
        print(f"  line {line_num}: {repr(m.group()[:60])}")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"Done. Changes: {changes}, Size: {size_kb:.1f} KB")
