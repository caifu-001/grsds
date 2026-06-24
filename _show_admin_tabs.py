import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find admin-tabs area
at_start = h.find('class="admin-tabs"')
# Show 500 chars from there
chunk = h[at_start:at_start+2000]
lines = chunk.split('\n')
for i, line in enumerate(lines):
    if '<div' in line.lower() or '</div' in line.lower() or 'admin-' in line.lower() or '<!--' in line:
        print(f"{i:3d}: {line.strip()[:130]}")
    elif line.strip():
        print(f"{i:3d}: {line.strip()[:130]}")
