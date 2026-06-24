import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Check what 0e57b14 actually has
print("=== Checking 0e57b14 state ===")

# 1. admin-workflows position
sec = h.find('id="admin-security"')
d = 0; s = False; i = sec
while i < len(h):
    if h[i:i+4].lower() == '<div' and not h[i:i+5].lower() == '</div':
        d += 1; s = True
    elif h[i:i+6].lower() == '</div>':
        d -= 1
    if s and d == 0: break
    i += 1
sec_end = i + 6
wf = h.find('id="admin-workflows"')
print(f"1. admin-workflows ({wf}) {'inside' if wf < sec_end else 'OUTSIDE'} admin-security (ends {sec_end})")

# 2. allClients lazy load has credit_code
opf = h.find('function openProjectFormFromLead')
d = 0; s = False; i = opf
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
fn = h[opf:i+1]
ac = fn.find('allClients=data')
cc = 'credit_code' in fn[max(0,ac-350):ac] if ac > 0 else False
print(f"2. allClients lazy load has credit_code: {cc}")

# 3. renderWorkflowTemplates async
rwt = h.find('function renderWorkflowTemplates')
is_async = 'async ' in h[max(0,rwt-15):rwt]
print(f"3. renderWorkflowTemplates async: {is_async}")

# 4. onLeadTypeChange in selectLeadCompany
slc = h.find('function selectLeadCompany')
d = 0; s = False; i = slc
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
has_olt = 'onLeadTypeChange()' in h[slc:i+1]
print(f"4. onLeadTypeChange in selectLeadCompany: {has_olt}")

# 5. contacts query has title
has_title_contacts = "'title'" in fn
print(f"5. contacts has title: {has_title_contacts}")

# 6. Non-async await
bad = []
fp = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
for m in fp.finditer(h):
    nm = m.group(2); ia = m.group(1) is not None
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    if 'await ' in h[m.start():j+1] and not ia:
        bad.append(nm)
print(f"6. Non-async await functions: {len(bad)}")
