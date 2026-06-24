import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r"D:\1kaifa\grsds\index.html","r",encoding='utf-8') as f:
    h=f.read()

# Find all global var/let declarations
import re
for m in re.finditer(r'(?:var|let)\s+all\w+\s*=', h):
    ctx = h[m.start():m.start()+80]
    print(f"  {m.start()}: {ctx.strip()[:80]}")

# Find where user login completes / profile loaded / main data loading starts
idx = h.find("allClients = data;")
if idx >= 0:
    print(f"\nallClients = data at {idx}")
    
idx = h.find("allLeads = data;")
if idx >= 0:
    print(f"allLeads = data at {idx}")

idx = h.find("allProjects = data;")
if idx >= 0:
    print(f"allProjects = data at {idx}")
