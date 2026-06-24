import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# 1. Check if renderWorkflowTemplates still has double async
c = h.count('async async')
print(f"async async count: {c}")

# Also check how many renderWorkflowTemplates definitions exist
import re
for m in re.finditer(r'function renderWorkflowTemplates', h):
    pos = m.start()
    print(f"\nrenderWorkflowTemplates at {pos}: {h[pos:pos+60]}")

# 2. Check onLeadTypeChange - does it exist and have correct logic
olt = h.find('function onLeadTypeChange')
if olt > 0:
    d = 0; s = False; j = olt
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    print(f"\n=== onLeadTypeChange ({olt} to {j}) ===")
    print(h[olt:j+1])
else:
    print("\nonLeadTypeChange NOT FOUND!")

# 3. Check credit_code field - is it still readonly with gray bg?
cc = h.find('id="lf-credit-code"')
if cc > 0:
    print(f"\nlf-credit-code HTML at {cc}:")
    print(h[cc-50:cc+200])

# 4. Find the contacts query that's failing
for m in re.finditer(r'contacts\?select=', h):
    pos = m.start()
    print(f"\ncontacts query at {pos}: {h[pos:pos+200]}")
