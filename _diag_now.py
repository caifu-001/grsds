import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

print("=== 1. 流程模板页面渲染函数 ===")
i = h.find('function renderWorkflowTemplates')
print(h[i:i+80])
print()

# Check if there's a bug in the function's await fetch
j = h.find('id="admin-workflows"')
print(f"admin-workflows div at {j}")
# show 60 bytes before and 200 after
ctx = h[max(0,j-60):j+200]
print(f"Context: ...{ctx[-100:]}...")
print()

# Check admin-workflows falls INSIDE which container
# Find the admin screen boundaries
admin_screen = h.find('id="admin-screen"')
if admin_screen > 0:
    print(f"admin-screen at {admin_screen}")
    d = 0; s = False; pos = admin_screen
    while pos < len(h):
        if h[pos:pos+4].lower() == '<div': d += 1; s = True
        elif h[pos:pos+6].lower() == '</div>': d -= 1
        if s and d == 0: break
        pos += 1
    print(f"admin-screen ends at {pos+6}")
    print(f"admin-workflows is {'INSIDE' if j < pos else 'OUTSIDE'} admin-screen")
print()

# Check data-security div leaking
sec = h.find('id="admin-security"')
if sec > 0:
    d = 0; s = False; pos = sec
    while pos < len(h):
        if h[pos:pos+4].lower() == '<div': d += 1; s = True
        elif h[pos:pos+6].lower() == '</div>': d -= 1
        if s and d == 0: break
        pos += 1
    print(f"admin-security ends at {pos+6}")
    print(f"admin-workflows is at {j}")
    print(f"admin-workflows is {'INSIDE' if j < pos else 'OUTSIDE'} admin-security")

# Get surrounding context of admin-workflows
print(f"\n=== Around admin-workflows ===")
start = max(0, j-200)
end = j+200
print(h[start:end])
