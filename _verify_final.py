import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

all_ok = True

# 1. Double async
for m in re.finditer(r'async\s+async', h):
    ln = h[:m.start()].count('\n') + 1
    print(f"FAIL: double async at line {ln}")
    all_ok = False

# 2. Non-async functions with await
func_pattern = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
for m in func_pattern.finditer(h):
    name = m.group(2)
    is_async = m.group(1) is not None
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    body = h[m.start():j+1]
    if 'await ' in body and not is_async:
        ln = h[:m.start()].count('\n') + 1
        print(f"FAIL: {name}() at line {ln} uses await but not async")
        all_ok = False

# 3. Script tag balance
opens = len(re.findall(r'<script[^>]*>', h))
closes = len(re.findall(r'</script>', h))
if opens != closes:
    print(f"FAIL: script tags {opens} open, {closes} close")
    all_ok = False

# 4. renderWorkflowTemplates declaration
for m in re.finditer(r'function renderWorkflowTemplates', h):
    prefix = h[max(0,m.start()-20):m.start()]
    if 'async ' not in prefix:
        print(f"FAIL: renderWorkflowTemplates missing async")
        all_ok = False
    else:
        ln = h[:m.start()].count(chr(10)) + 1; print(f"OK: renderWorkflowTemplates is async at line {ln}")

# 5. onLeadTypeChange called from selectLeadCompany
slc = h.find('function selectLeadCompany')
d = 0; s = False; j = slc
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
if 'onLeadTypeChange()' in h[slc:j+1]:
    print("OK: onLeadTypeChange called from selectLeadCompany")
else:
    print("FAIL: onLeadTypeChange NOT called from selectLeadCompany")
    all_ok = False

# 6. contacts query without 'title'
opf = h.find('function openProjectFormFromLead')
d = 0; s = False; j = opf
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
body = h[opf:j+1]
if "'title'" in body:
    print("FAIL: 'title' still in contacts query")
    all_ok = False
else:
    print("OK: no 'title' in contacts query")

# 7. allClients lazy load has credit_code
if 'credit_code' in body and "allClients=data" in body:
    # Has credit_code in body, check if it's in the select
    select_part = body[body.find("allClients=data")-300:body.find("allClients=data")]
    if 'credit_code' in select_part:
        print("OK: allClients select includes credit_code")
    else:
        print("FAIL: allClients select missing credit_code")
        all_ok = False

if all_ok:
    print("\n✅ ALL CHECKS PASSED")
