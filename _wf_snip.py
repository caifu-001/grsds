import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Global vars area
idx = h.find("let allComps = []")
print(f"=== allComps area at {idx} ===")
print(h[idx:idx+150])
print()

# The main script start
idx = h.find("<script>")
print(f"=== script starts at {idx} ===")
print(h[idx:idx+300])
print()

# Find loadAll or main init
idx = h.find("function loadAll(")
if idx < 0:
    idx = h.find("function initAll(")
if idx < 0:
    idx = h.find("window.addEventListener")
print(f"=== init at {idx} ===")
print(h[idx:idx+300] if idx >= 0 else "NOT FOUND")
print()

# find saveProject  
idx = h.find("function saveProject(")
print(f"=== saveProject at {idx} ===")
print(h[idx:idx+500])
print()

# find opp-form-modal
idx = h.find('id="opp-form-modal"')
print(f"=== opp-form-modal at {idx} ===")
print(h[idx:idx+800])
print()

# find "admin" tab in nav
for kw in ['adm-goto', 'admin-menu', '管理后台', '超管', 'isSuperAdmin']:
    idx = h.find(kw)
    if idx >= 0:
        print(f"{kw} at {idx}: ...{h[idx:idx+120].strip()[:120]}...")
