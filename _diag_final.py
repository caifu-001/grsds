import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# 1. renderWorkflowTemplates - verify current state
i = h.find('function renderWorkflowTemplates')
print(f"renderWorkflowTemplates at {i}")
print(h[i:i+55])

# 2. Find all .select('*') from clients in onLeadCompanyInput / lazy loads
import re
for m in re.finditer(r"from\('clients'\)\.select\(", h):
    pos = m.start()
    ctx = h[pos:pos+150]
    print(f"\nclients select at {pos}: {ctx}")

# 3. Find the contacts query in openProjectFormFromLead
for m in re.finditer(r"from\('contacts'\)\.select\(", h):
    pos = m.start()
    ctx = h[pos:pos+100]
    print(f"\ncontacts select at {pos}: {ctx}")
