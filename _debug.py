import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

lines = c.split("\n")
l = 17062

print(f"Total lines: {len(lines)}")
print(f"\nLine {l}:")
if l <= len(lines):
    print(lines[l - 1][:300])
else:
    print("OUT OF RANGE")

print(f"\nContext {max(1,l-4)} to {min(len(lines),l+2)}:")
for i in range(max(0, l - 5), min(len(lines), l + 2)):
    print(f"  {i + 1}: {lines[i][:200]}")
