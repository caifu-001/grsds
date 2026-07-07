import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Check for each view's DOM element
views = {
    "analytics-view": "总览",
    "projects-view": "项目", 
    "after-sales-view": "售后",
    "collab-view": "协同",
}

for vid, name in views.items():
    cnt = c.count(f'id="{vid}"') + c.count(f"id='{vid}'")
    display_none = c.count(f'id="{vid}" style="display:none"') + c.count(f"id='{vid}' style='display:none'")
    display_block = c.count(f'id="{vid}" style="display:block"') + c.count(f"id='{vid}' style='display:block'")
    print(f"{name} ({vid}): found={cnt}, display:none={display_none}, display:block={display_block}")

# Check switchTab function
idx = c.find("function switchTab(")
if idx > 0:
    end = c.find("\nfunction ", idx + 50)
    fn = c[idx:end]
    for vname in ["analytics", "after-sales", "projects", "collab", "overview"]:
        print(f"\nswitchTab refs to '{vname}': {fn.count(vname)}")

# Check renderDashboard
idx = c.find("function renderDashboard")
if idx > 0:
    print(f"\nrenderDashboard context:")
    print(c[idx:idx+300])
