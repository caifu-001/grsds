import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

# Find ALL script blocks
all_js = ""
pos = 0
while True:
    start = c.find("<script", pos)
    if start < 0:
        break
    # Find > of opening tag
    tag_end = c.find(">", start)
    if tag_end < 0:
        break
    # Check if it's a src= script (skip external)
    tag = c[start:tag_end]
    if "src=" in tag:
        pos = tag_end + 1
        continue
    # Find closing </script>
    end = c.find("</script>", tag_end)
    if end < 0:
        break
    all_js += c[tag_end + 1 : end] + "\n"
    pos = end + 9

print(f"Found JS blocks, total {len(all_js)} chars")

# Check brace balance
depth = 0
lines = all_js.split("\n")
for i, line in enumerate(lines):
    for ch in line:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1

print(f"Final depth: {depth}")
print(f"Total lines: {len(lines)}")

# Test with node
import subprocess, tempfile, os
tmp = tempfile.mktemp(suffix=".js")
try:
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(all_js)
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True, timeout=15)
    if r.returncode != 0:
        print("\n=== NODE SYNTAX ERROR ===")
        print(r.stderr[:1000])
    else:
        print("\nOK: Node --check passed")
except Exception as e:
    print(f"\nNode check failed: {e}")
finally:
    try:
        os.unlink(tmp)
    except:
        pass
