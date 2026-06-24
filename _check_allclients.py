import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find onLeadCompanyInput to see lazy load of allClients
i = h.find('function onLeadCompanyInput(')
d = 0; s = False; j = i
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
fn = h[i:j+1]
print("=== onLeadCompanyInput ===")
print(fn)

# Check if credit_code is being lazy-loaded or if it's suppressed by select columns
print("\n=== Check client select queries ===")
for m in h.split('from(\'clients\').select')[1:6]:
    print(f"  select: {m[:80]}")
