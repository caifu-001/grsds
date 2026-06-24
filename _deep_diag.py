import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\_online_raw.html','r',encoding='utf-8') as f:
    online = f.read()

# === PROBLEM 1: admin-workflows div leaking ===
# Check the FULL admin panel container structure
# Find ALL admin-panel divs and their nesting
lines = online.split('\n')
admin_container_start = -1
admin_container_end = -1

# Find the admin screen container
asc = online.find('id="admin-screen"')
if asc < 0:
    asc = online.find('class="admin-screen"')
print(f"admin-screen at: {asc}")

# Show lines 1540-1570 to see exact structure
print("\n=== Lines 1530-1570 (structure around WF) ===")
for i in range(1529, min(len(lines), 1570)):
    tag = lines[i].strip()
    if tag:
        marker = ''
        if 'admin-security' in tag: marker = ' <<< SEC'
        elif 'admin-workflows' in tag: marker = ' <<< WF'
        elif 'main-fab' in tag: marker = ' <<< FAB'
        elif 'switchAdminTab' in tag: marker = ' <<< TAB'
        elif '</div>' in tag and not tag.startswith('<!--'): marker = ' <<< CLOSE'
        elif tag.startswith('<div'): marker = ' <<< OPEN'
        print(f"{i+1}: {tag[:150]}{marker}")

# === PROBLEM 2: renderWorkflowTemplates actual code ===
rwt = online.find('function renderWorkflowTemplates')
if rwt > 0:
    # Find the function body
    d = 0; s = False
    for i in range(rwt, len(online)):
        if online[i] == '{': d += 1; s = True
        elif online[i] == '}': d -= 1
        if s and d == 0:
            rwt_end = i + 1
            break
    fn_rwt = online[rwt:rwt_end]
    print(f"\n=== renderWorkflowTemplates ({len(fn_rwt)} bytes) ===")
    for line in fn_rwt.split('\n'):
        stripped = line.strip()
        if stripped and len(stripped) < 200:
            print(f"  {stripped}")
    print(f"...total {fn_rwt.count(chr(10))} lines")

# === PROBLEM 3: loadTemplates ===
lt = online.find('function loadTemplates')
if lt > 0:
    d = 0; s = False
    for i in range(lt, len(online)):
        if online[i] == '{': d += 1; s = True
        elif online[i] == '}': d -= 1
        if s and d == 0:
            lt_end = i + 1
            break
    fn_lt = online[lt:lt_end]
    print(f"\n=== loadTemplates ({len(fn_lt)} bytes) ===")
    for line in fn_lt.split('\n')[:20]:
        stripped = line.strip()
        if stripped and len(stripped) < 200:
            print(f"  {stripped}")
