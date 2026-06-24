import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find lf-credit-code in HTML
pos = h.find('id="lf-credit-code"')
if pos > 0:
    print(f"lf-credit-code HTML at {pos}")
    print(h[max(0,pos-60):pos+200])
else:
    print("lf-credit-code HTML NOT FOUND")
    # Try other variants
    for v in ['lf-credit', 'credit-code', 'credit_code']:
        ps = [i for i in range(len(h)) if h.startswith(v, i)]
        print(f"\n{v}: {len(ps)} occurrences")
        for p in ps[:5]:
            print(f"  {p}: {h[max(0,p-30):p+80]}")

# Check if the field exists in saveLead
print("\n=== saveLead credit_code ===")
sl = h.find('function saveLead(')
if sl > 0:
    d = 0; s = False; j = sl
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn = h[sl:j+1]
    if 'credit_code' in fn:
        print("credit_code IS in saveLead payload")
    else:
        print("credit_code NOT in saveLead payload")
    print(f"saveLead length: {len(fn)}")
