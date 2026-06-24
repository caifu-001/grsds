import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# ============================================================
# FIX 1: Move admin-workflows into admin-security's enclosing div
# ============================================================
# admin-security ends at its own </div>, but admin-workflows 
# needs to be inside the SAME parent div so it gets hidden with other panels.
# Strategy: extract admin-workflows block, insert it BEFORE admin-security's closing </div>

wf_start = h.find('<!-- Workflow Templates -->')
# Find admin-workflows closing (its own </div>)
d = 0; s = False; j = h.find('id="admin-workflows"')
while j < len(h):
    if h[j:j+4].lower() == '<div' and not h[j:j+5].lower() == '</div':
        d += 1; s = True
    elif h[j:j+6].lower() == '</div>':
        d -= 1
    if s and d == 0: break
    j += 1
wf_block = h[wf_start:j+6]

# Remove wf_block from current position
h_no_wf = h[:wf_start] + h[j+6:]

# Find admin-security again (positions shifted)
sec = h_no_wf.find('id="admin-security"')
d = 0; s = False; pos = sec
while pos < len(h_no_wf):
    if h_no_wf[pos:pos+4].lower() == '<div' and not h_no_wf[pos:pos+5].lower() == '</div':
        d += 1; s = True
    elif h_no_wf[pos:pos+6].lower() == '</div>':
        d -= 1
    if s and d == 0: break
    pos += 1
sec_end = pos + 6

# Insert wf_block right before admin-security closes
h = h_no_wf[:pos] + '\n' + wf_block + '\n' + h_no_wf[pos:]
print(f"FIX 1: admin-workflows moved inside admin-security container (pos={pos})")

# ============================================================
# FIX 2: Verify openProjectFormFromLead is async (has await inside IIFE, outer needs it)
# ============================================================
opf = h.find('function openProjectFormFromLead')
prefix_opf = h[max(0,opf-15):opf]
if 'async ' not in prefix_opf:
    # This function has await inside an async IIFE, but let's check if outer has await
    d = 0; s = False; i = opf
    while i < len(h):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: break
        i += 1
    fn_opf = h[opf:i+1]
    # Remove the async IIFE content and check for await
    iife_start = fn_opf.find('(async function()')
    if iife_start > 0:
        d2 = 0; s2 = False; j2 = iife_start
        while j2 < len(fn_opf):
            if fn_opf[j2] == '{': d2 += 1; s2 = True
            elif fn_opf[j2] == '}': d2 -= 1
            if s2 and d2 == 0: break
            j2 += 1
        outer = fn_opf[:iife_start] + fn_opf[j2+2:]  # remove IIFE
    else:
        outer = fn_opf
    
    if 'await ' in outer:
        h = h[:opf] + 'async ' + h[opf:]
        print("FIX 2: openProjectFormFromLead -> async (has outer await)")
    else:
        print("FIX 2: openProjectFormFromLead already ok (await only in IIFE)")

# ============================================================
# FIX 3: Ensure selectLeadCompany truly fills credit_code
# ============================================================
slc = h.find('function selectLeadCompany')
d = 0; s = False; i = slc
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
fn_slc = h[slc:i+1]

# Check credit_code setting line
cc_line_idx = fn_slc.find('credit_code')
if cc_line_idx > 0:
    cc_sub = fn_slc[cc_line_idx:cc_line_idx+80]
    print(f"FIX 3: credit_code line: {cc_sub.strip()[:80]}")

# Check if onLeadTypeChange is at the end (after all assignments)
olt_idx = fn_slc.find('onLeadTypeChange()')
if olt_idx > 0:
    print("FIX 3: onLeadTypeChange() found in selectLeadCompany ✓")
else:
    # Need to add it
    print("FIX 3: adding onLeadTypeChange() to selectLeadCompany end")
    # Find the closing brace
    last_brace = fn_slc.rfind('}')
    insert_pos = slc + last_brace
    h = h[:insert_pos] + '\n  onLeadTypeChange();\n' + h[insert_pos:]

# ============================================================
# FIX 4: allClients lazy load must include credit_code  
# ============================================================
# Find the openProjectFormFromLead function now
opf2 = h.find('function openProjectFormFromLead')
d = 0; s = False; i = opf2
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
fn_opf2 = h[opf2:i+1]

