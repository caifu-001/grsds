import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Full switchTab function
idx = c.find("function switchTab(")
depth = 0; started = False; end = idx
for i in range(idx, len(c)):
    ch = c[i]
    if ch == "\n": continue
    if ch == "{": depth += 1; started = True
    elif ch == "}": depth -= 1
    if started and depth == 0: end = i + 1; break

fn = c[idx:end]
print("=== FULL switchTab ===")
print(fn)

# Check for tab-service-tab element
for elem in ["tab-service", "tab-collab", "tab-projects", "tab-analytics", "tab-after", "collab-view", "service-view"]:
    cnt = c.count(f'id="{elem}"') + c.count(f"id='{elem}'")
    if cnt:
        print(f"\n'{elem}' exists in DOM: {cnt}")

# Look at how project/collab/service tabs render
for pattern in ["switchTab('collab'", "switchTab('service'", "switchTab('projects'", "switchTab('analytics'"]:
    idx = fn.find(pattern)
    if idx >= 0:
        print(f"\n--- {pattern} ---")
        print(fn[idx:idx+300])
