import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Check key render functions
for fn in ["renderDashboard", "renderProjects", "renderAfterSales", "renderScouting", "refreshScoutingCompare", "renderSuppliers"]:
    idx = c.find(f"function {fn}")
    if idx > 0:
        print(f"OK: {fn} defined at offset {idx}")
    else:
        print(f"MISSING: {fn}")

# Check if filtered variable is used properly in refreshScoutingCompare
idx = c.find("function refreshScoutingCompare")
end = c.find("cmpContainer.innerHTML=containerHtml;", idx) + 50
fn = c[idx:end]

print(f"\nrefreshScoutingCompare length: {len(fn)}")
print("Contains 'filtered':", "filtered" in fn)
print("Contains 'allScouting':", "allScouting" in fn)
print("Contains 'cmpContainer':", "cmpContainer" in fn)
