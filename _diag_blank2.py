import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# 1. Find switchTab full function
idx = c.find("function switchTab(")
depth = 0; started = False; end = idx
for i in range(idx, len(c)):
    ch = c[i]
    if ch == "\n": continue
    if ch == "{": depth += 1; started = True
    elif ch == "}": depth -= 1
    if started and depth == 0: end = i + 1; break

fn = c[idx:end]
print(f"switchTab length: {len(fn)}")
# Show the view-switching logic
for line in fn.split("\n")[:40]:
    # Find lines with show/hide logic
    s = line.strip()
    if any(kw in s for kw in ["display", "show", "hide", "view", "tab"]):
        print(f"  {s[:150]}")

# 2. Check what renders for each tab
print("\n=== RENDER FUNCTIONS ===")
render_funcs = [
    "renderDashboard", "renderDashboardCharts", "renderProjects", 
    "renderAfterSales", "renderAfterSale", "renderCollab", 
    "renderCollaboration", "renderAnalytics", "renderOverview",
    "loadProjects", "loadAfterSales", "loadCollab"
]
for fn in render_funcs:
    cnt = c.count(f"function {fn}(") + c.count(f"function {fn} (")
    if cnt > 0:
        print(f"  EXISTS: {fn} ({cnt})")
    else:
        print(f"  MISSING: {fn}")

# 3. Check for after-sales DOM
for pattern in ["after-sales-view", "after-sales", "afterSales", "售后"]:
    cnt = c.count(pattern)
    print(f"'{pattern}' occurrences: {cnt}")

# 4. Check switchTab tab-mapping keywords
tab_names = ["'overview'", "'analytics'", "'projects'", "'after-sales'", "'collab'", "'afterSales'", "'collaboration'"]
for t in tab_names:
    cnt = fn.count(t)
    if cnt > 0:
        print(f"switchTab maps {t}: {cnt}")
