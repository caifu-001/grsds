import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find openProjectFormFromLead
idx = h.find('function openProjectFormFromLead')
# Extract 3000 chars
chunk = h[idx:idx+4000]
lines = chunk.split('\n')
for i, line in enumerate(lines):
    if 'allClients' in line or 'select(' in line or 'credit' in line.lower():
        print(f"{i}: {line.strip()[:150]}")
