import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Quick check: count divs in the full admin screen area
# Find the opening of all admin panels (starts around admin-tabs)
admin_tabs = h.find('class="admin-tabs"')
# Find the closing of the entire admin panel container (main-fab is right after)
main_fab = h.find('id="main-fab"')

section = h[admin_tabs:main_fab]
opens = section.count('<div')
closes = section.count('</div>')
print(f"admin-tabs to main-fab: <div={opens} </div>={closes} net={opens-closes}")
if opens == closes:
    print("✅ Div balanced")
else:
    print("❌ Div MISMATCH")

# Also show the structure lines from admin-workflows onwards
lines = h.split('\n')
for i, line in enumerate(lines):
    if 'admin-tabs' in line or 'admin-workflows' in line or 'main-fab' in line or 'admin-security' in line:
        marker = f" byte {len('\n'.join(lines[:i])) + (i>0)}"
        # Show ± lines around
        for j in range(max(0,i-2), min(len(lines), i+4)):
            tag = '>>>' if j == i else '   '
            print(f"{tag} {j+1}: {lines[j].rstrip()[:130]}")
        print()
