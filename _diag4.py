import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Check selectLeadCompany end for onLeadTypeChange call
i = h.find('function selectLeadCompany')
d = 0; s = False; j = i
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
fn = h[i:j+1]
# Show last 300 chars
print("=== selectLeadCompany last 300 chars ===")
print(fn[-300:])

# Find openProjectFormFromLead and the contacts query
opf = h.find('function openProjectFormFromLead')
if opf > 0:
    d = 0; s = False; j = opf
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn2 = h[opf:j+1]
    # Show lines with contacts
    for line in fn2.split('\n'):
        if 'contacts' in line.lower():
            print(f"  >> {line.strip()}")
    print(f"\nopenProjectFormFromLead: {j-opf} chars")
