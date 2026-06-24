import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

print(f"File size: {len(h)} chars, {h.count(chr(10))} lines")

# === FIX 1: Move admin-workflows from INSIDE admin-security to AFTER it ===
# Current: admin-workflows is nested inside admin-security (lines 1547-1556 inside lines ~1538-1561)
# Target: admin-workflows should be a sibling of admin-security, right after admin-security's closing </div>

# Extract the WF block (from <!-- Workflow Templates --> to its closing </div>+newline)
wf_comment = h.find('<!-- Workflow Templates -->')
# Find admin-workflows opening div
wf_div = h.find('id="admin-workflows"', wf_comment)
# Count divs from this opening to find its matching close
d = 0
started = False
wf_end = wf_div
for i in range(wf_div, len(h)):
    tag4 = h[i:i+4].lower()
    tag6 = h[i:i+6].lower()
    if tag4 == '<div' and tag6 != '</div':
        d += 1
        started = True
    elif tag6 == '</div>':
        d -= 1
    if started and d == 0:
        wf_end = i + 6
        break

# Include trailing newlines
while wf_end < len(h) and h[wf_end] in '\r\n':
    wf_end += 1

wf_block = h[wf_comment:wf_end]
print(f"\nWF block: {wf_comment}-{wf_end} ({len(wf_block)} chars)")
print(f"WF block preview: {repr(wf_block[:80])}...")
print(f"WF block tail: ...{repr(wf_block[-80:])}")

# Remove WF block
h2 = h[:wf_comment] + h[wf_end:]

# Now find admin-security closing in h2
sec_div = h2.find('id="admin-security"')
d = 0
started = False
sec_end = sec_div
for i in range(sec_div, len(h2)):
    tag4 = h2[i:i+4].lower()
    tag6 = h2[i:i+6].lower()
    if tag4 == '<div' and tag6 != '</div':
        d += 1
        started = True
    elif tag6 == '</div>':
        d -= 1
    if started and d == 0:
        sec_end = i + 6
        break

print(f"\nadmin-security in h2: {sec_div}-{sec_end}")
# Show context around sec_end
ctx = h2[max(0,sec_end-100):sec_end+200]
print(f"Context around sec_end: {repr(ctx[:150])}...")
print(f"  ...{repr(ctx[-150:])}")

# The admin-security closing </div> at sec_end - we need to insert WF block RIGHT AFTER this
# But BEFORE the next item (main-fab button)
# Insert WF block right after sec_end
h3 = h2[:sec_end] + '\n\n' + wf_block + h2[sec_end:]

# === FIX 2: Add credit_code to allClients lazy load in openProjectFormFromLead ===
# Find the lazy load select
old_select = ".select('id,name,industry,address,type').eq('company_id',currentCompanyId);if(data)allClients=data;"
new_select = ".select('id,name,industry,address,type,credit_code').eq('company_id',currentCompanyId);if(data)allClients=data;"
count = h3.count(old_select)
if count > 0:
    h3 = h3.replace(old_select, new_select)
    print(f"\nFIX 2: Added credit_code to allClients select ({count} occurrences)")
else:
    print("\nFIX 2: Pattern not found, trying variant...")
    # Try variant without semicolon
    for var_old in [
        ".select('id,name,industry,address,type').eq('company_id',currentCompanyId)",
    ]:
        idx = h3.find(var_old)
        if idx >= 0:
            var_new = ".select('id,name,industry,address,type,credit_code').eq('company_id',currentCompanyId)"
            h3 = h3[:idx] + var_new + h3[idx+len(var_old):]
            print(f"  -> Fixed at byte {idx}")
            break

# === FIX 3: Verify async renderWorkflowTemplates ===
rwt = h3.find('function renderWorkflowTemplates')
prefix = h3[max(0,rwt-20):rwt]
if 'async ' not in prefix:
    print("FIX 3: Adding async to renderWorkflowTemplates")
    h3 = h3[:rwt] + 'async ' + h3[rwt:]
else:
    print("FIX 3: renderWorkflowTemplates already async ✓")

# === VERIFY ALL ===
print("\n=== VERIFICATION ===")
ok = True

# V1: admin-workflows NOT inside admin-security
sec = h3.find('id="admin-security"')
d = 0; started = False; sec_close = sec
for i in range(sec, len(h3)):
    t4 = h3[i:i+4].lower(); t6 = h3[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; started = True
    elif t6 == '</div>': d -= 1
    if started and d == 0: sec_close = i + 6; break
wf = h3.find('id="admin-workflows"')
v1 = wf > sec_close
print(f"V1: admin-workflows AFTER admin-security: {v1} {'✓' if v1 else '✗'}")
if not v1: ok = False

# V2: credit_code in allClients lazy load (check openProjectFormFromLead)
opf = h3.find('function openProjectFormFromLead')
d = 0; started = False; j = opf
while j < len(h3):
    if h3[j] == '{': d += 1; started = True
    elif h3[j] == '}': d -= 1
    if started and d == 0: break
    j += 1
fn = h3[opf:j+1]
ac = fn.find('allClients=data')
v2 = ac > 0 and 'credit_code' in fn[max(0,ac-400):ac]
print(f"V2: credit_code in allClients lazy load: {v2} {'✓' if v2 else '✗'}")
if not v2: ok = False

# V3: renderWorkflowTemplates async
rwt3 = h3.find('function renderWorkflowTemplates')
v3 = 'async ' in h3[max(0,rwt3-15):rwt3]
print(f"V3: renderWorkflowTemplates async: {v3} {'✓' if v3 else '✗'}")
if not v3: ok = False

# V4: No non-async await functions  
fp = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
bad = []
for m in fp.finditer(h3):
    nm = m.group(2); ia = m.group(1) is not None
    d = 0; started = False; jj = m.start()
    while jj < len(h3):
        if h3[jj] == '{': d += 1; started = True
        elif h3[jj] == '}': d -= 1
        if started and d == 0: break
        jj += 1
    if 'await ' in h3[m.start():jj+1] and not ia:
        bad.append(nm)
v4 = len(bad) == 0
print(f"V4: No non-async await: {v4} {'✓' if v4 else '✗'}")
if not v4: ok = False; [print(f'  - {b}') for b in bad]

# V5: No double async
v5 = 'async async' not in h3
print(f"V5: No double async: {v5} {'✓' if v5 else '✗'}")
if not v5: ok = False

# V6: onLeadTypeChange called from selectLeadCompany
slc = h3.find('function selectLeadCompany')
d = 0; started = False; jj = slc
while jj < len(h3):
    if h3[jj] == '{': d += 1; started = True
    elif h3[jj] == '}': d -= 1
    if started and d == 0: break
    jj += 1
v6 = 'onLeadTypeChange()' in h3[slc:jj+1]
print(f"V6: onLeadTypeChange in selectLeadCompany: {v6} {'✓' if v6 else '✗'}")
if not v6: ok = False

# V7: No 'title' in contacts query in openProjectFormFromLead
v7 = "'title'" not in fn
print(f"V7: No title in contacts query: {v7} {'✓' if v7 else '✗'}")
if not v7: ok = False

if ok:
    print("\n✅ ALL VERIFICATIONS PASSED")
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h3)
else:
    print("\n❌ SOME CHECKS FAILED - NOT SAVING")
