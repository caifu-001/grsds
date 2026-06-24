import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find lead form structure around customer type and credit code
# Look for lf-customer-type onchange
pos = h.find('lf-customer-type')
if pos > 0:
    # Show surrounding HTML context
    start = max(0, h.rfind('<div', 0, pos))
    end = min(len(h), pos + 500)
    ctx = h[start:end]
    print("=== lf-customer-type context ===")
    print(ctx[:800])

# Also look for onchange on the select
for i in range(pos-200, pos+30) if pos > 0 else range(0):
    pass
if pos > 0:
    snippet = h[pos-200:pos+300]
    print(f"\n=== Around lf-customer-type ===")
    print(snippet)

# Check lead form opening function
print("\n=== openLeadForm search ===")
olf = h.find('function openLeadForm(')
if olf > 0:
    d = 0; s = False; j = olf
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn = h[olf:j+1]
    # Look for credit-code hide/show logic in the function
    if 'credit' in fn.lower():
        for line in fn.split('\n'):
            if 'credit' in line.lower() or 'type' in line.lower():
                print(f"  {line.strip()[:150]}")
    print(f"  openLeadForm: {len(fn)} chars")
