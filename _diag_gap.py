import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

ivOpen = c.find('id="inventory-view"')
collabOpen = c.find('id="collab-view"')

segment = c[ivOpen:collabOpen]
print(f"Segment length: {len(segment)} chars")

# Show the last 3000 chars of the segment
print("\n=== Last 3000 chars before collab-view ===")
for i, line in enumerate(segment[-3000:].split("\n")):
    s = line.strip()
    if s:
        print(f"  {s[:130]}")
