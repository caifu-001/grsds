import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find all places that populate allClients
for m in re.finditer(r'allClients\s*=', h):
    pos = m.start()
    # Show context
    ctx = h[max(0,pos-100):pos+200]
    print(f"\n=== allClients = at {pos} ===")
    print(ctx)

# Find loadClients function
lc = h.find('function loadClients(')
if lc > 0:
    d = 0; s = False; j = lc
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn = h[lc:j+1]
    # Show lines with select
    for line in fn.split('\n'):
        if 'select' in line:
            print(f"  loadClients: {line.strip()[:150]}")

# Also check what selectLeadCompany's credit_code setting is doing - 
# does it use leadCompSuggList (which comes from allClients with select('*'))
# or does it use a separately-fetched client?
print("\n=== Checking leadCompSuggList ===")
for m in re.finditer(r'leadCompSuggList', h):
    pos = m.start()
    ctx2 = h[max(0,pos-20):pos+30]
    print(f"  {pos}: {ctx2.strip()}")
