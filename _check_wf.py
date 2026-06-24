import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find switchAdminTab function
i = h.find('function switchAdminTab(')
if i < 0:
    i = h.find('switchAdminTab = function')
if i < 0:
    print("switchAdminTab NOT FOUND")
else:
    d = 0; s = False; j = i
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn = h[i:j+1]
    print(f"switchAdminTab ({len(fn)} chars)")
    # Show only lines with workflows
    for line in fn.split('\n'):
        if 'workflow' in line.lower():
            print(f"  >> {line.strip()}")

# Find admin-workflows div and check if it has 'hidden' class
wf = h.find('id="admin-workflows"')
if wf > 0:
    print(f"\nadmin-workflows at {wf}")
    print(h[wf:wf+150])

# Check if renderWorkflowTemplates exists
rwt = h.find('function renderWorkflowTemplates')
if rwt > 0:
    d = 0; s = False; j = rwt
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    print(f"\nrenderWorkflowTemplates at {rwt} ({j-rwt} chars)")
else:
    print("\nrenderWorkflowTemplates NOT FOUND!")

# Check loadTemplates
lt = h.find('function loadTemplates')
if lt > 0:
    print(f"\nloadTemplates at {lt}")
else:
    print("\nloadTemplates NOT FOUND!")
