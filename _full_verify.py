import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

ok = True

# 1. Div balance admin-view → main-fab
av = h.find('id="admin-view"')
mf = h.find('id="main-fab"')
o = c = 0; d = 0
for i in range(av, mf):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div': d += 1; o += 1
    elif h[i:i+6].lower() == '</div>': d -= 1; c += 1
bal = o == c
print(f'V0: <div={o} </div>={c} net={o-c} {"✅" if bal else "❌"}')
ok &= bal

# 2. Whole page div balance (admin-view to settings-screen)
ss = h.find('id="settings-screen"')
o2 = c2 = 0; d2 = 0
for i in range(av, ss):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div': d2 += 1; o2 += 1
    elif h[i:i+6].lower() == '</div>': d2 -= 1; c2 += 1
# Note: settings-screen itself is a div, so net should be 0 (admin-view open + close)
bal2 = d2 == 0
print(f'V0b: admin-view→settings-screen: depth={d2} {"✅" if bal2 else "❌"}')
ok &= bal2

# 3. admin-workflows outside admin-security
sec = h.find('id="admin-security"'); d3 = 0; s3 = False
for i in range(sec, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d3 += 1; s3 = True
    elif t6 == '</div>': d3 -= 1
    if s3 and d3 == 0: sc = i + 6; break
wf = h.find('id="admin-workflows"')
v1 = wf > sc
print(f'V1: WF outside admin-security: {v1} {"✅" if v1 else "❌"}')
ok &= v1

# 4. Async functions
checks = {
    'renderWorkflowTemplates': True,
    'loadTemplates': True,
}
for fn, needs in checks.items():
    idx = h.find(f'function {fn}')
    if idx < 0: print(f'  {fn}: NOT FOUND ❌'); ok = False; continue
    has_async = 'async ' in h[max(0, idx - 20):idx]
    d = s = False; je = idx
    for i in range(idx, len(h)):
        if h[i] == '{': d = True; s = True
        elif h[i] == '}': d = False
        if s and not d: je = i + 1; break
    has_await = 'await ' in h[idx:je]
    if has_await and not has_async:
        print(f'  {fn}: await without async ❌'); ok = False
    else:
        print(f'  {fn}: async={has_async} ✅')

# 5. credit_code auto-fill
slc = h.find('function selectLeadCompany')
if slc > 0:
    cc = 'client.credit_code' in h[slc:slc+3000]
    ot = 'onLeadTypeChange()' in h[slc:slc+3000]
    print(f'V2: credit_code auto-fill: {cc} typeChange: {ot} {"✅" if cc and ot else "❌"}')
    ok &= cc and ot

# 6. loadClients includes credit_code
lcf = h.find('function loadClients')
v3 = 'select(\'*\')' in h[lcf:lcf+500] if lcf > 0 else False
print(f'V3: loadClients select(*): {v3} {"✅" if v3 else "❌"}')
ok &= v3

# 7. admin-workflows div structure
wf_start_line = h[:wf].count('\n') + 1
print(f'V4: admin-workflows at line {wf_start_line}')
# Check it's between admin-security and main-fab
print(f'     admin-security closes at byte {sc}, WF at {wf}, main-fab at {mf}')
print(f'     {sc} < {wf} < {mf}: {sc < wf < mf} {"✅" if sc < wf < mf else "❌"}')
ok &= sc < wf < mf

print(f'\n{"✅ ALL CHECKS PASSED" if ok else "❌ ISSUES REMAIN"}')
