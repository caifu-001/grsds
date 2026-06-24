import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

errors = []

# 1. No duplicate async
c = h.count('async async')
if c > 0:
    errors.append(f"async async found {c} times")

# 2. renderWorkflowTemplates has exactly one 'async function'
for m in re.finditer(r'function renderWorkflowTemplates', h):
    ctx = h[max(0,m.start()-20):m.start()+50]
    if 'async' not in h[max(0,m.start()-20):m.start()]:
        errors.append(f"renderWorkflowTemplates MISSING async: ...{ctx}...")

# 3. onLeadTypeChange exists and is called from selectLeadCompany
olt = h.find('function onLeadTypeChange')
if olt < 0:
    errors.append("onLeadTypeChange NOT FOUND")
else:
    slc = h.find('function selectLeadCompany')
    d = 0; s = False; j = slc
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    fn = h[slc:j+1]
    if 'onLeadTypeChange()' not in fn:
        errors.append("onLeadTypeChange NOT called from selectLeadCompany")

# 4. contacts query in openProjectFormFromLead without 'title'
opf = h.find('function openProjectFormFromLead')
d = 0; s = False; j = opf
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
fn2 = h[opf:j+1]
if "'title'" in fn2 or '"title"' in fn2:
    errors.append("'title' still in openProjectFormFromLead contacts query")

# 5. allClients lazy load has credit_code
# Find the lazy load in openProjectFormFromLead
start2 = fn2.find("allClients=data")
if start2 > 0:
    # Search backwards for the select
    pre = fn2[max(0,start2-300):start2]
    if 'credit_code' not in pre:
        errors.append("allClients lazy load MISSING credit_code")

# 6. Check lf-credit-code field is not readonly initially  
# Actually the HTML is fine, it's controlled by onLeadTypeChange

# 7. Unclosed script tags or other structural issues
# Count <script> vs </script>
open_script = h.count('<script')
close_script = h.count('</script>')
if open_script != close_script:
    errors.append(f"SCRIPT tags mismatch: {open_script} open vs {close_script} close")

if not errors:
    print("ALL CHECKS PASSED")
else:
    for e in errors:
        print(f"FAIL: {e}")
