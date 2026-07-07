import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Search backwards from end of script for the missing brace
js_start = c.find("<script>")
js_end = c.rfind("</script>")
script = c[js_start:js_end]

# Walk through the script tracking brace depth
depth = 0
last_zero_line = 0
lines = script.split("\n")
for i, line in enumerate(lines):
    for ch in line:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
    if depth <= 0:
        last_zero_line = i

print(f"Last line with depth <= 0: {last_zero_line}")
print(f"Final depth: {depth}")
print(f"Script line {last_zero_line + 3} context:")
for j in range(max(0, last_zero_line - 3), min(last_zero_line + 5, len(lines))):
    marker = ">>>" if j == last_zero_line else "   "
    print(f"{marker} {j+1}: {lines[j][:200]}")