# Check allClients lazy load line
ac_pos2 = fn_opf2.find('allClients=data')
if ac_pos2 > 0:
    sel_part = fn_opf2[max(0,ac_pos2-350):ac_pos2]
    if 'credit_code' not in sel_part:
        print("FIX 4: adding credit_code to allClients lazy load")
        # Find .select('id,name,industry,address,type')
        old_sel = ".select('id,name,industry,address,type')"
        new_sel = ".select('id,name,industry,address,type,credit_code')"
        if old_sel in fn_opf2:
            # Replace in the actual file
            abs_pos = opf2 + fn_opf2.find(old_sel)
            h = h[:abs_pos] + new_sel + h[abs_pos+len(old_sel):]
            print("  -> replaced")
        else:
            # Try alternative pattern
            for pattern in [".select('id,name,industry,address,type'", '.select("id,name,industry,address,type"']:
                if pattern in fn_opf2:
                    abs_pos = opf2 + fn_opf2.find(pattern)
                    new_p = pattern[:-1] + ',credit_code' + pattern[-1]
                    h = h[:abs_pos] + new_p + h[abs_pos+len(pattern):]
                    print(f"  -> replaced variant")
                    break
            else:
                print("  -> pattern NOT FOUND, skipping")
    else:
        print("FIX 4: credit_code already in allClients lazy load ✓")

# Write result
with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h)

print("\nAll fixes applied. Running final verification...")

# ============================================================
# VERIFY
# ============================================================
h = open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

ok = True

# V1: admin-workflows inside admin-security
sec2 = h.find('id="admin-security"')
d = 0; s = False; pos = sec2
while pos < len(h):
    if h[pos:pos+4].lower() == '<div' and not h[pos:pos+5].lower() == '</div':
        d += 1; s = True
    elif h[pos:pos+6].lower() == '</div>':
        d -= 1
    if s and d == 0: break
    pos += 1
wf2 = h.find('id="admin-workflows"')
is_inside = wf2 < pos
print(f"V1: admin-workflows inside admin-security: {is_inside} {'✓' if is_inside else '✗'}")
if not is_inside: ok = False

# V2: renderWorkflowTemplates async
rwt2 = h.find('function renderWorkflowTemplates')
prefix2 = h[max(0,rwt2-10):rwt2]
is_async_rwt = 'async ' in prefix2
print(f"V2: renderWorkflowTemplates async: {is_async_rwt} {'✓' if is_async_rwt else '✗'}")
if not is_async_rwt: ok = False

# V3: onLeadTypeChange in selectLeadCompany
slc2 = h.find('function selectLeadCompany')
d = 0; s = False; i = slc2
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
has_olt2 = 'onLeadTypeChange()' in h[slc2:i+1]
print(f"V3: onLeadTypeChange in selectLeadCompany: {has_olt2} {'✓' if has_olt2 else '✗'}")
if not has_olt2: ok = False

# V4: no 'title' in contacts query
opf3 = h.find('function openProjectFormFromLead')
d = 0; s = False; i = opf3
while i < len(h):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: break
    i += 1
no_title = "'title'" not in h[opf3:i+1]
print(f"V4: no title in contacts query: {no_title} {'✓' if no_title else '✗'}")
if not no_title: ok = False

# V5: allClients has credit_code in lazy load in openProjectFormFromLead
ac3 = h[opf3:i+1].find('allClients=data')
if ac3 > 0:
    sel3 = h[opf3+max(0,ac3-350):opf3+ac3]
    has_cc3 = 'credit_code' in sel3
    print(f"V5: credit_code in allClients lazy load: {has_cc3} {'✓' if has_cc3 else '✗'}")
    if not has_cc3: ok = False

# V6: No double async
no_double = 'async async' not in h
print(f"V6: no double async: {no_double} {'✓' if no_double else '✗'}")
if not no_double: ok = False

# V7: No non-async await functions
func_pattern = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
bad = []
for m in func_pattern.finditer(h):
    name = m.group(2)
    is_a = m.group(1) is not None
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    if 'await ' in h[m.start():j+1] and not is_a:
        bad.append(name)
v7 = len(bad) == 0
print(f"V7: no non-async await: {v7} {'✓' if v7 else '✗'}")
if not v7:
    for b in bad:
        print(f"    -> {b}()")
    ok = False

if ok:
    print("\n✅ ALL VERIFICATIONS PASSED")
else:
    print("\n❌ SOME CHECKS FAILED")
