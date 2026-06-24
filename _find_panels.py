import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find all admin-panel siblings to understand the correct structure
idx = h.find('class="admin-tabs"')
if idx < 0:
    idx = h.find('admin-tabs')

# Show 2000 chars from admin-tabs to find all panel divs
section = h[idx:idx+5000]
lines = section.split('\n')
for i, line in enumerate(lines):
    if 'admin-panel' in line or 'admin-tabs' in line or 'admin-subtab' in line:
        print(f"  {i}: {line.strip()[:120]}")
