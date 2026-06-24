import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Check selectLeadCompany again carefully
i = h.find('function selectLeadCompany')
d = 0; s = False; j = i
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
fn = h[i:j+1]
print("=== selectLeadCompany ===")
print(fn)

# Check what loadClients returns and if credit_code is in the select
print("\n=== allClients loading ===")
for kw in ['function loadClients', 'allClients =', 'var allClients']:
    pos = h.find(kw)
    if pos > 0:
        print(f"\n{kw} at {pos}")
        print(h[pos:pos+300])
