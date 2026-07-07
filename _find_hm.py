import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

start = 0
for i in range(5):
    idx = c.find("+h(m", start)
    if idx < 0:
        break
    print(f"\nMatch {i+1} at offset {idx}:")
    print(c[idx - 30 : idx + 80])
    start = idx + 1
