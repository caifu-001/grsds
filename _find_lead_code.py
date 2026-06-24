import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find selectLeadCompany function
i = h.find('function selectLeadCompany')
d = 0; s = False; j = i
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
print("=== selectLeadCompany ===")
print(h[i:j+1])

# Also find the lead form HTML for credit code field
print("\n=== Lead form credit code field ===")
pos = h.find('统一社会信用代码')
if pos > 0:
    print(h[pos-100:pos+200])
pos2 = h.find('credit_code')
if pos2 > 0:
    print(f"\ncredit_code at {pos2}:")
    print(h[pos2-100:pos2+200])
pos3 = h.find('lf-credit')
if pos3 > 0:
    print(f"\nlf-credit at {pos3}:")
    print(h[pos3-100:pos3+200])

# Check if the client list is loaded
print("\n=== Looking for allClients variable ===")
ac = h.find('var allClients')
print(f"allClients at {ac}")
if ac > 0: print(h[ac:ac+120])
