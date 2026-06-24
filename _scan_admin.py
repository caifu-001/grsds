import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find admin tab structure
idx = h.find('切换公司管理')
if idx < 0:
    idx = h.find('公司管理')
if idx < 0:
    idx = h.find('user-mgmt')
if idx < 0:
    idx = h.find('设置')
    
print(f"Found admin marker at {idx}")
if idx > 0:
    # Show surrounding tab navigation context
    start = max(0, h.rfind('<button', 0, idx))
    ctx = h[start:start+600].replace('\n','\n  ')
    print("=== Tab nav context ===")
    print(ctx[:2000])

# Find the sub-tab navigation (e.g., 用户管理, 部门管理, etc.)
for marker in ['用户管理','部门管理','公司管理','操作日志','系统配置','数据安全']:
    pos = h.find(marker)
    if pos > 0:
        ctx2 = h[max(0,pos-100):pos+100]
        print(f"\n--- {marker} at {pos} ---")
        print(ctx2[:200])

print("\n=== Searching for settings sub-tabs ===")
# Find the settings container
for keyword in ['settings-subtabs','settings-tabs','admin-subtabs','admin-tabs','subtab']:
    pos = h.find(keyword)
    if pos > 0:
        print(f"\nFound '{keyword}' at {pos}")
        print(h[pos:pos+500])
