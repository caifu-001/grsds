import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# ===== FIX 1: Move admin-workflows from inside admin-security to after it =====
wf_comment = h.find('<!-- Workflow Templates -->')
d = 0; s = False
for i in range(h.find('id="admin-workflows"'), len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: wf_end = i+6; break
while wf_end < len(h) and h[wf_end] in '\r\n': wf_end += 1

wf_block = h[wf_comment:wf_end]
h2 = h[:wf_comment] + h[wf_end:]  # remove WF block

# Find admin-security's true closing </div>
sec_div = h2.find('id="admin-security"')
d = 0; s = False
for i in range(sec_div, len(h2)):
    t4 = h2[i:i+4].lower(); t6 = h2[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: sec_end = i+6; break

# Insert WF block AFTER admin-security closing
h3 = h2[:sec_end] + '\n\n' + wf_block + h2[sec_end:]
print(f"FIX 1: Moved admin-workflows to after admin-security (at byte {sec_end})")

# ===== FIX 2: Find and add credit_code to allClients =====
# Find all places where allClients is populated from Supabase
idx = 0
fixes = 0
while True:
    idx = h3.find('allClients', idx)
    if idx < 0: break
    
    # Look 300 chars before for a select pattern
    before = h3[max(0, idx-300):idx]
    sel_start = before.rfind('.select(')
    if sel_start >= 0:
        abs_sel = max(0, idx-300) + sel_start
        sel_str = h3[abs_sel:abs_sel+100]
        # Check if this select needs credit_code
        if 'credit_code' not in sel_str[:sel_str.index(')')]:
            # This select doesn't have credit_code
            # Find the closing paren
            end_paren = sel_str.index(')')
            old_select = sel_str[:end_paren+1]
            # Only fix if it has 'type' (indicating client columns)
            if 'type' in old_select:
                new_select = old_select[:-1] + ',credit_code)'
                h3 = h3[:abs_sel] + new_select + h3[abs_sel+len(old_select):]
                fixes += 1
                print(f"FIX 2.{fixes}: Added credit_code to select at byte {abs_sel}: {old_select[:80]}... -> {new_select[:80]}...")
    
    idx += 11

if fixes == 0:
    # Try broader search - find ALL supabase selects for clients
    print("FIX 2: No matches with above approach, trying broader search...")
    idx = 0
    while True:
        idx = h3.find(".from('clients')", idx)
        if idx < 0: break
        # Find the preceding .select
        before = h3[max(0, idx-200):idx]
        sel_start = before.rfind('.select(')
        if sel_start >= 0:
            abs_sel = max(0, idx-200) + sel_start
            sel_end = h3.index(')', abs_sel + 8)
            old_select = h3[abs_sel:sel_end+1]
            if 'credit_code' not in old_select and 'type' in old_select:
                new_select = old_select[:-1] + ',credit_code)'
                h3 = h3[:abs_sel] + new_select + h3[abs_sel+len(old_select):]
                fixes += 1
                print(f"FIX 2b.{fixes}: Added credit_code to select at byte {abs_sel}")
        idx += 15

print(f"FIX 2: Total {fixes} credit_code additions")

# ===== FIX 3: Verify allCredit/credit in selectLeadCompany =====
slc = h3.find('function selectLeadCompany')
d = 0; s = False
for i in range(slc, len(h3)):
    if h3[i] == '{': d += 1; s = True
    elif h3[i] == '}': d -= 1
    if s and d == 0: slc_end = i+1; break

fn_slc = h3[slc:slc_end]
# Check if client from allClients has credit_code access
has_client_credit = 'client.credit_code' in fn_slc or 'credit_code' in fn_slc
print(f"FIX 3: selectLeadCompany accesses credit_code: {has_client_credit}")

# ===== VERIFY =====
ok = True

# V1: admin-workflows after admin-security
sec = h3.find('id="admin-security"')
d = 0; s = False; sc = sec
for i in range(sec, len(h3)):
    t4 = h3[i:i+4].lower(); t6 = h3[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0: sc = i+6; break
wf = h3.find('id="admin-workflows"')
print(f"\nV1: WF after admin-security: {wf > sc} {'✓' if wf > sc else '✗'}")

# V2: credit_code in all loads
# Check all .from('clients').select(...) include credit_code
idx = 0; missing = 0
while True:
    idx = h3.find(".from('clients')", idx)
    if idx < 0: break
    before = h3[max(0, idx-200):idx]
    sel_start = before.rfind('.select(')
    if sel_start >= 0:
        abs_sel = max(0, idx-200) + sel_start
        sel_end = h3.index(')', abs_sel + 8)
        sel_str = h3[abs_sel:sel_end+1]
        has_credit = 'credit_code' in sel_str or '.select(\'*\')' in sel_str
        if not has_credit:
            missing += 1
            print(f"  Missing credit_code: ...{sel_str[:80]}...")
    idx += 15
print(f"V2: All client selects have credit_code: {missing == 0} {'✓' if missing == 0 else '✗'}")
if missing > 0: ok = False

# V3: async renderWorkflowTemplates
rwt = h3.find('function renderWorkflowTemplates')
async_rwt = 'async ' in h3[max(0,rwt-15):rwt]
print(f"V3: renderWorkflowTemplates async: {async_rwt} {'✓' if async_rwt else '✗'}")

# V4: No double async
print(f"V4: No double async: {'async async' not in h3} {'✓' if 'async async' not in h3 else '✗'}")

# V5: onLeadTypeChange in selectLeadCompany
print(f"V5: onLeadTypeChange in selectLeadCompany: {'onLeadTypeChange()' in fn_slc} {'✓' if 'onLeadTypeChange()' in fn_slc else '✗'}")

if ok:
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h3)
    print("\n✅ ALL CHECKS PASSED - SAVED")
else:
    print("\n❌ SOME CHECKS FAILED - NOT SAVING")
