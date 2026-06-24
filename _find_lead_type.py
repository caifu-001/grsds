import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find lead form HTML context around customer type and credit code
for keyword in ['lf-customer-type', '客户类型', 'lf-credit-code', '信用代码']:
    pos = h.find(keyword)
    if pos > 0:
        print(f"\n=== '{keyword}' at {pos} ===")
        print(h[max(0,pos-80):pos+200])

# Also find onLeadCompanyInput
pos2 = h.find('function onLeadCompanyInput')
if pos2 > 0:
    d = 0; s = False; j = pos2
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    print(f"\n=== onLeadCompanyInput ({pos2} to {j}) ===")
    print(h[pos2:j+1])
