import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

js_start = c.find("<script>")
js_end = c.rfind("</script>")
js = c[js_start + 8 : js_end]
lines = js.split("\n")

# Balance braces
depth = 0
for i, line in enumerate(lines):
    for ch in line:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
    if depth < 0:
        print(f"Extra close brace at JS line {i+1}: depth={depth}")
        depth = 0

print(f"u0027 count: {js.count(chr(92) + 'u0027')}")

# Regex and } issue
m = re.findall(r'(?<=\})\s*\n\s*/', js)
print(f"Close-brace then / on next line: {len(m)}")

print(f"+h(m count: {js.count('+h(m')}")
print(f"+h(u count: {js.count('+h(u')}")
print(f"Final brace depth: {depth}")
print(f"Script lines: {len(lines)}")
print(f"Old compare table HTML present: {'scouting-compare-table' in c}")
print(f"New compare container present: {'scouting-compare-container' in c}")

# Test with node
import subprocess, tempfile
tmp = tempfile.mktemp(suffix=".js")
try:
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(js)
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True, timeout=10)
    if r.returncode != 0:
        print("\n=== NODE SYNTAX ERROR ===")
        print(r.stderr[:800])
    else:
        print("\nOK: Node --check passed")
except Exception as e:
    print(f"\nNode check failed: {e}")
finally:
    try:
        os.unlink(tmp)
    except:
        pass
