import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Check loadTemplates
lt = h.find('function loadTemplates')
print(f"loadTemplates at {lt}")
chunk = h[lt:lt+300]
print(repr(chunk[:200]))

# Check openMy prefix
omy = h.find('function openMy')
print(f"\nopenMy at {omy}")
print(repr(h[max(0,omy-20):omy+30]))

# Check renderWorkflowTemplates  
rwt = h.find('function renderWorkflowTemplates')
print(f"\nrenderWorkflowTemplates at {rwt}")
print(repr(h[max(0,rwt-20):rwt+40]))

# Show structure around main-fab
fab = h.find('id="main-fab"')
print(f"\n=== Around main-fab ({fab}) ===")
for i, line in enumerate(h[max(0,fab-200):fab+80].split('\n')):
    s = line.strip()
    if s: print(f"  {s[:130]}")
