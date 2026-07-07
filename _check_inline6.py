import sys, io, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

r = subprocess.run(["git", "-C", r"D:\1kaifa\grsds", "show", "HEAD:index.html"],
                   capture_output=True, encoding="utf-8", errors="replace")
c = r.stdout

# Extract inline script #6 (the big one)
scripts = []
pos = 0
while True:
    s = c.find("<script", pos)
    if s < 0:
        break
    te = c.find(">", s)
    e = c.find("</script>", te)
    if e < 0:
        break
    tag = c[s : te + 1]
    if "src=" not in tag:
        scripts.append(c[te + 1 : e])
    pos = e + 9

js6 = scripts[2]  # 3rd inline (index 2), the big one
print(f"Inline script #6: {len(js6)} chars")

# Check brace balance
depth = 0
for ch in js6:
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
print(f"Brace diff: {depth}")

# Test with node
import tempfile, os
tmp = tempfile.mktemp(suffix=".js")
try:
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(js6)
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True, timeout=15)
    if r.returncode != 0:
        print(f"\nNODE ERROR: {r.stderr[:1000]}")
    else:
        print("OK: Node --check passed")
except Exception as e:
    print(f"Node check failed: {e}")
finally:
    try:
        os.unlink(tmp)
    except:
        pass
