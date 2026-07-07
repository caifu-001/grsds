import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Check around line 1149
lines = c.split("\n")
around = 10
for i in range(max(0, 1149 - around - 1), min(1149 + around, len(lines))):
    marker = ">>>" if i == 1149 - 1 else "   "
    print(f"{marker} {i+1}: {lines[i][:150]}")
